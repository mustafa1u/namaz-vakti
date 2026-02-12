import type { Locale, TimeFormat } from "@shared/ipc";
import type { ColorTheme, DailyPrayerMinutes, MonthlyPlan, RawDailyRecord } from "./types";
import { DEFAULT_IQAMAH_RULES, validateBaseGroupSize } from "./iqamah-rules";
import { buildBaseGroups, optimizeGroups } from "./optimizer";
import { assignColorTokens, collapseAdjacentSameGroups } from "./grouping";

export const ODD_THEME: ColorTheme = {
  id: "odd",
  sequence: [
    { token: "a-light", fillHex: "#b8d3a8", textHex: "#000000" },
    { token: "a-dark", fillHex: "#5a8c37", textHex: "#ffffff" },
    { token: "b-light", fillHex: "#abc3db", textHex: "#000000" },
    { token: "b-dark", fillHex: "#3a79b5", textHex: "#ffffff" }
  ]
};

export const EVEN_THEME: ColorTheme = {
  id: "even",
  sequence: [
    { token: "a-light", fillHex: "#efe2b3", textHex: "#000000" },
    { token: "a-dark", fillHex: "#c39e1d", textHex: "#ffffff" },
    { token: "b-light", fillHex: "#a6a6d7", textHex: "#000000" },
    { token: "b-dark", fillHex: "#7e7ecd", textHex: "#ffffff" }
  ]
};

export type BuildMonthlyPlanInput = {
  month: string;
  locale: Locale;
  timeFormat: TimeFormat;
  baseGroupSize: number;
  days: RawDailyRecord[];
};

export function buildMonthlyPlan(input: BuildMonthlyPlanInput): MonthlyPlan {
  validateBaseGroupSize(input.baseGroupSize);

  const monthNumber = Number(input.month.split("-")[1]);
  const theme = monthNumber % 2 === 0 ? EVEN_THEME : ODD_THEME;

  const normalizedDays: DailyPrayerMinutes[] = input.days.map((day) => ({
    dayOfMonth: day.dayOfMonth,
    fajrStart: toMinutes(day.imsak),
    fajrEnd: toMinutes(day.gunes),
    zhuhrStart: toMinutes(day.ogle),
    asrStart: toMinutes(day.ikindi),
    maghribStart: toMinutes(day.aksam),
    ishaStart: toMinutes(day.yatsi)
  }));

  const baseBuckets = buildBaseGroups(normalizedDays, input.baseGroupSize);
  const baseGroups = optimizeGroups(baseBuckets, DEFAULT_IQAMAH_RULES);
  const collapsedGroups = collapseAdjacentSameGroups(baseGroups);
  const colorByGroupIndex = assignColorTokens(baseGroups, theme);

  return {
    month: input.month,
    locale: input.locale,
    timeFormat: input.timeFormat,
    rawDays: input.days,
    baseGroups,
    collapsedGroups,
    colorByGroupIndex
  };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((part) => Number(part));
  return (h * 60) + m;
}
