# AI External Search

## Overview (Parts 16 & 17)

The GraveAtlas AI layer can search external sources when:
- Integration is authorized
- Provider terms permit it
- Data is accessible
- Rate limits are respected

## AI Source Transparency (Part 17)

For every AI answer involving external data, the system provides:

```
SOURCES USED:
- Source name
- External record ID
- Retrieval time
- Source URL (if permitted)
- Evidence status
```

The AI **never** implies it searched a source that it did not actually query.

## Search Results Format

When the AI searches external sources, results identify the source:

```
"3 possible records found."

1. GraveAtlas (internal)
2. OpenStreetMap (external — ODbL)
3. Wikidata (external — CC0)
```

## Implementation

The AI external search is wired through the `/api/external/query-all` endpoint, which queries all implemented sources in parallel and returns results per source with full provenance.

## Android Integration

The `ExternalSourceClient.java` provides:
- `queryAllSources()` — query all implemented sources
- `querySource()` — query a specific source
- `getHealthDashboard()` — health status

Results include source badges showing provenance and licensing.
