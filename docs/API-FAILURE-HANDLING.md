# API Failure Handling

## Overview (Part 13)

Handles all failure modes:
- Timeout, 401, 403, 404, 429, 500-series
- Malformed responses, schema changes, provider outage

## Workflow

```
DETECT → CLASSIFY → RETRY IF SAFE → FALLBACK → LOG → ALERT
```

## Error Classification

| Error Type | Severity | Retries? |
|-----------|----------|----------|
| timeout | transient | Yes |
| rate_limited (429) | transient | Yes (with Retry-After) |
| server_error (5xx) | transient | Yes |
| network_error | transient | Yes |
| unauthorized (401) | permanent | No |
| forbidden (403) | permanent | No |
| not_found (404) | permanent | No |
| malformed_response | permanent | No |
| schema_change | permanent | No |

## Fallback Response

When a source is unavailable, GraveAtlas returns an explicit "unavailable" status — never fabricates data:

```json
{
  "sourceId": "osm-overpass",
  "status": "unavailable",
  "reason": "Source is unavailable: timeout",
  "records": [],
  "cached": false
}
```

## Implementation

File: `backend/src/external-connectors/failure-handler.js`
