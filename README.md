# Factory Production Intelligence — V1.4 (IE + Dynamic Models)

Traditional Chinese / Tiếng Việt. Static GitHub Pages website with browser-local IndexedDB (no server database).

## New in V1.4

- **IE standard management** (每日登錄 → IE 標準設定 / Nhập dữ liệu → Tiêu chuẩn IE): create new model codes, add optional model name and IE effective-date versions, edit and delete IE standards independently of production records.
- Set **Stockfit (GCĐ)** and **Assembly (TH)** IE standard labor content **SAM in labor-minutes/pair**, line **Cycle Time in seconds/pair**, optional dedicated planned HC and target efficiency separately.
- Live 8-hour (configurable hours) IE planning: **SAM-based labor pacing** = SAM × 60 ÷ (dedicated HC × target efficiency fraction); **planned output interval** = max(SAM-based pacing, provided IE cycle seconds); **expected pairs** = floor(hours × 3600 ÷ planned interval). A missing input is not guessed.
- **Model comparison** includes dynamic models and current IE values, with comparison-period model mix, SAM labor-hours and model-mix required HC **only when all relevant IE SAM, target efficiency, normal output, and model reconciliation are complete**.
- **IE versioning**: optional effective date. Blank means valid from the beginning; historical comparison uses the IE version effective on each production date. Changes to current standards do not automatically rewrite older effective-date versions.
- Existing daily entry, model output entry, quality follow-up, trends, local data persistence and JSON backup remain.
- **Backups** now include IE standards. V1.3 JSON backups are accepted for migration. The IndexedDB database name is unchanged to retain local V1.3 records.

## IE measurement caveats

**SAM** is the sum of standard human labor minutes required per pair, NOT elapsed time through Stockfit or Assembly. **Cycle Time** is the line's planned completion interval (seconds per pair), NOT the total production lead time. If both constraints are known, the slower (larger) interval limits throughput. Dedicated HC/target efficiency must be entered for SAM-based throughput; if only cycle time is known, cycle-only theoretical throughput is displayed and not described as labor-feasible. Missing IE standards are not estimated from historical output. No invented IE values are seeded.

Sabrina 4 Stockfit has two passes. Model-level completed output and standard time do not prove actual process lead time or true labor utilization. Model-mix HC planning requires complete model allocation and standards, and assumes standard labor content and efficiencies apply to the recorded mix; quality losses and WIP may reduce feasible output.

## Data persistence / privacy

New entries are stored in **this browser's IndexedDB only**. GitHub Pages has no multi-user synchronization. Export JSON backups regularly. This public repository already includes historical factory data explicitly uploaded by its owner; new manual IE and daily records are not automatically uploaded to GitHub.

Open: https://kdusec-alt.github.io/factory-production-intelligence/ (VN: add `?lang=vn`).
