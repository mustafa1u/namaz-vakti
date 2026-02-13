import type { DailyPrayerMinutes, GroupResult, IqamahRule } from "./types";
import type { PrayerKey } from "@shared/ipc";

function ceilToFive(minutes: number): number {
  return Math.ceil(minutes / 5) * 5;
}

function floorToFive(minutes: number): number {
  return Math.floor(minutes / 5) * 5;
}

function getAdjustedCandidateMinutes(day: DailyPrayerMinutes, rule: IqamahRule): number {
  const baseByPrayer: Record<PrayerKey, number> = {
    fajr: day.fajrEnd,
    zhuhr: day.zhuhrStart,
    asr: day.asrStart,
    maghrib: day.maghribStart,
    isha: day.ishaStart
  };

  const base = baseByPrayer[rule.prayer];
  return rule.direction === "after" ? base + rule.offsetMinutes : base - rule.offsetMinutes;
}

export function optimizeIqamahForPrayer(days: DailyPrayerMinutes[], rule: IqamahRule): number {
  if (days.length === 0) {
    throw new Error("Cannot optimize iqamah for empty day list.");
  }

  const adjusted = days.map((day) => getAdjustedCandidateMinutes(day, rule));
  const minAdjusted = Math.min(...adjusted);
  const maxAdjusted = Math.max(...adjusted);

  // Constraint model:
  // - "after": q must be >= each adjusted minute -> q >= max(adjusted)
  // - "before": q must be <= each adjusted minute -> q <= min(adjusted)
  // Under L1 objective, optimal q is the nearest boundary that satisfies constraints.
  if (rule.direction === "after") {
    return rule.roundedToFiveMinutes ? ceilToFive(maxAdjusted) : maxAdjusted;
  }

  return rule.roundedToFiveMinutes ? floorToFive(minAdjusted) : minAdjusted;
}

export function buildBaseGroups(
  days: DailyPrayerMinutes[],
  size: number,
  splitStartDays: Set<number> = new Set<number>()
): Array<{ startDay: number; endDay: number; days: DailyPrayerMinutes[] }> {
  const groups: Array<{ startDay: number; endDay: number; days: DailyPrayerMinutes[] }> = [];
  let chunk: DailyPrayerMinutes[] = [];

  for (const day of days) {
    if (chunk.length > 0 && splitStartDays.has(day.dayOfMonth)) {
      groups.push({
        startDay: chunk[0]!.dayOfMonth,
        endDay: chunk[chunk.length - 1]!.dayOfMonth,
        days: chunk
      });
      chunk = [];
    }

    chunk.push(day);
    if (chunk.length === size) {
      groups.push({
        startDay: chunk[0]!.dayOfMonth,
        endDay: chunk[chunk.length - 1]!.dayOfMonth,
        days: chunk
      });
      chunk = [];
    }
  }

  if (chunk.length > 0) {
    groups.push({
      startDay: chunk[0]!.dayOfMonth,
      endDay: chunk[chunk.length - 1]!.dayOfMonth,
      days: chunk
    });
  }

  return groups;
}

export function optimizeGroups(baseGroups: Array<{ startDay: number; endDay: number; days: DailyPrayerMinutes[] }>, rules: IqamahRule[]): GroupResult[] {
  return baseGroups.map((group) => {
    const iqamahByPrayer = Object.fromEntries(
      rules.map((rule) => [rule.prayer, optimizeIqamahForPrayer(group.days, rule)])
    ) as GroupResult["iqamahByPrayer"];

    return {
      startDay: group.startDay,
      endDay: group.endDay,
      iqamahByPrayer
    };
  });
}
