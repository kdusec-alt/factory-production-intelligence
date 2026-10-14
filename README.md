# Factory Production Intelligence — GitHub Pages V1

**繁體中文 / Tiếng Việt** · Pure client-side dashboard · No backend · No external JavaScript dependencies.

## What this version does

- Upload one or more `.xlsx` workbooks **in your own browser**. It does not send the workbook to GitHub or any server.
- Reads `Master_Daily`, `Model_Data`, `Quality_Issues`, and/or the existing `Sheet2` (`TOTAL` rows) from the provided factory productivity template.
- Compares arbitrary baseline vs. comparison dates: 8H normal output/day, HC/day, **weighted 8H final-output pairs/man-hour**, and OT output share.
- Interactive daily charts, model breakdown, anomaly checks, and conservative/standard/stretch HC capacity scenarios.
- Quality issues, original PPT page, direct/senior owners. Does **not** automatically assign blame or calculate bonus deductions.
- Exports daily computed metrics to CSV.
- Full Traditional Chinese / Vietnamese UI.

## Deploy on GitHub Pages

1. Create a **new repository** called `factory-production-intelligence` in your GitHub account. Use a public repository if your GitHub plan requires it for free GitHub Pages. **Do not upload production spreadsheets or internal QM reports.**
2. Upload `index.html`, `styles.css`, `app.js`, `.nojekyll` from this ZIP to the repository **root**, commit to `main`.
3. Go to **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save**.
4. After deployment, the URL is normally `https://<your-github-username>.github.io/factory-production-intelligence/` (confirm in GitHub Settings → Pages).
5. Open the site in current Chrome/Edge, select **匯入Excel**, choose your local workbook(s), then set the comparison periods.

## Data handling / privacy

- **Do not commit internal factory files, production output, quality issues, or staff names to a public repository.** Only upload the four website source files.
- GitHub Pages sites are publicly accessible. This code does not include factory data, logins, a server, analytics trackers, or external dependencies.
- The browser reads the XLSX locally with the native `DecompressionStream('deflate-raw')` API, `DOMParser`, and a small ZIP/OOXML parser. Current Chrome and Edge are recommended.
- The Content Security Policy disallows network connections (`connect-src 'none'`). Data is not persisted; refreshing clears the imported workbook.
- The demo button generates **fictional sample data**, never actual factory records.
- This static version **does not** offer a shared team database, login, role-based permissions, automatic MES sync, or scheduled uploads. Those require a backend and secure hosting.

## Input workbooks

Preferred: `Factory_Production_Intelligence_Excel_v1.xlsx` (or later workbook with these sheets).

`Master_Daily` columns:

`Date | GC Total (prs) | GC HC 8H | GC OT (prs) | GC OT HC | GC Normal Hours | ASM Total (prs) | ASM HC 8H | ASM OT (prs) | ASM OT HC | ASM Normal Hours | OT Hours | ...`

`Model_Data` columns:

`Date | Model | GC Total | GC OT | GC 8H Output | ASM Total | ASM OT | ASM 8H Output | Note`

`Quality_Issues` columns: `PPT Page | Issue Type | Area | Area (VN) | Model | Issue # | Issue (VN) | Description (ZH) | Affected prs (PPT) | Allocation / note | Direct Owner | Senior Owner | PPT Root Cause | Caution`.

Fallback `Sheet2`: original bilingual worksheet, with model rows plus one `TOTAL` row per day. Daily HC is taken from the `TOTAL` row **only** to avoid counting shared HC multiple times. Model output is kept separate.

A simple CSV is also supported (English headers):

`Date,GC Total,GC HC 8H,GC OT,GC OT HC,GC Hours,ASM Total,ASM HC 8H,ASM OT,ASM OT HC,ASM Hours,OT Hours`

Dates in ISO `YYYY-MM-DD` format.

## Metric rules (critical)

- 8H final output = total daily final output **minus** OT final output.
- 8H weighted pairs/man-hour = `SUM(8H final output) / SUM(8H headcount × normal hours)`.
- GCĐ / Stockfit and TH / Assembly are **sequential processes**. Never add their outputs to represent unique shoe pairs.
- For Sabrina 4 double-pass Stockfit, final output can be shifted by WIP release; this is **not** actual Pass 1 or Pass 2 operation productivity.
- OT output share is `SUM(OT output) / SUM(total daily output)`, not an OT efficiency ratio.
- HC planner is a **linear scenario**, not proof that adding people will increase production proportionally.
- A zero OT entry with missing OT HC is flagged for confirmation; the app cannot determine whether no OT occurred or reporting is incomplete.
- The app does not infer root causes or production LT from output/HC alone.

## Scope and limitations

The XLSX reader supports standard, non-encrypted Excel `.xlsx` (OOXML ZIP), shared strings, inline strings, numeric and cached formula values. It does not calculate Excel formulas itself or support legacy `.xls`, password-protected workbooks, or ZIP64 files. Use the exported workbook with formula caches populated. If your browser lacks `DecompressionStream('deflate-raw')`, use an up-to-date Chrome/Edge.

Version 1.0 · Built for factory production analysis, GitHub Pages static hosting.