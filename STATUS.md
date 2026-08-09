# GraveAtlas — Status

**Last updated:** 2026-08-09
**Version:** 7.0.0 (Phase 7A)
**Repository:** putraworks2026/GraveAtlas
**Data repo:** putraworks2026/graveatlas-data
**Worker:** graveatlas.putraworks-2026.workers.dev

---

## Current Phase: 7A — Advanced Search & Global Discovery

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

### Phase 7A Features

- **Global search** — Unified search across people, cemeteries, memorials, and locations
- **Categorized results** — Results grouped by category with counts (PEOPLE, CEMETERIES, MEMORIALS, LOCATIONS)
- **Person search** — By full name, partial name, alt names, birth year, death year, cemetery, country
- **Cemetery search** — By name, alt names, city, region, country, location
- **Location search** — Countries, regions, and cities with cemetery counts
- **Name normalization** — Unicode NFD, accent stripping, lowercase, punctuation handling (source data never modified)
- **Country directory** — Worldwide with actual cemetery and memorial counts
- **Region directory** — Country → Regions with cemetery counts
- **City/locality directory** — Country → Region → Cities with cemetery counts and coordinates
- **Browse by location** — Filter cemeteries by country/region/city hierarchy
- **Advanced filters** — Country, region, city, birth year, death year, year range, record type
- **Date search** — Exact year, year range, handles incomplete dates (year-only, approx, unknown)
- **Sorting** — Relevance (score), name (alphabetical), date (most recent), distance (haversine)
- **Server-side pagination** — Default 20, max 100 per page — Android never downloads full dataset
- **Search caching** — 5-minute TTL for search results, 10-minute TTL for directories
- **Related records** — Nearby cemeteries (50km), same-cemetery people, same-region cemeteries
- **Search security** — Path traversal neutralized, query length limits, parameter validation, rate limiting
- **Internationalization** — Full Unicode support (Arabic, Chinese, Japanese, Korean, Thai, Hebrew, Cyrillic)
- **11 new API endpoints** for global search, directories, browse, and related records

### Tests

| Suite | Passed | Failed |
|-------|--------|--------|
| Backend (Phase 1-4.5) | 346 | 0 |
| Phase 5 | 47 | 0 |
| Phase 5 Import Pipeline | 64 | 0 |
| Phase 5.5 E2E | 59 | 0 |
| Phase 6A | 123 | 0 |
| Phase 7A | 105 | 0 |
| **Total** | **744** | **0** |

### Security

- ✅ No secrets in any source files
- ✅ Path traversal queries neutralized by normalization
- ✅ No GitHub credentials exposed through search
- ✅ Maximum query length enforced (200 chars)
- ✅ All search parameters validated
- ✅ Rate limiting via existing IP-based limiter
- ✅ No arbitrary file or repository access through search
- ✅ Source data never modified by search normalization

### API Version

- Current: `7.0.0`
- 11 new endpoints added in Phase 7A

### Production Blockers (Manual Steps)

1. **Deploy updated Cloudflare Worker** — Production runs v2.0.0, code is now v7.0.0
2. **Configure Worker secrets** — GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_INSTALLATION_ID, ADMIN_TOKEN
3. **Build Android APK** — Requires Android SDK

### Next Phase

Phase 7B — Advanced Maps, Nearby Discovery, Saved Places & Final QA
