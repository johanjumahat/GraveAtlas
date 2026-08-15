# Grave API Gateway

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/external/sources` | GET | List implemented external sources |
| `/api/external/registry` | GET | Full source registry (including not-implemented) |
| `/api/external/query` | POST | Query a specific external source |
| `/api/external/query-all` | POST | Query all implemented sources in parallel |
| `/api/external/health` | GET | API health dashboard |
| `/api/external/match-cemetery` | POST | Match external cemetery against GraveAtlas |
| `/api/external/match-records` | POST | Match external records against GraveAtlas |
| `/api/external/validate` | POST | Validate external records for data quality |
| `/api/external/privacy-review` | POST | Review external record for privacy concerns |

## Authentication

The gateway inherits the existing GraveAtlas API authentication system.
No provider credentials are ever exposed to clients.

## Error Normalization

All connector errors are normalized through `failure-handler.js`:
- `timeout`, `unauthorized`, `forbidden`, `not_found`, `rate_limited`
- `server_error`, `malformed_response`, `schema_change`, `provider_outage`
- Each error includes: type, severity (transient/permanent/critical), canRetry
