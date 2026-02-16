import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BrowserWindow } from "electron";
import type { PrayerKey } from "@shared/ipc";
import type { GroupResult, MonthlyPlan, RawDailyRecord } from "@domain/types";
import { ODD_THEME, EVEN_THEME } from "@domain/pipeline";
import { formatMinutes, formatMonthLabel } from "@domain/format";
import { getTemplateSheetMap } from "./template-map";

type PngRenderInput = {
  outputFolder: string;
  plan: MonthlyPlan;
  masjidName: string;
  masjidAddress: string;
  announcementMessage: string;
};

type PngSlot = {
  groupIndex: number;
  group: GroupResult;
  rowCount: number;
};

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

export async function renderPng(input: PngRenderInput): Promise<string> {
  const html = buildExportHtml(input.plan, input.masjidName, input.masjidAddress, input.announcementMessage);
  const win = new BrowserWindow({
    width: 1200,
    height: 1800,
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const size = await win.webContents.executeJavaScript(
      `({
        width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
      })`
    ) as { width: number; height: number };

    win.setContentSize(Math.ceil(size.width) + 20, Math.ceil(size.height) + 20);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const image = await win.webContents.capturePage();
    const outputPath = join(input.outputFolder, `iqamah_${input.plan.month}.png`);
    await writeFile(outputPath, image.toPNG());
    return outputPath;
  } finally {
    win.destroy();
  }
}

function buildExportHtml(
  plan: MonthlyPlan,
  masjidName: string,
  masjidAddress: string,
  announcementMessage: string
): string {
  const theme = Number(plan.month.split("-")[1]) % 2 === 0 ? EVEN_THEME : ODD_THEME;
  const colorByToken = Object.fromEntries(theme.sequence.map((item) => [item.token, item]));
  const slots = buildSlots(plan.baseGroups);
  const runByGroupIndex = buildRunMap(plan.colorByGroupIndex);

  const rows: string[] = [];
  const prayerRunTables = Object.fromEntries(PRAYERS.map((p) => [p, buildRuns(slots, plan, p)])) as Record<
    PrayerKey,
    Array<{ start: number; end: number; displayText: string; displayHtml: string; rowSpan: number }>
  >;

  for (let groupIndex = 0; groupIndex < slots.length; groupIndex += 1) {
    const slot = slots[groupIndex]!;
    const group = slot.group;
    const token = plan.colorByGroupIndex[slot.groupIndex] ?? theme.sequence[0]!.token;
    const color = colorByToken[token] ?? theme.sequence[0]!;

    const run = runByGroupIndex.get(slot.groupIndex) ?? { start: slot.groupIndex, end: slot.groupIndex };
    const isRunStart = slot.groupIndex === run.start;
    const isRunEnd = slot.groupIndex === run.end;
    const runRows = sumRows(slots, run.start, run.end);
    const upperSpan = Math.max(1, runRows - 1);

    const startDay = plan.rawDays.find((day) => day.dayOfMonth === group.startDay);
    const endDay = plan.rawDays.find((day) => day.dayOfMonth === group.endDay);

    const rowClass = slot.rowCount === 1 ? "single-day" : "";
    rows.push(`<tr class="${rowClass}">`);
    if (run.start === run.end) {
      rows.push(`<td style="background:${color.fillHex};color:${color.textHex}">${group.startDay}</td>`);
      rows.push(`<td style="background:${color.fillHex};color:${color.textHex}">${weekdayLabel(startDay, plan.locale)}</td>`);
    } else if (isRunStart) {
      rows.push(`<td rowspan="${upperSpan}" style="background:${color.fillHex};color:${color.textHex}">${group.startDay}</td>`);
      rows.push(`<td rowspan="${upperSpan}" style="background:${color.fillHex};color:${color.textHex}">${weekdayLabel(startDay, plan.locale)}</td>`);
    } else if (isRunEnd && slot.rowCount === 1) {
      rows.push(`<td style="background:${color.fillHex};color:${color.textHex}">${group.endDay}</td>`);
      rows.push(`<td style="background:${color.fillHex};color:${color.textHex}">${weekdayLabel(endDay, plan.locale)}</td>`);
    }

    for (const prayer of PRAYERS) {
      const run = prayerRunTables[prayer].find((entry) => entry.start === groupIndex);
      if (!run) {
        continue;
      }
      rows.push(`<td rowspan="${run.rowSpan}" style="background:${color.fillHex};color:${color.textHex}">${run.displayHtml}</td>`);
    }

    rows.push("</tr>");

    if (slot.rowCount === 2) {
      rows.push("<tr>");
      if (run.start === run.end) {
        rows.push(`<td style="background:${color.fillHex};color:${color.textHex}">${group.endDay}</td>`);
        rows.push(`<td style="background:${color.fillHex};color:${color.textHex}">${weekdayLabel(endDay, plan.locale)}</td>`);
      } else if (isRunEnd) {
        rows.push(`<td style="background:${color.fillHex};color:${color.textHex}">${group.endDay}</td>`);
        rows.push(`<td style="background:${color.fillHex};color:${color.textHex}">${weekdayLabel(endDay, plan.locale)}</td>`);
      }
      rows.push("</tr>");
    }
  }

  const headerMonth = formatMonthLabel(plan.month, plan.locale);
  const announcementHtml = renderAnnouncementHtml(announcementMessage);
  const jumahNotesHtml = renderJumahNotesHtml(plan);
  const prayerLabels = PRAYER_LABELS[plan.locale];
  const { titleLine, addressLine } = getTemplateHeaderLines(plan.month);
  const resolvedMasjidName = normalizeHeaderLine(masjidName) || titleLine;
  const resolvedMasjidAddress = normalizeHeaderLine(masjidAddress) || addressLine;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #f1f1f1; }
      .page { width: 1000px; margin: 20px auto; background: #fff; border: 1px solid #bbb; }
      .header { background: #ececec; text-align: center; padding: 24px 20px 10px; }
      .header h1 { margin: 0 0 8px; font-size: 54px; }
      .header .address { margin: 0 0 8px; font-size: 24px; }
      .header p { margin: 0 0 8px; font-size: 30px; }
      .jumah-note { margin: 6px 0; font-size: 24px; font-weight: 700; }
      .jumah-foot { margin: 6px 0 0; font-size: 18px; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 3px solid #222; }
      th, td { border: 3px solid #222; text-align: center; padding: 8px 6px; font-size: 38px; font-weight: 700; }
      tr.single-day td { padding-top: 0; padding-bottom: 0; line-height: 0.95; }
      .ramadan-maghrib { font-size: 30px; line-height: 1.05; display: inline-block; }
      .ramadan-maghrib-label-tr { font-size: 24px; line-height: 1.05; display: inline-block; }
      .double-asterisk-ref { font-size: 30px; line-height: 1.03; display: inline-block; }
      .announcement {
        font-size: 14pt;
        text-align: center;
        padding: 10px 16px;
      }
      .announcement-top {
        background: #ececec;
      }
      th { background: #ececec; color: #000; }
      th.small { width: 8%; }
      th.day { width: 10%; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <h1>${escapeHtml(resolvedMasjidName)}</h1>
        ${resolvedMasjidAddress ? `<p class="address">${escapeHtml(resolvedMasjidAddress)}</p>` : ""}
        <p>${headerMonth}</p>
        ${jumahNotesHtml}
      </div>
      ${announcementHtml ? `<div class="announcement announcement-top">${announcementHtml}</div>` : ""}
      <table>
        <thead>
          <tr>
            <th class="small">#</th>
            <th class="day">Day</th>
            <th>${prayerLabels.fajr}</th>
            <th>${prayerLabels.zhuhr}</th>
            <th>${prayerLabels.asr}</th>
            <th>${prayerLabels.maghrib}</th>
            <th>${prayerLabels.isha}</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join("")}
        </tbody>
      </table>
    </div>
  </body>
</html>`;
}

function buildSlots(groups: GroupResult[]): PngSlot[] {
  return groups.map((group, idx) => ({
    groupIndex: idx,
    group,
    rowCount: group.startDay === group.endDay ? 1 : 2
  }));
}

function buildRuns(
  slots: PngSlot[],
  plan: MonthlyPlan,
  prayer: PrayerKey
): Array<{ start: number; end: number; displayText: string; displayHtml: string; rowSpan: number }> {
  if (slots.length === 0) {
    return [];
  }

  const runs: Array<{ start: number; end: number; displayText: string; displayHtml: string; rowSpan: number }> = [];
  let start = 0;
  let displayText = getDisplayText(slots[0]!.group, prayer, plan);

  for (let i = 1; i < slots.length; i += 1) {
    const currentText = getDisplayText(slots[i]!.group, prayer, plan);
    if (currentText !== displayText) {
      const rowSpan = sumRows(slots, start, i - 1);
      runs.push({ start, end: i - 1, displayText, displayHtml: toHtmlDisplay(displayText), rowSpan });
      start = i;
      displayText = currentText;
    }
  }

  runs.push({
    start,
    end: slots.length - 1,
    displayText,
    displayHtml: toHtmlDisplay(displayText),
    rowSpan: sumRows(slots, start, slots.length - 1)
  });
  return runs;
}

function sumRows(slots: PngSlot[], start: number, end: number): number {
  let total = 0;
  for (let i = start; i <= end; i += 1) {
    total += slots[i]!.rowCount;
  }
  return total;
}

function weekdayLabel(day: RawDailyRecord | undefined, locale: MonthlyPlan["locale"]): string {
  if (!day) {
    return "";
  }
  return locale === "tr" ? day.weekdayNameTr : day.weekdayNameEn;
}

function getDisplayText(group: GroupResult, prayer: PrayerKey, plan: MonthlyPlan): string {
  const override = group.displayByPrayer?.[prayer];
  if (override) {
    return override;
  }
  return formatMinutes(group.iqamahByPrayer[prayer], plan.locale, plan.timeFormat);
}

function toHtmlDisplay(text: string): string {
  if (text.startsWith("ZAMANINDA\n~")) {
    const parts = text.split("\n");
    const line1 = parts[0] ?? "ZAMANINDA";
    const line2 = parts[1] ?? "";
    return `<span class="ramadan-maghrib-label-tr">${line1}</span><br/>${line2}`;
  }
  if (text.startsWith("ON TIME\n~")) {
    const parts = text.split("\n");
    const line1 = parts[0] ?? "";
    const line2 = parts[1] ?? "";
    return `<span class="ramadan-maghrib">${line1}<br/>${line2}</span>`;
  }
  if (hasDoubleAsteriskReference(text)) {
    const parts = text.split("\n");
    const line1 = parts[0] ?? "";
    const line2 = parts[1] ?? "";
    return `${line1}<br/><span class="double-asterisk-ref">${line2}</span>`;
  }

  return text.replace(/\n/g, "<br/>");
}

function hasDoubleAsteriskReference(text: string): boolean {
  const parts = text.split("\n");
  if (parts.length !== 2) {
    return false;
  }
  return /^\((Bkz\.|See)\s+\*{2}\)$/.test((parts[1] ?? "").trim());
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

function renderJumahNotesHtml(plan: MonthlyPlan): string {
  const notes = plan.jumahNotes;
  const useTurkish = plan.locale === "tr";
  const footer = useTurkish ? "Kamet 20-25 dk sonra" : "Iqamah is 20-25 MINS later";
  if (notes.length === 0) {
    const firstFriday = plan.rawDays.find((day) => day.weekdayIndex === 5 || day.weekdayNameEn === "Fri");
    const fallback = firstFriday ? formatMinutes(toMinutes(firstFriday.ogle), plan.locale, plan.timeFormat) : "N/A";
    const message = useTurkish
      ? `(*) CUMA: Cuma ezanı saati ${escapeHtml(fallback)}.`
      : `(*) FRIDAY (JUM'AH): Adzan of Jum'ah is called at ${escapeHtml(fallback)}.`;
    return `<div class="jumah-note">${message}</div><div class="jumah-foot">${footer}</div>`;
  }

  if (notes.length === 1) {
    const time = formatMinutes(notes[0]!.adhanMinutes, plan.locale, plan.timeFormat);
    const message = useTurkish
      ? `(*) CUMA: Cuma ezanı saati ${escapeHtml(time)}.`
      : `(*) FRIDAY (JUM'AH): Adzan of Jum'ah is called at ${escapeHtml(time)}.`;
    return `<div class="jumah-note">${message}</div><div class="jumah-foot">${footer}</div>`;
  }

  const lines = notes
    .map((note) => {
      const range = note.startDay === note.endDay
        ? (useTurkish ? `Gün ${note.startDay}` : `Day ${note.startDay}`)
        : (useTurkish ? `Günler ${note.startDay}-${note.endDay}` : `Days ${note.startDay}-${note.endDay}`);
      const time = formatMinutes(note.adhanMinutes, plan.locale, plan.timeFormat);
      const message = useTurkish
        ? `(${escapeHtml(note.marker)})CUMA: ${escapeHtml(range)}. Cuma ezanı saati ${escapeHtml(time)}.`
        : `(${escapeHtml(note.marker)})FRIDAY (JUM'AH): ${escapeHtml(range)}. Adzan of Jum'ah is called at ${escapeHtml(time)}.`;
      return `<div class="jumah-note">${message}</div>`;
    })
    .join("");

  return `${lines}<div class="jumah-foot">${footer}</div>`;
}

function renderAnnouncementHtml(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return "";
  }

  return escapeHtml(trimmed).replace(/\r?\n/g, "<br/>");
}

function normalizeHeaderLine(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")[0]?.trim() ?? "";
}

function getTemplateHeaderLines(month: string): { titleLine: string; addressLine: string } {
  const headerTemplate = getTemplateSheetMap(month).rawHeaderTemplate;
  const lines = headerTemplate.split(/\r?\n/);
  return {
    titleLine: lines[0] ?? "Paterson Mevlana Camii",
    addressLine: lines[1] ?? ""
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function toMinutes(hhmm: string): number {
  const [hRaw, mRaw] = hhmm.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  return (h * 60) + m;
}
