import type { Locale, TimeFormat } from "@shared/ipc";

const MONTH_EN = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER"
];

const MONTH_TR = [
  "OCAK",
  "SUBAT",
  "MART",
  "NISAN",
  "MAYIS",
  "HAZIRAN",
  "TEMMUZ",
  "AGUSTOS",
  "EYLUL",
  "EKIM",
  "KASIM",
  "ARALIK"
];

export function formatMinutes(minutes: number, locale: Locale, timeFormat: TimeFormat): string {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;

  if (timeFormat === "24h") {
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  const suffixes = locale === "tr" ? { am: "ÖÖ", pm: "ÖS" } : { am: "AM", pm: "PM" };
  const suffix = hh < 12 ? suffixes.am : suffixes.pm;
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

export function formatMonthLabel(month: string, locale: Locale): string {
  const [yearRaw, monthRaw] = month.split("-");
  const monthIndex = Number(monthRaw) - 1;
  const monthName = locale === "tr" ? (MONTH_TR[monthIndex] ?? monthRaw) : (MONTH_EN[monthIndex] ?? monthRaw);
  return `${monthName}, ${yearRaw}`;
}
