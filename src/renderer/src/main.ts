
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
  DEFAULT_LOCATION_SELECTION,
  getCityOptions,
  getCountryOptions,
  getLocationLabels,
  getScheduleFolderPath,
  getStateOptions,
  normalizeLocationSelection,
  type CityId,
  type CountryId,
  type LocationSelection,
  type StateProvinceId
} from "@shared/locations";

import {
  UI_LANGUAGE_STORAGE_KEY,
  getNextUiLanguage,
  getUiLanguage,
  initializeI18n,
  setUiLanguage,
  t,
  translateStaticDocumentText
} from "./i18n";

const outputFolderInput = getEl<HTMLInputElement>("outputFolder");
const countrySelect = getEl<HTMLSelectElement>("countrySelect");
const stateSelect = getEl<HTMLSelectElement>("stateSelect");
const citySelect = getEl<HTMLSelectElement>("citySelect");
const switchUiLanguageButton = getEl<HTMLButtonElement>("switchUiLanguage");
const yearSelect = getEl<HTMLSelectElement>("year");
const monthSelect = getEl<HTMLSelectElement>("month");
const localeSelect = getEl<HTMLSelectElement>("locale");
const timeFormatSelect = getEl<HTMLSelectElement>("timeFormat");
const baseGroupSizeSelect = getEl<HTMLSelectElement>("baseGroupSize");
const ramazanHesabiInput = getEl<HTMLInputElement>("ramazanHesabi");
const masjidNameInput = getEl<HTMLInputElement>("masjidName");
const loadMosqueButton = getEl<HTMLButtonElement>("loadMosque");
const masjidAddressInput = getEl<HTMLInputElement>("masjidAddress");
const mosqueModal = getEl<HTMLElement>("mosqueModal");
const mosqueListSelect = getEl<HTMLSelectElement>("mosqueListSelect");
const loadSelectedMosqueButton = getEl<HTMLButtonElement>("loadSelectedMosque");
const closeMosqueModalButton = getEl<HTMLButtonElement>("closeMosqueModal");
const deleteSelectedMosqueButton = getEl<HTMLButtonElement>("deleteSelectedMosque");
const mosqueAddPane = getEl<HTMLDetailsElement>("mosqueAddPane");
const addMosqueButton = getEl<HTMLButtonElement>("addMosque");
const mosqueModalCountrySelect = getEl<HTMLSelectElement>("mosqueModalCountry");
const mosqueModalStateSelect = getEl<HTMLSelectElement>("mosqueModalState");
const mosqueModalCitySelect = getEl<HTMLSelectElement>("mosqueModalCity");
const mosqueModalNameInput = getEl<HTMLInputElement>("mosqueModalName");
const mosqueModalAddressInput = getEl<HTMLInputElement>("mosqueModalAddress");
const mosqueModalMessageEl = getEl<HTMLElement>("mosqueModalMessage");
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
const IS_DEV = window.location.protocol === "http:";
const RESET_DEFAULT_MONTH = "2026-01";
const RESET_DEFAULT_YEAR = RESET_DEFAULT_MONTH.split("-")[0] ?? "2026";
const RESET_DEFAULT_MONTH_NUMBER = RESET_DEFAULT_MONTH.split("-")[1] ?? "01";
const LAST_ENTRIES_KEY = "namaz-vakti:last-entries:v5";
const LEGACY_V4_KEY = "namaz-vakti:last-entries:v4";
const LEGACY_V3_KEY = "namaz-vakti:last-entries:v3";
const LEGACY_V2_KEY = "namaz-vakti:last-entries:v2";
const CUSTOM_MOSQUES_KEY = "namaz-vakti:custom-mosques:v1";
const CUSTOM_MOSQUES_VERSION = 1;
const RESET_DEFAULT_CUSTOMIZATION = buildResetDefaultCustomization();
const BUILTIN_MOSQUE_ID_DEFAULT = "paterson-mevlana";

type MosqueLocation = LocationSelection;

type BuiltinMosque = {
  kind: "builtin";
  id: string;
  nameEn: string;
  nameTr: string;
  address: string;
  location: MosqueLocation;
};

type CustomMosque = {
  kind: "custom";
  id: string;
  name: string;
  address: string;
  location: MosqueLocation;
};

type MosqueRecord = BuiltinMosque | CustomMosque;

type CustomMosquesStore = {
  version: typeof CUSTOM_MOSQUES_VERSION;
  items: CustomMosque[];
};

const BUILTIN_MOSQUES: BuiltinMosque[] = [
  {
    kind: "builtin",
    id: "paterson-mevlana",
    nameEn: "Paterson Mevlana Mosque",
    nameTr: "Paterson Mevlana Camii",
    address: "291 Sussex St, Paterson, NJ, 07503",
    location: { countryId: "usa", stateId: "nj", cityId: "paterson" }
  },
  {
    kind: "builtin",
    id: "ulu-cami",
    nameEn: "Ulu Cami Mosque",
    nameTr: "Ulu Cami",
    address: "408 Knickerbocker Ave, Paterson, NJ 07503",
    location: { countryId: "usa", stateId: "nj", cityId: "paterson" }
  },
  {
    kind: "builtin",
    id: "suleiman-bey-efeler",
    nameEn: "Suleiman Bey Mosque",
    nameTr: "Süleyman Bey Camii",
    address: "Cumhuriyet Mah., Adnan Menderes Blv. No:2, 09100 Efeler/Aydın",
    location: { countryId: "turkiye", stateId: "aydin", cityId: "efeler" }
  },
  {
    kind: "builtin",
    id: "ramazan-pasa-efeler",
    nameEn: "Ramazan Pasha Mosque",
    nameTr: "Ramazan Paşa Camii",
    address: "Hasanefendi-Ramazan Paşa Mah., Doğu Gazi Blv. No:4, 09100 Efeler/Aydın",
    location: { countryId: "turkiye", stateId: "aydin", cityId: "efeler" }
  },
  {
    kind: "builtin",
    id: "mimar-sinan-sunnyside",
    nameEn: "Mimar Sinan Sunnyside Mosque",
    nameTr: "Mimar Sinan Sunnyside Camii",
    address: "45-06 Skillman Ave, Sunnyside, NY 11104",
    location: { countryId: "usa", stateId: "ny", cityId: "new-york-city" }
  },
  {
    kind: "builtin",
    id: "diyanet-center-of-america",
    nameEn: "Diyanet Center of America",
    nameTr: "Amerika Diyanet Merkezi",
    address: "9610 Good Luck Rd, Lanham, MD 20706",
    location: { countryId: "usa", stateId: "md", cityId: "lanham" }
  },
  {
    kind: "builtin",
    id: "diyanet-new-haven",
    nameEn: "Diyanet Mosque of New Haven",
    nameTr: "New Haven Diyanet Camii",
    address: "531 Middletown Ave, New Haven, CT 06513, United States",
    location: { countryId: "usa", stateId: "ct", cityId: "new-haven" }
  },
  {
    kind: "builtin",
    id: "diyanet-springfield-imam-buhari",
    nameEn: "Diyanet Imam Buhari Mosque Cami",
    nameTr: "Springfield Diyanet İmam Buhari Camii",
    address: "50 Pinevale St, Springfield, MA 01151, United States",
    location: { countryId: "usa", stateId: "ma", cityId: "springfield" }
  },
  {
    kind: "builtin",
    id: "diyanet-brooklyn-eyup-sultan",
    nameEn: "Diyanet Mosque of Brooklyn Eyup Sultan",
    nameTr: "Brooklyn Eyüp Sultan Diyanet Camii",
    address: "2812 Brighton 3rd St, Brooklyn, NY 11235, United States",
    location: { countryId: "usa", stateId: "ny", cityId: "brooklyn" }
  },
  {
    kind: "builtin",
    id: "diyanet-delaware",
    nameEn: "Diyanet Mosque of Delaware",
    nameTr: "Delaware Diyanet Camii",
    address: "249 Appleby Rd #5403, New Castle, DE 19720, United States",
    location: { countryId: "usa", stateId: "de", cityId: "new-castle" }
  },
  {
    kind: "builtin",
    id: "tamca-levittown",
    nameEn: "TAMCA (Diyanet Mosque of Levittown)",
    nameTr: "Levittown Diyanet Yunus Emre Camii",
    address: "541 Levittown Pkwy, Levittown, PA 19054, United States",
    location: { countryId: "usa", stateId: "pa", cityId: "levittown" }
  },
  {
    kind: "builtin",
    id: "diyanet-lancaster-ahiska",
    nameEn: "Diyanet Mosque of Lancaster Ahiska Turks",
    nameTr: "Lancaster Diyanet Ahıska Türk Camii",
    address: "747 Centerville Rd, Lancaster, PA 17601, United States",
    location: { countryId: "usa", stateId: "pa", cityId: "lancaster" }
  },
  {
    kind: "builtin",
    id: "diyanet-bergen",
    nameEn: "Diyanet Mosque of Bergen",
    nameTr: "Bergen Diyanet Camii",
    address: "240 Knox Ave, Cliffside Park, NJ 07010, United States",
    location: { countryId: "usa", stateId: "nj", cityId: "cliffside-park" }
  },
  {
    kind: "builtin",
    id: "murat-monroeville",
    nameEn: "Murat Mosque",
    nameTr: "Monroeville Diyanet Murat Camii",
    address: "379 Monroeville Rd, Monroeville, NJ 08343, United States",
    location: { countryId: "usa", stateId: "nj", cityId: "monroeville" }
  },
  {
    kind: "builtin",
    id: "selimiye-burlington",
    nameEn: "Selimiye Mosque",
    nameTr: "Burlington Diyanet Selimiye Camii",
    address: "203 Fountain Ave, Burlington, NJ 08016, United States",
    location: { countryId: "usa", stateId: "nj", cityId: "burlington" }
  },
  {
    kind: "builtin",
    id: "long-island-mevlana",
    nameEn: "Long Island Mevlana Mosque",
    nameTr: "Long Island Diyanet Mevlana Camii",
    address: "366 Terryville Rd, Port Jefferson Station, NY 11776, United States",
    location: { countryId: "usa", stateId: "ny", cityId: "port-jefferson-station" }
  }
];

type ActiveLimitRow = {
  prayer: PrayerKey;
  limitType: "noEarlier" | "noLater";
};

type LastEntries = {
  countryId: CountryId;
  stateId: StateProvinceId;
  cityId: CityId;
  outputFolder: string;
  year: string;
  month: string;
  locale: GenerationOptions["locale"];
  timeFormat: GenerationOptions["timeFormat"];
  baseGroupSize: string;
  ramazanHesabi: boolean;
  masjidName: string;
  masjidAddress: string;
  announcementMessage: string;
  customization: Customization;
  selectedMosqueId?: string;
};

type LegacyEntriesV4 = Partial<{
  tsvFolder: string;
  outputFolder: string;
  year: string;
  month: string;
  locale: GenerationOptions["locale"];
  timeFormat: GenerationOptions["timeFormat"];
  baseGroupSize: string;
  ramazanHesabi: boolean;
  masjidName: string;
  masjidAddress: string;
  announcementMessage: string;
  customization: unknown;
}>;

type LegacyEntriesV3 = LegacyEntriesV4 & {
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
let availableMonthsByYear = new Map<string, string[]>();
let customMosquesState: CustomMosque[] = [];
let selectedMosqueId = BUILTIN_MOSQUE_ID_DEFAULT;
let mosqueModalLocationState: LocationSelection = { ...DEFAULT_LOCATION_SELECTION };

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
  bindMosqueModalHandlers();

  await restoreLastEntries();

  log(t("logs.appApiReady", { methods: Object.keys(window.appApi).join(", ") }));

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
  const selection = getSelectedLocationSelection();
  const folder = getScheduleFolderPath(selection);
  const labels = getLocationLabels(selection);
  log(t("logs.refreshMonthsForLocation", {
    country: labels.country,
    state: labels.state,
    city: labels.city,
    folder
  }));
  const months = await window.appApi.listMonths(folder);
  const previousYear = yearSelect.value;
  const previousMonthNumber = monthSelect.value;
  availableMonthsByYear = buildAvailableMonthsByYear(months);

  const years = [...availableMonthsByYear.keys()];
  yearSelect.innerHTML = "";
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });

  if (years.length === 0) {
    monthSelect.innerHTML = "";
    saveLastEntries();
    log(t("logs.noMonthFilesFound"));
    return;
  }

  if (previousYear && years.includes(previousYear)) {
    yearSelect.value = previousYear;
  } else if (years.includes(RESET_DEFAULT_YEAR)) {
    yearSelect.value = RESET_DEFAULT_YEAR;
  } else {
    yearSelect.value = years[0] ?? "";
  }

  renderMonthOptionsForSelectedYear(previousMonthNumber);
  saveLastEntries();
  log(t("logs.foundMonths", { months: months.join(", ") }));
}

function buildAvailableMonthsByYear(months: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();

  for (const value of months) {
    const parsed = parseYearMonth(value);
    if (!parsed) {
      continue;
    }
    const list = out.get(parsed.year) ?? [];
    if (!list.includes(parsed.monthNumber)) {
      list.push(parsed.monthNumber);
    }
    out.set(parsed.year, list);
  }

  const sortedYears = [...out.keys()].sort();
  const sorted = new Map<string, string[]>();
  for (const year of sortedYears) {
    const monthNumbers = (out.get(year) ?? []).slice().sort();
    sorted.set(year, monthNumbers);
  }
  return sorted;
}

function renderMonthOptionsForSelectedYear(preferredMonthNumber?: string): void {
  const year = yearSelect.value;
  const months = availableMonthsByYear.get(year) ?? [];
  monthSelect.innerHTML = "";

  for (const monthNumber of months) {
    const option = document.createElement("option");
    option.value = monthNumber;
    option.textContent = `${monthNumber}-${formatMonthNameForUi(year, monthNumber)}`;
    monthSelect.appendChild(option);
  }

  if (preferredMonthNumber && months.includes(preferredMonthNumber)) {
    monthSelect.value = preferredMonthNumber;
    return;
  }
  if (year === RESET_DEFAULT_YEAR && months.includes(RESET_DEFAULT_MONTH_NUMBER)) {
    monthSelect.value = RESET_DEFAULT_MONTH_NUMBER;
    return;
  }
  if (months.length > 0) {
    monthSelect.value = months[0] ?? "";
  }
}

function formatMonthNameForUi(year: string, monthNumber: string): string {
  const monthIndex = Number(monthNumber) - 1;
  if (!Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return monthNumber;
  }
  const locale = getUiLanguage() === "tr" ? "tr-TR" : "en-US";
  const date = new Date(Date.UTC(Number(year), monthIndex, 1));
  const raw = new Intl.DateTimeFormat(locale, { month: "long" }).format(date);
  if (!raw) {
    return monthNumber;
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function parseYearMonth(value: string): { year: string; monthNumber: string } | null {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }
  return { year: match[1] ?? "", monthNumber: match[2] ?? "" };
}

function getSelectedYearMonth(): string {
  const year = yearSelect.value;
  const monthNumber = monthSelect.value;
  if (!year || !monthNumber) {
    return "";
  }
  return `${year}-${monthNumber}`;
}

function syncLocationSelectors(partial: Partial<LocationSelection>): LocationSelection {
  const normalized = normalizeLocationSelection(partial);

  renderSelectOptions(
    countrySelect,
    getCountryOptions().map((entry) => ({ value: entry.id, label: entry.label })),
    normalized.countryId
  );
  renderSelectOptions(
    stateSelect,
    getStateOptions(normalized.countryId).map((entry) => ({ value: entry.id, label: entry.label })),
    normalized.stateId
  );
  renderSelectOptions(
    citySelect,
    getCityOptions(normalized.countryId, normalized.stateId).map((entry) => ({ value: entry.id, label: entry.label })),
    normalized.cityId
  );

  return normalized;
}

function getSelectedLocationSelection(): LocationSelection {
  return normalizeLocationSelection({
    countryId: countrySelect.value as CountryId,
    stateId: stateSelect.value as StateProvinceId,
    cityId: citySelect.value as CityId
  });
}

function getSelectedScheduleFolderPath(): string {
  return getScheduleFolderPath(getSelectedLocationSelection());
}

function getBuiltinMosqueById(id: string): BuiltinMosque {
  return BUILTIN_MOSQUES.find((entry) => entry.id === id) ?? BUILTIN_MOSQUES[0]!;
}

function getBuiltinMosqueDisplayName(entry: BuiltinMosque): string {
  return getUiLanguage() === "tr" ? entry.nameTr : entry.nameEn;
}

function getMosqueDisplayName(entry: MosqueRecord): string {
  if (entry.kind === "builtin") {
    return getBuiltinMosqueDisplayName(entry);
  }
  return entry.name;
}

function getAllMosques(): MosqueRecord[] {
  return [...BUILTIN_MOSQUES, ...customMosquesState];
}

function getMosqueById(id: string): MosqueRecord | null {
  return getAllMosques().find((entry) => entry.id === id) ?? null;
}

function isSameLocation(a: LocationSelection, b: LocationSelection): boolean {
  return a.countryId === b.countryId && a.stateId === b.stateId && a.cityId === b.cityId;
}

function normalizeForCompare(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isRecordAppliedToForm(record: MosqueRecord): boolean {
  const location = getSelectedLocationSelection();
  if (!isSameLocation(location, record.location)) {
    return false;
  }
  if (normalizeForCompare(masjidAddressInput.value) !== normalizeForCompare(record.address)) {
    return false;
  }
  if (record.kind === "custom") {
    return normalizeForCompare(masjidNameInput.value) === normalizeForCompare(record.name);
  }
  return true;
}

function resolveSelectedMosqueId(candidate: string | null | undefined): string {
  if (candidate && getMosqueById(candidate)) {
    return candidate;
  }
  return BUILTIN_MOSQUE_ID_DEFAULT;
}

function syncSelectedMosqueFromCurrentFields(): void {
  const location = getSelectedLocationSelection();
  const address = normalizeForCompare(masjidAddressInput.value);
  const name = normalizeForCompare(masjidNameInput.value);
  const found = getAllMosques().find((entry) =>
    isSameLocation(entry.location, location)
    && normalizeForCompare(entry.address) === address
    && (entry.kind === "builtin" || normalizeForCompare(entry.name) === name)
  );
  selectedMosqueId = found?.id ?? BUILTIN_MOSQUE_ID_DEFAULT;
  if (!mosqueModal.hidden) {
    renderMosqueList(selectedMosqueId);
  }
}

function sanitizeCustomMosques(items: unknown): CustomMosque[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const out: CustomMosque[] = [];
  const seen = new Set<string>();
  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== "object") {
      continue;
    }
    const item = rawItem as Partial<CustomMosque> & { location?: Partial<LocationSelection> };
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const address = typeof item.address === "string" ? item.address.trim() : "";
    const locationInput = item.location;
    if (!id || !name || !address || !locationInput || typeof locationInput !== "object") {
      continue;
    }
    const location = normalizeLocationSelection(locationInput);
    if (
      locationInput.countryId !== location.countryId
      || locationInput.stateId !== location.stateId
      || locationInput.cityId !== location.cityId
      || seen.has(id)
    ) {
      continue;
    }
    out.push({
      kind: "custom",
      id,
      name,
      address,
      location
    });
    seen.add(id);
  }

  return out;
}

function loadCustomMosques(): CustomMosque[] {
  const raw = localStorage.getItem(CUSTOM_MOSQUES_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CustomMosquesStore>;
    if (parsed.version !== CUSTOM_MOSQUES_VERSION) {
      return [];
    }
    return sanitizeCustomMosques(parsed.items);
  } catch {
    return [];
  }
}

function saveCustomMosques(items: CustomMosque[] = customMosquesState): void {
  const sanitized = sanitizeCustomMosques(items);
  customMosquesState = sanitized;
  const payload: CustomMosquesStore = {
    version: CUSTOM_MOSQUES_VERSION,
    items: sanitized
  };
  localStorage.setItem(CUSTOM_MOSQUES_KEY, JSON.stringify(payload));
}

function makeCustomMosqueId(name: string, location: LocationSelection): string {
  const base = `${name}-${location.cityId}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "mosque";
  const used = new Set(getAllMosques().map((entry) => entry.id));
  let candidate = `custom-${base}`;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `custom-${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function getMosqueOptionLabel(entry: MosqueRecord): string {
  const labels = getLocationLabels(entry.location);
  return `${getMosqueDisplayName(entry)} (${labels.city}, ${labels.state}, ${labels.country})`;
}

function renderMosqueList(selectedId = selectedMosqueId): void {
  const records = getAllMosques();
  mosqueListSelect.innerHTML = "";

  for (const record of records) {
    const option = document.createElement("option");
    option.value = record.id;
    option.textContent = getMosqueOptionLabel(record);
    mosqueListSelect.appendChild(option);
  }

  const resolved = resolveSelectedMosqueId(selectedId);
  mosqueListSelect.value = records.some((entry) => entry.id === resolved)
    ? resolved
    : BUILTIN_MOSQUE_ID_DEFAULT;
  selectedMosqueId = mosqueListSelect.value || BUILTIN_MOSQUE_ID_DEFAULT;
}

function setMosqueModalMessage(message: string, isError = false): void {
  mosqueModalMessageEl.textContent = message;
  if (!message) {
    delete mosqueModalMessageEl.dataset.variant;
    return;
  }
  mosqueModalMessageEl.dataset.variant = isError ? "error" : "ok";
}

function setMosqueAddPaneVisible(visible: boolean): void {
  mosqueAddPane.open = visible;
}

function syncMosqueModalLocationSelectors(partial: Partial<LocationSelection>): LocationSelection {
  const normalized = normalizeLocationSelection(partial);
  renderSelectOptions(
    mosqueModalCountrySelect,
    getCountryOptions().map((entry) => ({ value: entry.id, label: entry.label })),
    normalized.countryId
  );
  renderSelectOptions(
    mosqueModalStateSelect,
    getStateOptions(normalized.countryId).map((entry) => ({ value: entry.id, label: entry.label })),
    normalized.stateId
  );
  renderSelectOptions(
    mosqueModalCitySelect,
    getCityOptions(normalized.countryId, normalized.stateId).map((entry) => ({ value: entry.id, label: entry.label })),
    normalized.cityId
  );
  mosqueModalLocationState = normalized;
  return normalized;
}

function getMosqueModalLocationSelection(): LocationSelection {
  mosqueModalLocationState = normalizeLocationSelection({
    countryId: mosqueModalCountrySelect.value as CountryId,
    stateId: mosqueModalStateSelect.value as StateProvinceId,
    cityId: mosqueModalCitySelect.value as CityId
  });
  return mosqueModalLocationState;
}

async function applyMosqueRecord(record: MosqueRecord, shouldRefreshMonths: boolean): Promise<void> {
  selectedMosqueId = record.id;
  syncLocationSelectors(record.location);
  masjidNameInput.value = getMosqueDisplayName(record);
  masjidAddressInput.value = record.address;
  if (shouldRefreshMonths) {
    await refreshMonths();
  }
  saveLastEntries();
}

function openMosqueModal(): void {
  syncSelectedMosqueFromCurrentFields();
  renderMosqueList(selectedMosqueId);
  syncMosqueModalLocationSelectors(getSelectedLocationSelection());
  setMosqueAddPaneVisible(false);
  mosqueModalNameInput.value = "";
  mosqueModalAddressInput.value = "";
  setMosqueModalMessage("");
  mosqueModal.hidden = false;
  mosqueListSelect.focus();
}

function closeMosqueModal(): void {
  setMosqueAddPaneVisible(false);
  mosqueModal.hidden = true;
  setMosqueModalMessage("");
}

async function loadSelectedMosqueFromModal(): Promise<void> {
  const selected = getMosqueById(mosqueListSelect.value);
  if (!selected) {
    setMosqueModalMessage(t("mosqueModal.errors.selectMosque"), true);
    return;
  }
  await applyMosqueRecord(selected, true);
  closeMosqueModal();
}

function addCustomMosqueFromModal(): void {
  const location = getMosqueModalLocationSelection();
  const name = mosqueModalNameInput.value.trim();
  const address = mosqueModalAddressInput.value.trim();

  if (!name || !address) {
    setMosqueModalMessage(t("mosqueModal.errors.requiredFields"), true);
    return;
  }

  const duplicate = getAllMosques().find((entry) =>
    isSameLocation(entry.location, location)
    && normalizeForCompare(entry.address) === normalizeForCompare(address)
  );
  if (duplicate) {
    setMosqueModalMessage(t("mosqueModal.errors.duplicate"), true);
    return;
  }

  const record: CustomMosque = {
    kind: "custom",
    id: makeCustomMosqueId(name, location),
    name,
    address,
    location
  };
  customMosquesState = [...customMosquesState, record];
  saveCustomMosques(customMosquesState);
  selectedMosqueId = record.id;
  renderMosqueList(record.id);
  mosqueModalNameInput.value = "";
  mosqueModalAddressInput.value = "";
  setMosqueModalMessage(t("mosqueModal.messages.added"));
  saveLastEntries();
}

function deleteSelectedMosqueFromModal(): void {
  const selected = getMosqueById(mosqueListSelect.value);
  if (!selected) {
    setMosqueModalMessage(t("mosqueModal.errors.selectMosque"), true);
    return;
  }
  if (selected.kind === "builtin") {
    setMosqueModalMessage(t("mosqueModal.errors.deleteBuiltin"), true);
    return;
  }

  const confirmed = window.confirm(t("mosqueModal.confirm.delete", { name: selected.name }));
  if (!confirmed) {
    return;
  }

  customMosquesState = customMosquesState.filter((entry) => entry.id !== selected.id);
  saveCustomMosques(customMosquesState);
  selectedMosqueId = BUILTIN_MOSQUE_ID_DEFAULT;
  renderMosqueList(selectedMosqueId);
  syncSelectedMosqueFromCurrentFields();
  setMosqueModalMessage(t("mosqueModal.messages.deleted"));
  saveLastEntries();
}

function bindMosqueModalHandlers(): void {
  loadMosqueButton.addEventListener("click", () => {
    openMosqueModal();
  });

  closeMosqueModalButton.addEventListener("click", () => {
    closeMosqueModal();
  });

  mosqueModal.addEventListener("click", (event) => {
    if (event.target === mosqueModal) {
      closeMosqueModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !mosqueModal.hidden) {
      closeMosqueModal();
    }
  });

  mosqueListSelect.addEventListener("change", () => {
    selectedMosqueId = resolveSelectedMosqueId(mosqueListSelect.value);
    setMosqueModalMessage("");
  });

  loadSelectedMosqueButton.addEventListener("click", () => {
    void loadSelectedMosqueFromModal().catch((error) => {
      logError("errors.refreshMonthsFailed", error);
    });
  });

  addMosqueButton.addEventListener("click", () => {
    addCustomMosqueFromModal();
  });

  deleteSelectedMosqueButton.addEventListener("click", () => {
    deleteSelectedMosqueFromModal();
  });

  mosqueAddPane.addEventListener("toggle", () => {
    if (!mosqueAddPane.open) {
      return;
    }
    syncMosqueModalLocationSelectors(getSelectedLocationSelection());
    mosqueModalNameInput.focus();
  });

  mosqueModalCountrySelect.addEventListener("change", () => {
    syncMosqueModalLocationSelectors({
      countryId: mosqueModalCountrySelect.value as CountryId,
      stateId: mosqueModalStateSelect.value as StateProvinceId,
      cityId: mosqueModalCitySelect.value as CityId
    });
  });

  mosqueModalStateSelect.addEventListener("change", () => {
    syncMosqueModalLocationSelectors({
      countryId: mosqueModalCountrySelect.value as CountryId,
      stateId: mosqueModalStateSelect.value as StateProvinceId,
      cityId: mosqueModalCitySelect.value as CityId
    });
  });

  mosqueModalCitySelect.addEventListener("change", () => {
    mosqueModalLocationState = getMosqueModalLocationSelection();
  });
}

function renderSelectOptions(
  select: HTMLSelectElement,
  options: Array<{ value: string; label: string }>,
  selectedValue: string
): void {
  select.innerHTML = "";
  for (const optionData of options) {
    const option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.label;
    select.appendChild(option);
  }

  if (options.some((entry) => entry.value === selectedValue)) {
    select.value = selectedValue;
  } else if (options.length > 0) {
    select.value = options[0]!.value;
  }
}

function bindPersistence(): void {
  const save = () => saveLastEntries();

  countrySelect.addEventListener("change", () => {
    syncLocationSelectors({
      countryId: countrySelect.value as CountryId,
      stateId: stateSelect.value as StateProvinceId,
      cityId: citySelect.value as CityId
    });
    syncSelectedMosqueFromCurrentFields();
    save();
    void refreshMonths().catch((error) => {
      logError("errors.refreshMonthsFailed", error);
    });
  });
  stateSelect.addEventListener("change", () => {
    syncLocationSelectors({
      countryId: countrySelect.value as CountryId,
      stateId: stateSelect.value as StateProvinceId,
      cityId: citySelect.value as CityId
    });
    syncSelectedMosqueFromCurrentFields();
    save();
    void refreshMonths().catch((error) => {
      logError("errors.refreshMonthsFailed", error);
    });
  });
  citySelect.addEventListener("change", () => {
    syncLocationSelectors({
      countryId: countrySelect.value as CountryId,
      stateId: stateSelect.value as StateProvinceId,
      cityId: citySelect.value as CityId
    });
    syncSelectedMosqueFromCurrentFields();
    save();
    void refreshMonths().catch((error) => {
      logError("errors.refreshMonthsFailed", error);
    });
  });
  outputFolderInput.addEventListener("change", save);
  yearSelect.addEventListener("change", () => {
    renderMonthOptionsForSelectedYear();
    save();
  });
  monthSelect.addEventListener("change", save);
  localeSelect.addEventListener("change", save);
  timeFormatSelect.addEventListener("change", () => {
    renderAdvancedLimitRows();
    save();
  });
  baseGroupSizeSelect.addEventListener("change", save);
  ramazanHesabiInput.addEventListener("change", save);
  masjidNameInput.addEventListener("change", () => {
    syncSelectedMosqueFromCurrentFields();
    save();
  });
  masjidNameInput.addEventListener("input", () => {
    syncSelectedMosqueFromCurrentFields();
    save();
  });
  masjidAddressInput.addEventListener("change", () => {
    syncSelectedMosqueFromCurrentFields();
    save();
  });
  masjidAddressInput.addEventListener("input", () => {
    syncSelectedMosqueFromCurrentFields();
    save();
  });
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
  renderMonthOptionsForSelectedYear(monthSelect.value);
  syncSelectedMosqueFromCurrentFields();
  const selected = getMosqueById(selectedMosqueId);
  if (selected && selected.kind === "builtin" && isRecordAppliedToForm(selected)) {
    masjidNameInput.value = getMosqueDisplayName(selected);
  }
  if (!mosqueModal.hidden) {
    renderMosqueList(selectedMosqueId);
    syncMosqueModalLocationSelectors(mosqueModalLocationState);
    setMosqueAddPaneVisible(mosqueAddPane.open);
  }
  const currentLanguage = getUiLanguage();
  switchUiLanguageButton.textContent = currentLanguage === "en"
    ? t("buttons.switchToTurkish")
    : t("buttons.switchToEnglish");
}

async function restoreLastEntries(): Promise<void> {
  customMosquesState = loadCustomMosques();
  const saved = loadLastEntries();
  if (!saved) {
    applyFreshDefaults();
    renderAdvancedLimitRows();
    await refreshMonths();
    saveLastEntries();
    return;
  }

  syncLocationSelectors({
    countryId: saved.countryId,
    stateId: saved.stateId,
    cityId: saved.cityId
  });
  outputFolderInput.value = saved.outputFolder;
  yearSelect.value = saved.year || RESET_DEFAULT_YEAR;
  localeSelect.value = saved.locale;
  timeFormatSelect.value = saved.timeFormat;
  baseGroupSizeSelect.value = saved.baseGroupSize;
  ramazanHesabiInput.checked = saved.ramazanHesabi;
  masjidNameInput.value = saved.masjidName;
  masjidAddressInput.value = saved.masjidAddress;
  announcementMessageInput.value = saved.announcementMessage;
  customizationState = sanitizeCustomization(saved.customization);
  if (saved.selectedMosqueId) {
    selectedMosqueId = resolveSelectedMosqueId(saved.selectedMosqueId);
  } else {
    syncSelectedMosqueFromCurrentFields();
  }

  renderAdvancedLimitRows();

  await refreshMonths();
  const parsedSavedMonth = parseYearMonth(saved.month);
  if (parsedSavedMonth && Array.from(yearSelect.options).some((option) => option.value === parsedSavedMonth.year)) {
    yearSelect.value = parsedSavedMonth.year;
    renderMonthOptionsForSelectedYear(parsedSavedMonth.monthNumber);
  } else if (saved.year && Array.from(yearSelect.options).some((option) => option.value === saved.year)) {
    yearSelect.value = saved.year;
    renderMonthOptionsForSelectedYear();
  } else {
    renderMonthOptionsForSelectedYear();
  }
  saveLastEntries();

  log(t("logs.restoredLastEntries"));
}

function saveLastEntries(): void {
  const location = getSelectedLocationSelection();
  const data: LastEntries = {
    countryId: location.countryId,
    stateId: location.stateId,
    cityId: location.cityId,
    outputFolder: outputFolderInput.value.trim(),
    year: yearSelect.value,
    month: getSelectedYearMonth(),
    locale: localeSelect.value === "tr" ? "tr" : "en",
    timeFormat: timeFormatSelect.value === "24h" ? "24h" : "ampm",
    baseGroupSize: normalizeBaseGroupSize(baseGroupSizeSelect.value),
    ramazanHesabi: ramazanHesabiInput.checked,
    masjidName: masjidNameInput.value,
    masjidAddress: masjidAddressInput.value,
    announcementMessage: announcementMessageInput.value,
    customization: sanitizeCustomization(customizationState),
    selectedMosqueId: resolveSelectedMosqueId(selectedMosqueId)
  };

  localStorage.setItem(LAST_ENTRIES_KEY, JSON.stringify(data));
}

function loadLastEntries(): LastEntries | null {
  const v5Raw = localStorage.getItem(LAST_ENTRIES_KEY);
  if (v5Raw) {
    const parsedV5 = parseV5Entries(v5Raw);
    if (parsedV5) {
      return parsedV5;
    }
  }

  const v4Raw = localStorage.getItem(LEGACY_V4_KEY);
  if (v4Raw) {
    const migratedV4 = parseLegacyV4Entries(v4Raw);
    if (migratedV4) {
      return migratedV4;
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

function parseV5Entries(raw: string): LastEntries | null {
  try {
    const parsed = JSON.parse(raw) as Partial<LastEntries>;
    const parsedCustomization = CustomizationSchema.safeParse(parsed.customization);
    if (!parsedCustomization.success) {
      return null;
    }

    const location = normalizeLocationSelection({
      countryId: parsed.countryId,
      stateId: parsed.stateId,
      cityId: parsed.cityId
    });

    return {
      countryId: location.countryId,
      stateId: location.stateId,
      cityId: location.cityId,
      outputFolder: parsed.outputFolder ?? "",
      year: parsed.year ?? (parseYearMonth(parsed.month ?? "")?.year ?? RESET_DEFAULT_YEAR),
      month: parsed.month ?? "",
      locale: parsed.locale === "tr" ? "tr" : "en",
      timeFormat: parsed.timeFormat === "24h" ? "24h" : "ampm",
      baseGroupSize: normalizeBaseGroupSize(parsed.baseGroupSize),
      ramazanHesabi: parsed.ramazanHesabi !== false,
      masjidName: parsed.masjidName ?? "",
      masjidAddress: parsed.masjidAddress ?? "",
      announcementMessage: parsed.announcementMessage ?? "",
      customization: sanitizeCustomization(parsedCustomization.data),
      selectedMosqueId: typeof parsed.selectedMosqueId === "string" ? parsed.selectedMosqueId : undefined
    };
  } catch {
    return null;
  }
}

function parseLegacyV4Entries(raw: string): LastEntries | null {
  try {
    const parsed = JSON.parse(raw) as LegacyEntriesV4;
    const parsedCustomization = CustomizationSchema.safeParse(parsed.customization);
    if (!parsedCustomization.success) {
      return null;
    }

    return {
      countryId: DEFAULT_LOCATION_SELECTION.countryId,
      stateId: DEFAULT_LOCATION_SELECTION.stateId,
      cityId: DEFAULT_LOCATION_SELECTION.cityId,
      outputFolder: parsed.outputFolder ?? "",
      year: parsed.year ?? (parseYearMonth(parsed.month ?? "")?.year ?? RESET_DEFAULT_YEAR),
      month: parsed.month ?? "",
      locale: parsed.locale === "tr" ? "tr" : "en",
      timeFormat: parsed.timeFormat === "24h" ? "24h" : "ampm",
      baseGroupSize: normalizeBaseGroupSize(parsed.baseGroupSize),
      ramazanHesabi: parsed.ramazanHesabi !== false,
      masjidName: parsed.masjidName ?? "",
      masjidAddress: parsed.masjidAddress ?? "",
      announcementMessage: parsed.announcementMessage ?? "",
      customization: sanitizeCustomization(parsedCustomization.data),
      selectedMosqueId: BUILTIN_MOSQUE_ID_DEFAULT
    };
  } catch {
    return null;
  }
}

function parseLegacyEntries(raw: string): LastEntries | null {
  try {
    const parsed = JSON.parse(raw) as LegacyEntriesV3;
    return {
      countryId: DEFAULT_LOCATION_SELECTION.countryId,
      stateId: DEFAULT_LOCATION_SELECTION.stateId,
      cityId: DEFAULT_LOCATION_SELECTION.cityId,
      outputFolder: parsed.outputFolder ?? "",
      year: parseYearMonth(parsed.month ?? "")?.year ?? RESET_DEFAULT_YEAR,
      month: parsed.month ?? "",
      locale: parsed.locale === "tr" ? "tr" : "en",
      timeFormat: parsed.timeFormat === "24h" ? "24h" : "ampm",
      baseGroupSize: normalizeBaseGroupSize(parsed.baseGroupSize),
      ramazanHesabi: parsed.ramazanHesabi !== false,
      masjidName: parsed.masjidName ?? "",
      masjidAddress: parsed.masjidAddress ?? "",
      announcementMessage: parsed.announcementMessage ?? "",
      customization: migrateLegacyCustomization(parsed),
      selectedMosqueId: BUILTIN_MOSQUE_ID_DEFAULT
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
    month: getSelectedYearMonth(),
    tsvFolder: getSelectedScheduleFolderPath(),
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
  selectedMosqueId = BUILTIN_MOSQUE_ID_DEFAULT;
  const defaultMosque = getBuiltinMosqueById(BUILTIN_MOSQUE_ID_DEFAULT);
  syncLocationSelectors(defaultMosque.location);
  outputFolderInput.value = "";
  yearSelect.value = RESET_DEFAULT_YEAR;
  monthSelect.value = RESET_DEFAULT_MONTH_NUMBER;
  localeSelect.value = "en";
  timeFormatSelect.value = "ampm";
  baseGroupSizeSelect.value = "5";
  ramazanHesabiInput.checked = true;
  masjidNameInput.value = getBuiltinMosqueDisplayName(defaultMosque);
  masjidAddressInput.value = defaultMosque.address;
  announcementMessageInput.value = "";
  customizationState = cloneCustomization(RESET_DEFAULT_CUSTOMIZATION);
  draftCustomizationState = cloneCustomization(RESET_DEFAULT_CUSTOMIZATION);
}

async function resetToDefaults(): Promise<void> {
  localStorage.removeItem(LAST_ENTRIES_KEY);
  localStorage.removeItem(LEGACY_V4_KEY);
  localStorage.removeItem(LEGACY_V3_KEY);
  localStorage.removeItem(LEGACY_V2_KEY);
  applyFreshDefaults();
  renderAdvancedLimitRows();
  await refreshMonths();
  if (Array.from(yearSelect.options).some((option) => option.value === RESET_DEFAULT_YEAR)) {
    yearSelect.value = RESET_DEFAULT_YEAR;
    renderMonthOptionsForSelectedYear(RESET_DEFAULT_MONTH_NUMBER);
  }
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
        <div class="customize-group">
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
        </div>

        <div class="customize-group">
          <label class="customize-field" for="customize-${prayer}-offsetMinutes">
            <span data-i18n="modal.offsetMinutes">Offset minutes</span>
            <button id="customize-${prayer}-offsetDec" class="tiny" type="button">-</button>
            <input id="customize-${prayer}-offsetMinutes" type="text" inputmode="numeric" />
            <button id="customize-${prayer}-offsetInc" class="tiny" type="button">+</button>
          </label>
        </div>

        <div class="customize-group customize-group-no-separator">
          <label class="customize-field" for="customize-${prayer}-minuteMultiple">
            <span data-i18n="modal.minuteMultiple">Minute multiple</span>
            <select id="customize-${prayer}-minuteMultiple">
              <option value="1" data-i18n="modal.minuteMultipleOptions.none">1</option>
              <option value="5" data-i18n="modal.minuteMultipleOptions.five">5</option>
              <option value="10" data-i18n="modal.minuteMultipleOptions.ten">10</option>
            </select>
          </label>
        </div>

        <div class="customize-group customize-group-secondary">
          <label class="customize-field">
            <input id="customize-${prayer}-noEarlierEnabled" type="checkbox" />
            <span data-i18n="modal.noEarlierEnabled">No earlier than</span>
          </label>

          <label class="customize-field">
            <input id="customize-${prayer}-noLaterEnabled" type="checkbox" />
            <span data-i18n="modal.noLaterEnabled">No later than</span>
          </label>
        </div>
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

function buildResetDefaultCustomization(): Customization {
  const value = cloneCustomization(DEFAULT_CUSTOMIZATION);

  value.prayers.fajr.noLater.enabled = true;
  value.prayers.fajr.noLater.mode = "single";
  value.prayers.fajr.noLater.singleMinutes = 390;
  value.prayers.fajr.noLater.standardMinutes = 390;
  value.prayers.fajr.noLater.daylightMinutes = 390;

  value.prayers.zhuhr.noEarlier.enabled = true;
  value.prayers.zhuhr.noEarlier.mode = "std-dst";
  value.prayers.zhuhr.noEarlier.singleMinutes = 730;
  value.prayers.zhuhr.noEarlier.standardMinutes = 730;
  value.prayers.zhuhr.noEarlier.daylightMinutes = 790;

  value.prayers.asr.noEarlier.enabled = false;
  value.prayers.asr.noLater.enabled = false;
  value.prayers.maghrib.noEarlier.enabled = false;
  value.prayers.maghrib.noLater.enabled = false;
  value.prayers.isha.noEarlier.enabled = false;
  value.prayers.isha.noLater.enabled = false;

  return sanitizeCustomization(value);
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
  if (IS_DEV) {
    console.log(`[renderer] ${message}`);
  }
}

function showStatus(message: string): void {
  statusMessageEl.textContent = message;
}

function logError(prefixKey: string, error: unknown): void {
  const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const prefix = t(prefixKey);
  if (IS_DEV) {
    console.error(`[renderer] ${prefix}`, error);
  }
  showStatus(t("logs.errorWithDetails", { prefix, details }));
}

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Element not found: ${id}`);
  }
  return el as T;
}
