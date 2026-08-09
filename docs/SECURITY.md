# Security

**Last updated:** 2026-08-09

## Architecture Security

### Android → Worker
- Android app never contacts GitHub directly
- All API calls go through Cloudflare Worker
- HTTPS only (usesCleartextTraffic=false)
- No credentials stored in Android app

### Worker → GitHub
- GitHub App authentication via installation token
- All credentials stored as Worker env vars (server-side)
- No client-supplied repository, branch, or path values accepted
- Worker generates all file paths internally

## Authentication

| Endpoint Type | Auth Method |
|---------------|------------|
| Public (GET) | None |
| Submit (POST) | Rate-limited, no auth |
| Admin (all) | Bearer token via requireAdmin() |

Admin token comparison uses constant-time comparison to prevent timing attacks.

## Rate Limiting

| Tier | Limit | Scope |
|------|-------|-------|
| Default | 10 requests/min | Per IP |
| Search | 60 requests/min | Per IP |
| Admin | 30 requests/min | Per IP |

Rate limiting is in-memory per Worker isolate.

## Input Validation

- JSON body parsing with error handling
- Field length limits (500 chars default, 50KB max request)
- Coordinate bounds (-90/90 lat, -180/180 lon)
- Date format validation (YYYY-MM-DD)
- Country code validation (ISO 3166-1 alpha-2)
- URL format validation
- Unexpected fields rejected

## Secrets Management

All secrets are stored as Cloudflare Worker environment variables:
- GITHUB_APP_ID
- GITHUB_PRIVATE_KEY
- GITHUB_INSTALLATION_ID
- GITHUB_OWNER
- GITHUB_REPO
- GITHUB_BRANCH
- ADMIN_TOKEN
- ALLOWED_ORIGIN

No secrets are hardcoded in source code, tests, or documentation.

## Known Security Considerations

1. Rate limiting is per-Worker-isolate (not global). A determined attacker could hit different isolates.
2. Admin token is a static bearer token (no rotation, no expiry). Consider implementing token rotation for production.
3. No CSRF protection on POST endpoints (API-only, no cookies). Acceptable for current architecture.
