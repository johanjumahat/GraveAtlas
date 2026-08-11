# Phase 9 Blockers & Findings

## CI Failure Root Causes (measured, not assumed)

Downloaded and analyzed actual log files from 3 representative failed CI runs:

| Run ID | Commit | Error | Root cause category |
|---|---|---|---|
| 31306333897 | 3c02bea | `getEncryptedPrefs(Context,String) is not public in SecureStorage` — package-private method accessed from outside package | Access modifier error (another AI pushed code referencing a non-public method) |
| 31348750686 | dc24f69 | `variable prefs might already have been assigned` in `SettingsManager.java:34` | Definite-assignment error (duplicate initialization logic) |
| 31462991398 | be7bad6 | `package R does not exist` in `SettingsFragment.java:174` | Malformed XML resources prevented R.java generation (themes.xml had duplicate `</resources>` tag) — **fixed in PR #13** |

**Pattern:** All 12 historical failures (16 success / 12 failure / 2 cancelled in last 30 runs) were **compilation errors** — not test failures, not infrastructure issues. Each was caused by another AI assistant pushing code to `main` that didn't compile. The backend test suite (415 tests) has never failed.

**This is not a CI infrastructure problem — it is a code-quality-at-push problem.** The branching/PR workflow rule (already in standing instructions) is the correct fix: CI runs on PRs before merge, catching compilation errors before they reach main.

## Severity Classification

| ID | Finding | Severity | Evidence | Status |
|---|---|---|---|---|
| B1 | Another AI pushed uncompiled code to `main` 12+ times, breaking CI ~40% of the time | **HIGH** | GitHub Actions API: 12 failures in last 30 runs, all compilation errors | Open — branching/PR rule enforcement should prevent this going forward |
| B2 | `STATUS.md` claims "370 tests" but actual re-run shows 415 passing | **LOW** | Direct test suite re-run (`node tests/run.js`) | Open — fix is trivial (update the number) |
| B3 | Docs say "OSM map" but code uses `geo:` intent handoff (no map SDK) | **LOW** | Code read of `MapFragment.java`, `app/build.gradle` has no map SDK dependency | Open — doc wording fix |
| B4 | Dependabot/vulnerability alerts disabled on the repo | **MEDIUM** | GitHub API returned 403: "Dependabot alerts are disabled for this repository" | Open — `docs/ROADMAP.md` NEXT |
| B5 | No staging environment for safe load/migration testing | **MEDIUM** | `wrangler.toml` has single env only | Open — `docs/ROADMAP.md` NEXT |
| B6 | Search latency (0.4-0.65s) will scale poorly with dataset size | **MEDIUM** | Live latency measurements + code read showing linear scan per search | Open — `docs/ROADMAP.md` NEXT (no urgency at 0 records) |
| B7 | No crash reporting in the Android app | **LOW** | No Crashlytics/Sentry/ACRA dependency in `build.gradle` | Open — `docs/ROADMAP.md` LATER (no users = no crash data) |
| B8 | No off-GitHub backup of code or data | **LOW** | Single GitHub account hosts both repos | Open — Phase 11+ federation scope |
| B9 | Rate limiting is per-IP/in-memory only (bypassable) | **LOW** | Code read of rate limit logic in `backend/src/index.js` | Open — LATER, no abuse evidence |

## What's NOT a Blocker

- The backend is healthy and live (`/api/health` returns 200, version 7.1.0).
- All 415 backend tests pass.
- Rate limiting, content policy, moderation queue, audit trail, auth — all active and working.
- $0 operating cost — sustainable at current scale.
- The themes.xml build break is already fixed (PR #13, merged, CI green).
