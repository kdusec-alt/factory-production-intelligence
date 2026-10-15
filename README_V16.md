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
