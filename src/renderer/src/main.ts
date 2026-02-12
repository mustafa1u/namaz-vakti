import type { GenerationOptions } from "@shared/ipc";

const tsvFolderInput = getEl<HTMLInputElement>("tsvFolder");
const templateFileInput = getEl<HTMLInputElement>("templateFile");
const outputFolderInput = getEl<HTMLInputElement>("outputFolder");
const monthSelect = getEl<HTMLSelectElement>("month");
const localeSelect = getEl<HTMLSelectElement>("locale");
const timeFormatSelect = getEl<HTMLSelectElement>("timeFormat");
const baseGroupSizeSelect = getEl<HTMLSelectElement>("baseGroupSize");
const logEl = getEl<HTMLElement>("log");

bootstrap();

function bootstrap(): void {
  if (!window.appApi) {
    log("ERROR: window.appApi is undefined. Preload did not load.");
    return;
  }

  log(`appApi ready. Methods: ${Object.keys(window.appApi).join(", ")}`);

  getEl<HTMLButtonElement>("pickTsv").addEventListener("click", async () => {
    try {
      log("pickTsv clicked");
      const path = await window.appApi.selectTsvFolder();
      log(`pickTsv result: ${path ?? "<cancelled>"}`);
      if (path) {
        tsvFolderInput.value = path;
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
    log(`Found months: ${months.join(", ")}`);
  }
}

function readOptions(): GenerationOptions {
  return {
    month: monthSelect.value,
    tsvFolder: tsvFolderInput.value,
    outputFolder: outputFolderInput.value,
    templateFile: templateFileInput.value,
    locale: localeSelect.value as GenerationOptions["locale"],
    timeFormat: timeFormatSelect.value as GenerationOptions["timeFormat"],
    baseGroupSize: Number(baseGroupSizeSelect.value),
    includeFridayNotes: true
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
