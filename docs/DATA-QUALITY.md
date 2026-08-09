# GraveAtlas Data Quality

## Overview

GraveAtlas runs deterministic (non-AI) data quality checks to maintain data integrity. Checks are run on demand by admins and automatically in CI.

## Quality Check Categories

### ERROR (blocks publication)

| Check | Description |
|-------|-------------|
| `missing_id` | Record lacks required `id` field |
| `missing_name` | Record lacks required `name` field |
| `invalid_lat` | Latitude outside -90 to 90 |
| `invalid_lon` | Longitude outside -180 to 180 |
| `impossible_date` | Death date before birth date |
| `invalid_country_code` | Country code not ISO 3166-1 alpha-2 |
| `malformed_url` | Website URL doesn't start with http:// or https:// |
| `invalid_json` | File contains invalid JSON |
| `duplicate_id` | Same ID appears in multiple records |
| `orphaned_grave` | Grave references a cemetery that doesn't exist |
| `broken_ref` | Entity references a non-existent entity |

### WARNING (does not block, but should be reviewed)

| Check | Description |
|-------|-------------|
| `no_coordinates` | Record has no coordinates |
| `no_source` | Record has no source references |
| `no_country` | Cemetery has no country information |
| `orphaned_person` | Person references a grave that doesn't exist |
| `missing_status` | Record missing `status` field |
| `missing_submittedAt` | Record missing `submittedAt` field |

### INFO (informational only)

| Check | Description |
|-------|-------------|
| `no_photo` | Record has no photo |

## Running Quality Checks

### On-Demand (Admin API)

```
GET /api/admin/data-quality
Authorization: Bearer <ADMIN_TOKEN>
```

Returns all errors, warnings, and info categorized.

### CLI (Local or CI)

```bash
node scripts/data-quality-check.js [path-to-data-repo]
```

Exit code 0 = no errors, exit code 1 = errors found.

### CI (GitHub Actions)

The `data-validation.yml` workflow runs on every push/PR that touches data files. It checks:
- JSON syntax
- Required fields (id, name, status, submittedAt)
- Coordinate ranges
- Country code format
- Website URL format
- Impossible dates
- Duplicate IDs
- Broken entity references
- Secret scanning

## Deterministic Checks Only

All checks use deterministic code — no AI, no fuzzy matching, no probabilistic scoring. This ensures:
- Reproducible results
- No false positives from AI hallucination
- No cost from AI API calls
- Fast execution

## What Is NOT Treated as an Error

- Missing photos (INFO, not ERROR)
- Missing coordinates (WARNING, not ERROR)
- Missing source references (WARNING, not ERROR)
- Missing country info (WARNING, not ERROR)

Optional information is never treated as an error.
