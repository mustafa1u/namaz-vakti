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

export const DirectionSchema = z.enum(["after", "before"]);
export type Direction = z.infer<typeof DirectionSchema>;

export const MinuteMultipleSchema = z.union([z.literal(1), z.literal(5), z.literal(10)]);
export type MinuteMultiple = z.infer<typeof MinuteMultipleSchema>;

export const LimitModeSchema = z.enum(["single", "std-dst"]);
export type LimitMode = z.infer<typeof LimitModeSchema>;

export const PrayerLimitConfigSchema = z.object({
  enabled: z.boolean().default(false),
  mode: LimitModeSchema.default("single"),
  singleMinutes: z.number().int().min(0).max(1439).default(0),
  standardMinutes: z.number().int().min(0).max(1439).default(0),
  daylightMinutes: z.number().int().min(0).max(1439).default(0)
});
export type PrayerLimitConfig = z.infer<typeof PrayerLimitConfigSchema>;

export const PrayerRuleConfigSchema = z.object({
  enabled: z.boolean().default(true),
  direction: DirectionSchema.default("after"),
  offsetMinutes: z.number().int().min(0).default(0),
  minuteMultiple: MinuteMultipleSchema.default(5),
  noEarlier: PrayerLimitConfigSchema.default({
    enabled: false,
    mode: "single",
    singleMinutes: 0,
    standardMinutes: 0,
    daylightMinutes: 0
  }),
  noLater: PrayerLimitConfigSchema.default({
    enabled: false,
    mode: "single",
    singleMinutes: 1439,
    standardMinutes: 1439,
    daylightMinutes: 1439
  })
});
export type PrayerRuleConfig = z.infer<typeof PrayerRuleConfigSchema>;

export const CustomizationSchema = z.object({
  prayers: z.object({
    fajr: PrayerRuleConfigSchema,
    zhuhr: PrayerRuleConfigSchema,
    asr: PrayerRuleConfigSchema,
    maghrib: PrayerRuleConfigSchema,
    isha: PrayerRuleConfigSchema
  })
});
export type Customization = z.infer<typeof CustomizationSchema>;

export const DEFAULT_CUSTOMIZATION: Customization = {
  prayers: {
    fajr: {
      enabled: true,
      direction: "before",
      offsetMinutes: 25,
      minuteMultiple: 5,
      noEarlier: {
        enabled: false,
        mode: "single",
        singleMinutes: 0,
        standardMinutes: 0,
        daylightMinutes: 0
      },
      noLater: {
        enabled: true,
        mode: "single",
        singleMinutes: 390,
        standardMinutes: 390,
        daylightMinutes: 390
      }
    },
    zhuhr: {
      enabled: true,
      direction: "after",
      offsetMinutes: 7,
      minuteMultiple: 5,
      noEarlier: {
        enabled: true,
        mode: "single",
        singleMinutes: 730,
        standardMinutes: 750,
        daylightMinutes: 810
      },
      noLater: {
        enabled: false,
        mode: "single",
        singleMinutes: 1439,
        standardMinutes: 1439,
        daylightMinutes: 1439
      }
    },
    asr: {
      enabled: true,
      direction: "after",
      offsetMinutes: 7,
      minuteMultiple: 5,
      noEarlier: {
        enabled: false,
        mode: "single",
        singleMinutes: 0,
        standardMinutes: 0,
        daylightMinutes: 0
      },
      noLater: {
        enabled: false,
        mode: "single",
        singleMinutes: 1439,
        standardMinutes: 1439,
        daylightMinutes: 1439
      }
    },
    maghrib: {
      enabled: true,
      direction: "after",
      offsetMinutes: 2,
      minuteMultiple: 1,
      noEarlier: {
        enabled: false,
        mode: "single",
        singleMinutes: 0,
        standardMinutes: 0,
        daylightMinutes: 0
      },
      noLater: {
        enabled: false,
        mode: "single",
        singleMinutes: 1439,
        standardMinutes: 1439,
        daylightMinutes: 1439
      }
    },
    isha: {
      enabled: true,
      direction: "after",
      offsetMinutes: 7,
      minuteMultiple: 5,
      noEarlier: {
        enabled: false,
        mode: "single",
        singleMinutes: 0,
        standardMinutes: 0,
        daylightMinutes: 0
      },
      noLater: {
        enabled: false,
        mode: "single",
        singleMinutes: 1439,
        standardMinutes: 1439,
        daylightMinutes: 1439
      }
    }
  }
};

export const GenerationOptionsSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  tsvFolder: z.string().min(1),
  outputFolder: z.string().min(1),
  announcementMessage: z.string().default(""),
  locale: LocaleSchema.default("en"),
  timeFormat: TimeFormatSchema.default("ampm"),
  baseGroupSize: z.number().int().positive().default(5),
  includeFridayNotes: z.boolean().default(true),
  ramazanHesabi: z.boolean().default(true),
  customization: CustomizationSchema.default(DEFAULT_CUSTOMIZATION)
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
