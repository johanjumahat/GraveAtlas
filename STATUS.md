# GraveAtlas — Status

**Last updated:** 2026-08-11
**Version:** 7.1.1 (Phase 7B)
**Repository:** putraworks2026/GraveAtlas
**Data repo:** putraworks2026/graveatlas-data
**Worker:** graveatlas.putraworks-2026.workers.dev

---

## Current Phase: Phase 2 Gap Closure (post-audit)

### Phase Audit (2026-08-11)

A full audit was conducted against all 8 phase master prompt specifications. The audit found the codebase is significantly more mature than initially assessed.

| Phase | Title | Completion | Status |
|-------|-------|------------|--------|
| 1 | Project Architecture & Foundation | ~100% | ✅ Complete (audit gaps closed 2026-08-11) |
| 2 | Core Data, Search, Map & Public Discovery | ~100% | ✅ Complete (audit gaps closed 2026-08-11) |
| 3 | Contributions, Auth, Moderation & Data Quality | ~80% | Substantially complete |
| 4 | GitHub Publication, Data Pipeline & Release | ~50% | Partial |
| 5 | Advanced Search, Discovery & UX | ~75% | Substantially complete |
| 6 | Security, Privacy & Hardening | ~45% | Partial |
| 7 | Reliability, Observability, CI/CD & Ops | ~35% | Early stage |
| 8 | Production Release, Store Readiness & Launch | ~5% | Not started |

### Phase 1 Gap Closure (2026-08-11)

Closed all remaining Phase 1 acceptance gate gaps:
- `docs/DATA-SCHEMA.md` — all 6 schema entities documented
- `docs/CONTRIBUTION-WORKFLOW.md` — full contribution/moderation workflow
- `docs/DEVELOPMENT.md` — project structure, env setup, CI/CD, principles
- `github/schema/audit-event-schema.json` — formal JSON Schema for audit events
- `backend/src/index.js` — X-Request-Id header on all API responses for correlation

### Completed Phases

| Phase | Title | Status |
|-------|-------|--------|
| 1 | Project Architecture & Foundation | ✅ Complete |
| 2 | Cloudflare Worker + GitHub App Security | ✅ Complete |
| 3 | Cemetery Model & Advanced Search | ✅ Complete |
| 4 | Submission Lifecycle & Governance | ✅ Complete |
| 4.5 | Moderation, Audit & Reporting | ✅ Complete |
| 5 | Global Discovery, Open-Data Import | ✅ Complete |
| 5.5 | Production Readiness, Security Audit | ✅ Complete |
| 6A | Community Accounts & Contribution System | ✅ Complete |
| 7A | Advanced Search & Global Discovery | ✅ Complete |
| 7B | Advanced Maps, Nearby & Saved Places | ✅ Complete |

### Phase 7B Features

- **Nearby discovery** — Find cemeteries and memorials near user's location (Part 116)
- **Distance filters** — 1km, 5km, 10km, 25km radius selection (Part 118)
- **Location privacy** — One-shot location request, no continuous tracking (Part 117)
- **Directions handoff** — Open results in device's native map/navigation app via geo: intent (Part 119)
- **Grave location display** — Approximate vs exact coordinate labeling (Part 121)
- **Saved items** — Bookmark cemeteries, people, memorials, graves (Part 122)
- **Saved list** — Local-only storage, max 500 items, path traversal protection (Part 123)
- **Recently viewed** — Local browsing history, max 20 items, no upload (Part 124)
- **Sharing** — Shareable HTTPS URLs for public records (Part 125)
- **Deep linking** — graveatlas:// scheme + HTTPS app links, auto-verified (Part 126)
- **Discovery recommendations** — Deterministic geographic proximity, no AI (Part 128)
- **No fabricated relationships** — Only haversine distance for proximity (Part 129)
- **Map filters** — Cemetery, memorial, country, region, distance (Part 130)
- **Offline map behavior** — Graceful offline state when no network (Part 132)
- **Location permission** — On-demand only, app works without it (Part 133)
- **Data quality on map** — Invalid/null coordinates filtered, 0,0 valid (Part 135)
- **Security** — Share links public-only, saved items local-only, location one-shot (Part 136)

### Build Status

- **Android APK (GitHub Actions):** ✅ Build #56 passed (2026-08-10). APK released: GraveAtlas-v7.1.0-release.apk (7.0 MB)
- **Cloudflare Worker:** ✅ Deployed — v7.1.1 live at graveatlas.putraworks-2026.workers.dev
- **Last successful Worker deploy:** 2026-08-10 (Version ba1c5716)
- **Last successful APK build:** Build #56 (2026-08-10)
- **Test suite:** 346 tests, all passing (core suite run 2026-08-11)

### Test Results

- **Total tests:** 346 (core backend suite)
- **All passing:** ✅

### Android Components

- `SavedItemsManager` — Local SharedPreferences storage for saved/recent items
- `ShareUtils` — Share links, deep link parsing, map app handoff
- `NearbyFragment` — Location-based discovery with radius filters
- `SavedFragment` — Saved items list with open/remove/share actions
- `sheet_more.xml` — Updated with Discover section (Nearby, Saved)
- `AndroidManifest.xml` — Deep link intent filters (graveatlas:// + HTTPS app links)
- `MainNavActivity` — Deep link handling, Nearby/Saved navigation

### Backend Endpoints

- `GET /api/nearby` — Nearby search by lat/lon/radius
- `GET /api/recommendations/{id}` — Geographic recommendations (deterministic)
- `GET /api/record/{type}/{id}` — Public record detail for share links
- All responses now include `X-Request-Id` header for correlation

### Production Status

1. **Worker deployment** — ✅ Complete (deployed 2026-08-10 with Unicode + User-Agent fixes)
2. **GitHub App secrets** — ✅ Configured (githubConfigured: true, write path verified)
3. **Android APK build** — ✅ Build #56 passed (2026-08-10). APK released: GraveAtlas-v7.1.0-release.apk (7.0 MB)

### Phase 2 Gap Closure (2026-08-11)

Closed all remaining Phase 2 acceptance gate gaps:
- `docs/PUBLIC-DATA.md` — public data repository structure, publication boundary, freshness, privacy
- `docs/MAP.md` — map architecture, clustering, nearby fragment, location privacy, offline behavior
- `docs/API-PUBLIC.md` — complete API reference for all public + submission + user + admin endpoints
- `docs/DATA-VALIDATION.md` — multi-layer validation: client, server, pre-publication, CI
- `MapFragment.java` — grid-based clustering (~1km cells), empty/offline/error states

### Next Steps

1. Close Phase 3 gaps: session-based auth, moderator role, moderation UI
2. Close Phase 4 gaps: publication states, retry, queue
3. Begin Phase 8: release preparation, store readiness
