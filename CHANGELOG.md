# CHANGELOG

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

### Remaining
- Android APK build verification (build triggered, awaiting result)

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
