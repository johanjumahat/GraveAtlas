# GraveAtlas — Project Status

**Last Updated:** 2026-08-19 (Asia/Singapore)
**Version:** 7.2.32
**Branch:** main
**Worker URL:** https://graveatlas.putraworks-2026.workers.dev

## Current Phase: Post-Consolidation — UI Bug Fixes

### Completed Today (2026-08-19)
- ✅ Consolidated 6 country-specific repos (sg, ph, vn, th, id, my) into single `graveatlas-data` repo
- ✅ Moved original root content to `old/` subdirectory in `graveatlas-data`
- ✅ Country-specific data now lives in top-level country folders (`sg/graves/`, `sg/cemeteries/`, etc.)
- ✅ Implemented `prefixPath()` in `github.js` — auto-prefixes all data paths with `sg/` country code
- ✅ Only known data directories are prefixed (graves, cemeteries, pending, photos, schema, etc.)
- ✅ Operational directories (publication-queue, audit, users) left unprefixed
- ✅ Updated Bukit Brown connector path to `sg/bukit-brown/`
- ✅ Removed 7,127 lines of duplicate Phase 16.26–16.15 handler code from `index.js`
- ✅ Resolved symbol conflicts: `GOV_AUDIT_ACTIONS` (governance) vs `AUDIT_ACTIONS` (core)
- ✅ Renamed duplicate `handleCemeterySummary` → `handleCemeterySmartSummary` (Phase 16.29)
- ✅ Fixed route ordering bug: generic `/api/cemeteries/:id` GET was catching `/stats`, `/summary`, `/health` sub-paths before their specific handlers
- ✅ Cloudflare Worker deployed and verified live
- ✅ All endpoints tested and verified against new `sg/` path structure
- ✅ Original 6 country repos deleted (by user)
- ✅ Google Drive sync confirmed not needed for this project
- ✅ Fixed blank white result cards (white-on-white text) in Nearby, Search, and Saved Items screens
- ✅ Added shared `UiUtils.java` helper for consistent dark-theme card styling

### Verified Endpoints (2026-08-19)
| Endpoint | Status |
|----------|--------|
| `GET /api/health` | ✅ v7.1.0, GitHub configured |
| `GET /api/cemeteries` | ✅ 7 Singapore cemeteries returned |
| `GET /api/cemeteries/bukit-brown` | ✅ Single cemetery GET |
| `GET /api/cemeteries/bukit-brown/stats` | ✅ Stats (fixed route ordering) |
| `GET /api/cemeteries/bukit-brown/summary` | ✅ Summary |
| `GET /api/cemeteries/bukit-brown/health` | ✅ Health |
| `GET /api/search?q=jumat` | ✅ Search works |
| `GET /api/graves` | ✅ Returns grave records |

### Backend Status
- **Worker URL:** https://graveatlas.putraworks-2026.workers.dev
- **Cemeteries:** 7 published
- **Graves:** 1 published (Jumat bin Yunos)
- **Data Repo:** `graveatlas-data` (consolidated, country-prefixed)
- **Search:** Working for cemetery names + grave names

### Architecture: Country-Prefixed Data Model
```
graveatlas-data/
├── sg/                    ← Singapore (active, DEFAULT_COUNTRY)
│   ├── cemeteries/        ← Cemetery JSON files
│   ├── graves/            ← Grave record JSON files
│   ├── pending/           ← Pending submissions
│   ├── photos/            ← Photo references
│   ├── schema/            ← Schema definitions
│   ├── index/             ← Index files
│   ├── community-data/    ← Community-contributed records
│   ├── people/            ← Person records
│   └── bukit-brown/       ← Bukit Brown connector data
├── ph/                    ← Philippines (future)
├── vn/                    ← Vietnam (future)
├── th/                    ← Thailand (future)
├── id/                    ← Indonesia (future)
├── my/                    ← Malaysia (future)
├── old/                   ← Original root content (archived)
├── publication-queue/     ← Operational (not country-prefixed)
├── audit/                 ← Operational (not country-prefixed)
└── users/                 ← Operational (not country-prefixed)
```

The `prefixPath()` function in `github.js` automatically prepends `sg/` to all data directory paths. Only directories listed in `COUNTRY_DATA_DIRS` are prefixed. Paths already starting with a 2-letter country code are left as-is.

### All Phases Complete

| Phase | Status | Completion |
|---|---|---|
| 1. Project Architecture & Foundation | ✅ COMPLETE | 100% |
| 2. Core Data, Search, Map & Public Discovery | ✅ COMPLETE | 100% |
| 3. Contributions, Auth, Moderation & Data Quality | ✅ COMPLETE | 100% |
| 4. GitHub Publication, Data Pipeline & Release | ✅ COMPLETE | 100% |
| 5. Advanced Search, Discovery & UX | ✅ COMPLETE | 100% |
| 5.5. Security Audit | ✅ COMPLETE | 100% |
| 6. Security, Privacy & Hardening | ✅ COMPLETE | 100% |
| 7. Reliability, Observability & CI/CD | ✅ COMPLETE | 100% |
| 8. Production Release & Store Readiness | ✅ COMPLETE | 100% |
| 16.1–16.30. AI Feature Phases | ✅ COMPLETE | 100% |

### Next Steps
1. Wait for current Android APK build to complete
2. Begin Google Play Store submission preparation
   - Store listing assets (screenshots, description, icon)
   - Privacy policy URL
   - Content rating questionnaire
   - App signing configuration
3. Add more country data (ph, vn, th, id, my) when ready
4. Consider okhttp 5 migration as a future feature branch

### Known Issues
- None

### Not Yet Verified
- **Blank card fix could not be compile-checked.** Sandbox network is
  HTTPS:443 only; apt (HTTP:80) could not fetch a JDK to run Gradle/javac.
  Fix was verified via static review only (balanced braces, confirmed color
  resources exist in colors.xml, confirmed no remaining functional
  references to the old drawable). **Recommend building the APK once and
  visually confirming the Nearby/Search/Saved screens render correctly
  before next release.**
