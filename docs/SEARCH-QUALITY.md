# Search Quality Review (Phase 9)

## What Was Tested

Live production endpoint tests against `https://graveatlas.putraworks-2026.workers.dev` on 2026-08-11, plus a code read of `handleSearch()` in `backend/src/index.js`.

| Test | Result | Evidence |
|---|---|---|
| Query below minimum length (`q=a`) | Correctly rejected with a helpful message, `200` (not an error) | Live response: `"Search query must be at least 2 characters"` |
| Valid query, empty dataset (`q=ab`) | Returns `count: 0`, well-formed pagination envelope | Live response |
| Search latency (3 runs, `q=test`) | 0.41s – 0.63s | Measured with `curl -w "%{time_total}"` |
| Zero-result handling | Returns `success: true` with empty array, not an error | Live response — good UX pattern, avoids error-like empty states |

## Findings

**MEDIUM — Search latency is high for an empty dataset.** 0.4–0.65s to search zero records indicates the per-request cost is dominated by live GitHub API calls (`listFiles()`) rather than data volume. This will not improve as the dataset grows — it will get worse, since `handleSearch()` lists and scans files per-request rather than querying a pre-built index for search. There is an existing 5-minute in-memory response cache (`responseCache`, confirmed in code) but it is not evidently applied to the search path itself — only to selected endpoints like `countries`.

- **Impact:** Once real records exist, search latency will grow with dataset size because there is no search index — every search re-lists and re-scans files.
- **Evidence:** Code read of `handleSearch()` shows a `listFiles()` + linear scan pattern per search type (cemetery/person/etc.), not a cached/indexed lookup.
- **Remediation (NEXT, not built this phase):** Apply the existing `responseCache` pattern to search results, or build a lightweight search index (e.g., a single `index/search-index.json` file, already partially present per the `index/` directory seen in `graveatlas-data`) that's rebuilt on publish rather than scanned live.
- **Status:** Open — documented in `docs/ROADMAP.md`, not implemented in Phase 9 (no evidence of user-facing pain yet since there is no real traffic).

## Zero-Result / Failed Search Tracking

NOT AVAILABLE — no logging captures zero-result search queries in production. This is needed before any ranking or matching improvements can be evidence-based (per Phase 9 rule: "Do not alter authoritative history just for ranking" and "fix through evidence, testing and measurement").

## No Changes Made to Ranking or Matching

Per Phase 9 rules, no search ranking/matching changes were made without evidence. The `index/` directory already present in `graveatlas-data` (seen in the live repo listing) suggests indexing infrastructure exists from an earlier phase — its content was not modified.
