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
    const match = entry.name.match(/_(\d{4}-\d{2})\.tsv$/i);
    if (match?.[1]) {
      out.add(match[1]);
    }
  }
}

async function resolveMonthTsvPath(tsvFolder: string, month: string): Promise<string> {
  const found = await findFilesByMonthRecursive(tsvFolder, month);
  if (found.length === 0) {
    throw new Error(`Month TSV not found for ${month} in ${tsvFolder}`);
  }
  if (found.length > 1) {
    throw new Error(`Multiple month TSV files found for ${month} in ${tsvFolder}: ${found.join(" | ")}`);
  }
  return found[0]!;
}

async function findFilesByMonthRecursive(folder: string, month: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(folder, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(folder, entry.name);
    if (entry.isFile() && entry.name.toLowerCase().endsWith(`_${month.toLowerCase()}.tsv`)) {
      out.push(fullPath);
      continue;
    }
    if (entry.isDirectory()) {
      const nested = await findFilesByMonthRecursive(fullPath, month);
      out.push(...nested);
    }
  }
  return out.sort();
}
