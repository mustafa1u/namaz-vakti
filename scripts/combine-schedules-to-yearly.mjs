import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const schedulesRoot = resolve(rootDir, "assets", "schedules", "2026");
const targetYear = "2026";

const REQUIRED_COLUMN = "Tarih";

async function main() {
  const cityEntries = await readdir(schedulesRoot, { withFileTypes: true });
  let processed = 0;
  let skipped = 0;

  for (const cityEntry of cityEntries) {
    if (!cityEntry.isDirectory()) {
      continue;
    }

    const cityPath = join(schedulesRoot, cityEntry.name);
    const files = await readdir(cityPath, { withFileTypes: true });
    const monthly = files
      .filter((entry) => entry.isFile() && /_\d{4}-\d{2}\.tsv$/i.test(entry.name) && entry.name.includes(`${targetYear}-`))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    if (monthly.length === 0) {
      skipped += 1;
      console.log(`[skip] ${cityEntry.name}: no monthly ${targetYear} TSV files`);
      continue;
    }

    const mergedRows = [];
    let headerOrder = null;

    for (const fileName of monthly) {
      const fullPath = join(cityPath, fileName);
      const raw = await readFile(fullPath, "utf8");
      const rows = parse(raw, {
        columns: true,
        delimiter: "\t",
        bom: true,
        skip_empty_lines: true
      });

      if (rows.length === 0) {
        continue;
      }

      const keys = Object.keys(rows[0]);
      if (!keys.includes(REQUIRED_COLUMN)) {
        throw new Error(`Missing required column "${REQUIRED_COLUMN}" in ${fullPath}`);
      }

      if (!headerOrder) {
        headerOrder = keys;
      } else if (!sameHeaderOrder(headerOrder, keys)) {
        throw new Error(`Header mismatch in ${fullPath}. Expected: ${headerOrder.join(", ")}. Got: ${keys.join(", ")}`);
      }

      for (const row of rows) {
        if (typeof row[REQUIRED_COLUMN] !== "string" || row[REQUIRED_COLUMN].trim().length === 0) {
          throw new Error(`Missing "${REQUIRED_COLUMN}" value in ${fullPath}`);
        }
        mergedRows.push(row);
      }
    }

    if (!headerOrder) {
      skipped += 1;
      console.log(`[skip] ${cityEntry.name}: all monthly files empty`);
      continue;
    }

    mergedRows.sort((a, b) => String(a[REQUIRED_COLUMN]).localeCompare(String(b[REQUIRED_COLUMN])));

    const deduped = [];
    const seenDates = new Set();
    for (const row of mergedRows) {
      const dateIso = String(row[REQUIRED_COLUMN]);
      if (seenDates.has(dateIso)) {
        continue;
      }
      seenDates.add(dateIso);
      deduped.push(row);
    }

    const outPath = join(cityPath, `schedule_${targetYear}.tsv`);
    const output = toTsv(headerOrder, deduped);
    await writeFile(outPath, `\uFEFF${output}`, "utf8");

    processed += 1;
    const firstDate = deduped[0]?.[REQUIRED_COLUMN] ?? "-";
    const lastDate = deduped[deduped.length - 1]?.[REQUIRED_COLUMN] ?? "-";
    console.log(
      `[ok] ${cityEntry.name}: ${monthly.length} files -> ${deduped.length} rows (${firstDate} .. ${lastDate}) -> ${outPath}`
    );
  }

  console.log(`[done] processed=${processed}, skipped=${skipped}, root=${schedulesRoot}`);
}

function sameHeaderOrder(expected, actual) {
  if (expected.length !== actual.length) {
    return false;
  }
  for (let i = 0; i < expected.length; i += 1) {
    if (expected[i] !== actual[i]) {
      return false;
    }
  }
  return true;
}

function toTsv(headerOrder, rows) {
  const lines = [headerOrder.join("\t")];
  for (const row of rows) {
    const values = headerOrder.map((key) => normalizeTsvCell(row[key]));
    lines.push(values.join("\t"));
  }
  return lines.join("\n");
}

function normalizeTsvCell(value) {
  const asString = value == null ? "" : String(value);
  if (asString.includes("\t") || asString.includes("\n") || asString.includes("\r") || asString.includes("\"")) {
    return `"${asString.replaceAll("\"", "\"\"")}"`;
  }
  return asString;
}

main().catch((error) => {
  console.error("[error]", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
