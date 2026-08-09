# Correction System

## Overview

Users can suggest corrections to existing grave, cemetery, and person records. Corrections go through a moderation workflow — no correction is applied directly from the client.

## Workflow

```
SUBMITTED → PENDING_REVIEW → APPROVED → APPLIED
                         ↘ REJECTED (terminal)
                         ↘ CHANGES_REQUESTED → PENDING_REVIEW (resubmit)
```

## Submitting a Correction

```
POST /api/contributions
Headers: X-User-Id: user_xxx
Content-Type: application/json

{
  "type": "correction",
  "data": {
    "targetId": "grave_abc123",
    "targetType": "grave",
    "corrections": {
      "name": "Jane Doe (corrected spelling)",
      "deathDate": "2001-03-15"
    },
    "reason": "Name was misspelled and death date was off by one year",
    "sourceRefs": ["https://example.com/obituary"]
  }
}
```

### Required Fields

| Field | Description |
|-------|-------------|
| `targetId` | ID of the record to correct |
| `targetType` | `grave`, `cemetery`, or `person` |
| `corrections` | Object with field names and proposed values |
| `reason` | Explanation of why the correction is needed |

### Validation

- `targetId` must be a non-empty string
- `targetType` must be one of: `grave`, `cemetery`, `person`
- `corrections` must be a non-empty object
- `reason` must be a non-empty string
- Path traversal in targetId is rejected

## Correction Types

Users can suggest corrections for:

- **Incorrect name** — Person or cemetery name is wrong
- **Incorrect date** — Birth or death date is wrong
- **Incorrect cemetery** — Grave is associated with wrong cemetery
- **Incorrect coordinates** — GPS coordinates are wrong
- **Duplicate record** — Record is a duplicate of another
- **Missing information** — Record is missing data that should be present
- **Incorrect source** — Source reference is wrong or broken

## Authorization

- Users can only see their own submitted corrections (via contribution history)
- Moderators review corrections via admin endpoints
- Corrections are never applied directly from the Android client
- The backend applies approved corrections to the GitHub data repository

## Draft Support

Users can save incomplete corrections as drafts:

```
POST /api/drafts
{
  "type": "correction",
  "data": { ...partial correction data... }
}
```

Drafts can be updated, deleted, or submitted for review.
