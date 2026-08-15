# Grave API Cost Control

## Overview (Part 24)

Prefers: free APIs, open datasets, cached results, incremental synchronization, local processing.

## Cost Rules

1. **Free sources** (CC0, ODbL, Public Domain) — no limits
2. **Paid sources** — explicit approval required before use. System returns:
   ```
   STOP_AND_REQUEST_APPROVAL
   ```
3. **Unknown sources** — monthly limit of 10,000 requests

## Monthly Tracking

Request counts are tracked per source, per month. Stats are available in the health dashboard.

```javascript
const stats = getCostStats();
// Returns: { period: "2026-08", sources: [{ sourceId, monthlyRequests }] }
```

## Implementation

File: `backend/src/external-connectors/cost-control.js`
