import type { Locale, TimeFormat } from "@shared/ipc";
import type { ColorTheme, DailyPrayerMinutes, MonthlyPlan, RawDailyRecord } from "./types";
import { DEFAULT_IQAMAH_RULES, validateBaseGroupSize } from "./iqamah-rules";
import { buildBaseGroups, optimizeGroups } from "./optimizer";
import { assignColorTokens, collapseAdjacentSameGroups } from "./grouping";
import { formatMinutes } from "./format";

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
  ramazanHesabi: boolean;
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

  const ramazanInfo = new Map<number, { isRamazan: boolean; ramazanDay: number | null }>();
  input.days.forEach((day) => {
    ramazanInfo.set(day.dayOfMonth, parseRamazanInfo(day.hicriDate));
  });

  const splitStartDays = input.ramazanHesabi ? getRamazanSplitStartDays(input.days, ramazanInfo) : new Set<number>();
  const initialBuckets = buildBaseGroups(normalizedDays, input.baseGroupSize);
  const baseBuckets = splitBucketsAtDays(initialBuckets, splitStartDays);
  const baseGroups = optimizeGroups(baseBuckets, DEFAULT_IQAMAH_RULES);

  if (input.ramazanHesabi) {
    applyRamazanOverrides(baseGroups, baseBuckets, ramazanInfo, input.locale, input.timeFormat);
  }

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

function parseRamazanInfo(hicriDate: string): { isRamazan: boolean; ramazanDay: number | null } {
  const cleaned = hicriDate.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const isRamazan = cleaned.includes("ramazan") || cleaned.includes("ramadan");
  if (!isRamazan) {
    return { isRamazan: false, ramazanDay: null };
  }

  const dayMatch = cleaned.match(/^\s*(\d{1,2})\s+/);
  if (!dayMatch) {
    return { isRamazan: true, ramazanDay: null };
  }

  return { isRamazan: true, ramazanDay: Number(dayMatch[1]) };
}

function getRamazanSplitStartDays(
  days: RawDailyRecord[],
  ramazanInfo: Map<number, { isRamazan: boolean; ramazanDay: number | null }>
): Set<number> {
  const splitDays = new Set<number>();

  const ramazanStart = days.find((day) => {
    const info = ramazanInfo.get(day.dayOfMonth);
    return info?.isRamazan && info.ramazanDay === 1;
  });
  if (ramazanStart) {
    splitDays.add(ramazanStart.dayOfMonth);
  }

  const ramazan30 = days.find((day) => {
    const info = ramazanInfo.get(day.dayOfMonth);
    return info?.isRamazan && info.ramazanDay === 30;
  });
  const ramazan29 = days.find((day) => {
    const info = ramazanInfo.get(day.dayOfMonth);
    return info?.isRamazan && info.ramazanDay === 29;
  });

  if (ramazan30) {
    splitDays.add(ramazan30.dayOfMonth);
  } else if (ramazan29) {
    splitDays.add(ramazan29.dayOfMonth);
  }

  return splitDays;
}

function applyRamazanOverrides(
  groups: MonthlyPlan["baseGroups"],
  baseBuckets: Array<{ startDay: number; endDay: number; days: DailyPrayerMinutes[] }>,
  ramazanInfo: Map<number, { isRamazan: boolean; ramazanDay: number | null }>,
  locale: Locale,
  timeFormat: TimeFormat
): void {
  groups.forEach((group, idx) => {
    const bucket = baseBuckets[idx]!;
    const allRamazan = bucket.days.every((day) => ramazanInfo.get(day.dayOfMonth)?.isRamazan);
    if (!allRamazan) {
      return;
    }

    const fajrMedian = medianMinutes(bucket.days.map((day) => day.fajrStart + 20));
    const maghribMedian = medianMinutes(bucket.days.map((day) => day.maghribStart));

    group.iqamahByPrayer.fajr = fajrMedian;
    group.iqamahByPrayer.maghrib = maghribMedian;
    group.displayByPrayer = {
      ...(group.displayByPrayer ?? {}),
      maghrib: `ON TIME\n~${formatMinutes(maghribMedian, locale, timeFormat)}`
    };
  });
}

function medianMinutes(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }

  return Math.floor((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function splitBucketsAtDays(
  buckets: Array<{ startDay: number; endDay: number; days: DailyPrayerMinutes[] }>,
  splitDays: Set<number>
): Array<{ startDay: number; endDay: number; days: DailyPrayerMinutes[] }> {
  if (splitDays.size === 0) {
    return buckets;
  }

  const out: Array<{ startDay: number; endDay: number; days: DailyPrayerMinutes[] }> = [];
  for (const bucket of buckets) {
    const splitIndex = bucket.days.findIndex((d, idx) => idx > 0 && splitDays.has(d.dayOfMonth));
    if (splitIndex <= 0) {
      out.push(bucket);
      continue;
    }

    const left = bucket.days.slice(0, splitIndex);
    const right = bucket.days.slice(splitIndex);
    out.push({
      startDay: left[0]!.dayOfMonth,
      endDay: left[left.length - 1]!.dayOfMonth,
      days: left
    });
    out.push({
      startDay: right[0]!.dayOfMonth,
      endDay: right[right.length - 1]!.dayOfMonth,
      days: right
    });
  }
  return out;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((part) => Number(part));
  return (h * 60) + m;
}
