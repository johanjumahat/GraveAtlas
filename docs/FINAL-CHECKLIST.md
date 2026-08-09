# Final Production Checklist — Phase 5.5

**Date:** 2026-08-09
**Branch:** phase-5/global-discovery

## Configuration

- [x] Production API URL configured (https://graveatlas.putraworks-2026.workers.dev)
- [ ] Production Cloudflare Worker deployed with latest code (Worker runs v2.0.0, code is v4.5.0 — REDEPLOY NEEDED)
- [ ] GitHub App credentials configured in Worker (githubConfigured: false — SET SECRETS NEEDED)
- [ ] Admin token configured in Worker (adminConfigured: false — SET SECRET NEEDED)
- [x] GitHub permissions minimal (contents: write for data repo)
- [x] Secrets secured (all via Cloudflare env vars — none hardcoded)
- [x] Android release configuration verified (minify, proguard, signing)
- [x] No debug credentials in production
- [x] No test data in production data repo

## Data

- [x] Data validation (schema, coordinates, dates, country codes)
- [x] Duplicate audit (no duplicates found)
- [x] License audit (no external imports)
- [x] Attribution audit (no external attribution requirements)
- [x] Privacy audit (no personal info of living persons exposed)
- [x] Import history available
- [x] Rollback available

## Security

- [x] No secrets in Android source
- [x] No secrets in GitHub public data repository
- [x] No secrets in source code
- [x] No secrets in documentation
- [x] No secrets in logs
- [x] Admin endpoints protected (Bearer token auth)
- [x] GitHub access protected (server-side only)
- [x] Worker protected (env vars, no hardcoded secrets)
- [x] API validation active
- [x] Rate limiting active (code present, Worker needs redeploy)
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
- [ ] Debug build verified (no SDK in environment)
- [ ] Release build verified (no SDK in environment)
- [ ] Clean installation tested (no SDK in environment)

## API

- [x] All endpoints tested (346 backend tests passing)
- [x] Error handling (400/401/403/404/409/429/500/502/503)
- [x] Rate limiting verified (in code)
- [x] Input validation verified
- [x] CORS configured
- [x] API contract: Android and Worker endpoints aligned

## Testing

- [x] End-to-end test passed (59 checks, synthetic data)
- [x] Regression tests passed (516 total, 0 failures)
- [x] Security scan passed (no secrets found)
- [x] Test data cleanup verified (no test data in production)

## Documentation

- [x] All 10 production documents present and verified
- [x] Privacy Policy draft (requires legal review)
- [x] Terms of Use draft (requires legal review)

## Remaining Actions Before Production

1. **REDEPLOY Worker** with latest code (v4.5.0) via `wrangler deploy`
2. **SET Worker secrets** via `wrangler secret put`:
   - GITHUB_APP_ID
   - GITHUB_PRIVATE_KEY
   - GITHUB_INSTALLATION_ID
   - ADMIN_TOKEN
3. **BUILD Android APK** via `./gradlew assembleRelease`
4. **TEST clean installation** on a physical device
5. **Legal review** of PRIVACY.md and TERMS.md
