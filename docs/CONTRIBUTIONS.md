# GraveAtlas Contributions

## Overview

Users can contribute to GraveAtlas without a GitHub account. All contributions go through the Cloudflare Worker and are reviewed before publication.

## Contribution Types

| Type | Endpoint | Description |
|------|----------|-------------|
| Add Grave | POST `/api/graves` | Submit a new grave/memorial |
| Add Cemetery | POST `/api/cemeteries` | Submit a new cemetery |
| Suggest Correction | POST `/api/corrections` | Correct an existing record |
| Report | POST `/api/graves/:id/report` | Report incorrect information |

## Submission Lifecycle

```
User Submission
     ↓
PENDING (stored in pending/ directory)
     ↓
Admin Review (via /api/admin/submissions)
     ↓
APPROVED → Published (moved to graves/ or cemeteries/)
REJECTED → Stays in pending/ with status "rejected"
```

Submissions are **never** auto-published. All submissions require admin review.

## Idempotency

All POST endpoints accept an `Idempotency-Key` header. If the same key is used within 1 hour, the original submission ID is returned instead of creating a duplicate. This prevents duplicate records from network retries.

Android generates a UUID per submission. Offline retries use the same key.

## Correction Lifecycle

```
Existing Record
     ↓
User submits correction (POST /api/corrections)
     ↓
Correction stored in pending/ (original record unchanged)
     ↓
Admin Review
     ↓
ACCEPT → Original record updated
REJECT → Correction rejected, original unchanged
```

Corrections do **not** overwrite the original record. They create a proposal that must be reviewed.

### Correction Fields

| Field | Required | Description |
|-------|----------|-------------|
| `targetId` | Yes | ID of record to correct |
| `targetType` | Yes | `grave`, `cemetery`, `person`, or `source` |
| `corrections` | Yes | Object: `{ fieldName: suggestedValue }` |
| `reason` | No | Why the correction is needed (max 2000 chars) |
| `sourceRefs` | No | Supporting source references |

## My Submissions

Users can track their own submissions via:
- GET `/api/submissions/:id` — Check submission status
- GET `/api/corrections/:id` — Check correction status

Users cannot see other users' submissions.

## Offline Support

- Submissions are queued locally when offline
- OfflineSubmissionManager retries with exponential backoff
- Same idempotency key prevents duplicates on retry
- Queued submissions are never lost

## Privacy

- No device identifiers in submissions
- No user IP addresses stored in records
- No personal data beyond what's needed for the memorial
- Contributor identity is not required or tracked

## Safety

- All submissions go through the Cloudflare Worker
- Android never directly writes to GitHub
- Client cannot set: `id`, `status`, `verificationStatus`, `repo`, `branch`, or `filePath`
- All fields are server-side validated
- Rate limited: 10 requests/minute/IP on POST endpoints
