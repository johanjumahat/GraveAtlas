# API Rate Limiting

## Overview (Part 11)

Every connector respects:
- Rate limits and quotas
- Request frequency
- Retry-After headers
- Provider-specific requirements

## Implementation

Per-connector rate limiters (`ConnectorRateLimiter` class) enforce:
- Minimum interval between requests (configurable per source)
- Bounded retries with exponential backoff
- Retry-After header parsing

### Per-Source Configuration

| Source | Min Interval | Max Retries | Backoff |
|--------|-------------|-------------|---------|
| OSM Overpass | 5000ms | 2 | 10000ms |
| Wikidata SPARQL | 2000ms | 2 | 5000ms |

## Retry Logic

- Retries on: timeout (429), 500-series errors
- No retry on: 401, 403, 404, malformed responses
- Maximum backoff: 30s
- Exponential: base × 2^attempt

## No Request Storms

Rate limiters are per-connector instance, preventing concurrent request floods.

## Implementation

File: `backend/src/external-connectors/rate-limiter.js`
