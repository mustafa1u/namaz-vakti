import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PrayerKey } from "@shared/ipc";
import type { GroupResult, MonthlyPlan, RawDailyRecord } from "@domain/types";
import { formatMinutes, formatMonthLabel } from "@domain/format";
import { EVEN_THEME, ODD_THEME } from "@domain/pipeline";
import { getTemplateSheetMap } from "./template-map";

const PRAYERS: PrayerKey[] = ["fajr", "zhuhr", "asr", "maghrib", "isha"];

type DisplaySlot = {
  groupIndex: number;
  group: GroupResult;
  topRow: number;
  bottomRow: number;
  rowCount: number;
};

export type XlsxWriteInput = {
  outputFolder: string;
  templateFile: string;
  plan: MonthlyPlan;
  announcementMessage: string;
};

export async function writeXlsxFromTemplate(input: XlsxWriteInput): Promise<string> {
  const { default: XlsxPopulate } = await import("xlsx-populate");
  const workbook = await XlsxPopulate.fromFileAsync(input.templateFile);
  const map = getTemplateSheetMap(input.plan.month);
  const sheet = workbook.sheet(map.sheetName);

  if (!sheet) {
    throw new Error(`Template sheet not found: ${map.sheetName}`);
  }

  const slots = buildDisplaySlots(input.plan.baseGroups, map.dataStartRow);
  const pairHeights = captureTemplatePairHeights(sheet, map);
  const announcementMessage = normalizeAnnouncementMessage(input.announcementMessage);

  writeHeader(sheet, map.rawHeaderTemplate, input.plan, announcementMessage, XlsxPopulate);
  applyRowHeights(sheet, slots, pairHeights, map);
  writeDayColumns(sheet, input.plan, map, slots);
  applyGroupStyles(sheet, input.plan, map, slots);
  writePrayerColumns(sheet, input.plan, map, slots);
  keepOnlySelectedSheet(workbook, map.sheetName);

  const outputPath = join(input.outputFolder, `iqamah_${input.plan.month}.xlsx`);
  await workbook.toFileAsync(outputPath);
  await rewritePrayerMergesInXml(outputPath, input.plan, map, slots);
  return outputPath;
}

function buildDisplaySlots(groups: GroupResult[], startRow: number): DisplaySlot[] {
  const slots: DisplaySlot[] = [];
  let currentRow = startRow;

  groups.forEach((group, index) => {
    const rowCount = group.startDay === group.endDay ? 1 : 2;
    const topRow = currentRow;
    const bottomRow = currentRow + rowCount - 1;

    slots.push({
      groupIndex: index,
      group,
      topRow,
      bottomRow,
      rowCount
    });

    currentRow += rowCount;
  });

  return slots;
}

function captureTemplatePairHeights(sheet: any, map: ReturnType<typeof getTemplateSheetMap>): Array<{ top: number; bottom: number }> {
  const out: Array<{ top: number; bottom: number }> = [];
  for (let i = 0; i < map.groupCount; i += 1) {
    const topRow = map.dataStartRow + (i * map.groupHeight);
    const bottomRow = topRow + 1;
    const top = Number(sheet.row(topRow).height()) || 15;
    const bottom = Number(sheet.row(bottomRow).height()) || 15;
    out.push({ top, bottom });
  }
  return out;
}

function applyRowHeights(
  sheet: any,
  slots: DisplaySlot[],
  pairHeights: Array<{ top: number; bottom: number }>,
  map: ReturnType<typeof getTemplateSheetMap>
): void {
  for (const slot of slots) {
    const pair = pairHeights[Math.min(slot.groupIndex, map.groupCount - 1)] ?? { top: 15, bottom: 15 };
    sheet.row(slot.topRow).height(slot.rowCount === 1 ? pair.top + pair.bottom : pair.top);
    if (slot.rowCount === 2) {
      sheet.row(slot.bottomRow).height(pair.bottom);
    }
  }
}

function writeHeader(
  sheet: any,
  headerTemplate: string,
  plan: MonthlyPlan,
  announcementMessage: string,
  xlsxPopulate: any
): void {
  const monthLabel = formatMonthLabel(plan.month, plan.locale);
  const firstFriday = plan.rawDays.find((day) => day.weekdayNameEn === "Fri" || day.weekdayNameTr === "Cuma");
  const adhan = firstFriday ? formatMinutes(toMinutes(firstFriday.ogle), plan.locale, plan.timeFormat) : "N/A";

  const headerText = headerTemplate
    .replaceAll("[AYIN ADI]", monthLabel.split(",")[0] ?? monthLabel)
    .replaceAll("[YIL]", plan.month.slice(0, 4))
    .replaceAll("[CUMA SAATİ]", adhan);

  if (!announcementMessage) {
    sheet.cell("A1").value(headerText);
    return;
  }

  const rich = new xlsxPopulate.RichText();
  rich.add(`${announcementMessage}\n`, { fontSize: 14 });
  rich.add(headerText);
  sheet.cell("A1").value(rich);
}

function writeDayColumns(
  sheet: any,
  plan: MonthlyPlan,
  map: ReturnType<typeof getTemplateSheetMap>,
  slots: DisplaySlot[]
): void {
  const weekdaySource = plan.locale === "tr" ? "tr" : map.weekdaySource;
  const dayRefStyle = getDayStyleReference(sheet, map);

  for (const slot of slots) {
    const startDay = plan.rawDays.find((day) => day.dayOfMonth === slot.group.startDay);
    const endDay = plan.rawDays.find((day) => day.dayOfMonth === slot.group.endDay);

    sheet.cell(`${map.dayNumberColumn}${slot.topRow}`).value(slot.group.startDay);
    sheet.cell(`${map.weekdayColumn}${slot.topRow}`).value(pickWeekday(startDay, weekdaySource));
    normalizeDayCellStyle(sheet, `${map.dayNumberColumn}${slot.topRow}`, dayRefStyle);
    normalizeDayCellStyle(sheet, `${map.weekdayColumn}${slot.topRow}`, dayRefStyle);

    if (slot.rowCount === 2) {
      sheet.cell(`${map.dayNumberColumn}${slot.bottomRow}`).value(slot.group.endDay);
      sheet.cell(`${map.weekdayColumn}${slot.bottomRow}`).value(pickWeekday(endDay, weekdaySource));
      normalizeDayCellStyle(sheet, `${map.dayNumberColumn}${slot.bottomRow}`, dayRefStyle);
      normalizeDayCellStyle(sheet, `${map.weekdayColumn}${slot.bottomRow}`, dayRefStyle);
    }
  }
}

function applyGroupStyles(
  sheet: any,
  plan: MonthlyPlan,
  map: ReturnType<typeof getTemplateSheetMap>,
  slots: DisplaySlot[]
): void {
  const theme = Number(plan.month.split("-")[1]) % 2 === 0 ? EVEN_THEME : ODD_THEME;
  const colorByToken = Object.fromEntries(theme.sequence.map((entry) => [entry.token, entry]));

  for (const slot of slots) {
    const token = plan.colorByGroupIndex[slot.groupIndex] ?? map.colorTokenOrder[slot.groupIndex % map.colorTokenOrder.length];
    const palette = colorByToken[token] ?? colorByToken[map.colorTokenOrder[0]!];

    applyRowPalette(sheet, slot.topRow, [map.dayNumberColumn, map.weekdayColumn], palette.fillHex, palette.textHex);
    if (slot.rowCount === 2) {
      applyRowPalette(sheet, slot.bottomRow, [map.dayNumberColumn, map.weekdayColumn], palette.fillHex, palette.textHex);
    }

    for (const prayer of PRAYERS) {
      const col = map.prayerColumns[prayer];
      const cols = enumerateColumns(col.startCol, col.endCol);
      applyRowPalette(sheet, slot.topRow, cols, palette.fillHex, palette.textHex);
      if (slot.rowCount === 2) {
        applyRowPalette(sheet, slot.bottomRow, cols, palette.fillHex, palette.textHex);
      }
    }
  }
}

function writePrayerColumns(
  sheet: any,
  plan: MonthlyPlan,
  map: ReturnType<typeof getTemplateSheetMap>,
  slots: DisplaySlot[]
): void {
  for (const prayer of PRAYERS) {
    const col = map.prayerColumns[prayer];

    for (const slot of slots) {
      const display = getDisplayText(slot.group, prayer, plan);
      sheet.cell(`${col.startCol}${slot.topRow}`).value(display);
      if (display.includes("\n")) {
        try {
          sheet.cell(`${col.startCol}${slot.topRow}`).style("wrapText", true);
        } catch {
          // Ignore style assignment issues for this cell.
        }
      }
      if (isRamadanMaghribDisplay(display)) {
        try {
          sheet.cell(`${col.startCol}${slot.topRow}`).style("fontSize", 15);
        } catch {
          // Ignore style assignment issues for this cell.
        }
      }
      if (col.endCol !== col.startCol) {
        sheet.cell(`${col.endCol}${slot.topRow}`).value("");
      }

      if (slot.rowCount === 2) {
        sheet.cell(`${col.startCol}${slot.bottomRow}`).value("");
        if (col.endCol !== col.startCol) {
          sheet.cell(`${col.endCol}${slot.bottomRow}`).value("");
        }
      }
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

async function rewritePrayerMergesInXml(
  xlsxPath: string,
  plan: MonthlyPlan,
  map: ReturnType<typeof getTemplateSheetMap>,
  slots: DisplaySlot[]
): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await readFile(xlsxPath));

  const sheetPath = await resolveWorksheetPath(zip);
  const sheetFile = zip.file(sheetPath);
  if (!sheetFile) {
    return;
  }

  const xml = await sheetFile.async("string");
  const dataEndRow = slots.length > 0 ? slots[slots.length - 1]!.bottomRow : map.dataStartRow;

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

  const dynamicRefs = buildDynamicPrayerMergeRefs(plan, map, slots);
  const mergedRefs = [...new Set([...keptRefs, ...dynamicRefs])];

  const updatedXml = replaceMergeBlock(xml, mergedRefs);
  zip.file(sheetPath, updatedXml);

  await writeFile(xlsxPath, await zip.generateAsync({ type: "nodebuffer" }));
}

async function resolveWorksheetPath(zip: any): Promise<string> {
  const workbook = zip.file("xl/workbook.xml");
  const rels = zip.file("xl/_rels/workbook.xml.rels");
  if (!workbook || !rels) {
    return "xl/worksheets/sheet1.xml";
  }

  const workbookXml = await workbook.async("string");
  const relsXml = await rels.async("string");

  const sheetMatch = workbookXml.match(/<sheet[^>]*r:id=\"([^\"]+)\"/);
  if (!sheetMatch) {
    return "xl/worksheets/sheet1.xml";
  }

  const rid = sheetMatch[1]!;
  const relRegex = new RegExp(`<Relationship[^>]*Id=\"${rid}\"[^>]*Target=\"([^\"]+)\"`, "i");
  const relMatch = relsXml.match(relRegex);
  if (!relMatch) {
    return "xl/worksheets/sheet1.xml";
  }

  const target = relMatch[1]!.replace(/^\/+/, "");
  return target.startsWith("xl/") ? target : `xl/${target}`;
}

function buildDynamicPrayerMergeRefs(
  plan: MonthlyPlan,
  map: ReturnType<typeof getTemplateSheetMap>,
  slots: DisplaySlot[]
): string[] {
  const refs: string[] = [];

  for (const prayer of PRAYERS) {
    const col = map.prayerColumns[prayer];
    let i = 0;

    while (i < slots.length) {
      const runStart = i;
      const display = getDisplayText(slots[i]!.group, prayer, plan);
      i += 1;

      while (
        i < slots.length
        && getDisplayText(slots[i]!.group, prayer, plan) === display
      ) {
        i += 1;
      }

      const runEnd = i - 1;
      refs.push(`${col.startCol}${slots[runStart]!.topRow}:${col.endCol}${slots[runEnd]!.bottomRow}`);
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

function getDisplayText(group: GroupResult, prayer: PrayerKey, plan: MonthlyPlan): string {
  const override = group.displayByPrayer?.[prayer];
  if (override) {
    return override;
  }
  return formatMinutes(group.iqamahByPrayer[prayer], plan.locale, plan.timeFormat);
}

function isRamadanMaghribDisplay(display: string): boolean {
  return display.startsWith("ON TIME\n~");
}

function normalizeAnnouncementMessage(input: string): string {
  return input.replace(/\r\n/g, "\n").trim();
}

type DayStyleRef = {
  fontFamily: string;
  fontSize: number;
};

function getDayStyleReference(sheet: any, map: ReturnType<typeof getTemplateSheetMap>): DayStyleRef {
  const refCell = sheet.cell(`${map.dayNumberColumn}${map.dataStartRow}`);
  let fontFamily = "Arial";
  let fontSize = 20;

  try {
    const family = refCell.style("fontFamily");
    if (typeof family === "string" && family.trim()) {
      fontFamily = family;
    }
  } catch {
    // Keep defaults.
  }
  try {
    const size = Number(refCell.style("fontSize"));
    if (Number.isFinite(size) && size > 0) {
      fontSize = size;
    }
  } catch {
    // Keep defaults.
  }

  return { fontFamily, fontSize };
}

function normalizeDayCellStyle(sheet: any, address: string, ref: DayStyleRef): void {
  const cell = sheet.cell(address);
  try {
    cell.style("horizontalAlignment", "center");
  } catch {
    // Ignore style assignment issues for this cell.
  }
  try {
    cell.style("verticalAlignment", "center");
  } catch {
    // Ignore style assignment issues for this cell.
  }
  try {
    cell.style("fontFamily", ref.fontFamily);
  } catch {
    // Ignore style assignment issues for this cell.
  }
  try {
    cell.style("fontSize", ref.fontSize);
  } catch {
    // Ignore style assignment issues for this cell.
  }
}
