# Grave API Audit Log

## Overview (Part 23)

Audits important connector actions with:

| Field | Description |
|-------|-------------|
| source | Source identifier |
| connector | Connector name |
| requestType | Type of request (query, license_check) |
| timestamp | ISO timestamp |
| status | success / failure |
| recordsProcessed | Number of records |
| errors | Error details (if any) |
| operator | system / admin |
| licenseDecision | License evaluation result |

## What Is Logged

- Successful connector queries (source, record count)
- Failed connector queries (error type, message)
- License decisions (approved, review_required, rejected)

## What Is NEVER Logged

- API keys, tokens, credentials, secrets
- Raw request/response bodies containing potential secrets

## Storage

Audit entries are written as JSONL files in the GitHub repository under `audit/external-connectors/<source>/<date>.jsonl`.

## Implementation

File: `backend/src/external-connectors/audit-log.js`

## Helper Functions

```javascript
createSuccessAudit(sourceId, requestType, recordCount)
createFailureAudit(sourceId, requestType, error)
createLicenseAudit(sourceId, decision, reason)
```
