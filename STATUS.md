# GraveAtlas Status

**Last Updated:** 2026-08-09
**Phase:** 2 — Cloudflare Worker + GitHub App Security Configuration
**Tests:** 99/99 passing
**Branch:** main

## Completed

### Phase 1 — Architecture & Foundation ✓
- Project structure (/app, /backend, /github, /docs, /scripts, /tests)
- Android data models (GraveRecord, GraveSubmission, SubmissionResponse)
- Android API client with all endpoints
- Cloudflare Worker backend with all API routes and validation
- JSON schemas (grave + cemetery)
- GitHub Actions data validation workflow
- Documentation set
- Environment configuration templates

### Phase 2 — GitHub App Security Configuration ✓
- GitHub App authentication (JWT → installation token → Contents API)
- PKCS#1/PKCS#8 private key compatibility
- Constant-time admin token comparison (timing attack prevention)
- Crypto-secure submission ID generation (crypto.getRandomValues)
- Path sanitization for all IDs (path traversal prevention)
- Rate limiting: 10 requests/minute/IP on POST endpoints (in-memory)
- Unexpected field rejection in submissions
- Request size limit enforcement (Content-Length + body size)
- CORS opt-in via ALLOWED_ORIGIN (no wildcard by default)
- Worker name fixed to `graveatlas` (matches deployed Worker)
- Android ApiClient default URL corrected to production endpoint
- GET /api/admin/reports endpoint added
- GET /api/admin/status endpoint added
- deleteFile function added to github.js
- GitHub branch parameter (ref) support in all API calls
- Reports excluded from admin submissions list
- Error responses sanitized (no internal details, proper HTTP codes)
- 502 for GitHub upstream errors, 429 for rate limited, 413 for oversized
- 99 backend tests (all passing)

### Documentation ✓
- docs/SECRETS.md — complete secrets configuration guide
- docs/GITHUB-APP.md — GitHub App setup (existing, verified)
- docs/CLOUDFLARE.md — Worker configuration (updated)
- docs/API.md — API documentation (updated with all endpoints)
- docs/SECURITY.md — Security design (updated with all Phase 2 measures)
- scripts/generate-admin-token.js — secure token generation script

### Security Audit ✓
- No private keys in repository
- No tokens in source code
- No .env files with real values
- No secrets in test output
- .gitignore covers .env, .pem, private_key files
- App ID redacted from STATUS.md
- Android app contains no server credentials

## Pending (Manual Steps Required)

### Cloudflare Secrets (User Must Configure)
1. `GITHUB_APP_ID` — via `wrangler secret put GITHUB_APP_ID`
2. `GITHUB_PRIVATE_KEY` — via `wrangler secret put GITHUB_PRIVATE_KEY`
3. `GITHUB_INSTALLATION_ID` — via `wrangler secret put GITHUB_INSTALLATION_ID`
4. `ADMIN_TOKEN` — generated, via `wrangler secret put ADMIN_TOKEN`

### Post-Deployment Verification
- Run `/api/health` to confirm GitHub configured
- Run `/api/admin/status` with ADMIN_TOKEN to verify admin access
- Submit a test grave via POST /api/graves
- Verify pending submission appears in GitHub repo
- Approve via admin endpoint
- Verify published grave appears in GET /api/graves

## Known Issues
- None
