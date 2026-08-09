# GraveAtlas Status

**Last Updated:** 2026-08-09
**Phase:** 2 — Architecture & Foundation + Navigation & GitHub Integration
**Tests:** 24/24 passing
**Branch:** main

## Completed

### Phase 1 — Architecture & Foundation ✓
- Project structure (/app, /backend, /github, /docs, /scripts, /tests)
- Android data models (GraveRecord, GraveSubmission, SubmissionResponse)
- Android API client with all endpoints
- Cloudflare Worker backend with all API routes and validation
- JSON schemas (grave + cemetery)
- GitHub Actions data validation workflow
- 8 documentation files
- Environment configuration templates
- 20 backend tests

### Phase 2 — Navigation & GitHub Integration ✓
- Android BottomNavigationView (Home, Search, Map, Add, Mine)
- Functional Home screen with quick action buttons
- Functional Search screen with live API filtering
- Functional Add Grave form with validation and submission
- GitHub App authentication module (JWT → installation token)
- Backend writes submissions to pending/ in graveatlas-data repo
- Backend reads published graves from graves/
- Full moderation workflow (approve/reject)
- Report correction workflow
- 24 backend tests (all passing)
- graveatlas-data repository created and structured
- All kubur-sg references renamed to graveatlas

## Repositories
- **GraveAtlas** (app + backend): `putraworks2026/GraveAtlas` (private)
- **graveatlas-data** (database): `putraworks2026/graveatlas-data` (private)

## Still Missing
- Cloudflare Worker deployment (requires Cloudflare account)
- GitHub App creation and private key
- Cloudflare secrets (GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_INSTALLATION_ID, ADMIN_TOKEN)
- Map SDK integration (OSM or Google Maps)
- Photo capture and upload
- User authentication
- Rate limiting with Cloudflare KV
- Search index generation

## Secrets Required (via `wrangler secret put`)
1. GITHUB_APP_ID
2. GITHUB_PRIVATE_KEY
3. GITHUB_INSTALLATION_ID
4. ADMIN_TOKEN

## Next Steps
1. Create GitHub App (Settings → Developer settings → GitHub Apps)
2. Deploy Cloudflare Worker (`cd backend && npx wrangler deploy`)
3. Set Cloudflare secrets
4. Configure Android API base URL in Settings
5. Phase 3: Map SDK, photo upload, user auth
