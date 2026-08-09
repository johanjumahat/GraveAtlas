# GraveAtlas Security Design

## Principles

1. **No secrets in the Android app** — GitHub credentials never touch the app
2. **GitHub App authentication** — not personal access tokens
3. **Moderation before publication** — no unverified data goes public
4. **Input validation on every request** — reject invalid data early
5. **Minimal permissions** — only request what the app needs

## Threat Model

### Spam
- **Mitigation:** Rate limiting per IP (future: Cloudflare KV)
- **Mitigation:** Request size limit (50KB)
- **Mitigation:** Field length limits

### Duplicate submissions
- **Mitigation:** Duplicate detection in GitHub Actions
- **Mitigation:** Unique ID enforcement in schema validation
- **Future:** Content-based similarity check (name + cemetery + dates)

### Oversized requests
- **Mitigation:** 50KB total request limit
- **Mitigation:** Per-field length limits (name: 500, text fields: 2000)

### Invalid JSON
- **Mitigation:** JSON parse error handling in backend
- **Mitigation:** Proper Content-Type validation

### Invalid GPS coordinates
- **Mitigation:** Latitude range check (-90 to 90)
- **Mitigation:** Longitude range check (-180 to 180)

### Invalid dates
- **Mitigation:** YYYY-MM-DD format validation
- **Mitigation:** Date parse verification

### Malicious input
- **Mitigation:** Input sanitization before storage
- **Mitigation:** No SQL/NoSQL injection surface (JSON files only)
- **Mitigation:** GitHub Actions re-validates before publication

### Unauthorized admin access
- **Mitigation:** Bearer token required for admin endpoints
- **Mitigation:** Token stored as Cloudflare secret (not in code)
- **Future:** JWT with expiration

### GitHub credential exposure
- **Mitigation:** Credentials stored only in Cloudflare Worker secrets
- **Mitigation:** Never logged in error messages
- **Mitigation:** Never sent to Android app
- **Mitigation:** GitHub App uses installation tokens (short-lived)

### API abuse
- **Mitigation:** Rate limiting (future)
- **Mitigation:** CORS restrictions (configurable)
- **Future:** Cloudflare WAF rules

## Android Permissions

The Android app requests only:
- `INTERNET` — to communicate with the backend API
- `ACCESS_FINE_LOCATION` — for GPS when adding graves (optional)
- `ACCESS_COARSE_LOCATION` — fallback location
- `POST_NOTIFICATIONS` — for future notification features

The app does NOT request:
- Contacts, SMS, call logs, camera (photos uploaded via backend), storage (photos uploaded via backend)

## Secret Management

| Secret | Stored In | Used By |
|--------|-----------|---------|
| GITHUB_APP_ID | Cloudflare secret | Backend |
| GITHUB_PRIVATE_KEY | Cloudflare secret | Backend |
| GITHUB_INSTALLATION_ID | Cloudflare secret | Backend |
| ADMIN_TOKEN | Cloudflare secret | Backend |
| API_BASE_URL | Android SharedPreferences | App (not secret) |

## What NOT to do

- Never put GitHub tokens in Android code
- Never commit `.env` files with real values
- Never log secrets or tokens
- Never expose admin endpoints without authentication
- Never auto-publish user submissions
- Never store user passwords (no user auth in Phase 1)
