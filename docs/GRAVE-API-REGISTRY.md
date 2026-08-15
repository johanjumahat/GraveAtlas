# Grave API Registry

## Evaluated Sources

| Source | Status | License | Region |
|--------|--------|---------|--------|
| OpenStreetMap (Overpass API) | **Implemented** | ODbL 1.0 | Global |
| Wikidata SPARQL | Evaluated (not implemented) | CC0 | Global |
| VA NCA Gravesite Locator | Evaluated (not implemented) | Public domain (US federal) | US |
| Commonwealth War Graves Commission | Evaluated (not implemented) | CC-BY 4.0 | Commonwealth |
| Find A Grave | **Rejected** (Terms restrict scraping) | Proprietary | Global |
| BillionGraves | Evaluated (not implemented) | Restricted | Global |

## Implementation Details

### OpenStreetMap (Overpass API)
- **Endpoint:** `https://overpass-api.de/api/interpreter`
- **Data:** Cemetery boundaries and point locations (not individual burial records)
- **Auth:** None (public read-only, must send User-Agent)
- **Rate limit:** ~10,000 queries/day on main instance
- **Attribution:** "© OpenStreetMap contributors" required on display
- **Connector:** `backend/src/external-connectors/connectors/osm-connector.js`
- **Importer:** `backend/src/importers/osm-overpass.js`

### Wikidata SPARQL
- **Endpoint:** `https://query.wikidata.org/sparql`
- **Data:** Cemetery entities, notable burial places of notable people
- **Auth:** None (read queries, User-Agent recommended)
- **License:** CC0 (public domain)
- **Connector:** `backend/src/external-connectors/connectors/wikidata-connector.js`
- **Status:** Connector implemented, not yet wired to import pipeline

## Source Verification

All source entries were evaluated on 2026-08-11 by reading the cited documentation URLs.
Only OpenStreetMap has a live, tested connector. No source's data has been imported/stored
in GraveAtlas without going through the import moderation pipeline.
