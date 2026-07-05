import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importDefaultOutputFolderModule() {
  const source = await readFile(new URL("../src/main/default-output-folder.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: "default-output-folder.ts"
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const { resolveDefaultOutputFolder } = await importDefaultOutputFolderModule();

test("resolveDefaultOutputFolder prefers Documents when it exists", () => {
  const existing = new Set(["C:\\Users\\person\\Documents", "C:\\Users\\person\\Downloads"]);

  const folderPath = resolveDefaultOutputFolder({
    getPath: (name) => name === "documents" ? "C:\\Users\\person\\Documents" : "C:\\Users\\person\\Downloads",
    exists: (candidate) => existing.has(candidate)
  });

  assert.equal(folderPath, "C:\\Users\\person\\Documents");
});

test("resolveDefaultOutputFolder falls back to Downloads when Documents is unavailable", () => {
  const folderPath = resolveDefaultOutputFolder({
    getPath: (name) => name === "documents" ? "C:\\Users\\person\\Documents" : "C:\\Users\\person\\Downloads",
    exists: (candidate) => candidate.endsWith("\\Downloads")
  });

  assert.equal(folderPath, "C:\\Users\\person\\Downloads");
});

test("resolveDefaultOutputFolder returns empty when neither user folder exists", () => {
  const folderPath = resolveDefaultOutputFolder({
    getPath: (name) => name === "documents" ? "C:\\Users\\person\\Documents" : "C:\\Users\\person\\Downloads",
    exists: () => false
  });

  assert.equal(folderPath, "");
});

test("resolveDefaultOutputFolder ignores getPath failures", () => {
  const folderPath = resolveDefaultOutputFolder({
    getPath: (name) => {
      if (name === "documents") {
        throw new Error("missing documents");
      }
      return "C:\\Users\\person\\Downloads";
    },
    exists: (candidate) => candidate.endsWith("\\Downloads")
  });

  assert.equal(folderPath, "C:\\Users\\person\\Downloads");
});
