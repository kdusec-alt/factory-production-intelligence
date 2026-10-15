# Factory Production Intelligence V1.8 — NBY only

## Current production configuration (2026-10-15)

NBY is the **only** factory. There are **no buildings and no production lines** in this workflow.
The staff form `staff.html` displays NBY as a fixed read-only value, then asks for the production date, process (Stockfit / GCĐ or Assembly / TH), operator, total pairs, normal HC/hours, OT status, model codes and quantities, and optional notes. Vietnamese is the default; Traditional Chinese is available.

The cloud database uses a unique key of **production date + NBY + process**. This means at most one current report for each process on a given day. Corrections require revision confirmation; an audit record preserves changes. Older browser clients that still submit `factory` or `line` fields are rejected and must reload the current page.

The manager page `manager.html` lists NBY daily process records and compares two dates. CSV export does not contain building/line columns. Stockfit and Assembly are separate sequential processes and must **not** be added together as finished pairs.

## Historical productivity reference

Expected normal pairs = weighted historical normal pairs per man-hour × today's normal HC × normal hours.
Normal pairs = total pairs − confirmed OT pairs. Unknown OT is not assumed to be zero.

The benchmark uses prior days strictly before the selected date, with a minimum of 5 valid samples:
1. Same NBY process and exact model-code set, latest 15 eligible reports.
2. Same NBY process, latest 15 eligible reports.
3. Imported historical NBY process totals, latest 15 eligible days (reference only).

The earlier verified workbook contains 36 Stockfit and 36 Assembly process days (72 rows) from 2026-08-31 to 2026-10-13. These are whole-process references, not model-specific engineered IE/SAM standards. The reference is informational, not an official performance assessment.

## Architecture and security

- GitHub Pages: public frontend assets. `cloud-config.js` contains only the public Edge Function endpoint.
- Supabase Singapore project: `tzhoswjxoyoctqezlacp`.
- Edge Function `factory-api`: custom access-link authentication using SHA-256 hashes stored in an RLS-protected table. No plaintext private link keys in the repository.
- Staff link can save and request benchmark data, but cannot list all records. Manager link can list cloud reports. Treat the full private URLs as credentials; never publish them.
- PostgreSQL `production_entries`, `production_entry_audit`, `historical_process_daily`, `factory_link_credentials` have RLS enabled and public read/write revoked.
- `supabase/schema.sql` documents the current NBY-only schema for new installations. On an older populated deployment, review/migrate data before removing building/line columns.
- Existing V1.5 standalone analysis system remains separate.

## Live verification

On 2026-10-15 the NBY-only database migration and Edge Function were deployed. API acceptance tests returned HTTP 200 for a NBY process benchmark (15 historical samples), HTTP 200 for a real NBY-only process save, HTTP 409 for a duplicate save, and HTTP 422 for an outdated A01/legacy-form submission. SQL transaction tests covered revisions, separate GCĐ/TH records, and audit history. Temporary records and test credentials were removed, leaving 0 production records, 72 historical rows, and 2 active private access links.

The private staff/manager URLs are unchanged; reload the page to get V1.8. Browser and device-specific verification should be performed before mass rollout.

## V1.9 (2026-10-15): English + evidence-based 8H management intelligence

### Language support
- `staff.html`: Vietnamese (default), Traditional Chinese, English via a visible language dropdown. The selected language is remembered on the device; `?lang=en` or `?lang=zh` overrides it.
- `manager.html`: Traditional Chinese (default), English, Vietnamese. All KPI/table/insight labels and dynamic guidance are translated.
- Neither language preference nor translation changes the private staff/admin link key or cloud data model.

### 8-hour reference and actual normalization
- `normal_pairs = total_pairs - confirmed_OT_pairs`
- `actual_8H_equivalent = normal_pairs / regular_shift_hours × 8`
- `historical_rate = sum(historical_normal_pairs) / sum(historical_HC × historical_regular_hours)`
- `historical_8H_reference = historical_rate × today's_regular_HC × 8`
- `achievement = actual_8H_equivalent / historical_8H_reference` (equivalent to today's normal pairs/person-hour divided by historical rate).
- A real 6H shift normalized to 8H is **not** presented as 8H physically completed output. Actual completed pairs remain visible separately.
- OT output is never added to regular-shift productivity. Unknown OT suppresses the achievement verdict.

### Automated management interpretation
- No OT + ratio ≥ 100%: explicitly recognize regular-shift achievement without overtime.
- No OT + ratio < 100%: show below-reference status and prompt a review of model mix, HC, downtime and rework; do not infer root cause.
- OT reported: evaluate regular-shift output independently, and clearly disclose OT.
- Difference between Day A and Day B: compare person-hour rates, while warning when model-code sets differ.
- No valid historical reference (<5 days), unknown OT, or a failed history request: **no invented target or verdict**.
- Matching historical process/model-set reference is preferred. Same-process and whole-process historical fallback are marked as non-model-specific reference, not official IE/SAM KPIs.
- Dashboard KPIs and comparison now correctly label and calculate **8H equivalent**, not raw normal pairs as "8H pairs".
- Manager CSV adds `normal_output`, `output_8h_equivalent`, and `manhour_rate` while preserving source fields.

### Verification
- All three JavaScript files passed V8 syntax parsing.
- English/Vietnamese/Chinese staff translations contain the same 54 field/message keys.
- Mocked manager cloud flow: Day B Stockfit 400 pairs, 50 HC, 8H, no OT, historical rate 0.8 => historical 8H reference 320 pairs, actual 8H 400 pairs, 125% achievement, positive no-OT verdict. Assembly with OT was correctly classified separately.
- Mocked staff benchmark: 400 pairs in 8H and 300 pairs in 6H both normalize to 400 pairs/8H; unconfirmed OT yields no 8H achievement verdict.
- Existing Supabase Edge Function benchmark endpoint and NBY-only schema are reused; no schema migration or new staff login required.

## V1.13 (2026-10-15): Unified cloud dashboard and verified historical migration

- Historical GitHub production snapshot (exported 2026-10-14 09:29:50 UTC) was checked by date/process: all 72 process reports reconcile with model totals and OT totals.
- The 72 verified records were imported into `production_entries` (36 GCĐ and 36 TH); 72 audit records were written. Original 36 daily rows, 108 model rows and 28 historical quality issues are preserved in private RLS-protected `factory_import_archives`.
- `factory-api` manager-only `dashboard` action serves cloud production entries plus archived quality reference. Staff access links cannot list this data.
- Main `index.html#admin=<private-manager-key>` loads directly from Supabase; browser IndexedDB is not read, overwritten or used as cloud truth in this mode. A 5-minute refresh and manual refresh are available.
- Main dashboard is **read-only in cloud mode**. Production entry is via the existing private `staff.html#key=...` link, and `manager.html` links to the full cloud dashboard while preserving the manager key.
- Opening `index.html` without the private manager key retains the legacy single-browser mode with an explicit warning. Local unsynced changes on other devices are **not** included in the migration.
- Historical quality issues are archived reference only; no cloud quality-edit workflow has been implemented yet.
- Important: the two processes represent sequential work and must not be combined as final finished pairs.
