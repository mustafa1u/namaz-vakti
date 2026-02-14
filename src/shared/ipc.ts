import { z } from "zod";

export const APP_CHANNELS = {
  LIST_MONTHS: "app:list-months",
  GENERATE_OUTPUTS: "app:generate-outputs",
  SELECT_TSV_FOLDER: "app:select-tsv-folder",
  SELECT_OUTPUT_FOLDER: "app:select-output-folder"
} as const;

export const LocaleSchema = z.enum(["en", "tr"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const TimeFormatSchema = z.enum(["ampm", "24h"]);
export type TimeFormat = z.infer<typeof TimeFormatSchema>;

export const PrayerKeySchema = z.enum(["fajr", "zhuhr", "asr", "maghrib", "isha"]);
export type PrayerKey = z.infer<typeof PrayerKeySchema>;

export const GenerationOptionsSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  tsvFolder: z.string().min(1),
  outputFolder: z.string().min(1),
  announcementMessage: z.string().default(""),
  fajrLatestLimitEnabled: z.boolean().default(true),
  fajrLatestLimitMinutes: z.number().int().min(0).max(1439).default(390),
  zhuhrEarliestLimitEnabled: z.boolean().default(true),
  zhuhrUseStandardDaylightLimits: z.boolean().default(false),
  zhuhrEarliestLimitMinutes: z.number().int().min(0).max(1439).default(730),
  zhuhrStandardEarliestLimitMinutes: z.number().int().min(0).max(1439).default(750),
  zhuhrDaylightEarliestLimitMinutes: z.number().int().min(0).max(1439).default(810),
  locale: LocaleSchema.default("en"),
  timeFormat: TimeFormatSchema.default("ampm"),
  baseGroupSize: z.number().int().positive().default(5),
  includeFridayNotes: z.boolean().default(true),
  ramazanHesabi: z.boolean().default(true)
});

export type GenerationOptions = z.infer<typeof GenerationOptionsSchema>;
export const GenerateTargetSchema = z.enum(["png", "xlsx"]);
export type GenerateTarget = z.infer<typeof GenerateTargetSchema>;
export const GenerateOutputsRequestSchema = z.object({
  options: GenerationOptionsSchema,
  targets: z.array(GenerateTargetSchema).min(1)
});
export type GenerateOutputsRequest = z.infer<typeof GenerateOutputsRequestSchema>;

export const IqamahSummarySchema = z.object({
  prayer: PrayerKeySchema,
  startDay: z.number().int().positive(),
  endDay: z.number().int().positive(),
  iqamahMinutes: z.number().int().nonnegative(),
  colorToken: z.string()
});

export type IqamahSummary = z.infer<typeof IqamahSummarySchema>;

export const GenerateOutputsResponseSchema = z.object({
  xlsxPath: z.string().nullable(),
  pngPath: z.string().nullable(),
  warnings: z.array(z.string())
});

export type GenerateOutputsResponse = z.infer<typeof GenerateOutputsResponseSchema>;

export type DesktopApi = {
  listMonths: (tsvFolder: string) => Promise<string[]>;
  generateOutputs: (request: GenerateOutputsRequest) => Promise<GenerateOutputsResponse>;
  selectTsvFolder: () => Promise<string | null>;
  selectOutputFolder: () => Promise<string | null>;
};
