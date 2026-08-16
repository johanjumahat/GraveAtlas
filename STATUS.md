# GraveAtlas — Project Status

**Last updated:** 2026-08-16 (v7.2.27, Phase 16.25 complete)
**Version:** Backend 7.1.0 | Android 7.2.27 | Schema 1.0.0
**Tests:** 40 test suites, 370+ backend tests, 0 failures
**Backend Live:** https://graveatlas.putraworks-2026.workers.dev (Cloudflare Worker)
**Files:** 416 | **Branches:** main only (clean)

## Phase Completion

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
| 16.1–16.25. AI-Native Features | ✅ COMPLETE | 100% |

**All 8 core phases complete. Phase 16 AI-native features complete (16.1–16.25). 40 test suites passing.**

## Recent Maintenance (2026-08-16)

1. **Fix — RecordLock.java lint error** ✅ `java.time.Instant.parse()` requires API 26 but minSdk is 24. Added version check with SimpleDateFormat fallback. Fixed build #31918006286.

2. **Dependabot — Enabled and configured** ✅ Created `.github/dependabot.yml` for npm, gradle, and GitHub Actions dependency scanning.

3. **Dependencies — Safe bumps merged** ✅ org.json 20240303→20260719, constraintlayout 2.1→2.2.2, play-services-auth 21.0→21.6.0, setup-java 4→5. Reverted: recyclerview 1.3.2→1.4.0 (requires compileSdk 35).

4. **Dependencies — Pending review** 5 PRs remain open:
   - #38 okhttp 4.12→5.4.0 (major API changes)
   - #35 wrangler 3.114→4.122 (deployment breaking)
   - #31 upload-artifact 4→7 (needs workflow scope)
   - #30 checkout 4→7 (needs workflow scope)
   - #29 setup-android 3→4 (needs workflow scope)

## Test Suite (40 test files)

| Test File | Tests | Area |
|---|---|---|
| backend.test.js | 370 | Core API endpoints |
| phase6a.test.js | 123 | Phase 6 security & hardening |
| phase7a.test.js | 105 | Phase 7 reliability & observability |
| phase16-3.test.js | 90 | Phase 16.3 AI Timelines |
| security-audit.test.js | 82 | Phase 5.5 security audit |
| phase7b.test.js | 76 | Phase 7b reliability |
| ai-moderation.test.js | 70 | AI auto-moderation |
| google-auth.test.js | 66 | Google auth + session tokens |
| phase5-import-pipeline.test.js | 64 | Import pipeline |
| osm-importer.test.js | 67 | OpenStreetMap importer |
| import-admin.test.js | 59 | Import admin interface |
| phase55-e2e.test.js | 59 | End-to-end security tests |
| nea-importer.test.js | 42 | Singapore NEA importer |
| android-auth.test.js | 43 | Android auth integration |
| phase5.test.js | 47 | Phase 5 global discovery |
| phase16.test.js | 44 | Phase 16 AI-native features |
| phase16-2-command-bar.test.js | 41 | AI command bar persistence |
| phase16-2.test.js | 29 | Evidence badges & transparency |
| phase16-{4-25}.test.js | ~600 | Phase 16.4–16.25 AI features |

## Next Steps (LATER Roadmap)

- **TalkBack Testing** — Needs physical device
- **Large Text Testing** — Needs physical device
- **Bukit Brown burial registers** — NAS digitised PDFs, not API-accessible (documented)
- **Google Play Submission** — Release readiness documented, submission not yet done
- **Dependabot PRs** — 5 PRs need manual review
- **compileSdk 35 upgrade** — Required before recyclerview 1.4.0 can be merged
