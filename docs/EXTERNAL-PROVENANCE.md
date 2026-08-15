# External Provenance

## Overview (Part 8)

Every imported/external record retains a complete provenance chain:

```
SOURCE → API → EXTERNAL RECORD ID → RETRIEVAL TIME → TRANSFORMATION → GRAVEATLAS REPRESENTATION
```

## Provenance Fields

| Field | Description |
|-------|-------------|
| sourceId | Registry source identifier |
| sourceName | Human-readable source name |
| apiEndpoint | API URL that was queried |
| externalRecordId | Original record ID from external source |
| retrievalTime | ISO timestamp of data retrieval |
| transformation | How data was transformed (e.g., "normalized") |
| graveAtlasId | GraveAtlas record ID (if imported) |

## Verification

```javascript
const { complete, missing } = verifyProvenance(record);
// Returns: { complete: boolean, missing: string[] }
```

Required fields: `sourceId`, `sourceName`, `externalRecordId`, `retrievalTime`

## Source Badges (Part 9)

Provenance data powers the GUI source badge:

```
SOURCE: OpenStreetMap (via Overpass API)
STATUS: External / Source-backed
RETRIEVED: 2026-08-15
LICENSE: ODbL 1.0
```

External records never appear as native GraveAtlas records.

## Implementation

File: `backend/src/external-connectors/provenance.js`
