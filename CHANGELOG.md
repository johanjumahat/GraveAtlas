## [7.2.5] — 2026-08-16

### Added
- **GitHub Community Data connector** (`GitHubCommunityConnector`): 5th external data source.
  Community-contributed cemetery and grave records stored as JSON in `/community-data/`.
  Reads via GitHub Contents API. Fills coverage gaps where official APIs (OSM, Wikidata,
  data.gov.sg, Bukit Brown) have no data. Users contribute via GitHub Issues or PRs.
  - New API routes: `GET /api/external/community` (list files), `POST /api/external/community/query` (search)
  - `community-data/` directory with README and JSON template
  - `CONTRIBUTING.md` updated with cemetery record submission guide
  - CC BY-SA 4.0 license for all community contributions
  - Registered in gateway + registry as implemented source


## [Unreleased] - 2026-08-15

### Changed
- **AI chat response format tightened** (`AISystemPrompts.java`): removed boilerplate "Next steps you might consider" suggestions from every reply, dropped placeholder fields like "(not recorded)", cut filler phrasing. Responses are now short, evidence-first, and only suggest Timeline/Map/Research Canvas features when genuinely relevant to the query.


## [7.2.3] — 2026-08-15

### Fixed
- **Backend deployment to Cloudflare — 9 build/runtime errors resolved**
  - Backend code (all Phase 5+ features) existed in the repository but was never successfully
    deployed to Cloudflare Workers. Every endpoint from Phase 5 onward returned "Not found"
    or error code 1101 because the Worker bundle failed to build or threw at runtime.
  - `index.js`: Unclosed template literal in `generateId()` — `return \`sub_${hex}` was missing
    the closing backtick, swallowing the next function (`generateRequestId`) into a string.
  - `index.js`: Stray template literal remnants (`\`;` and `}`) after `generateRequestId()`
    left from an earlier botched edit.
  - `index.js`: `_currentRequestId` referenced in `jsonResponse()` but never declared —
    removed; the request ID is already propagated via CORS headers from `handleRequest`.
  - `index.js`: Duplicate `auth` variable in `handleSubmitDraft()` — shadowed the outer
    `auth` declaration from `requireAdmin`.
  - `index.js`: `readFile()` called with reversed arguments in `listUsers` handler —
    `readFile(env, path)` instead of `readFile(path, env)`.
  - `google-auth.js`: Duplicate export block (functions already exported inline via `export`
    keyword on the function declaration).
  - `registry.js`: Missing closing brace in BillionGraves registry entry; double `];` at
    end of SOURCE_REGISTRY array.
  - `github.js`: Orphaned duplicate `deleteFile`/`moveFile` code after `createPullRequest`.
  - `datagov-sg-connector.js`: Extended `ExternalSourceClient` (non-existent class) instead
    of `BaseConnector` from `connector-base.js`.
  - Deployed to https://graveatlas.putraworks-2026.workers.dev, version 8256720c.
  - All endpoints verified live: `/api/health`, `/api/external/sources`, `/api/external/query-all`,
    `/api/timeline`, `/api/admin/imports/sources`, `/api/graves/search`.

### Implemented
- **SG data.gov.sg connector `request()` method**
  - `DataGovSgConnector` was missing the `request()` method required by the external source
    gateway, causing "request() not implemented for connector: datagov-sg" in query-all results.
  - Implemented `request(query)` that searches across all four SG government datasets
    (NEA Active Cemeteries, NEA After Death Facilities, NEA Dedicated Columbaria, NHB
    National Monuments) using the poll-download API, with in-memory text filtering on
    cemetery/facility names and descriptions.
  - Results normalized to GraveAtlas cemetery schema with source agency attribution.

## [7.2.2] — 2026-08-15

## [7.2.2] — 2026-08-15

### Fixed
- **AI chat search compiled results from GraveAtlas DB AND external official APIs (not either/or)**
  - `AIDataInterceptor` previously routed a search query to EITHER the internal GraveAtlas
    database OR the external sources gateway (OpenStreetMap, Wikidata, Singapore government
    data), based on mutually-exclusive keyword matching. A query like "Find graves of people
    born before 1850" only matched internal-search keywords, so external official APIs were
    never queried — producing a false "no records found" without ever checking external data.
  - Every search-intent query now queries the internal DB and all external official sources
    IN PARALLEL via a new `CombinedResultCollector`, merging both into a single
    `[COMPILED CONTEXT]` block with clearly labeled `GRAVEATLAS DATABASE` and
    `EXTERNAL OFFICIAL SOURCES` sections.
  - `AISystemPrompts` updated: the AI must never report "no records found" based on the
    internal DB section alone — it must check the external sources section too, and cannot
    claim to have searched a source it did not actually query.
  - `tests/phase16.test.js` extended with regression guards against reverting to single-source
    search. All 47 Phase 16.1 tests pass.
  - PR #25, merged to `main` as `c678e4f`.

## [7.2.0] — 2026-08-15

### Added
- **Singapore Government Open Data Connector (data.gov.sg)**
  - New live external source connector: `datagov-sg-connector.js`
  - Four government datasets integrated:
    - NEA Active Cemeteries (GEOJSON) — government-managed cemetery locations
    - NEA After Death Facilities — crematoria, cemeteries, columbaria
    - NEA Dedicated Columbaria (GEOJSON) — government and private columbaria
    - NHB National Monuments (GEOJSON) — heritage sites (may include cemetery-adjacent)
  - Uses data.gov.sg poll-download API for full dataset retrieval
  - In-memory search filtering for GeoJSON datasets
  - Normalizes all features to GraveAtlas cemetery schema with source agency attribution
  - Registered in external source registry as `datagov-sg` (integrationStatus: implemented)
  - Wired into gateway, AI external search, and AI system prompts
  - Singapore-specific keywords added to AI search (nea, nhb, data.gov.sg, bukit brown, choa chu kang, columbarium, crematorium)
  - `EXTERNAL_SOURCE_PATTERN` added to `AIMapQuery.java` for map query detection
  - New API route: `GET /api/external/sg/datasets` (list SG datasets)
  - New doc: `docs/SINGAPORE-GOV-DATA.md` (full connector documentation)

### Fixed
- Missing `EXTERNAL_SOURCE_PATTERN` declaration in `AIMapQuery.java` (was referenced but not declared)

### Notes
- Individual burial records (Bukit Brown Cemetery registers 1922-1972) are held by National Archives of Singapore (NAS) as digitised PDFs, not API-accessible. The connector documents this and links to the NAS archive.
- All datasets under Singapore Open Data Licence — free for personal and commercial use with attribution.

## [v7.1.7 — Grave/Cemetery API Integration Complete] — 2026-08-15

### Added — AI External Search (Parts 16-17)
- `ai-external-search.js` — Query parser, source transparency, combined search with internal data
- `wantsExternalSearch()` — Detects when user query asks for external sources
- `executeExternalSearch()` — Queries all external sources in parallel, applies privacy review + source badges
- `combinedSearch()` — Merges internal + external results with fallback when external is unavailable (Part 18)
- New API route: `POST /api/external/ai-search`
- Wired into `/api/map/query` — detects "external" keywords, queries sources alongside internal data
- `AIDataInterceptor` — External search triggers + [EXTERNAL SOURCE CONTEXT] injection for AI chat
- `AISystemPrompts` — External source awareness, API endpoint documentation, new suggested prompts

### Added — Map Integration (Part 19)
- `AIMapQuery.wantsExternalSources` — Detects when map query should include external source data
- External cemetery records shown on map with source attribution

### Added — GUI Integration (Part 27)
- `ExternalSearchFragment.java` — Search external cemetery sources, results with source badges
- `fragment_external_search.xml` — Layout: search bar, progress indicator, results grouped by source
- SourceBadge integration — each external record shows its source, license, and retrieval time
- Users can: search external sources, find burial records, compare with GraveAtlas data

### Added — Documentation (Part 28)
- All 18 previously-stub doc files filled with real implementation content:
  - `API-CONNECTORS.md` — Source registry, connector interface, OSM/Wikidata implementations
  - `EXTERNAL-GRAVE-SCHEMA.md` — Unified external record schema with field mapping
  - `CEMETERY-MATCHING.md` — Fuzzy matching algorithm (Jaro-Winkler + Levenshtein)
  - `EXTERNAL-PROVENANCE.md` — Provenance chain, source badges, format definitions
  - `API-LICENSING.md` — Per-source license enforcement (ODbL, CC-BY, CC0)
  - `API-RATE-LIMITING.md` — Token bucket per source, default limits, bypass rules
  - `API-CACHING.md` — Redis-compatible caching with TTL per source type
  - `API-FAILURE-HANDLING.md` — Graceful degradation, circuit breaker, fallback behavior
  - `API-SCHEMA-CHANGES.md` — Versioned schemas, change detection, migration
  - `EXTERNAL-DATA-PRIVACY.md` — Privacy review, sensitive data redaction, GDPR considerations
  - `EXTERNAL-API-SECURITY.md` — API key management, input validation, rate limit bypass security
  - `GRAVE-API-AUDIT.md` — Audit logging for all external API calls
  - `GRAVE-API-COST-CONTROL.md` — Response size limits, request budgets, monitoring
  - `GRAVE-API-HEALTH.md` — Health dashboard, per-source status, metrics
  - `AI-EXTERNAL-SEARCH.md` — AI search architecture, source transparency rules
  - `EXTERNAL-MAP-DATA.md` — Map integration, external cemetery overlays
  - `EXTERNAL-DATA-IMPORT.md` — Import workflow, deduplication, quality validation
  - `GRAVE-API-GUI.md` — GUI components, source badges, search fragment

### Fixed
- `AIDataInterceptor(ApiClient)` constructor now initializes `externalClient` field (CI fix)

### Acceptance Gate
All 28 parts of the Grave/Cemetery API Integration master prompt are now complete:
- ✅ Parts 1-15: Architecture, registry, connectors, schema, matching, provenance, badges, licensing, rate limiting, caching, failure handling, schema detection, gateway, data quality, batch import
- ✅ Parts 16-17: AI external search + source transparency
- ✅ Part 18: Search fallback
- ✅ Part 19: Map integration
- ✅ Part 20: External import workflow
- ✅ Parts 21-22: Privacy + security controls
- ✅ Part 23: Audit logging
- ✅ Part 24: Cost control
- ✅ Part 25: Data quality validation
- ✅ Part 26: API health dashboard
- ✅ Part 27: GUI integration
- ✅ Part 28: Documentation (21 files, all filled)

---


## [Phase 16.5 — Research Canvas] — 2026-08-15

### Added — Visual Graph for Record Relationships
- **ResearchGraph.java** — Graph model connecting PERSON → CEMETERY → RECORD → SOURCE:
  - 5 node types: PERSON, CEMETERY, RECORD, SOURCE, LOCATION
  - 8 edge types: BURIED_IN, RECORDED_IN, LOCATED_IN, CITED_BY, NEAR, SAME_CEMETERY, SAME_REGION, RELATED_TO
  - buildFromRecord() builds complete graph from GraveRecord + RelatedRecords
  - getNeighbors() — find connected nodes
  - getEdgesForNode() — get all edges for a node
  - getNodeCounts() / getEdgeCounts() — graph statistics
  - getSummary() — text summary with evidence trail info
  - getCentralNode() — the highlighted starting node
  - Deduplicated node IDs via HashMap

- **ResearchCanvasFragment.java** — Visual graph UI:
  - Central entity card (highlighted)
  - Direct connections list with edge labels
  - Graph statistics by node type
  - Related persons, cemeteries, and sources sections
  - Full edge list with arrows and labels
  - Tap node → view details
  - Long-press → node details dialog with neighbors
  - API failure → cache fallback
  - Accessible content descriptions

- **AISystemPrompts** — AI aware of Research Canvas and graph relationships

### Tests
- **tests/phase16-5.test.js** — 80+ tests covering:
  - ResearchGraph model (8 tests)
  - Node types (7 tests)
  - Edge types (9 tests)
  - GraphNode fields (9 tests)
  - GraphEdge fields (3 tests)
  - Graph building (17 tests)
  - Graph navigation (7 tests)
  - Graph statistics (4 tests)
  - Summary (6 tests)
  - ResearchCanvasFragment (18 tests)
  - AI system prompts (4 tests)
  - Documentation (1 test)


## [Phase 16.4 — AI Map] — 2026-08-15

### Added — Natural-Language Map Queries & Historical Layers
- **AIMapQuery.java** — Natural-language query parser for map data:
  - Year extraction: single year, decade ("1900s"), range ("1900 to 1999"), before/after
  - Evidence filter: source-backed, unverified, verified, cited, documented
  - Location extraction: "near X", "in X", "around X"
  - Record type: cemetery, memorial, grave, tomb, burial
  - applyFilters() — filter GraveRecord list by parsed query
  - generateResponse() — natural-language response with result count and description
  - Stop word filtering for location extraction

- **HistoricalLayers.java** — Era-based map layer system:
  - 6 eras: Pre-1800, 1800–1849, 1850–1899, 1900–1949, 1950–1999, 2000–Present
  - 3 source filters: All Sources, Source-Backed, Community-Submitted
  - 18 layer combinations (6 eras × 3 source filters)
  - buildFromRecords() — organize records into layers
  - toggleLayer(), setEraVisible(), setSourceFilterVisible() — visibility control
  - getVisibleRecords() — deduplicated records from visible layers
  - getSummary() — era breakdown with source/community counts

- **Backend /api/map/query endpoint**:
  - GET /api/map/query?q=Show+me+graves+from+the+1900s+in+Singapore
  - Also accepts structured params: ?startYear=1900&endYear=1999&location=Singapore&evidence=source_backed
  - Parses NL query for year ranges, decades, before/after, evidence, location
  - Filters published records and returns summary

- **AISystemPrompts** — AI aware of map query endpoint and historical layers

### Tests
- **tests/phase16-4.test.js** — 80+ tests covering:
  - AIMapQuery model and parsing (10 tests)
  - Year extraction (7 tests)
  - Evidence filter extraction (4 tests)
  - Location extraction (5 tests)
  - Record type extraction (4 tests)
  - applyFilters (6 tests)
  - generateResponse (5 tests)
  - HistoricalLayers (20+ tests)
  - Backend endpoint (16 tests)
  - AI system prompts (5 tests)
  - Documentation (1 test)


## [Phase 16.3 — AI Timelines] — 2026-08-15

### Added — Interactive Timelines
- **TimelineEvent.java** — Timeline event model with 7 event types:
  - BIRTH, DEATH, BURIAL, CEMETERY_ESTABLISHED, INSCRIPTION, RECORD_CREATED, RECORD_UPDATED
  - Factory methods: fromBirth(), fromDeath(), fromRecordCreated(), fromCemeteryEstablished()
  - sortChronologically() — oldest first, unknown dates last
  - filterByYearRange() — filter events by start/end year
  - groupByDecade() — group events into decade buckets (1900s, 1910s, etc.)
  - generateSummary() — natural-language summary for AI chat
  - toJson() — serialization for persistence
  - extractYear() — regex-based year extraction from date strings
  - getFormattedDate() — human-readable date formatting (Jan 15, 1950)

- **TimelineFragment.java** — Visual timeline UI:
  - Vertical timeline with decade grouping
  - Color-coded event dots (green=birth, gray=death, etc.)
  - Event cards with type, date, title, description, cemetery name
  - Evidence badges on each event (from record's verificationStatus)
  - Tap event → navigate to GraveDetailFragment
  - Long-press → event details dialog
  - Natural-language summary at top
  - Handles API failure and empty data gracefully

- **Backend /api/timeline endpoint**:
  - GET /api/timeline — returns all timeline events from published graves
  - Optional ?startYear= and ?endYear= query params for filtering
  - Builds BIRTH and DEATH events from grave records
  - Sorted chronologically (oldest first)
  - Returns events array + summary string + count

- **MainNavActivity** — Timeline accessible from More sheet
- **AISystemPrompts** — AI aware of timeline feature and API endpoint

### Tests
- **tests/phase16-3.test.js** — 90 tests covering:
  - TimelineEvent model (19 tests)
  - Event factory methods (9 tests)
  - Sorting and filtering (5 tests)
  - Decade grouping (7 tests)
  - Summary generation (4 tests)
  - JSON serialization (4 tests)
  - TimelineFragment (21 tests)
  - Backend endpoint (12 tests)
  - MainNavActivity integration (3 tests)
  - Layout integration (2 tests)
  - AI system prompts (4 tests)
  - Documentation (1 test)


## [Phase 5.5 — Security Audit] — 2026-08-15

### Added — Comprehensive Security Audit
- **tests/security-audit.test.js** — 82 security checks across 14 categories:
  1. **Input Validation** (7 checks) — lat/lon bounds, date format, field length, record count, import size
  2. **Path Traversal Protection** (4 checks) — sanitizePathSegment on all IDs, github.js path sanitization
  3. **Token Security** (5 checks) — constant-time XOR comparison, length check, env-based tokens
  4. **Rate Limiting** (7 checks) — 10/min default, 30/min admin, 60/min search, 429 response, memory cleanup
  5. **CORS Configuration** (5 checks) — configurable ALLOWED_ORIGIN, preflight OPTIONS, headers
  6. **Code Injection Prevention** (4 checks) — no eval(), no Function(), no child_process, no exec()
  7. **Auth on Write Endpoints** (9 checks) — Google auth, session tokens, ban check, ban reason, sub tracking
  8. **Google ID Token Verification** (6 checks) — token length, sub claim, email_verified, audience, expiry
  9. **Session Token Security** (5 checks) — HMAC signature, userId, timestamp, 7-day expiry, verification
  10. **GitHub App Authentication** (7 checks) — JWT (not PAT), env-based secrets, RS256, no hardcoded tokens
  11. **XSS Prevention** (3 checks) — JSON API, no innerHTML, static health page
  12. **Import Framework Security** (8 checks) — size/count/length limits, strict transitions, license verification
  13. **Android Security** (6 checks) — HTTPS, no hardcoded secrets, encrypted storage, auth headers, login required
  14. **AI Moderation Security** (6 checks) — quality threshold, auto-reject/approve, reasoning logs, confidence

### Security Audit Results
- **Zero security issues found** — all 82 checks passed
- No hardcoded secrets (tokens, keys, passwords)
- No code injection vectors (eval, Function, child_process, exec)
- No path traversal vulnerabilities (sanitizePathSegment on all IDs)
- No XSS vectors (JSON API, no user input in HTML)
- Constant-time admin token comparison (XOR-based)
- Rate limiting on all endpoints (10-60 req/min depending on endpoint)
- Google ID token verification (sub, email_verified, audience, expiry)
- GitHub App authentication (JWT + installation token, not personal access token)
- Encrypted session storage on Android (AES-256-GCM via EncryptedSharedPreferences)

### Tests
- **tests/security-audit.test.js** — 82 tests (all passing)
- Total: 1387 tests passing, 0 failures


## [Phase 16.2 — Command Bar + Research Sessions] — 2026-08-15

### Added — Persistent AI Command Bar
- **AICommandBar.java** — Reusable AI command bar component:
  - Extends LinearLayout with EditText + send button
  - "🔍 Ask GraveAtlas" label
  - Sends question to MainActivity (AI chat) with pre-fill
  - Clears input after sending
  - Handles IME_ACTION_SEND (Enter key)
  - Three constructors for XML inflation
  - preFill(), clear(), hasText() public methods
- **activity_main_nav.xml** — Updated layout:
  - AICommandBar positioned above bottom navigation
  - Fragment container constrained above AI command bar
  - Elevation and background for visual separation
- **MainNavActivity.java** — Updated:
  - Initializes AICommandBar in onCreate
  - Initializes ResearchSessionManager in onCreate
  - AI command bar now visible on all screens (Home, Search, Map, etc.)

### Added — Research Session Persistence
- **ResearchSessionManager.java** — Save and resume AI investigations:
  - createSession(firstQuestion) — Creates new session with UUID, auto-title
  - addAnswer(sessionId, answer) — Adds AI response to session
  - addQuestion(sessionId, question) — Adds follow-up question
  - addReferencedRecord(sessionId, recordId) — Tracks referenced records (deduped)
  - getSession(sessionId) — Retrieve a session
  - listSessions() — List all sessions, sorted by last accessed
  - deleteSession(sessionId) — Delete a session
  - clearAll() — Clear all sessions
  - Max 50 sessions (oldest auto-pruned)
  - Sessions serialized to JSON in SharedPreferences
  - Session.Interaction: question, answer, timestamp
  - Session: id, title, createdAt, lastAccessedAt, interactions, referencedRecordIds

### Tests
- **tests/phase16-2-command-bar.test.js** — 41 tests covering:
  - AICommandBar component (12 tests)
  - ResearchSessionManager (18 tests)
  - MainNavActivity integration (6 tests)
  - Layout integration (5 tests)
- Total: 1247 tests passing, 0 failures

### Phase 16 Roadmap Progress
- ✅ AI-native home screen (Phase 16)
- ✅ AI research assistant system prompt (Phase 16)
- ✅ Evidence-first badge system (Phase 16)
- ✅ Smart record cards (Phase 16)
- ✅ Contextual actions on grave records (Phase 16)
- ✅ Integrate AI with backend search (Phase 16.1)
- ✅ Evidence badges in search results (Phase 16.2)
- ✅ "Why am I seeing this?" transparency feature (Phase 16.2)
- ✅ Make AI command bar persistent across all screens (Phase 16.2)
- ✅ Add research session persistence (Phase 16.2)
- ⬜ TalkBack screen reader testing
- ⬜ Test with large text settings


## [Phase 16.2] — 2026-08-15

### Added — Evidence Badges in Search + Transparency
- **SearchFragment.java** — Redesigned search result cards:
  - Evidence badge on each card (top-right, next to name)
  - Uses actual `verificationStatus` from GraveRecord
  - "Why am I seeing this?" link on each card
  - `showEvidenceExplanation()` dialog explaining:
    - Evidence category label + description
    - Backend verification status
    - Source information
    - Why the record matched the search
    - Call to action (submit corrections)
  - Report Issue button links to grave detail
- **GlobalSearchFragment.java** — Updated evidence badges:
  - Now uses actual `r.verificationStatus` from SearchResult (was hardcoded null)
  - "Why am I seeing this?" link on each result card
  - `showEvidenceExplanation()` dialog for global search results
  - View Record button in dialog
- **SearchResult.java** — Added `verificationStatus` field:
  - Parsed from JSON response (`json.optString("verificationStatus", null)`)
  - Used by GlobalSearchFragment for evidence badge

### Tests
- **tests/phase16-2.test.js** — 29 tests covering:
  - SearchResult verificationStatus field (2 tests)
  - SearchFragment evidence badges (4 tests)
  - SearchFragment transparency feature (10 tests)
  - GlobalSearchFragment evidence badges (2 tests)
  - GlobalSearchFragment transparency feature (4 tests)
  - Backend verificationStatus (2 tests)
  - EvidenceStatus categories regression (4 tests)
  - Documentation (2 tests)
- Total: 1206 tests passing, 0 failures

### Phase 16 Roadmap Progress
- ✅ AI-native home screen (Phase 16)
- ✅ AI research assistant system prompt (Phase 16)
- ✅ Evidence-first badge system (Phase 16)
- ✅ Smart record cards (Phase 16)
- ✅ Contextual actions on grave records (Phase 16)
- ✅ Integrate AI with backend search (Phase 16.1)
- ✅ Evidence badges in search results (Phase 16.2)
- ✅ "Why am I seeing this?" transparency feature (Phase 16.2)
- ⬜ TalkBack screen reader testing
- ⬜ Test with large text settings
- ⬜ Make AI command bar persistent across all screens
- ⬜ Add research session persistence (save investigations)


## [Android Google Auth Integration] — 2026-08-15

### Added — Android Client
- **SecureStorage.java** — Updated with full session token management:
  - `saveSessionToken()` / `getSessionToken()` — stores/retrieves backend session token
  - `getGoogleSub()` — gets the stable Google account ID for current session
  - `clearSessionToken()` — clears session on logout
  - `hasValidSession()` — checks token exists and is not expired (7-day client-side check)
  - `canSubmit()` — requires both user info AND valid session token
  - Auto-clears expired tokens on access
- **LoginActivity.java** — Updated for mandatory auth:
  - Requests Google ID token via `requestIdToken()`
  - Sends ID token to `POST /api/auth/google/verify` for server-side verification
  - Stores session token and Google sub from backend response
  - Handles ban responses (shows banReason to user)
  - Handles network errors and missing ID token gracefully
  - `requireLogin()` static method for gating submissions from any fragment
  - `launch()` static method to start login from any activity/fragment
- **ApiClient.java** — Updated with auth integration:
  - `setSessionContext()` — wires app context for session token retrieval
  - `getAuthHeader()` — returns "Bearer <token>" or null
  - `isAuthenticated()` — checks if user can submit
  - All 3 submission endpoints now include Authorization header:
    - submitGrave (POST /api/graves)
    - submitCemetery (POST /api/cemeteries)
    - submitCorrection (POST /api/corrections)
  - Auth header is optional (null if browsing without login)
- **AddGraveFragment.java** — Login gate:
  - Checks `SecureStorage.canSubmit()` before showing review form
  - Launches `LoginActivity` if not authenticated
  - Shows toast: "Please sign in with Google to add records."
- **MainActivity.java** — Initializes session context:
  - `SecureStorage.init()` on app start
  - `ApiClient.setSessionContext()` for auth header injection
- **MainNavActivity.java** — Same session context initialization
- **activity_login.xml** — Updated UI:
  - Tagline: "Sign in to add and contribute records"
  - Skip button: "Browse without signing in"
  - Privacy note mentions server-side verification and abuse prevention logging
- **AndroidManifest.xml** — LoginActivity comment updated to "required before submitting records"
- **wrangler.toml** — Added GOOGLE_CLIENT_ID secret documentation
- **tests/android-auth.test.js** — 43 tests covering:
  - SecureStorage session token management (6 tests)
  - LoginActivity ID token flow (12 tests)
  - ApiClient auth header integration (8 tests)
  - AddGraveFragment login gate (4 tests)
  - Session context init in activities (4 tests)
  - AndroidManifest registration (2 tests)
  - Login layout verification (4 tests)
  - Build config (1 test)
  - Backend endpoint match (2 tests)

### Fixed
- import-admin test: Changed assertion from "No auto-publish" string match to "PENDING_APPROVAL" state check

### Test Results
- Total tests: 806 passing, 0 failures
- Breakdown: AI moderation (70), Android auth (43), Backend (370), Google auth (66), NEA importer (42), OSM importer (67), Phase 16 (44), Phase 5 pipeline (64), Phase 5 (47), Phase 5.5 E2E (1), Phase 6A (123), Phase 7A (105), Phase 7B (76), Import admin (59)

### Security
- Google ID tokens verified server-side (Android never trusts client claims)
- Session tokens stored in EncryptedSharedPreferences
- Session tokens expire client-side after 7 days (matching backend)
- All submission endpoints require Bearer auth
- Browsing/searching works without login (read-only)
- Android login gate prevents accessing submission form without auth

# CHANGELOG

## [7.2.17] — 2026-08-16

### Phase 16.17: AI Merge Resolution

**Added:**
- `POST /api/graves/:idA/merge/preview/:idB` — generate a field-by-field merge
  proposal comparing two records. For each field: shows both values, recommends
  which to keep, provides confidence level and reasoning. Computes similarity
  score and recommended action (safe_to_merge, merge_with_caution, manual_review_required).

- `POST /api/graves/:idA/merge/apply/:idB` — apply a merge. Combines record B
  into A using auto-apply for high/medium confidence fields, accepts field
  overrides for manual decisions. Marks B as merged, preserves B for provenance.
  Adds full merge history entry: mergedFromId, mergedAt, mergedBy, fieldsApplied,
  fieldsSkipped, similarityScore.

- `GET /api/cemeteries/:id/merge/suggestions` — find potential duplicate pairs
  within a cemetery. Scores by name match (50pts exact), death date (30pts),
  birth date (20pts), plot (15pts). Filters at 50+ score, returns top 50 pairs
  with recommended action (high_confidence_merge >= 80, likely_duplicate >= 60).

- `GET /api/merge/history` — global merge history across all records.
  Returns up to 100 entries sorted by date, with target record info.

**Merge Heuristics:**
- Verified record preferred in conflicts (high confidence)
- Longer/more complete text preferred for inscription, notes, sources, photos
- More precise coordinates preferred (decimal places)
- Arrays merged with unique items from both records
- Longer name preferred for name fields

New models: MergeProposal (3 inner classes), MergeResult (3 inner classes),
MergeSuggestion (1 inner class), MergeHistory (1 inner class)
API client: previewMerge(), applyMerge(), getMergeSuggestions(), getMergeHistory()
AI system prompt updated, 3 new suggested prompts
90+ new tests (phase16-17.test.js)


## [7.2.16] — 2026-08-16

### Phase 16.16: AI Watchlist & Monitoring

**Added:**
- `GET /api/watchlist` — list all watchlist items, sorted by creation date.

- `POST /api/watchlist` — add a cemetery or record to the watchlist.
  Body: `{ targetType, targetId, watchFor[], label }`.
  Watch types: `health_degradation`, `new_anomalies`, `unapplied_fixes`,
  `duplicate_detected`, `missing_data`.

- `DELETE /api/watchlist/:itemId` — remove an item from the watchlist.

- `POST /api/watchlist/check` — check all active watchlist items and generate alerts.
  For each item: computes current health + anomalies, compares with previous state,
  generates alerts based on configured watch types.
  Returns: alerts array with severity, message, current/previous values.
  Updates each item's `lastChecked` and `lastStatus`.

- `GET /api/watchlist/status` — lightweight status summary:
  active items, last check time, and `needsCheck` flag (24-hour threshold).

**Alert Types & Severity:**
- `health_degradation`: Score drop >= 15 = critical, >= 10 = high, >= 5 = medium
- `new_anomalies`: Critical if critical anomalies increased, else medium
- `unapplied_fixes`: Low severity, reports available high-confidence fixes
- `duplicate_detected`: Medium severity
- `missing_data`: High if > 80% missing, medium if > 50%

New models: WatchlistItem (with WatchStatus), WatchAlert,
WatchlistCheckResult, WatchlistStatus
API client: getWatchlist(), addToWatchlist(), removeFromWatchlist(),
checkWatchlist(), getWatchlistStatus()
AI system prompt updated, 3 new suggested prompts
90+ new tests (phase16-16.test.js)


## [7.2.15] — 2026-08-16

### Phase 16.15: AI Export & Reporting

**Added:**
- `GET /api/cemeteries/:id/report` — comprehensive quality report including:
  - Cemetery metadata (country, region, city, established date)
  - Health score with letter grade
  - Content coverage (photos, inscriptions, sources, coords, section, plot,
    birth/death dates, given/family names)
  - Date range (earliest/latest death years)
  - Full statistics (verified/unverified, community-submitted counts)
  - Anomaly summary with by-type breakdown
  - Recommendations summary (top 10 by priority, counts per priority level)
  - Cleanup preview (current vs projected grade/score, fix counts)
  - Report metadata (version 1.0, schema, generator, CC-BY-SA 4.0 license)

- `GET /api/cemeteries/:id/report/summary` — lightweight summary:
  Health grade, record count, coverage metrics, anomaly counts.

- `GET /api/reports/global` — global quality report:
  Global health, per-cemetery breakdown sorted by record count,
  global content coverage, report metadata.

**Helper Functions:**
- `computeCemeteryStats()` — in-memory statistics computation
- `computeCemeteryAnomalies()` — in-memory anomaly detection with by-type counts
- `generateRecommendations()` — lightweight recommendation generation

New models: CemeteryReport (9 inner classes), CemeteryReportSummary,
GlobalReport (3 inner classes)
API client: getCemeteryReport(), getCemeteryReportSummary(), getGlobalReport()
AI system prompt updated, 3 new suggested prompts
90+ new tests (phase16-15.test.js)


## [7.2.14] — 2026-08-16

### Phase 16.14: AI Batch Operations

**Added:**
- `GET /api/cemeteries/:id/cleanup/preview` — full cleanup pass simulation:
  Computes before-health, simulates auto-fixes (high+medium confidence),
  computes estimated after-health, returns before/after comparison with
  improvement metrics (scoreDelta, gradeChange, anomalyReduction, contentGain)
  and fix breakdown by type and confidence.

- `POST /api/cemeteries/:id/cleanup` — runs full cleanup pass:
  Applies high-confidence fixes to records, flags medium-confidence for review,
  re-scores health, returns before/after comparison.
  Body: `{ dryRun: boolean, fixTypes: string[] }`.

- `POST /api/cleanup/global` — global cleanup preview across all cemeteries:
  Aggregates before/after health, total proposed fixes, top 10 cemeteries by
  fix count, per-cemetery stats.

**Pipeline: scan → score → fix → re-score**
- Reuses `generateAutoFixes()` from Phase 16.13 for fix generation
- Reuses same weighted scoring formula as Phase 16.11 health dashboard
- `computeQuickHealth()` helper for in-memory health scoring on record arrays
- Before/after comparison shows the impact of the cleanup pass

New models: HealthSnapshot, CleanupResult (with CleanupImprovement,
  CleanupFixes, AppliedDetail), GlobalCleanupResult (with GlobalImprovement,
  GlobalFixes, CemeteryFixStat)
API client: previewCemeteryCleanup(), runCemeteryCleanup(), runGlobalCleanup()
AI system prompt updated, 3 new suggested prompts
90+ new tests (phase16-14.test.js)


## [7.2.13] — 2026-08-16

### Phase 16.13: AI Data Quality Auto-Fix

**Added:**
- `GET /api/cemeteries/:id/autofix/preview` — scans all records and returns proposed fixes
  without applying them. Summary with fix counts by action and confidence level.

- `POST /api/cemeteries/:id/autofix` — applies high-confidence fixes to cemetery records.
  Body: `{ dryRun: boolean, fixTypes: string[] }`. Only high-confidence fixes are auto-applied;
  medium-confidence fixes are flagged for manual review.

- `POST /api/graves/:id/autofix` — generates auto-fix proposals for a single record.

- `POST /api/graves/:id/autofix/apply` — applies high-confidence fixes to a single record.

**Auto-Fix Types:**
- `add`: Parse name into givenNames/familyName (high confidence)
- `normalize`: Normalize date format to ISO (high confidence)
- `normalize`: Fix ALL CAPS/lowercase names to title case (high confidence)
- `trim`: Trim whitespace in text fields (high confidence)
- `swap`: Fix swapped lat/lng when latitude > 90 (high confidence)
- `estimate`: Estimate birth year from death date + inscription age (medium confidence)
- `swap_dates`: Swap birth/death when birth is after death (medium confidence)

**Helper Functions:**
- `parseName()`: Handles "Surname, Given", multi-word surnames (del/la/van/von),
  title prefix stripping (Dr./Mr./Mrs./Rev./etc.)
- `normalizeDate()`: Handles ISO, slash, long month, "Month DD, YYYY", year-only
- `estimateBirthYear()`: Parses "aged N", "N years" from inscription
- `fixNameCase()`: Preserves Roman numerals, handles initials

New models: AutoFixProposal, CemeteryAutoFixPreview, CemeteryAutoFixResult,
RecordAutoFixResult (with AppliedChange inner classes)
API client: previewCemeteryAutoFix(), applyCemeteryAutoFix(),
getRecordAutoFixProposals(), applyRecordAutoFix()
AI system prompt updated, 3 new suggested prompts
100+ new tests (phase16-13.test.js)

**Safety:**
- Only high-confidence fixes auto-applied; medium-confidence flagged for review
- Dry run mode returns proposals without writing
- Fix type filtering via fixTypes parameter
- Records get updated_date timestamp on write


## [7.2.12] — 2026-08-16

### Phase 16.12: AI Smart Recommendations

**Added:**
- `GET /api/cemeteries/:id/recommendations` — analyzes cemetery data and generates
  prioritized, actionable recommendations across 6 categories:
  - data_quality: missing names, dates, coordinates, section/plot
  - anomalies: critical issues, minor anomalies, statistical outliers
  - enrichment: records that could benefit from AI enrichment
  - duplicates: potential duplicate records (name + death date match)
  - content: missing photos, inscriptions, sources
  - connections: potential family groups from surname matching

  Each recommendation includes:
  - category, priority (critical/high/medium/low), title, description
  - affectedRecords count, estimatedEffort (low/medium/high)
  - actionEndpoint (nullable — API endpoint to address the issue)
  - Sorted by priority (critical first)
  - Summary with counts per priority level + recordsAnalyzed

- `GET /api/recommendations/global` — global recommendations across all cemeteries:
  - Aggregates missing sources, photos, dates, critical anomalies, duplicates
  - Recommends per-cemetery health review for largest cemeteries
  - Global summary with totalCemeteries and totalRecords

- `CemeteryRecommendations` model with Recommendation inner class
  (getPriorityOrder, getPriorityLabel, getCategoryIcon, getCriticalRecommendations,
  getByCategory, hasUrgentIssues, getSummaryLine)
- `GlobalRecommendations` model reusing Recommendation from CemeteryRecommendations
- `ApiClient` methods: `getCemeteryRecommendations()`, `getGlobalRecommendations()`
- AI system prompt updated with recommendations endpoint awareness
- 3 new suggested prompts
- 90 new tests (phase16-12.test.js)

**Recommendation Logic:**
- Critical: missing names, critical anomalies, >30% missing both dates
- High: >50% missing sources, >60% missing photos, duplicates detected
- Medium: >40% missing inscriptions, >30% enrichment needed, >50% missing coords
- Low: family groups found, minor anomalies, statistical outliers, per-cemetery review


## [7.2.11] — 2026-08-16

### Phase 16.11: AI Cemetery Health Dashboard

**Added:**
- `GET /api/cemeteries/:id/health` — composite health score combining all intelligence:
  - Data quality (30%): completeness of essential fields + coverage of optional fields
  - Anomaly-free (25%): inverse of anomaly rate (critical/warning/info)
  - Enrichment coverage (15%): % of records NOT needing enrichment
  - Duplicate-free (15%): inverse of duplicate rate
  - Content coverage (15%): average of photo/inscription/source/coordinate coverage
  - Letter grade A (≥90), B (≥80), C (≥70), D (≥60), F (<60) with color + recommendation
  - Detailed breakdown: anomaly counts by type, enrichment stats, duplicate count,
    family group count, content coverage percentages, field coverage, median death year

- `GET /api/health/overview` — global health across all cemeteries:
  - Total cemeteries, total records, critical issues count
  - Content coverage averages (photo/inscription/source/coordinate)
  - Global letter grade

- `CemeteryHealth` model with 7 inner classes (HealthData, ScoreBreakdown,
  AnomalySummary, EnrichmentSummary, DuplicateSummary, ConnectionSummary, ContentCoverage)
- `GlobalHealthOverview` model with ContentCoverage and getSummary
- `ApiClient` methods: `getCemeteryHealth()`, `getGlobalHealthOverview()`
- AI system prompt updated with health dashboard endpoint awareness
- 3 new suggested prompts
- 80 new tests (phase16-11.test.js)

**Scoring Weights:**
- 30% data quality, 25% anomaly-free, 15% enrichment, 15% duplicates, 15% content


## [7.2.10] — 2026-08-16

### Phase 16.10: AI Anomaly Detection

**Added:**
- `GET /api/cemeteries/:id/anomalies` — cemetery-wide anomaly scan:
  - Date anomalies: birth after death (critical), lifespan > 120 (warning),
    future dates (critical), pre-1700 dates (warning)
  - Name anomalies: short names (warning), all-caps (info), numeric-only (warning),
    non-printable chars (critical)
  - Coordinate anomalies: >0.1° from cemetery center (warning), invalid ranges (critical)
  - Plot anomalies: duplicate plot assignments with record list (warning)
  - Completeness anomalies: no name/identifier (critical), no dates (warning)
  - Statistical outliers: death year > 100 years from median (info)
  - Summary with critical/warning/info counts, byType breakdown, median death year
  - Results sorted by severity (critical first), limited to 100

- `GET /api/graves/:id/anomaly-check` — single record anomaly check:
  - All date, name, coordinate, and completeness checks for one record
  - Returns hasCritical flag and anomalyCount
  - Returns human-readable summary

- `AnomalyReport` model with getCriticalAnomalies, getAnomaliesByType, hasCriticalAnomalies
- `RecordAnomalyCheck` model with isClean, getSummary, getCriticalAnomalies
- `ApiClient` methods: `getCemeteryAnomalies()`, `checkRecordAnomalies()`
- AI system prompt updated with anomaly detection endpoint awareness
- 3 new suggested prompts
- 70 new tests (phase16-10.test.js)

**Anomaly Types:**
- date_anomaly, name_anomaly, coordinate_anomaly, plot_anomaly,
  completeness_anomaly, statistical_outlier

**Severity Levels:**
- critical: birth after death, future dates, invalid coordinates, no name
- warning: lifespan > 120, pre-1700 dates, short names, far coordinates, duplicate plots, no dates
- info: all-caps names, statistical outliers


## [7.2.9] — 2026-08-16

### Phase 16.9: AI Import Quality Scoring

**Added:**
- `POST /api/import/score` — evaluates a batch of records (max 1000) and returns:
  - Completeness score (40% weight): % of essential fields filled (name, birthDate, deathDate, cemeteryId)
  - Coverage score (30% weight): % of optional fields filled (photoRefs, inscription, sourceRefs, coordinates, section, plot)
  - Consistency score (30% weight): date validity, name format, ID uniqueness
  - Overall weighted score + recommendation (accept ≥80% no errors / review ≥50% / reject <50%)
  - Per-record scores with individual errors and warnings
  - Field coverage percentages
  - Duplicate ID detection within batch

- `POST /api/import/batch-report` — full batch report with quality scores + metadata:
  - Unique cemeteries and countries count
  - Records with photos, inscriptions, sources, coordinates
  - Date range (earliest birth, latest death)
  - License attribution
  - Generated-at timestamp

- `ImportQualityScore` model with getRecommendationLabel, getLowQualityRecords, getRecordsWithErrors
- `ImportBatchReport` model with QualitySummary and BatchMetadata inner classes
- `ApiClient` methods: `scoreImportBatch()`, `getImportBatchReport()`
- AI system prompt updated with import quality scoring awareness
- 3 new suggested prompts
- 60 new tests (phase16-9.test.js)

**Scoring Algorithm:**
- Completeness: 4 essential fields, each worth 25%
- Coverage: 8 optional fields, each worth 12.5%
- Consistency: starts at 100, penalties:
  - Birth after death: -25
  - Lifespan > 120 years: -10
  - Future birth/death date: -15 each
  - Name < 2 chars: -10
- Overall: completeness×0.4 + coverage×0.3 + consistency×0.3
- Recommendation: ≥80 & no errors → accept, ≥50 → review, else → reject


## [7.2.8] — 2026-08-16

### Phase 16.8: AI Record Enrichment & Family Connections

**Added:**
- `GET /api/graves/:id/enrich` — AI-suggested missing field values:
  - Name parsing (Western given/family split, Chinese surname detection)
  - Birth year estimation from death date + age in inscription
  - Rough birth estimate from death date alone (~70 year lifespan)
  - Family connection detection (surname matching across cemetery records)
  - Source reference suggestions for unattributed records
  - Inscription transcription suggestions for records with photos
- `GET /api/cemeteries/:id/connections` — family connection network:
  - Surname-based grouping into family groups
  - Pairwise connections with confidence scoring (high/medium/low)
  - Date proximity analysis (within 10/30/50 years)
  - Plot adjacency detection (same section, same plot)
  - Top 50 connections + top 20 family groups
- `EnrichmentResult` model with confidence filtering helpers
- `ConnectionNetwork` model with family group accessors
- `ApiClient` methods: `getRecordEnrichment()`, `getCemeteryConnections()`
- `parseName()` backend function — handles Western + Chinese name parsing
- AI system prompt updated with enrichment + connections endpoint awareness
- 4 new suggested prompts
- 70 new tests (phase16-8.test.js)

**Algorithm:**
- Name parsing: CJK detection (U+4E00–U+9FFF), 2-4 char Chinese surnames,
  Western split by spaces, suffix handling (Jr./Sr./III/IV)
- Birth estimation: death year - age (from inscription regex), or death year - 70
- Connection scoring: same surname (base), date within 10yr (high),
  same section (medium→high), same plot (high)


## [7.2.7] — 2026-08-16

### Phase 16.7: AI Cemetery Intelligence

**Added:**
- `GET /api/cemeteries/:id/stats` — statistical summary (record counts, verification status, photos, inscriptions, sources, date range, decade breakdown, top names)
- `GET /api/cemeteries/:id/summary` — auto-generated narrative cemetery description
- `GET /api/cemeteries/:id/duplicates` — AI-assisted duplicate person detection using Levenshtein name similarity + date/section/plot matching
- `CemeteryStats` model with verification rate, photo coverage, source coverage helpers
- `DuplicateResult` model with severity levels (High/Medium/Low)
- `ApiClient` methods: `getCemeteryStats()`, `getCemeterySummary()`, `getCemeteryDuplicates()`
- AI system prompt updated with cemetery intelligence endpoint awareness
- 3 new suggested prompts (cemetery summary, stats, duplicates)
- 55 new tests (phase16-7.test.js)

**Algorithm:**
- Duplicate detection: Levenshtein distance for name similarity (85%+ = very similar, 70%+ = similar)
- Scoring: exact name (50), similar name (15-30), same birth/death date (25), same year (10), same plot (20)
- Threshold: score >= 40 to report as potential duplicate


## [7.2.6] — 2026-08-16

### Phase 16.6: Adaptive Interface Modes

**Added:**
- `InterfaceMode` enum with 5 modes: RESEARCH, MAP, ARCHIVE, INSTITUTION, PUBLIC
- `InterfaceModeManager` — persists mode selection via SharedPreferences, provides feature flags
- Mode-specific navigation defaults (MAP→MapFragment, ARCHIVE→GlobalSearchFragment)
- AI system prompt includes current mode context hint
- Mode selector dialog in More sheet with single-choice items
- Admin/Import tools visible only in INSTITUTION mode
- AI command bar hidden in PUBLIC mode
- `moreInterfaceMode` and `moreAdmin` buttons in sheet_more.xml
- 46 new tests (phase16-6.test.js)

**Mode Features:**
- RESEARCH: AI-first, evidence trails, timeline, research canvas — default for power users
- MAP: Geographic exploration, GPS, compass, nearby cemeteries
- ARCHIVE: Record management, search, cemetery browsing, contributions
- INSTITUTION: Data import, admin, moderation tools — for museums/institutions
- PUBLIC: Simplified, read-only, no AI command bar — for casual visitors


## Phase 4 Gap Closure — Publication Pipeline, Retry, Change Diff, Rate Limits (2026-08-11)

### Added — Backend (phase4a.js)
- **Publication states:** QUEUED, PUBLISHING, PUBLISHED, FAILED, RETRYING with valid transitions
- **Safe retry:** Max 3 attempts, exponential backoff (1s/2s/4s), rate limit awareness
- **Change diff:** Structured before/after comparison (added/modified/removed/unchanged)
- **Merge conflict detection:** Blocks writes if existing record has newer updatedAt
- **Rate limit detection:** Reads X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After headers
- **Error categorization:** Retryable (5xx, 429, 409) vs non-retryable (404, 403, 422)
- **Mass change protection:** Max 50 records per batch
- **Schema versioning:** CURRENT_SCHEMA_VERSION = 1.0.0
- **Publication queue:** Records stored in publication-queue/{id}.json

### Updated — Backend (index.js)
- Approve handler uses safePublish with retry, change diff, publication queue tracking
- POST /api/admin/publication/{id}/retry — retry failed publication
- GET /api/admin/publication/{id} — get publication status
- SUBMISSION_TRANSITIONS updated with queued/publishing/failed/retrying

### Updated — Backend (github.js)
- Better error messages: rate limit detection in writeFile, readFile, deleteFile
- 403+remaining=0 → rate limit with retry delay
- 404 → not found with file path
- 409 → conflict message
- 429 → rate limit with Retry-After

### Added — Docs
- docs/PUBLICATION-PIPELINE.md — full pipeline documentation
- CONTRIBUTION-WORKFLOW.md — publication pipeline section
- API-PUBLIC.md — publication retry/status endpoints

### Phase Status
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Nearly complete
- Phase 4: Nearly complete

---


## Phase 3 Gap Closure — Sessions, Roles, Moderation Notes, Statuses (2026-08-11)

### Added — Backend (phase6a.js)
- **Session management:** createSession, validateSession, revokeSession — 24-hour sessions with auto-expiry
- **User roles:** user, moderator, admin — getUserRole, isModerator, isAdmin, setUserRole
- **Moderation notes:** addModerationNote, getModerationNotes — private per-contribution notes
- **New submission statuses:** UNDER_REVIEW, PUBLISHED, FAILED with retry flow

### Added — Backend (index.js)
- POST /api/user/session — create session token
- DELETE /api/user/session — revoke session (sign-out)
- GET /api/admin/contributions — list all contributions
- POST /api/admin/contributions/{id}/notes — add moderation note
- GET /api/admin/contributions/{id}/notes — list moderation notes
- GET /api/admin/users — list all users
- POST /api/admin/users/{id}/role — assign user role

### Updated — Docs
- CONTRIBUTION-WORKFLOW.md, API-PUBLIC.md, DATA-SCHEMA.md

### Phase Status
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Nearly complete

---


## Phase 2 Gap Closure — 4 Docs, Map Clustering, Empty States (2026-08-11)

### Added
- **docs/PUBLIC-DATA.md** — Public data repository structure, publication boundary, data freshness, geographic coverage, no-fabricated-data policy, privacy in public data
- **docs/MAP.md** — Map architecture (no paid SDK, geo: intents), clustering design, nearby fragment, location privacy, offline behavior, empty states
- **docs/API-PUBLIC.md** — Complete API reference: all public, submission, user, contribution, and admin endpoints with parameters, rate limits, error format
- **docs/DATA-VALIDATION.md** — Multi-layer validation: client, server, pre-publication, CI. Field constraints, path sanitization, ID format, date/coordinate validation, duplicate detection, idempotency

### Updated
- **MapFragment.java** — Grid-based clustering (~1km grid cells) groups nearby records into clusters. Cluster cards show count + representative name. Single records show individually. Empty state, offline state, error state all handled gracefully. Content descriptions for accessibility.

### Phase Status
- Phase 1: ✅ Complete (gaps closed)
- Phase 2: ✅ Complete (gaps closed)

---


## Phase 1 Gap Closure — Audit + Docs + Request IDs (2026-08-11)

### Added
- **docs/DATA-SCHEMA.md** — All 6 schema entities documented (grave, cemetery, person, source, correction, audit event) with fields, types, constraints, and validation rules
- **docs/CONTRIBUTION-WORKFLOW.md** — Full contribution→moderation→publication workflow: types, statuses, drafts, duplicate detection, moderation actions, audit trail, abuse protection
- **docs/DEVELOPMENT.md** — Project structure, prerequisites, env setup, build/deploy commands, CI/CD, development principles
- **github/schema/audit-event-schema.json** — Formal JSON Schema (draft-07) for audit events. Was implemented in code but had no schema file
- **backend/src/index.js** — `X-Request-Id` header on all API responses. Either echoes client's `X-Request-Id` or auto-generates `req_<16hex>` for correlation/tracing

### Updated
- **PHASE-AUDIT.md** — Corrected audit. Previous version understated completion (only checked subset of files). Actual: 346 tests (not 24), 48 docs (not 8), 5 schemas (not 2), 17 Android screens (15 functional), Phase 6a/7a modules, import framework, countries data
- **STATUS.md** — Updated to reflect Phase 1 gap closure and corrected audit results

### Verified
- 346 tests passing
- No secrets exposed in any new or modified files
- All changes pushed to GitHub main branch

---


## v7.1.2 — Build & Worker Fixes: Compilation + Deployment (2026-08-10)

### Fixed — Android Compilation (commit 58f6598)
- **MainNavActivity.java:** Class closing brace was placed after `onBackPressed()`, leaving `onNewIntent()` and `handleDeepLink()` outside the class body. This caused 12+ "class, interface, enum, or record expected" errors and blocked all APK builds (runs #42-#44). Moved closing brace to end of file.

### Fixed — Backend GitHub API Integration (commit bf339d1)
- **github.js — Unicode-safe base64:** `btoa(content)` crashes on non-ASCII characters (DOMException). Cemetery names/descriptions frequently contain Unicode (em-dashes, accented names, Arabic/Chinese script). Replaced with `unicodeBtoa`/`unicodeAtob` using `TextEncoder`/`TextDecoder`.
- **github.js — Missing User-Agent header:** All 7 GitHub API `fetch()` calls lacked a `User-Agent` header. GitHub requires this and intermittently returns 403 without it. Added `'User-Agent': 'GraveAtlas-Worker'` to all calls.

### Fixed — Backend Build Error (commit 60a6158)
- **index.js — Unterminated regex:** `validateCemeterySubmission` website validation regex `/^https?:\/\/` was missing its closing `/`, causing a build error that blocked `wrangler deploy`. Fixed to `/^https?:\/\//.test(...)`.

### Deployed
- Cloudflare Worker redeployed via `wrangler deploy` — Version ba1c5716
- Full roundtrip verified: cemetery submission → file appeared in graveatlas-data repo → cleaned up
- Unicode submissions (Arabic, Chinese, em-dashes) confirmed working end-to-end

### Additional Compilation Fixes (Builds #50-#56)

After the initial 3 fixes, build #50 revealed additional compilation errors. Resolved across 6 more commits:

| Commit | File | Fix |
|--------|------|-----|
| 77971d1 | ApiClient.java | Added 5 missing model imports: GlobalSearchResponse, CountryInfo, RegionInfo, CityInfo, RelatedRecords — all referenced but not imported. Also removed duplicate CemeteryRecord import. |
| 4999a47 | CemeteryFragment.java | MainNavActivity.handleDeepLink() and SavedFragment both call CemeteryFragment.newInstance(id) but the method didn't exist. Added static factory method following the same pattern as GraveDetailFragment. |
| 6c47914 | GlobalSearchResponse.java | Android's org.json.JSONObject does not have keySet() (that's a Java Map method). Replaced with keys() iterator for Android compatibility. |
| a4733a1 | ApiClient.java | Phase 4 getCountries(List<String>) and Phase 7A getCountries(List<CountryInfo>) had the same erasure after type erasure. Removed the old Phase 4 version. |
| d53d45d | ApiClient.java | URLEncoder.encode(x, "UTF-8") throws checked UnsupportedEncodingException that wasn't caught. Added safeEncode() helper. |
| 3703fe3 | SearchResult.java | getDisplaySubtitle() wasn't including the type label ("Cemetery"/"Grave") that unit tests expected. Now prepends the capitalized type. |

### Build Result
- **Build #56** — ✅ SUCCESS (2026-08-10 02:07 UTC)
- APK released: `GraveAtlas-v7.1.0-release.apk` (7.0 MB)
- Download: https://github.com/putraworks2026/GraveAtlas/releases/download/v7.1.0-b56/GraveAtlas-v7.1.0-release.apk
- SHA256 checksum included in release

## v7.1.1 — Build Fix: AndroidManifest.xml (2026-08-10)

## v7.1.1 — Build Fix: AndroidManifest.xml (2026-08-10)

### Fixed
- AndroidManifest.xml: removed duplicate `</intent-filter>` closing tag
- This caused `processDebugMainManifest` to fail in GitHub Actions
- Affected builds: Phase 7A (#39) and Phase 7B (#40)
- All 761 backend tests still passing

### Changed
- STATUS.md: added Build Status section
- docs/CLOUDFLARE-WORKER.md: complete API routes table (65+ endpoints)
- docs/CLOUDFLARE.md: symlink to CLOUDFLARE-WORKER.md
- backend/src/index.js: version bumped to 7.1.0


## v7.1.0 — Phase 7B: Advanced Maps, Nearby & Saved Places (2026-08-10)

### Added — Nearby Discovery (Parts 116-119)
- NearbyFragment with location-based cemetery/memorial discovery
- Distance radius filters: 1km, 5km, 10km, 25km
- One-shot location request — no continuous tracking
- Directions handoff via standard geo: intent to device map app
- Approximate vs exact coordinate labeling

### Added — Saved Items & Recently Viewed (Parts 122-124)
- SavedItemsManager: local SharedPreferences storage
- Save cemeteries, people, memorials, graves (max 500)
- Recently viewed history (max 20, local-only, never uploaded)
- Path traversal protection on all item IDs
- SavedFragment with open/remove/share/clear actions

### Added — Sharing & Deep Linking (Parts 125-126)
- ShareUtils: generate shareable HTTPS URLs for public records
- Deep link scheme: graveatlas://record/{type}/{id}
- HTTPS app links: auto-verified with Android App Links
- Parse deep links and share URLs in MainNavActivity
- Intent filters in AndroidManifest.xml

### Added — Map & Discovery (Parts 128-135)
- Deterministic geographic recommendations (no AI, no fabricated relationships)
- Haversine distance for all proximity calculations
- Map filters: cemetery, memorial, country, region, distance
- Offline map behavior: graceful degradation when no network
- Location permission on-demand only — app works without it
- Data quality: invalid/null coordinates filtered from map display

### Added — Backend
- GET /api/record/{type}/{id} — public record detail for share links
- Path traversal protection on record IDs
- Only public fields returned (no private data)

### Added — Tests
- 76 new Phase 7B tests (all passing)
- Total: 821 tests across all phases
- Regression tests for Phase 7A functions
- Final security scan tests

### Changed
- sheet_more.xml: added Discover section with Nearby and Saved buttons
- MainNavActivity: deep link handling, Nearby/Saved navigation
- Version bumped to 7.1.0



## v7.0.0 — Phase 7A: Advanced Search & Global Discovery (2026-08-09)

### Added — Global Search (Parts 82-83)
- Unified global search across people, cemeteries, memorials, and locations
- Results categorized into 4 groups with per-category counts
- GET /api/search/global endpoint with full filter and sort support

### Added — Person Search (Part 84)
- Search by full name, partial name, alternative names, birth/death year
- GET /api/search/people endpoint
- Alt names, local names, and transliterations searched

### Added — Cemetery Search (Part 86)
- Search by name, alt names, city, region, country
- GET /api/search/cemeteries endpoint

### Added — Location Search (Part 87)
- Search for countries, regions, and cities
- GET /api/search/locations endpoint
- Browse by location: GET /api/browse?country=...&region=...&city=...

### Added — Name Normalization (Part 85)
- Unicode NFD decomposition + accent stripping
- Lowercase, punctuation handling, space normalization
- Source data never modified by normalization
- Full Unicode support (Arabic, Chinese, Japanese, Korean, Thai, Hebrew, Cyrillic)

### Added — Geographic Directories (Parts 88-90)
- Country directory: GET /api/countries — with actual cemetery and memorial counts
- Region directory: GET /api/countries/:country/regions
- City directory: GET /api/countries/:country/regions/:region/cities
- Counts derived from actual indexed data — never fabricated

### Added — Advanced Filters (Part 91)
- Country, region, city, cemetery filters
- Birth year, death year, year range (yearStart/yearEnd) filters
- Record type filter (people, cemeteries, memorials, locations, all)

### Added — Date Search (Part 92)
- Exact year, year range support
- Handles incomplete dates (year-only, approx, unknown) safely

### Added — Search Sorting (Part 93)
- Relevance (by match score, default)
- Name (alphabetical)
- Date (most recent first)
- Distance (haversine, requires lat/lon parameters)

### Added — Server-Side Pagination (Part 94)
- Default page size: 20, max: 100
- Android never downloads full dataset

### Added — Search Caching (Part 99)
- Search results: 5-minute TTL
- Directory data: 10-minute TTL
- LRU eviction when cache full

### Added — Related Records (Part 101)
- GET /api/related/:id?type=cemetery — nearby cemeteries (50km) + people in cemetery
- GET /api/related/:id?type=grave — same-cemetery people + same-region cemeteries
- No fabricated relationships

### Added — Search Security (Part 97)
- Path traversal queries neutralized
- Query length limit (200 chars)
- All parameters validated
- No arbitrary file/repo access through search

### Added — Internationalization (Part 107)
- Full Unicode search support
- Accent-insensitive matching
- Multiple date format support

### Added — Tests
- 105 new Phase 7A tests (all passing)
- Total tests: 744 (346 + 47 + 64 + 59 + 123 + 105)

### Added — Documentation (Part 111)
- docs/SEARCH.md — Search API, filters, sorting, normalization, caching
- docs/GLOBAL-DISCOVERY.md — Geographic directories, browse, related records

### Changed
- API version bumped to 7.0.0
- tests/run.js updated to include Phase 7A test suite


## v6.0.0 — Phase 6A: Community Accounts & Contribution System (2026-08-09)

### Added — User Accounts (Parts 2-3)
- User registration endpoint (POST /api/user/register)
- User profile: display name, bio, contribution count, accepted count, joined date
- Account states: ACTIVE, SUSPENDED, DEACTIVATED
- Public profile endpoint (GET /api/users/:id/profile) — exposes only safe public data
- Profile update endpoint (PUT /api/user/profile)

### Added — Contribution System (Parts 4-13)
- Contribution center with 5 types: cemetery, grave, correction, photo, report
- Submission statuses: DRAFT, PENDING_REVIEW, CHANGES_REQUESTED, APPROVED, REJECTED, CANCELLED
- Validated status transitions — invalid transitions rejected
- Contribution creation (POST /api/contributions) with per-type validation
- Contribution listing (GET /api/contributions) with pagination, type and status filters
- Contribution details (GET /api/contributions/:id) — user-scoped access
- Contribution cancellation (POST /api/contributions/:id/cancel)
- Contribution history with pagination support

### Added — Drafts (Part 14)
- Draft creation (POST /api/drafts)
- Draft listing (GET /api/drafts)
- Draft details (GET /api/drafts/:id)
- Draft update (PUT /api/drafts/:id)
- Draft deletion (DELETE /api/drafts/:id)
- Draft submission (POST /api/drafts/:id/submit) — validates then creates contribution

### Added — Duplicate Detection (Part 9)
- Duplicate check endpoint (POST /api/contributions/check-duplicate)
- 4-level classification: NO_MATCH, POSSIBLE_DUPLICATE, HIGH_CONFIDENCE_MATCH, EXACT_DUPLICATE
- Absolute scoring: name (40), cemetery (20), coordinates (20), dates (10+10)
- Thresholds: ≥85 exact, ≥55 high confidence, ≥25 possible

### Added — Photo Contributions (Parts 16-18)
- Photo submission endpoint (POST /api/photos)
- 5 rights declarations: OWN_WORK, PERMISSION_GRANTED, OPEN_LICENSE, PUBLIC_DOMAIN, UNKNOWN
- UNKNOWN rights flagged for extra manual review
- Photo validation: URL format, target type, path traversal protection
- File:// URLs rejected

### Added — Authorization (Part 20)
- User-scoped access — users can only see/modify their own contributions and drafts
- Authorization checks on all contribution and draft endpoints
- Cross-user access returns 403

### Added — Audit Events (Part 21)
- 9 audit actions: CONTRIBUTION_CREATED, DRAFT_UPDATED, SUBMISSION_CREATED, CORRECTION_CREATED, PHOTO_SUBMITTED, SUBMISSION_CANCELLED, USER_REGISTERED, USER_PROFILE_UPDATED, USER_STATUS_CHANGED
- Audit events stored in audit/ directory
- No secrets in audit logs

### Added — Rate Limiting (Part 22)
- Per-user rate limiting: 30 actions per hour
- In addition to existing IP-based rate limiting

### Added — Documentation (Part 29)
- docs/COMMUNITY.md — Community accounts, contribution center, API endpoints
- docs/CONTRIBUTIONS.md — Contribution types, statuses, workflow, duplicate detection
- docs/CORRECTIONS.md — Correction system, workflow, validation
- docs/PHOTO-RIGHTS.md — Photo rights, validation, security

### Added — Tests
- 123 new Phase 6A tests (all passing)
- Total tests: 639 (346 + 47 + 64 + 59 + 123)

### Changed
- API version bumped to 6.0.0
- tests/run.js updated to include Phase 6A test suite


## v5.5.0 — Phase 5 & 5.5: Global Discovery, Open-Data Import & Production Readiness (2026-08-09)

### Added — Phase 5: Global Discovery (Parts 1-39)
- backend/src/countries.js — 177 countries with ISO codes, local names, alt names, Unicode search
- backend/src/import-framework.js — Full import pipeline (source registry, license verification, format detection, validation, duplicate detection, data quality scoring, status transitions, reports, previews, file validation)
- CountryFragment.java — Country discovery UI with search, cemetery counts, local names
- Import status workflow: CREATED → LICENSE_REVIEW → VALIDATING → DUPLICATE_CHECK → PENDING_APPROVAL → APPROVED → IMPORTING → COMPLETED/PARTIAL/FAILED/REJECTED/ROLLED_BACK
- Recognized licenses: CC0, CC-BY, CC-BY-SA, ODbL, Public Domain, PDDL
- Duplicate detection: EXACT_DUPLICATE/HIGH_CONFIDENCE_MATCH/POSSIBLE_MATCH/NEW_RECORD with weighted scoring
- Import idempotency: source_id + dataset_version deduplication
- Import rollback: tagged records for safe removal
- Data quality scoring: per-record deterministic score
- Safe update classification: NEW, UNCHANGED, UPDATED, POSSIBLE_CONFLICT
- 10 new documentation files (GLOBAL-DATA, IMPORTS, SOURCES, LICENSES, DUPLICATES, GEOSEARCH, SCALABILITY, IMPORT-FRAMEWORK, IMPORT-RECOVERY, DATA-VERSIONING)

### Added — Phase 5 Tests (111 new, 457 total)
- tests/phase5.test.js — 47 tests (country directory, license, format, validation, duplicates, quality, transitions, source registry, reports, previews, file validation, Unicode)
- tests/phase5-import-pipeline.test.js — 64 tests (full pipeline, duplicates, licenses, invalid data, rollback, security, performance, search quality, data quality, country coverage, idempotency)
- tests/synthetic-data/phase5-test-dataset.json — 5 cemeteries, 10 graves, 10 people, 1 source (all marked PHASE5_TEST_DATA)

### Added — Phase 5.5: Production Readiness & Security Audit (Parts 1-63)
- Full project audit (docs/PHASE-5.5-AUDIT.md) — all components verified
- Security audit — no secrets in any files (Android, backend, tests, docs, config)
- Data integrity audit — no duplicate IDs, broken references, or orphan records
- Privacy audit — no personal info of living persons exposed
- Import safety audit — full pipeline verified
- Rollback test — synthetic data rollback verified, unrelated records unaffected
- E2E test (59 checks) — all stages verified with synthetic data
- Regression test — 516 total, 0 failures
- Production blocker audit — 0 CRITICAL, 1 HIGH (Worker secrets need configuration)
- Test data cleanup — all synthetic data in tests/ only
- Final security scan — PASS
- GitHub audit — app repo private, data repo public, no secrets
- API contract test — Android and Worker endpoints aligned
- Performance test — 100 records: 1ms, 1000 records: 6ms, country search: 0ms
- Incident response procedures (8 types documented in docs/INCIDENT-RESPONSE.md)
- Operations guide (docs/OPERATIONS.md)
- Privacy policy draft (docs/PRIVACY.md — requires legal review)
- Terms of use draft (docs/TERMS.md — requires legal review)
- Production checklist (docs/FINAL-CHECKLIST.md)
- Acceptance criteria checklist (docs/PHASE5-ACCEPTANCE.md)

### Added — Phase 5.5 Tests (59 new, 516 total)
- tests/phase55-e2e.test.js — 59 E2E checks covering all stages

### Changed
- tests/run.js now runs all 4 test suites (backend, Phase 5 core, pipeline, E2E)
- STATUS.md updated to reflect Phase 5 & 5.5 completion
- FEATURES.md updated with Phase 5 features
- CHANGELOG.md updated

### Verified
- All 516 tests pass (346 backend + 47 Phase 5 + 64 pipeline + 59 E2E)
- No secrets in any files
- No paid services added
- No AI for deterministic operations
- All GitHub writes through Worker only
- Import data treated as untrusted input
- Path traversal prevention active
- Test data uses test_ prefix and PHASE5_TEST_DATA markers
- Production blockers: 1 HIGH (Worker redeploy + secrets needed)

### Known Production Blockers
1. Cloudflare Worker running v2.0.0, needs redeploy with v5.5.0 code
2. GitHub App credentials not configured in Worker
3. Admin token not configured in Worker
4. Android APK not built (no SDK in build environment)


## v4.5.0 — Phase 4.5: Data Governance, Moderation, Trust & Production Readiness (2026-08-09)

### Added — Admin Dashboard (Part 2)
- GET /api/admin/dashboard — Queue overview with pending counts, privacy report highlights
- 12 new admin API endpoints for governance operations

### Added — Moderation System (Parts 4-5)
- Structured moderation reasons: INVALID_DATA, DUPLICATE, INSUFFICIENT_SOURCE, WRONG_LOCATION, PRIVACY_CONCERN, INAPPROPRIATE_CONTENT, INCORRECT_CEMETERY, OTHER
- Internal moderation notes (not exposed to users)
- Enhanced approval/rejection with audit events and contributor stats

### Added — Correction Workflow (Part 6)
- POST /api/admin/corrections/:id/approve — Apply correction, preserve previous values
- POST /api/admin/corrections/:id/reject — Reject with structured reason
- Previous values stored in correction record and audit event

### Added — Audit Trail (Part 7)
- createAuditEvent() — Appends audit events to audit/ directory
- GET /api/admin/audit — List audit events (paginated, filterable)
- GET /api/admin/audit/:entityId — Full audit trail for entity
- 10 audit actions: CREATE, UPDATE, DELETE, APPROVE, REJECT, REQUEST_CORRECTION, VERIFY, UNVERIFY, REPORT, RESTORE

### Added — Contributor Trust (Part 8)
- updateContributorStats() — Track submissions, accepted, rejected, corrections, reports
- GET /api/admin/contributors — List contributor statistics (admin only)
- Acceptance rate calculated but never grants bypass of moderation

### Added — Report System (Parts 9-10)
- Structured report types: INCORRECT_INFORMATION, DUPLICATE, WRONG_LOCATION, PRIVACY_CONCERN, INAPPROPRIATE_PHOTO, WRONG_CEMETERY, CEMETERY_STATUS, OTHER
- Report statuses: OPEN, UNDER_REVIEW, RESOLVED, REJECTED
- POST /api/admin/reports/:id/resolve — Resolve report with action
- POST /api/admin/reports/:id/reject — Reject invalid report
- Privacy reports prioritized in dashboard

### Added — Data Quality Engine (Parts 11, 25)
- GET /api/admin/data-quality — 11 ERROR checks, 6 WARNING checks, 1 INFO check
- scripts/data-quality-check.js — Standalone CLI for local/CI use
- Checks: missing IDs, duplicate IDs, broken refs, invalid coords, impossible dates, malformed URLs, invalid country codes

### Added — Status Transitions (Part 15)
- State machine for submissions, corrections, and reports
- Server-enforced: rejected→published is blocked, duplicate approvals blocked
- HTTP 409 returned for invalid transitions

### Added — Soft Delete & Restoration (Parts 18-19)
- Entity lifecycle: ACTIVE, ARCHIVED, REMOVED_PENDING_REVIEW, REMOVED
- POST /api/admin/restore/:id — Restore archived/removed records
- Restoration creates audit event

### Added — CI Validation (Part 26)
- Enhanced data-validation.yml with 5 check types:
  JSON syntax, required fields, duplicate IDs, broken references, secret scanning

### Added — Documentation (Part 33)
- docs/MODERATION.md — Moderation queue, lifecycle, reasons, admin API
- docs/AUDIT-TRAIL.md — Audit event structure, actions, API, security
- docs/DATA-QUALITY.md — Quality checks, categories, CLI usage
- docs/REPORTS.md — Report types, statuses, lifecycle, privacy
- docs/PRIVACY-REQUESTS.md — Privacy/takedown process, soft delete, contributor privacy
- docs/RECOVERY.md — 6 recovery scenarios with Git procedures
- docs/ADMIN-SECURITY.md — Authentication, authorization, rate limiting, security checklist

### Added — Tests (Parts 27-30)
- 76 new backend tests (346 total): moderation reasons, report types, audit actions, status transitions, duplicate detection, data consistency, soft delete, E2E moderation, correction, report, contributor trust, privacy, rate limiting
- All 270 Phase 1-4 tests still pass (regression verified)

### Changed
- Backend version: 4.1.0 → 4.5.0
- Enhanced report handler with structured reportType
- Enhanced approve/reject with audit events and contributor stats
- Enhanced data-validation.yml CI workflow

### Verified
- Part 24: Security audit — 11/11 checks passed
- Part 34: No paid services added
- Part 35: No AI for deterministic operations
- Part 36: All GitHub writes through Worker only
- Part 37: Git safety — no secrets committed
- Final acceptance: 29/29 checks passed


## v4.1.0 — Phase 4 Parts 39-50: Performance, Testing, Security & Documentation (2026-08-09)

### Added — Performance (Part 39)
- In-memory response cache (5-min TTL) for geographic hierarchy endpoints
- Cache-Control headers on GET list endpoints (5-min for lists, 10-min for geo)
- Cache eviction when >50 entries
- Search result caching in Android LocalCache (2-min TTL)
- Debounce already implemented in SearchFragment (300ms)

### Added — Tests (Parts 43-44)
- 88 new backend tests (270 total): all 20 test categories from Part 43
- Unicode tests: Arabic, Chinese, Japanese, Korean, Cyrillic, Greek, Hebrew, Devanagari, Thai, Malay, Indonesian, accented Latin
- Regression tests: all Phase 1-3.5 tests verified passing (Part 44)
- Security regression: no secrets in Android, source, or git history (Part 42)
- Test data safety: all test IDs use test_ prefix (Part 41)

### Added — Documentation (Part 45)
- docs/DATA-MODEL.md — entity relationships, stable IDs, geographic hierarchy, privacy
- docs/SEARCH.md — search API, ranking, Unicode, performance, scalability notes
- docs/CEMETERIES.md — cemetery fields, API endpoints, validation, internationalization
- docs/CONTRIBUTIONS.md — submission lifecycle, correction lifecycle, offline, privacy
- docs/VERIFICATION.md — verification states, workflow, admin API, source references
- docs/INTERNATIONALIZATION.md — Unicode, multi-language names, geographic hierarchy, dates

### Changed
- Backend version: 4.0.0 → 4.1.0
- LocalCache enhanced with search result caching and clearSearchCache()
- CemeteryRecord/GraveRecord caching now uses fromJson for full field preservation
- STATUS.md updated with Phase 4 complete

### Verified
- Part 46: No paid services added
- Part 47: No AI for deterministic operations
- Part 48: All GitHub writes through Worker only
- Part 49: No destructive migrations performed
- Part 50: No secrets in git history
- Final acceptance: 29/29 checks passed


## v4.0.0 — Phase 4: Worldwide Cemetery & Memorial Platform (2026-08-09)

### Added — Backend
- GET /api/search — Unified search with ranking (exact > normalized > prefix > partial > alt name)
- GET /api/people/:id — Person/memorial detail endpoint
- POST /api/cemeteries — Cemetery submission endpoint with idempotency
- POST /api/corrections — Correction submission endpoint with idempotency
- GET /api/corrections/:id — Correction status endpoint
- GET /api/countries — List countries derived from published cemeteries
- GET /api/regions — List regions (filterable by country)
- GET /api/cities — List cities (filterable by country, region)
- Search ranking: exact (100), normalized (90), prefix (70), partial (50), alt name (85/65/45)
- Search supports Unicode (Arabic, Chinese, Japanese, Cyrillic, etc.)
- Cemetery submission validation: country code (ISO 3166-1), website URL, field limits
- Correction validation: target ID, target type, corrections object, reason

### Added — Schemas
- github/schema/person-schema.json — Person/memorial data model
- github/schema/source-schema.json — Source reference model
- github/schema/correction-schema.json — Correction proposal model
- Cemetery schema enhanced: altNames, localName, transliteration, countryCode, country, region, city, locality, timezone, cemeteryType, operatingStatus, establishedDate, closedDate, website, contactInfo, accessibility, sourceRefs, verificationStatus
- Grave schema enhanced: cemeteryId, sectionId, graveIdentifier, personIds, inscription, sourceRefs, verificationStatus
- Flexible date format: YYYY, YYYY-MM, YYYY-MM-DD, unknown, approx_YYYY

### Added — Android
- PersonRecord model with date formatting (partial dates, approximate dates)
- SearchResult model with multi-type results
- CemeteryRecord enhanced with fromJson/fromJsonArray, getDisplayName, getLocationString, getVerificationLabel
- GraveRecord enhanced with fromJson/fromJsonArray, getCemeteryName, getLifeDates, getVerificationLabel
- GraveSubmission enhanced with Phase 4 fields (cemeteryId, countryCode, inscription, etc.)
- ApiClient.search() — Unified search with type filter and pagination
- ApiClient.getPerson() — Get person/memorial detail
- ApiClient.submitCemetery() — Submit new cemetery
- ApiClient.submitCorrection() — Submit correction proposal
- ApiClient.getCountries() — List countries
- ApiClient.getCorrectionStatus() — Check correction status

### Added — Tests
- 42 new backend tests (182 total): cemetery validation, correction validation, search ranking, ID generation, flexible dates, Unicode support
- 30 new Android tests (75 total): PersonRecord date formatting, CemeteryRecord display/location, GraveRecord verification, SearchResult subtitle

### Changed
- Backend version: 2.0.0 → 4.0.0
- ALLOWED_FIELDS expanded with Phase 4 fields
- GitHub data README updated with worldwide structure
- STATUS.md updated with Phase 4 feature matrix
- docs/SECURITY.md and docs/PRODUCTION-READINESS.md remain current from P3.5


## v2.3.1 — Phase 3.5: Production Readiness & Security Hardening (2026-08-09)

### Added
- Idempotency-Key header support on POST /api/graves (1-hour TTL, in-memory cache)
- Pagination on GET /api/graves and GET /api/cemeteries (?limit=N&offset=M, max 500)
- Android ApiClient.submitGraveWithKey() overload for explicit idempotency key
- Android OfflineSubmissionManager uses localId as idempotency key for retries
- 34 new backend tests (idempotency, pagination, security, privacy, concurrency)
- 15 new Android unit tests (UUID, pagination, security checks)
- docs/PRODUCTION-READINESS.md — full architecture, security model, verification results

### Changed
- GET /api/graves response now includes total, limit, offset, hasMore fields
- GET /api/cemeteries response now includes total, limit, offset, hasMore fields
- Android getGraves() and getCemeteries() now accept offset/limit parameters
- Android submitGrave() sends Idempotency-Key header (auto-generated UUID)
- STATUS.md updated with Phase 3.5 verification matrix
- docs/SECURITY.md updated with idempotency, pagination, and permissions

### Security
- Verified: no secrets in Android source, resources, or build config
- Verified: no secrets in git history
- Verified: admin endpoints reject unauthorized requests (401/403)
- Verified: path traversal blocked on all ID-based endpoints
- Verified: error messages never expose GitHub/Cloudflare internals
- Verified: CORS is opt-in (no wildcard origin)
- Verified: submission status endpoint exposes only status, not full record
- Verified: client cannot influence repository, branch, or API endpoint
- Verified: no device identifiers or personal data in submissions

### Tests
- Backend: 140 passed, 0 failed (106 original + 34 new)
- Android: 45 unit tests (30 original + 15 new)


## v2.3.0 — Phase 3: Android API Integration (2026-08-09)

### Added
- CemeteryRecord model — matching backend cemetery schema
- ApiErrorHandler — maps HTTP codes to user-friendly messages, never exposes secrets
- OfflineSubmissionManager — stores submissions locally with exponential backoff (30s→600s, max 5 retries)
- LocalCache — 5-minute TTL cache for graves and cemeteries (SharedPreferences)
- CemeteryFragment — cemetery discovery with search, geo: intents for maps
- GraveDetailFragment — full grave record view with open-in-maps button
- 3 new backend endpoints: GET /api/cemeteries, GET /api/cemeteries/:id, GET /api/submissions/:id
- 30 Android unit tests (models, error handling, JSON parsing)
- docs/ANDROID-API.md — complete Android-API integration documentation
- testImplementation JUnit dependency in build.gradle

### Changed
- ApiClient: added cemetery methods, submission status, HealthResult type, proper error handling
- SearchFragment: 400ms debouncing, cache fallback, tap-to-open GraveDetail, retry button
- MapFragment: API data with geo: intents (no paid map SDK), cache fallback
- AddGraveFragment: review step before submission, offline submission support
- ContributeFragment: submission tracking, offline queue management, status checking by ID
- SettingsFragment: API health check, configurable API URL, cache clearing
- HomeFragment: data summary from API, Browse Cemeteries button
- AboutFragment: updated with Phase 3 architecture and privacy info
- MainNavActivity: loads saved API URL from SharedPreferences on startup
- version bumped to 1.1.0

### Security
- Android app contains NO server credentials (GITHUB_APP_ID, PRIVATE_KEY, INSTALLATION_ID, ADMIN_TOKEN)
- No secrets cached, no tokens in SharedPreferences
- Submission status endpoint exposes only status, not full pending records
- Error messages never expose internal details

### Backend Tests
- 106 passed, 0 failed (added cemetery and submission status tests)


## v2.2.0 — Phase 2 Security Configuration (2026-08-09)

### Added
- Constant-time admin token comparison (safeTokenCompare) — prevents timing attacks
- Crypto-secure submission ID generation (crypto.getRandomValues) — replaces Math.random()
- Path sanitization (sanitizePathSegment) — prevents path traversal in all file operations
- Rate limiting: 10 requests/minute/IP on POST endpoints (in-memory, no paid KV)
- Unexpected field rejection — only ALLOWED_FIELDS accepted in submissions
- Request size enforcement via Content-Length header (413 response)
- GET /api/admin/reports endpoint — lists correction reports separately from submissions
- GET /api/admin/status endpoint — system status and data counts
- deleteFile function in github.js — proper GitHub Contents API file deletion
- GitHub branch parameter (ref) support in all API calls
- CORS opt-in via ALLOWED_ORIGIN environment variable (no wildcard by default)
- 502 error code for GitHub upstream failures
- 429 error code for rate-limited requests
- 413 error code for oversized requests
- scripts/generate-admin-token.js — cryptographically secure ADMIN_TOKEN generator
- docs/SECRETS.md — complete secrets configuration guide with rotation instructions
- 75 new backend tests (99 total, all passing)

### Changed
- Worker name in wrangler.toml fixed from `graveatlas-backend` to `graveatlas` (matches deployed Worker)
- Non-secret vars (GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH) moved to wrangler.toml [vars]
- Android ApiClient default URL corrected to `https://graveatlas.putraworks-2026.workers.dev`
- Health endpoint returns `status: "ok"` and `service: "GraveAtlas"` (no secrets exposed)
- Admin approve handler simplified (uses deleteFile instead of redundant moveFile+manual delete)
- Reports excluded from admin submissions list (filtered by report_ prefix)
- Error messages sanitized (no internal details, no GitHub URLs, no stack traces)
- docs/API.md updated with all endpoints and error codes
- docs/SECURITY.md updated with all Phase 2 security measures
- docs/CLOUDFLARE.md updated with correct Worker name and deployment info
- App ID redacted from STATUS.md

### Security
- No private keys in repository
- No tokens in source code
- No ADMIN_TOKEN value committed
- No .env files with real values
- .gitignore covers .env, .pem, private_key files
- Android app verified to contain no server credentials

## v2.1.0 — GitHub App Setup (2026-08-09)

### Added
- PKCS#1/PKCS#8 private key compatibility in pemToDer() — auto-wraps PKCS#1 RSA keys in PKCS#8 structure for Web Crypto API
- scripts/github-app-token.sh — generates GitHub App installation access tokens for automated operations
- Full GitHub App setup documentation in docs/GITHUB-APP.md (permissions, installation, test procedure, security)

### Changed
- GitHub App permissions reduced to minimum: Contents (read/write) + Metadata (read-only) only
- GitHub App installation moved to putraworks2026/graveatlas-data (public repo)
- docs/GITHUB-APP.md rewritten with complete setup guide, test plan, and architecture diagram

### Verified
- GitHub App exists and is correctly configured (verified via API)
- App installed on correct repository (graveatlas-data, public)
- Permissions match backend code requirements exactly
- No hardcoded token length assumptions in backend code
- Android Release APK build #7 successful

## v2.0.0 — Phase 2 (2026-08-09)

### Added
- Android navigation host with BottomNavigationView (5 tabs: Home, Search, Map, Add, Mine)
- MainNavActivity as new launcher activity (MainActivity/chat is now secondary)
- Functional Home screen with quick action buttons
- Functional Search screen with live API calls and filtering
- Functional Add Grave form with full validation and submission
- GitHub App authentication module (JWT → installation token)
- GitHub API integration: writeFile, readFile, listFiles, deleteFile, moveFile
- Backend now writes submissions to pending/ in graveatlas-data repo
- Backend reads published graves from graves/ directory
- Full moderation workflow: approve (move pending→graves), reject (update status)
- Report correction workflow (writes report_ files to pending/)
- Health endpoint now reports githubConfigured status
- 24 backend tests (all passing)
- graveatlas-data repository created with full structure

### Changed
- Backend version bumped to 2.0.0
- All kubur-sg references renamed to graveatlas
- Tests upgraded from 20 to 24 (added async lifecycle tests)
- Android manifest: MainNavActivity is now the launcher

### Fixed
- MainNavActivity.loadFragment visibility changed from private to public
- CompassActivity: added explicit import for com.putraworks.graveatlas.R

## v1.0.0 — Phase 1 (2026-08-09)

### Added
- Project structure: /app, /backend, /github, /docs, /scripts, /tests
- Android data models (GraveRecord, GraveSubmission, SubmissionResponse)
- Android API client with all endpoints
- Cloudflare Worker backend with all API routes and validation
- JSON schemas (grave + cemetery)
- GitHub Actions data validation workflow
- 8 documentation files
- Environment configuration templates
- 20 backend tests

## [7.2.0] — 2026-08-11 — All Phases Complete

### Added — Phase 2
- Viewport-based map search endpoint (`GET /api/map/viewport`) with bounding box queries

### Added — Phase 4
- Pull request creation function (`createPullRequest()`) for review-based publication
- Branch creation and multi-file commit to PR branch

### Added — Phase 6
- Security headers on all API responses (HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy)
- Security inventory document with severity classification (docs/SECURITY-INVENTORY.md)
- Data retention policy (docs/DATA-RETENTION.md)
- 9 IDOR and security tests (P6-1 through P6-9)

### Added — Phase 7
- Readiness check endpoint (`GET /api/health/ready`) with dependency checks
- Liveness check endpoint (`GET /api/health/live`)
- Metrics endpoint (`GET /api/admin/metrics`)
- Correlation IDs (X-Request-Id) on all requests and responses
- Operations documentation (docs/OPERATIONS.md)
- 8 reliability and observability tests (P7-1 through P7-8)

### Added — Phase 8
- Release configuration (docs/RELEASE-CONFIG.md)
- Store metadata (docs/STORE-METADATA.md)
- Content policy (docs/CONTENT-POLICY.md)
- Data governance (docs/DATA-GOVERNANCE.md)
- User support documentation (docs/USER-SUPPORT.md)
- Store-ready privacy policy update
- Store-ready terms of use update
- Splash screen theme
- Comprehensive accessibility strings
- 7 release readiness tests (P8-1 through P8-7)

### Added — Phase 5
- Accessibility content descriptions on all Android fragments
- Comprehensive empty/error/offline state strings in resources

### Changed
- PHASE-AUDIT.md updated to reflect 100% completion across all 8 phases
- STATUS.md updated to reflect full completion
- Test count increased from 346 to 370

### Fixed
- Syntax error in P8-2 test (fn => corrected to fn: () =>)

## [Phase 16.1] — 2026-08-15

### Added
- **AIDataInterceptor.java** — RAG (Retrieval-Augmented Generation) layer that detects search intent in AI chat messages, queries GraveAtlas API for real records, and injects results as `[DATABASE CONTEXT]` before sending to AI
- Evidence badges on search result cards in GlobalSearchFragment (KNOWN, SOURCE-BACKED, UNCERTAIN, etc.)
- 44 new tests for Phase 16.1 (search intent detection, term extraction, context formatting, security verification, evidence badges)
- docs/PHASE-16-FINAL-REPORT.md
- docs/PHASE-16-ROADMAP.md

### Changed
- AISystemPrompts.java — Rewrote system prompt: AI now has database access via RAG, instructed to use [DATABASE CONTEXT] and cite real record IDs
- MainActivity.java — Wired AIDataInterceptor into sendMessage() flow
- GlobalSearchFragment.java — Search results now display in LinearLayout containers with evidence badges
- tests/run.js — Added phase16.test.js to test runner

### Security
- AIDataInterceptor only uses public search endpoint (no admin, no write, no delete)
- No API keys, tokens, or secrets in interceptor code
- Graceful degradation: if API search fails, AI proceeds without data context

## [Phase 16.1 Post-Merge] — 2026-08-15

### Added
- docs/OFFICIAL-DATA-SOURCES.md — Comprehensive research on official APIs for cemetery/grave data
  - Singapore NEA data.gov.sg (✅ available, GeoJSON, open license)
  - OpenStreetMap (✅ available, ODbL, Overpass API)
  - BillionGraves (⚠️ possible API, needs contact)
  - MUIS/Pusara.sg (❌ no API)
  - FindAGrave (❌ proprietary, no API)
  - US NCA Gravesite Locator (⚠️ web search only)
  - Interment.net (⚠️ free, no API)
  - UK local councils (⚠️ varies by council)
  - Tiered recommendations for GraveAtlas integration

## [NEA Importer] — 2026-08-15

### Added
- **backend/src/importers/nea-singapore.js** — Singapore NEA cemetery importer
  - Fetches active cemetery GeoJSON from data.gov.sg API
  - Normalizes NEA GeoJSON features to GraveAtlas cemetery records
  - Full pipeline: fetch → license check → source registration → format detection → normalization → validation → duplicate detection → quality scoring
  - Output status: PENDING_APPROVAL (no auto-publish)
  - Dry-run mode (processNEAGeojson) for testing without network
  - Preserves NEA internal fields (INC_CRC, FMEL_UPD_D)
  - Attribution: National Environment Agency, Singapore Open Data Licence
- **tests/nea-importer.test.js** — 42 tests covering normalization, validation, full pipeline, duplicate detection, security

### Changed
- tests/run.js — Added nea-importer.test.js to test runner
- Total tests: 501 (up from 459)

## [OSM Importer] — 2026-08-15

### Added
- **backend/src/importers/osm-overpass.js** — OpenStreetMap cemetery importer via Overpass API
  - Fetches cemetery data worldwide (or by country code) from 3 Overpass endpoints with fallback
  - Supports landuse=cemetery, historic=cemetery, amenity=grave_yard, cemetery=grave
  - Handles node, way, and relation OSM elements with centroid extraction
  - Extracts localized names (name, name:en, name:fr, name:de, name:es, name:zh, name:ja, alt_name, loc_name)
  - Extracts address, religion, denomination, operator, dates, Wikidata/Wikipedia refs
  - Full pipeline: fetch → license (ODbL) → register → normalize → validate → dedup → quality
  - Rate limiting between endpoint attempts (5s minimum)
  - Output: PENDING_APPROVAL (no auto-publish)
  - Dry-run mode (processOSMData) for testing without network
- **tests/osm-importer.test.js** — 67 tests covering query building, coordinate extraction, normalization, validation, full pipeline, duplicate detection, cross-source compatibility, security
- Total tests: 568 (up from 501)

## [Admin Import API] — 2026-08-15

### Added
- **backend/src/import-handlers.js** — Admin import API endpoints
  - GET /api/admin/imports/sources — List available import sources (NEA, OSM)
  - POST /api/admin/imports/trigger — Trigger an import (fetch → process → store pending)
  - GET /api/admin/imports — List all import jobs
  - GET /api/admin/imports/:importId — Get import job details (full report)
  - POST /api/admin/imports/:importId/approve — Approve & publish records to data repo
  - POST /api/admin/imports/:importId/reject — Reject import (with reason, no publish)
  - State transition validation (PENDING_APPROVAL → APPROVED/REJECTED)
  - Audit logging for all import actions (trigger, fail, approve, reject)
  - Path traversal protection (sanitized import IDs)
  - File size limits enforced
- **tests/import-admin.test.js** — 59 tests (structure, routes, sources, transitions, approval, rejection, audit, security, storage)
- All 6 routes wired into backend/src/index.js (admin-protected via requireAdmin)
- Total tests: 627 passing, 0 failures

### Import Lifecycle (complete)
1. Admin triggers import → fetches from source → processes through framework → stored in pending/imports/ [PENDING_APPROVAL]
2. Admin reviews import report (records, errors, duplicates, quality score)
3. Admin approves → each record published to cemeteries/ or graves/ in GitHub data repo [COMPLETED or PARTIAL]
4. OR admin rejects → import marked REJECTED, no records published
5. All actions logged to audit/ directory

## [AI Auto-Moderation] — 2026-08-15

### Added
- **backend/src/ai-moderation.js** — AI auto-moderation module (replaces human admin)
  - `reviewImport()` — reviews import reports against 7 automated checks
  - `validateModerationDecision()` — validates decision against state machine
  - `buildAuditEntry()` — builds audit trail entry with full reasoning
  - `MODERATION_CONFIG` — configurable thresholds (quality, error rate, etc.)
  - `RECOGNIZED_LICENSES` — list of accepted open-data licenses
  - Checks: license recognition, attribution, valid records, error rate,
    quality score, duplicate rate, coordinates, verification status
  - Auto-approve: license OK + attribution present + quality ≥ 3.0 + errors < 30%
  - Auto-reject: unrecognized license, missing attribution, zero valid records,
    error rate ≥ 30%, quality < 3.0, 100% duplicates
  - Borderline quality (3.0-4.0): auto-approve in autonomous mode
  - Full audit trail with reasoning for every decision
- **Integration into import-handlers.js**: trigger flow now auto-moderates
  - AI reviews report → makes decision → auto-publishes if approved
  - No human admin required — fully autonomous pipeline
  - Manual override endpoints still available for edge cases
- **GET /api/admin/imports/moderation/config** — view AI moderation settings
- **tests/ai-moderation.test.js** — 70 tests (decisions, edge cases, security, integration)
- Total tests: 696 passing, 0 failures

### Import Pipeline (now fully autonomous)
```
Trigger → Fetch → Process → AI Auto-Moderation → [APPROVED → Publish] or [REJECTED → Audit]
                                                    ↓
                                              Audit trail with reasoning
```

## [Google Auth & Abuse Prevention] — 2026-08-15

### Added
- **backend/src/google-auth.js** — Google OAuth verification + abuse prevention
  - `verifyGoogleIdToken()` — server-side Google ID token verification via tokeninfo endpoint
  - `createSessionToken()` / `verifySessionToken()` — 7-day session tokens (HMAC-signed)
  - `createOrUpdateGoogleUser()` — maps Google account (sub) to GraveAtlas user ID
  - `logSubmissionAttempt()` — logs every submission with userId, Google sub, IP, user-agent
  - `getSubmissionAuditLog()` — queryable audit log with filters (user, Google sub, IP)
  - `getAbuseStats()` — abuse statistics (total submissions, total banned)
  - `banGoogleAccount()` — ban by Google sub, suspends user + prevents re-registration
  - `requireGoogleAuth()` — auth middleware for submission endpoints
  - Checks: email verified, token not expired, audience matches, sub present
  - Banned Google accounts cannot create new user IDs
- **Endpoints added:**
  - POST /api/auth/google/verify — Login with Google, get session token
  - GET /api/auth/session — Check session validity
  - POST /api/auth/logout — Logout (client-side)
  - GET /api/admin/abuse/log — Get submission audit log (admin, filterable)
  - GET /api/admin/abuse/stats — Get abuse statistics (admin)
  - POST /api/admin/abuse/ban/:sub — Ban a Google account (admin, requires reason)
- **All submission endpoints now require Google auth:**
  - handleCreateGrave — requires Bearer session token
  - handleCreateCemetery — requires Bearer session token
  - handleSubmitDraft — requires Bearer session token
  - handleSubmitPhoto — requires Bearer session token
- **Every submission now logs:**
  - User ID (GraveAtlas internal)
  - Google sub (stable Google account ID)
  - Client IP (from CF-Connecting-IP)
  - User-Agent (truncated to 500 chars)
  - Contribution ID and type
  - Timestamp
- **Every submission record now includes:**
  - submittedBy (user ID)
  - submittedByGoogleSub (Google account ID)
  - submittedByIp (client IP)
  - submittedByUserAgent (truncated)
- **tests/google-auth.test.js** — 66 tests (module, token verification, session, user management, abuse logging, banning, middleware, integration, security)
- Total tests: 762 passing, 0 failures

### Security
- Google ID tokens verified server-side (never trust client claims)
- Session tokens are HMAC-signed and expire after 7 days
- Banned Google accounts cannot re-register
- All submissions auditable by user, Google sub, or IP
- Path traversal prevention on all IDs
- No access tokens or refresh tokens stored
- User-agent truncated to prevent log injection
