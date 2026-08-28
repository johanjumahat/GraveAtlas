# GraveAtlas — Project Status

**Current Version:** 7.2.42 (build 174)
**Last Updated:** 2026-08-19
**Status:** Active — all PRs merged, CI green

## Recent Changes (v7.2.42)

### UI Fixes (PR #50 — merged)
- Removed duplicate AI input box from home screen
- Added research topic dropdown (All topics / categories)
- Fixed text visibility (TextInputEditText → EditText)
- Fixed WrongViewCast lint error

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
| 16.11. AI Cemetery Health Dashboard | ✅ COMPLETE | 100% |
| 16.12. AI Smart Recommendations | ✅ COMPLETE | 100% |
| 16.13. AI Data Quality Auto-Fix | ✅ COMPLETE | 100% |
| 16.14. AI Batch Operations | ✅ COMPLETE | 100% |
| 16.15. AI Export & Reporting | ✅ COMPLETE | 100% |
| 16.16. AI Watchlist & Monitoring | ✅ COMPLETE | 100% |
| 16.17. AI Merge Resolution | ✅ COMPLETE | 100% |
| 16.18. AI Source Verification | ✅ COMPLETE | 100% |
| 16.19. AI Confidence Scoring | ✅ COMPLETE | 100% |
| 16.20. AI Data Provenance Chain | ✅ COMPLETE | 100% |
| 16.21. AI Data Export & Archival | ✅ COMPLETE | 100% |
| 16.22. AI Collaborative Curation | ✅ COMPLETE | 100% |
| 16.23. AI Notification & Alert System | ✅ COMPLETE | 100% |
| 16.24. AI Search Intelligence | ✅ COMPLETE | 100% |
| 16.25. AI Data Governance & Compliance | ✅ COMPLETE | 100% |
| 16.26. AI Analytics & Insights Dashboard | ✅ COMPLETE | 100% |
| 16.27. AI Predictive Insights & Trend Forecasting | ✅ COMPLETE | 100% |
| 16.28. AI Natural Language Query Engine | ✅ COMPLETE | 100% |
| 16.29. AI Smart Summaries & Auto-Documentation | ✅ COMPLETE | 100% |
| 16.30. AI Cross-Reference & Linkage Engine | ✅ COMPLETE | 100% |
| 16.31. AI Data Enrichment & Auto-Completion Engine | ✅ COMPLETE | 100% |
| 16.32. AI Deduplication Intelligence & Conflict Resolution | ✅ COMPLETE | 100% |
| 18. Multi-Country Open Data Connectors | ✅ COMPLETE | 100% |
| 19. Community Engagement & Memorial Features | ✅ COMPLETE | 100% |

### Earlier (v7.2.41)
- R8 minification enabled (APK ~7.9MB, down from larger)
- SDK 35 / AGP 8.6.1 upgrade
- Sequential AI provider fallback logic
- AI response formatting tightened (no search dumps)

## CI Status
- All builds passing on main
- Latest successful build: #178

## Known Issues
- None currently open

### Known Issues
- None

1. **Fix — Backend deployment to Cloudflare (9 build/runtime errors fixed)** ✅ Backend was never deployed — all Phase 5+ features existed in code but were not live. Fixed: unclosed template literal in `generateId()`, stray template remnants after `generateRequestId()`, undefined `_currentRequestId` in `jsonResponse()`, duplicate `auth` variable in `handleSubmitDraft()`, reversed `readFile()` args in `listUsers`, duplicate exports in `google-auth.js`, missing closing brace + double `];` in `registry.js`, orphaned code in `github.js`, wrong base class in `datagov-sg-connector.js`. Deployed version 8256720c. All endpoints verified live: `/api/health`, `/api/external/sources`, `/api/external/query-all`, `/api/timeline`, `/api/admin/imports/sources`, `/api/graves/search`. v7.2.3.

3. **Add — GitHub Community Data connector (5th external source)** ✅ `GitHubCommunityConnector` reads community-contributed cemetery/grave records from `/community-data/` via GitHub Contents API. Users submit data via GitHub Issues or PRs. Fills coverage gaps where official APIs have no data. New routes: `/api/external/community`, `/api/external/community/query`. CC BY-SA 4.0. PR #27, merged as `51ffec7`, v7.2.5.

2. **Implement — SG data.gov.sg connector `request()` method** ✅ Implemented missing `request()` method on `DataGovSgConnector` so it can participate in `/api/external/query-all` searches. Previously returned "request() not implemented for connector: datagov-sg". v7.2.3.


4. **Add — Adaptive Interface Modes (5 modes)** ✅ `InterfaceMode` enum with RESEARCH, MAP, ARCHIVE, INSTITUTION, PUBLIC. `InterfaceModeManager` persists selection, adapts navigation defaults, AI prompt context, and feature visibility. Mode selector in More sheet. Admin tools only in INSTITUTION mode. AI command bar hidden in PUBLIC mode. v7.2.6.


5. **Add — AI Cemetery Intelligence** ✅ Backend endpoints for cemetery stats (`/api/cemeteries/:id/stats`), auto-generated summaries (`/summary`), and duplicate person detection (`/duplicates`) using Levenshtein name similarity + date/section matching. New models: `CemeteryStats`, `DuplicateResult`. API client methods added. 55 new tests. v7.2.7.

6. **Add — AI Record Enrichment & Family Connections** ✅ Backend endpoints for record enrichment (`/api/graves/:id/enrich`) suggesting missing fields (name parsing, birth year estimation, family connections) and cemetery family networks (`/api/cemeteries/:id/connections`). Name parser handles Western + Chinese names. New models: `EnrichmentResult`, `ConnectionNetwork`. 70 new tests. v7.2.8.

7. **Add — AI Import Quality Scoring** ✅ Backend endpoints for batch quality scoring (`POST /api/import/score`) and full batch reports (`POST /api/import/batch-report`). Scores completeness (40%), coverage (30%), consistency (30%) with accept/review/reject recommendations. Error detection: bad dates, future dates, duplicate IDs. New models: `ImportQualityScore`, `ImportBatchReport`. 60 new tests. v7.2.9.

8. **Add — AI Anomaly Detection** ✅ Backend endpoints for cemetery-wide anomaly scanning (`/api/cemeteries/:id/anomalies`) and single-record checks (`/api/graves/:id/anomaly-check`). Detects 6 anomaly types (date, name, coordinate, plot, completeness, statistical outlier) with 3 severity levels (critical/warning/info). New models: `AnomalyReport`, `RecordAnomalyCheck`. 70 new tests. v7.2.10.

9. **Add — AI Cemetery Health Dashboard** ✅ Composite health score endpoint (`/api/cemeteries/:id/health`) aggregating data quality (30%), anomaly-free rate (25%), enrichment coverage (15%), duplicate-free rate (15%), and content coverage (15%) into a letter grade A–F. Global overview endpoint (`/api/health/overview`) for all cemeteries. New models: `CemeteryHealth`, `GlobalHealthOverview`. 80 new tests. v7.2.11.

10. **Add — AI Smart Recommendations** ✅ Prioritized actionable recommendations endpoint (`/api/cemeteries/:id/recommendations`) analyzing 6 categories (data quality, anomalies, enrichment, duplicates, content, connections) with 4 priority levels. Global recommendations endpoint (`/api/recommendations/global`) across all cemeteries. Each recommendation includes affected record count, estimated effort, and action endpoint. New models: `CemeteryRecommendations`, `GlobalRecommendations`. 90 new tests. v7.2.12.

11. **Add — AI Data Quality Auto-Fix** ✅ Automated fix proposal and application system with 4 endpoints: cemetery preview (`/autofix/preview`), cemetery apply (`/autofix`), record proposals (`/autofix`), and record apply (`/autofix/apply`). 6 fix types (add, normalize, estimate, swap, trim, swap_dates) with confidence levels (high=auto-apply, medium=flag for review). Helper functions for name parsing, date normalization, birth year estimation, and name case fixing. Dry run support and fix type filtering. New models: `AutoFixProposal`, `CemeteryAutoFixPreview`, `CemeteryAutoFixResult`, `RecordAutoFixResult`. 100+ new tests. v7.2.13.

12. **Add — AI Batch Operations** ✅ Full cleanup pass pipeline (scan → score → fix → re-score) with 3 endpoints: cemetery preview (`/cleanup/preview`), cemetery apply (`/cleanup`), and global preview (`/cleanup/global`). Before/after health comparison with improvement metrics (score delta, grade change, anomaly reduction, content gain). `computeQuickHealth()` helper for in-memory scoring. Top 10 cemeteries by fix count in global view. New models: `HealthSnapshot`, `CleanupResult`, `GlobalCleanupResult`. 90+ new tests. v7.2.14.

13. **Add — AI Export & Reporting** ✅ Comprehensive quality reports with 3 endpoints: full cemetery report (`/report`), lightweight summary (`/report/summary`), and global report (`/reports/global`). Each report includes health grade, content coverage, anomaly summary, recommendations, cleanup preview, and CC-BY-SA 4.0 licensed metadata. New helper functions for in-memory stats/anomaly/recommendation computation. New models: `CemeteryReport` (9 inner classes), `CemeteryReportSummary`, `GlobalReport` (3 inner classes). 90+ new tests. v7.2.15.

14. **Add — AI Watchlist & Monitoring** ✅ Ongoing quality monitoring with 5 endpoints: list (`/watchlist`), add (`/watchlist` POST), remove (`/watchlist/:id` DELETE), check (`/watchlist/check`), and status (`/watchlist/status`). 5 watch types (health degradation, new anomalies, unapplied fixes, duplicate detected, missing data) with severity-based alerts (critical/high/medium/low). Persists watch state per item (lastChecked, lastStatus). 24-hour needsCheck threshold. New models: `WatchlistItem`, `WatchAlert`, `WatchlistCheckResult`, `WatchlistStatus`. 90+ new tests. v7.2.16.

15. **Add — AI Merge Resolution** ✅ Intelligent duplicate record merging with 4 endpoints: merge preview (`/merge/preview`), merge apply (`/merge/apply`), merge suggestions (`/merge/suggestions`), and merge history (`/merge/history`). Field-by-field comparison with confidence levels, heuristics (verified preference, completeness, precision, array merge), match scoring (name 50pts, death date 30pts, birth date 20pts, plot 15pts), and full provenance tracking (mergeHistory with mergedFromId, mergedAt, mergedBy, fieldsApplied/skipped, similarityScore). Source records preserved with status "merged" and mergedIntoId. New models: `MergeProposal`, `MergeResult`, `MergeSuggestion`, `MergeHistory`. 90+ new tests. v7.2.17.

16. **Add — AI Source Verification** ✅ Automated source reference checking with 4 endpoints: record-level verify (`/sources/verify`), cemetery-wide verify, batch verify (up to 50 records), and global status. Checks URL liveness via HEAD request (10s timeout), detects live/dead/restricted/unreachable/timeout, queries Wayback Machine for archived copies, computes verification score (0-100%). Per-source confidence levels, archive URL tracking, overall status (verified/partial/critical/unverified). New models: `SourceVerification`, `RecordSourceVerification`, `CemeterySourceVerification`, `SourceVerificationStatus`. 90+ new tests. v7.2.18.

17. **Add — AI Confidence Scoring** ✅ Comprehensive per-record confidence score combining 7 weighted signals (completeness 30%, verification 20%, source quality 20%, anomaly-free 15%, merge history 5%, community 5%, geo precision 5%) into a single 0-100 score with tier classification (platinum >=90, gold >=75, silver >=60, bronze >=40) and transparent breakdown. 4 endpoints: record confidence, cemetery confidence with tier distribution, batch (50 records), and global leaderboard with tier filter. New models: `ConfidenceScore`, `CemeteryConfidence`, `ConfidenceLeaderboard`. 100+ new tests. v7.2.19.

18. **Add — AI Data Provenance Chain** ✅ Complete lineage tracking for every record with 5 endpoints: record provenance chain (`/provenance`), manual entry addition (`/provenance/add`), cross-record search (`/provenance/search`), global timeline (`/provenance/timeline`), and CSV-ready export (`/provenance/export`). Traces 9 action types (created, moderated, verified, corrected, enriched, merged, fixed, source_verified, updated) across 7 actor roles (submitter, moderator, verifier, community, AI, archivist, system). Each entry: timestamp, action, actor, actorRole, description, fields, old/new values, source refs. Chain metadata: total entries, unique actors, first/last entry, span. Monthly timeline summary with action breakdown. New models: `ProvenanceChain`, `ProvenanceSearch`, `ProvenanceTimeline`. 110+ new tests. v7.2.20.

19. **Add — AI Data Export & Archival** ✅ Comprehensive export system with 5 endpoints and 3 formats: JSON CSV-ready dataset (with optional provenance/confidence/sources, up to 50K records, CC-BY-SA 4.0), GeoJSON FeatureCollection (RFC 7946, WGS84, for mapping apps), JSON-LD 1.1 (schema.org context with confidence + provenance, for semantic web). Export manifest with record stats, cemetery list, date range, format list. Batch export (up to 10 at once). New models: `DatasetExport`, `GeoJSONExport`, `JSONLDExport`, `ExportManifest`. 100+ new tests. v7.2.21.

20. **Add — AI Collaborative Curation** ✅ Multi-archivist collaboration system with 10 endpoints: task creation/list/detail/assign/complete/review (8 task types, 4 priorities, 7 statuses), review queue (submitted first, then pending by priority), record locking (exclusive edit with 30min default expiry, 409 conflict, 403 forbidden), and curation stats (by status/type/priority, active locks). Full task lifecycle: pending → assigned → submitted → completed (or rejected back to pending). History tracking for every action. New models: `CurationTask`, `CurationQueue`, `RecordLock`, `CurationStats`. 130+ new tests. v7.2.22.

21. **Add — AI Notification & Alert System** ✅ Intelligent notification and alert system with 12 endpoints: notification CRUD (14 types, 3 severities), unread tracking (sorted by severity), mark read/dismiss, alert rules (7 conditions with configurable thresholds), alert checking (evaluates all rules against live data, fires notifications with 1-hour dedup), and alert digest (period summary with by type/severity). Notification lifecycle: create → read → dismiss. Alert lifecycle: create → check → fire → track. New models: `Notification`, `AlertRule`, `AlertDigest`. 130+ new tests. v7.2.23.

22. **Add — AI Search Intelligence** ✅ Semantic search with 5 endpoints: natural language search (parses names, dates, places, status, confidence, anomalies, sources, coordinates, intent), autocomplete suggestions (typed: filter/date/place/name/count/intent), search history (with clear), and related record search (same cemetery/section/family/dates/sources with relation scoring). Relevance scoring: name +30, date +25, place +25, status +15/-10, confidence +20/-15, anomalies +15/-20, sources/coordinates +10-15. Intent detection: search/count/fix/export. New models: `IntelligentSearchResult`, `SearchSuggestion`, `RelatedRecord`. 90+ new tests. v7.2.24.

23. **Add — AI Data Governance & Compliance** ✅ Full governance layer with 14 endpoints: policy management (6 types: retention/privacy/access/classification/consent/deletion), data classification (4 levels: public/internal/restricted/confidential), audit logging (12 action types, filterable), retention enforcement, consent tracking (4 statuses: granted/withdrawn/pending/not_required), Right To Be Forgotten (GDPR Art. 17 — anonymize/delete), personal data export (GDPR Art. 20), and compliance check (evaluates all policies, returns score 0-100 with severity-tagged issues). New models: `GovernancePolicy`, `DataClassification`, `ComplianceReport`. 120+ new tests. v7.2.25.

24. **Add — AI Analytics & Insights Dashboard** ✅ Ten analytics endpoints: comprehensive dashboard (record counts, verification rates, confidence distribution, source coverage, cemetery breakdown, health score), time-series trends (day/week/month intervals), per-cemetery health scores with weighted scoring (confidence 30%, verification 25%, sources 20%, coordinates 15%, anomaly rate 10%) and letter grades A-F, anomaly distribution by type/severity/cemetery, confidence histogram (5 buckets), source reliability metrics (coverage, top domains, ref count distribution), curation velocity (daily activity, task counts), search analytics (top queries, intent distribution), compliance trends (audit activity, RTBF, consent stats), and stakeholder report (executive summary, data quality, anomaly summary, prioritized recommendations, cemetery breakdown). New models: `AnalyticsDashboard`, `StakeholderReport`, `CemeteryHealth`. 130+ new tests. v7.2.26.

25. **Add — AI Predictive Insights & Trend Forecasting** ✅ Five predictive endpoints: health score forecast (linear regression on historical health buckets, trend direction with confidence levels, time-to-threshold prediction), anomaly emergence forecast (per-type frequency analysis, trend detection, severity breakdowns, risk scoring), curation workload forecast (backlog metrics, estimated days to clear, workload level classification, per-field trends for new records/updates/reviews/enrichments/anomalies), data growth forecast (record/cemetery/storage projections, growth rate per day, growth trend detection, milestone predictions with estimated dates), and comprehensive risk assessment (6 risk types: low_verification, high_anomaly_rate, missing_sources, low_confidence, missing_coordinates, stale_data, with per-cemetery severity, impact, and mitigation strategies, priority actions with cemetery lists). New models: `HealthForecast`, `AnomalyForecast`, `CurationForecast`, `DataGrowthForecast`, `RiskAssessment`. 100+ new tests. v7.2.31.

26. **Add — AI Natural Language Query Engine** ✅ Five endpoints for plain-English querying: natural language query (8 intents: search/count/analyze/health/predict/risk/export/fix, extracts cemetery names/relative dates/year ranges/name filters/confidence thresholds/verification status/anomaly+source+coordinate flags/sort order/limits/aggregations, returns NL answer + structured results), query suggestions (cemetery-specific, time-based, quality, analysis suggestions based on available data), query explain (human-readable breakdown of parsed parameters without execution), query history (KV-backed recent query log), and query feedback (helpful/not helpful rating with comments, last 100 entries). New models: `NaturalLanguageQueryResult` (5 inner classes), `QueryExplanation`, `QuerySuggestions`. 100+ new tests. v7.2.32.

27. **Add — AI Smart Summaries & Auto-Documentation** ✅ Five endpoints for auto-generated documentation: cemetery summary (overview paragraph, statistics, confidence tier distribution, notable records, quality issues, recommendations), record summary (overview, provenance summary, related records, metadata), dataset summary (overview, date range, cemetery breakdown, top cemeteries, quality assessment, recommendations), health report (weighted health score, letter grade A-F, metric breakdown, assessment, recommended actions), and custom summary (type: cemetery/dataset/record, format: paragraph/bullets/json). New models: `CemeterySummary` (3 inner), `DatasetSummary` (2 inner), `HealthReportSummary`. API client: 4 new methods. v7.2.33.

28. **Add — AI Cross-Reference & Linkage Engine** ✅ Five endpoints for detecting connections between records: family linkage (surname matching, date/plot/GPS proximity, given name similarity, relationship classification), cross-cemetery linkage (name similarity >=80%, same birth/death year, possible same person or family), proximity search (haversine distance, configurable radius), event clustering (death-year grouping, spike detection, epidemic/war/disaster identification), and linkage graph (5 edge types: family/same_cemetery/same_year/proximity/shared_source with strength scores, graph stats for visualization). New models: `FamilyLinkageResult` (3 inner), `LinkageGraph` (4 inner), `EventClusteringResult` (2 inner). v7.2.34.

29. **Add — AI Data Enrichment & Auto-Completion Engine** ✅ Five endpoints for auto-completing missing record fields: per-record suggestions (birth/death year inference, cemetery from GPS, confidence score computation, verification status, section from plot pattern), batch enrichment (up to 100 records), gap analysis (missing field statistics by cemetery), single-field inference with reasoning, and enrichment priorities (records ranked by missing fields + impact score with critical field weighting). New models: `EnrichmentSuggestion`, `EnrichmentSuggestionsResult`, `EnrichmentGapsResult`. v7.2.35.

30. **Add — AI Deduplication Intelligence & Conflict Resolution Engine** ✅ Five endpoints for detecting and resolving duplicate records: scan (Levenshtein name similarity, date/cemetery/plot/GPS matching, match score 0-100, conflict detection, auto-merge vs review recommendations), per-record duplicate pairs, resolve (merge with auto field resolution by confidence, source/photo ref merging, merge history, or mark not-duplicate), conflicts listing (unresolved field conflicts sorted by count), and stats (potential pairs, high confidence, auto-mergeable, conflicts, dedup rate). New models: `DedupScanResult` (3 inner), `DedupStatsResult`. v7.2.46.

31. **Add — Multi-Country Open Data Connectors** ✅ Three new international connectors: CWGC (Commonwealth War Graves Commission — 1.7M+ war dead, 150+ countries, search by name), Find a Grave (200M+ memorials worldwide, HTML search parsing), UK Deceased Online (200+ UK cemeteries/crematoria, free preview data). Registry updated: CWGC and Wikidata marked implemented, Find a Grave moved from rejected to implemented (display-only). Four new endpoints: countries listing, cross-source search, coverage map, and per-source details. New model: `SourceCoverageResult` (2 inner). v7.2.47.

32. **Add — Kubur SG Connector** ✅ Singapore Muslim/Malay community burial records connector. "Kubur" (Malay for "grave") serves the Muslim community's need to locate ancestral burial sites not covered by NEA's official datasets. 6 known SG Muslim cemeteries with coordinates (Pusara Aman, Pusara Abadi, CCK Muslim, LCK Muslim, Bidadari closed, Jalan Kubor heritage). 5 data sources: community GitHub records (CC-BY-SA 4.0), NEA CCK portal, MUIS listings, Pusara Aman/Abadi committees. Two new endpoints: cemeteries listing and sources listing. v7.2.48.

33. **Add — Community Engagement & Memorial Features** ✅ The social layer: tributes (virtual candles, messages, flowers, photo-memories) on grave/cemetery records with anonymous option, rate limiting (10/hour), like system, delete (owner/admin). Community activity feed (recent tributes, paginated). Community statistics (total tributes, candles, messages, flowers). Contributor leaderboard (top contributors by tribute count). 7 new endpoints, 2 new models (Tribute, CommunityFeedItem), 7 API client methods, 4 new suggested prompts. v7.2.49.

34. **Add — AI Headstone Image Intelligence** ✅ The killer feature: photograph a headstone, AI extracts structured data. Full analysis pipeline: photo → OCR text → inscription parsing (date ranges, Born/Died patterns, full dates with month names) → name extraction (In Memory Of, Sacred To The Memory Of, first-line heuristics) → given/family name splitting → epitaph extraction (quoted text, "Beloved" patterns) → symbol detection (cross, crescent, star of david, lotus, angel, anchor, dove, broken column, weeping willow, skull, flame) → language/script detection (Chinese, Japanese, Arabic, Hebrew, Hindi, Thai, Tamil, Malay, English) → confidence scoring (0.0-1.0) → suggested record with warnings → user confirmation → published grave record. 5 new endpoints, 1 new model (HeadstoneAnalysis with ParsedData + GraveRecord inner classes), 5 API client methods, 3 new suggested prompts. v7.2.50.

35. **Add — AI Photo Quality Assessment & Enhancement** ✅ Photo quality scoring system for cemetery/headstone photos. Evaluates 6 dimensions (resolution, brightness, contrast, sharpness, noise, GPS), scores 0-100 with letter grade (A-F), predicts OCR readiness (high/medium/low), identifies issues with severity levels, and generates actionable enhancement recommendations (brightness, contrast, sharpness, denoise, upscale, crop, straighten) with specific tools (Snapseed, Lightroom, Remini, Upscayl). Batch assessment for up to 20 photos. 4 new endpoints, 1 new model (PhotoAssessment with Issue + EnhancementSuggestion inner classes), 4 API client methods, 3 new suggested prompts. v7.2.51.

36. **Add — Kubur Search Connector (kubursearch.com)** ✅ New connector integrating with kubursearch.com — Singapore's largest Muslim grave search platform (80,000+ records). Deep-link integration since no public API. 5 endpoints (info, cemeteries, sources, search, coverage), 1 new model (KuburSearchResult), 5 API client methods, 2 new suggested prompts. v7.2.53.

## Architecture

- **Backend:** Cloudflare Worker (TypeScript/JavaScript) with 227 API routes, deployed at https://graveatlas.putraworks-2026.workers.dev
- **Android:** 18+ screens with navigation host, external maps handoff (geo: intent), offline support
- **Data:** GitHub repository (graveatlas-data) with JSON schemas
- **Auth:** Google Sign-In with ID token verification, session tokens, ban system
- **AI:** RAG-based database integration, evidence-first system prompts, command bar
- **Timeline:** Chronological event visualization with decade grouping, backend endpoint
- **External Sources:** OpenStreetMap (Overpass API), Wikidata (SPARQL), Singapore Government Open Data (data.gov.sg)

## Test Suite (4080 tests)

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
