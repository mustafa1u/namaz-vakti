import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { DiyanetLocation, DiyanetPlace, FetchDiyanetScheduleRequest, FetchDiyanetScheduleResponse } from "@shared/ipc";

const AUTH_BASE = process.env.DIYANET_AUTH_BASE ?? "https://awqatsalah.diyanet.gov.tr";
const API_BASE = process.env.DIYANET_API_BASE ?? `${AUTH_BASE}/api`;
const MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const WEEKDAYS_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

type ApiPlace = { id: number; name?: string };
type TsvRow = { date: string; weekday: string; gregorian: string; hijri: string; fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string };
let cachedToken: string | null = null;
let placeCachePath: string | null = null;
let placeCacheLoaded = false;
const countryCache = new Map<number, DiyanetPlace[]>();
const stateCache = new Map<number, DiyanetPlace[]>();
const cityCache = new Map<number, DiyanetPlace[]>();

export function configureDiyanetPlaceCache(cachePath: string): void {
  placeCachePath = cachePath;
}

async function loadPlaceCache(): Promise<void> {
  if (placeCacheLoaded) return;
  placeCacheLoaded = true;
  if (!placeCachePath) return;
  try {
    const parsed = JSON.parse(await readFile(placeCachePath, "utf8")) as { countries?: DiyanetPlace[]; states?: Record<string, DiyanetPlace[]>; cities?: Record<string, DiyanetPlace[]> };
    if (Array.isArray(parsed.countries)) countryCache.set(0, parsed.countries);
    for (const [key, value] of Object.entries(parsed.states ?? {})) if (Array.isArray(value)) stateCache.set(Number(key), value);
    for (const [key, value] of Object.entries(parsed.cities ?? {})) if (Array.isArray(value)) cityCache.set(Number(key), value);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function savePlaceCache(): Promise<void> {
  if (!placeCachePath) return;
  const states: Record<string, DiyanetPlace[]> = {};
  const cities: Record<string, DiyanetPlace[]> = {};
  for (const [key, value] of stateCache) states[String(key)] = value;
  for (const [key, value] of cityCache) cities[String(key)] = value;
  await mkdir(dirname(placeCachePath), { recursive: true });
  await writeFile(placeCachePath, JSON.stringify({ countries: countryCache.get(0) ?? [], states, cities }, null, 2), "utf8");
}

async function loadConfig(): Promise<{ email: string; password: string }> {
  const values = { email: process.env.DIYANET_API_EMAIL, password: process.env.DIYANET_API_PASSWORD };
  try {
    const text = await readFile(join(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*(DIYANET_API_EMAIL|DIYANET_API_PASSWORD)\s*=\s*(.*)\s*$/);
      if (match?.[1] && !values[match[1] === "DIYANET_API_EMAIL" ? "email" : "password"]) {
        values[match[1] === "DIYANET_API_EMAIL" ? "email" : "password"] = match[2]!.replace(/^['"]|['"]$/g, "");
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (!values.email || !values.password) {
    throw new Error("Diyanet API kimlik bilgileri bulunamadı. DIYANET_API_EMAIL ve DIYANET_API_PASSWORD ayarlayın.");
  }
  return { email: values.email, password: values.password };
}

async function request(token: string | null, path: string, options: RequestInit = {}, base = API_BASE): Promise<any> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* handled below */ }
  if (!response.ok || body?.success === false) {
    throw new Error(`Diyanet ${path} başarısız (${response.status}): ${body?.message ?? text.slice(0, 300)}`);
  }
  return body;
}

async function login(): Promise<string> {
  if (cachedToken) return cachedToken;
  const config = await loadConfig();
  const result = await request(null, "/Auth/Login", { method: "POST", body: JSON.stringify(config) }, AUTH_BASE);
  const token = result?.data?.accessToken;
  if (!token) throw new Error("Diyanet girişi erişim belirteci döndürmedi.");
  cachedToken = token;
  return token;
}

export async function listDiyanetCountries(): Promise<DiyanetPlace[]> {
  await loadPlaceCache();
  const cached = countryCache.get(0);
  if (cached) return cached;
  const token = await login();
  const places = toPlaces((await request(token, "/Place/Countries")).data);
  countryCache.set(0, places);
  await savePlaceCache();
  return places;
}

export async function listDiyanetStates(countryId: number): Promise<DiyanetPlace[]> {
  await loadPlaceCache();
  const cached = stateCache.get(countryId);
  if (cached) return cached;
  const places = toPlaces((await request(await login(), `/Place/States/${countryId}`)).data);
  stateCache.set(countryId, places);
  await savePlaceCache();
  return places;
}

export async function listDiyanetCities(stateId: number): Promise<DiyanetPlace[]> {
  await loadPlaceCache();
  const cached = cityCache.get(stateId);
  if (cached) return cached;
  const places = toPlaces((await request(await login(), `/Place/Cities/${stateId}`)).data);
  cityCache.set(stateId, places);
  await savePlaceCache();
  return places;
}

function toPlaces(value: unknown): DiyanetPlace[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ApiPlace => Boolean(item && typeof item.id === "number" && typeof item.name === "string"))
    .map((item) => ({ id: item.id, name: item.name! }));
}

export async function fetchDiyanetSchedule(requestData: FetchDiyanetScheduleRequest, outputBase: string): Promise<FetchDiyanetScheduleResponse> {
  const token = await login();
  const response = await request(token, "/PrayerTime/DateRange", {
    method: "POST",
    body: JSON.stringify({ cityId: requestData.cityId, startDate: `${requestData.year}-01-01T00:00:00`, endDate: `${requestData.year}-12-31T23:59:59` })
  });
  const records = response?.data;
  if (!Array.isArray(records) || records.length === 0) throw new Error("Diyanet çizelge yanıtı boş veya geçersiz.");
  const rows = records.map((record) => toTsvRow(record, requestData.year)).sort((a, b) => a.date.localeCompare(b.date));
  const folder = join(outputBase, String(requestData.year));
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, `schedule_${requestData.year}.tsv`), ["Tarih\tGunAdi\tMiladi Tarih\tHicri Tarih\tİmsak\tGüneş\tÖğle\tİkindi\tAkşam\tYatsı", ...rows.map((row) => Object.values(row).join("\t"))].join("\n") + "\n", "utf8");
  return { tsvFolder: outputBase, year: requestData.year, records: rows.length };
}

function toTsvRow(record: any, year: number): TsvRow {
  const date = String(record.gregorianDateLongIso8601 ?? record.gregorianDateShortIso8601 ?? "").slice(0, 10);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime())) throw new Error(`Diyanet tarihi okunamadı: ${date}`);
  const weekday = WEEKDAYS_TR[parsed.getUTCDay()]!;
  return { date, weekday, gregorian: `${date.slice(8, 10)} ${MONTHS_TR[parsed.getUTCMonth()]} ${year} ${weekday}`, hijri: record.hijriDateLong ?? record.hijriDateShort ?? "", fajr: record.fajr ?? "", sunrise: record.sunrise ?? "", dhuhr: record.dhuhr ?? "", asr: record.asr ?? "", maghrib: record.maghrib ?? "", isha: record.isha ?? "" };
}
