# GraveAtlas Audit Trail

## Overview

Every significant action in GraveAtlas creates an audit event. Audit events are stored in the `audit/` directory in the data repository as individual JSON files.

## Audit Event Structure

```json
{
  "id": "audit_<hex>",
  "entityId": "grave_abc123",
  "entityType": "grave",
  "action": "APPROVE",
  "actorType": "admin",
  "actorId": null,
  "timestamp": "2026-08-09T12:00:00.000Z",
  "reason": "Submission approved and published",
  "note": null,
  "previousState": { "status": "pending" },
  "newState": { "status": "published" },
  "moderationDecision": null
}
```

## Audit Actions

| Action | Description |
|--------|-------------|
| `CREATE` | New record created |
| `UPDATE` | Record modified (e.g., correction applied) |
| `DELETE` | Record deleted |
| `APPROVE` | Submission approved and published |
| `REJECT` | Submission or correction rejected |
| `REQUEST_CORRECTION` | Correction requested for a record |
| `VERIFY` | Record verification status set to verified |
| `UNVERIFY` | Record verification status removed |
| `REPORT` | Report submitted for a record |
| `RESTORE` | Archived/removed record restored |

## What Gets Audited

- Submission approvals and rejections
- Correction approvals and rejections
- Report submissions and resolutions
- Record restorations
- Verification status changes
- Data quality check runs (via dashboard, not stored as events)

## What Does NOT Get Audited

- Public read operations (GET requests)
- Health checks
- Search queries
- Cache operations

## Audit API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/audit` | Admin | List audit events (paginated, filterable) |
| GET | `/api/admin/audit/:entityId` | Admin | Full audit trail for a specific entity |

### Filters

- `?action=APPROVE` — Filter by action type
- `?entityType=grave` — Filter by entity type
- `?limit=20&offset=0` — Pagination

## Security

- Audit events do not store credentials, tokens, or secrets
- Internal moderation notes are not included in the public audit list
- Only admins can access audit events
- Audit events are append-only (never modified or deleted through the API)

## Correction Audit Trail

When a correction is accepted, the audit event records:
- `previousState`: The field values before the correction
- `newState`: The corrected field values
- `reason`: The correction reason provided by the contributor

This ensures the previous value is always recoverable from the audit trail.

## Data Recovery via Audit

The audit trail can be used to:
1. Identify when a bad change was made (by timestamp)
2. See what the previous state was (from `previousState`)
3. Manually restore the previous state (via admin restore endpoint)
4. Trace who made the change and why (from `actorType` and `reason`)
