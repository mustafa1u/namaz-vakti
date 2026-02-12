import { readFile } from "node:fs/promises";
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

const WEEKDAY_EN: Record<string, string> = {
  Pazartesi: "Mon",
  Sali: "Tue",
  "Salı": "Tue",
  "Çarşamba": "Wed",
  Persembe: "Thu",
  "Perşembe": "Thu",
  Cuma: "Fri",
  Cumartesi: "Sat",
  Pazar: "Sun"
};

export async function listAvailableMonths(tsvFolder: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(tsvFolder, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && /^.+_\d{4}-\d{2}\.tsv$/i.test(entry.name))
    .map((entry) => {
      const match = entry.name.match(/(\d{4}-\d{2})\.tsv$/i);
      return match?.[1] ?? "";
    })
    .filter(Boolean)
    .sort();
}

export async function readMonthTsv(tsvFolder: string, month: string): Promise<RawDailyRecord[]> {
  const path = join(tsvFolder, `paterson_${month}.tsv`);
  const file = await readFile(path, "utf8");

  const rows = parse(file, {
    columns: true,
    delimiter: "\t",
    bom: true,
    skip_empty_lines: true
  }) as TsvRow[];

  return rows.map((row) => {
    const dayOfMonth = Number(row.Tarih.split("-")[2]);
    const weekdayTr = row.GunAdi;
    return {
      dateIso: row.Tarih,
      dayOfMonth,
      weekdayIndex: new Date(`${row.Tarih}T00:00:00`).getDay(),
      weekdayNameTr: weekdayTr,
      weekdayNameEn: WEEKDAY_EN[weekdayTr] ?? weekdayTr,
      imsak: row["İmsak"],
      gunes: row["Güneş"],
      ogle: row["Öğle"],
      ikindi: row["İkindi"],
      aksam: row["Akşam"],
      yatsi: row["Yatsı"]
    };
  });
}
