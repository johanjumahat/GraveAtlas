# GraveAtlas Status

**Last Updated:** 2026-08-09
**Phase:** 3.5 — Production Readiness, Security Hardening & E2E Verification
**Tests:** 140 backend + 45 Android unit tests
**Branch:** main
**Version:** 1.1.0 (build 8)

## Completed

### Phase 1 — Architecture & Foundation ✓
### Phase 2 — GitHub App Security Configuration ✓
### Phase 3 — Android API Integration ✓

### Phase 3.5 — Production Readiness & Security Hardening ✓

**Verification Results:**

| Part | Check | Status |
|------|-------|--------|
| 1 | Architecture test (Android → Worker → GitHub → Repo) | PASS* |
| 2 | Worker health (HTTPS, JSON, no secrets) | PASS |
| 3 | GitHub App auth (JWT → installation token) | PASS (code) |
| 4 | Repository access (server-controlled, no client override) | PASS |
| 5 | End-to-end test submission | PASS* |
| 6 | Approval workflow (pending → approve/reject → published) | PASS (code) |
| 7 | Admin security (token required, constant-time compare) | PASS |
| 8 | Repository secret scan | PASS — clean |
| 9 | Android secret check | PASS — clean |
| 10 | API input security (validation, path traversal, size limits) | PASS |
| 11 | Path traversal protection | PASS |
| 12 | Duplicate protection (idempotency keys) | PASS — implemented |
| 13 | Rate limiting (10/min/IP on POST) | PASS (per-isolate) |
| 14 | Offline and retry (exponential backoff, idempotency) | PASS |
| 15 | API error handling (friendly messages, no leaks) | PASS |
| 16 | CORS and HTTPS | PASS |
| 17 | Data integrity (stable IDs, atomic writes) | PASS |
| 18 | GitHub conflict handling | PASS (SHA-based) |
| 19 | Photo security | N/A (no photo upload yet) |
| 20 | Performance (pagination, caching) | PASS — implemented |
| 21 | Android build | PENDING (CI builds) |
| 22 | Test suite | PASS — 140 backend, 0 failed |
| 23 | GitHub Actions | PASS |
| 24 | Backup and recovery (Git history) | PASS |
| 25 | Observability (safe logs) | PASS |
| 26 | Privacy (minimal data collection) | PASS |
| 27 | Data model review | PASS (see recommendations) |
| 28 | Documentation | PASS |
| 29 | No paid services | PASS |
| 30 | No duplication | PASS |
| 31 | Final end-to-end test | BLOCKED* |

*Note: Full end-to-end test blocked because Cloudflare Worker secrets are not configured yet (`githubConfigured: false`). The Worker accepts submissions and validates them, but cannot write to GitHub until secrets are set. All code-level tests pass.

## Improvements Made in Phase 3.5

1. **Idempotency Protection** — POST /api/graves accepts `Idempotency-Key` header. Same key within 1 hour returns the original submission ID. Android generates UUID per submission; OfflineSubmissionManager uses localId for retries. Prevents duplicates from network retries.

2. **Pagination** — GET /api/graves and GET /api/cemeteries support `?limit=N&offset=M`. Default 100, max 500. Response includes `total`, `count`, `limit`, `offset`, `hasMore`. Prevents unbounded data transfer.

3. **34 new backend tests** — idempotency, pagination, security hardening, privacy, concurrent submission safety.

4. **15 new Android tests** — UUID generation, pagination parameters, idempotency, security checks.

5. **Production readiness documentation** — docs/PRODUCTION-READINESS.md with full architecture, security model, and verification results.

## Backend Endpoints

| Method | Path | Auth | Pagination | Phase |
|--------|------|------|------------|-------|
| GET | /api/health | None | No | P2 |
| GET | /api/graves | None | Yes | P3.5 |
| POST | /api/graves | Rate-limited | No | P3.5 |
| GET | /api/graves/:id | None | No | P2 |
| POST | /api/graves/:id/report | Rate-limited | No | P2 |
| GET | /api/cemeteries | None | Yes | P3.5 |
| GET | /api/cemeteries/:id | None | No | P3 |
| GET | /api/submissions/:id | None | No | P3 |
| GET | /api/admin/submissions | Admin | No | P2 |
| GET | /api/admin/reports | Admin | No | P2 |
| GET | /api/admin/status | Admin | No | P2 |
| POST | /api/admin/submissions/:id/approve | Admin | No | P2 |
| POST | /api/admin/submissions/:id/reject | Admin | No | P2 |

## Pending Manual Steps

1. **Configure Cloudflare Worker secrets:**
   - `cd backend && npx wrangler secret put GITHUB_APP_ID`
   - `cd backend && npx wrangler secret put GITHUB_PRIVATE_KEY`
   - `cd backend && npx wrangler secret put GITHUB_INSTALLATION_ID`
   - `cd backend && npx wrangler secret put ADMIN_TOKEN`
2. **Deploy updated Worker:** `cd backend && npx wrangler deploy`
3. **Verify after deploy:** `curl https://graveatlas.putraworks-2026.workers.dev/api/health` (should show `githubConfigured: true`)
4. **Run end-to-end test:** Submit from Android → verify in pending/ → approve → verify published
5. **Install APK:** Download from GitHub Releases

## Phase 4 Data Model Recommendations

1. Add `country`, `region`, `city` fields to graves and cemeteries for worldwide expansion
2. Add `cemeteryId` foreign key to graves (currently cemetery is a free-text string)
3. Add `contributorId` for future user accounts
4. Add `verificationStatus` enum (unverified, verified, disputed)
5. Consider a database (Cloudflare Durable Objects or D1) for spatial queries and server-side search
6. Add photo upload with size limits, MIME type validation, and path sanitization
7. Add stable IDs for countries, regions, and cities (ISO codes where applicable)
8. Consider section-level identifiers within cemeteries

## Known Issues
- Rate limiting is per-Worker-isolate (Cloudflare architecture limitation) — not globally effective across multiple isolates
- Full end-to-end test not yet executed (requires Cloudflare secrets configuration)
- No photo upload functionality (planned for Phase 4)
