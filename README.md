# Namaz Vakti Desktop Skeleton (Option 1)

Electron + Node + template-first XLSX generation skeleton for:
- Read monthly TSV (`paterson_YYYY-MM.tsv`)
- Compute grouped iqamah times
- Export XLSX and PNG

## Folder Layout

```text
desktop-app/
  assets/
    templates/
      README.md
  src/
    domain/
      types.ts
      iqamah-rules.ts
      optimizer.ts
      grouping.ts
      pipeline.ts
    main/
      index.ts
      ipc-handlers.ts
    preload/
      index.ts
    renderer/
      index.html
      src/
        main.ts
        global.d.ts
    services/
      tsv-reader.ts
      xlsx-writer.ts
      png-renderer.ts
      template-map.ts
    shared/
      ipc.ts
  electron.vite.config.ts
  package.json
  tsconfig.json
```

## IPC Contracts

Defined in `src/shared/ipc.ts`:
- `listMonths(tsvFolder) -> string[]`
- `previewMonth(options) -> PreviewMonthResponse`
- `generateOutputs(options) -> { xlsxPath, pngPath, warnings }`
- `selectTsvFolder() -> string | null`
- `selectOutputFolder() -> string | null`
- `selectTemplateFile() -> string | null`

`GenerationOptions` includes:
- `month` (`YYYY-MM`)
- `tsvFolder`, `outputFolder`, `templateFile`
- `locale` (`en|tr`), `timeFormat` (`ampm|24h`)
- `baseGroupSize` (`5|10|15`)

## Algorithm Interfaces

`src/domain/iqamah-rules.ts`
- Rule definitions per prayer
- Base group-size validation

`src/domain/optimizer.ts`
- `buildBaseGroups(days, size)`
- `optimizeIqamahForPrayer(days, rule)`
- `optimizeGroups(baseGroups, rules)`

`src/domain/grouping.ts`
- `collapseAdjacentSameGroups(groups)`
- `assignColorTokens(baseGroups, theme)`

`src/domain/pipeline.ts`
- `buildMonthlyPlan(input)` orchestrates full flow:
  parse minutes -> base groups -> optimize -> collapse -> color sequence.

## Implementation Notes

- Optimizer enforces prayer constraints (`>= +offset` for zhuhr/asr/maghrib/isha, `<= -offset` from sunrise for fajr) and applies 5-minute quantization except maghrib.
- XLSX writer now uses concrete `Odd`/`Even` sheet maps from the provided template and preserves template styles by copying source row styles.
- PNG export is generated from a hidden offscreen BrowserWindow for deterministic capture.

## Run

```bash
cd desktop-app
npm install
npm run dev
```

## Next Coding Step

1. Finalize template mapping (`src/services/template-map.ts`) using named ranges or stable coordinates.
2. Implement full XLSX write logic in `src/services/xlsx-writer.ts`.
3. Render a dedicated print view for PNG export.
4. Add unit tests around `optimizer.ts` and `grouping.ts`.
