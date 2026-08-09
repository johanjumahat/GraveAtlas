# GraveAtlas Security Design

## Principles

1. **No secrets in the Android app** — GitHub credentials never touch the app
2. **GitHub App authentication** — not personal access tokens
3. **Moderation before publication** — no unverified data goes public
4. **Input validation on every request** — reject invalid data early
5. **Minimal permissions** — only request what the app needs
6. **Constant-time token comparison** — prevents timing attacks on admin auth
7. **Path sanitization** — prevents path traversal in file operations
8. **Crypto-secure ID generation** — no Math.random() for submission IDs
9. **Rate limiting** — prevents abuse on submission endpoints
10. **No wildcard CORS** — CORS disabled by default, opt-in via ALLOWED_ORIGIN

## Threat Model

### Spam / Automated Abuse
- **Mitigation:** Rate limiting — 10 requests/minute/IP on POST endpoints (in-memory, per Worker isolate)
- **Mitigation:** Request size limit (50KB, enforced via Content-Length header)
- **Mitigation:** Field length limits (name: 500, text fields: 2000)
- **Mitigation:** Unexpected field rejection (only known fields accepted)

### Path Traversal
- **Mitigation:** All IDs are sanitized via `sanitizePathSegment()` — only alphanumeric, dash, underscore, dot allowed
- **Mitigation:** Double-dot sequences (`..`) rejected
- **Mitigation:** Leading dots rejected
- **Mitigation:** Server controls all file paths — client never specifies arbitrary paths
- **Mitigation:** Only allowed directories: `pending/`, `graves/`

### Duplicate Submissions
- **Mitigation:** Idempotency-Key header support on POST /api/graves (Phase 3.5)
- **Mitigation:** In-memory idempotency cache (1-hour TTL, per Worker isolate)
- **Mitigation:** Duplicate detection in GitHub Actions validation
- **Mitigation:** Unique ID enforcement in schema validation
- **Mitigation:** Crypto-secure ID generation prevents ID collisions
- **Mitigation:** Android OfflineSubmissionManager uses stable localId as idempotency key for retries

### Invalid GPS Coordinates
- **Mitigation:** Latitude range check (-90 to 90)
- **Mitigation:** Longitude range check (-180 to 180)
- **Mitigation:** NaN detection via parseFloat + isNaN

### Invalid Dates
- **Mitigation:** YYYY-MM-DD format regex validation
- **Mitigation:** Date parse verification via JavaScript Date

### Malicious Input
- **Mitigation:** Input sanitization before storage
- **Mitigation:** No SQL/NoSQL injection surface (JSON files only)
- **Mitigation:** GitHub Actions re-validates before publication
- **Mitigation:** Content-Type validation
- **Mitigation:** Malformed JSON rejection

### Unauthorized Admin Access
- **Mitigation:** Bearer token required for all admin endpoints
- **Mitigation:** Token stored as Cloudflare secret (not in code)
- **Mitigation:** Constant-time comparison (prevents timing attacks)
- **Mitigation:** No partial-match information in error responses
- **Mitigation:** Generic error messages ("Unauthorized" / "Forbidden")

### GitHub Credential Exposure
- **Mitigation:** Credentials stored only in Cloudflare Worker secrets
- **Mitigation:** Never logged in error messages (errors sanitized)
- **Mitigation:** Never sent to Android app
- **Mitigation:** GitHub App uses short-lived installation tokens (1 hour max)
- **Mitigation:** Token cached in memory only, never persisted

### API Response Leaks
- **Mitigation:** Error responses return generic messages only
- **Mitigation:** No GitHub API URLs in client responses
- **Mitigation:** No stack traces in responses
- **Mitigation:** No environment variable names in responses
- **Mitigation:** No GitHub tokens or ADMIN_TOKEN in responses
- **Mitigation:** Health endpoint reports boolean flags only (githubConfigured, adminConfigured)

## Android Security

The Android app contains NO server credentials:

| Credential | In Android? | Storage Location |
|-----------|------------|------------------|
| GITHUB_APP_ID | ❌ No | Cloudflare secret |
| GITHUB_PRIVATE_KEY | ❌ No | Cloudflare secret |
| GITHUB_INSTALLATION_ID | ❌ No | Cloudflare secret |
| ADMIN_TOKEN | ❌ No | Cloudflare secret |
| GitHub access token | ❌ No | Runtime only (Worker memory) |
| Cloudflare API token | ❌ No | Not used by app |

The Android app communicates only with:
- `https://graveatlas.putraworks-2026.workers.dev` (configurable via Settings)

The app does NOT contain credentials in:
- BuildConfig
- strings.xml
- resources/
- assets/
- local JSON files
- obfuscated code
- SharedPreferences (only the non-secret API base URL is stored)

## Android Permissions

The Android app requests only:
- `INTERNET` — to communicate with the backend API
- `ACCESS_FINE_LOCATION` — for GPS when adding graves (user-triggered, optional)
- `ACCESS_COARSE_LOCATION` — fallback location
- `RECORD_AUDIO` — AI Chat feature (existing)
- `POST_NOTIFICATIONS` — for future notification features

No permissions for: contacts, SMS, call logs, camera, storage, or background location.

## Secret Management

| Secret | Stored In | Used By | In Android? |
|--------|-----------|---------|-------------|
| GITHUB_APP_ID | Cloudflare secret | Backend Worker | No |
| GITHUB_PRIVATE_KEY | Cloudflare secret | Backend Worker | No |
| GITHUB_INSTALLATION_ID | Cloudflare secret | Backend Worker | No |
| ADMIN_TOKEN | Cloudflare secret | Backend Worker | No |
| ALLOWED_ORIGIN | Cloudflare secret | Backend Worker | No |
| API_BASE_URL | Android SharedPreferences | Android App | Not secret |

## Pagination (Phase 3.5)

GET endpoints support `?limit=N&offset=M`:
- Default limit: 100, Maximum: 500
- Response includes `total`, `count`, `limit`, `offset`, `hasMore`
- Prevents unbounded data transfer as dataset grows

## What NOT to Do

- Never put GitHub tokens in Android code
- Never commit `.env` files with real values
- Never log secrets or tokens
- Never expose admin endpoints without authentication
- Never auto-publish user submissions
- Never store user passwords (no user auth in Phase 2)
- Never use `Access-Control-Allow-Origin: *` (CORS is opt-in)
- Never use `Math.random()` for security-relevant IDs
- Never use `===` for token comparison (use constant-time)
- Never allow client-specified file paths
