# CHANGELOG

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
