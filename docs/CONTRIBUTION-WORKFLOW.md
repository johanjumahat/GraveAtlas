# GraveAtlas Contribution Workflow

## Overview

All user-submitted data enters a pending/moderation workflow. No submission is auto-published. Users never receive direct GitHub repository write access.

## Workflow Steps

```
1. User creates contribution
2. Backend validates all fields
3. Contribution stored as pending
4. Moderator reviews contribution
5. Approved contribution is prepared for publication
6. Publication performed through trusted backend/GitHub App
7. Audit event records the operation
```

## Contribution Types

| Type | Endpoint | Description |
|---|---|---|
| Grave | `POST /api/graves` | Submit a new grave record |
| Cemetery | `POST /api/cemeteries` | Submit a new cemetery |
| Correction | `POST /api/corrections` | Suggest a correction to existing data |
| Photo | `POST /api/photos` | Submit a photo contribution (metadata + rights declaration) |

## Contribution Statuses

| Status | Description |
|---|---|
| DRAFT | Saved but not submitted — user can edit or delete |
| PENDING_REVIEW | Submitted — awaiting moderator review |
| CHANGES_REQUESTED | Moderator requested corrections |
| PUBLISHED | Approved and published to public repository |
| REJECTED | Rejected by moderator |

### Valid Status Transitions

```
DRAFT → PENDING_REVIEW (submit)
DRAFT → (deleted)
PENDING_REVIEW → PUBLISHED (approve)
PENDING_REVIEW → REJECTED (reject)
PENDING_REVIEW → CHANGES_REQUESTED (request correction)
CHANGES_REQUESTED → PENDING_REVIEW (resubmit)
```

## Drafts

Users can save incomplete contributions as drafts:
- `POST /api/drafts` — create a draft
- `GET /api/drafts` — list user's drafts
- `GET /api/drafts/{id}` — view a draft
- `PUT /api/drafts/{id}` — update a draft
- `DELETE /api/drafts/{id}` — delete a draft
- `POST /api/drafts/{id}/submit` — submit a draft for review

Drafts are private — only the owner can view, edit, or submit them.

## Duplicate Detection

Before submission, the backend checks for likely duplicates:
- `POST /api/contributions/check-duplicate` — check if a similar contribution exists
- Compares cemetery, name, coordinates, and dates
- Flagged duplicates go to moderation for review
- Legitimate records are not automatically deleted

## Moderation

Moderators (admin-token authenticated) can:
- `GET /api/admin/submissions` — view pending submissions
- `POST /api/admin/submissions/{id}/approve` — approve and publish
- `POST /api/admin/submissions/{id}/reject` — reject with reason
- `GET /api/admin/corrections` — view pending corrections
- `POST /api/admin/corrections/{id}/approve` — approve correction
- `POST /api/admin/corrections/{id}/reject` — reject correction
- `GET /api/admin/reports` — view user reports
- `POST /api/admin/reports/{id}/resolve` — resolve a report
- `POST /api/admin/reports/{id}/reject` — reject a report
- `POST /api/admin/restore/{id}` — restore a removed record

## Publication Boundary

1. Approved contribution is validated again
2. Backend writes to public GitHub data repository via GitHub App
3. GitHub App credentials remain server-side only
4. Commit messages identify the operation without exposing sensitive data
5. Audit event records the publication

## Audit Trail

Every significant action creates an audit event:
- Contribution created
- Contribution submitted
- Moderation decision (approve/reject)
- Correction submitted
- Correction decision
- Publication result
- Report filed
- Report resolved
- Record restored

Audit events are stored in `audit/` directory and accessible via:
- `GET /api/admin/audit` — list all audit events
- `GET /api/admin/audit/{entityId}` — audit trail for a specific entity

## Abuse Protection

- Rate limiting: 10 requests/minute per IP for submissions, 30/min for admin, 60/min for search
- Per-user rate limiting for authenticated operations
- Input validation on all fields
- Body size limit: 50 KB
- Duplicate submission detection
- Idempotency key support to prevent duplicate submissions on retry
