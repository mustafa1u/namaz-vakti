import type { Locale, TimeFormat } from "@shared/ipc";
import type { ColorTheme, DailyPrayerMinutes, JumahNote, MonthlyPlan, RawDailyRecord } from "./types";
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

type DayBucket = {
  startDay: number;
  endDay: number;
  days: DailyPrayerMinutes[];
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

  const dstSplitStartDays = getDstSplitStartDays(normalizedDays);
  const splitStartDays = new Set<number>(dstSplitStartDays);
  if (input.ramazanHesabi) {
    for (const day of getRamazanSplitStartDays(input.days, ramazanInfo)) {
      splitStartDays.add(day);
    }
  }
  const initialBuckets = buildBaseGroups(normalizedDays, input.baseGroupSize);
  const splitBuckets = splitBucketsAtDays(initialBuckets, splitStartDays);
  const normalizedSplitBuckets = mergeSplitSingletons(splitBuckets, splitStartDays);
  const baseBuckets = mergeTrailingSingletonByDefault(normalizedSplitBuckets, splitStartDays);
  const baseGroups = optimizeGroups(baseBuckets, DEFAULT_IQAMAH_RULES);

  if (input.ramazanHesabi) {
    applyRamazanOverrides(baseGroups, baseBuckets, ramazanInfo, input.locale, input.timeFormat);
  }
  const jumahNotes = buildJumahNotes(input.days, normalizedDays, dstSplitStartDays);
  applyJumahNoteMarkers(baseGroups, jumahNotes, input.locale, input.timeFormat);

  const collapsedGroups = collapseAdjacentSameGroups(baseGroups);
  const colorByGroupIndex = assignColorTokens(baseGroups, theme, input.locale, input.timeFormat);

  return {
    month: input.month,
    locale: input.locale,
    timeFormat: input.timeFormat,
    rawDays: input.days,
    baseGroups,
    collapsedGroups,
    colorByGroupIndex,
    jumahNotes
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

function applyJumahNoteMarkers(
  groups: MonthlyPlan["baseGroups"],
  jumahNotes: JumahNote[],
  locale: Locale,
  timeFormat: TimeFormat
): void {
  if (jumahNotes.length === 0) {
    return;
  }

  for (const group of groups) {
    const note = jumahNotes.find((entry) => group.startDay >= entry.startDay && group.startDay <= entry.endDay);
    if (!note) {
      continue;
    }

    const zhuhrDisplay = formatMinutes(group.iqamahByPrayer.zhuhr, locale, timeFormat);
    const suffix = jumahNotes.length > 1 ? `(See ${note.marker})` : `(${note.marker})`;
    group.displayByPrayer = {
      ...(group.displayByPrayer ?? {}),
      zhuhr: `${zhuhrDisplay}\n${suffix}`
    };
  }
}

function buildJumahNotes(
  rawDays: RawDailyRecord[],
  days: DailyPrayerMinutes[],
  dstSplitStartDays: Set<number>
): JumahNote[] {
  if (rawDays.length === 0 || days.length === 0) {
    return [];
  }

  const dayMap = new Map<number, RawDailyRecord>(rawDays.map((day) => [day.dayOfMonth, day]));
  const lastDay = rawDays[rawDays.length - 1]!.dayOfMonth;

  const starts = [...new Set([1, ...[...dstSplitStartDays].filter((d) => d >= 1 && d <= lastDay)])].sort((a, b) => a - b);
  const notes: Omit<JumahNote, "marker">[] = [];

  for (let i = 0; i < starts.length; i += 1) {
    const startDay = starts[i]!;
    const endDay = i < starts.length - 1 ? (starts[i + 1]! - 1) : lastDay;
    const regionDays = days.filter((day) => day.dayOfMonth >= startDay && day.dayOfMonth <= endDay);
    if (regionDays.length === 0) {
      continue;
    }

    const fridayZhuhr = regionDays
      .filter((day) => dayMap.get(day.dayOfMonth)?.weekdayNameEn === "Fri")
      .map((day) => day.zhuhrStart);
    if (fridayZhuhr.length === 0) {
      continue;
    }

    const regionMedianZhuhr = medianMinutes(regionDays.map((day) => day.zhuhrStart));
    const standardAnchor = (12 * 60) + 15;
    const daylightAnchor = (13 * 60) + 15;
    const regionType = Math.abs(regionMedianZhuhr - standardAnchor) <= Math.abs(regionMedianZhuhr - daylightAnchor)
      ? "standard"
      : "daylight";
    const baseline = regionType === "standard" ? standardAnchor : daylightAnchor;
    const latestFridayZhuhr = Math.max(...fridayZhuhr);
    const adhanMinutes = ceilToFive(Math.max(latestFridayZhuhr, baseline));

    notes.push({
      startDay,
      endDay,
      adhanMinutes,
      regionType
    });
  }

  return notes.map((note, idx) => ({
    ...note,
    marker: "*".repeat(idx + 1)
  }));
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

function ceilToFive(minutes: number): number {
  return Math.ceil(minutes / 5) * 5;
}

function splitBucketsAtDays(
  buckets: DayBucket[],
  splitDays: Set<number>
): DayBucket[] {
  if (splitDays.size === 0) {
    return buckets;
  }

  const out: DayBucket[] = [];
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

function mergeSplitSingletons(buckets: DayBucket[], splitDays: Set<number>): DayBucket[] {
  const out = [...buckets];

  let i = 0;
  while (i < out.length) {
    const current = out[i]!;
    if (current.days.length !== 1) {
      i += 1;
      continue;
    }

    const day = current.startDay;
    const isLowerHalfSingleton = splitDays.has(day);
    const isUpperHalfSingleton = splitDays.has(day + 1);

    // Not created by a split boundary.
    if (!isLowerHalfSingleton && !isUpperHalfSingleton) {
      i += 1;
      continue;
    }

    // Between two consecutive split boundaries: allow standalone singleton.
    if (isLowerHalfSingleton && isUpperHalfSingleton) {
      i += 1;
      continue;
    }

    // Upper half of split: prefer joining the group above.
    if (isUpperHalfSingleton) {
      if (i === 0) {
        i += 1;
        continue;
      }

      const prev = out[i - 1]!;
      const mergedDays = [...prev.days, ...current.days];
      out.splice(i - 1, 2, {
        startDay: mergedDays[0]!.dayOfMonth,
        endDay: mergedDays[mergedDays.length - 1]!.dayOfMonth,
        days: mergedDays
      });
      i = Math.max(0, i - 1);
      continue;
    }

    // Lower half of split: prefer joining the group below.
    if (i === out.length - 1) {
      i += 1;
      continue;
    }

    const next = out[i + 1]!;
    const mergedDays = [...current.days, ...next.days];
    out.splice(i, 2, {
      startDay: mergedDays[0]!.dayOfMonth,
      endDay: mergedDays[mergedDays.length - 1]!.dayOfMonth,
      days: mergedDays
    });
  }

  return out;
}

function mergeTrailingSingletonByDefault(
  buckets: DayBucket[],
  splitDays: Set<number>
): DayBucket[] {
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
