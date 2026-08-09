# GraveAtlas Moderation

## Overview

All user-submitted data goes through a moderation queue before publication. No submission is auto-published.

## Moderation Queue

The admin dashboard (`GET /api/admin/dashboard`) provides an overview of all queues:
- Pending submissions
- Pending corrections
- Open reports (with privacy reports highlighted)
- Published record counts
- Audit event count

## Submission Lifecycle

```
USER SUBMITS
     ↓
PENDING (stored in pending/ directory)
     ↓
UNDER REVIEW (admin opens the submission)
     ↓
APPROVED → PUBLISHED (moved to graves/ or cemeteries/)
REJECTED → Stays in pending/ with rejection reason
```

### Status Transitions (server-enforced)

| From | Allowed Transitions |
|------|-------------------|
| `pending` | → `under_review`, → `rejected` |
| `under_review` | → `published`, → `rejected` |
| `published` | (terminal — no further transitions) |
| `rejected` | (terminal — no further transitions) |

Invalid transitions are rejected with HTTP 409.

**Key rules:**
- A rejected submission cannot be published directly
- A published submission cannot be re-approved or rejected
- All transitions are server-validated (Part 15)

## Moderation Reasons (Part 5)

When rejecting, the admin must provide a structured reason:

| Reason | Description |
|--------|-------------|
| `INVALID_DATA` | Data is incorrect or malformed |
| `DUPLICATE` | Record already exists |
| `INSUFFICIENT_SOURCE` | Not enough sourcing to verify |
| `WRONG_LOCATION` | Coordinates or location are wrong |
| `PRIVACY_CONCERN` | Privacy issue with the submission |
| `INAPPROPRIATE_CONTENT` | Content violates guidelines |
| `INCORRECT_CEMETERY` | Wrong cemetery assignment |
| `OTHER` | Catch-all for other issues |

Admins can also add an internal moderation note (not exposed to users).

## Admin API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Queue overview |
| GET | `/api/admin/submissions` | List pending submissions |
| GET | `/api/admin/corrections` | List pending corrections |
| POST | `/api/admin/submissions/:id/approve` | Approve and publish |
| POST | `/api/admin/submissions/:id/reject` | Reject with reason |
| POST | `/api/admin/corrections/:id/approve` | Accept correction |
| POST | `/api/admin/corrections/:id/reject` | Reject correction |
| GET | `/api/admin/reports` | List reports |
| POST | `/api/admin/reports/:id/resolve` | Resolve a report |
| POST | `/api/admin/reports/:id/reject` | Reject a report |
| GET | `/api/admin/contributors` | List contributor stats |
| GET | `/api/admin/data-quality` | Run data quality checks |
| GET | `/api/admin/audit` | List audit events |
| GET | `/api/admin/audit/:entityId` | Audit trail for entity |
| POST | `/api/admin/restore/:id` | Restore archived/removed record |

All admin endpoints require `Authorization: Bearer <ADMIN_TOKEN>` header.

## Admin Authentication

- Bearer token authentication
- Constant-time comparison (prevents timing attacks)
- Token stored as Cloudflare secret (`ADMIN_TOKEN`)
- Never included in the Android app
- Invalid credentials return 401 (missing) or 403 (incorrect)
- Admin rate limit: 30 requests/minute

## Review Process

1. Admin opens the moderation queue
2. Admin inspects submitted data:
   - Name, dates, location
   - Source references
   - Verification status
   - Comparison against existing records
3. Admin approves or rejects with structured reason
4. Approved: record moved to published directory
5. Rejected: record stays in pending/ with rejection reason
6. Audit event created for every action

## Privacy in Moderation

- Internal moderation notes are not exposed to ordinary users
- Contributor identity is tracked separately (by contributorId, not personal info)
- Reports do not auto-delete content
- Privacy-related reports are prioritized
