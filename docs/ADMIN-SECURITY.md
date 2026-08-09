# GraveAtlas Admin Security

## Overview

All administrative functions are protected by authentication, authorization, and rate limiting. Admin credentials are never exposed to the public Android application.

## Authentication

### Bearer Token Authentication

All admin endpoints require the `Authorization: Bearer <ADMIN_TOKEN>` header.

```http
GET /api/admin/dashboard
Authorization: Bearer <your-admin-token>
```

### Token Storage

- `ADMIN_TOKEN` is stored as a Cloudflare Worker secret
- Set via: `npx wrangler secret put ADMIN_TOKEN`
- Encrypted at rest by Cloudflare
- Only available in the Worker runtime
- Never printed in API responses
- Never logged
- Never included in the Android app

### Constant-Time Comparison

Token comparison uses constant-time comparison to prevent timing attacks:

```javascript
function safeTokenCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing `Authorization` header or `ADMIN_TOKEN` not configured |
| 403 | Token present but incorrect |

## Authorization

### Admin-Only Actions

The following actions require admin authentication:
- Viewing the moderation queue
- Approving/rejecting submissions
- Approving/rejecting corrections
- Resolving/rejecting reports
- Viewing audit events
- Viewing contributor statistics
- Running data quality checks
- Restoring archived/removed records
- Viewing the admin dashboard

### Public Actions (No Auth Required)

- Viewing published graves and cemeteries
- Searching
- Viewing cemetery details
- Submitting graves, cemeteries, corrections, and reports
- Checking submission/correction status (by ID)

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Public submissions (POST) | 10 requests/minute/IP |
| Reports (POST) | 10 requests/minute/IP |
| Search (GET) | 60 requests/minute/IP |
| Admin APIs | 30 requests/minute/IP |

Rate-limited requests return HTTP 429 with `{ "success": false, "error": "Too many requests" }`.

## Security Checklist

| Check | Status |
|-------|--------|
| No GitHub private key in Android | ✓ Verified |
| No GitHub installation token in Android | ✓ Verified |
| No ADMIN_TOKEN in Android | ✓ Verified |
| No Cloudflare secret in Android | ✓ Verified |
| No credentials in public data | ✓ Verified |
| No secrets in documentation | ✓ Verified (GITHUB-APP.md references format only, not actual keys) |
| No secrets in logs | ✓ Verified |
| No arbitrary GitHub path from clients | ✓ Verified |
| No arbitrary repository from clients | ✓ Verified |
| Admin endpoints protected | ✓ All 17 routes use requireAdmin |
| Moderation endpoints protected | ✓ All governance routes use requireAdmin |
| State transitions server-validated | ✓ isValidTransition() enforces state machine |

## Secret Rotation

### Rotating ADMIN_TOKEN

1. Generate a new token: `node scripts/generate-admin-token.js`
2. Update the Cloudflare secret: `npx wrangler secret put ADMIN_TOKEN`
3. Update your password manager
4. The old token immediately stops working

### Rotating GitHub App Private Key

1. Generate a new key in GitHub App settings
2. Update: `npx wrangler secret put GITHUB_PRIVATE_KEY`
3. Delete the old key in GitHub
4. Verify: `curl https://graveatlas.putraworks-2026.workers.dev/api/health`

## What NEVER Goes in the Android App

- `GITHUB_APP_ID`
- `GITHUB_PRIVATE_KEY`
- `GITHUB_INSTALLATION_ID`
- `ADMIN_TOKEN`
- GitHub installation tokens
- Cloudflare API tokens
- Any secret or credential

The Android app only knows the public Worker URL. All sensitive operations go through the Worker.

## Audit Trail

All admin actions are recorded in the audit trail. See [docs/AUDIT-TRAIL.md](AUDIT-TRAIL.md).
