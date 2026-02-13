import type { DailyPrayerMinutes, GroupResult, IqamahRule } from "./types";
import type { PrayerKey } from "@shared/ipc";

function ceilToFive(minutes: number): number {
  return Math.ceil(minutes / 5) * 5;
}

function floorToFive(minutes: number): number {
  return Math.floor(minutes / 5) * 5;
}

function getAnchorMinutes(day: DailyPrayerMinutes, prayer: PrayerKey): number {
  const anchorByPrayer: Record<PrayerKey, number> = {
    fajr: day.fajrEnd,
    zhuhr: day.zhuhrStart,
    asr: day.asrStart,
    maghrib: day.maghribStart,
    isha: day.ishaStart
  };

  return anchorByPrayer[prayer];
}

export function optimizeIqamahForPrayer(days: DailyPrayerMinutes[], rule: IqamahRule): number {
  if (days.length === 0) {
    throw new Error("Cannot calculate iqamah for empty day list.");
  }

  // Hard-gap model (no minimization):
  // - after x minutes: use latest anchor + x.
  // - before x minutes: use earliest anchor - x.
  // When 5-minute multiples are required, round conservatively so the minimum gap remains valid.
  if (rule.direction === "after") {
    const latestAnchor = Math.max(...days.map((day) => getAnchorMinutes(day, rule.prayer)));
    const threshold = latestAnchor + rule.offsetMinutes;
    return rule.roundedToFiveMinutes ? ceilToFive(threshold) : threshold;
  }

  const earliestAnchor = Math.min(...days.map((day) => getAnchorMinutes(day, rule.prayer)));
  const threshold = earliestAnchor - rule.offsetMinutes;
  return rule.roundedToFiveMinutes ? floorToFive(threshold) : threshold;
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
