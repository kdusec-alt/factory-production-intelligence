# Factory Production Intelligence — V1.3 (Direct Entry)

**繁體中文 / Tiếng Việt** · GitHub Pages · Browser-side IndexedDB records · No Excel required for daily work.

## Live site

- Traditional Chinese: https://kdusec-alt.github.io/factory-production-intelligence/
- Vietnamese: https://kdusec-alt.github.io/factory-production-intelligence/?lang=vn

## What's new in V1.3

- **每日登錄 / Nhập dữ liệu**: enter date, daily completed Stockfit/GCĐ and Assembly/TH output, normal HC, OT output/HC, normal/OT hours and notes directly on the site.
- **型體明細 / Chi tiết mã giày**: enter or edit each date/model's Stockfit and Assembly totals and OT pairs. No model-level HC is invented.
- **品質改善追蹤 / Theo dõi chất lượng**: enter issue, model, affected pairs, responsible/senior cadre, corrective action, status and due date.
- **Browser-local persistence**: records saved in IndexedDB and loaded when the same browser returns to the site. No Excel needed for new records.
- **Edit/delete**, change history and undo, **JSON backup/restore** for transferring data to another browser or recovering from cleared storage.
- Existing dashboards, daily trends, HC planning, model comparisons and data audit immediately use newly saved records.
- Initial database seeded from previously published 36 production days, 108 model records and 28 September quality issues.
- Legacy Excel import remains available as an optional migration tool; it is not required for daily use.

## IMPORTANT: Storage architecture

This is a **single-browser** data-entry application. GitHub Pages does not provide a database, server authentication or automatic synchronization. **A record saved on computer A will not appear on computer B**. If you clear browser site data, switch browser profiles, use incognito mode, or change device, data may be lost unless you have exported and restored a JSON backup.

For team-wide entry, access control, reliable centralized storage, auditability and backup, the next step is to add an authenticated backend database (e.g., Supabase/Postgres, Firebase, or a hosted server). Never embed admin API keys in a public GitHub Pages app. The V1.3 app does **not** upload manually entered records to GitHub or any cloud database.

## Existing public data

The repo is public and still includes the historical Excel workbook and bundled historical production/quality data from V1.2, as explicitly requested by the owner. These files are publicly accessible. Manually entered V1.3 data is not published to the repo.

## Calculations and cautions

- 8H final output = total daily completed output − OT completed output. Missing OT must remain `null`/blank, not silently become zero.
- Weighted pairs/man-hour = SUM(8H final output) / SUM(normal HC × normal hours), by Stockfit and Assembly **separately**.
- Stockfit and Assembly are sequential processes; do not add their output as if they were distinct finished pairs.
- Sabrina 4's two-pass Stockfit means completed output can be recognized later than process work; the dashboard measures final-output productivity, not true operation-cycle efficiency.
- For October data where OT was recorded as zero but OT HC blank, confirm actual OT status before concluding overtime was eliminated.
- HC planning is a linear scenario, **not** a promise that adding workers increases output proportionally.
- Historical quality issues with no recorded event date remain undated. No date is invented when editing them.

## Backup workflow

Open **每日登錄 → 資料備份與紀錄** (VN: **Nhập dữ liệu → Sao lưu và lịch sử**) and click **下載完整JSON備份**. Save the JSON in a secure location. Use **還原JSON備份** to restore on another browser; this replaces that browser's current data. Export at least once per workday until a centralized database is implemented.