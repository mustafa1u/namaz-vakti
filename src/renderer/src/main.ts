import type { GenerationOptions } from "@shared/ipc";

const tsvFolderInput = getEl<HTMLInputElement>("tsvFolder");
const templateFileInput = getEl<HTMLInputElement>("templateFile");
const outputFolderInput = getEl<HTMLInputElement>("outputFolder");
const monthSelect = getEl<HTMLSelectElement>("month");
const localeSelect = getEl<HTMLSelectElement>("locale");
const timeFormatSelect = getEl<HTMLSelectElement>("timeFormat");
const baseGroupSizeSelect = getEl<HTMLSelectElement>("baseGroupSize");
const ramazanHesabiInput = getEl<HTMLInputElement>("ramazanHesabi");
const announcementMessageInput = getEl<HTMLTextAreaElement>("announcementMessage");
const logEl = getEl<HTMLElement>("log");
const LAST_ENTRIES_KEY = "namaz-vakti:last-entries:v1";

type LastEntries = {
  tsvFolder: string;
  templateFile: string;
  outputFolder: string;
  month: string;
  locale: GenerationOptions["locale"];
  timeFormat: GenerationOptions["timeFormat"];
  baseGroupSize: string;
  ramazanHesabi: boolean;
  announcementMessage: string;
};

bootstrap();

function bootstrap(): void {
  if (!window.appApi) {
    log("ERROR: window.appApi is undefined. Preload did not load.");
    return;
  }

  log(`appApi ready. Methods: ${Object.keys(window.appApi).join(", ")}`);
  bindPersistence();
  void restoreLastEntries();

  getEl<HTMLButtonElement>("pickTsv").addEventListener("click", async () => {
    try {
      log("pickTsv clicked");
      const path = await window.appApi.selectTsvFolder();
      log(`pickTsv result: ${path ?? "<cancelled>"}`);
      if (path) {
        tsvFolderInput.value = path;
        saveLastEntries();
        await refreshMonths();
      }
    } catch (error) {
      logError("pickTsv failed", error);
    }
  });

  getEl<HTMLButtonElement>("pickTemplate").addEventListener("click", async () => {
    try {
      log("pickTemplate clicked");
      const path = await window.appApi.selectTemplateFile();
      log(`pickTemplate result: ${path ?? "<cancelled>"}`);
      if (path) {
        templateFileInput.value = path;
        saveLastEntries();
      }
    } catch (error) {
      logError("pickTemplate failed", error);
    }
  });

  getEl<HTMLButtonElement>("pickOutput").addEventListener("click", async () => {
    try {
      log("pickOutput clicked");
      const path = await window.appApi.selectOutputFolder();
      log(`pickOutput result: ${path ?? "<cancelled>"}`);
      if (path) {
        outputFolderInput.value = path;
        saveLastEntries();
      }
    } catch (error) {
      logError("pickOutput failed", error);
    }
  });

  getEl<HTMLButtonElement>("refreshMonths").addEventListener("click", async () => {
    try {
      await refreshMonths();
    } catch (error) {
      logError("refreshMonths failed", error);
    }
  });

  getEl<HTMLButtonElement>("preview").addEventListener("click", async () => {
    try {
      const options = readOptions();
      saveLastEntries();
      log(`preview clicked for ${options.month}`);
      const preview = await window.appApi.previewMonth(options);
      log(`Preview for ${preview.month} (${preview.dayCount} days)\n${JSON.stringify(preview.groups, null, 2)}`);
    } catch (error) {
      logError("preview failed", error);
    }
  });

  getEl<HTMLButtonElement>("generate").addEventListener("click", async () => {
    try {
      const options = readOptions();
      saveLastEntries();
      log(`generate clicked for ${options.month}`);
      const result = await window.appApi.generateOutputs(options);
      log(`XLSX: ${result.xlsxPath}\nPNG: ${result.pngPath}\nWarnings: ${result.warnings.join(" | ")}`);
    } catch (error) {
      logError("generate failed", error);
    }
  });
}

async function refreshMonths(): Promise<void> {
  if (!tsvFolderInput.value) {
    log("Set TSV folder first.");
    return;
  }

  log(`refreshMonths for ${tsvFolderInput.value}`);
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
    log("No month files found in folder.");
  } else {
    if (previousMonth && months.includes(previousMonth)) {
      monthSelect.value = previousMonth;
    }
    saveLastEntries();
    log(`Found months: ${months.join(", ")}`);
  }
}

function bindPersistence(): void {
  const save = () => saveLastEntries();

  tsvFolderInput.addEventListener("change", save);
  templateFileInput.addEventListener("change", save);
  outputFolderInput.addEventListener("change", save);
  monthSelect.addEventListener("change", save);
  localeSelect.addEventListener("change", save);
  timeFormatSelect.addEventListener("change", save);
  baseGroupSizeSelect.addEventListener("change", save);
  ramazanHesabiInput.addEventListener("change", save);
  announcementMessageInput.addEventListener("change", save);
  announcementMessageInput.addEventListener("input", save);
}

async function restoreLastEntries(): Promise<void> {
  const saved = loadLastEntries();
  if (!saved) {
    return;
  }

  tsvFolderInput.value = saved.tsvFolder;
  templateFileInput.value = saved.templateFile;
  outputFolderInput.value = saved.outputFolder;
  localeSelect.value = saved.locale;
  timeFormatSelect.value = saved.timeFormat;
  baseGroupSizeSelect.value = saved.baseGroupSize;
  ramazanHesabiInput.checked = saved.ramazanHesabi;
  announcementMessageInput.value = saved.announcementMessage;

  if (saved.tsvFolder) {
    await refreshMonths();
    if (saved.month && Array.from(monthSelect.options).some((opt) => opt.value === saved.month)) {
      monthSelect.value = saved.month;
    }
  }

  log("Restored last entries.");
}

function saveLastEntries(): void {
  const data: LastEntries = {
    tsvFolder: tsvFolderInput.value.trim(),
    templateFile: templateFileInput.value.trim(),
    outputFolder: outputFolderInput.value.trim(),
    month: monthSelect.value,
    locale: localeSelect.value as GenerationOptions["locale"],
    timeFormat: timeFormatSelect.value as GenerationOptions["timeFormat"],
    baseGroupSize: baseGroupSizeSelect.value,
    ramazanHesabi: ramazanHesabiInput.checked,
    announcementMessage: announcementMessageInput.value
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
      templateFile: parsed.templateFile ?? "",
      outputFolder: parsed.outputFolder ?? "",
      month: parsed.month ?? "",
      locale: parsed.locale === "tr" ? "tr" : "en",
      timeFormat: parsed.timeFormat === "24h" ? "24h" : "ampm",
      baseGroupSize: parsed.baseGroupSize ?? "5",
      ramazanHesabi: parsed.ramazanHesabi === true,
      announcementMessage: parsed.announcementMessage ?? ""
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
    templateFile: templateFileInput.value,
    announcementMessage: announcementMessageInput.value,
    locale: localeSelect.value as GenerationOptions["locale"],
    timeFormat: timeFormatSelect.value as GenerationOptions["timeFormat"],
    baseGroupSize: Number(baseGroupSizeSelect.value),
    includeFridayNotes: true,
    ramazanHesabi: ramazanHesabiInput.checked
  };
}

function log(message: string): void {
  console.log(`[renderer] ${message}`);
  logEl.textContent = `${new Date().toISOString()}\n${message}`;
}

function logError(prefix: string, error: unknown): void {
  const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[renderer] ${prefix}`, error);
  log(`ERROR: ${prefix} -> ${details}`);
}

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Element not found: ${id}`);
  }
  return el as T;
}
