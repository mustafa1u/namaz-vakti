import type { Customization, PrayerKey } from "@shared/ipc";
import { DEFAULT_CUSTOMIZATION } from "@shared/ipc";
import type { IqamahRule } from "./types";

const PRAYER_ORDER: PrayerKey[] = ["fajr", "zhuhr", "asr", "maghrib", "isha"];

export function buildIqamahRulesFromCustomization(customization: Customization): IqamahRule[] {
  return PRAYER_ORDER.map((prayer) => {
    const config = customization.prayers[prayer];
    if (!config.enabled) {
      return {
        prayer,
        direction: "after",
        offsetMinutes: 0,
        minuteMultiple: 1
      };
    }

    return {
      prayer,
      direction: config.direction,
      offsetMinutes: config.offsetMinutes,
      minuteMultiple: config.minuteMultiple
    };
  });
}

export const DEFAULT_IQAMAH_RULES: IqamahRule[] = buildIqamahRulesFromCustomization(DEFAULT_CUSTOMIZATION);

export const ALLOWED_BASE_GROUP_SIZES = [5, 10, 15] as const;

export function validateBaseGroupSize(size: number): asserts size is (typeof ALLOWED_BASE_GROUP_SIZES)[number] {
  if (!ALLOWED_BASE_GROUP_SIZES.includes(size as (typeof ALLOWED_BASE_GROUP_SIZES)[number])) {
    throw new Error(`Unsupported base group size: ${size}. Use one of ${ALLOWED_BASE_GROUP_SIZES.join(", ")}.`);
  }
}
