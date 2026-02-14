import type { GenerationOptions } from "@shared/ipc";

import {
  UI_LANGUAGE_STORAGE_KEY,
  getNextUiLanguage,
  getUiLanguage,
  initializeI18n,
  setUiLanguage,
  t,
  translateStaticDocumentText
} from "./i18n";

const tsvFolderInput = getEl<HTMLInputElement>("tsvFolder");
const outputFolderInput = getEl<HTMLInputElement>("outputFolder");
const uiLanguageValue = getEl<HTMLElement>("uiLanguageValue");
const switchUiLanguageButton = getEl<HTMLButtonElement>("switchUiLanguage");
const monthSelect = getEl<HTMLSelectElement>("month");
const localeSelect = getEl<HTMLSelectElement>("locale");
const timeFormatSelect = getEl<HTMLSelectElement>("timeFormat");
const baseGroupSizeSelect = getEl<HTMLSelectElement>("baseGroupSize");
const ramazanHesabiInput = getEl<HTMLInputElement>("ramazanHesabi");
const announcementMessageInput = getEl<HTMLTextAreaElement>("announcementMessage");
const fajrLatestLimitEnabledInput = getEl<HTMLInputElement>("fajrLatestLimitEnabled");
const fajrHourInput = getEl<HTMLInputElement>("fajrHour");
const fajrMinuteInput = getEl<HTMLInputElement>("fajrMinute");
const fajrAmPmLabel = getEl<HTMLElement>("fajrAmPm");
const zhuhrEarliestLimitEnabledInput = getEl<HTMLInputElement>("zhuhrEarliestLimitEnabled");
const zhuhrLimitModeSelect = getEl<HTMLSelectElement>("zhuhrLimitMode");
const zhuhrSingleGroup = getEl<HTMLElement>("zhuhrSingleGroup");
const zhuhrDualGroup = getEl<HTMLElement>("zhuhrDualGroup");
const zhuhrSingleHourInput = getEl<HTMLInputElement>("zhuhrSingleHour");
const zhuhrSingleMinuteInput = getEl<HTMLInputElement>("zhuhrSingleMinute");
const zhuhrSingleAmPmLabel = getEl<HTMLElement>("zhuhrSingleAmPm");
const zhuhrStdHourInput = getEl<HTMLInputElement>("zhuhrStdHour");
const zhuhrStdMinuteInput = getEl<HTMLInputElement>("zhuhrStdMinute");
const zhuhrStdAmPmLabel = getEl<HTMLElement>("zhuhrStdAmPm");
const zhuhrDstHourInput = getEl<HTMLInputElement>("zhuhrDstHour");
const zhuhrDstMinuteInput = getEl<HTMLInputElement>("zhuhrDstMinute");
const zhuhrDstAmPmLabel = getEl<HTMLElement>("zhuhrDstAmPm");
const logEl = getEl<HTMLElement>("log");
const LAST_ENTRIES_KEY = "namaz-vakti:last-entries:v1";
let fajrLatestLimitMinutesState = 390;
let zhuhrSingleLimitMinutesState = 750;
let zhuhrStandardLimitMinutesState = 750;
let zhuhrDaylightLimitMinutesState = 810;

type LastEntries = {
  tsvFolder: string;
  outputFolder: string;
  month: string;
  locale: GenerationOptions["locale"];
  timeFormat: GenerationOptions["timeFormat"];
  baseGroupSize: string;
  ramazanHesabi: boolean;
  announcementMessage: string;
  fajrLatestLimitEnabled: boolean;
  fajrLatestLimitMinutes: number;
  zhuhrEarliestLimitEnabled: boolean;
  zhuhrUseStandardDaylightLimits: boolean;
  zhuhrEarliestLimitMinutes: number;
  zhuhrStandardEarliestLimitMinutes: number;
  zhuhrDaylightEarliestLimitMinutes: number;
};

void bootstrap();

async function bootstrap(): Promise<void> {
  const savedUiLanguage = localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
  await initializeI18n(savedUiLanguage);
  applyUiTranslations();

  if (!window.appApi) {
    log(t("logs.preloadMissing"));
    return;
  }

  bindPersistence();
  bindUiLanguageSwitch();
  await restoreLastEntries();
  bindFajrLimitControls();
  bindZhuhrLimitControls();
  syncFajrLimitUi();
  syncZhuhrLimitUi();

  log(t("logs.appApiReady", { methods: Object.keys(window.appApi).join(", ") }));

  getEl<HTMLButtonElement>("pickTsv").addEventListener("click", async () => {
    try {
      log(t("logs.pickTsvClicked"));
      const path = await window.appApi.selectTsvFolder();
      log(t("logs.pickTsvResult", { path: path ?? t("common.cancelled") }));
      if (path) {
        tsvFolderInput.value = path;
        saveLastEntries();
        await refreshMonths();
      }
    } catch (error) {
      logError("errors.pickTsvFailed", error);
    }
  });

  getEl<HTMLButtonElement>("pickOutput").addEventListener("click", async () => {
    try {
      log(t("logs.pickOutputClicked"));
      const path = await window.appApi.selectOutputFolder();
      log(t("logs.pickOutputResult", { path: path ?? t("common.cancelled") }));
      if (path) {
        outputFolderInput.value = path;
        saveLastEntries();
      }
    } catch (error) {
      logError("errors.pickOutputFailed", error);
    }
  });

  getEl<HTMLButtonElement>("refreshMonths").addEventListener("click", async () => {
    try {
      await refreshMonths();
    } catch (error) {
      logError("errors.refreshMonthsFailed", error);
    }
  });

  getEl<HTMLButtonElement>("preview").addEventListener("click", async () => {
    try {
      const options = readOptions();
      saveLastEntries();
      log(t("logs.previewClicked", { month: options.month }));
      const preview = await window.appApi.previewMonth(options);
      log(t("logs.previewResult", {
        month: preview.month,
        dayCount: preview.dayCount,
        groups: JSON.stringify(preview.groups, null, 2)
      }));
    } catch (error) {
      logError("errors.previewFailed", error);
    }
  });

  getEl<HTMLButtonElement>("generate").addEventListener("click", async () => {
    try {
      const options = readOptions();
      saveLastEntries();
      log(t("logs.generateClicked", { month: options.month }));
      const result = await window.appApi.generateOutputs(options);
      const warnings = result.warnings.length > 0 ? result.warnings.join(" | ") : t("common.none");
      log(t("logs.generateResult", { xlsxPath: result.xlsxPath, pngPath: result.pngPath, warnings }));
    } catch (error) {
      logError("errors.generateFailed", error);
    }
  });
}

async function refreshMonths(): Promise<void> {
  if (!tsvFolderInput.value) {
    log(t("logs.setTsvFolderFirst"));
    return;
  }

  log(t("logs.refreshMonthsFor", { folder: tsvFolderInput.value }));
  const months = await window.appApi.listMonths(tsvFolderInput.value);
  const previousMonth = monthSelect.value;
  monthSelect.innerHTML = "";

  months.forEach((month) => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    monthSelect.appendChild(option);
  });

  if (months.length === 0) {
    log(t("logs.noMonthFilesFound"));
  } else {
    if (previousMonth && months.includes(previousMonth)) {
      monthSelect.value = previousMonth;
    }
    saveLastEntries();
    log(t("logs.foundMonths", { months: months.join(", ") }));
  }
}

function bindPersistence(): void {
  const save = () => saveLastEntries();

  tsvFolderInput.addEventListener("change", save);
  outputFolderInput.addEventListener("change", save);
  monthSelect.addEventListener("change", save);
  localeSelect.addEventListener("change", save);
  timeFormatSelect.addEventListener("change", () => {
    syncFajrLimitUi();
    syncZhuhrLimitUi();
    save();
  });
  baseGroupSizeSelect.addEventListener("change", save);
  ramazanHesabiInput.addEventListener("change", save);
  announcementMessageInput.addEventListener("change", save);
  announcementMessageInput.addEventListener("input", save);
  fajrLatestLimitEnabledInput.addEventListener("change", () => {
    syncFajrLimitUi();
    save();
  });
  zhuhrEarliestLimitEnabledInput.addEventListener("change", () => {
    syncZhuhrLimitUi();
    save();
  });
  zhuhrLimitModeSelect.addEventListener("change", () => {
    syncZhuhrLimitUi();
    save();
  });
}

function bindUiLanguageSwitch(): void {
  switchUiLanguageButton.addEventListener("click", async () => {
    const nextLanguage = getNextUiLanguage();
    await setUiLanguage(nextLanguage);
    localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, nextLanguage);
    applyUiTranslations();
    syncFajrLimitUi();
    syncZhuhrLimitUi();
  });
}

function applyUiTranslations(): void {
  translateStaticDocumentText();
  const currentLanguage = getUiLanguage();
  uiLanguageValue.textContent = t(`languages.${currentLanguage}`);
  switchUiLanguageButton.textContent = currentLanguage === "en"
    ? t("buttons.switchToTurkish")
    : t("buttons.switchToEnglish");
}

async function restoreLastEntries(): Promise<void> {
  const saved = loadLastEntries();
  if (!saved) {
    return;
  }

  tsvFolderInput.value = saved.tsvFolder;
  outputFolderInput.value = saved.outputFolder;
  localeSelect.value = saved.locale;
  timeFormatSelect.value = saved.timeFormat;
  baseGroupSizeSelect.value = saved.baseGroupSize;
  ramazanHesabiInput.checked = saved.ramazanHesabi;
  announcementMessageInput.value = saved.announcementMessage;
  fajrLatestLimitEnabledInput.checked = saved.fajrLatestLimitEnabled;
  fajrLatestLimitMinutesState = clampDayMinute(saved.fajrLatestLimitMinutes);
  zhuhrEarliestLimitEnabledInput.checked = saved.zhuhrEarliestLimitEnabled;
  zhuhrLimitModeSelect.value = saved.zhuhrUseStandardDaylightLimits ? "std-dst" : "single";
  zhuhrSingleLimitMinutesState = clampDayMinute(saved.zhuhrEarliestLimitMinutes);
  zhuhrStandardLimitMinutesState = clampDayMinute(saved.zhuhrStandardEarliestLimitMinutes);
  zhuhrDaylightLimitMinutesState = clampDayMinute(saved.zhuhrDaylightEarliestLimitMinutes);
  syncFajrLimitUi();
  syncZhuhrLimitUi();

  if (saved.tsvFolder) {
    await refreshMonths();
    if (saved.month && Array.from(monthSelect.options).some((opt) => opt.value === saved.month)) {
      monthSelect.value = saved.month;
    }
  }

  log(t("logs.restoredLastEntries"));
}

function saveLastEntries(): void {
  const data: LastEntries = {
    tsvFolder: tsvFolderInput.value.trim(),
    outputFolder: outputFolderInput.value.trim(),
    month: monthSelect.value,
    locale: localeSelect.value as GenerationOptions["locale"],
    timeFormat: timeFormatSelect.value as GenerationOptions["timeFormat"],
    baseGroupSize: baseGroupSizeSelect.value,
    ramazanHesabi: ramazanHesabiInput.checked,
    announcementMessage: announcementMessageInput.value,
    fajrLatestLimitEnabled: fajrLatestLimitEnabledInput.checked,
    fajrLatestLimitMinutes: fajrLatestLimitMinutesState,
    zhuhrEarliestLimitEnabled: zhuhrEarliestLimitEnabledInput.checked,
    zhuhrUseStandardDaylightLimits: zhuhrLimitModeSelect.value === "std-dst",
    zhuhrEarliestLimitMinutes: zhuhrSingleLimitMinutesState,
    zhuhrStandardEarliestLimitMinutes: zhuhrStandardLimitMinutesState,
    zhuhrDaylightEarliestLimitMinutes: zhuhrDaylightLimitMinutesState
  };

  localStorage.setItem(LAST_ENTRIES_KEY, JSON.stringify(data));
}

function loadLastEntries(): LastEntries | null {
  const raw = localStorage.getItem(LAST_ENTRIES_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LastEntries>;
    return {
      tsvFolder: parsed.tsvFolder ?? "",
      outputFolder: parsed.outputFolder ?? "",
      month: parsed.month ?? "",
      locale: parsed.locale === "tr" ? "tr" : "en",
      timeFormat: parsed.timeFormat === "24h" ? "24h" : "ampm",
      baseGroupSize: parsed.baseGroupSize ?? "5",
      ramazanHesabi: parsed.ramazanHesabi === true,
      announcementMessage: parsed.announcementMessage ?? "",
      fajrLatestLimitEnabled: parsed.fajrLatestLimitEnabled === true,
      fajrLatestLimitMinutes: Number.isFinite(parsed.fajrLatestLimitMinutes) ? Number(parsed.fajrLatestLimitMinutes) : 390,
      zhuhrEarliestLimitEnabled: parsed.zhuhrEarliestLimitEnabled === true,
      zhuhrUseStandardDaylightLimits: parsed.zhuhrUseStandardDaylightLimits === true,
      zhuhrEarliestLimitMinutes: Number.isFinite(parsed.zhuhrEarliestLimitMinutes) ? Number(parsed.zhuhrEarliestLimitMinutes) : 750,
      zhuhrStandardEarliestLimitMinutes: Number.isFinite(parsed.zhuhrStandardEarliestLimitMinutes) ? Number(parsed.zhuhrStandardEarliestLimitMinutes) : 750,
      zhuhrDaylightEarliestLimitMinutes: Number.isFinite(parsed.zhuhrDaylightEarliestLimitMinutes) ? Number(parsed.zhuhrDaylightEarliestLimitMinutes) : 810
    };
  } catch {
    return null;
  }
}

function readOptions(): GenerationOptions {
  return {
    month: monthSelect.value,
    tsvFolder: tsvFolderInput.value,
    outputFolder: outputFolderInput.value,
    announcementMessage: announcementMessageInput.value,
    fajrLatestLimitEnabled: fajrLatestLimitEnabledInput.checked,
    fajrLatestLimitMinutes: fajrLatestLimitMinutesState,
    zhuhrEarliestLimitEnabled: zhuhrEarliestLimitEnabledInput.checked,
    zhuhrUseStandardDaylightLimits: zhuhrLimitModeSelect.value === "std-dst",
    zhuhrEarliestLimitMinutes: zhuhrSingleLimitMinutesState,
    zhuhrStandardEarliestLimitMinutes: zhuhrStandardLimitMinutesState,
    zhuhrDaylightEarliestLimitMinutes: zhuhrDaylightLimitMinutesState,
    locale: localeSelect.value as GenerationOptions["locale"],
    timeFormat: timeFormatSelect.value as GenerationOptions["timeFormat"],
    baseGroupSize: Number(baseGroupSizeSelect.value),
    includeFridayNotes: true,
    ramazanHesabi: ramazanHesabiInput.checked
  };
}

function bindFajrLimitControls(): void {
  getEl<HTMLButtonElement>("fajrHourInc").addEventListener("click", () => {
    incrementFajrHour(1);
    saveLastEntries();
  });
  getEl<HTMLButtonElement>("fajrHourDec").addEventListener("click", () => {
    incrementFajrHour(-1);
    saveLastEntries();
  });
  getEl<HTMLButtonElement>("fajrMinuteInc").addEventListener("click", () => {
    incrementFajrMinute(1);
    saveLastEntries();
  });
  getEl<HTMLButtonElement>("fajrMinuteDec").addEventListener("click", () => {
    incrementFajrMinute(-1);
    saveLastEntries();
  });

  fajrHourInput.addEventListener("change", () => {
    applyManualFajrHour();
    saveLastEntries();
  });
  fajrMinuteInput.addEventListener("change", () => {
    applyManualFajrMinute();
    saveLastEntries();
  });
}

function syncFajrLimitUi(): void {
  const enabled = fajrLatestLimitEnabledInput.checked;
  const timeFormat = timeFormatSelect.value as GenerationOptions["timeFormat"];

  const display = formatLimitForUi(fajrLatestLimitMinutesState, timeFormat);
  fajrHourInput.value = String(display.hour).padStart(2, "0");
  fajrMinuteInput.value = String(display.minute).padStart(2, "0");
  fajrAmPmLabel.textContent = display.suffix;
  fajrAmPmLabel.style.visibility = timeFormat === "24h" ? "hidden" : "visible";

  fajrHourInput.disabled = !enabled;
  fajrMinuteInput.disabled = !enabled;
  getEl<HTMLButtonElement>("fajrHourInc").disabled = !enabled;
  getEl<HTMLButtonElement>("fajrHourDec").disabled = !enabled;
  getEl<HTMLButtonElement>("fajrMinuteInc").disabled = !enabled;
  getEl<HTMLButtonElement>("fajrMinuteDec").disabled = !enabled;
}

function incrementFajrHour(step: number): void {
  fajrLatestLimitMinutesState = clampDayMinute(fajrLatestLimitMinutesState + (step * 60));
  syncFajrLimitUi();
}

function incrementFajrMinute(step: number): void {
  fajrLatestLimitMinutesState = clampDayMinute(fajrLatestLimitMinutesState + step);
  syncFajrLimitUi();
}

function applyManualFajrHour(): void {
  const timeFormat = timeFormatSelect.value as GenerationOptions["timeFormat"];
  const raw = Number(fajrHourInput.value);
  if (!Number.isFinite(raw)) {
    syncFajrLimitUi();
    return;
  }

  const hour = Math.trunc(raw);
  const currentMinute = fajrLatestLimitMinutesState % 60;
  if (timeFormat === "24h") {
    if (hour < 0 || hour > 23) {
      syncFajrLimitUi();
      return;
    }
    fajrLatestLimitMinutesState = (hour * 60) + currentMinute;
    syncFajrLimitUi();
    return;
  }

  if (hour < 1 || hour > 12) {
    syncFajrLimitUi();
    return;
  }
  const currentHour24 = Math.floor(fajrLatestLimitMinutesState / 60);
  const isPm = currentHour24 >= 12;
  const hour24 = (hour % 12) + (isPm ? 12 : 0);
  fajrLatestLimitMinutesState = (hour24 * 60) + currentMinute;
  syncFajrLimitUi();
}

function applyManualFajrMinute(): void {
  const raw = Number(fajrMinuteInput.value);
  if (!Number.isFinite(raw)) {
    syncFajrLimitUi();
    return;
  }
  const minute = Math.trunc(raw);
  if (minute < 0 || minute > 59) {
    syncFajrLimitUi();
    return;
  }
  const hour24 = Math.floor(fajrLatestLimitMinutesState / 60);
  fajrLatestLimitMinutesState = (hour24 * 60) + minute;
  syncFajrLimitUi();
}

function bindZhuhrLimitControls(): void {
  getEl<HTMLButtonElement>("zhuhrSingleHourInc").addEventListener("click", () => {
    incrementZhuhrHour("single", 1);
    saveLastEntries();
  });
  getEl<HTMLButtonElement>("zhuhrSingleHourDec").addEventListener("click", () => {
    incrementZhuhrHour("single", -1);
    saveLastEntries();
  });
  getEl<HTMLButtonElement>("zhuhrSingleMinuteInc").addEventListener("click", () => {
    incrementZhuhrMinute("single", 1);
    saveLastEntries();
  });
  getEl<HTMLButtonElement>("zhuhrSingleMinuteDec").addEventListener("click", () => {
    incrementZhuhrMinute("single", -1);
    saveLastEntries();
  });

  getEl<HTMLButtonElement>("zhuhrStdHourInc").addEventListener("click", () => {
    incrementZhuhrHour("standard", 1);
    saveLastEntries();
  });
  getEl<HTMLButtonElement>("zhuhrStdHourDec").addEventListener("click", () => {
    incrementZhuhrHour("standard", -1);
    saveLastEntries();
  });
  getEl<HTMLButtonElement>("zhuhrStdMinuteInc").addEventListener("click", () => {
    incrementZhuhrMinute("standard", 1);
    saveLastEntries();
  });
  getEl<HTMLButtonElement>("zhuhrStdMinuteDec").addEventListener("click", () => {
    incrementZhuhrMinute("standard", -1);
    saveLastEntries();
  });

  getEl<HTMLButtonElement>("zhuhrDstHourInc").addEventListener("click", () => {
    incrementZhuhrHour("daylight", 1);
    saveLastEntries();
  });
  getEl<HTMLButtonElement>("zhuhrDstHourDec").addEventListener("click", () => {
    incrementZhuhrHour("daylight", -1);
    saveLastEntries();
  });
  getEl<HTMLButtonElement>("zhuhrDstMinuteInc").addEventListener("click", () => {
    incrementZhuhrMinute("daylight", 1);
    saveLastEntries();
  });
  getEl<HTMLButtonElement>("zhuhrDstMinuteDec").addEventListener("click", () => {
    incrementZhuhrMinute("daylight", -1);
    saveLastEntries();
  });

  zhuhrSingleHourInput.addEventListener("change", () => {
    applyManualZhuhrHour("single", zhuhrSingleHourInput);
    saveLastEntries();
  });
  zhuhrSingleMinuteInput.addEventListener("change", () => {
    applyManualZhuhrMinute("single", zhuhrSingleMinuteInput);
    saveLastEntries();
  });
  zhuhrStdHourInput.addEventListener("change", () => {
    applyManualZhuhrHour("standard", zhuhrStdHourInput);
    saveLastEntries();
  });
  zhuhrStdMinuteInput.addEventListener("change", () => {
    applyManualZhuhrMinute("standard", zhuhrStdMinuteInput);
    saveLastEntries();
  });
  zhuhrDstHourInput.addEventListener("change", () => {
    applyManualZhuhrHour("daylight", zhuhrDstHourInput);
    saveLastEntries();
  });
  zhuhrDstMinuteInput.addEventListener("change", () => {
    applyManualZhuhrMinute("daylight", zhuhrDstMinuteInput);
    saveLastEntries();
  });
}

function syncZhuhrLimitUi(): void {
  const enabled = zhuhrEarliestLimitEnabledInput.checked;
  const useDualMode = zhuhrLimitModeSelect.value === "std-dst";
  const timeFormat = timeFormatSelect.value as GenerationOptions["timeFormat"];

  const singleDisplay = formatLimitForUi(zhuhrSingleLimitMinutesState, timeFormat);
  zhuhrSingleHourInput.value = String(singleDisplay.hour).padStart(2, "0");
  zhuhrSingleMinuteInput.value = String(singleDisplay.minute).padStart(2, "0");
  zhuhrSingleAmPmLabel.textContent = singleDisplay.suffix;

  const standardDisplay = formatLimitForUi(zhuhrStandardLimitMinutesState, timeFormat);
  zhuhrStdHourInput.value = String(standardDisplay.hour).padStart(2, "0");
  zhuhrStdMinuteInput.value = String(standardDisplay.minute).padStart(2, "0");
  zhuhrStdAmPmLabel.textContent = standardDisplay.suffix;

  const daylightDisplay = formatLimitForUi(zhuhrDaylightLimitMinutesState, timeFormat);
  zhuhrDstHourInput.value = String(daylightDisplay.hour).padStart(2, "0");
  zhuhrDstMinuteInput.value = String(daylightDisplay.minute).padStart(2, "0");
  zhuhrDstAmPmLabel.textContent = daylightDisplay.suffix;

  const ampmVisibility = timeFormat === "24h" ? "hidden" : "visible";
  zhuhrSingleAmPmLabel.style.visibility = ampmVisibility;
  zhuhrStdAmPmLabel.style.visibility = ampmVisibility;
  zhuhrDstAmPmLabel.style.visibility = ampmVisibility;

  zhuhrSingleGroup.style.display = useDualMode ? "none" : "flex";
  zhuhrDualGroup.style.display = useDualMode ? "flex" : "none";

  zhuhrLimitModeSelect.disabled = !enabled;

  setZhuhrGroupDisabled("single", !enabled || useDualMode);
  setZhuhrGroupDisabled("standard", !enabled || !useDualMode);
  setZhuhrGroupDisabled("daylight", !enabled || !useDualMode);
}

function setZhuhrGroupDisabled(group: "single" | "standard" | "daylight", disabled: boolean): void {
  const prefix = group === "single" ? "zhuhrSingle" : group === "standard" ? "zhuhrStd" : "zhuhrDst";
  getEl<HTMLButtonElement>(`${prefix}HourInc`).disabled = disabled;
  getEl<HTMLButtonElement>(`${prefix}HourDec`).disabled = disabled;
  getEl<HTMLButtonElement>(`${prefix}MinuteInc`).disabled = disabled;
  getEl<HTMLButtonElement>(`${prefix}MinuteDec`).disabled = disabled;
  getEl<HTMLInputElement>(`${prefix}Hour`).disabled = disabled;
  getEl<HTMLInputElement>(`${prefix}Minute`).disabled = disabled;
}

function incrementZhuhrHour(group: "single" | "standard" | "daylight", step: number): void {
  const current = getZhuhrLimitState(group);
  setZhuhrLimitState(group, clampDayMinute(current + (step * 60)));
  syncZhuhrLimitUi();
}

function incrementZhuhrMinute(group: "single" | "standard" | "daylight", step: number): void {
  const current = getZhuhrLimitState(group);
  setZhuhrLimitState(group, clampDayMinute(current + step));
  syncZhuhrLimitUi();
}

function applyManualZhuhrHour(
  group: "single" | "standard" | "daylight",
  inputEl: HTMLInputElement
): void {
  const timeFormat = timeFormatSelect.value as GenerationOptions["timeFormat"];
  const raw = Number(inputEl.value);
  if (!Number.isFinite(raw)) {
    syncZhuhrLimitUi();
    return;
  }

  const hour = Math.trunc(raw);
  const currentMinute = getZhuhrLimitState(group) % 60;
  if (timeFormat === "24h") {
    if (hour < 0 || hour > 23) {
      syncZhuhrLimitUi();
      return;
    }
    setZhuhrLimitState(group, (hour * 60) + currentMinute);
    syncZhuhrLimitUi();
    return;
  }

  if (hour < 1 || hour > 12) {
    syncZhuhrLimitUi();
    return;
  }

  const currentHour24 = Math.floor(getZhuhrLimitState(group) / 60);
  const isPm = currentHour24 >= 12;
  const hour24 = (hour % 12) + (isPm ? 12 : 0);
  setZhuhrLimitState(group, (hour24 * 60) + currentMinute);
  syncZhuhrLimitUi();
}

function applyManualZhuhrMinute(
  group: "single" | "standard" | "daylight",
  inputEl: HTMLInputElement
): void {
  const raw = Number(inputEl.value);
  if (!Number.isFinite(raw)) {
    syncZhuhrLimitUi();
    return;
  }
  const minute = Math.trunc(raw);
  if (minute < 0 || minute > 59) {
    syncZhuhrLimitUi();
    return;
  }

  const hour24 = Math.floor(getZhuhrLimitState(group) / 60);
  setZhuhrLimitState(group, (hour24 * 60) + minute);
  syncZhuhrLimitUi();
}

function getZhuhrLimitState(group: "single" | "standard" | "daylight"): number {
  if (group === "single") {
    return zhuhrSingleLimitMinutesState;
  }
  if (group === "standard") {
    return zhuhrStandardLimitMinutesState;
  }
  return zhuhrDaylightLimitMinutesState;
}

function setZhuhrLimitState(group: "single" | "standard" | "daylight", value: number): void {
  if (group === "single") {
    zhuhrSingleLimitMinutesState = value;
    return;
  }
  if (group === "standard") {
    zhuhrStandardLimitMinutesState = value;
    return;
  }
  zhuhrDaylightLimitMinutesState = value;
}

function clampDayMinute(value: number): number {
  return Math.max(0, Math.min(1439, Math.trunc(value)));
}

function formatLimitForUi(
  minutes: number,
  timeFormat: GenerationOptions["timeFormat"]
): { hour: number; minute: number; suffix: string } {
  const mm = clampDayMinute(minutes);
  const hour24 = Math.floor(mm / 60);
  const minute = mm % 60;

  if (timeFormat === "24h") {
    return { hour: hour24, minute, suffix: "" };
  }

  const suffix = hour24 < 12 ? t("time.am") : t("time.pm");
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour: hour12, minute, suffix };
}

function log(message: string): void {
  console.log(`[renderer] ${message}`);
  logEl.textContent = `${new Date().toISOString()}\n${message}`;
}

function logError(prefixKey: string, error: unknown): void {
  const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const prefix = t(prefixKey);
  console.error(`[renderer] ${prefix}`, error);
  log(t("logs.errorWithDetails", { prefix, details }));
}

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Element not found: ${id}`);
  }
  return el as T;
}
