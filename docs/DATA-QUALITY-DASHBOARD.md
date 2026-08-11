# Data Quality Dashboard (Phase 9)

## Current State (measured)

The `graveatlas-data` repository currently holds **0 published cemeteries and 0 published graves** (verified live via GitHub API on 2026-08-11). There are **3 pending submissions** in `graveatlas-data/pending/`.

Because there is no published dataset yet, the following cannot be measured and are marked NOT AVAILABLE:
- Duplicate record rate
- Invalid coordinate rate
- Missing-source rate
- Suspicious/impossible date rate
- Field-completeness rate

**Absence of data does not prove nonexistence of quality issues** — it means the quality-check tooling (`scripts/data-quality-check.js`, `scripts/check-duplicates.js`, `scripts/validate-grave.js`, all present and reused from Phase 3/5) has not yet had real submitted data to run against at scale.

## Existing Quality Tooling (reused, not rebuilt)

Confirmed present in the repo and unchanged by Phase 9:
- `scripts/data-quality-check.js` — deterministic ERROR/WARNING checks (see `docs/DATA-QUALITY.md` for the full rule table: missing_id, missing_name, invalid_lat/lon, impossible_date, invalid_country_code, malformed_url, invalid_json).
- `scripts/check-duplicates.js` — duplicate candidate detection.
- `scripts/validate-grave.js` — schema validation for individual submissions.
- CI workflow `Data Validation` (confirmed active via GitHub Actions API) — runs on every push/PR touching data.

## Dashboard Design (structure only — not populated with fabricated numbers)

Once records exist, the admin dashboard (`GET /api/admin/dashboard`, already implemented per `docs/MODERATION.md`) should surface:

| Panel | Data source | Status |
|---|---|---|
| Pending submissions count | `graveatlas-data/pending/` | Live (currently 3) |
| Pending corrections count | corrections queue | Implemented, currently empty |
| Published record counts | `graveatlas-data/{cemeteries,graves}/` | Live (currently 0/0) |
| Quality check failures (last run) | `scripts/data-quality-check.js` output | Implemented, run in CI |
| Duplicate candidates | `scripts/check-duplicates.js` output | Implemented, run in CI |
| Audit event count | audit log | Implemented per `docs/AUDIT-TRAIL.md` |

No new dashboard code was required for Phase 9 — the admin dashboard already aggregates these existing queues (verified by reading `backend/src/index.js` route for `/api/admin/dashboard`).

## Gaps

- No historical trend view (e.g., quality-failure rate over time) exists yet — cannot be built without production data; tracked in `docs/ROADMAP.md` under LATER.
