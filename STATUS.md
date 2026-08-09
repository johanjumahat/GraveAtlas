# GraveAtlas — Status

**Last updated:** 2026-08-10
**Version:** 7.1.0 (Phase 7B)
**Repository:** putraworks2026/GraveAtlas
**Data repo:** putraworks2026/graveatlas-data
**Worker:** graveatlas.putraworks-2026.workers.dev

---

## Current Phase: 7B — Advanced Maps, Nearby & Saved Places

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

### Test Results

- **Total tests:** 821 (346 core + 47 Phase 5 + 64 import + 123 Phase 6A + 105 Phase 7A + 76 Phase 7B)
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

### Remaining Production Blockers

1. **Worker deployment** — Needs Cloudflare API token + wrangler deploy
2. **GitHub App secrets** — Need private key for submission pipeline
3. **Android APK build** — Needs Android SDK + signing keystore
