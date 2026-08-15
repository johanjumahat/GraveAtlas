# API Connectors

## Supported Source Types (Part 4)

GraveAtlas connectors are designed for these legitimate source categories:

| Type | Example | Status |
|------|---------|--------|
| Government cemetery APIs | VA NCA Gravesite Locator | Evaluated, not implemented |
| Municipal burial systems | Singapore NEA | Implemented (importer only) |
| Cemetery operator APIs | — | Not available |
| Public genealogy datasets | Wikidata | Connector implemented |
| GIS/ArcGIS services | OpenStreetMap Overpass | Connector implemented |
| Open-data portals | data.gov.sg | Implemented (importer only) |
| Institutional archives | — | Not available |
| Public burial registries | — | Not available |

## Connector Interface (Part 3)

All connectors extend `BaseConnector` and implement the 10-step pipeline:

```
DISCOVER → CONNECT → AUTHENTICATE → REQUEST → VALIDATE → NORMALIZE
→ PROVENANCE → CACHE → STORE/REFERENCE → DISPLAY
```

### Implemented Connectors

1. **OSM Connector** (`connectors/osm-connector.js`)
   - Queries Overpass API for cemetery boundaries
   - ODbL 1.0 license, attribution required
   - Rate limit: 5s between requests, 2 retries max

2. **Wikidata Connector** (`connectors/wikidata-connector.js`)
   - SPARQL queries for cemetery entities and notable burials
   - CC0 license, no attribution required
   - Rate limit: 2s between requests, 2 retries max

### Connector Isolation

Each connector runs in isolation:
- A failed API returns a fallback response — GraveAtlas never crashes
- Rate limiting is per-connector
- License checks block before any data processing
- Schema changes quarantine data for review

## Adding a New Connector

1. Add source entry to `registry.js` with full evaluation
2. Create `connectors/<name>-connector.js` extending `BaseConnector`
3. Implement `request()`, `validate()`, `normalize()` methods
4. Register in `gateway.js` `getConnector()` switch
5. Test with live API queries
6. Set `integrationStatus: 'implemented'` in registry only after testing
