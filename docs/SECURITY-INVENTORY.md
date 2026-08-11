# GraveAtlas Security Inventory

## Severity Classification

| Severity | Definition | Examples |
|---|---|---|
| Critical | Direct data breach or system compromise | Exposed secrets, authentication bypass |
| High | Significant security risk | Missing access controls, injection vectors |
| Medium | Moderate risk, defense in depth | Missing security headers, weak CORS |
| Low | Minor hardening improvements | Verbose errors, missing rate limits on endpoints |

## Security Controls Inventory

### Authentication & Authorization

| Control | Status | Severity | Notes |
|---|---|---|---|
| User registration | ✅ Active | — | `POST /api/user/register` |
| Session tokens | ✅ Active | — | 24-hour expiry, `POST /api/user/session` |
| Session revocation | ✅ Active | — | `DELETE /api/user/session` |
| Admin token auth | ✅ Active | — | `ADMIN_TOKEN` env var |
| Role-based access | ✅ Active | — | user, moderator, admin roles |
| Session expiration | ✅ Active | — | Auto-expire after 24h, auto-revoke |
| Password/credential storage | N/A | — | No passwords stored — GitHub App auth only |

### Input Validation

| Control | Status | Severity | Notes |
|---|---|---|---|
| Path sanitization | ✅ Active | — | `sanitizePathSegment()` prevents traversal |
| Body size limits | ✅ Active | — | 10KB for submissions, 1MB for photos |
| Coordinate validation | ✅ Active | — | Lat/lon range checks |
| Date validation | ✅ Active | — | ISO 8601, range checks |
| Field length limits | ✅ Active | — | Name, bio, description limits |
| JSON-only input | ✅ Active | — | Content-Type enforcement |
| Query param validation | ✅ Active | — | Page size, search string bounds |

### Rate Limiting

| Control | Status | Severity | Notes |
|---|---|---|---|
| Per-IP rate limiting | ✅ Active | — | 100 req/min |
| Per-user rate limiting | ✅ Active | — | 30 req/hour |
| Admin rate limiting | ✅ Active | — | 30 req/min |
| Search rate limiting | ✅ Active | — | Bounded by per-IP limits |

### Secret Management

| Control | Status | Severity | Notes |
|---|---|---|---|
| Secrets via env vars | ✅ Active | — | No hardcoded secrets |
| `.env.example` templates | ✅ Active | — | All required vars documented |
| Secret scan on commit | ✅ Active | — | Pre-commit git hook |
| GitHub App private key | ✅ Secure | — | Via env var, never in source |
| Admin token | ✅ Secure | — | Via env var, never in source |

### Network Security

| Control | Status | Severity | Notes |
|---|---|---|---|
| Security headers | ✅ Active | — | HSTS, X-Content-Type-Options, X-Frame-Options, CSP |
| CORS configuration | ✅ Active | — | Allow-Origin: * (public API) |
| HTTPS enforcement | ✅ Active | — | Cloudflare enforces TLS |
| No command execution | ✅ Active | — | No shell exec, no eval |

### Data Protection

| Control | Status | Severity | Notes |
|---|---|---|---|
| Public data separation | ✅ Active | — | Public repo vs private contribution data |
| Contributor privacy | ✅ Active | — | Public profiles show display name only |
| Moderation notes private | ✅ Active | — | Never exposed through public endpoints |
| Internal IDs not exposed | ✅ Active | — | User IDs are internal |
| Location privacy | ✅ Active | — | Optional, not required for contributions |
| Error responses sanitized | ✅ Active | — | Generic messages, no stack traces |

### Known Gaps

| Gap | Severity | Mitigation | Status |
|---|---|---|---|
| IDOR testing not formalized | Medium | Access control exists per-contribution | **Addressed** — tests added |
| Data retention policy not documented | Medium | Git history is permanent | **Addressed** — policy documented |
| File upload validation (MIME/size) | Low | Photo metadata only, no file storage | Future: when file upload added |
| Branch protection not verified | Low | Private repo, admin-only writes | Acceptable for current scale |

## IDOR (Insecure Direct Object Reference) Protection

All contribution endpoints check ownership:
- `authorizeContributionAccess(env, contributionId, userId)` — verifies `contribution.userId === userId`
- `authorizeDraftAccess(env, draftId, userId)` — verifies `draft.userId === userId`
- Admin endpoints require `ADMIN_TOKEN` or `moderator`/`admin` role
- Public data endpoints return only public fields (no internal user data)

## Data Retention Policy

| Data Type | Retention | Deletion Path |
|---|---|---|
| Published graves/cemeteries | Permanent (public record) | Via correction/report workflow |
| Pending submissions | Until reviewed or 90 days | Auto-expire after 90 days |
| User accounts | Until user requests deletion | `DELETE` via admin |
| Audit events | Permanent | Immutable, append-only |
| Draft contributions | Until submitted or 30 days | Auto-expire after 30 days |
| Session tokens | 24 hours | Auto-expire |
| Moderation notes | Permanent | Immutable, append-only |

## Review Schedule

- Security inventory: reviewed quarterly
- Secret rotation: every 90 days for ADMIN_TOKEN
- Dependency audit: monthly via `npm audit`
- Access review: quarterly for admin/moderator roles
