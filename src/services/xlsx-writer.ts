import { readFile, rename, rm, writeFile } from "node:fs/promises";
import type { PrayerKey } from "@shared/ipc";
import type { GroupResult, MonthlyPlan, RawDailyRecord } from "@domain/types";
import { formatMinutes, formatMonthLabel } from "@domain/format";
import { EVEN_THEME, ODD_THEME } from "@domain/pipeline";
import { getTemplateSheetMap } from "./template-map";
import { buildTemporaryOutputPath, buildUniqueOutputPath } from "./output-paths";

const PRAYERS: PrayerKey[] = ["fajr", "zhuhr", "asr", "maghrib", "isha"];
const PRAYER_LABELS: Record<MonthlyPlan["locale"], Record<PrayerKey, string>> = {
  en: {
    fajr: "Fajr",
    zhuhr: "Zhuhr",
    asr: "Asr",
    maghrib: "Maghrib",
    isha: "Isha"
  },
  tr: {
    fajr: "Sabah",
    zhuhr: "Öğle",
    asr: "İkindi",
    maghrib: "Akşam",
    isha: "Yatsı"
  }
};

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
  masjidName: string;
  masjidAddress: string;
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
  const masjidName = normalizeHeaderLine(input.masjidName);
  const masjidAddress = normalizeHeaderLine(input.masjidAddress);
  const announcementMessage = normalizeAnnouncementMessage(input.announcementMessage);

  writeHeader(sheet, map.rawHeaderTemplate, input.plan, masjidName, masjidAddress, announcementMessage, XlsxPopulate);
  writePrayerHeaders(sheet, input.plan, map);
  applyRowHeights(sheet, slots, pairHeights, map);
  writeDayColumns(sheet, input.plan, map, slots);
  applyGroupStyles(sheet, input.plan, map, slots);
  writePrayerColumns(sheet, input.plan, map, slots, XlsxPopulate);
  keepOnlySelectedSheet(workbook, map.sheetName);

  const outputPath = buildUniqueOutputPath({
    outputFolder: input.outputFolder,
    scheduleMonth: input.plan.month,
    locale: input.plan.locale,
    extension: "xlsx"
  });
  const temporaryOutputPath = buildTemporaryOutputPath(outputPath);
  try {
    await workbook.toFileAsync(temporaryOutputPath);
    await rewritePrayerMergesInXml(temporaryOutputPath, input.plan, map, slots);
    await rename(temporaryOutputPath, outputPath);
  } catch (error) {
    await rm(temporaryOutputPath, { force: true });
    throw error;
  }
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
  masjidName: string,
  masjidAddress: string,
  announcementMessage: string,
  xlsxPopulate: any
): void {
  const headerContent = buildHeaderContent(headerTemplate, plan, masjidName, masjidAddress);
  const normalizedAnnouncement = normalizeAnnouncementMessage(announcementMessage);
  const rich = new xlsxPopulate.RichText();
  const headerLines: HeaderLineMetric[] = [];
  addRichLine(rich, headerContent.titleLine, { fontSize: 20, bold: true }, headerLines);
  if (headerContent.addressLine) {
    addRichLine(rich, headerContent.addressLine, { fontSize: 14 }, headerLines);
  }
  addRichLine(rich, headerContent.monthLine, { fontSize: 18 }, headerLines);
  rich.add("\n");
  headerLines.push({ text: "", fontSize: 12, bold: false });

  for (let i = 0; i < headerContent.jumahLines.length; i += 1) {
    const line = headerContent.jumahLines[i]!;
    const isFooter = i === headerContent.jumahLines.length - 1;
    addRichLine(rich, line, { fontSize: isFooter ? 12 : 14, bold: true }, headerLines);
  }

  if (normalizedAnnouncement) {
    rich.add("\n");
    headerLines.push({ text: "", fontSize: 12, bold: false });
    addRichLine(rich, normalizedAnnouncement, { fontSize: 14 }, headerLines);
  }

  sheet.cell("A1").value(rich);
  try {
    sheet.cell("A1").style("wrapText", true);
  } catch {
    // Ignore style assignment issues for header cell.
  }
  adjustHeaderTopBlockHeight(sheet, headerLines);
}

function buildHeaderContent(
  headerTemplate: string,
  plan: MonthlyPlan,
  masjidName: string,
  masjidAddress: string
): { titleLine: string; addressLine: string; monthLine: string; jumahLines: string[] } {
  const monthLabel = formatMonthLabel(plan.month, plan.locale);
  const lines = headerTemplate.split(/\r?\n/);
  const titleLine = masjidName || (lines[0] ?? "Paterson Mevlana Camii");
  const addressLine = masjidAddress || (lines[1] ?? "");
  const monthLineTemplate = lines[2] ?? "[AYIN ADI], [YIL]";
  const monthLine = monthLineTemplate
    .replaceAll("[AYIN ADI]", monthLabel.split(",")[0] ?? monthLabel)
    .replaceAll("[YIL]", plan.month.slice(0, 4));

  const jumahLines = buildJumahHeaderLines(plan);
  return { titleLine, addressLine, monthLine, jumahLines };
}

function buildJumahHeaderLines(plan: MonthlyPlan): string[] {
  const notes = plan.jumahNotes;
  const out: string[] = [];
  const useTurkish = plan.locale === "tr";

  if (notes.length === 0) {
    const firstFriday = plan.rawDays.find((day) => day.weekdayIndex === 5 || day.weekdayNameEn === "Fri");
    const fallback = firstFriday ? formatMinutes(toMinutes(firstFriday.ogle), plan.locale, plan.timeFormat) : "N/A";
    out.push(useTurkish
      ? `(*)CUMA: Cuma ezanı saati ${fallback}.`
      : `(*)FRIDAY (JUM'AH): Adzan of Jum'ah is called at ${fallback}.`);
    out.push(useTurkish ? "Kamet 20-25 dk sonra" : "Iqamah is 20-25 MINS later");
    return out;
  }

  if (notes.length === 1) {
    out.push(useTurkish
      ? `(*)CUMA: Cuma ezanı saati ${formatMinutes(notes[0]!.adhanMinutes, plan.locale, plan.timeFormat)}.`
      : `(*)FRIDAY (JUM'AH): Adzan of Jum'ah is called at ${formatMinutes(notes[0]!.adhanMinutes, plan.locale, plan.timeFormat)}.`);
    out.push(useTurkish ? "Kamet 20-25 dk sonra" : "Iqamah is 20-25 MINS later");
    return out;
  }

  for (const note of notes) {
    const range = note.startDay === note.endDay
      ? (useTurkish ? `Gün ${note.startDay}` : `Day ${note.startDay}`)
      : (useTurkish ? `Günler ${note.startDay}-${note.endDay}` : `Days ${note.startDay}-${note.endDay}`);
    const time = formatMinutes(note.adhanMinutes, plan.locale, plan.timeFormat);
    out.push(useTurkish
      ? `(${note.marker})CUMA: ${range}. Cuma ezanı saati ${time}.`
      : `(${note.marker})FRIDAY (JUM'AH): ${range}. Adzan of Jum'ah is called at ${time}.`);
  }
  out.push(useTurkish ? "Kamet 20-25 dk sonra" : "Iqamah is 20-25 MINS later");
  return out;
}

function writePrayerHeaders(
  sheet: any,
  plan: MonthlyPlan,
  map: ReturnType<typeof getTemplateSheetMap>
): void {
  const headerRow = map.dataStartRow - 1;
  const labels = PRAYER_LABELS[plan.locale];

  for (const prayer of PRAYERS) {
    const col = map.prayerColumns[prayer];
    sheet.cell(`${col.startCol}${headerRow}`).value(labels[prayer]);
  }
}

function writeDayColumns(
  sheet: any,
  plan: MonthlyPlan,
  map: ReturnType<typeof getTemplateSheetMap>,
  slots: DisplaySlot[]
): void {
  const weekdaySource = plan.locale === "tr" ? "tr" : map.weekdaySource;
  const dayRefStyle = getDayStyleReference(sheet, map);
  const runByGroupIndex = buildRunMap(plan.colorByGroupIndex);
  const processedRuns = new Set<string>();

  for (const slot of slots) {
    // Clear rendered rows first; run values are written in a second pass.
    sheet.cell(`${map.dayNumberColumn}${slot.topRow}`).value("");
    sheet.cell(`${map.weekdayColumn}${slot.topRow}`).value("");
    normalizeDayCellStyle(sheet, `${map.dayNumberColumn}${slot.topRow}`, dayRefStyle);
    normalizeDayCellStyle(sheet, `${map.weekdayColumn}${slot.topRow}`, dayRefStyle);

    if (slot.rowCount === 2) {
      sheet.cell(`${map.dayNumberColumn}${slot.bottomRow}`).value("");
      sheet.cell(`${map.weekdayColumn}${slot.bottomRow}`).value("");
      normalizeDayCellStyle(sheet, `${map.dayNumberColumn}${slot.bottomRow}`, dayRefStyle);
      normalizeDayCellStyle(sheet, `${map.weekdayColumn}${slot.bottomRow}`, dayRefStyle);
    }
  }

  for (const slot of slots) {
    const run = runByGroupIndex.get(slot.groupIndex) ?? { start: slot.groupIndex, end: slot.groupIndex };
    const runKey = `${run.start}-${run.end}`;
    if (processedRuns.has(runKey)) {
      continue;
    }
    processedRuns.add(runKey);

    const runStartSlot = slots[run.start]!;
    const runEndSlot = slots[run.end]!;
    const runStartDay = plan.rawDays.find((day) => day.dayOfMonth === runStartSlot.group.startDay);
    const runEndDay = plan.rawDays.find((day) => day.dayOfMonth === runEndSlot.group.endDay);

    const startRow = runStartSlot.topRow;
    const endRow = runEndSlot.bottomRow;
    const upperEndRow = endRow - 1;

    sheet.cell(`${map.dayNumberColumn}${startRow}`).value(runStartSlot.group.startDay);
    sheet.cell(`${map.weekdayColumn}${startRow}`).value(pickWeekday(runStartDay, weekdaySource));

    if (run.start === run.end) {
      if (runStartSlot.rowCount === 2) {
        sheet.cell(`${map.dayNumberColumn}${runStartSlot.bottomRow}`).value(runStartSlot.group.endDay);
        sheet.cell(`${map.weekdayColumn}${runStartSlot.bottomRow}`).value(pickWeekday(runEndDay, weekdaySource));
      }
      continue;
    }

    sheet.cell(`${map.dayNumberColumn}${endRow}`).value(runEndSlot.group.endDay);
    sheet.cell(`${map.weekdayColumn}${endRow}`).value(pickWeekday(runEndDay, weekdaySource));

    if (upperEndRow > startRow) {
      try {
        sheet.range(`${map.dayNumberColumn}${startRow}:${map.dayNumberColumn}${upperEndRow}`).merged(true);
      } catch {
        // Ignore merge conflicts for day-number column.
      }
      try {
        sheet.range(`${map.weekdayColumn}${startRow}:${map.weekdayColumn}${upperEndRow}`).merged(true);
      } catch {
        // Ignore merge conflicts for weekday column.
      }
    }
  }
}

function buildRunMap(tokens: string[]): Map<number, { start: number; end: number }> {
  const map = new Map<number, { start: number; end: number }>();
  if (tokens.length === 0) {
    return map;
  }

  let start = 0;
  for (let i = 1; i <= tokens.length; i += 1) {
    const ended = i === tokens.length || tokens[i] !== tokens[i - 1];
    if (!ended) {
      continue;
    }

    const run = { start, end: i - 1 };
    for (let idx = start; idx <= i - 1; idx += 1) {
      map.set(idx, run);
    }
    start = i;
  }

  return map;
}

function applyGroupStyles(
  sheet: any,
  plan: MonthlyPlan,
  map: ReturnType<typeof getTemplateSheetMap>,
  slots: DisplaySlot[]
): void {
  const theme = Number(plan.month.split("-")[1]) % 2 === 0 ? EVEN_THEME : ODD_THEME;
  const colorByToken = Object.fromEntries(theme.sequence.map((entry) => [entry.token, entry]));
  const fallbackToken = map.colorTokenOrder[0] ?? theme.sequence[0]?.token;
  if (!fallbackToken) {
    return;
  }

  for (const slot of slots) {
    const token = plan.colorByGroupIndex[slot.groupIndex]
      ?? (map.colorTokenOrder.length > 0 ? map.colorTokenOrder[slot.groupIndex % map.colorTokenOrder.length] : undefined)
      ?? fallbackToken;
    const palette = colorByToken[token] ?? colorByToken[fallbackToken];
    if (!palette) {
      continue;
    }

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
  slots: DisplaySlot[],
  xlsxPopulate: any
): void {
  const prayerStyleRefs = getPrayerStyleReferences(sheet, map);

  for (const prayer of PRAYERS) {
    const col = map.prayerColumns[prayer];
    const styleRefs = prayerStyleRefs[prayer];

    for (const slot of slots) {
      const startAddress = `${col.startCol}${slot.topRow}`;
      normalizePrayerCellStyle(sheet, startAddress, styleRefs.start);
      const display = getDisplayText(slot.group, prayer, plan);
      const topCell = sheet.cell(startAddress);
      const rich = buildSpecialDisplayRichText(
        display,
        xlsxPopulate,
        toRichFontColor(topCell.style("fontColor")),
        topCell.style("bold") === true
      );
      topCell.value(rich ?? display);
      if (display.includes("\n")) {
        try {
          topCell.style("wrapText", true);
        } catch {
          // Ignore style assignment issues for this cell.
        }
      }
      if (col.endCol !== col.startCol) {
        normalizePrayerCellStyle(sheet, `${col.endCol}${slot.topRow}`, styleRefs.end);
        sheet.cell(`${col.endCol}${slot.topRow}`).value("");
      }

      if (slot.rowCount === 2) {
        normalizePrayerCellStyle(sheet, `${col.startCol}${slot.bottomRow}`, styleRefs.start);
        sheet.cell(`${col.startCol}${slot.bottomRow}`).value("");
        if (col.endCol !== col.startCol) {
          normalizePrayerCellStyle(sheet, `${col.endCol}${slot.bottomRow}`, styleRefs.end);
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
  if (!startCellRaw) {
    return null;
  }
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

function buildSpecialDisplayRichText(
  display: string,
  xlsxPopulate: any,
  fontColor: string | undefined,
  bold: boolean
): any | null {
  const [line1, line2, ...extra] = display.split("\n");
  if (!line2 || extra.length > 0) {
    return null;
  }

  if (display.startsWith("ZAMANINDA\n~")) {
    const rich = new xlsxPopulate.RichText();
    rich.add(line1 ?? "ZAMANINDA", { fontSize: 13, bold, fontColor });
    rich.add("\n");
    rich.add(line2, { fontSize: 16, bold, fontColor });
    return rich;
  }

  if (display.startsWith("ON TIME\n~")) {
    const rich = new xlsxPopulate.RichText();
    rich.add(line1 ?? "ON TIME", { fontSize: 16, bold, fontColor });
    rich.add("\n");
    rich.add(line2, { fontSize: 16, bold, fontColor });
    return rich;
  }

  if (hasDoubleAsteriskReference(line2)) {
    const rich = new xlsxPopulate.RichText();
    rich.add(line1 ?? "", { fontSize: 18, bold, fontColor });
    rich.add("\n");
    rich.add(line2, { fontSize: 16, bold, fontColor });
    return rich;
  }

  return null;
}

function hasDoubleAsteriskReference(line: string): boolean {
  return /^\((Bkz\.|See)\s+\*{2}\)$/.test(line.trim());
}

function toRichFontColor(raw: unknown): string | undefined {
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  if (raw && typeof raw === "object" && "rgb" in (raw as Record<string, unknown>)) {
    const rgb = (raw as { rgb?: unknown }).rgb;
    if (typeof rgb === "string" && rgb.trim()) {
      return rgb.trim();
    }
  }
  return undefined;
}

function normalizeAnnouncementMessage(input: string): string {
  return input.replace(/\r\n/g, "\n").trim();
}

function normalizeHeaderLine(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")[0]?.trim() ?? "";
}

type HeaderLineMetric = {
  text: string;
  fontSize: number;
  bold: boolean;
};

function addRichLine(
  rich: any,
  text: string,
  style: { fontSize: number; bold?: boolean },
  metrics?: HeaderLineMetric[]
): void {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    rich.add(line, style);
    metrics?.push({ text: line, fontSize: style.fontSize, bold: style.bold === true });
    if (i < lines.length - 1) {
      rich.add("\n");
    }
  }
  rich.add("\n");
}

function estimateHeaderHeightPoints(lines: HeaderLineMetric[]): number {
  let total = 10;
  for (const line of lines) {
    if (!line.text.trim()) {
      total += 8;
      continue;
    }
    const weightBoost = line.bold ? 2 : 0;
    total += (line.fontSize * 1.35) + weightBoost;
  }
  return total;
}

function adjustHeaderTopBlockHeight(sheet: any, lines: HeaderLineMetric[]): void {
  const row1 = Number(sheet.row(1).height()) || 15;
  const row2 = Number(sheet.row(2).height()) || 15;
  const row3 = Number(sheet.row(3).height()) || 15;
  const row4 = Number(sheet.row(4).height()) || 15;

  const fixedTop = row1 + row2 + row3;
  const defaultTotal = fixedTop + row4;
  const estimatedTotal = estimateHeaderHeightPoints(lines);
  if (estimatedTotal <= defaultTotal) {
    return;
  }

  const targetRow4 = Math.max(row4, estimatedTotal - fixedTop);
  try {
    sheet.row(4).height(Math.ceil(targetRow4));
  } catch {
    // Ignore row-height assignment issues.
  }
}

type PrayerStyleRef = {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  border: unknown;
  numberFormat: string;
  horizontalAlignment: string;
  verticalAlignment: string;
};

type PrayerColumnStyleRef = {
  start: PrayerStyleRef;
  end: PrayerStyleRef;
};

function readPrayerStyleReference(refCell: any): PrayerStyleRef {
  let fontFamily = "Arial";
  let fontSize = 20;
  let bold = true;
  let border: unknown = { left: { style: "thin" }, right: { style: "thin" }, top: { style: "thin" }, bottom: { style: "thin" } };
  let numberFormat = "General";
  let horizontalAlignment = "center";
  let verticalAlignment = "center";

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
  try {
    bold = refCell.style("bold") === true;
  } catch {
    // Keep defaults.
  }
  try {
    const rawBorder = refCell.style("border");
    if (rawBorder) {
      border = JSON.parse(JSON.stringify(rawBorder));
    }
  } catch {
    // Keep defaults.
  }
  try {
    const fmt = refCell.style("numberFormat");
    if (typeof fmt === "string" && fmt.trim()) {
      numberFormat = fmt;
    }
  } catch {
    // Keep defaults.
  }
  try {
    const h = refCell.style("horizontalAlignment");
    if (typeof h === "string" && h.trim()) {
      horizontalAlignment = h;
    }
  } catch {
    // Keep defaults.
  }
  try {
    const v = refCell.style("verticalAlignment");
    if (typeof v === "string" && v.trim()) {
      verticalAlignment = v;
    }
  } catch {
    // Keep defaults.
  }

  return { fontFamily, fontSize, bold, border, numberFormat, horizontalAlignment, verticalAlignment };
}

function getPrayerStyleReferences(
  sheet: any,
  map: ReturnType<typeof getTemplateSheetMap>
): Record<PrayerKey, PrayerColumnStyleRef> {
  const refs = {} as Record<PrayerKey, PrayerColumnStyleRef>;
  for (const prayer of PRAYERS) {
    const col = map.prayerColumns[prayer];
    const startCell = sheet.cell(`${col.startCol}${map.dataStartRow}`);
    const endCell = sheet.cell(`${col.endCol}${map.dataStartRow}`);
    refs[prayer] = {
      start: readPrayerStyleReference(startCell),
      end: readPrayerStyleReference(endCell)
    };
  }
  return refs;
}

function normalizePrayerCellStyle(sheet: any, address: string, ref: PrayerStyleRef): void {
  const cell = sheet.cell(address);
  try {
    cell.style("horizontalAlignment", ref.horizontalAlignment);
  } catch {
    // Ignore style assignment issues for this cell.
  }
  try {
    cell.style("verticalAlignment", ref.verticalAlignment);
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
  try {
    cell.style("bold", ref.bold);
  } catch {
    // Ignore style assignment issues for this cell.
  }
  try {
    cell.style("border", ref.border);
  } catch {
    // Ignore style assignment issues for this cell.
  }
  try {
    cell.style("numberFormat", "@");
  } catch {
    // Ignore style assignment issues for this cell.
  }
}

type DayStyleRef = {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  border: unknown;
  horizontalAlignment: string;
  verticalAlignment: string;
};

function getDayStyleReference(sheet: any, map: ReturnType<typeof getTemplateSheetMap>): DayStyleRef {
  const refCell = sheet.cell(`${map.dayNumberColumn}${map.dataStartRow}`);
  let fontFamily = "Arial";
  let fontSize = 20;
  let bold = false;
  let border: unknown = { left: { style: "thin" }, right: { style: "thin" }, top: { style: "thin" }, bottom: { style: "thin" } };
  let horizontalAlignment = "center";
  let verticalAlignment = "center";

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
  try {
    bold = refCell.style("bold") === true;
  } catch {
    // Keep defaults.
  }
  try {
    const rawBorder = refCell.style("border");
    if (rawBorder) {
      border = JSON.parse(JSON.stringify(rawBorder));
    }
  } catch {
    // Keep defaults.
  }
  try {
    const h = refCell.style("horizontalAlignment");
    if (typeof h === "string" && h.trim()) {
      horizontalAlignment = h;
    }
  } catch {
    // Keep defaults.
  }
  try {
    const v = refCell.style("verticalAlignment");
    if (typeof v === "string" && v.trim()) {
      verticalAlignment = v;
    }
  } catch {
    // Keep defaults.
  }

  return { fontFamily, fontSize, bold, border, horizontalAlignment, verticalAlignment };
}

function normalizeDayCellStyle(sheet: any, address: string, ref: DayStyleRef): void {
  const cell = sheet.cell(address);
  try {
    cell.style("horizontalAlignment", ref.horizontalAlignment);
  } catch {
    // Ignore style assignment issues for this cell.
  }
  try {
    cell.style("verticalAlignment", ref.verticalAlignment);
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
  try {
    cell.style("bold", ref.bold);
  } catch {
    // Ignore style assignment issues for this cell.
  }
  try {
    cell.style("border", ref.border);
  } catch {
    // Ignore style assignment issues for this cell.
  }
}
