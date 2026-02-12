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
      dataStartRow: 7,
      groupCount: 6,
      groupHeight: 2,
      dayNumberColumn: "A",
      weekdayColumn: "B",
      sourceRowsByToken: {
        "a-light": 7,
        "a-dark": 9,
        "b-light": 11,
        "b-dark": 13
      },
      prayerColumns: {
        fajr: { startCol: "C", endCol: "C", anchorCell: "C7" },
        zhuhr: { startCol: "D", endCol: "D", anchorCell: "D7" },
        asr: { startCol: "E", endCol: "E", anchorCell: "E7" },
        maghrib: { startCol: "F", endCol: "F", anchorCell: "F7" },
        isha: { startCol: "G", endCol: "G", anchorCell: "G7" }
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
    dataStartRow: 7,
    groupCount: 6,
    groupHeight: 2,
    dayNumberColumn: "A",
    weekdayColumn: "B",
    sourceRowsByToken: {
      "a-light": 7,
      "a-dark": 9,
      "b-light": 11,
      "b-dark": 13
    },
    prayerColumns: {
      fajr: { startCol: "C", endCol: "D", anchorCell: "C7" },
      zhuhr: { startCol: "E", endCol: "F", anchorCell: "E7" },
      asr: { startCol: "G", endCol: "H", anchorCell: "G7" },
      maghrib: { startCol: "I", endCol: "J", anchorCell: "I7" },
      isha: { startCol: "K", endCol: "L", anchorCell: "K7" }
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
