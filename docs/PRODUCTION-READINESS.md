# GraveAtlas Production Readiness — Phase 3.5

**Last Verified:** 2026-08-09
**Worker URL:** https://graveatlas.putraworks-2026.workers.dev
**Repository:** putraworks2026/GraveAtlas
**Data Repository:** putraworks2026/graveatlas-data

## Architecture

```
Android App (HTTPS)
    ↓
Cloudflare Worker (graveatlas)
    ↓
GitHub App Authentication (JWT → Installation Token)
    ↓
GitHub API (api.github.com)
    ↓
putraworks2026/graveatlas-data repository
    ├── graves/      (published records)
    ├── cemeteries/  (cemetery data)
    ├── pending/     (unverified submissions + reports)
    └── schema/      (JSON schemas)
```

## Worker Health

- **Endpoint:** `GET /api/health`
- **HTTPS only** — no HTTP downgrade
- **Response:** JSON with `status`, `service`, `version`, `githubConfigured`, `adminConfigured`, `timestamp`
- **No secrets exposed** in health response or any API response
- **CORS:** Only `Allow-Methods` and `Allow-Headers` set; `Allow-Origin` only if `ALLOWED_ORIGIN` env var is configured
- **No wildcard CORS** — Android native clients don't need CORS

## Secrets (by NAME ONLY — never in source)

| Secret Name | Where Set | Purpose |
|-------------|-----------|---------|
| GITHUB_APP_ID | `wrangler secret put` | GitHub App identifier |
| GITHUB_PRIVATE_KEY | `wrangler secret put` | PEM private key for JWT signing |
| GITHUB_INSTALLATION_ID | `wrangler secret put` | GitHub App installation ID |
| ADMIN_TOKEN | `wrangler secret put` | Admin endpoint authentication |
| ALLOWED_ORIGIN | `wrangler secret put` (optional) | CORS origin for web admin UI |

Non-secret env vars (in `wrangler.toml`):
- `GITHUB_OWNER` = "putraworks2026"
- `GITHUB_REPO` = "graveatlas-data"
- `GITHUB_BRANCH` = "main"

## Authentication

### GitHub App Authentication
1. Worker generates JWT from `GITHUB_APP_ID` + `GITHUB_PRIVATE_KEY`
2. JWT expires in 10 minutes (with 1-minute clock skew tolerance)
3. JWT is exchanged for an installation access token
4. Installation token is cached for 50 minutes (tokens expire in ~60 minutes)
5. Token is used for all GitHub API calls
6. Token is **never** returned to the Android client
7. Token is **never** written to GitHub
8. Token is **never** printed to logs
9. No GitHub Personal Access Token is used

### Admin Authentication
1. Admin endpoints require `Authorization: Bearer <ADMIN_TOKEN>`
2. Token comparison uses constant-time comparison (timing attack prevention)
3. Missing token → 401, Invalid token → 403, No ADMIN_TOKEN env → 401
4. ADMIN_TOKEN is server-side only — never in Android, never in API responses

## Repository Access Control

- Repository owner and name are hardcoded via `wrangler.toml` env vars
- Client **cannot** provide: repository owner, repository name, branch, or arbitrary GitHub API endpoints
- All file paths are constructed server-side from sanitized IDs
- The Worker can only access `putraworks2026/graveatlas-data`

## Submission Workflow

```
SUBMITTED → POST /api/graves
    ↓
PENDING → Written to pending/ directory in graveatlas-data
    ↓
ADMIN REVIEW → GET /api/admin/submissions (requires ADMIN_TOKEN)
    ↓
APPROVED → POST /api/admin/submissions/:id/approve
    ↓ → Moves from pending/ to graves/, status = "published"
    ↓
PUBLISHED → Visible in GET /api/graves

OR

REJECTED → POST /api/admin/submissions/:id/reject
    ↓ → Updates status to "rejected" in pending/ (auditable)
```

Submissions are **never** auto-published.

## Idempotency

- POST /api/graves accepts an `Idempotency-Key` header
- If the same key is seen within 1 hour, the original submission ID is returned
- Prevents duplicate records from network retries
- Android generates a UUID per submission; OfflineSubmissionManager uses its localId for retries
- If no key is provided, a new submission is created each time (backward compatible)

## Pagination

- GET /api/graves and GET /api/cemeteries support `?limit=N&offset=M` query parameters
- Default limit: 100, Maximum limit: 500
- Response includes `total`, `count`, `limit`, `offset`, `hasMore`
- Prevents downloading the entire dataset when it grows large

## Rate Limiting

- In-memory per Worker isolate
- 10 requests per minute per IP for POST endpoints (submissions, reports)
- GET endpoints are not rate limited (read-only, cached)
- Returns HTTP 429 when limit exceeded
- **Limitation:** Per-isolate rate limiting may not catch floods across multiple Cloudflare isolates

## Input Validation (Server-Side)

The Worker performs authoritative validation on all inputs:
- Malformed JSON → 400
- Missing required fields → 400
- Unexpected fields → 400
- Excessive string length (name > 500, fields > 2000, report > 5000) → 400
- Oversized payload (> 50KB) → 413
- Invalid coordinates (lat not -90..90, lon not -180..180) → 400
- Invalid dates (not YYYY-MM-DD) → 400
- Path traversal (../, absolute paths, .git/, etc.) → 400
- IDs are sanitized with `sanitizePathSegment()` — only alphanumeric, dash, underscore, dot

## Path Traversal Protection

- `sanitizePathSegment()` strips all characters except `[a-zA-Z0-9._-]`
- Rejects IDs containing `..`, starting with `.`, or containing `/`
- The Worker generates all file paths — the client never directly selects a GitHub path

## Offline Behavior (Android)

- Submissions that fail due to network issues are saved locally in SharedPreferences
- User is informed: "Your submission has been saved and will be sent when you're connected"
- Exponential backoff: 30s, 60s, 120s, 300s, 600s (max 5 retries)
- User can manually retry from the ContributeFragment
- Each submission uses the localId as the idempotency key for safe retry
- Successful submissions are removed from the retry queue

## Error Handling

Android displays user-friendly messages for all error types:
- 400: "Your submission contains invalid information..."
- 401: "Authentication required."
- 403: "Access denied."
- 404: "The requested record was not found."
- 429: "Too many requests. Please wait a moment..."
- 500/502/503: "The server is temporarily unavailable..."
- Timeout: "The request timed out. Please try again."
- DNS failure: "Unable to reach the server. You may be offline."
- Offline: "You're offline. Your submission has been saved..."

Error messages **never** expose: stack traces, GitHub API internals, Cloudflare internals, tokens, keys, or credentials.

## CORS and HTTPS

- Production API uses HTTPS only (Cloudflare enforces TLS)
- CORS is opt-in: `Access-Control-Allow-Origin` only set if `ALLOWED_ORIGIN` env var is configured
- Android native clients don't need CORS (no browser origin)
- OPTIONS requests return CORS headers with no body

## Privacy

The Android app collects:
- **Location:** Only when the user is adding a grave (with explicit permission)
- **Submission data:** Name, dates, cemetery, coordinates, notes (all user-entered)
- **No background location tracking**
- **No device identifiers** sent to the Worker
- **No contacts, SMS, call logs, or unrelated personal data**

Android permissions:
- INTERNET — API communication
- ACCESS_FINE_LOCATION — GPS when adding graves (user-triggered)
- ACCESS_COARSE_LOCATION — Fallback location
- RECORD_AUDIO — AI Chat feature (existing)
- POST_NOTIFICATIONS — Future notification features

## Data Integrity

- Each submission gets a crypto-secure random ID (`sub_<24 hex chars>`)
- IDs are unique by construction (12 random bytes)
- File paths are deterministic: `pending/<id>.json` and `graves/<id>.json`
- The `writeFile` function checks for existing files (gets SHA) to support idempotent updates
- Concurrent submissions with different data get different IDs — no collision
- Same idempotency key with same data returns the same ID — no duplicate

## Backup and Recovery

- All data is in the `putraworks2026/graveatlas-data` GitHub repository
- Git history provides full audit trail and recovery
- To revert a bad commit: `git revert <commit-sha>` in the data repo
- To recover a deleted file: `git checkout <commit-sha> -- <file>` in the data repo
- GitHub's infrastructure provides redundancy
- No expensive backup system needed — Git history is the backup

## Observability

Worker logs (via `wrangler tail`) contain:
- Request method and path
- Response status codes
- Timing information
- Safe error categories ("GitHub upstream error", "Validation failed")

Worker logs **never** contain:
- Private keys
- GitHub tokens (JWT or installation tokens)
- ADMIN_TOKEN
- User personal data
- Stack traces with internal paths

## Test Results

- **Backend tests:** 140 passed, 0 failed
  - 106 original (Phase 2) + 34 new (Phase 3.5)
  - Covers: health, validation, auth, path traversal, rate limiting, idempotency, pagination, security, privacy
- **Android unit tests:** 45 tests (30 original + 15 new)
  - Covers: models, error handling, JSON parsing, UUID generation, pagination, security
- **GitHub Actions CI:** Runs unit tests, lint, and builds APK on every push to main
