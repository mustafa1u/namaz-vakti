
import {
  CustomizationSchema,
  DEFAULT_CUSTOMIZATION,
  type Customization,
  type GenerationOptions,
  type GenerateTarget,
  type LimitMode,
  type MinuteMultiple,
  type PrayerKey
} from "@shared/ipc";

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
const switchUiLanguageButton = getEl<HTMLButtonElement>("switchUiLanguage");
const monthSelect = getEl<HTMLSelectElement>("month");
const localeSelect = getEl<HTMLSelectElement>("locale");
const timeFormatSelect = getEl<HTMLSelectElement>("timeFormat");
const baseGroupSizeSelect = getEl<HTMLSelectElement>("baseGroupSize");
const ramazanHesabiInput = getEl<HTMLInputElement>("ramazanHesabi");
const masjidNameInput = getEl<HTMLInputElement>("masjidName");
const masjidAddressInput = getEl<HTMLInputElement>("masjidAddress");
const announcementMessageInput = getEl<HTMLTextAreaElement>("announcementMessage");
const advancedLimitRowsEl = getEl<HTMLElement>("advancedLimitRows");
const openCustomizeButton = getEl<HTMLButtonElement>("openCustomize");
const customizeModal = getEl<HTMLElement>("customizeModal");
const customizePrayers = getEl<HTMLElement>("customizePrayers");
const saveCustomizeButton = getEl<HTMLButtonElement>("saveCustomize");
const cancelCustomizeButton = getEl<HTMLButtonElement>("cancelCustomize");
const statusMessageEl = getEl<HTMLElement>("statusMessage");
const generatePngButton = getEl<HTMLButtonElement>("generatePng");
const generateXlsxButton = getEl<HTMLButtonElement>("generateXlsx");
const resetDefaultsButton = getEl<HTMLButtonElement>("resetDefaults");

const PRAYER_ORDER: PrayerKey[] = ["fajr", "zhuhr", "asr", "maghrib", "isha"];
const LIMIT_ORDER: Array<"noEarlier" | "noLater"> = ["noEarlier", "noLater"];
const DEFAULT_TSV_FOLDER = "assets/out_monthly";
const LAST_ENTRIES_KEY = "namaz-vakti:last-entries:v4";
const LEGACY_V3_KEY = "namaz-vakti:last-entries:v3";
const LEGACY_V2_KEY = "namaz-vakti:last-entries:v2";

type ActiveLimitRow = {
  prayer: PrayerKey;
  limitType: "noEarlier" | "noLater";
};

type LastEntries = {
  tsvFolder: string;
  outputFolder: string;
  month: string;
  locale: GenerationOptions["locale"];
  timeFormat: GenerationOptions["timeFormat"];
  baseGroupSize: string;
  ramazanHesabi: boolean;
  masjidName: string;
  masjidAddress: string;
  announcementMessage: string;
  customization: Customization;
};

type LegacyEntriesV3 = Partial<LastEntries> & {
  zhuhrUseStandardDaylightLimits?: boolean;
  zhuhrEarliestLimitMinutes?: number;
  zhuhrStandardEarliestLimitMinutes?: number;
  zhuhrDaylightEarliestLimitMinutes?: number;
  fajrLatestLimitEnabled?: boolean;
  fajrLatestLimitMinutes?: number;
  zhuhrEarliestLimitEnabled?: boolean;
};

type LegacyPrayerConfig = {
  enabled?: boolean;
  direction?: "after" | "before";
  offsetMinutes?: number;
  minuteMultiple?: 1 | 5 | 10;
  noEarlierEnabled?: boolean;
  noLaterEnabled?: boolean;
};

let customizationState = cloneCustomization(DEFAULT_CUSTOMIZATION);
let draftCustomizationState = cloneCustomization(DEFAULT_CUSTOMIZATION);
let isGenerating = false;

void bootstrap();

async function bootstrap(): Promise<void> {
  const savedUiLanguage = localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
  await initializeI18n(savedUiLanguage);

  initializeCustomizeModalUi();
  applyUiTranslations();

  if (!window.appApi) {
    log(t("logs.preloadMissing"));
    return;
  }

  bindPersistence();
  bindUiLanguageSwitch();
  bindCustomizeModalHandlers();

  await restoreLastEntries();

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

  generatePngButton.addEventListener("click", async () => {
    await generateForTarget("png");
  });

  generateXlsxButton.addEventListener("click", async () => {
    await generateForTarget("xlsx");
  });

  resetDefaultsButton.addEventListener("click", async () => {
    try {
      await resetToDefaults();
    } catch (error) {
      logError("errors.refreshMonthsFailed", error);
    }
  });
}

async function refreshMonths(): Promise<void> {
  if (!tsvFolderInput.value.trim()) {
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
    return;
  }

  if (previousMonth && months.includes(previousMonth)) {
    monthSelect.value = previousMonth;
  }
  saveLastEntries();
  log(t("logs.foundMonths", { months: months.join(", ") }));
}
function bindPersistence(): void {
  const save = () => saveLastEntries();

  tsvFolderInput.addEventListener("change", save);
  outputFolderInput.addEventListener("change", save);
  monthSelect.addEventListener("change", save);
  localeSelect.addEventListener("change", save);
  timeFormatSelect.addEventListener("change", () => {
    renderAdvancedLimitRows();
    save();
  });
  baseGroupSizeSelect.addEventListener("change", save);
  ramazanHesabiInput.addEventListener("change", save);
  masjidNameInput.addEventListener("change", save);
  masjidNameInput.addEventListener("input", save);
  masjidAddressInput.addEventListener("change", save);
  masjidAddressInput.addEventListener("input", save);
  announcementMessageInput.addEventListener("change", save);
  announcementMessageInput.addEventListener("input", save);
}

function bindUiLanguageSwitch(): void {
  switchUiLanguageButton.addEventListener("click", async () => {
    const nextLanguage = getNextUiLanguage();
    await setUiLanguage(nextLanguage);
    localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, nextLanguage);
    applyUiTranslations();
    renderAdvancedLimitRows();
    syncCustomizeModalUiFromDraft();
  });
}

function applyUiTranslations(): void {
  translateStaticDocumentText();
  const currentLanguage = getUiLanguage();
  switchUiLanguageButton.textContent = currentLanguage === "en"
    ? t("buttons.switchToTurkish")
    : t("buttons.switchToEnglish");
}

async function restoreLastEntries(): Promise<void> {
  const saved = loadLastEntries();
  if (!saved) {
    applyFreshDefaults();
    renderAdvancedLimitRows();
    await refreshMonths();
    saveLastEntries();
    return;
  }

  tsvFolderInput.value = saved.tsvFolder.trim() || DEFAULT_TSV_FOLDER;
  outputFolderInput.value = saved.outputFolder;
  localeSelect.value = saved.locale;
  timeFormatSelect.value = saved.timeFormat;
  baseGroupSizeSelect.value = saved.baseGroupSize;
  ramazanHesabiInput.checked = saved.ramazanHesabi;
  masjidNameInput.value = saved.masjidName;
  masjidAddressInput.value = saved.masjidAddress;
  announcementMessageInput.value = saved.announcementMessage;
  customizationState = sanitizeCustomization(saved.customization);

  renderAdvancedLimitRows();

  if (tsvFolderInput.value.trim()) {
    await refreshMonths();
    if (saved.month && Array.from(monthSelect.options).some((option) => option.value === saved.month)) {
      monthSelect.value = saved.month;
    }
    saveLastEntries();
  }

  log(t("logs.restoredLastEntries"));
}

function saveLastEntries(): void {
  const data: LastEntries = {
    tsvFolder: tsvFolderInput.value.trim(),
    outputFolder: outputFolderInput.value.trim(),
    month: monthSelect.value,
    locale: localeSelect.value === "tr" ? "tr" : "en",
    timeFormat: timeFormatSelect.value === "24h" ? "24h" : "ampm",
    baseGroupSize: normalizeBaseGroupSize(baseGroupSizeSelect.value),
    ramazanHesabi: ramazanHesabiInput.checked,
    masjidName: masjidNameInput.value,
    masjidAddress: masjidAddressInput.value,
    announcementMessage: announcementMessageInput.value,
    customization: sanitizeCustomization(customizationState)
  };

  localStorage.setItem(LAST_ENTRIES_KEY, JSON.stringify(data));
}

function loadLastEntries(): LastEntries | null {
  const v4Raw = localStorage.getItem(LAST_ENTRIES_KEY);
  if (v4Raw) {
    const parsedV4 = parseV4Entries(v4Raw);
    if (parsedV4) {
      return parsedV4;
    }
  }

  const v3Raw = localStorage.getItem(LEGACY_V3_KEY);
  if (v3Raw) {
    const migratedV3 = parseLegacyEntries(v3Raw);
    if (migratedV3) {
      return migratedV3;
    }
  }

  const v2Raw = localStorage.getItem(LEGACY_V2_KEY);
  if (v2Raw) {
    return parseLegacyEntries(v2Raw);
  }

  return null;
}

function parseV4Entries(raw: string): LastEntries | null {
  try {
    const parsed = JSON.parse(raw) as Partial<LastEntries>;
    const parsedCustomization = CustomizationSchema.safeParse(parsed.customization);
    if (!parsedCustomization.success) {
      return null;
    }

    return {
      tsvFolder: parsed.tsvFolder?.trim() || DEFAULT_TSV_FOLDER,
      outputFolder: parsed.outputFolder ?? "",
      month: parsed.month ?? "",
      locale: parsed.locale === "tr" ? "tr" : "en",
      timeFormat: parsed.timeFormat === "24h" ? "24h" : "ampm",
      baseGroupSize: normalizeBaseGroupSize(parsed.baseGroupSize),
      ramazanHesabi: parsed.ramazanHesabi !== false,
      masjidName: parsed.masjidName ?? "",
      masjidAddress: parsed.masjidAddress ?? "",
      announcementMessage: parsed.announcementMessage ?? "",
      customization: sanitizeCustomization(parsedCustomization.data)
    };
  } catch {
    return null;
  }
}

function parseLegacyEntries(raw: string): LastEntries | null {
  try {
    const parsed = JSON.parse(raw) as LegacyEntriesV3;
    return {
      tsvFolder: parsed.tsvFolder?.trim() || DEFAULT_TSV_FOLDER,
      outputFolder: parsed.outputFolder ?? "",
      month: parsed.month ?? "",
      locale: parsed.locale === "tr" ? "tr" : "en",
      timeFormat: parsed.timeFormat === "24h" ? "24h" : "ampm",
      baseGroupSize: normalizeBaseGroupSize(parsed.baseGroupSize),
      ramazanHesabi: parsed.ramazanHesabi !== false,
      masjidName: parsed.masjidName ?? "",
      masjidAddress: parsed.masjidAddress ?? "",
      announcementMessage: parsed.announcementMessage ?? "",
      customization: migrateLegacyCustomization(parsed)
    };
  } catch {
    return null;
  }
}

function migrateLegacyCustomization(parsed: LegacyEntriesV3): Customization {
  const migrated = cloneCustomization(DEFAULT_CUSTOMIZATION);
  const legacyPrayers = (parsed.customization as { prayers?: Partial<Record<PrayerKey, LegacyPrayerConfig>> } | undefined)?.prayers;

  for (const prayer of PRAYER_ORDER) {
    const old = legacyPrayers?.[prayer];
    if (!old) {
      continue;
    }

    if (typeof old.enabled === "boolean") {
      migrated.prayers[prayer].enabled = old.enabled;
    }
    if (old.direction === "after" || old.direction === "before") {
      migrated.prayers[prayer].direction = old.direction;
    }
    if (typeof old.offsetMinutes === "number" && Number.isFinite(old.offsetMinutes)) {
      migrated.prayers[prayer].offsetMinutes = Math.max(0, Math.trunc(old.offsetMinutes));
    }
    if (old.minuteMultiple === 1 || old.minuteMultiple === 5 || old.minuteMultiple === 10) {
      migrated.prayers[prayer].minuteMultiple = old.minuteMultiple;
    }
    if (typeof old.noEarlierEnabled === "boolean") {
      migrated.prayers[prayer].noEarlier.enabled = old.noEarlierEnabled;
    }
    if (typeof old.noLaterEnabled === "boolean") {
      migrated.prayers[prayer].noLater.enabled = old.noLaterEnabled;
    }
  }

  migrated.prayers.fajr.noLater.enabled = parsed.fajrLatestLimitEnabled !== false;
  const legacyFajr = toMinuteWithDefault(parsed.fajrLatestLimitMinutes, 390);
  migrated.prayers.fajr.noLater.mode = "single";
  migrated.prayers.fajr.noLater.singleMinutes = legacyFajr;
  migrated.prayers.fajr.noLater.standardMinutes = legacyFajr;
  migrated.prayers.fajr.noLater.daylightMinutes = legacyFajr;

  migrated.prayers.zhuhr.noEarlier.enabled = parsed.zhuhrEarliestLimitEnabled !== false;
  migrated.prayers.zhuhr.noEarlier.mode = parsed.zhuhrUseStandardDaylightLimits ? "std-dst" : "single";
  migrated.prayers.zhuhr.noEarlier.singleMinutes = toMinuteWithDefault(parsed.zhuhrEarliestLimitMinutes, 730);
  migrated.prayers.zhuhr.noEarlier.standardMinutes = toMinuteWithDefault(parsed.zhuhrStandardEarliestLimitMinutes, 750);
  migrated.prayers.zhuhr.noEarlier.daylightMinutes = toMinuteWithDefault(parsed.zhuhrDaylightEarliestLimitMinutes, 810);

  return sanitizeCustomization(migrated);
}

function readOptions(): GenerationOptions {
  return {
    month: monthSelect.value,
    tsvFolder: tsvFolderInput.value.trim(),
    outputFolder: outputFolderInput.value.trim(),
    masjidName: masjidNameInput.value,
    masjidAddress: masjidAddressInput.value,
    announcementMessage: announcementMessageInput.value,
    locale: localeSelect.value === "tr" ? "tr" : "en",
    timeFormat: timeFormatSelect.value === "24h" ? "24h" : "ampm",
    baseGroupSize: Number(normalizeBaseGroupSize(baseGroupSizeSelect.value)),
    includeFridayNotes: true,
    ramazanHesabi: ramazanHesabiInput.checked,
    customization: sanitizeCustomization(customizationState)
  };
}

function applyFreshDefaults(): void {
  tsvFolderInput.value = DEFAULT_TSV_FOLDER;
  outputFolderInput.value = "";
  monthSelect.value = "";
  localeSelect.value = "en";
  timeFormatSelect.value = "ampm";
  baseGroupSizeSelect.value = "5";
  ramazanHesabiInput.checked = true;
  masjidNameInput.value = "";
  masjidAddressInput.value = "";
  announcementMessageInput.value = "";
  customizationState = cloneCustomization(DEFAULT_CUSTOMIZATION);
  draftCustomizationState = cloneCustomization(DEFAULT_CUSTOMIZATION);
}

async function resetToDefaults(): Promise<void> {
  localStorage.removeItem(LAST_ENTRIES_KEY);
  localStorage.removeItem(LEGACY_V3_KEY);
  localStorage.removeItem(LEGACY_V2_KEY);
  applyFreshDefaults();
  renderAdvancedLimitRows();
  await refreshMonths();
  saveLastEntries();
  showStatus(t("status.defaultsRestored"));
}

function validateBeforeGenerate(options: GenerationOptions): string[] {
  const errors: string[] = [];
  if (!options.month) {
    errors.push(t("validation.monthRequired"));
  }
  if (!options.outputFolder.trim()) {
    errors.push(t("validation.outputFolderRequired"));
  }
  if (!options.tsvFolder.trim()) {
    errors.push(t("validation.tsvFolderRequired"));
  }
  return errors;
}

function setGenerateButtonsDisabled(disabled: boolean): void {
  generatePngButton.disabled = disabled;
  generateXlsxButton.disabled = disabled;
}

async function generateForTarget(target: GenerateTarget): Promise<void> {
  if (isGenerating) {
    return;
  }

  const options = readOptions();
  const validationErrors = validateBeforeGenerate(options);
  if (validationErrors.length > 0) {
    showStatus(t("status.validationFailed", { details: validationErrors.join(" ") }));
    return;
  }

  isGenerating = true;
  setGenerateButtonsDisabled(true);
  saveLastEntries();
  const targetLabel = target === "png" ? "PNG" : "XLSX";

  try {
    log(t("logs.generateClicked", { month: options.month, target: targetLabel }));
    const response = await window.appApi.generateOutputs({ options, targets: [target] });
    if (response.warnings.length > 0) {
      showStatus(response.warnings.join(" | "));
    } else {
      showStatus("");
    }
  } catch (error) {
    const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    showStatus(t("status.generateFailed", { target: targetLabel, details }));
    logError("errors.generateFailed", error);
  } finally {
    isGenerating = false;
    setGenerateButtonsDisabled(false);
  }
}
function getOrderedActiveLimitRows(customization: Customization): ActiveLimitRow[] {
  const rows: ActiveLimitRow[] = [];
  for (const prayer of PRAYER_ORDER) {
    for (const limitType of LIMIT_ORDER) {
      const config = customization.prayers[prayer][limitType];
      if (config.enabled) {
        rows.push({ prayer, limitType });
      }
    }
  }
  return rows;
}

function renderAdvancedLimitRows(): void {
  const timeFormat = timeFormatSelect.value === "24h" ? "24h" : "ampm";
  const rows = getOrderedActiveLimitRows(customizationState);

  if (rows.length === 0) {
    advancedLimitRowsEl.innerHTML = "";
    return;
  }

  advancedLimitRowsEl.innerHTML = rows.map((row) => buildLimitRowHtml(row, timeFormat)).join("");

  for (const row of rows) {
    bindLimitRowEvents(row);
  }
}

function buildLimitRowHtml(row: ActiveLimitRow, timeFormat: GenerationOptions["timeFormat"]): string {
  const limitConfig = customizationState.prayers[row.prayer][row.limitType];
  const rowKey = `${row.prayer}:${row.limitType}`;
  const rowLabel = `${t(`prayers.${row.prayer}`)} ${t(row.limitType === "noEarlier" ? "labels.noEarlierLimit" : "labels.noLaterLimit")}`;
  const singleDisplay = formatLimitForUi(limitConfig.singleMinutes, timeFormat);
  const standardDisplay = formatLimitForUi(limitConfig.standardMinutes, timeFormat);
  const daylightDisplay = formatLimitForUi(limitConfig.daylightMinutes, timeFormat);
  const ampmVisibility = timeFormat === "24h" ? "hidden" : "visible";
  const singleHidden = limitConfig.mode === "std-dst" ? "display:none;" : "";
  const dualHidden = limitConfig.mode === "std-dst" ? "" : "display:none;";

  return `
    <div class="row" data-row-key="${rowKey}">
      <label>${rowLabel}</label>
      <div class="limit-row-time">
        <select class="limit-mode" data-role="mode">
          <option value="single" ${limitConfig.mode === "single" ? "selected" : ""}>${t("options.zhuhrLimitMode.single")}</option>
          <option value="std-dst" ${limitConfig.mode === "std-dst" ? "selected" : ""}>${t("options.zhuhrLimitMode.stdDst")}</option>
        </select>

        <div class="time-group" data-role="single" style="${singleHidden}">
          ${renderTimeGroupControls(rowKey, "single", singleDisplay.hour, singleDisplay.minute, singleDisplay.suffix, ampmVisibility)}
        </div>

        <div class="time-group" data-role="dual" style="${dualHidden}">
          <div class="time-group">
            <span class="group-label">${t("options.zhuhrGroup.standard")}</span>
            ${renderTimeGroupControls(rowKey, "standard", standardDisplay.hour, standardDisplay.minute, standardDisplay.suffix, ampmVisibility)}
          </div>
          <div class="time-group">
            <span class="group-label">${t("options.zhuhrGroup.daylight")}</span>
            ${renderTimeGroupControls(rowKey, "daylight", daylightDisplay.hour, daylightDisplay.minute, daylightDisplay.suffix, ampmVisibility)}
          </div>
        </div>
      </div>
      <span></span>
    </div>
  `;
}

function renderTimeGroupControls(
  rowKey: string,
  target: "single" | "standard" | "daylight",
  hour: number,
  minute: number,
  suffix: string,
  ampmVisibility: "hidden" | "visible"
): string {
  return `
    <button class="tiny" type="button" data-role="adjust" data-row-key="${rowKey}" data-target="${target}" data-part="hour" data-step="-1">-</button>
    <input type="text" inputmode="numeric" data-role="input" data-row-key="${rowKey}" data-target="${target}" data-part="hour" value="${String(hour).padStart(2, "0")}" />
    <button class="tiny" type="button" data-role="adjust" data-row-key="${rowKey}" data-target="${target}" data-part="hour" data-step="1">+</button>
    <span>:</span>
    <button class="tiny" type="button" data-role="adjust" data-row-key="${rowKey}" data-target="${target}" data-part="minute" data-step="-1">-</button>
    <input type="text" inputmode="numeric" data-role="input" data-row-key="${rowKey}" data-target="${target}" data-part="minute" value="${String(minute).padStart(2, "0")}" />
    <button class="tiny" type="button" data-role="adjust" data-row-key="${rowKey}" data-target="${target}" data-part="minute" data-step="1">+</button>
    <span class="ampm-label" style="visibility:${ampmVisibility};">${suffix}</span>
  `;
}

function bindLimitRowEvents(row: ActiveLimitRow): void {
  const rowKey = `${row.prayer}:${row.limitType}`;
  const rowEl = advancedLimitRowsEl.querySelector<HTMLElement>(`[data-row-key="${rowKey}"]`);
  if (!rowEl) {
    return;
  }

  const modeSelect = rowEl.querySelector<HTMLSelectElement>("[data-role='mode']");
  modeSelect?.addEventListener("change", () => {
    const mode = modeSelect.value === "std-dst" ? "std-dst" : "single";
    customizationState.prayers[row.prayer][row.limitType].mode = mode;
    saveLastEntries();
    renderAdvancedLimitRows();
  });

  rowEl.querySelectorAll<HTMLButtonElement>("[data-role='adjust']").forEach((button) => {
    button.addEventListener("click", () => {
      const target = readLimitTarget(button.dataset.target);
      const part = button.dataset.part === "minute" ? "minute" : "hour";
      const step = button.dataset.step === "-1" ? -1 : 1;
      adjustLimitMinutes(row.prayer, row.limitType, target, part, step);
      saveLastEntries();
      renderAdvancedLimitRows();
    });
  });

  rowEl.querySelectorAll<HTMLInputElement>("[data-role='input']").forEach((input) => {
    input.addEventListener("change", () => {
      const target = readLimitTarget(input.dataset.target);
      const part = input.dataset.part === "minute" ? "minute" : "hour";
      applyManualLimitInput(row.prayer, row.limitType, target, part, input.value);
      saveLastEntries();
      renderAdvancedLimitRows();
    });
  });
}

function bindCustomizeModalHandlers(): void {
  openCustomizeButton.addEventListener("click", () => {
    openCustomizeModal();
  });

  saveCustomizeButton.addEventListener("click", () => {
    saveCustomize();
  });

  cancelCustomizeButton.addEventListener("click", () => {
    cancelCustomize();
  });

  customizeModal.addEventListener("click", (event) => {
    if (event.target === customizeModal) {
      cancelCustomize();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !customizeModal.hidden) {
      cancelCustomize();
    }
  });
}

function initializeCustomizeModalUi(): void {
  customizePrayers.innerHTML = PRAYER_ORDER.map((prayer) => `
    <section class="customize-prayer" data-prayer="${prayer}">
      <h3 class="customize-prayer-title" data-i18n="prayers.${prayer}">${prayer}</h3>
      <div class="customize-controls">
        <label class="customize-field">
          <input id="customize-${prayer}-enabled" type="checkbox" />
          <span data-i18n="modal.enabled">Enabled</span>
        </label>

        <label class="customize-field" for="customize-${prayer}-direction">
          <span data-i18n="modal.direction">Direction</span>
          <select id="customize-${prayer}-direction">
            <option value="after" data-i18n="modal.after">After</option>
            <option value="before" data-i18n="modal.before">Before</option>
          </select>
        </label>

        <label class="customize-field" for="customize-${prayer}-offsetMinutes">
          <span data-i18n="modal.offsetMinutes">Offset minutes</span>
          <button id="customize-${prayer}-offsetDec" class="tiny" type="button">-</button>
          <input id="customize-${prayer}-offsetMinutes" type="text" inputmode="numeric" />
          <button id="customize-${prayer}-offsetInc" class="tiny" type="button">+</button>
        </label>

        <label class="customize-field" for="customize-${prayer}-minuteMultiple">
          <span data-i18n="modal.minuteMultiple">Minute multiple</span>
          <select id="customize-${prayer}-minuteMultiple">
            <option value="1" data-i18n="modal.minuteMultipleOptions.none">1</option>
            <option value="5" data-i18n="modal.minuteMultipleOptions.five">5</option>
            <option value="10" data-i18n="modal.minuteMultipleOptions.ten">10</option>
          </select>
        </label>

        <label class="customize-field">
          <input id="customize-${prayer}-noEarlierEnabled" type="checkbox" />
          <span data-i18n="modal.noEarlierEnabled">No earlier than</span>
        </label>

        <label class="customize-field">
          <input id="customize-${prayer}-noLaterEnabled" type="checkbox" />
          <span data-i18n="modal.noLaterEnabled">No later than</span>
        </label>
      </div>
    </section>
  `).join("");

  for (const prayer of PRAYER_ORDER) {
    getEl<HTMLInputElement>(`customize-${prayer}-enabled`).addEventListener("change", () => {
      syncCustomizePrayerEnabledState(prayer);
    });

    getEl<HTMLButtonElement>(`customize-${prayer}-offsetInc`).addEventListener("click", () => {
      incrementCustomizeOffsetInput(prayer, 1);
    });

    getEl<HTMLButtonElement>(`customize-${prayer}-offsetDec`).addEventListener("click", () => {
      incrementCustomizeOffsetInput(prayer, -1);
    });

    getEl<HTMLInputElement>(`customize-${prayer}-offsetMinutes`).addEventListener("change", () => {
      sanitizeCustomizeOffsetInput(prayer);
    });
  }
}

function incrementCustomizeOffsetInput(prayer: PrayerKey, step: number): void {
  const input = getEl<HTMLInputElement>(`customize-${prayer}-offsetMinutes`);
  const current = toNonNegativeInteger(input.value, 0);
  input.value = String(Math.max(0, current + step));
}

function sanitizeCustomizeOffsetInput(prayer: PrayerKey): void {
  const input = getEl<HTMLInputElement>(`customize-${prayer}-offsetMinutes`);
  input.value = String(toNonNegativeInteger(input.value, 0));
}

function openCustomizeModal(): void {
  draftCustomizationState = cloneCustomization(customizationState);
  syncCustomizeModalUiFromDraft();
  customizeModal.hidden = false;
}

function saveCustomize(): void {
  readCustomizeModalDraftFromUi();
  customizationState = sanitizeCustomization(draftCustomizationState);
  customizeModal.hidden = true;
  renderAdvancedLimitRows();
  saveLastEntries();
}

function cancelCustomize(): void {
  customizeModal.hidden = true;
}
function syncCustomizeModalUiFromDraft(): void {
  for (const prayer of PRAYER_ORDER) {
    const config = draftCustomizationState.prayers[prayer];
    getEl<HTMLInputElement>(`customize-${prayer}-enabled`).checked = config.enabled;
    getEl<HTMLSelectElement>(`customize-${prayer}-direction`).value = config.direction;
    getEl<HTMLInputElement>(`customize-${prayer}-offsetMinutes`).value = String(config.offsetMinutes);
    getEl<HTMLSelectElement>(`customize-${prayer}-minuteMultiple`).value = String(config.minuteMultiple);
    getEl<HTMLInputElement>(`customize-${prayer}-noEarlierEnabled`).checked = config.noEarlier.enabled;
    getEl<HTMLInputElement>(`customize-${prayer}-noLaterEnabled`).checked = config.noLater.enabled;
    syncCustomizePrayerEnabledState(prayer);
  }
}

function readCustomizeModalDraftFromUi(): void {
  const next = cloneCustomization(draftCustomizationState);

  for (const prayer of PRAYER_ORDER) {
    const enabled = getEl<HTMLInputElement>(`customize-${prayer}-enabled`).checked;
    const directionValue = getEl<HTMLSelectElement>(`customize-${prayer}-direction`).value;
    const direction = directionValue === "before" ? "before" : "after";
    const offsetMinutes = toNonNegativeInteger(
      getEl<HTMLInputElement>(`customize-${prayer}-offsetMinutes`).value,
      next.prayers[prayer].offsetMinutes
    );
    const minuteMultiple = parseMinuteMultiple(
      getEl<HTMLSelectElement>(`customize-${prayer}-minuteMultiple`).value
    );

    next.prayers[prayer].enabled = enabled;
    next.prayers[prayer].direction = direction;
    next.prayers[prayer].offsetMinutes = offsetMinutes;
    next.prayers[prayer].minuteMultiple = minuteMultiple;
    next.prayers[prayer].noEarlier.enabled = getEl<HTMLInputElement>(`customize-${prayer}-noEarlierEnabled`).checked;
    next.prayers[prayer].noLater.enabled = getEl<HTMLInputElement>(`customize-${prayer}-noLaterEnabled`).checked;
  }

  draftCustomizationState = sanitizeCustomization(next);
  syncCustomizeModalUiFromDraft();
}

function syncCustomizePrayerEnabledState(prayer: PrayerKey): void {
  const enabled = getEl<HTMLInputElement>(`customize-${prayer}-enabled`).checked;
  getEl<HTMLSelectElement>(`customize-${prayer}-direction`).disabled = !enabled;
  getEl<HTMLInputElement>(`customize-${prayer}-offsetMinutes`).disabled = !enabled;
  getEl<HTMLButtonElement>(`customize-${prayer}-offsetDec`).disabled = !enabled;
  getEl<HTMLButtonElement>(`customize-${prayer}-offsetInc`).disabled = !enabled;
  getEl<HTMLSelectElement>(`customize-${prayer}-minuteMultiple`).disabled = !enabled;
  getEl<HTMLInputElement>(`customize-${prayer}-noEarlierEnabled`).disabled = !enabled;
  getEl<HTMLInputElement>(`customize-${prayer}-noLaterEnabled`).disabled = !enabled;
}

function adjustLimitMinutes(
  prayer: PrayerKey,
  limitType: "noEarlier" | "noLater",
  target: "single" | "standard" | "daylight",
  part: "hour" | "minute",
  step: number
): void {
  const config = customizationState.prayers[prayer][limitType];
  const current = readTargetMinutes(config, target);
  const next = clampDayMinute(current + (part === "hour" ? step * 60 : step));
  writeTargetMinutes(config, target, next);
}

function applyManualLimitInput(
  prayer: PrayerKey,
  limitType: "noEarlier" | "noLater",
  target: "single" | "standard" | "daylight",
  part: "hour" | "minute",
  rawValue: string
): void {
  const config = customizationState.prayers[prayer][limitType];
  const current = readTargetMinutes(config, target);
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return;
  }

  const timeFormat = timeFormatSelect.value === "24h" ? "24h" : "ampm";
  const hour24 = Math.floor(current / 60);
  const minute = current % 60;

  if (part === "minute") {
    const nextMinute = Math.trunc(parsed);
    if (nextMinute < 0 || nextMinute > 59) {
      return;
    }
    writeTargetMinutes(config, target, (hour24 * 60) + nextMinute);
    return;
  }

  const nextHour = Math.trunc(parsed);
  if (timeFormat === "24h") {
    if (nextHour < 0 || nextHour > 23) {
      return;
    }
    writeTargetMinutes(config, target, (nextHour * 60) + minute);
    return;
  }

  if (nextHour < 1 || nextHour > 12) {
    return;
  }
  const isPm = hour24 >= 12;
  const nextHour24 = (nextHour % 12) + (isPm ? 12 : 0);
  writeTargetMinutes(config, target, (nextHour24 * 60) + minute);
}

function readTargetMinutes(
  config: Customization["prayers"][PrayerKey]["noEarlier"],
  target: "single" | "standard" | "daylight"
): number {
  if (target === "single") {
    return config.singleMinutes;
  }
  if (target === "standard") {
    return config.standardMinutes;
  }
  return config.daylightMinutes;
}

function writeTargetMinutes(
  config: Customization["prayers"][PrayerKey]["noEarlier"],
  target: "single" | "standard" | "daylight",
  value: number
): void {
  const clamped = clampDayMinute(value);
  if (target === "single") {
    config.singleMinutes = clamped;
    return;
  }
  if (target === "standard") {
    config.standardMinutes = clamped;
    return;
  }
  config.daylightMinutes = clamped;
}

function readLimitTarget(raw: string | undefined): "single" | "standard" | "daylight" {
  if (raw === "standard") {
    return "standard";
  }
  if (raw === "daylight") {
    return "daylight";
  }
  return "single";
}

function parseMinuteMultiple(raw: string): MinuteMultiple {
  if (raw === "1") {
    return 1;
  }
  if (raw === "10") {
    return 10;
  }
  return 5;
}

function sanitizeCustomization(value: Customization): Customization {
  const parsed = CustomizationSchema.safeParse(value);
  if (!parsed.success) {
    return cloneCustomization(DEFAULT_CUSTOMIZATION);
  }

  const clean = cloneCustomization(parsed.data);
  for (const prayer of PRAYER_ORDER) {
    clean.prayers[prayer].offsetMinutes = Math.max(0, Math.trunc(clean.prayers[prayer].offsetMinutes));
    clean.prayers[prayer].noEarlier.singleMinutes = clampDayMinute(clean.prayers[prayer].noEarlier.singleMinutes);
    clean.prayers[prayer].noEarlier.standardMinutes = clampDayMinute(clean.prayers[prayer].noEarlier.standardMinutes);
    clean.prayers[prayer].noEarlier.daylightMinutes = clampDayMinute(clean.prayers[prayer].noEarlier.daylightMinutes);
    clean.prayers[prayer].noLater.singleMinutes = clampDayMinute(clean.prayers[prayer].noLater.singleMinutes);
    clean.prayers[prayer].noLater.standardMinutes = clampDayMinute(clean.prayers[prayer].noLater.standardMinutes);
    clean.prayers[prayer].noLater.daylightMinutes = clampDayMinute(clean.prayers[prayer].noLater.daylightMinutes);
  }

  return clean;
}

function cloneCustomization(source: Customization): Customization {
  return {
    prayers: {
      fajr: {
        ...source.prayers.fajr,
        noEarlier: { ...source.prayers.fajr.noEarlier },
        noLater: { ...source.prayers.fajr.noLater }
      },
      zhuhr: {
        ...source.prayers.zhuhr,
        noEarlier: { ...source.prayers.zhuhr.noEarlier },
        noLater: { ...source.prayers.zhuhr.noLater }
      },
      asr: {
        ...source.prayers.asr,
        noEarlier: { ...source.prayers.asr.noEarlier },
        noLater: { ...source.prayers.asr.noLater }
      },
      maghrib: {
        ...source.prayers.maghrib,
        noEarlier: { ...source.prayers.maghrib.noEarlier },
        noLater: { ...source.prayers.maghrib.noLater }
      },
      isha: {
        ...source.prayers.isha,
        noEarlier: { ...source.prayers.isha.noEarlier },
        noLater: { ...source.prayers.isha.noLater }
      }
    }
  };
}

function toMinuteWithDefault(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return clampDayMinute(value);
}

function normalizeBaseGroupSize(raw: unknown): string {
  const normalized = String(raw ?? "5");
  return normalized === "10" || normalized === "15" ? normalized : "5";
}

function toNonNegativeInteger(raw: string, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return Math.max(0, Math.trunc(fallback));
  }
  return Math.max(0, Math.trunc(parsed));
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
}

function showStatus(message: string): void {
  statusMessageEl.textContent = message;
}

function logError(prefixKey: string, error: unknown): void {
  const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const prefix = t(prefixKey);
  console.error(`[renderer] ${prefix}`, error);
  showStatus(t("logs.errorWithDetails", { prefix, details }));
}

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Element not found: ${id}`);
  }
  return el as T;
}
