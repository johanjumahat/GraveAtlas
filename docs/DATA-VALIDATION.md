# GraveAtlas Data Validation

## Overview

All data entering GraveAtlas is validated at multiple layers. Validation is deterministic (no AI, no probabilistic scoring) and runs on both the client and server.

## Validation Layers

```
1. Client-side (Android) — basic field checks before submission
2. Server-side (Cloudflare Worker) — comprehensive validation on receipt
3. Pre-publication — second validation pass before writing to GitHub repo
4. CI (GitHub Actions) — data validation on push to data repository
```

## Server-Side Validation

### Input Constraints

| Constraint | Value |
|------------|-------|
| Max body size | 50 KB |
| Max field length | 2,000 chars (name: 500, notes: 2,000, report: 5,000) |
| Allowed fields only | Fields not in the allowed list are rejected |
| Content-Type | Must be valid JSON |

### Field Validation

#### Grave Record
| Field | Type | Constraints |
|-------|------|-------------|
| name | string | Required, max 500 chars |
| birthDate | string | YYYY-MM-DD format |
| deathDate | string | YYYY-MM-DD format |
| cemetery | string | Max 2,000 chars |
| section | string | Max 2,000 chars |
| plot | string | Max 2,000 chars |
| latitude | number | -90 to 90 |
| longitude | number | -180 to 180 |
| notes | string | Max 2,000 chars |

#### Cemetery Record
| Field | Type | Constraints |
|-------|------|-------------|
| name | string | Required, max 2,000 chars |
| altNames | string | Max 2,000 chars |
| localName | string | Max 2,000 chars |
| countryCode | string | ISO 3166-1 alpha-2 (2 chars) |
| country | string | Max 500 chars |
| region | string | Max 500 chars |
| city | string | Max 500 chars |
| latitude | number | -90 to 90 |
| longitude | number | -180 to 180 |
| cemeteryType | string | Enum: public, private, religious, military, historical, other |
| operatingStatus | string | Enum: active, closed, abandoned, unknown |
| website | string | Must start with http:// or https:// |
| description | string | Max 5,000 chars |

#### Correction Record
| Field | Type | Constraints |
|-------|------|-------------|
| targetId | string | Required |
| targetType | string | Enum: grave, cemetery, person, source |
| corrections | object | Required, field-by-field corrections |
| reason | string | Max 2,000 chars |
| sourceRefs | array | String array |

#### Person Record
| Field | Type | Constraints |
|-------|------|-------------|
| displayName | string | Required, max 500 chars |
| givenNames | string | Max 500 chars |
| familyName | string | Max 500 chars |
| birthDate | string | YYYY, YYYY-MM, YYYY-MM-DD, unknown, approx_* |
| deathDate | string | Same as birthDate |
| biography | string | Max 5,000 chars |
| memorialNotes | string | Max 2,000 chars |

### Path Sanitization

All file paths are sanitized using `sanitizePathSegment()`:
- Removes `..` traversal attempts
- Removes leading/trailing slashes
- Removes null bytes
- Allows only alphanumeric, underscore, hyphen, and dot

### ID Format Validation

| Entity | Pattern |
|--------|---------|
| Grave | `grave_[a-z0-9]{16,64}` |
| Cemetery | `cemetery_[a-z0-9]{16,64}` or `[a-z0-9]{8,64}` |
| Person | `person_[a-z0-9]{16,64}` |
| Source | `source_[a-z0-9]{16,64}` |
| Correction | `correction_[a-z0-9]{16,64}` |
| Submission | `sub_[a-z0-9]{16,64}` |
| Audit | `audit_[a-z0-9]+` |

### Date Validation

- Full dates: `YYYY-MM-DD` (with month 01-12, day 01-31)
- Partial dates: `YYYY-MM` or `YYYY`
- Unknown: literal string `unknown`
- Approximate: `approx_YYYY` or `approx_YYYY-MM`
- Impossible dates: death before birth → rejected

### Coordinate Validation

- Latitude: -90 to 90 (inclusive)
- Longitude: -180 to 180 (inclusive)
- (0, 0) is valid — Null Island is a real coordinate
- `null` coordinates are allowed (records without location data)

## Duplicate Detection

Before submission acceptance, the backend checks for likely duplicates:
- Same cemetery + same name → flagged
- Same coordinates (within 0.0001°) → flagged
- Same name + same dates → flagged
- Flagged duplicates go to moderation (not auto-rejected)

## Data Quality Checks

Run on-demand by admins and in CI. See `docs/DATA-QUALITY.md` for the full list.

### Error (blocks publication)
- Missing required fields (id, name, status, submittedAt)
- Invalid coordinates (out of range)
- Impossible dates (death before birth)
- Invalid country codes
- Duplicate IDs
- Broken entity references (orphaned graves, broken source refs)

### Warning (does not block)
- No coordinates
- No source references
- No country info
- Orphaned person records

## CI Validation

The `data-validation.yml` GitHub Actions workflow runs on every push/PR touching data files:
- JSON syntax validation
- Required field presence
- Coordinate range checks
- Country code format
- Website URL format
- Impossible date detection
- Duplicate ID detection
- Broken entity references
- Secret scanning (no tokens, keys, passwords in data)

## Idempotency

Submission endpoints support `Idempotency-Key` header:
- Same key + same submission → returns cached result
- Prevents duplicate submissions on network retry
- Keys expire after 1 hour
