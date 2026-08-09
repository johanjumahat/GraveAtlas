# Contribution System

## Contribution Types

| Type | Description | Validation |
|------|-------------|------------|
| `cemetery` | New cemetery submission | Name required, coordinates validated, country code ISO 3166-1 |
| `grave` | New grave/memorial record | Name required, cemetery or cemeteryId required, dates validated |
| `correction` | Proposed change to existing record | targetId, targetType, corrections object, reason required |
| `photo` | Photo for a cemetery or grave | targetId, targetType, photoUrl, rights declaration required |
| `report` | Report incorrect information | Routed through existing report system |

## Submission Statuses

```
DRAFT → PENDING_REVIEW → CHANGES_REQUESTED → PENDING_REVIEW (resubmit)
                     ↘ APPROVED (terminal)
                     ↘ REJECTED (terminal)
                     ↘ CANCELLED (terminal)
```

### Valid Transitions

| From | To |
|------|-----|
| DRAFT | PENDING_REVIEW, CANCELLED |
| PENDING_REVIEW | CHANGES_REQUESTED, APPROVED, REJECTED, CANCELLED |
| CHANGES_REQUESTED | PENDING_REVIEW, CANCELLED |
| APPROVED | (terminal) |
| REJECTED | (terminal) |
| CANCELLED | (terminal) |

## Creating a Contribution

```
POST /api/contributions
Headers: X-User-Id: user_xxx
Content-Type: application/json

{
  "type": "grave",
  "data": {
    "name": "John Doe",
    "cemetery": "Bukit Cemetery",
    "birthDate": "1950",
    "deathDate": "2000-01-15",
    "latitude": 1.3521,
    "longitude": 103.8198
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "contribution": {
    "id": "contrib_...",
    "type": "grave",
    "status": "PENDING_REVIEW",
    "createdAt": "2026-08-09T..."
  }
}
```

## Listing Contributions

```
GET /api/contributions?page=1&pageSize=20&type=grave&status=PENDING_REVIEW
Headers: X-User-Id: user_xxx
```

Returns paginated list of the user's own contributions. Supports filtering by type and status.

## Contribution Details

```
GET /api/contributions/:id
Headers: X-User-Id: user_xxx
```

Returns full contribution data. Users can only access their own contributions — attempting to view another user's contribution returns 403.

## Cancelling a Contribution

```
POST /api/contributions/:id/cancel
Headers: X-User-Id: user_xxx
```

Only works for contributions in DRAFT, PENDING_REVIEW, or CHANGES_REQUESTED status. Approved and rejected contributions cannot be cancelled.

## Duplicate Detection

Before submitting, users can check for potential duplicates:

```
POST /api/contributions/check-duplicate
Headers: X-User-Id: user_xxx

{
  "type": "grave",
  "data": { "name": "John Doe", "cemetery": "Bukit Cemetery" }
}
```

**Response:**
```json
{
  "success": true,
  "status": "NO_MATCH" | "POSSIBLE_DUPLICATE" | "HIGH_CONFIDENCE_MATCH" | "EXACT_DUPLICATE",
  "match": null | { ...existing record... }
}
```

### Scoring

| Score | Classification |
|-------|---------------|
| ≥ 85 | EXACT_DUPLICATE |
| ≥ 55 | HIGH_CONFIDENCE_MATCH |
| ≥ 25 | POSSIBLE_DUPLICATE |
| < 25 | NO_MATCH |

Scoring factors:
- Name exact match: 40 points
- Name partial match: 25 points
- Cemetery exact match: 20 points
- Coordinates within 1km: 20 points
- Coordinates within 500km: 10 points
- Birth date match: 10 points
- Death date match: 10 points

## Rate Limiting

- 30 contribution actions per user per hour
- Existing IP-based rate limiting remains for public endpoints
- Rate-limited responses return HTTP 429

## Audit Events

Every contribution action creates an audit event:

| Action | Trigger |
|--------|---------|
| `SUBMISSION_CREATED` | New contribution submitted |
| `DRAFT_UPDATED` | Draft created or updated |
| `CORRECTION_CREATED` | Correction submitted |
| `PHOTO_SUBMITTED` | Photo contribution submitted |
| `SUBMISSION_CANCELLED` | User cancels contribution |
| `USER_REGISTERED` | New user account created |
| `USER_PROFILE_UPDATED` | Profile updated |

Audit events are stored in `audit/` directory and include user ID, target ID, action, and timestamp. No secrets are stored in audit logs.
