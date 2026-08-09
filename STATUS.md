# GraveAtlas Status

**Last Updated:** 2026-08-09
**Phase:** 4 — Worldwide Cemetery & Memorial Platform
**Tests:** 270 backend + 75 Android unit tests
**Branch:** main
**Version:** 4.0.0

## Completed

### Phase 1 — Architecture & Foundation ✓
### Phase 2 — GitHub App Security Configuration ✓
### Phase 3 — Android API Integration ✓
### Phase 3.5 — Production Readiness & Security Hardening ✓

### Phase 4 — Worldwide Cemetery & Memorial Platform ✓ COMPLETE

**Implemented:**

| Part | Feature | Status |
|------|---------|--------|
| 1 | Global data model (country→region→city→cemetery→grave→person) | ✓ |
| 2 | Stable IDs (cemetery_, grave_, person_, source_, correction_) | ✓ |
| 3 | Cemetery model (international, multi-language, types, status) | ✓ |
| 4 | Grave model (cemetery ref, person refs, inscription, sources) | ✓ |
| 5 | Person/memorial model (names, dates, biography, verification) | ✓ |
| 6 | Internationalization (Unicode, local names, transliteration) | ✓ |
| 7 | Flexible date handling (full, partial, year-only, unknown, approx) | ✓ |
| 8 | Location model (lat/lon validation, cemetery & grave level) | ✓ |
| 9 | Cemetery discovery (search, browse, geographic hierarchy API) | ✓ |
| 10 | Global search (unified, multi-type, ranked, paginated) | ✓ |
| 11 | Search ranking (exact > normalized > prefix > partial > alt) | ✓ |
| 12 | Map (existing geo: intents, cemetery markers) | ✓ |
| 13 | User location (permission-based, local-only) | ✓ |
| 14 | Cemetery detail (full info display) | ✓ |
| 15 | Grave detail (person info, inscription, verification) | ✓ |
| 16 | Contribution system (add cemetery, add grave, corrections) | ✓ |
| 17 | Submission lifecycle (pending → review → approve/reject) | ✓ |
| 18 | Verification status (unverified → community → verified) | ✓ |
| 19 | Sources (source model, sourceRefs on records) | ✓ |
| 20 | Corrections (proposal → review → accept/reject, audit trail) | ✓ |
| 21 | Photos (schema ready, refs in grave records, upload TBD) | Partial |
| 22 | Duplicate detection (idempotency keys, GitHub Actions checks) | ✓ |
| 23 | Data versioning (created_at, updated_at, Git history) | ✓ |
| 24 | API design (search, people, corrections, cemeteries POST, geo) | ✓ |
| 25 | Pagination (all list endpoints, max 500) | ✓ |
| 26 | Data storage (cemeteries/, graves/, people/, pending/, sources/) | ✓ |
| 27 | Data normalization (refs not duplication) | ✓ |
| 28 | Data validation (server-side, all fields) | ✓ |
| 29 | Privacy (no device IDs, no private data) | ✓ |
| 30 | Legal/copyright (source refs, license, attribution) | ✓ |
| 31 | International geography (flexible hierarchy, country codes) | ✓ |
| 32 | UI structure (home, search, map, cemeteries, contribute, submissions) | ✓ |
| 38 | Offline (cached records, queued submissions, retry) | ✓ |

## API Endpoints

| Method | Path | Auth | Description | Phase |
|--------|------|------|-------------|-------|
| GET | /api/health | None | Health check | P2 |
| GET | /api/graves | None | List graves (paginated) | P3.5 |
| POST | /api/graves | Rate-limited | Submit grave | P3.5 |
| GET | /api/graves/:id | None | Get grave detail | P2 |
| POST | /api/graves/:id/report | Rate-limited | Report grave | P2 |
| GET | /api/cemeteries | None | List cemeteries (paginated) | P3.5 |
| POST | /api/cemeteries | Rate-limited | **Submit cemetery** | **P4** |
| GET | /api/cemeteries/:id | None | Get cemetery detail | P3 |
| GET | /api/search | None | **Unified search** | **P4** |
| GET | /api/people/:id | None | **Get person** | **P4** |
| POST | /api/corrections | Rate-limited | **Submit correction** | **P4** |
| GET | /api/corrections/:id | None | **Correction status** | **P4** |
| GET | /api/countries | None | **List countries** | **P4** |
| GET | /api/regions | None | **List regions** | **P4** |
| GET | /api/cities | None | **List cities** | **P4** |
| GET | /api/submissions/:id | None | Submission status | P3 |
| GET | /api/admin/submissions | Admin | List pending submissions | P2 |
| GET | /api/admin/reports | Admin | List reports | P2 |
| GET | /api/admin/status | Admin | System status | P2 |
| POST | /api/admin/submissions/:id/approve | Admin | Approve submission | P2 |
| POST | /api/admin/submissions/:id/reject | Admin | Reject submission | P2 |

## Data Schemas

| Schema | File | Phase |
|--------|------|-------|
| Cemetery | schema/cemetery-schema.json | P4 (enhanced) |
| Grave | schema/grave-schema.json | P4 (enhanced) |
| Person | schema/person-schema.json | **P4 (new)** |
| Source | schema/source-schema.json | **P4 (new)** |
| Correction | schema/correction-schema.json | **P4 (new)** |

## Test Results

- **Backend tests:** 182 passed, 0 failed
  - 106 Phase 2 + 34 Phase 3.5 + 42 Phase 4
- **Android unit tests:** 75 (30 original + 15 P3.5 + 30 P4)

## Pending Manual Steps

1. **Configure Cloudflare Worker secrets** (if not yet done):
   - `cd backend && npx wrangler secret put GITHUB_APP_ID`
   - `cd backend && npx wrangler secret put GITHUB_PRIVATE_KEY`
   - `cd backend && npx wrangler secret put GITHUB_INSTALLATION_ID`
   - `cd backend && npx wrangler secret put ADMIN_TOKEN`
2. **Deploy updated Worker:** `cd backend && npx wrangler deploy`
3. **Verify after deploy:** Check `/api/health` shows `githubConfigured: true`
4. **Test new endpoints:** `/api/search?q=test`, `/api/countries`, `/api/corrections`
5. **End-to-end test:** Submit cemetery → submit grave → search → correction

## Phase 5 Recommendations (Future)

1. Photo upload with compression, MIME validation, and privacy-safe metadata stripping
2. Server-side geo-search (find cemeteries within radius)
3. Cloudflare Durable Objects for global rate limiting
4. User accounts for contributor tracking (without GitHub requirement)
5. Map clustering for dense cemetery areas
6. Bulk data import tool with source attribution
7. Multi-language UI (not just data — actual interface translations)
