import type { GroupResult, ColorTheme } from "./types";
import type { Locale, PrayerKey, TimeFormat } from "@shared/ipc";
import { formatMinutes } from "./format";

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

export function assignColorTokens(
  baseGroups: GroupResult[],
  theme: ColorTheme,
  locale: Locale,
  timeFormat: TimeFormat
): string[] {
  if (baseGroups.length === 0) {
    return [];
  }

  let order = theme.sequence.map((entry) => entry.token);
  const tokens: string[] = [order[0]!];

  const prevDisplay = {} as Record<PrayerKey, string>;
  const prevRunToken = {} as Record<PrayerKey, string>;
  for (const prayer of PRAYERS) {
    prevDisplay[prayer] = displayText(baseGroups[0]!, prayer, locale, timeFormat);
    prevRunToken[prayer] = tokens[0]!;
  }

  for (let i = 1; i < baseGroups.length; i += 1) {
    const prevGroup = baseGroups[i - 1]!;
    const currGroup = baseGroups[i]!;
    const stepChanged = !areIqamahMapsEqual(prevGroup.iqamahByPrayer, currGroup.iqamahByPrayer);

    const prevToken = tokens[i - 1]!;
    let pointer = order.indexOf(prevToken);
    if (pointer < 0) {
      pointer = 0;
    }
    if (stepChanged) {
      pointer = (pointer + 1) % order.length;
    }

    let candidate = order[pointer]!;
    let safety = 0;

    while (safety < 8) {
      const conflicts = PRAYERS.filter((prayer) => {
        const currDisplay = displayText(currGroup, prayer, locale, timeFormat);
        return currDisplay !== prevDisplay[prayer] && candidate === prevRunToken[prayer];
      });

      if (conflicts.length === 0) {
        break;
      }

      const resolved = resolveConflictCandidate(candidate, order);
      if (!sameOrder(resolved.order, order)) {
        order = resolved.order;
      }

      if (resolved.candidateToken && order.includes(resolved.candidateToken)) {
        candidate = resolved.candidateToken;
      } else {
        pointer = order.indexOf(candidate);
        if (pointer < 0) {
          pointer = 0;
        }
        pointer = (pointer + 1) % order.length;
        candidate = order[pointer]!;
      }
      safety += 1;
    }

    tokens.push(candidate);

    for (const prayer of PRAYERS) {
      const currDisplay = displayText(currGroup, prayer, locale, timeFormat);
      if (currDisplay !== prevDisplay[prayer]) {
        prevDisplay[prayer] = currDisplay;
        prevRunToken[prayer] = candidate;
      }
    }
  }

  return tokens;
}

function displayText(group: GroupResult, prayer: PrayerKey, locale: Locale, timeFormat: TimeFormat): string {
  const override = group.displayByPrayer?.[prayer];
  if (override) {
    return override;
  }

  return formatMinutes(group.iqamahByPrayer[prayer], locale, timeFormat);
}

function resolveConflictCandidate(conflictToken: string, currentOrder: string[]): { order: string[]; candidateToken: string } {
  const { family, shade } = parseToken(conflictToken);
  if (!family || !shade) {
    return { order: currentOrder, candidateToken: "" };
  }

  const families = [...new Set(currentOrder.map((token) => parseToken(token).family).filter(Boolean))];
  const otherFamily = families.find((f) => f !== family);
  if (!otherFamily) {
    return { order: currentOrder, candidateToken: "" };
  }

  const build = (f: string, s: "light" | "dark") => `${f}-${s}`;
  const desiredOrder = shade === "light"
    ? [
        build(family, "dark"),
        build(family, "light"),
        build(otherFamily, "dark"),
        build(otherFamily, "light")
      ]
    : [
        build(family, "dark"),
        build(otherFamily, "light"),
        build(otherFamily, "dark"),
        build(family, "light")
      ];
  const desiredCandidate = shade === "light"
    ? build(family, "dark")
    : build(otherFamily, "light");

  if (desiredOrder.every((token) => currentOrder.includes(token))) {
    return { order: desiredOrder, candidateToken: desiredCandidate };
  }

  return { order: currentOrder, candidateToken: desiredCandidate };
}

function parseToken(token: string): { family: string; shade: "light" | "dark" | "" } {
  const [family, shade] = token.split("-");
  if (shade === "light" || shade === "dark") {
    return { family: family ?? "", shade };
  }

  return { family: family ?? "", shade: "" };
}

function sameOrder(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}
