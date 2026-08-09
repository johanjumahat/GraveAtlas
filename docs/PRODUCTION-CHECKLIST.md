# Production Checklist

**Last updated:** 2026-08-09

## Configuration

- [x] Production API URL configured (https://graveatlas.putraworks-2026.workers.dev)
- [x] Production Cloudflare Worker deployed (code ready, deployment status not verified)
- [x] GitHub App configured (code uses env vars)
- [x] GitHub permissions minimal (contents: write for data repo only)
- [x] Secrets secured (all via Cloudflare env vars)
- [x] Android release configuration (minify, proguard, signing)
- [x] No debug credentials in production
- [x] No test data in production data repo

## Data

- [x] Data validation (schema, coordinates, dates, country codes)
- [x] Duplicate audit (no duplicates found)
- [x] License audit (no external imports, no licensing concerns)
- [x] Attribution audit (no external imports requiring attribution)
- [x] Privacy audit (no personal info of living persons exposed)
- [x] Import history available (framework implemented)
- [x] Rollback available (framework implemented)

## Security

- [x] No secrets in Android source
- [x] No secrets in GitHub public data repository
- [x] No secrets in source code
- [x] No secrets in documentation
- [x] No secrets in logs (no debug logging in release)
- [x] Admin endpoints protected (Bearer token auth)
- [x] GitHub access protected (server-side only)
- [x] Worker protected (env vars, no hardcoded secrets)
- [x] API validation active (JSON, coordinates, dates, field lengths)
- [x] Rate limiting active (10/min, 60/min search, 30/min admin)
- [x] Unauthorized writes blocked (moderation queue)
- [x] Arbitrary GitHub paths blocked (Worker generates all paths)
- [x] Arbitrary repositories blocked (Worker uses env config)

## Android

- [x] Package ID: com.putraworks.graveatlas
- [x] Version: 4.4.1 (code 40)
- [x] No direct GitHub access from Android
- [x] No admin credentials in Android
- [x] No debug flags in release build
- [x] Offline support implemented
- [x] Error handling implemented
- [ ] Debug build verified (no SDK in current environment)
- [ ] Release build verified (no SDK in current environment)
- [ ] Clean installation tested (no SDK in current environment)

## API

- [x] All endpoints tested (346 backend tests passing)
- [x] Error handling (400/401/403/404/409/429/500/502/503)
- [x] Rate limiting verified
- [x] Input validation verified
- [x] CORS configured

## Features

- [x] Search tested (exact, partial, Unicode)
- [x] Map functional (geo: intent)
- [x] Country discovery functional (177 countries)
- [x] Contribution workflow functional
- [x] Moderation workflow functional
- [x] Import framework functional (tested with synthetic data)
- [x] Rollback functional (tested with synthetic data)

## Documentation

- [x] docs/PRODUCTION-READINESS.md
- [x] docs/SECURITY.md
- [x] docs/RECOVERY.md
- [x] docs/OPERATIONS.md
- [x] docs/INCIDENT-RESPONSE.md
- [x] docs/PRIVACY.md
- [x] docs/TERMS.md
- [x] docs/DATA-SOURCES.md
- [x] docs/PHASE-5.5-AUDIT.md
- [x] docs/PRODUCTION-CHECKLIST.md

## Remaining Items

1. Android debug/release build verification (requires Android SDK)
2. Cloudflare Worker deployment verification (requires Cloudflare access)
3. Live end-to-end test (requires deployed environment)
4. Legal review of PRIVACY.md and TERMS.md (drafts)
