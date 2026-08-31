import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const AUTH_BASE = process.env.DIYANET_AUTH_BASE ?? "https://awqatsalah.diyanet.gov.tr";
const API_BASE = process.env.DIYANET_API_BASE ?? "https://awqatsalah.diyanet.gov.tr/api";
const YEAR = Number(process.env.DIYANET_YEAR ?? 2027);
const APP_ROOT = resolve(import.meta.dirname, "..");
const MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const WEEKDAYS_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const STATE_NAMES = {
  nj: ["new jersey"], dc: ["district of columbia", "washington"], ny: ["new york"], il: ["illinois"],
  tx: ["texas"], ca: ["california"], pa: ["pennsylvania"], md: ["maryland"], ct: ["connecticut"],
  ma: ["massachusetts"], de: ["delaware"], ankara: ["ankara"], istanbul: ["istanbul"], aydin: ["aydin"]
};
const CITY_ALIASES = {
  "New York City": ["New York"],
  "Altındağ": ["Ankara"],
  "Fatih": ["İstanbul"],
  "Efeler": ["Aydın"]
};

const config = await loadConfig();
const token = await login(config.email, config.password);
const catalog = await loadUniqueCatalog();
const countries = (await request(token, "/Place/Countries")).data ?? [];
const countryCache = new Map();
const cityCache = new Map();
let allCities;
const successes = [];
const failures = [];

for (const entry of catalog) {
  try {
    const outputPath = resolve(APP_ROOT, `assets/schedules/${YEAR}/${entry.scheduleFolder}/schedule_${YEAR}.tsv`);
    try {
      await access(outputPath);
      console.log(`[skip] ${entry.scheduleFolder} already exists`);
      successes.push(`${entry.scheduleFolder} (existing)`);
      continue;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const city = await resolveCity(token, entry, countries);
    const response = await request(token, "/PrayerTime/DateRange", {
      method: "POST",
      body: JSON.stringify({
        cityId: city.id,
        startDate: `${YEAR}-01-01T00:00:00`,
        endDate: `${YEAR}-12-31T23:59:59`
      })
    });
    const rows = (response?.data ?? []).map(toTsvRow).sort((a, b) => a.date.localeCompare(b.date));
    validateRows(rows, entry.scheduleFolder);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, makeTsv(rows), "utf8");
    successes.push(`${entry.scheduleFolder} <- ${city.name} (${city.id})`);
    console.log(`[ok] ${entry.scheduleFolder} <- ${city.name} (${city.id})`);
  } catch (error) {
    failures.push(`${entry.scheduleFolder}: ${error.message}`);
    console.error(`[failed] ${entry.scheduleFolder}: ${error.message}`);
  }
}

console.log(`Downloaded ${successes.length}/${catalog.length} unique built-in locations for ${YEAR}.`);
if (catalog.length !== successes.length) {
  console.error(`Failures: ${failures.join(" | ")}`);
  process.exitCode = 1;
}

async function loadConfig() {
  const values = { email: process.env.DIYANET_API_EMAIL, password: process.env.DIYANET_API_PASSWORD };
  try {
    const text = await readFile(resolve(APP_ROOT, ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*(DIYANET_API_EMAIL|DIYANET_API_PASSWORD)\s*=\s*(.*)\s*$/);
      if (!match?.[1]) continue;
      const key = match[1] === "DIYANET_API_EMAIL" ? "email" : "password";
      if (!values[key]) values[key] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!values.email || !values.password) throw new Error("Set Diyanet credentials in environment variables or .env.local.");
  return values;
}

async function login(email, password) {
  const body = await request(null, "/Auth/Login", { base: AUTH_BASE, method: "POST", body: JSON.stringify({ email, password }) });
  if (!body?.data?.accessToken) throw new Error("Diyanet login succeeded without an access token.");
  return body.data.accessToken;
}

async function loadUniqueCatalog() {
  const source = await readFile(resolve(APP_ROOT, "src/shared/locations.ts"), "utf8");
  const section = source.slice(source.indexOf("const LOCATION_ENTRIES"), source.indexOf("export const DEFAULT_LOCATION_SELECTION"));
  const entries = section.split(/\n\s*\{/).slice(1).map((block) => ({
    countryId: field(block, "countryId"), stateId: field(block, "stateId"), cityId: field(block, "cityId"),
    cityLabel: field(block, "cityLabel"), scheduleFolder: field(block, "scheduleFolder")
  })).filter((entry) => entry.countryId && entry.stateId && entry.cityId && entry.scheduleFolder);
  const unique = new Map();
  for (const entry of entries) if (!unique.has(entry.scheduleFolder)) unique.set(entry.scheduleFolder, entry);
  const skipped = entries.length - unique.size;
  if (skipped > 0) console.log(`Skipped ${skipped} catalog entries sharing an existing schedule folder.`);
  return [...unique.values()];
}

function field(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*"([^"]+)"`));
  return match?.[1] ?? "";
}

async function resolveCity(token, entry, countries) {
  const country = findCountry(countries, entry.countryId);
  if (!country) throw new Error(`country not found for ${entry.countryId}`);
  const countryKey = String(country.id);
  let states = countryCache.get(countryKey);
  if (!states) {
    states = (await request(token, `/Place/States/${country.id}`)).data ?? [];
    countryCache.set(countryKey, states);
  }
  const candidates = STATE_NAMES[entry.stateId] ?? [entry.stateId];
  const state = states.find((item) => candidates.some((name) => sameName(item.name, name)));
  if (!state) throw new Error(`state not found for ${entry.stateId}`);
  const stateKey = String(state.id);
  let cities = cityCache.get(stateKey);
  if (!cities) {
    cities = (await request(token, `/Place/Cities/${state.id}`)).data ?? [];
    cityCache.set(stateKey, cities);
  }
  const targetCity = normalize(entry.cityLabel);
  const city = findCity(cities, entry.cityLabel)
    ?? (entry.cityId === "efeler" ? cities.find((item) => normalize(item.name) === "aydin") : undefined);
  if (!city) {
    allCities ??= (await request(token, "/Place/Cities")).data ?? [];
    const globalCity = findCity(allCities, entry.cityLabel);
    if (globalCity) return globalCity;
  }
  if (!city && process.argv.includes("--debug-place")) {
    console.log(`[debug] ${entry.cityLabel} candidates: ${cities.map((item) => `${item.name} (${item.id})`).join(", ")}`);
  }
  if (!city) throw new Error(`city not found: ${entry.cityLabel}`);
  return city;
}

function findCity(cities, label) {
  const names = [label, ...(CITY_ALIASES[label] ?? [])].map(normalize);
  return cities.find((item) => {
    const candidate = normalize(item.name);
    return names.some((name) => candidate === name || candidate.startsWith(`${name} `));
  });
}

function findCountry(countries, countryId) {
  if (countryId === "turkiye") return countries.find((item) => /turkiye|turkey/.test(normalize(`${item.name} ${item.code}`)));
  return countries.find((item) => /united states|amerika|abd|usa/.test(normalize(`${item.name} ${item.code}`)));
}

function sameName(left, right) {
  return normalize(left) === normalize(right);
}

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function request(token, path, options = {}) {
  const { base = API_BASE, ...fetchOptions } = options;
  const response = await fetch(`${base}${path}`, {
    ...fetchOptions,
    headers: { Accept: "application/json", ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!response.ok) throw new Error(`${path} failed (${response.status}): ${body?.message ?? text.slice(0, 200)}`);
  if (body?.success === false) throw new Error(`${path} rejected the request: ${body.message ?? "unknown error"}`);
  return body;
}

function toTsvRow(record) {
  const date = String(record.gregorianDateLongIso8601 ?? record.gregorianDateShortIso8601 ?? "").slice(0, 10);
  const dateObject = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(dateObject.getTime())) throw new Error(`invalid Gregorian date: ${date}`);
  const day = dateObject.getUTCDate(); const month = dateObject.getUTCMonth(); const weekday = dateObject.getUTCDay();
  return { date, weekday: WEEKDAYS_TR[weekday], gregorian: `${String(day).padStart(2, "0")} ${MONTHS_TR[month]} ${YEAR} ${WEEKDAYS_TR[weekday]}`, hijri: record.hijriDateLong ?? record.hijriDateShort ?? "", fajr: record.fajr ?? "", sunrise: record.sunrise ?? "", dhuhr: record.dhuhr ?? "", asr: record.asr ?? "", maghrib: record.maghrib ?? "", isha: record.isha ?? "" };
}

function validateRows(rows, label) {
  const expected = new Date(Date.UTC(YEAR, 1, 0)).getUTCDate() === 29 ? 366 : 365;
  if (rows.length !== expected) throw new Error(`${label}: expected ${expected} records, received ${rows.length}`);
  for (let i = 0; i < rows.length; i += 1) {
    const expectedDate = new Date(Date.UTC(YEAR, 0, i + 1)).toISOString().slice(0, 10);
    if (rows[i].date !== expectedDate) throw new Error(`${label}: date gap at row ${i + 1}`);
    if ([rows[i].fajr, rows[i].sunrise, rows[i].dhuhr, rows[i].asr, rows[i].maghrib, rows[i].isha].some((value) => !/^\d{2}:\d{2}$/.test(value))) throw new Error(`${label}: malformed time on ${rows[i].date}`);
  }
}

function makeTsv(rows) {
  return ["Tarih\tGunAdi\tMiladi Tarih\tHicri Tarih\tİmsak\tGüneş\tÖğle\tİkindi\tAkşam\tYatsı", ...rows.map((row) => [row.date, row.weekday, row.gregorian, row.hijri, row.fajr, row.sunrise, row.dhuhr, row.asr, row.maghrib, row.isha].join("\t"))].join("\n") + "\n";
}
