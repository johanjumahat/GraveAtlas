# Record Matching

## Overview (Part 7)

Identifies potential duplicate records between external sources and GraveAtlas using multi-factor scoring.

## Matching Factors

| Factor | Weight | Method |
|--------|--------|--------|
| External ID match | 100% (if match) | Direct ID comparison |
| Name similarity | 35% | Normalized string comparison |
| Date similarity | 25% | Year-level or exact date match |
| Cemetery match | 20% | Name similarity of cemetery |
| Geographic proximity | 20% | Haversine distance < 0.5km |

## Confidence Thresholds

- **high** (≥80% score) — Strong match
- **medium** (≥60% score) — Likely match
- **low** (≥40% score) — Possible match

## Auto-Merge Rules

- Score ≥ 85%: Auto-merge allowed
- Score < 85%: Human review required for authoritative merges
- **Never** merge uncertain records automatically

## Implementation

File: `backend/src/external-connectors/matching/record-matcher.js`

```javascript
// Match a single external record
const matches = matchRecord(externalRecord, graveAtlasRecords);

// Batch match multiple records
const results = batchMatchRecords(externalRecords, graveAtlasRecords);
```
