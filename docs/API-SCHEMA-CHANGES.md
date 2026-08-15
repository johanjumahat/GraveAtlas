# API Schema Changes

## Overview (Part 14)

Detects external API changes:
- Renamed fields
- Removed fields
- Changed field types
- Changed endpoints
- Changed authentication
- Changed response structure

## Detection

When a response is received, its field schema is inferred and compared to the last-known schema:

```javascript
const schema = inferSchema(sampleRecord);
const schemaRecord = recordSchema(sourceId, schema);
if (shouldQuarantine(schemaRecord)) {
  // Data quarantined — does not corrupt database
}
```

## Change Types

| Type | Severity | Action |
|------|----------|--------|
| removed | high | Quarantine data |
| type_changed | high | Quarantine data |
| added | low | Allow, log for review |

## Quarantine

Incompatible data is quarantined rather than imported. This prevents database corruption from API changes.

## Implementation

File: `backend/src/external-connectors/schema-detector.js`
