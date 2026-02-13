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

type HicriInfo = {
  isRamazan: boolean;
  isSevval: boolean;
  hicriDay: number | null;
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

  const ramazanInfo = new Map<number, HicriInfo>();
  input.days.forEach((day) => {
    ramazanInfo.set(day.dayOfMonth, parseHicriInfo(day.hicriDate));
  });

  const splitStartDays = getDstSplitStartDays(normalizedDays);
  if (input.ramazanHesabi) {
    for (const day of getRamazanSplitStartDays(input.days, ramazanInfo)) {
      splitStartDays.add(day);
    }
  }
  const initialBuckets = buildBaseGroups(normalizedDays, input.baseGroupSize);
  const splitBuckets = splitBucketsAtDays(initialBuckets, splitStartDays);
  const baseBuckets = mergeTrailingSingletonByDefault(splitBuckets, splitStartDays);
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

function parseHicriInfo(hicriDate: string): HicriInfo {
  const cleaned = hicriDate.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const isRamazan = cleaned.includes("ramazan") || cleaned.includes("ramadan");
  const isSevval = cleaned.includes("sevval") || cleaned.includes("shawwal");
  const dayMatch = cleaned.match(/^\s*(\d{1,2})\s+/);
  const hicriDay = dayMatch ? Number(dayMatch[1]) : null;
  return { isRamazan, isSevval, hicriDay };
}

function getRamazanSplitStartDays(
  days: RawDailyRecord[],
  ramazanInfo: Map<number, HicriInfo>
): Set<number> {
  const splitDays = new Set<number>();

  const ramazanStart = days.find((day) => {
    const info = ramazanInfo.get(day.dayOfMonth);
    return info?.isRamazan && info.hicriDay === 1;
  });
  if (ramazanStart) {
    splitDays.add(ramazanStart.dayOfMonth);
  }

  const sevvalStart = days.find((day) => {
    const info = ramazanInfo.get(day.dayOfMonth);
    return info?.isSevval && info.hicriDay === 1;
  });
  if (sevvalStart) {
    splitDays.add(sevvalStart.dayOfMonth);
  }

  return splitDays;
}

function applyRamazanOverrides(
  groups: MonthlyPlan["baseGroups"],
  baseBuckets: Array<{ startDay: number; endDay: number; days: DailyPrayerMinutes[] }>,
  ramazanInfo: Map<number, HicriInfo>,
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
    const splitIndexes = bucket.days
      .map((d, idx) => (idx > 0 && splitDays.has(d.dayOfMonth) ? idx : -1))
      .filter((idx) => idx > 0);

    if (splitIndexes.length === 0) {
      out.push(bucket);
      continue;
    }

    let start = 0;
    for (const splitIndex of splitIndexes) {
      const part = bucket.days.slice(start, splitIndex);
      if (part.length > 0) {
        out.push({
          startDay: part[0]!.dayOfMonth,
          endDay: part[part.length - 1]!.dayOfMonth,
          days: part
        });
      }
      start = splitIndex;
    }

    const tail = bucket.days.slice(start);
    if (tail.length > 0) {
      out.push({
        startDay: tail[0]!.dayOfMonth,
        endDay: tail[tail.length - 1]!.dayOfMonth,
        days: tail
      });
    }
  }
  return out;
}

function mergeTrailingSingletonByDefault(
  buckets: Array<{ startDay: number; endDay: number; days: DailyPrayerMinutes[] }>,
  splitDays: Set<number>
): Array<{ startDay: number; endDay: number; days: DailyPrayerMinutes[] }> {
  if (buckets.length < 2) {
    return buckets;
  }

  const lastBucket = buckets[buckets.length - 1]!;
  if (lastBucket.days.length !== 1 || lastBucket.startDay !== lastBucket.endDay) {
    return buckets;
  }

  const lastDay = lastBucket.startDay;

  // If any rule explicitly forces a split at the last day (e.g., DST boundary), keep it standalone.
  if (splitDays.has(lastDay)) {
    return buckets;
  }

  const prevBucket = buckets[buckets.length - 2]!;
  const merged = {
    startDay: prevBucket.startDay,
    endDay: lastDay,
    days: [...prevBucket.days, ...lastBucket.days]
  };

  return [...buckets.slice(0, -2), merged];
}

function getDstSplitStartDays(days: DailyPrayerMinutes[]): Set<number> {
  const splitDays = new Set<number>();
  for (let i = 0; i < days.length - 1; i += 1) {
    const current = days[i]!;
    const next = days[i + 1]!;
    const delta = next.zhuhrStart - current.zhuhrStart;

    // If difference exceeds 50 minutes, infer DST/standard-time boundary.
    if (Math.abs(delta) > 50) {
      splitDays.add(next.dayOfMonth);
    }
  }
  return splitDays;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((part) => Number(part));
  return (h * 60) + m;
}
