import { existsSync } from "node:fs";
import { join } from "node:path";

type OutputLocale = "en" | "tr";
type OutputExtension = "xlsx" | "png";

const MONTH_ABBREVIATIONS: Record<OutputLocale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  tr: ["Oca", "\u015eub", "Mar", "Nis", "May", "Haz", "Tem", "A\u011fu", "Eyl", "Eki", "Kas", "Ara"]
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
  const baseName = `iqamah_${options.scheduleMonth}_${formatTimestampForFileName(now, options.locale)}`;
  let candidate = join(options.outputFolder, `${baseName}.${options.extension}`);
  let suffix = 2;

  while (pathExists(candidate)) {
    candidate = join(options.outputFolder, `${baseName}_${suffix}.${options.extension}`);
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
    `${date.getFullYear()}-${monthName}-${pad2(date.getDate())}`,
    `${pad2(date.getHours())}-${pad2(date.getMinutes())}-${pad2(date.getSeconds())}`
  ].join("_");
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
