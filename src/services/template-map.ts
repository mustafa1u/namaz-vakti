import { dirname, join } from "node:path";
import type { PrayerKey } from "@shared/ipc";

export type TemplateSheetMap = {
  sheetName: "Odd" | "Even";
  titleCell: string;
  dataStartRow: number;
  groupCount: number;
  groupHeight: number;
  sourceRowsByToken: Record<string, number>;
  dayNumberColumn: string;
  weekdayColumn: string;
  prayerColumns: Record<
    PrayerKey,
    {
      startCol: string;
      endCol: string;
      anchorCell: string;
    }
  >;
  rawHeaderTemplate: string;
  colorTokenOrder: string[];
  weekdaySource: "en" | "tr";
  spacerColumn: {
    start: string;
    end: string;
  };
};

export function resolveTemplateSheet(month: string): "Odd" | "Even" {
  const monthNumber = Number(month.split("-")[1]);
  return monthNumber % 2 === 0 ? "Even" : "Odd";
}

export function getTemplateSheetMap(month: string): TemplateSheetMap {
  const sheetName = resolveTemplateSheet(month);

  if (sheetName === "Odd") {
    return {
      sheetName,
      titleCell: "A1",
      rawHeaderTemplate:
        "Paterson Mevlana Camii\n291 Sussex St, Paterson, NJ, 07503\n[AYIN ADI], [YIL]\n\n(*)FRIDAY (JUM'AH): Adzan of Jum'ah is called at [CUMA SAATİ].\nIqamah is 20-25 MINS later",
      dataStartRow: 6,
      groupCount: 6,
      groupHeight: 2,
      dayNumberColumn: "A",
      weekdayColumn: "B",
      sourceRowsByToken: {
        "a-light": 6,
        "a-dark": 8,
        "b-light": 10,
        "b-dark": 12
      },
      prayerColumns: {
        fajr: { startCol: "C", endCol: "C", anchorCell: "C6" },
        zhuhr: { startCol: "D", endCol: "D", anchorCell: "D6" },
        asr: { startCol: "E", endCol: "E", anchorCell: "E6" },
        maghrib: { startCol: "F", endCol: "F", anchorCell: "F6" },
        isha: { startCol: "G", endCol: "G", anchorCell: "G6" }
      },
      colorTokenOrder: ["a-light", "a-dark", "b-light", "b-dark"],
      weekdaySource: "en",
      spacerColumn: { start: "H", end: "H" }
    };
  }

  return {
    sheetName,
    titleCell: "A1",
    rawHeaderTemplate:
      "Paterson Mevlana Camii (Mosque)\n291 Sussex St, Paterson, NJ, 07503\n[AYIN ADI], [YIL]\n\n(*)FRIDAY (JUM'AH): Adzan of Jum'ah is called at [CUMA SAATİ]\nIqamah is 20-25 MINS later",
    dataStartRow: 6,
    groupCount: 6,
    groupHeight: 2,
    dayNumberColumn: "A",
    weekdayColumn: "B",
    sourceRowsByToken: {
      "a-light": 6,
      "a-dark": 8,
      "b-light": 10,
      "b-dark": 12
    },
    prayerColumns: {
      fajr: { startCol: "C", endCol: "D", anchorCell: "C6" },
      zhuhr: { startCol: "E", endCol: "F", anchorCell: "E6" },
      asr: { startCol: "G", endCol: "H", anchorCell: "G6" },
      maghrib: { startCol: "I", endCol: "J", anchorCell: "I6" },
      isha: { startCol: "K", endCol: "L", anchorCell: "K6" }
    },
    colorTokenOrder: ["a-light", "a-dark", "b-light", "b-dark"],
    weekdaySource: "en",
    spacerColumn: { start: "M", end: "M" }
  };
}

export function buildSuggestedPaths(outputFolder: string, month: string): { xlsx: string; png: string } {
  return {
    xlsx: join(outputFolder, `iqamah_${month}.xlsx`),
    png: join(outputFolder, `iqamah_${month}.png`)
  };
}

export function ensureTemplateAssetsFolder(basePath: string): string {
  return join(dirname(basePath), "assets", "templates");
}
