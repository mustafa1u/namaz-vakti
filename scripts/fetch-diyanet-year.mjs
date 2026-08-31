import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// The provider confirmed that Login is rooted at the host. The protected
// place/prayer routes retain the /api prefix documented in the guide.
const AUTH_BASE = process.env.DIYANET_AUTH_BASE ?? "https://awqatsalah.diyanet.gov.tr";
const API_BASE = process.env.DIYANET_API_BASE ?? "https://awqatsalah.diyanet.gov.tr/api";
const YEAR = Number(process.env.DIYANET_YEAR ?? 2027);
const APP_ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_PATH = resolve(APP_ROOT, `assets/schedules/${YEAR}/Paterson-NJ/schedule_${YEAR}.tsv`);

const MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const WEEKDAYS_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

const config = await loadConfig();
const token = await login(config.email, config.password);
const city = await resolvePaterson(token);
console.log(`Diyanet city resolved: ${city.name} (ID ${city.id})`);

const response = await request(token, "/PrayerTime/DateRange", {
  method: "POST",
  body: JSON.stringify({
    cityId: city.id,
    startDate: `${YEAR}-01-01T00:00:00`,
    endDate: `${YEAR}-12-31T23:59:59`
  })
});

const records = response?.data;
if (!Array.isArray(records)) {
  throw new Error("The yearly response did not contain a data array.");
}

const rows = records.map(toTsvRow).sort((a, b) => a.date.localeCompare(b.date));
validateRows(rows);

const tsv = [
  "Tarih\tGunAdi\tMiladi Tarih\tHicri Tarih\tİmsak\tGüneş\tÖğle\tİkindi\tAkşam\tYatsı",
  ...rows.map((row) => [row.date, row.weekday, row.gregorian, row.hijri, row.fajr, row.sunrise, row.dhuhr, row.asr, row.maghrib, row.isha].join("\t"))
].join("\n") + "\n";

if (process.argv.includes("--no-write")) {
  console.log(`Validated ${rows.length} records. No file written (--no-write).`);
} else {
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, tsv, "utf8");
  console.log(`Wrote ${rows.length} records to ${OUTPUT_PATH}`);
}

async function loadConfig() {
  const values = { email: process.env.DIYANET_API_EMAIL, password: process.env.DIYANET_API_PASSWORD };
  try {
    const text = await readFile(resolve(APP_ROOT, ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*(DIYANET_API_EMAIL|DIYANET_API_PASSWORD)\s*=\s*(.*)\s*$/);
      if (match?.[1] && !values[match[1] === "DIYANET_API_EMAIL" ? "email" : "password"]) {
        values[match[1] === "DIYANET_API_EMAIL" ? "email" : "password"] = match[2].replace(/^['"]|['"]$/g, "");
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!values.email || !values.password) {
    throw new Error("Set DIYANET_API_EMAIL and DIYANET_API_PASSWORD, or put them in desktop-app/.env.local.");
  }
  return values;
}

async function login(email, password) {
  const response = await request(null, "/Auth/Login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    base: AUTH_BASE
  });
  const token = response?.data?.accessToken;
  if (!token) throw new Error("Diyanet login succeeded without an access token.");
  return token;
}

async function resolvePaterson(token) {
  const countries = (await request(token, "/Place/Countries")).data ?? [];
  const country = countries.find((item) => /united states|amerika|abd/i.test(item.name ?? ""));
  if (!country) throw new Error("Could not find the United States in Diyanet countries.");

  const states = (await request(token, `/Place/States/${country.id}`)).data ?? [];
  const state = states.find((item) => /new jersey|newjersey/i.test(item.name ?? ""));
  if (!state) throw new Error("Could not find New Jersey in Diyanet states.");

  const cities = (await request(token, `/Place/Cities/${state.id}`)).data ?? [];
  const city = cities.find((item) => /^paterson$/i.test(item.name ?? ""));
  if (!city) throw new Error("Could not find Paterson in Diyanet cities for New Jersey.");
  return city;
}

async function request(token, path, options = {}) {
  const { base = API_BASE, ...fetchOptions } = options;
  const response = await fetch(`${base}${path}`, {
    ...fetchOptions,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!response.ok) {
    throw new Error(`Diyanet ${path} failed (${response.status}): ${body?.message ?? text.slice(0, 300)}`);
  }
  if (body?.success === false) throw new Error(`Diyanet ${path} rejected the request: ${body.message ?? "unknown error"}`);
  return body;
}

function toTsvRow(record) {
  const iso = record.gregorianDateLongIso8601 ?? record.gregorianDateShortIso8601;
  const date = String(iso ?? "").slice(0, 10);
  const dateObject = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(dateObject.getTime())) {
    throw new Error(`Could not parse Gregorian date from API record: ${JSON.stringify(record)}`);
  }
  const day = dateObject.getUTCDate();
  const month = dateObject.getUTCMonth();
  const weekday = dateObject.getUTCDay();
  return {
    date,
    weekday: WEEKDAYS_TR[weekday],
    gregorian: `${String(day).padStart(2, "0")} ${MONTHS_TR[month]} ${YEAR} ${WEEKDAYS_TR[weekday]}`,
    hijri: record.hijriDateLong ?? record.hijriDateShort ?? "",
    fajr: record.fajr ?? "",
    sunrise: record.sunrise ?? "",
    dhuhr: record.dhuhr ?? "",
    asr: record.asr ?? "",
    maghrib: record.maghrib ?? "",
    isha: record.isha ?? ""
  };
}

function validateRows(rows) {
  const expected = 365;
  if (rows.length !== expected) throw new Error(`Expected ${expected} records for ${YEAR}, received ${rows.length}.`);
  const expectedDates = Array.from({ length: expected }, (_, index) => {
    const date = new Date(Date.UTC(YEAR, 0, index + 1));
    return date.toISOString().slice(0, 10);
  });
  for (let index = 0; index < expectedDates.length; index += 1) {
    if (rows[index]?.date !== expectedDates[index]) {
      throw new Error(`Yearly response has a date gap or duplicate at row ${index + 1}: expected ${expectedDates[index]}, received ${rows[index]?.date ?? "missing"}.`);
    }
  }
  for (const row of rows) {
    if ([row.fajr, row.sunrise, row.dhuhr, row.asr, row.maghrib, row.isha].some((value) => !/^\d{2}:\d{2}$/.test(value))) {
      throw new Error(`A prayer-time field is missing or malformed for ${row.date}.`);
    }
  }
}
