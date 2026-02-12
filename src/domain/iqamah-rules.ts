import type { IqamahRule } from "./types";

export const DEFAULT_IQAMAH_RULES: IqamahRule[] = [
  { prayer: "fajr", direction: "before", offsetMinutes: 25, roundedToFiveMinutes: true },
  { prayer: "zhuhr", direction: "after", offsetMinutes: 7, roundedToFiveMinutes: true },
  { prayer: "asr", direction: "after", offsetMinutes: 7, roundedToFiveMinutes: true },
  { prayer: "maghrib", direction: "after", offsetMinutes: 2, roundedToFiveMinutes: false },
  { prayer: "isha", direction: "after", offsetMinutes: 7, roundedToFiveMinutes: true }
];

export const ALLOWED_BASE_GROUP_SIZES = [5, 10, 15] as const;

export function validateBaseGroupSize(size: number): asserts size is (typeof ALLOWED_BASE_GROUP_SIZES)[number] {
  if (!ALLOWED_BASE_GROUP_SIZES.includes(size as (typeof ALLOWED_BASE_GROUP_SIZES)[number])) {
    throw new Error(`Unsupported base group size: ${size}. Use one of ${ALLOWED_BASE_GROUP_SIZES.join(", ")}.`);
  }
}
