# Grave API Health Dashboard

## Overview (Part 26)

Internal dashboard showing actual measurements for each external source:

| Metric | Description |
|--------|-------------|
| SOURCE | Source name |
| STATUS | active / not_implemented |
| LAST SUCCESS | Timestamp of last successful query |
| LAST FAILURE | Timestamp of last failed query |
| LATENCY | Average latency in ms (rolling 20 requests) |
| RATE-LIMIT STATUS | ok / degraded |
| RECORDS PROCESSED | Total records retrieved |
| SCHEMA STATUS | ok / requires_review |
| LICENSE STATUS | verified / unverified |

## API Endpoint

```
GET /api/external/health
```

Returns:

```json
{
  "sources": [...],
  "cache": { "totalEntries": 5, "expiredEntries": 0 },
  "cost": { "period": "2026-08", "sources": [...] },
  "generatedAt": "2026-08-15T12:00:00.000Z"
}
```

## Implementation

File: `backend/src/external-connectors/health-dashboard.js`
