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
};

const PRAYERS: PrayerKey[] = ["fajr", "zhuhr", "asr", "maghrib", "isha"];

export async function renderPng(input: PngRenderInput): Promise<string> {
  const html = buildExportHtml(input.plan);
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

function buildExportHtml(plan: MonthlyPlan): string {
  const theme = Number(plan.month.split("-")[1]) % 2 === 0 ? EVEN_THEME : ODD_THEME;
  const colorByToken = Object.fromEntries(theme.sequence.map((item) => [item.token, item]));

  const rows: string[] = [];
  const prayerRunTables = Object.fromEntries(PRAYERS.map((p) => [p, buildRuns(plan.baseGroups, p)])) as Record<
    PrayerKey,
    Array<{ start: number; end: number; value: number }>
  >;

  for (let groupIndex = 0; groupIndex < plan.baseGroups.length; groupIndex += 1) {
    const group = plan.baseGroups[groupIndex]!;
    const token = plan.colorByGroupIndex[groupIndex] ?? theme.sequence[0]!.token;
    const color = colorByToken[token] ?? theme.sequence[0]!;

    const startDay = plan.rawDays.find((day) => day.dayOfMonth === group.startDay);
    const endDay = plan.rawDays.find((day) => day.dayOfMonth === group.endDay);

    rows.push(`<tr style="background:${color.fillHex};color:${color.textHex}">`);
    rows.push(`<td>${group.startDay}</td>`);
    rows.push(`<td>${weekdayLabel(startDay, plan.locale)}</td>`);

    for (const prayer of PRAYERS) {
      const run = prayerRunTables[prayer].find((entry) => entry.start === groupIndex);
      if (!run) {
        continue;
      }
      const rowspan = ((run.end - run.start) + 1) * 2;
      rows.push(`<td rowspan="${rowspan}">${formatMinutes(run.value, plan.locale, plan.timeFormat)}</td>`);
    }

    rows.push("</tr>");
    rows.push(`<tr style="background:${color.fillHex};color:${color.textHex}">`);
    rows.push(`<td>${group.endDay}</td>`);
    rows.push(`<td>${weekdayLabel(endDay, plan.locale)}</td>`);
    rows.push("</tr>");
  }

  const headerMonth = formatMonthLabel(plan.month, plan.locale);

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
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { border: 1px solid #222; text-align: center; padding: 8px 6px; font-size: 46px; font-weight: 700; }
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

function buildRuns(groups: GroupResult[], prayer: PrayerKey): Array<{ start: number; end: number; value: number }> {
  if (groups.length === 0) {
    return [];
  }

  const runs: Array<{ start: number; end: number; value: number }> = [];
  let start = 0;
  let value = groups[0]!.iqamahByPrayer[prayer];

  for (let i = 1; i < groups.length; i += 1) {
    const current = groups[i]!.iqamahByPrayer[prayer];
    if (current !== value) {
      runs.push({ start, end: i - 1, value });
      start = i;
      value = current;
    }
  }

  runs.push({ start, end: groups.length - 1, value });
  return runs;
}

function weekdayLabel(day: RawDailyRecord | undefined, locale: MonthlyPlan["locale"]): string {
  if (!day) {
    return "";
  }
  return locale === "tr" ? day.weekdayNameTr : day.weekdayNameEn;
}
