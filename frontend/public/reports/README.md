# Weekly handover report

The format reference is the user-supplied `[2026-39] Laporan Serah Terima Kerja Mingguan.docx`. Its unchanged SHA-256 is `b09a5ee2f8ef10de35df62fe2ea0eebc207c528386a05da1362129e4df645cea`.

## Assets and PDF layout

`laporan-serah-terima-2026-39.pdf` is the unchanged 77-page Microsoft Word export served by **PDF dokumen asli**. Generated exports are separate documents populated from the selected website client, dates and project.

The generator draws an A4 portrait vector header on every page, with the exact title **LAPORAN SERAH TERIMA KERJA HARIAN**, full Indonesian date range and original logo. `hutabyte-logo.png` was extracted unchanged from Word (`word/media/image3.png`, SHA-256 `e12bf6d18a8cb6159016335b318acba1892cbfe9e4b6d3b66e0e8c84e01474a0`). Legacy `header.png` and `template.pdf` remain reference assets; generated exports no longer use them.

The body contains purpose, application scope, a teal project chart, grouped daily chart with data table and color keys, duration/SLA table, category-by-project matrix, monitoring summary, nine-column ticket log, seven-column monitoring log, and a boxed two-column signature block. Tables use roomier rows, alternating subtle shading, highlighted totals, and a shared teal header. Daily chart columns align with readable full-date table headings and a centered wrapping legend. Chart axes leave headroom above the maximum value. Table headers repeat; headings stay with following content; small tables and signatures stay together. Large logs paginate without dropping records. Footer defaults to the red page number and rule only.

Liberation Sans supplies Arial-compatible regular/bold metrics; standard Helvetica italic and Courier ticket IDs complement it. Font licenses are in `fonts/`. Full font embedding and disabled ligatures preserve rendering and text selection. Assets are local. PDF.js and its pinned local worker serve the browser preview.

## Configuration and source data

Defaults live in `app/lib/weekly-report-config.ts`: ordered master projects, project aliases and colors, severity mapping, `show_empty_projects: false`, `show_footnotes: false`, `show_footer_period: false`, and `week_start_day: 0` (Sunday through Saturday, confirmed by the user). Explicit dates are never shifted. Week numbering continues to use the ISO week containing the selected start date.

`buildWeeklyReport` accepts configuration and external combined ticket counts as its final argument:

```ts
const report = buildWeeklyReport(tickets, monitoring, period, clientId, "all", projects, {
  config: { show_empty_projects: false, week_start_day: 0 },
  combined_ticket_counts: { MB: 49, SM: 19 },
});
```

**Total Ticket Hutabyte x Tritronik** means the supplied combined Hutabyte/client total, not multiplication and not a value to which local tickets should be added again. Other clients use their own display name. `clickup_counts` remains a backward-compatible input alias; `combined_ticket_counts` takes precedence. Existing `clickupCount`/`clickupTotal` model properties retain these combined values. Zero is displayed only when explicitly supplied. Missing/invalid values are an em dash; a partial set never produces a misleading grand total. PDF generation logs a warning for unavailable counts.

Duration uses available resolution minutes from completed tickets; SLA uses measured response minutes strictly below 30. Missing measurements remain unknown. Aggregate aliases do not rewrite original project labels or ticket IDs in logs. Duplicate ticket IDs for separate agent rows are retained. Monitoring normalizes complete project labels, keeps source result text (including blanks), and counts actual log rows. Category totals are derived from records after severity normalization.

## Signatories

`ReportIdentity` accepts `prepared_by` and `approved_by`, each with `name`, `title`, `signature_image_path: string | null`, and optional ISO `date`. Missing dates default to the Jakarta creation date. Legacy identity fields remain supported. The Reports settings expose both names, titles, dates and optional local PNGs. Images are validated in the browser and kept in component memory. The PDF fits each image within a 25 mm signature area, at most 60% of the inner column width. Without an image, a line remains inside the cell. Source-document signatures are never automatically applied to a new report.

## Verification

Run `npm run test:reports` in `frontend/`. Tests cover date ranges, Sunday presets, filtering, client isolation, category matrices, monitoring totals, combined count adapters, source IDs, CSV, A4 output and long-note pagination.

Local QA uses the supplied Week 36 PDF and original Week 39 Word in ignored `frontend/.report-qa/` fixtures. Week 36 preserves 17 tickets, average duration 0:34 and SLA 100%. The actual Week 39 logs contain 138 tickets and 864 monitoring rows; totals are recalculated instead of copying inconsistent Word summary cells. The ambiguous source row labeled DM with combined count 4 is not silently reassigned to B2B. Missing Week 39 response measurements remain unknown. Example output PDFs are saved under `output/pdf/`; their signatures are blank.


