import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PrayerKey } from "@shared/ipc";
import type { MonthlyPlan, RawDailyRecord } from "@domain/types";
import { formatMinutes, formatMonthLabel } from "@domain/format";
import { EVEN_THEME, ODD_THEME } from "@domain/pipeline";
import { getTemplateSheetMap } from "./template-map";

const PRAYERS: PrayerKey[] = ["fajr", "zhuhr", "asr", "maghrib", "isha"];

export type XlsxWriteInput = {
  outputFolder: string;
  templateFile: string;
  plan: MonthlyPlan;
};

export async function writeXlsxFromTemplate(input: XlsxWriteInput): Promise<string> {
  const { default: XlsxPopulate } = await import("xlsx-populate");
  const workbook = await XlsxPopulate.fromFileAsync(input.templateFile);
  const map = getTemplateSheetMap(input.plan.month);
  const sheet = workbook.sheet(map.sheetName);

  if (!sheet) {
    throw new Error(`Template sheet not found: ${map.sheetName}`);
  }

  writeHeader(sheet, map.rawHeaderTemplate, input.plan);
  writeDayColumns(sheet, input.plan, map);
  applyGroupStyles(sheet, input.plan, map);
  writePrayerColumns(sheet, input.plan, map);
  keepOnlySelectedSheet(workbook, map.sheetName);

  const outputPath = join(input.outputFolder, `iqamah_${input.plan.month}.xlsx`);
  await workbook.toFileAsync(outputPath);
  await rewritePrayerMergesInXml(outputPath, input.plan, map);
  return outputPath;
}

function writeHeader(sheet: any, headerTemplate: string, plan: MonthlyPlan): void {
  const monthLabel = formatMonthLabel(plan.month, plan.locale);
  const firstFriday = plan.rawDays.find((day) => day.weekdayNameEn === "Fri" || day.weekdayNameTr === "Cuma");
  const adhan = firstFriday ? formatMinutes(toMinutes(firstFriday.ogle), plan.locale, plan.timeFormat) : "N/A";

  const text = headerTemplate
    .replaceAll("[AYIN ADI]", monthLabel.split(",")[0] ?? monthLabel)
    .replaceAll("[YIL]", plan.month.slice(0, 4))
    .replaceAll("[CUMA SAATİ]", adhan);

  sheet.cell("A1").value(text);
}

function writeDayColumns(sheet: any, plan: MonthlyPlan, map: ReturnType<typeof getTemplateSheetMap>): void {
  for (let slot = 0; slot < map.groupCount; slot += 1) {
    const topRow = map.dataStartRow + (slot * map.groupHeight);
    const bottomRow = topRow + 1;

    const group = plan.baseGroups[slot];
    if (!group) {
      sheet.cell(`${map.dayNumberColumn}${topRow}`).value("");
      sheet.cell(`${map.weekdayColumn}${topRow}`).value("");
      sheet.cell(`${map.dayNumberColumn}${bottomRow}`).value("");
      sheet.cell(`${map.weekdayColumn}${bottomRow}`).value("");
      continue;
    }

    const startDay = plan.rawDays.find((day) => day.dayOfMonth === group.startDay);
    const endDay = plan.rawDays.find((day) => day.dayOfMonth === group.endDay);

    const weekdaySource = plan.locale === "tr" ? "tr" : map.weekdaySource;
    sheet.cell(`${map.dayNumberColumn}${topRow}`).value(group.startDay);
    sheet.cell(`${map.weekdayColumn}${topRow}`).value(pickWeekday(startDay, weekdaySource));

    if (group.startDay === group.endDay) {
      sheet.cell(`${map.dayNumberColumn}${bottomRow}`).value("");
      sheet.cell(`${map.weekdayColumn}${bottomRow}`).value("");
    } else {
      sheet.cell(`${map.dayNumberColumn}${bottomRow}`).value(group.endDay);
      sheet.cell(`${map.weekdayColumn}${bottomRow}`).value(pickWeekday(endDay, weekdaySource));
    }
  }
}

function keepOnlySelectedSheet(workbook: any, selectedSheetName: string): void {
  const sheets = workbook.sheets();
  for (const ws of sheets) {
    if (ws.name() !== selectedSheetName) {
      workbook.deleteSheet(ws);
    }
  }
}

function applyGroupStyles(sheet: any, plan: MonthlyPlan, map: ReturnType<typeof getTemplateSheetMap>): void {
  const theme = Number(plan.month.split("-")[1]) % 2 === 0 ? EVEN_THEME : ODD_THEME;
  const colorByToken = Object.fromEntries(theme.sequence.map((entry) => [entry.token, entry]));

  for (let slot = 0; slot < map.groupCount; slot += 1) {
    const token = plan.colorByGroupIndex[slot] ?? map.colorTokenOrder[slot % map.colorTokenOrder.length];
    const palette = colorByToken[token] ?? colorByToken[map.colorTokenOrder[0]!];

    const targetTop = map.dataStartRow + (slot * map.groupHeight);
    const targetBottom = targetTop + 1;

    applyRowPalette(sheet, targetTop, [map.dayNumberColumn, map.weekdayColumn], palette.fillHex, palette.textHex);
    applyRowPalette(sheet, targetBottom, [map.dayNumberColumn, map.weekdayColumn], palette.fillHex, palette.textHex);

    for (const prayer of PRAYERS) {
      const col = map.prayerColumns[prayer];
      const cols = enumerateColumns(col.startCol, col.endCol);
      applyRowPalette(sheet, targetTop, cols, palette.fillHex, palette.textHex);
      applyRowPalette(sheet, targetBottom, cols, palette.fillHex, palette.textHex);
    }
  }
}

function writePrayerColumns(sheet: any, plan: MonthlyPlan, map: ReturnType<typeof getTemplateSheetMap>): void {
  for (const prayer of PRAYERS) {
    const col = map.prayerColumns[prayer];
    const groups = plan.baseGroups.slice(0, map.groupCount);

    for (let slot = 0; slot < map.groupCount; slot += 1) {
      const rowTop = map.dataStartRow + (slot * map.groupHeight);
      const rowBottom = rowTop + 1;
      const value = groups[slot]?.iqamahByPrayer[prayer];

      sheet.cell(`${col.startCol}${rowTop}`).value(
        value === undefined ? "" : formatMinutes(value, plan.locale, plan.timeFormat)
      );
      if (col.endCol !== col.startCol) {
        sheet.cell(`${col.endCol}${rowTop}`).value("");
      }
      sheet.cell(`${col.startCol}${rowBottom}`).value("");
      if (col.endCol !== col.startCol) {
        sheet.cell(`${col.endCol}${rowBottom}`).value("");
      }
    }
  }
}

async function rewritePrayerMergesInXml(
  xlsxPath: string,
  plan: MonthlyPlan,
  map: ReturnType<typeof getTemplateSheetMap>
): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await readFile(xlsxPath));

  const sheetPath = map.sheetName === "Odd" ? "xl/worksheets/sheet2.xml" : "xl/worksheets/sheet3.xml";
  const sheetFile = zip.file(sheetPath);
  if (!sheetFile) {
    return;
  }

  const xml = await sheetFile.async("string");
  const dataEndRow = map.dataStartRow + (map.groupCount * map.groupHeight) - 1;

  const existingRefs = extractMergeRefs(xml);
  const keptRefs = existingRefs.filter((ref) => {
    const range = parseRangeRef(ref);
    if (!range) {
      return true;
    }

    for (const prayer of PRAYERS) {
      const col = map.prayerColumns[prayer];
      const area = {
        startCol: colToNumber(col.startCol),
        endCol: colToNumber(col.endCol),
        startRow: map.dataStartRow,
        endRow: dataEndRow
      };
      if (intersectsArea(range, area)) {
        return false;
      }
    }

    return true;
  });

  const dynamicRefs = buildDynamicPrayerMergeRefs(plan, map);
  const mergedRefs = [...new Set([...keptRefs, ...dynamicRefs])];

  const updatedXml = replaceMergeBlock(xml, mergedRefs);
  zip.file(sheetPath, updatedXml);

  await writeFile(xlsxPath, await zip.generateAsync({ type: "nodebuffer" }));
}

function buildDynamicPrayerMergeRefs(plan: MonthlyPlan, map: ReturnType<typeof getTemplateSheetMap>): string[] {
  const refs: string[] = [];
  const groups = plan.baseGroups.slice(0, map.groupCount);

  for (const prayer of PRAYERS) {
    const col = map.prayerColumns[prayer];
    let i = 0;

    while (i < groups.length) {
      const runStart = i;
      const value = groups[i]!.iqamahByPrayer[prayer];
      const colorToken = plan.colorByGroupIndex[i] ?? "";
      i += 1;

      while (
        i < groups.length
        && groups[i]!.iqamahByPrayer[prayer] === value
        && (plan.colorByGroupIndex[i] ?? "") === colorToken
      ) {
        i += 1;
      }

      const runEnd = i - 1;
      const topRow = map.dataStartRow + (runStart * map.groupHeight);
      const bottomRow = (map.dataStartRow + (runEnd * map.groupHeight)) + 1;
      refs.push(`${col.startCol}${topRow}:${col.endCol}${bottomRow}`);
    }

    for (let slot = groups.length; slot < map.groupCount; slot += 1) {
      const topRow = map.dataStartRow + (slot * map.groupHeight);
      const bottomRow = topRow + 1;
      refs.push(`${col.startCol}${topRow}:${col.endCol}${bottomRow}`);
    }
  }

  return refs;
}

function extractMergeRefs(xml: string): string[] {
  const refs: string[] = [];
  const regex = /<mergeCell\s+ref="([^"]+)"\s*\/>/g;
  let match: RegExpExecArray | null = regex.exec(xml);

  while (match) {
    refs.push(match[1]!);
    match = regex.exec(xml);
  }

  return refs;
}

function replaceMergeBlock(xml: string, refs: string[]): string {
  const block = `<mergeCells count="${refs.length}">${refs.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`;

  if (/<mergeCells[\s\S]*?<\/mergeCells>/.test(xml)) {
    return xml.replace(/<mergeCells[\s\S]*?<\/mergeCells>/, block);
  }

  return xml.replace("</worksheet>", `${block}</worksheet>`);
}

function parseRangeRef(ref: string): { startCol: number; endCol: number; startRow: number; endRow: number } | null {
  const [startCellRaw, endCellRaw] = ref.split(":");
  const startCell = parseCell(startCellRaw);
  const endCell = parseCell(endCellRaw ?? startCellRaw);

  if (!startCell || !endCell) {
    return null;
  }

  return {
    startCol: Math.min(startCell.col, endCell.col),
    endCol: Math.max(startCell.col, endCell.col),
    startRow: Math.min(startCell.row, endCell.row),
    endRow: Math.max(startCell.row, endCell.row)
  };
}

function parseCell(cell: string): { col: number; row: number } | null {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    return null;
  }

  return { col: colToNumber(match[1]!), row: Number(match[2]!) };
}

function intersectsArea(
  range: { startCol: number; endCol: number; startRow: number; endRow: number },
  area: { startCol: number; endCol: number; startRow: number; endRow: number }
): boolean {
  const colOverlap = range.startCol <= area.endCol && range.endCol >= area.startCol;
  const rowOverlap = range.startRow <= area.endRow && range.endRow >= area.startRow;
  return colOverlap && rowOverlap;
}

function applyRowPalette(sheet: any, row: number, columns: string[], fillHex: string, textHex: string): void {
  const fill = fillHex.replace("#", "").toUpperCase();
  const fontColor = textHex.replace("#", "").toUpperCase();

  for (const col of columns) {
    const cell = sheet.cell(`${col}${row}`);
    try {
      cell.style("fill", { type: "solid", color: fill });
    } catch {
      // Ignore style assignment issues for this cell.
    }
    try {
      cell.style("fontColor", fontColor);
    } catch {
      // Ignore style assignment issues for this cell.
    }
  }
}

function enumerateColumns(startCol: string, endCol: string): string[] {
  const start = colToNumber(startCol);
  const end = colToNumber(endCol);
  const out: string[] = [];

  for (let n = start; n <= end; n += 1) {
    out.push(numberToCol(n));
  }

  return out;
}

function colToNumber(col: string): number {
  let out = 0;
  for (const ch of col.toUpperCase()) {
    out = (out * 26) + (ch.charCodeAt(0) - 64);
  }
  return out;
}

function numberToCol(n: number): string {
  let value = n;
  let out = "";
  while (value > 0) {
    const mod = (value - 1) % 26;
    out = String.fromCharCode(65 + mod) + out;
    value = Math.floor((value - 1) / 26);
  }
  return out;
}

function pickWeekday(day: RawDailyRecord | undefined, source: "en" | "tr"): string {
  if (!day) {
    return "";
  }

  return source === "tr" ? day.weekdayNameTr : day.weekdayNameEn;
}

function toMinutes(hhmm: string): number {
  const [hRaw, mRaw] = hhmm.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  return (h * 60) + m;
}
