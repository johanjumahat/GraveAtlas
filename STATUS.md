# GraveAtlas — Project Status

**Last Updated:** 2026-08-18 (Asia/Singapore)
**Version:** 7.2.27-b139
**Branch:** main

## Current Phase: 16.25 — Final Stabilization & Google Play Prep

### Completed Today
- ✅ Fixed "no records found" search bug (Choa/Chua Chu Kang spelling mismatch)
- ✅ Removed 87 duplicate function declarations in index.js blocking deployment
- ✅ Added `POST /api/admin/cemeteries` endpoint for direct cemetery creation
- ✅ Created 7 Singapore cemetery index files (Bukit Brown, CCK Muslim/Christian/Buddhist/Hindu, Kranji War, MacRitchie)
- ✅ Enhanced search to match graves by cemetery name field
- ✅ Deployed updated backend to Cloudflare
- ✅ Verified cemetery search functionality live
- ✅ Merged PR #29 (setup-android v3→v4) — required workflow scope
- ✅ Merged PR #30 (actions/checkout v4→v7) — required workflow scope
- ✅ Merged PR #31 (actions/upload-artifact v4→v7) — required workflow scope
- ✅ Merged PR #35 (wrangler v3→v4) — devDependency, low risk
- ✅ Closed PR #38 (okhttp 4→5) — HIGH RISK: 40+ call sites use deprecated RequestBody.create API, would need compileSdk 35

### All Dependabot PRs Cleared 🎉

### Backend Status
- **URL:** https://graveatlas.putraworks-2026.workers.dev
- **Cemeteries:** 7 published
- **Graves:** 1 published (Jumat bin Yunos)
- **Admin API:** Operational (token-protected)
- **Search:** Working for cemetery names + grave names

### Next Steps
1. Wait for current Android APK build to complete
2. Verify wrangler v4 deploys correctly
3. Begin Google Play Store submission preparation
   - Store listing assets (screenshots, description, icon)
   - Privacy policy URL
   - Content rating questionnaire
   - App signing configuration
4. Consider okhttp 5 migration as a future feature branch (requires compileSdk 35 bump)

### Known Issues
- None
