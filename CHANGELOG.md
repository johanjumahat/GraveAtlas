# CHANGELOG

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
