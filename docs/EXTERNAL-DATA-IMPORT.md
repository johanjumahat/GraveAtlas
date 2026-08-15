# External Data Import

## Overview (Part 20)

Controlled import states for external data:

```
DISCOVERED → LICENSE_CHECK → VALIDATED → MATCH_REVIEW → APPROVED → IMPORTED → VERIFIED
```

Any state can transition to REJECTED. Invalid transitions are blocked.

## Import Flow

1. **DISCOVERED** — Record found via external API query
2. **LICENSE_CHECK** — License evaluated by licensing engine
3. **VALIDATED** — Data quality check passed (dates, coordinates, required fields)
4. **MATCH_REVIEW** — Record matched against GraveAtlas records
5. **APPROVED** — Human reviewer approves the import
6. **IMPORTED** — Record written to GraveAtlas with provenance
7. **VERIFIED** — Record verified as correctly imported

## Existing Import Framework

GraveAtlas already has an import pipeline (`import-framework.js`) with:
- License verification
- Format detection (CSV, JSON, GeoJSON, XML)
- Normalization
- Validation
- Duplicate detection
- Quality check
- Import queue with moderation

The external connector layer feeds into this existing framework. External records go through the same moderation pipeline.

## Original References

All external data references are preserved during import. The provenance chain (source → API → external ID → retrieval time → transformation) is never lost.

## Implementation

- Import states: `backend/src/external-connectors/normalized-schema.js` (`IMPORT_STATES`, `VALID_IMPORT_TRANSITIONS`)
- Import pipeline: `backend/src/import-framework.js`
- Import handlers: `backend/src/import-handlers.js`
