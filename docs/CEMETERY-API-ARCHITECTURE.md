# Cemetery API Architecture

## Connector Pipeline

Every external source follows this standardized pipeline:

```
DISCOVER → CONNECT → AUTHENTICATE → REQUEST → VALIDATE → NORMALIZE
→ PROVENANCE → CACHE → STORE/REFERENCE → DISPLAY
```

## Key Files

| Component | File |
|-----------|------|
| Base connector interface | `backend/src/external-connectors/connector-base.js` |
| Normalized schema | `backend/src/external-connectors/normalized-schema.js` |
| Provenance tracking | `backend/src/external-connectors/provenance.js` |
| Licensing engine | `backend/src/external-connectors/licensing.js` |
| Rate limiter | `backend/src/external-connectors/rate-limiter.js` |
| Authorized cache | `backend/src/external-connectors/cache.js` |
| Failure handler | `backend/src/external-connectors/failure-handler.js` |
| Schema detector | `backend/src/external-connectors/schema-detector.js` |
| Audit logger | `backend/src/external-connectors/audit-log.js` |
| API gateway | `backend/src/external-connectors/gateway.js` |
| Cemetery matcher | `backend/src/external-connectors/matching/cemetery-matcher.js` |
| Record matcher | `backend/src/external-connectors/matching/record-matcher.js` |
| Search fallback | `backend/src/external-connectors/search-fallback.js` |
| Privacy & security | `backend/src/external-connectors/privacy-security.js` |
| Cost control | `backend/src/external-connectors/cost-control.js` |
| Data quality | `backend/src/external-connectors/data-quality.js` |
| Health dashboard | `backend/src/external-connectors/health-dashboard.js` |

## Connector Isolation

Each connector inherits from `BaseConnector` and is isolated:
- A failed external API returns a fallback response, never crashes GraveAtlas
- Rate limiting is per-connector, preventing request storms
- License checks block unauthorized imports before any data is processed
- Schema changes quarantine data rather than corrupting the database
