# GraveAtlas — Project Status

**Last updated:** 2026-08-15 (post-merge)
**Version:** Backend 7.1.0 | Android 1.0.0 | Schema 1.0.0
**Tests:** 1206 passing, 0 failed

## Phase Completion

| Phase | Status | Completion |
|---|---|---|
| 1. Project Architecture & Foundation | ✅ COMPLETE | 100% |
| 2. Core Data, Search, Map & Public Discovery | ✅ COMPLETE | 100% |
| 3. Contributions, Auth, Moderation & Data Quality | ✅ COMPLETE | 100% |
| 4. GitHub Publication, Data Pipeline & Release | ✅ COMPLETE | 100% |
| 5. Advanced Search, Discovery & UX | ✅ COMPLETE | 100% |
| 6. Security, Privacy & Hardening | ✅ COMPLETE | 100% |
| 7. Reliability, Observability & CI/CD | ✅ COMPLETE | 100% |
| 8. Production Release & Store Readiness | ✅ COMPLETE | 100% |
| 16.1. AI Database Integration (RAG) | 🔧 IN PROGRESS | 60% |

**All 8 phases complete. Phase 9 post-launch audit done. 415 tests passing. Ready for release.**
- Security: Dependabot enabled, SECURITY.md added (2026-08-11)
- Feedback: in-app "Send Feedback" action added to Settings
- CI failure rate investigated (40% historical, all compilation errors from unreviewed pushes)

## Architecture

- **Backend:** Cloudflare Worker (TypeScript/JavaScript) with 60+ API routes
- **Android:** 17 screens with navigation host, external maps handoff (geo: intent), offline support
- **Data:** GitHub repository (graveatlas-data) with JSON schemas
- **Auth:** Session tokens, roles (user/moderator/admin), 24h expiry
- **Publication:** Safe retry, change diff, merge safety, PR option

## Key Metrics

- Backend routes: 60+
- Android screens: 17
- Tests: 415
- Documentation: 60+ docs
- Schemas: 6 (grave, cemetery, person, source, correction, audit-event)

## Next Steps

1. ~~Merge phase-16.1/ai-database-integration branch~~ ✅ MERGED
1a. ~~Integrate Singapore NEA data.gov.sg cemetery GeoJSON~~ ✅ Importer built, 42 tests passing
1b. ~~Integrate OpenStreetMap cemetery data via Overpass API~~ ✅ Importer built, 67 tests passing
1c. ~~Admin import API endpoints~~ ✅ 6 endpoints built, 59 tests passing
1d. ~~AI auto-moderation~~ ✅ No human admin needed — AI reviews/approves/rejects automatically, 70 tests passing
1e. ~~Google auth & abuse prevention~~ ✅ Users must login with Google, all submissions logged with account/IP/user-agent, 66 tests passing
1f. ~~Android Google auth integration~~ ✅ Android app requires Google login for submissions, session token management, login gates, 43 tests passing
1g. ~~Phase 16.2 — Evidence badges in search~~ ✅ Search results show evidence badges, "Why am I seeing this?" transparency dialogs, 29 tests passing
2. Deploy backend to Cloudflare Workers
3. Build signed release APK
4. Submit to Google Play Console
