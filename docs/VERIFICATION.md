# GraveAtlas Verification

## Overview

Every record in GraveAtlas has a verification status that indicates how reliably the information has been confirmed. Verification status is always visible to users.

## Verification States

| Status | Meaning | Display Label |
|--------|---------|----------------|
| `unverified` | Record exists but has not been verified | Unverified |
| `community_submitted` | Submitted by a community member | Community Submitted |
| `under_review` | Currently being reviewed by moderators | Under Review |
| `verified` | Verified against authoritative sources | Verified |
| `rejected` | Submitted but rejected during review | Rejected |

## Rules

1. Community-submitted information is **never** presented as verified.
2. Verification status is visible on cemetery details, grave details, and person details.
3. Unverified information is clearly labeled.
4. The status flow is one-way: a record can move from `community_submitted` → `under_review` → `verified` or `rejected`.
5. A `rejected` record stays in the `pending/` directory and is not published.

## Workflow

```
User submits record
     ↓
Status: community_submitted (stored in pending/)
     ↓
Admin opens review
     ↓
Status: under_review
     ↓
Admin verifies against sources
     ↓
APPROVED: Status → verified, record published (moved to graves/ or cemeteries/)
REJECTED: Status → rejected, record stays in pending/
```

## Admin API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/submissions` | Admin token | List pending submissions |
| POST | `/api/admin/submissions/:id/approve` | Admin token | Approve and publish |
| POST | `/api/admin/submissions/:id/reject` | Admin token | Reject submission |

Admin authentication uses a bearer token (stored as Cloudflare secret, constant-time comparison).

## Source References

Verified records should include `sourceRefs` pointing to Source records. Sources document:
- Where the information came from
- What type of source (official record, photograph, etc.)
- Attribution and license requirements
- When the source was checked

Do not claim a source was checked when it was not. Do not fabricate sources.

## Corrections and Verification

When a correction is accepted, the corrected record's verification status may change:
- If the correction adds verified information, status can upgrade to `verified`
- If the correction disputes existing information, status may change to `under_review`
- The correction itself has its own audit trail (accepted/rejected with review notes)
