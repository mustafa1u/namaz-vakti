import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importRevealModule() {
  const source = await readFile(new URL("../src/main/reveal-in-folder.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: "reveal-in-folder.ts"
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const { revealFileInFolder } = await importRevealModule();

test("revealFileInFolder reuses an existing Explorer window before opening a new one", () => {
  const reused = [];
  const explorerSelections = [];
  const shellSelections = [];

  const result = revealFileInFolder(" C:\\OneDrive\\iqamah.xlsx ", {
    exists: () => true,
    show: (filePath) => shellSelections.push(filePath),
    reuseExplorerWindow: (filePath) => {
      reused.push(filePath);
      return true;
    },
    selectInExplorer: (filePath) => explorerSelections.push(filePath),
    setTimer: () => {},
    platform: "win32"
  });

  assert.equal(result, true);
  assert.deepEqual(reused, ["C:\\OneDrive\\iqamah.xlsx"]);
  assert.deepEqual(explorerSelections, []);
  assert.deepEqual(shellSelections, []);
});

test("revealFileInFolder uses Explorer select on Windows", () => {
  const explorerSelections = [];
  const shellSelections = [];
  const timers = [];

  const result = revealFileInFolder(" C:\\OneDrive\\iqamah.xlsx ", {
    exists: () => true,
    show: (filePath) => {
      shellSelections.push(filePath);
    },
    reuseExplorerWindow: () => false,
    selectInExplorer: (filePath) => {
      explorerSelections.push(filePath);
    },
    setTimer: (callback, delayMs) => {
      timers.push({ callback, delayMs });
    },
    platform: "win32"
  });

  assert.equal(result, true);
  assert.deepEqual(explorerSelections, ["C:\\OneDrive\\iqamah.xlsx"]);
  assert.deepEqual(shellSelections, []);
  assert.deepEqual(timers, []);
});

test("revealFileInFolder falls back to shell reveal when Windows Explorer select fails", () => {
  const shellSelections = [];

  const result = revealFileInFolder("C:\\OneDrive\\iqamah.xlsx", {
    exists: () => true,
    show: (filePath) => {
      shellSelections.push(filePath);
    },
    selectInExplorer: () => {
      throw new Error("explorer unavailable");
    },
    setTimer: () => {},
    platform: "win32",
    refreshDelaysMs: []
  });

  assert.equal(result, true);
  assert.deepEqual(shellSelections, ["C:\\OneDrive\\iqamah.xlsx"]);
});

test("revealFileInFolder reveals once by default", () => {
  const shown = [];
  const timers = [];

  const result = revealFileInFolder(" C:\\OneDrive\\iqamah.xlsx ", {
    exists: () => true,
    show: (filePath) => {
      shown.push(filePath);
    },
    setTimer: (callback, delayMs) => {
      timers.push({ callback, delayMs });
    }
  });

  assert.equal(result, true);
  assert.deepEqual(shown, ["C:\\OneDrive\\iqamah.xlsx"]);
  assert.deepEqual(timers, []);
});

test("revealFileInFolder does not reveal missing files", () => {
  const shown = [];
  const timers = [];

  const result = revealFileInFolder("C:\\OneDrive\\missing.xlsx", {
    exists: () => false,
    show: (filePath) => shown.push(filePath),
    setTimer: (callback, delayMs) => timers.push({ callback, delayMs }),
    refreshDelaysMs: [1250]
  });

  assert.equal(result, false);
  assert.deepEqual(shown, []);
  assert.deepEqual(timers, []);
});
