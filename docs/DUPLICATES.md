# Duplicate Detection

## Overview

Imported records are compared against existing GraveAtlas records using deterministic matching signals.

## Classification

| Classification | Score Range | Action |
|----------------|-------------|--------|
| EXACT_DUPLICATE | ≥ 0.95 | Reject from import — do not create duplicate |
| HIGH_CONFIDENCE_MATCH | ≥ 0.80 | Admin review — merge or keep both |
| POSSIBLE_MATCH | ≥ 0.50 | Human review required — manual decision |
| NEW_RECORD | < 0.50 | Import as new record |

Uncertain records are NEVER automatically merged.

## Matching Signals

| Signal | Weight | Method |
|--------|--------|--------|
| Name similarity | 30% | Levenshtein string similarity |
| Cemetery match | 20% | Exact string comparison (case-insensitive) |
| Birth date match | 15% | Exact match |
| Death date match | 15% | Exact match |
| Coordinates proximity | 10% | Haversine distance (< 50km = 1.0, < 500km = 0.5) |
| Country code match | 10% | Exact ISO code match |

## Score Calculation

Final score = (weighted sum) / (total weight of matched fields)

Fields that are null/missing in either record do not contribute to the score.

## Duplicate Review

Administrators can inspect:
- Existing record (full details)
- Imported record (full details)
- Matching fields (highlighted)
- Conflicting fields (highlighted)
- Source information for both records

Review actions:
- **MERGE** — Combine records, keeping the more complete version
- **KEEP_BOTH** — Both records remain as separate entries
- **REJECT_IMPORT** — Discard the imported record

Every merge creates an audit event.

## Idempotency

Processing the same dataset/version twice should not create duplicate records:
- `source_id` + `dataset_version` + `record identity` = unique import key
- If the same import is submitted twice, the previous import is detected
- The system does not duplicate the entire dataset
