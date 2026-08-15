# External Map Data

## Overview (Part 19)

External cemetery geographic data can be shown on the GraveAtlas map when licensing and technical conditions permit.

## Display Distinction

The map clearly distinguishes:
- **GraveAtlas geometry** — native records (solid styling)
- **External geometry** — sourced from OSM/Wikidata (dashed/outlined styling with source badge)
- **Inferred geometry** — AI-computed locations (transparent/dotted styling)

## Data Sources

### OpenStreetMap (ODbL)
- Cemetery boundaries (polygons) and point locations
- Attribution: "© OpenStreetMap contributors" displayed on map
- Cache TTL: 24 hours

### Wikidata (CC0)
- Cemetery coordinates (point locations only)
- No attribution required (but credited as good practice)

## Merge Rules

- **Never** merge uncertain boundaries automatically
- External geometry is displayed as a separate layer
- Users can compare GraveAtlas records with external data

## Implementation

External map data is fetched via `/api/external/query` with a geographic query parameter. The `OSMConnector` returns cemetery boundaries; the `WikidataConnector` returns point coordinates.
