import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BrowserWindow } from "electron";
import type { PrayerKey } from "@shared/ipc";
import type { GroupResult, MonthlyPlan, RawDailyRecord } from "@domain/types";
import { ODD_THEME, EVEN_THEME } from "@domain/pipeline";
import { formatMinutes, formatMonthLabel } from "@domain/format";

type PngRenderInput = {
  outputFolder: string;
  plan: MonthlyPlan;
  announcementMessage: string;
};

type PngSlot = {
  groupIndex: number;
  group: GroupResult;
  rowCount: number;
};

const PRAYERS: PrayerKey[] = ["fajr", "zhuhr", "asr", "maghrib", "isha"];

export async function renderPng(input: PngRenderInput): Promise<string> {
  const html = buildExportHtml(input.plan, input.announcementMessage);
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

function buildExportHtml(plan: MonthlyPlan, announcementMessage: string): string {
  const theme = Number(plan.month.split("-")[1]) % 2 === 0 ? EVEN_THEME : ODD_THEME;
  const colorByToken = Object.fromEntries(theme.sequence.map((item) => [item.token, item]));
  const slots = buildSlots(plan.baseGroups);

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

    const startDay = plan.rawDays.find((day) => day.dayOfMonth === group.startDay);
    const endDay = plan.rawDays.find((day) => day.dayOfMonth === group.endDay);

    const rowClass = slot.rowCount === 1 ? "single-day" : "";
    rows.push(`<tr class="${rowClass}" style="background:${color.fillHex};color:${color.textHex}">`);
    rows.push(`<td>${group.startDay}</td>`);
    rows.push(`<td>${weekdayLabel(startDay, plan.locale)}</td>`);

    for (const prayer of PRAYERS) {
      const run = prayerRunTables[prayer].find((entry) => entry.start === groupIndex);
      if (!run) {
        continue;
      }
      rows.push(`<td rowspan="${run.rowSpan}">${run.displayHtml}</td>`);
    }

    rows.push("</tr>");

    if (slot.rowCount === 2) {
      rows.push(`<tr style="background:${color.fillHex};color:${color.textHex}">`);
      rows.push(`<td>${group.endDay}</td>`);
      rows.push(`<td>${weekdayLabel(endDay, plan.locale)}</td>`);
      rows.push("</tr>");
    }
  }

  const headerMonth = formatMonthLabel(plan.month, plan.locale);
  const announcementHtml = renderAnnouncementHtml(announcementMessage);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #f1f1f1; }
      .page { width: 1000px; margin: 20px auto; background: #fff; border: 1px solid #bbb; }
      .header { background: #ececec; text-align: center; padding: 24px 20px 10px; }
      .header h1 { margin: 0 0 8px; font-size: 54px; }
      .header p { margin: 0 0 8px; font-size: 30px; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 3px solid #222; }
      th, td { border: 3px solid #222; text-align: center; padding: 8px 6px; font-size: 38px; font-weight: 700; }
      tr.single-day td { padding-top: 0; padding-bottom: 0; line-height: 0.95; }
      .ramadan-maghrib { font-size: 30px; line-height: 1.05; display: inline-block; }
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
        <h1>Paterson Mevlana Camii</h1>
        <p>${headerMonth}</p>
      </div>
      ${announcementHtml ? `<div class="announcement announcement-top">${announcementHtml}</div>` : ""}
      <table>
        <thead>
          <tr>
            <th class="small">#</th>
            <th class="day">Day</th>
            <th>Fajr</th>
            <th>Zhuhr</th>
            <th>Asr</th>
            <th>Maghrib</th>
            <th>Isha</th>
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
  if (text.startsWith("ON TIME\n~")) {
    const parts = text.split("\n");
    const line1 = parts[0] ?? "";
    const line2 = parts[1] ?? "";
    return `<span class="ramadan-maghrib">${line1}<br/>${line2}</span>`;
  }

  return text.replace(/\n/g, "<br/>");
}

function renderAnnouncementHtml(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return "";
  }

  return escapeHtml(trimmed).replace(/\r?\n/g, "<br/>");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
