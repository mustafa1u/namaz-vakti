import type { GroupResult, ColorTheme } from "./types";
import type { PrayerKey } from "@shared/ipc";

const PRAYERS: PrayerKey[] = ["fajr", "zhuhr", "asr", "maghrib", "isha"];

export function areIqamahMapsEqual(a: GroupResult["iqamahByPrayer"], b: GroupResult["iqamahByPrayer"]): boolean {
  return PRAYERS.every((prayer) => a[prayer] === b[prayer]);
}

export function collapseAdjacentSameGroups(groups: GroupResult[]): GroupResult[] {
  if (groups.length === 0) {
    return [];
  }

  const out: GroupResult[] = [structuredClone(groups[0]!)];

  for (let i = 1; i < groups.length; i += 1) {
    const current = groups[i]!;
    const last = out[out.length - 1]!;

    if (areIqamahMapsEqual(last.iqamahByPrayer, current.iqamahByPrayer)) {
      last.endDay = current.endDay;
      continue;
    }

    out.push(structuredClone(current));
  }

  return out;
}

export function assignColorTokens(baseGroups: GroupResult[], theme: ColorTheme): string[] {
  if (baseGroups.length === 0) {
    return [];
  }

  const tokens: string[] = [];
  let colorIndex = 0;
  tokens.push(theme.sequence[colorIndex]!.token);

  for (let i = 1; i < baseGroups.length; i += 1) {
    const prev = baseGroups[i - 1]!;
    const curr = baseGroups[i]!;

    if (!areIqamahMapsEqual(prev.iqamahByPrayer, curr.iqamahByPrayer)) {
      colorIndex = (colorIndex + 1) % theme.sequence.length;
    }

    tokens.push(theme.sequence[colorIndex]!.token);
  }

  return tokens;
}
