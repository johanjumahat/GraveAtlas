# External Grave Schema

## Normalized Record (Part 5)

All external records are normalized to a canonical schema. Every field is nullable — we never invent missing data.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| externalRecordId | string | Unique ID from external source |
| personName | string | Full name of deceased |
| givenNames | string | Given/first names |
| familyName | string | Family/surname |
| cemetery | string | Cemetery name |
| cemeteryId | string | External cemetery identifier |
| burialDate | string | Date of burial (ISO 8601) |
| deathDate | string | Date of death (ISO 8601) |
| birthDate | string | Date of birth (ISO 8601) |
| gravePlot | string | Plot/grave number |
| section | string | Cemetery section |
| row | string | Row within section |
| latitude | number | Cemetery/plot latitude |
| longitude | number | Cemetery/plot longitude |
| recordUrl | string | URL to original record |
| sourceOrganization | string | Source organization name |
| sourceId | string | Source identifier (registry key) |
| sourceTimestamp | string | When data was retrieved |
| sourceVersion | string | Source data version |
| license | string | License of the data |
| confidence | string | high / medium / low / unverified |
| status | string | external / imported / verified |

### Confidence Levels

- **high** — Exact match on identifiers
- **medium** — Strong name + date match
- **low** — Partial match, needs review
- **unverified** — Not yet validated

### Import States (Part 20)

```
DISCOVERED → LICENSE_CHECK → VALIDATED → MATCH_REVIEW → APPROVED → IMPORTED → VERIFIED
```

Any state can transition to REJECTED. Invalid transitions are blocked.
