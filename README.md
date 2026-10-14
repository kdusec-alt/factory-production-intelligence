# Factory Production Intelligence — V1.5 (Two-day comparison + GitHub sync)

## What changed

- **A day vs B day**: only two date fields, default to the two latest actual production dates. KPI cards, comparison table, model mix, IE estimate and HC planner explicitly show the selected dates. Daily trend view still shows complete history.
- **Cloud sync**: opt-in GitHub Contents API using a fine-grained personal access token provided at runtime (in memory only). Data stored at `data/live-snapshot.json` on a separate `production-records` branch, so normal data writes do not rebuild GitHub Pages.
- After connecting, the user must **explicitly push or pull once**; subsequent local changes auto-sync while the tab is open if enabled. Concurrent remote changes are detected by SHA and rejected, rather than silently overwritten.
- The token is never stored in IndexedDB, localStorage, source code, or the repository. On page reload the user must reconnect. Local IndexedDB continues to work offline; export JSON backup is still available.
- Repo is **public**; all GitHub-synced production and quality data in `production-records` branch is also publicly readable. The user explicitly approved uploading these data in earlier turns.
- GitHub is acceptable for a single-user low-frequency dataset but is not a replacement for a transactional multi-user database.

## Set up sync

1. Create a GitHub fine-grained personal access token for repository `kdusec-alt/factory-production-intelligence`, with **Contents: Read and write** and no other permissions.
2. Open **每日登錄 → 資料備份與紀錄 → GitHub 雲端資料同步** and enter the token.
3. Click Connect, then Push (to make the local state authoritative) or Pull (to replace local data from an existing cloud snapshot).
4. When auto-sync is enabled, later saves trigger a background GitHub commit after a short delay. Confirm the cloud status; local saves are not the same as remote sync.

GitHub API content-file sync is limited to approximately 750 KB in this version to avoid the API's large-file handling restrictions.

The code never guesses missing OT values, model IE standards, or WIP/quality causes.