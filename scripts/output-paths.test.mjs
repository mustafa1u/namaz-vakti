import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import test from "node:test";
import ts from "typescript";

async function importOutputPathsModule() {
  const source = await readFile(new URL("../src/services/output-paths.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: "output-paths.ts"
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const { buildTemporaryOutputPath, buildUniqueOutputPath } = await importOutputPathsModule();

test("buildUniqueOutputPath adds an English month-abbreviated timestamp", () => {
  const outputPath = buildUniqueOutputPath({
    outputFolder: "C:\\exports",
    scheduleMonth: "2026-01",
    locale: "en",
    extension: "xlsx",
    now: new Date(2026, 6, 5, 9, 8, 7),
    pathExists: () => false
  });

  assert.equal(basename(outputPath), "iqamah_2026-01_2026-Jul-05_09-08-07.xlsx");
});

test("buildUniqueOutputPath uses the selected output language for timestamp month abbreviation", () => {
  const outputPath = buildUniqueOutputPath({
    outputFolder: "C:\\exports",
    scheduleMonth: "2026-01",
    locale: "tr",
    extension: "png",
    now: new Date(2026, 6, 5, 9, 8, 7),
    pathExists: () => false
  });

  assert.equal(basename(outputPath), "iqamah_2026-01_2026-Tem-05_09-08-07.png");
});

test("buildUniqueOutputPath suffixes a number when the timestamped name already exists", () => {
  const seen = new Set([
    "iqamah_2026-01_2026-Jul-05_09-08-07.xlsx",
    "iqamah_2026-01_2026-Jul-05_09-08-07_2.xlsx"
  ]);

  const outputPath = buildUniqueOutputPath({
    outputFolder: "C:\\exports",
    scheduleMonth: "2026-01",
    locale: "en",
    extension: "xlsx",
    now: new Date(2026, 6, 5, 9, 8, 7),
    pathExists: (candidate) => seen.has(basename(candidate))
  });

  assert.equal(basename(outputPath), "iqamah_2026-01_2026-Jul-05_09-08-07_3.xlsx");
});

test("buildTemporaryOutputPath uses a sibling temp file and avoids existing temp conflicts", () => {
  const seen = new Set([
    "iqamah_2026-01_2026-Jul-05_09-08-07.xlsx.tmp",
    "iqamah_2026-01_2026-Jul-05_09-08-07.xlsx.tmp-2"
  ]);

  const temporaryPath = buildTemporaryOutputPath("C:\\exports\\iqamah_2026-01_2026-Jul-05_09-08-07.xlsx", {
    pathExists: (candidate) => seen.has(basename(candidate))
  });

  assert.equal(basename(temporaryPath), "iqamah_2026-01_2026-Jul-05_09-08-07.xlsx.tmp-3");
});
