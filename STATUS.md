# GraveAtlas Status

**Last Updated:** 2026-08-09
**Phase:** 3 — Android API Integration
**Tests:** 106 backend + 30 Android unit tests
**Branch:** main
**Version:** 1.1.0 (build 8)

## Completed

### Phase 1 — Architecture & Foundation ✓
- Project structure, data models, API client, backend, schemas, docs, tests

### Phase 2 — GitHub App Security Configuration ✓
- GitHub App auth, constant-time token comparison, crypto-secure IDs
- Path sanitization, rate limiting, CORS opt-in, 106 backend tests

### Phase 3 — Android API Integration ✓
- ApiClient updated with all endpoints (graves, cemeteries, submissions, health)
- ApiErrorHandler — HTTP code to user-friendly message mapping
- OfflineSubmissionManager — offline submission with exponential backoff
- LocalCache — 5-minute TTL cache for public data
- CemeteryRecord model added
- SearchFragment — debounced search (400ms), cache fallback, tap-to-detail
- CemeteryFragment — cemetery discovery with search and geo: intents
- GraveDetailFragment — full grave record view with map link
- MapFragment — location list with geo: intents (no paid map SDK)
- AddGraveFragment — review step before submission, offline support
- ContributeFragment — submission tracking, offline queue, status checking
- SettingsFragment — API health check, URL config, cache management
- HomeFragment — data summary from API, cemetery access
- AboutFragment — updated with Phase 3 architecture info
- Backend: 3 new endpoints (cemeteries, cemetery detail, submission status)
- 30 Android unit tests (models, error handler, JSON parsing)
- docs/ANDROID-API.md — complete integration documentation
- No server credentials in Android app
- No paid services added
- Existing functionality preserved

## Backend Endpoints

| Method | Path | Auth | Phase |
|--------|------|------|-------|
| GET | /api/health | None | P2 |
| GET | /api/graves | None | P2 |
| POST | /api/graves | Rate-limited | P2 |
| GET | /api/graves/:id | None | P2 |
| POST | /api/graves/:id/report | Rate-limited | P2 |
| GET | /api/cemeteries | None | P3 |
| GET | /api/cemeteries/:id | None | P3 |
| GET | /api/submissions/:id | None | P3 |
| GET | /api/admin/submissions | Admin | P2 |
| GET | /api/admin/reports | Admin | P2 |
| GET | /api/admin/status | Admin | P2 |
| POST | /api/admin/submissions/:id/approve | Admin | P2 |
| POST | /api/admin/submissions/:id/reject | Admin | P2 |

## Pending (Manual Steps)

### Cloudflare Secrets (if not yet configured)
- GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_INSTALLATION_ID, ADMIN_TOKEN

### Post-Deployment Verification
- Test health endpoint: `curl https://graveatlas.putraworks-2026.workers.dev/api/health`
- Test cemeteries endpoint: `curl https://graveatlas.putraworks-2026.workers.dev/api/cemeteries`
- Test submission status: `curl https://graveatlas.putraworks-2026.workers.dev/api/submissions/sub_test`

### Android Build
- GitHub Actions CI will build APK automatically on push
- Verify unit tests pass in CI
- Download APK from GitHub Releases

## Known Issues
- None
