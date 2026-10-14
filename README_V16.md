# Factory Production Intelligence V1.6 — Vietnamese one-click entry

## What is implemented

- `staff.html`: mobile-first Vietnamese (Chinese toggle) daily form for A01–A07, B01–B07, C01–C07, D01–D06.
- Process-specific Stockfit / Assembly total output, HC, normal hours, OT (yes/no/unconfirmed), and expandable model breakdown.
- Browser-side validation and server-side validation. Normal output = daily completed output − OT completed output. If OT is unknown, normal output/rate is **not** calculated.
- `manager.html`: manager-only cloud view with A-day vs B-day comparison, separate Stockfit/Assembly man-hour productivity, per-line records, and CSV export.
- Supabase Edge Function: staff-link access secret, admin-link access secret, transactional write, duplicate-key conflict, optimistic revision checks, immutable audit rows, and RLS-restricted PostgreSQL.
- Existing V1.5 dashboard, IE management, historic records, and GitHub sync remain unchanged.

## One-time admin setup (staff will not see any of this)

1. Connect Supabase and create a project. **No cloud backend has been provisioned by the code alone.**
2. Run `supabase/schema.sql` in the project's SQL editor.
3. Deploy `supabase/functions/factory-api/index.ts` with JWT verification disabled (`supabase/config.toml`). This is necessary because authentication is via the custom secret links, not Supabase JWT. Restrict the function to the supplied allowed GitHub Pages origin.
4. Generate **two different** cryptographically strong secrets, at least 32 random bytes each, and configure Edge Function environment variables `STAFF_LINK_SECRET` and `ADMIN_LINK_SECRET`. Never commit or paste the secrets into GitHub, chat, or a public file. Do not reuse a GitHub personal access token.
5. Update **only the public endpoint** in `cloud-config.js`:
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
