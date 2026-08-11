# GraveAtlas Publication Pipeline

## Overview

The publication pipeline handles moving approved submissions from `pending/` to their public directories (`graves/`, `cemeteries/`, etc.) via the GitHub API. It includes retry logic, change diff generation, merge conflict detection, and rate limit handling.

## Publication States

| State | Description |
|---|---|
| QUEUED | Publication record created, waiting to begin |
| PUBLISHING | Write in progress |
| PUBLISHED | Successfully written to GitHub repo |
| FAILED | All retry attempts exhausted |
| RETRYING | Retry attempt in progress |

### State Transitions

```
QUEUED → PUBLISHING → PUBLISHED (success)
                  → FAILED (error)
PUBLISHING → PUBLISHED (success)
           → FAILED (error)
FAILED → RETRYING (admin triggers retry)
RETRYING → PUBLISHING (retry starts)
        → FAILED (retry exhausted)
```

## Retry Policy

- **Max attempts:** 3
- **Backoff:** Exponential — 1s, 2s, 4s between attempts
- **Retryable errors:** Server errors (5xx), rate limits (403/429), conflicts (409)
- **Non-retryable:** Not found (404), permission denied (403), validation (422)
- **Rate limit handling:** If GitHub returns 403 with `X-RateLimit-Remaining: 0` or 429, waits the specified `Retry-After` period before retrying

### Safe Retry

On failure, the approved state is preserved — the submission stays in `pending/` and the publication record is marked `FAILED`. Admins can trigger a retry via:

```
POST /api/admin/publication/{id}/retry
```

The submission is never lost — it can be retried until it succeeds or an admin intervenes.

## Change Diff

Every publication generates a structured diff showing what changed:

```json
{
  "added": { "field": "value" },
  "modified": { "field": { "from": "old", "to": "new" } },
  "removed": { "field": "old_value" },
  "unchanged": ["id", "name"]
}
```

The diff is stored in the audit event and summarized in the commit message.

## Merge Conflict Detection

Before writing, the pipeline reads the existing file and checks:
1. **Newer existing record:** If the existing record has a newer `updatedAt` timestamp, the write is blocked as a potential concurrent modification conflict.
2. **Identical content:** If the content is unchanged, the write is treated as idempotent (no conflict, no error).
3. **No existing file:** New record — no conflict.

Conflicts require moderator intervention — they are not auto-retried.

## Mass Change Protection

- **Max batch size:** 50 records per publication operation
- Batches exceeding this limit are rejected with an error
- Prevents accidental mass overwrites

## Schema Versioning

- **Current version:** `1.0.0`
- Every published record includes a `schemaVersion` field
- Future schema changes will bump this version
- Records without a version are treated as `1.0.0` on read

## Rate Limit Handling

The GitHub API functions detect rate limiting from response headers:

| Header | Meaning |
|---|---|
| `X-RateLimit-Remaining: 0` | All requests consumed |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |
| `Retry-After` | Seconds to wait (for 429 responses) |

When rate limited, the publication pipeline waits the specified duration before retrying.

## Error Categorization

| HTTP Status | Type | Retryable | Action |
|---|---|---|---|
| 404 | not_found | No | Fail immediately |
| 403 (remaining=0) | rate_limited | Yes | Wait, then retry |
| 403 (other) | permission_denied | No | Fail immediately |
| 409 | conflict | Yes | Retry (merge check on next attempt) |
| 422 | validation | No | Fail immediately |
| 500+ | server_error | Yes | Retry with backoff |

## API Endpoints

### GET /api/admin/publication/{id}
Get publication record status (state, attempts, errors).

### POST /api/admin/publication/{id}/retry
Retry a failed publication. Only works on records in `FAILED` state.

## Audit Trail

Every publication attempt records:
- Publication ID
- Submission ID
- Number of attempts
- Final state (PUBLISHED or FAILED)
- Change diff (what was added/modified/removed)
- Error details (if failed)
- Timestamps (created, published, updated)
