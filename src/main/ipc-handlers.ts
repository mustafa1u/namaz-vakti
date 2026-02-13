import { dialog, ipcMain } from "electron";
import type { BrowserWindow } from "electron";
import {
  APP_CHANNELS,
  GenerationOptionsSchema,
  PreviewMonthResponseSchema,
  GenerateOutputsResponseSchema
} from "@shared/ipc";
import { listAvailableMonths, readMonthTsv } from "@services/tsv-reader";
import { buildMonthlyPlan } from "@domain/pipeline";
import { writeXlsxFromTemplate } from "@services/xlsx-writer";
import { renderPng } from "@services/png-renderer";

type WindowGetter = () => BrowserWindow | null;

export function registerIpcHandlers(_getWindow: WindowGetter): void {
  console.log("[main] registering IPC handlers");

  ipcMain.handle(APP_CHANNELS.LIST_MONTHS, async (_event, tsvFolder: string) => {
    console.log("[ipc] LIST_MONTHS", tsvFolder);
    return listAvailableMonths(tsvFolder);
  });

  ipcMain.handle(APP_CHANNELS.PREVIEW_MONTH, async (_event, rawOptions) => {
    const options = GenerationOptionsSchema.parse(rawOptions);
    console.log("[ipc] PREVIEW_MONTH", options.month);
    const days = await readMonthTsv(options.tsvFolder, options.month);
    const plan = buildMonthlyPlan({
      month: options.month,
      locale: options.locale,
      timeFormat: options.timeFormat,
      baseGroupSize: options.baseGroupSize,
      ramazanHesabi: options.ramazanHesabi,
      days
    });

    return PreviewMonthResponseSchema.parse({
      month: options.month,
      dayCount: days.length,
      groups: plan.baseGroups.flatMap((group, groupIndex) =>
        Object.entries(group.iqamahByPrayer).map(([prayer, iqamahMinutes]) => ({
          prayer,
          startDay: group.startDay,
          endDay: group.endDay,
          iqamahMinutes,
          colorToken: plan.colorByGroupIndex[groupIndex] ?? "a-light"
        }))
      )
    });
  });

  ipcMain.handle(APP_CHANNELS.GENERATE_OUTPUTS, async (_event, rawOptions) => {
    const options = GenerationOptionsSchema.parse(rawOptions);
    console.log("[ipc] GENERATE_OUTPUTS", options.month);
    const days = await readMonthTsv(options.tsvFolder, options.month);
    const plan = buildMonthlyPlan({
      month: options.month,
      locale: options.locale,
      timeFormat: options.timeFormat,
      baseGroupSize: options.baseGroupSize,
      ramazanHesabi: options.ramazanHesabi,
      days
    });

    const [xlsxPath, pngPath] = await Promise.all([
      writeXlsxFromTemplate({
        outputFolder: options.outputFolder,
        templateFile: options.templateFile,
        plan,
        announcementMessage: options.announcementMessage
      }),
      renderPng({
        outputFolder: options.outputFolder,
        plan,
        announcementMessage: options.announcementMessage
      })
    ]);

    return GenerateOutputsResponseSchema.parse({
      xlsxPath,
      pngPath,
      warnings: []
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

  ipcMain.handle(APP_CHANNELS.SELECT_TEMPLATE_FILE, async () => {
    console.log("[ipc] SELECT_TEMPLATE_FILE");
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Excel", extensions: ["xlsx"] }]
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });
}
