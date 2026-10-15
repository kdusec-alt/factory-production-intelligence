# Factory Production Intelligence V1.6 — Vietnamese one-click entry

## What is implemented

- `staff.html`: mobile-first Vietnamese (Chinese toggle) daily form for A01–A07, B01–B07, C01–C07, D01–D06.
- Process-specific Stockfit / Assembly total output, HC, normal hours, OT (yes/no/unconfirmed), and expandable model breakdown.
- Browser-side validation and server-side validation. Normal output = daily completed output − OT completed output. If OT is unknown, normal output/rate is **not** calculated.
- `manager.html`: manager-only cloud view with A-day vs B-day comparison, separate Stockfit/Assembly man-hour productivity, per-line records, and CSV export.
- Supabase Edge Function: hashed staff-link credential, hashed admin-link credential, transactional write, duplicate-key conflict, optimistic revision checks, immutable audit rows, and RLS-restricted PostgreSQL.
- Existing V1.5 dashboard, IE management, historic records, and GitHub sync remain unchanged.

## One-time admin setup (staff will not see any of this)

1. Connect Supabase and create a project. **No cloud backend has been provisioned by the code alone.**
2. Run `supabase/schema.sql` in the project's SQL editor.
3. Deploy `supabase/functions/factory-api/index.ts` with JWT verification disabled (`supabase/config.toml`). This is necessary because authentication is via the custom secret links, not Supabase JWT. Restrict the function to the supplied allowed GitHub Pages origin.
4. Generate **two different** cryptographically strong private link tokens, at least 32 random bytes each, and privately insert only their SHA-256 hashes into `public.factory_link_credentials` with roles `staff` and `admin`. The deployed Edge Function verifies hashes using a service-role client. Never commit plaintext tokens to GitHub or reuse a GitHub personal access token.
5. Update **only the public endpoint** in `cloud-config.js` (already configured for this deployment):
   `https://YOUR-PROJECT.supabase.co/functions/v1/factory-api`.
6. Publish GitHub Pages. Test a staff submission and confirm the manager dashboard can read the saved record.
7. Distribute a **staff-specific link** containing the private secret after the `#` fragment, e.g. `https://kdusec-alt.github.io/factory-production-intelligence/staff.html#key=YOUR_RANDOM_STAFF_SECRET`.
   The manager uses a different secret: `.../manager.html#admin=YOUR_RANDOM_ADMIN_SECRET`.

### Important security facts

- The GitHub repository is public; **never** store staff/admin secrets or a Supabase service-role key in GitHub or browser JavaScript.
- Supabase RLS blocks anonymous database access. The Edge Function is the only entry point and validates a private staff link.
- A staff link is a bearer credential: anyone who obtains the full URL can submit or revise entries. Share it only with trusted staff. Rotate the staff secret if the link leaks. For production use with many independent employees, move to per-user or per-line access with audit identities.
- Staff can only submit, not list the entire dataset. Manager link can read reports; do not share it with staff.
- Staff reports are unique by date + factory + line + process. Revisions require confirmation and are written to `production_entry_audit`.
- If the cloud endpoint is not configured or the server is unavailable, the Save button stays disabled or reports a failure. **No fake success and no silent local-only save.**
- This is an initial internal workflow, not a substitute for a full identity and access management system. Set rate limits / bot protection before broad deployment.

## Production formula

`8H normal output = daily completed output - OT completed output`

`man-hour productivity = normal output / (normal HC × normal hours)`

Stockfit and Assembly are sequential processes, so **never add their completed outputs together** as finished pairs. Model IE SAM and cycle-time standards remain separate; do not assume final-output productivity equals detailed operation efficiency. Model breakdown must reconcile with daily total; unconfirmed OT is never assumed to be zero.

## Testing

- `node --check staff.js` and `node --check manager.js`
- Headless browser tests can intercept the Supabase API and exercise save, duplicate update, and manager A/B comparison without a real database.
- End-to-end real cloud writes require the owner's connected Supabase project and secrets; they are **not** proven by mock tests.

## Deployment and live acceptance test (2026-10-14)

- Supabase project `tzhoswjxoyoctqezlacp` in Singapore, active.
- Edge Function `factory-api` deployed, custom link-token auth backed by hashed keys.
- GitHub Pages deployment completed successfully.
- Real HTTP API acceptance tests via temporary `pg_net` requests: staff health 200, create 200, duplicate 409, confirmed update 200, manager list 200.
- PostgreSQL audit verified and temporary test records removed. The temporary test tokens were deleted; only the two active private production links remain.
- Headless browser local mocked integration tests passed for Vietnamese entry, Chinese toggle, conflict confirmation, manager rendering, and missing-link save disabled.
- Private production URLs are delivered separately to the owner, **never in this public ZIP**.

## V1.7 NBY single-factory and history-based benchmark

- Staff sees **Factory: NBY** (read-only), then **Building A/B/C/D** and line A01–D06. The legacy database column `factory` stores the building letter; `plant` is fixed to `NBY`.
- Normal-shift target = **historical weighted normal-shift pairs per man-hour × current normal HC × normal hours**. Historical normal pairs = total pairs − confirmed OT pairs. Unknown OT is excluded from benchmark history.
- Benchmark selection: (1) same line/process/exact model-code set, minimum 5 previous reports, latest 15; (2) same line/process, minimum 5 previous reports, reference only; (3) NBY whole-plant process history from the previous workbook, minimum 5 days, latest 15, reference only.
- Previous workbook (`Factory_Production_Intelligence_Vietnamese_2026-10-13.xlsx`) has factory-wide process totals, not per-line records. **Do not use the factory reference as an official line performance standard.**
- Only dates strictly before the selected reporting date are eligible. Source, number of samples, expected pairs, achievement rate and difference are displayed. A ±10% informational band is used only for matching line/process/model-set histories, not for staff bonuses or official grading.
- Private historic rows are loaded directly into Supabase and are **not** committed into the public repository.
The benchmark API calculation is implemented in `supabase/functions/factory-api/benchmark.ts` and the staff display in `nby-benchmark.js`. NBY history is private and is not stored as public SQL INSERTs.
