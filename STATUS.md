# GraveAtlas — Status

**Last updated:** 2026-08-09
**Version:** 6.0.0 (Phase 6A)
**Repository:** putraworks2026/GraveAtlas
**Data repo:** putraworks2026/graveatlas-data
**Worker:** graveatlas.putraworks-2026.workers.dev

---

## Current Phase: 6A — Community Accounts & Contribution System

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

### Phase 6A Features

- **User accounts** — Registration, profile (display name, bio, contribution count), account states (ACTIVE/SUSPENDED/DEACTIVATED)
- **Contribution system** — Cemetery, grave, correction, photo, and report submissions
- **Submission statuses** — DRAFT → PENDING_REVIEW → CHANGES_REQUESTED → APPROVED/REJECTED/CANCELLED
- **Status transitions** — Validated, invalid transitions rejected
- **Drafts** — Save, update, delete, and submit incomplete contributions
- **Contribution history** — Paginated list with filtering by type and status
- **Contribution details** — Full submission data with reviewer feedback
- **Cancel contributions** — Users can cancel pending submissions
- **Duplicate detection** — 4-level (NO_MATCH, POSSIBLE_DUPLICATE, HIGH_CONFIDENCE_MATCH, EXACT_DUPLICATE) with absolute scoring
- **Photo contributions** — With rights declaration (OWN_WORK, PERMISSION_GRANTED, OPEN_LICENSE, PUBLIC_DOMAIN, UNKNOWN)
- **Photo validation** — URL format, target validation, path traversal protection
- **Authorization** — Users can only access their own contributions and drafts
- **Audit events** — CONTRIBUTION_CREATED, DRAFT_UPDATED, SUBMISSION_CREATED, CORRECTION_CREATED, PHOTO_SUBMITTED, SUBMISSION_CANCELLED, USER_REGISTERED, USER_PROFILE_UPDATED, USER_STATUS_CHANGED
- **Rate limiting** — 30 actions per user per hour (in addition to existing IP-based limiting)
- **18 new API endpoints** for user, contribution, draft, and photo operations

### Tests

| Suite | Passed | Failed |
|-------|--------|--------|
| Backend (Phase 1-4.5) | 346 | 0 |
| Phase 5 | 47 | 0 |
| Phase 5 Import Pipeline | 64 | 0 |
| Phase 5.5 E2E | 59 | 0 |
| Phase 6A | 123 | 0 |
| **Total** | **639** | **0** |

### Security

- ✅ No secrets in any source files
- ✅ No API keys, tokens, or credentials in code
- ✅ Path traversal protection on all user inputs
- ✅ User-scoped authorization — users can only access their own data
- ✅ Admin endpoints remain Bearer-token protected
- ✅ Rate limiting at both IP and user level
- ✅ Photo URL validation (HTTP/HTTPS only)
- ✅ No file execution — photos are never processed as code

### API Version

- Current: `6.0.0`
- 18 new endpoints added in Phase 6A

### Production Blockers (Manual Steps)

1. **Deploy updated Cloudflare Worker** — Production runs v2.0.0, code is now v6.0.0
2. **Configure Worker secrets** — GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_INSTALLATION_ID, ADMIN_TOKEN
3. **Build Android APK** — Requires Android SDK

### Next Phase

Phase 6B — Community Moderation, Reputation, Reports, Notifications & Final QA
