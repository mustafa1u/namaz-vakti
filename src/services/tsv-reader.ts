import { readdir, readFile } from "node:fs/promises";
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
  const yearlyFiles = await findYearlyFilesRecursive(tsvFolder);
  const months = new Set<string>();

  for (const filePath of yearlyFiles) {
    const rows = await parseTsvRows(filePath);
    for (const row of rows) {
      const month = extractMonthFromIso(row.Tarih);
      if (month) {
        months.add(month);
      }
    }
  }

  return [...months].sort();
}

export async function readYearTsv(tsvFolder: string, year: string): Promise<RawDailyRecord[]> {
  const rows = await readYearRows(tsvFolder, year);
  return mapRowsToRawDailyRecords(rows);
}

export async function readMonthTsv(tsvFolder: string, month: string): Promise<RawDailyRecord[]> {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match?.[1]) {
    throw new Error(`Invalid month value: ${month}`);
  }

  const rows = await readYearRows(tsvFolder, match[1]);
  const monthRows = rows.filter((row) => row.Tarih.startsWith(`${month}-`));
  if (monthRows.length === 0) {
    throw new Error(`Month data not found for ${month} in yearly TSV`);
  }

  return mapRowsToRawDailyRecords(monthRows);
}

async function readYearRows(tsvFolder: string, year: string): Promise<TsvRow[]> {
  const found = await findYearFilesByYearRecursive(tsvFolder, year);
  if (found.length === 0) {
    throw new Error(`Year TSV not found for ${year} in ${tsvFolder}`);
  }
  if (found.length > 1) {
    throw new Error(`Multiple year TSV files found for ${year} in ${tsvFolder}: ${found.join(" | ")}`);
  }

  return parseTsvRows(found[0]!);
}

function extractMonthFromIso(dateIso: string): string | null {
  const match = dateIso.match(/^(\d{4}-\d{2})-\d{2}$/);
  return match?.[1] ?? null;
}

function mapRowsToRawDailyRecords(rows: TsvRow[]): RawDailyRecord[] {
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

async function parseTsvRows(path: string): Promise<TsvRow[]> {
  const file = await readFile(path, "utf8");
  const rows = parse(file, {
    columns: true,
    delimiter: "\t",
    bom: true,
    skip_empty_lines: true
  }) as TsvRow[];

  for (const row of rows) {
    if (extractMonthFromIso(row.Tarih) === null) {
      throw new Error(`Invalid Tarih value in ${path}: ${row.Tarih}`);
    }
  }

  return rows;
}

async function findYearlyFilesRecursive(folder: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(folder, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(folder, entry.name);
    if (entry.isDirectory()) {
      const nested = await findYearlyFilesRecursive(fullPath);
      out.push(...nested);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const lowerName = entry.name.toLowerCase();
    if (/_\d{4}-\d{2}\.tsv$/.test(lowerName)) {
      continue;
    }
    if (/_\d{4}\.tsv$/.test(lowerName)) {
      out.push(fullPath);
    }
  }

  return out.sort();
}

async function findYearFilesByYearRecursive(folder: string, year: string): Promise<string[]> {
  const yearlyFiles = await findYearlyFilesRecursive(folder);
  return yearlyFiles.filter((path) => path.toLowerCase().endsWith(`_${year.toLowerCase()}.tsv`));
}
