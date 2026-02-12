import { z } from "zod";

export const APP_CHANNELS = {
  LIST_MONTHS: "app:list-months",
  PREVIEW_MONTH: "app:preview-month",
  GENERATE_OUTPUTS: "app:generate-outputs",
  SELECT_TSV_FOLDER: "app:select-tsv-folder",
  SELECT_OUTPUT_FOLDER: "app:select-output-folder",
  SELECT_TEMPLATE_FILE: "app:select-template-file"
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
  templateFile: z.string().min(1),
  locale: LocaleSchema.default("en"),
  timeFormat: TimeFormatSchema.default("ampm"),
  baseGroupSize: z.number().int().positive().default(5),
  includeFridayNotes: z.boolean().default(true)
});

export type GenerationOptions = z.infer<typeof GenerationOptionsSchema>;

export const IqamahSummarySchema = z.object({
  prayer: PrayerKeySchema,
  startDay: z.number().int().positive(),
  endDay: z.number().int().positive(),
  iqamahMinutes: z.number().int().nonnegative(),
  colorToken: z.string()
});

export type IqamahSummary = z.infer<typeof IqamahSummarySchema>;

export const PreviewMonthResponseSchema = z.object({
  month: z.string(),
  dayCount: z.number().int().positive(),
  groups: z.array(IqamahSummarySchema)
});

export type PreviewMonthResponse = z.infer<typeof PreviewMonthResponseSchema>;

export const GenerateOutputsResponseSchema = z.object({
  xlsxPath: z.string(),
  pngPath: z.string(),
  warnings: z.array(z.string())
});

export type GenerateOutputsResponse = z.infer<typeof GenerateOutputsResponseSchema>;

export type DesktopApi = {
  listMonths: (tsvFolder: string) => Promise<string[]>;
  previewMonth: (options: GenerationOptions) => Promise<PreviewMonthResponse>;
  generateOutputs: (options: GenerationOptions) => Promise<GenerateOutputsResponse>;
  selectTsvFolder: () => Promise<string | null>;
  selectOutputFolder: () => Promise<string | null>;
  selectTemplateFile: () => Promise<string | null>;
};
