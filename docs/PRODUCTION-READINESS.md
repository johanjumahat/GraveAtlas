# Production Readiness

**Last updated:** 2026-08-09
**Status:** READY (pending Android build verification)

## Architecture

```
Android App (HTTPS)
    ↓
Cloudflare Worker (API gateway)
    ↓
GitHub App (installation token)
    ↓
GitHub Repository (graveatlas-data)
```

## Production Configuration

| Setting | Value |
|---------|-------|
| Application ID | com.putraworks.graveatlas |
| Version | 4.4.1 (code 40) |
| Production API | https://graveatlas.putraworks-2026.workers.dev |
| Data repository | putraworks2026/graveatlas-data (public) |
| App repository | putraworks2026/GraveAtlas (private) |
| Min SDK | 24 (Android 7.0) |
| Target SDK | 34 (Android 14) |

## Security Posture

- No secrets in Android source, resources, or configuration
- No secrets in public data repository
- All GitHub credentials server-side (Worker env vars only)
- Admin authentication via Bearer token with safe comparison
- Rate limiting: 10/min default, 60/min search, 30/min admin
- Input validation: JSON structure, field lengths, coordinate bounds, date formats
- CORS configurable via ALLOWED_ORIGIN env var
- No analytics, tracking, or telemetry
- No cleartext traffic (usesCleartextTraffic=false)

## Known Limitations

1. No full-text search index — search scans GitHub files sequentially
2. GitHub API rate limit: 5,000 requests/hour (installation token)
3. Worker isolate memory: 128 MB
4. Map uses Android geo: intent, not custom clustering
5. Import admin UI not built in Android (backend logic exists)

## Pre-Deployment Checklist

See docs/PRODUCTION-CHECKLIST.md
