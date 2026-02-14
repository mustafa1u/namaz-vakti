import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const enPath = resolve("src/renderer/src/i18n/en.json");
const trPath = resolve("src/renderer/src/i18n/tr.json");

const en = JSON.parse(readFileSync(enPath, "utf8"));
const tr = JSON.parse(readFileSync(trPath, "utf8"));

function flatten(obj, prefix = "") {
  const map = new Map();
  for (const [key, value] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of flatten(value, nextKey)) {
        map.set(nestedKey, nestedValue);
      }
      continue;
    }
    map.set(nextKey, value);
  }
  return map;
}

function extractPlaceholders(text) {
  if (typeof text !== "string") {
    return [];
  }
  return [...text.matchAll(/{{\s*([^}\s]+)\s*}}/g)].map((m) => m[1]).sort();
}

const enFlat = flatten(en);
const trFlat = flatten(tr);
const failures = [];

for (const key of enFlat.keys()) {
  if (!trFlat.has(key)) {
    failures.push(`Missing key in tr.json: ${key}`);
    continue;
  }

  const enPlaceholders = extractPlaceholders(enFlat.get(key));
  const trPlaceholders = extractPlaceholders(trFlat.get(key));
  if (enPlaceholders.join(",") !== trPlaceholders.join(",")) {
    failures.push(
      `Placeholder mismatch for ${key}: en=[${enPlaceholders.join(",")}] tr=[${trPlaceholders.join(",")}]`
    );
  }
}

for (const key of trFlat.keys()) {
  if (!enFlat.has(key)) {
    failures.push(`Extra key in tr.json: ${key}`);
  }
}

if (failures.length > 0) {
  for (const message of failures) {
    console.error(message);
  }
  process.exit(1);
}

console.log("i18n key check passed.");
