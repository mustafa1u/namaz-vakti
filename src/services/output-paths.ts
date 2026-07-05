import { existsSync } from "node:fs";
import { join } from "node:path";

type OutputLocale = "en" | "tr";
type OutputExtension = "xlsx" | "png";

const MONTH_ABBREVIATIONS: Record<OutputLocale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  tr: ["Oca", "\u015eub", "Mar", "Nis", "May", "Haz", "Tem", "A\u011fu", "Eyl", "Eki", "Kas", "Ara"]
};

const MONTH_NAMES: Record<OutputLocale, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  tr: ["Ocak", "\u015eubat", "Mart", "Nisan", "May\u0131s", "Haziran", "Temmuz", "A\u011fustos", "Eyl\u00fcl", "Ekim", "Kas\u0131m", "Aral\u0131k"]
};

export type BuildUniqueOutputPathOptions = {
  outputFolder: string;
  scheduleMonth: string;
  locale: OutputLocale;
  extension: OutputExtension;
  now?: Date;
  pathExists?: (candidatePath: string) => boolean;
};

export function buildUniqueOutputPath(options: BuildUniqueOutputPathOptions): string {
  const now = options.now ?? new Date();
  const pathExists = options.pathExists ?? existsSync;
  const scheduleMonth = formatScheduleMonthForFileName(options.scheduleMonth, options.locale);
  const baseName = `iqamah_${scheduleMonth}`;
  const plainCandidate = join(options.outputFolder, `${baseName}.${options.extension}`);
  if (!pathExists(plainCandidate)) {
    return plainCandidate;
  }

  const timestampedBaseName = `${baseName}--${formatTimestampForFileName(now, options.locale)}`;
  let candidate = join(options.outputFolder, `${timestampedBaseName}.${options.extension}`);
  let suffix = 2;

  while (pathExists(candidate)) {
    candidate = join(options.outputFolder, `${timestampedBaseName}_${suffix}.${options.extension}`);
    suffix += 1;
  }

  return candidate;
}

export function buildTemporaryOutputPath(
  finalPath: string,
  options: { pathExists?: (candidatePath: string) => boolean } = {}
): string {
  const pathExists = options.pathExists ?? existsSync;
  const baseName = `${finalPath}.tmp`;
  let candidate = baseName;
  let suffix = 2;

  while (pathExists(candidate)) {
    candidate = `${baseName}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export function formatTimestampForFileName(date: Date, locale: OutputLocale): string {
  const monthName = MONTH_ABBREVIATIONS[locale][date.getMonth()] ?? MONTH_ABBREVIATIONS.en[date.getMonth()] ?? "Mon";
  return [
    `${pad2(date.getDate())}-${monthName}-${date.getFullYear()}`,
    `${pad2(date.getHours())}-${pad2(date.getMinutes())}-${pad2(date.getSeconds())}`
  ].join("_");
}

export function formatScheduleMonthForFileName(scheduleMonth: string, locale: OutputLocale): string {
  const match = /^(\d{4})-(\d{2})$/.exec(scheduleMonth);
  if (!match) {
    return scheduleMonth;
  }

  const [, year, monthNumber] = match;
  const monthIndex = Number(monthNumber) - 1;
  const monthName = MONTH_NAMES[locale][monthIndex] ?? MONTH_NAMES.en[monthIndex];
  if (!monthName) {
    return scheduleMonth;
  }

  return `${monthName}-${year}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
