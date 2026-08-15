# API Caching

## Overview (Part 12)

External data is cached only when the source's license permits it.

## Cache Entry Fields

| Field | Description |
|-------|-------------|
| key | Query identifier (sourceId + query hash) |
| data | Cached records |
| sourceId | Source identifier |
| retrievalTime | When data was fetched |
| expiry | TTL-based expiry timestamp |
| sourceVersion | Source data version |

## Cache TTL

| Source | TTL |
|--------|-----|
| OSM Overpass | 24 hours |
| Wikidata SPARQL | 24 hours |

## Rules

- Cache only when `isCachingPermitted(sourceEntry)` returns true
- Expired entries are evicted on read
- Cache can be cleared per-source or globally
- Cache stats available for health dashboard

## Implementation

File: `backend/src/external-connectors/cache.js`
