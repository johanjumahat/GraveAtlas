# Post-Launch Baseline (Phase 9)

**Report date:** 2026-08-11
**Methodology:** Live evidence pulled directly from GitHub API, the deployed Cloudflare Worker (`https://graveatlas.putraworks-2026.workers.dev`), the `graveatlas-data` repository, and the local test suite. No figure below is estimated or assumed — anything not directly measurable is marked NOT AVAILABLE.

## Launch Status

GraveAtlas has **not yet had a public launch**. Evidence:
- Repository `putraworks2026/GraveAtlas` was created 2026-08-09 (2 days before this report).
- 1 human contributor (`putraworks2026`, 69 commits) + CI bot (19 commits). No external contributors.
- 0 GitHub stars, 0 forks, 0 open issues.
- The app is not listed on Google Play (no store listing exists yet — see `docs/STORE-METADATA.md`).
- The `graveatlas-data` repository holds 0 published cemeteries and 0 published graves.

**Implication:** "Post-launch growth" metrics (users, traffic, retention, community size) are not yet meaningful because there is no public user base. This report treats Phase 9 as a **pre-launch readiness and quality audit** rather than an analysis of real-world usage, and reports NOT AVAILABLE wherever a metric requires real users.

## Application & Backend Versions

| Component | Version | Source |
|---|---|---|
| Backend (Cloudflare Worker) | 7.1.0 | Live `/api/health` response |
| Android app | versionName 7.1.2, versionCode 57 | `version.properties` |
| Data schema | 1.0.0 | `docs/DATA-SCHEMA.md` |

## Dataset State (graveatlas-data repo, live check)

| Metric | Value | Source |
|---|---|---|
| Published cemeteries | 0 | `GET /cemeteries` dir listing (only `.gitkeep`) |
| Published graves | 0 | `GET /graves` dir listing (only `.gitkeep`) |
| Pending submissions | 3 | `GET /pending` dir listing |
| Live search results for `q=test` | 0 | `GET /api/search?q=test` on production worker |

## Contributions & Corrections

NOT AVAILABLE — no submissions have been approved/published yet, so there is no contribution or correction history to report beyond the 3 pending submissions above.

## Moderation Backlog

3 pending submissions awaiting moderator review (evidence: `graveatlas-data/pending/`). No pending corrections could be independently verified (no public corrections endpoint returned data at time of check).

## API Usage / Errors / Crashes

NOT AVAILABLE — Cloudflare Workers request analytics require access to the Cloudflare dashboard (not available to this audit), and there is no crash-reporting pipeline instrumented in the Android app (confirmed by code search: no Crashlytics/Sentry/ACRA dependency in `app/build.gradle`).

## CI/CD Reliability (measurable)

Last 30 GitHub Actions runs (live query, 2026-08-11):

| Conclusion | Count |
|---|---|
| success | 16 |
| failure | 12 |
| cancelled | 2 |

**Finding:** ~40% of the last 30 runs failed. This is a real, measured reliability problem — see the Phase 9 final report's Product Health section for severity classification.

## Automated Test Suite (re-run for this audit, not assumed from docs)

Executed `node tests/run.js` directly:

| Suite | Passed | Failed |
|---|---|---|
| backend.test.js | 47 | 0 |
| phase5.test.js + phase5-import-pipeline.test.js + phase55-e2e.test.js | 64 | 0 |
| phase6a.test.js | 123 | 0 |
| phase7a.test.js | 105 | 0 |
| phase7b.test.js | 76 | 0 |
| **Total** | **415** | **0** |

**Discrepancy noted:** `STATUS.md` states "370 passing" — the actual re-run measured **415 passing, 0 failed**. STATUS.md is out of date and should be corrected (tracked as a LOW finding in the Phase 9 final report).

## Search Activity

NOT AVAILABLE — no analytics/logging pipeline captures search queries or zero-result rates in production.
