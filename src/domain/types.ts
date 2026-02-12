import type { PrayerKey } from "@shared/ipc";

export type RawDailyRecord = {
  dateIso: string;
  dayOfMonth: number;
  weekdayIndex: number;
  weekdayNameTr: string;
  weekdayNameEn: string;
  imsak: string;
  gunes: string;
  ogle: string;
  ikindi: string;
  aksam: string;
  yatsi: string;
};

export type DailyPrayerMinutes = {
  dayOfMonth: number;
  fajrStart: number;
  fajrEnd: number;
  zhuhrStart: number;
  asrStart: number;
  maghribStart: number;
  ishaStart: number;
};

export type IqamahRule = {
  prayer: PrayerKey;
  direction: "after" | "before";
  offsetMinutes: number;
  roundedToFiveMinutes: boolean;
};

export type GroupResult = {
  startDay: number;
  endDay: number;
  iqamahByPrayer: Record<PrayerKey, number>;
};

export type ColorTheme = {
  id: "odd" | "even";
  sequence: Array<{
    fillHex: string;
    textHex: string;
    token: string;
  }>;
};

export type MonthlyPlan = {
  month: string;
  locale: "en" | "tr";
  timeFormat: "ampm" | "24h";
  rawDays: RawDailyRecord[];
  baseGroups: GroupResult[];
  collapsedGroups: GroupResult[];
  colorByGroupIndex: string[];
};
