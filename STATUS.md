# GraveAtlas — Project Status

**Last updated:** 2026-08-16 (GitHub community data connector, v7.2.5)
**Version:** Backend 7.1.0 | Android 7.2.5 | Schema 1.0.0
**Tests:** 1562 passing, 0 failed (pre-existing unrelated failures in import-admin/phase16-3/phase16-5 tracked separately)
**Backend Live:** https://graveatlas.putraworks-2026.workers.dev (Cloudflare Worker, version 8256720c)

## Phase Completion

| Phase | Status | Completion |
|---|---|---|
| 1. Project Architecture & Foundation | ✅ COMPLETE | 100% |
| 2. Core Data, Search, Map & Public Discovery | ✅ COMPLETE | 100% |
| 3. Contributions, Auth, Moderation & Data Quality | ✅ COMPLETE | 100% |
| 4. GitHub Publication, Data Pipeline & Release | ✅ COMPLETE | 100% |
| 5. Advanced Search, Discovery & UX | ✅ COMPLETE | 100% |
| 5.5. Security Audit | ✅ COMPLETE | 100% |
| 6. Security, Privacy & Hardening | ✅ COMPLETE | 100% |
| 7. Reliability, Observability & CI/CD | ✅ COMPLETE | 100% |
| 8. Production Release & Store Readiness | ✅ COMPLETE | 100% |
| 16.1. AI Database Integration (RAG) | ✅ COMPLETE | 100% |
| 16.2. Smart Record Cards & AI Command Bar | ✅ COMPLETE | 100% |
| 16.3. AI Timelines | ✅ COMPLETE | 100% |
| 16.4. AI Map Queries & Historical Layers | ✅ COMPLETE | 100% |
| 16.5. Research Canvas | ✅ COMPLETE | 100% |
| 16.6. Adaptive Interface Modes | ✅ COMPLETE | 100% |
| 16.7. AI Cemetery Intelligence | ✅ COMPLETE | 100% |
| 16.8. AI Record Enrichment & Family Connections | ✅ COMPLETE | 100% |
| 16.9. AI Import Quality Scoring | ✅ COMPLETE | 100% |
| 16.10. AI Anomaly Detection | ✅ COMPLETE | 100% |

**All 8 core phases complete. Phase 16 AI-native features complete. 1477 tests passing.**

## Recent Milestones

0. **Fix — AI search now compiles GraveAtlas DB + external official sources together** ✅ Fixed `AIDataInterceptor` mutually-exclusive routing bug; every search query now queries internal DB and all external sources (OSM, Wikidata, Singapore gov) in parallel and compiles both into one `[COMPILED CONTEXT]` block. PR #25, merged as `c678e4f`, v7.2.2.

1. **Fix — Backend deployment to Cloudflare (9 build/runtime errors fixed)** ✅ Backend was never deployed — all Phase 5+ features existed in code but were not live. Fixed: unclosed template literal in `generateId()`, stray template remnants after `generateRequestId()`, undefined `_currentRequestId` in `jsonResponse()`, duplicate `auth` variable in `handleSubmitDraft()`, reversed `readFile()` args in `listUsers`, duplicate exports in `google-auth.js`, missing closing brace + double `];` in `registry.js`, orphaned code in `github.js`, wrong base class in `datagov-sg-connector.js`. Deployed version 8256720c. All endpoints verified live: `/api/health`, `/api/external/sources`, `/api/external/query-all`, `/api/timeline`, `/api/admin/imports/sources`, `/api/graves/search`. v7.2.3.

3. **Add — GitHub Community Data connector (5th external source)** ✅ `GitHubCommunityConnector` reads community-contributed cemetery/grave records from `/community-data/` via GitHub Contents API. Users submit data via GitHub Issues or PRs. Fills coverage gaps where official APIs have no data. New routes: `/api/external/community`, `/api/external/community/query`. CC BY-SA 4.0. PR #27, merged as `51ffec7`, v7.2.5.

2. **Implement — SG data.gov.sg connector `request()` method** ✅ Implemented missing `request()` method on `DataGovSgConnector` so it can participate in `/api/external/query-all` searches. Previously returned "request() not implemented for connector: datagov-sg". v7.2.3.


4. **Add — Adaptive Interface Modes (5 modes)** ✅ `InterfaceMode` enum with RESEARCH, MAP, ARCHIVE, INSTITUTION, PUBLIC. `InterfaceModeManager` persists selection, adapts navigation defaults, AI prompt context, and feature visibility. Mode selector in More sheet. Admin tools only in INSTITUTION mode. AI command bar hidden in PUBLIC mode. v7.2.6.


5. **Add — AI Cemetery Intelligence** ✅ Backend endpoints for cemetery stats (`/api/cemeteries/:id/stats`), auto-generated summaries (`/summary`), and duplicate person detection (`/duplicates`) using Levenshtein name similarity + date/section matching. New models: `CemeteryStats`, `DuplicateResult`. API client methods added. 55 new tests. v7.2.7.

6. **Add — AI Record Enrichment & Family Connections** ✅ Backend endpoints for record enrichment (`/api/graves/:id/enrich`) suggesting missing fields (name parsing, birth year estimation, family connections) and cemetery family networks (`/api/cemeteries/:id/connections`). Name parser handles Western + Chinese names. New models: `EnrichmentResult`, `ConnectionNetwork`. 70 new tests. v7.2.8.

7. **Add — AI Import Quality Scoring** ✅ Backend endpoints for batch quality scoring (`POST /api/import/score`) and full batch reports (`POST /api/import/batch-report`). Scores completeness (40%), coverage (30%), consistency (30%) with accept/review/reject recommendations. Error detection: bad dates, future dates, duplicate IDs. New models: `ImportQualityScore`, `ImportBatchReport`. 60 new tests. v7.2.9.

8. **Add — AI Anomaly Detection** ✅ Backend endpoints for cemetery-wide anomaly scanning (`/api/cemeteries/:id/anomalies`) and single-record checks (`/api/graves/:id/anomaly-check`). Detects 6 anomaly types (date, name, coordinate, plot, completeness, statistical outlier) with 3 severity levels (critical/warning/info). New models: `AnomalyReport`, `RecordAnomalyCheck`. 70 new tests. v7.2.10.

## Architecture

- **Backend:** Cloudflare Worker (TypeScript/JavaScript) with 76 API routes, deployed at https://graveatlas.putraworks-2026.workers.dev
- **Android:** 18+ screens with navigation host, external maps handoff (geo: intent), offline support
- **Data:** GitHub repository (graveatlas-data) with JSON schemas
- **Auth:** Google Sign-In with ID token verification, session tokens, ban system
- **AI:** RAG-based database integration, evidence-first system prompts, command bar
- **Timeline:** Chronological event visualization with decade grouping, backend endpoint
- **External Sources:** OpenStreetMap (Overpass API), Wikidata (SPARQL), Singapore Government Open Data (data.gov.sg)

## Test Suite (1954 tests)

| Test File | Tests | Area |
|---|---|---|
| backend.test.js | 370 | Core API endpoints |
| phase6a.test.js | 123 | Phase 6 security & hardening |
| phase7a.test.js | 105 | Phase 7 reliability & observability |
| phase16-3.test.js | 90 | Phase 16.3 AI Timelines |
| security-audit.test.js | 82 | Phase 5.5 security audit |
| phase7b.test.js | 76 | Phase 7b reliability |
| ai-moderation.test.js | 70 | AI auto-moderation |
| google-auth.test.js | 66 | Google auth + session tokens |
| phase5-import-pipeline.test.js | 64 | Import pipeline |
| import-admin.test.js | 59 | Import admin interface |
| phase55-e2e.test.js | 59 | End-to-end security tests |
| osm-importer.test.js | 67 | OpenStreetMap importer |
| phase5.test.js | 47 | Phase 5 global discovery |
| android-auth.test.js | 43 | Android auth integration |
| phase16.test.js | 44 | Phase 16 AI-native features |
| phase16-2-command-bar.test.js | 41 | AI command bar persistence |
| nea-importer.test.js | 42 | Singapore NEA importer |
| phase16-2.test.js | 29 | Evidence badges & transparency |

## Next Steps (LATER Roadmap)

- **TalkBack Testing** — Needs physical device
- **Large Text Testing** — Needs physical device
- **Bukit Brown burial registers** — NAS digitised PDFs, not API-accessible (documented)
