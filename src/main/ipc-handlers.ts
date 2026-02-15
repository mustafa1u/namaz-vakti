import { app, dialog, ipcMain } from "electron";
import type { BrowserWindow } from "electron";
import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import {
  APP_CHANNELS,
  type Customization,
  type PrayerKey,
  GenerateOutputsRequestSchema,
  GenerateOutputsResponseSchema
} from "@shared/ipc";
import { listAvailableMonths, readMonthTsv } from "@services/tsv-reader";
import { buildMonthlyPlan } from "@domain/pipeline";
import { writeXlsxFromTemplate } from "@services/xlsx-writer";
import { renderPng } from "@services/png-renderer";

type WindowGetter = () => BrowserWindow | null;
const FIXED_TEMPLATE_FILE_NAME = "Mevlana Masjid Prayer Times_KALIP.xlsx";

function resolveFixedTemplateFile(): string {
  const candidates = [
    join(process.resourcesPath, "assets", "templates", FIXED_TEMPLATE_FILE_NAME),
    join(app.getAppPath(), "assets", "templates", FIXED_TEMPLATE_FILE_NAME),
    join(app.getAppPath(), "..", "assets", "templates", FIXED_TEMPLATE_FILE_NAME),
    resolve(process.cwd(), "assets", "templates", FIXED_TEMPLATE_FILE_NAME)
  ].map((candidate) => resolve(candidate));

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Template file not found. Checked: ${candidates.join(" | ")}`);
  }
  return found;
}

function resolveTsvFolderPath(tsvFolder: string): string {
  const trimmed = tsvFolder.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }

  if (isAbsolute(trimmed)) {
    return trimmed;
  }

  const candidates = [
    join(process.resourcesPath, trimmed),
    join(app.getAppPath(), trimmed),
    join(app.getAppPath(), "..", trimmed),
    resolve(process.cwd(), trimmed)
  ].map((candidate) => resolve(candidate));

  const found = candidates.find((candidate) => existsSync(candidate));
  return found ?? resolve(process.cwd(), trimmed);
}

const PRAYER_ORDER: PrayerKey[] = ["fajr", "zhuhr", "asr", "maghrib", "isha"];

function collectLimitWarnings(customization: Customization): string[] {
  const warnings: string[] = [];

  for (const prayer of PRAYER_ORDER) {
    const config = customization.prayers[prayer];
    if (!config.noEarlier.enabled || !config.noLater.enabled) {
      continue;
    }

    const regions: Array<"single" | "standard" | "daylight"> = ["single", "standard", "daylight"];
    for (const region of regions) {
      const lower = config.noEarlier.mode === "single"
        ? config.noEarlier.singleMinutes
        : (region === "daylight" ? config.noEarlier.daylightMinutes : config.noEarlier.standardMinutes);
      const upper = config.noLater.mode === "single"
        ? config.noLater.singleMinutes
        : (region === "daylight" ? config.noLater.daylightMinutes : config.noLater.standardMinutes);
      if (lower > upper) {
        warnings.push(`${prayer}: no-earlier ${region} limit is later than no-later ${region} limit.`);
      }
    }
  }

  return warnings;
}

export function registerIpcHandlers(_getWindow: WindowGetter): void {
  console.log("[main] registering IPC handlers");

  ipcMain.handle(APP_CHANNELS.LIST_MONTHS, async (_event, tsvFolder: string) => {
    const resolvedTsvFolder = resolveTsvFolderPath(tsvFolder);
    console.log("[ipc] LIST_MONTHS", tsvFolder, "->", resolvedTsvFolder);
    return listAvailableMonths(resolvedTsvFolder);
  });

  ipcMain.handle(APP_CHANNELS.GENERATE_OUTPUTS, async (_event, rawRequest) => {
    const request = GenerateOutputsRequestSchema.parse(rawRequest);
    const { options, targets } = request;
    const resolvedTsvFolder = resolveTsvFolderPath(options.tsvFolder);
    console.log("[ipc] GENERATE_OUTPUTS", options.month, targets.join(","), resolvedTsvFolder);
    const templateFile = resolveFixedTemplateFile();
    const days = await readMonthTsv(resolvedTsvFolder, options.month);
    const plan = buildMonthlyPlan({
      month: options.month,
      locale: options.locale,
      timeFormat: options.timeFormat,
      customization: options.customization,
      baseGroupSize: options.baseGroupSize,
      ramazanHesabi: options.ramazanHesabi,
      days
    });

    const writes: Array<Promise<["xlsx" | "png", string]>> = [];
    if (targets.includes("xlsx")) {
      writes.push(
        writeXlsxFromTemplate({
          outputFolder: options.outputFolder,
          templateFile,
          plan,
          announcementMessage: options.announcementMessage
        }).then((value) => ["xlsx", value] as const)
      );
    }
    if (targets.includes("png")) {
      writes.push(
        renderPng({
          outputFolder: options.outputFolder,
          plan,
          announcementMessage: options.announcementMessage
        }).then((value) => ["png", value] as const)
      );
    }
    const completed = await Promise.all(writes);
    const byTarget = new Map(completed);

    return GenerateOutputsResponseSchema.parse({
      xlsxPath: byTarget.get("xlsx") ?? null,
      pngPath: byTarget.get("png") ?? null,
      warnings: collectLimitWarnings(options.customization)
    });
  });

  ipcMain.handle(APP_CHANNELS.SELECT_TSV_FOLDER, async () => {
    console.log("[ipc] SELECT_TSV_FOLDER");
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle(APP_CHANNELS.SELECT_OUTPUT_FOLDER, async () => {
    console.log("[ipc] SELECT_OUTPUT_FOLDER");
    const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });
}
