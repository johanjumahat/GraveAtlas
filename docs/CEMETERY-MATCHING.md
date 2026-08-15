# Cemetery Matching

## Overview (Part 6)

External cemetery entities are matched against GraveAtlas cemeteries using a weighted scoring system.

## Matching Factors

| Factor | Weight | Method |
|--------|--------|--------|
| Name similarity | 40% | Normalized string comparison (Jaccard token overlap) |
| Geographic proximity | 40% | Haversine distance in km |
| Exact ID match | 20% | Direct ID comparison |

## Confidence Thresholds

- **high** (≥80% score) — Strong match, may auto-merge at 90%+
- **medium** (≥60% score) — Likely match, requires human review
- **low** (≥50% score) — Possible match, requires human review

## Auto-Merge Rules

- Score ≥ 90%: Auto-merge allowed
- Score < 90%: Human review required
- **Never** automatically merge uncertain cemetery entities

## Implementation

File: `backend/src/external-connectors/matching/cemetery-matcher.js`

```javascript
// Match an external cemetery against GraveAtlas cemeteries
const matches = matchCemetery(externalCemetery, graveAtlasCemeteries);
// Returns: [{ externalCemetery, graveAtlasCemetery, confidence, score, reasons, autoMerge }]
```

## Name Normalization

Names are normalized before comparison:
- Lowercase
- Remove punctuation
- Collapse whitespace
- Token-based Jaccard similarity
