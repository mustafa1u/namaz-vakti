import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import type { RawDailyRecord } from "@domain/types";

type TsvRow = {
  Tarih: string;
  GunAdi: string;
  "Miladi Tarih": string;
  "Hicri Tarih": string;
  "İmsak": string;
  "Güneş": string;
  "Öğle": string;
  "İkindi": string;
  "Akşam": string;
  "Yatsı": string;
};

const WEEKDAY_EN_BY_INDEX = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAY_TR_BY_INDEX = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cts"] as const;

export async function listAvailableMonths(tsvFolder: string): Promise<string[]> {
  const found = new Set<string>();
  await collectMonthsRecursive(tsvFolder, found);
  return [...found].sort();
}

export async function readMonthTsv(tsvFolder: string, month: string): Promise<RawDailyRecord[]> {
  const path = await resolveMonthTsvPath(tsvFolder, month);
  const file = await readFile(path, "utf8");

  const rows = parse(file, {
    columns: true,
    delimiter: "\t",
    bom: true,
    skip_empty_lines: true
  }) as TsvRow[];

  return rows.map((row) => {
    const dayOfMonth = Number(row.Tarih.split("-")[2]);
    const weekdayIndex = new Date(`${row.Tarih}T00:00:00`).getDay();
    const weekdayNameTr = WEEKDAY_TR_BY_INDEX[weekdayIndex] ?? row.GunAdi;
    const weekdayNameEn = WEEKDAY_EN_BY_INDEX[weekdayIndex] ?? row.GunAdi;
    return {
      dateIso: row.Tarih,
      dayOfMonth,
      weekdayIndex,
      weekdayNameTr,
      weekdayNameEn,
      hicriDate: row["Hicri Tarih"] ?? "",
      imsak: row["İmsak"],
      gunes: row["Güneş"],
      ogle: row["Öğle"],
      ikindi: row["İkindi"],
      aksam: row["Akşam"],
      yatsi: row["Yatsı"]
    };
  });
}

async function collectMonthsRecursive(folder: string, out: Set<string>): Promise<void> {
  const entries = await readdir(folder, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await collectMonthsRecursive(join(folder, entry.name), out);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const match = entry.name.match(/paterson_(\d{4}-\d{2})\.tsv$/i);
    if (match?.[1]) {
      out.add(match[1]);
    }
  }
}

async function resolveMonthTsvPath(tsvFolder: string, month: string): Promise<string> {
  const fileName = `paterson_${month}.tsv`;
  const [year] = month.split("-");
  const candidates = [
    join(tsvFolder, fileName),
    join(tsvFolder, year ?? "", fileName)
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }

  const found = await findFileByNameRecursive(tsvFolder, fileName);
  if (!found) {
    throw new Error(`Month TSV not found for ${month} in ${tsvFolder}`);
  }
  return found;
}

async function findFileByNameRecursive(folder: string, fileName: string): Promise<string | null> {
  const entries = await readdir(folder, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(folder, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === fileName.toLowerCase()) {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const nested = await findFileByNameRecursive(fullPath, fileName);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}
