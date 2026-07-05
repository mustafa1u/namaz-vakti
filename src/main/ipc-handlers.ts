import { app, dialog, ipcMain, shell } from "electron";
import type { BrowserWindow } from "electron";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import {
  APP_CHANNELS,
  type Customization,
  type PrayerKey,
  GenerateOutputsRequestSchema,
  GenerateOutputsResponseSchema,
  ShowInFolderRequestSchema
} from "@shared/ipc";
import { listAvailableMonths, readMonthTsv, readYearTsv } from "@services/tsv-reader";
import type { RawDailyRecord } from "@domain/types";
import { buildMonthlyPlan } from "@domain/pipeline";
import { writeXlsxFromTemplate } from "@services/xlsx-writer";
import { renderPng } from "@services/png-renderer";
import { resolveDefaultOutputFolder } from "./default-output-folder";
import { revealFileInFolder } from "./reveal-in-folder";

type WindowGetter = () => BrowserWindow | null;
const FIXED_TEMPLATE_FILE_NAME = "Mevlana Masjid Prayer Times_KALIP.xlsx";
const STANDARD_ZHUHR_ANCHOR = (12 * 60) + 15;
const DAYLIGHT_ZHUHR_ANCHOR = (13 * 60) + 15;
const IS_DEV = !app.isPackaged;
let preferredExplorerWindowHandle: string | null = null;
const REUSE_EXPLORER_WINDOW_SCRIPT_BODY = `
$ErrorActionPreference = 'SilentlyContinue'
$folderPath = [System.IO.Path]::GetDirectoryName($FilePath)
$fileName = [System.IO.Path]::GetFileName($FilePath)
if (-not $folderPath -or -not $fileName) { exit 1 }
$normalizedTarget = $folderPath.TrimEnd('\\')
$preferredHwndNumber = 0
try { $preferredHwndNumber = [int64]$PreferredHwnd } catch {}
function Wait-ExplorerReady($window) {
  for ($i = 0; $i -lt 20; $i++) {
    try {
      if (-not $window.Busy) { break }
    } catch {}
    Start-Sleep -Milliseconds 100
  }
}
function Navigate-Explorer($window, [string]$path) {
  try {
    $window.Navigate2($path)
    Wait-ExplorerReady $window
    return
  } catch {}
  try {
    $window.Navigate($path)
    Wait-ExplorerReady $window
  } catch {}
}
try {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class ExplorerWindowActivation {
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")]
  public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);
}
"@
} catch {}
function Activate-ExplorerWindow($window) {
  try {
    $hwnd = [IntPtr]([int64]$window.HWND)
    [void][ExplorerWindowActivation]::ShowWindowAsync($hwnd, 9)
    Start-Sleep -Milliseconds 80
    [void][ExplorerWindowActivation]::BringWindowToTop($hwnd)
    [void][ExplorerWindowActivation]::SetForegroundWindow($hwnd)
    [ExplorerWindowActivation]::SwitchToThisWindow($hwnd, $true)
  } catch {}
}
$shell = New-Object -ComObject Shell.Application
function Find-ExplorerWindow([int64]$preferredHwnd, [string]$targetPath) {
  $pathMatchedWindow = $null
  foreach ($window in @($shell.Windows())) {
    try {
      $fullName = [string]$window.FullName
      if (-not $fullName.ToLowerInvariant().EndsWith('\\explorer.exe')) { continue }
      $windowHwnd = [int64]$window.HWND
      if ($preferredHwnd -gt 0 -and $windowHwnd -eq $preferredHwnd) {
        return $window
      }
      $currentPath = [string]$window.Document.Folder.Self.Path
      if ($currentPath -and [System.String]::Equals($currentPath.TrimEnd('\\'), $targetPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        $pathMatchedWindow = $window
      }
    } catch {}
  }
  return $pathMatchedWindow
}
$targetWindow = Find-ExplorerWindow $preferredHwndNumber $normalizedTarget
if (-not $targetWindow) {
  try { $shell.Open($folderPath) } catch {}
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 100
    $targetWindow = Find-ExplorerWindow 0 $normalizedTarget
    if ($targetWindow) {
      break
    }
  }
}
if (-not $targetWindow) { exit 1 }
$selected = $false
try {
  $parentPath = [System.IO.Directory]::GetParent($folderPath).FullName
  if ($parentPath) {
    Navigate-Explorer $targetWindow $parentPath
  }
} catch {}
Navigate-Explorer $targetWindow $folderPath
try { $targetWindow.Document.Refresh() } catch {}
Start-Sleep -Milliseconds 250
try {
  $item = $targetWindow.Document.Folder.ParseName($fileName)
  if ($item) {
    $targetWindow.Document.SelectItem($item, 29)
    $selected = $true
  }
} catch {}
try { $targetWindow.Visible = $true } catch {}
Activate-ExplorerWindow $targetWindow
if ($selected) {
  try { Write-Output ([string]$targetWindow.HWND) } catch {}
  exit 0
}
exit 2
`.trim();

function devLog(...args: unknown[]): void {
  if (IS_DEV) {
    console.log(...args);
  }
}

function resolveFixedTemplateFile(): string {
  const candidates = [
    join(process.resourcesPath, "assets", "templates", FIXED_TEMPLATE_FILE_NAME),
    join(app.getAppPath(), "assets", "templates", FIXED_TEMPLATE_FILE_NAME),
    join(app.getAppPath(), "..", "assets", "templates", FIXED_TEMPLATE_FILE_NAME),
    resolve(process.cwd(), "assets", "templates", FIXED_TEMPLATE_FILE_NAME)
  ].map((candidate) => resolve(candidate));

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Template file not found. Checked: ${candidates.join(" | ")}`);
  }
  return found;
}

function resolveTsvFolderPath(tsvFolder: string): string {
  const trimmed = tsvFolder.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }

  if (isAbsolute(trimmed)) {
    return trimmed;
  }

  const candidates = [
    join(process.resourcesPath, trimmed),
    join(app.getAppPath(), trimmed),
    join(app.getAppPath(), "..", trimmed),
    resolve(process.cwd(), trimmed)
  ].map((candidate) => resolve(candidate));

  const found = candidates.find((candidate) => existsSync(candidate));
  return found ?? resolve(process.cwd(), trimmed);
}

const PRAYER_ORDER: PrayerKey[] = ["fajr", "zhuhr", "asr", "maghrib", "isha"];
type YearZhuhrPeriod = {
  startIso: string;
  endIso: string;
  regionType: "standard" | "daylight";
};

function toMinutes(hhmm: string): number {
  const [hRaw, mRaw] = hhmm.split(":");
  return (Number(hRaw ?? 0) * 60) + Number(mRaw ?? 0);
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }

  return Math.floor((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function inferRegionFromZhuhr(zhuhrMinutes: number[]): "standard" | "daylight" {
  const regionMedian = median(zhuhrMinutes);
  return Math.abs(regionMedian - STANDARD_ZHUHR_ANCHOR) <= Math.abs(regionMedian - DAYLIGHT_ZHUHR_ANCHOR)
    ? "standard"
    : "daylight";
}

function buildYearZhuhrPeriods(days: RawDailyRecord[]): YearZhuhrPeriod[] {
  if (days.length === 0) {
    return [];
  }

  const sorted = [...days].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  const splitIndexes: number[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = toMinutes(sorted[i]!.ogle);
    const next = toMinutes(sorted[i + 1]!.ogle);
    if (Math.abs(next - current) > 50) {
      splitIndexes.push(i + 1);
    }
  }

  const periods: YearZhuhrPeriod[] = [];
  let segmentStart = 0;
  for (const splitIndex of splitIndexes) {
    const segment = sorted.slice(segmentStart, splitIndex);
    if (segment.length > 0) {
      periods.push({
        startIso: segment[0]!.dateIso,
        endIso: segment[segment.length - 1]!.dateIso,
        regionType: inferRegionFromZhuhr(segment.map((day) => toMinutes(day.ogle)))
      });
    }
    segmentStart = splitIndex;
  }

  const tail = sorted.slice(segmentStart);
  if (tail.length > 0) {
    periods.push({
      startIso: tail[0]!.dateIso,
      endIso: tail[tail.length - 1]!.dateIso,
      regionType: inferRegionFromZhuhr(tail.map((day) => toMinutes(day.ogle)))
    });
  }

  return periods;
}

async function computeYearZhuhrPeriods(tsvFolder: string, month: string): Promise<YearZhuhrPeriod[]> {
  const [year] = month.split("-");
  if (!year) {
    return [];
  }

  const allDays = await readYearTsv(tsvFolder, year);
  return buildYearZhuhrPeriods(allDays);
}

function formatYearZhuhrPeriods(periods: YearZhuhrPeriod[]): string {
  if (periods.length === 0) {
    return "none";
  }

  return periods
    .map((period) => `${period.startIso}..${period.endIso}=${period.regionType}`)
    .join(" | ");
}

function collectLimitWarnings(customization: Customization): string[] {
  const warnings: string[] = [];

  for (const prayer of PRAYER_ORDER) {
    const config = customization.prayers[prayer];
    if (!config.noEarlier.enabled || !config.noLater.enabled) {
      continue;
    }

    const regions: Array<"single" | "standard" | "daylight"> = ["single", "standard", "daylight"];
    for (const region of regions) {
      const lower = config.noEarlier.mode === "single"
        ? config.noEarlier.singleMinutes
        : (region === "daylight" ? config.noEarlier.daylightMinutes : config.noEarlier.standardMinutes);
      const upper = config.noLater.mode === "single"
        ? config.noLater.singleMinutes
        : (region === "daylight" ? config.noLater.daylightMinutes : config.noLater.standardMinutes);
      if (lower > upper) {
        warnings.push(`${prayer}: no-earlier ${region} limit is later than no-later ${region} limit.`);
      }
    }
  }

  return warnings;
}

function showFileInFolder(filePath: string): boolean {
  try {
    const show = (target: string): void => {
      try {
        shell.showItemInFolder(target);
      } catch (error) {
        devLog("[ipc] SHOW_IN_FOLDER failed", error);
      }
    };

    return revealFileInFolder(filePath, {
      exists: existsSync,
      show,
      reuseExplorerWindow: (target) => tryReuseExistingExplorerWindow(target),
      selectInExplorer: (target) => {
        const child = spawn("explorer.exe", [`/select,${target}`], {
          detached: true,
          stdio: "ignore",
          windowsHide: false
        });
        child.unref();
      },
      setTimer: (callback, delayMs) => {
        setTimeout(callback, delayMs);
      },
      platform: process.platform
    });
  } catch (error) {
    devLog("[ipc] SHOW_IN_FOLDER failed", error);
    return false;
  }
}

function tryReuseExistingExplorerWindow(filePath: string): boolean {
  if (process.platform !== "win32") {
    return false;
  }

  try {
    const encodedScript = Buffer
      .from(buildReuseExplorerWindowScript(filePath, preferredExplorerWindowHandle), "utf16le")
      .toString("base64");
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-EncodedCommand",
        encodedScript
      ],
      {
        encoding: "utf8",
        timeout: 7000,
        windowsHide: true
      }
    );

    if (result.status === 0) {
      const windowHandle = parseExplorerWindowHandle(result.stdout);
      if (windowHandle) {
        preferredExplorerWindowHandle = windowHandle;
      }
      return true;
    }

    return false;
  } catch (error) {
    devLog("[ipc] REUSE_EXPLORER_WINDOW failed", error);
    return false;
  }
}

function parseExplorerWindowHandle(output: string | Buffer | null): string | null {
  const text = output?.toString() ?? "";
  return text.match(/\b\d+\b/)?.[0] ?? null;
}

function buildReuseExplorerWindowScript(filePath: string, preferredWindowHandle: string | null): string {
  const encodedFilePath = Buffer.from(filePath, "utf16le").toString("base64");
  const safePreferredWindowHandle = preferredWindowHandle?.match(/^\d+$/) ? preferredWindowHandle : "0";
  return [
    `$PreferredHwnd = '${safePreferredWindowHandle}'`,
    `$FilePath = [System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String('${encodedFilePath}'))`,
    REUSE_EXPLORER_WINDOW_SCRIPT_BODY
  ].join("\n");
}

export function registerIpcHandlers(_getWindow: WindowGetter): void {
  devLog("[main] registering IPC handlers");

  ipcMain.handle(APP_CHANNELS.LIST_MONTHS, async (_event, tsvFolder: string) => {
    const resolvedTsvFolder = resolveTsvFolderPath(tsvFolder);
    devLog("[ipc] LIST_MONTHS", tsvFolder, "->", resolvedTsvFolder);
    return listAvailableMonths(resolvedTsvFolder);
  });

  ipcMain.handle(APP_CHANNELS.GENERATE_OUTPUTS, async (_event, rawRequest) => {
    const request = GenerateOutputsRequestSchema.parse(rawRequest);
    const { options, targets } = request;
    const resolvedTsvFolder = resolveTsvFolderPath(options.tsvFolder);
    devLog("[ipc] GENERATE_OUTPUTS", options.month, targets.join(","), resolvedTsvFolder);
    const templateFile = resolveFixedTemplateFile();
    const days = await readMonthTsv(resolvedTsvFolder, options.month);
    const yearZhuhrPeriods = await computeYearZhuhrPeriods(resolvedTsvFolder, options.month);
    devLog("[ipc] ZHUHR_PERIODS", options.month, formatYearZhuhrPeriods(yearZhuhrPeriods));
    const plan = buildMonthlyPlan({
      month: options.month,
      locale: options.locale,
      timeFormat: options.timeFormat,
      customization: options.customization,
      baseGroupSize: options.baseGroupSize,
      ramazanHesabi: options.ramazanHesabi,
      yearZhuhrPeriods,
      days
    });

    const writes: Array<Promise<["xlsx" | "png", string]>> = [];
    if (targets.includes("xlsx")) {
      writes.push(
        writeXlsxFromTemplate({
          outputFolder: options.outputFolder,
          templateFile,
          plan,
          masjidName: options.masjidName,
          masjidAddress: options.masjidAddress,
          announcementMessage: options.announcementMessage
        }).then((value) => ["xlsx", value] as const)
      );
    }
    if (targets.includes("png")) {
      writes.push(
        renderPng({
          outputFolder: options.outputFolder,
          plan,
          masjidName: options.masjidName,
          masjidAddress: options.masjidAddress,
          announcementMessage: options.announcementMessage
        }).then((value) => ["png", value] as const)
      );
    }
    const completed = await Promise.all(writes);
    const byTarget = new Map(completed);
    for (const [, filePath] of completed) {
      showFileInFolder(filePath);
    }

    return GenerateOutputsResponseSchema.parse({
      xlsxPath: byTarget.get("xlsx") ?? null,
      pngPath: byTarget.get("png") ?? null,
      warnings: collectLimitWarnings(options.customization)
    });
  });

  ipcMain.handle(APP_CHANNELS.SELECT_OUTPUT_FOLDER, async () => {
    devLog("[ipc] SELECT_OUTPUT_FOLDER");
    const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle(APP_CHANNELS.GET_DEFAULT_OUTPUT_FOLDER, async () => {
    devLog("[ipc] GET_DEFAULT_OUTPUT_FOLDER");
    return resolveDefaultOutputFolder({
      getPath: (name) => app.getPath(name),
      exists: existsSync
    });
  });

  ipcMain.handle(APP_CHANNELS.SHOW_IN_FOLDER, async (_event, rawRequest) => {
    const request = ShowInFolderRequestSchema.parse(rawRequest);
    devLog("[ipc] SHOW_IN_FOLDER", request.filePath);
    return showFileInFolder(request.filePath);
  });
}
