# Imports

## Overview

The import framework provides a controlled pipeline for importing legitimate open-data datasets into GraveAtlas.

## Pipeline

```
SOURCE
  ↓
DOWNLOAD
  ↓
LICENSE CHECK
  ↓
SOURCE REGISTRATION
  ↓
FORMAT DETECTION
  ↓
NORMALIZATION
  ↓
VALIDATION
  ↓
DUPLICATE DETECTION
  ↓
QUALITY CHECK
  ↓
IMPORT QUEUE
  ↓
MODERATION
  ↓
PUBLISH
```

## Import Status Workflow

```
CREATED
  ↓
LICENSE_REVIEW
  ↓
VALIDATING
  ↓
DUPLICATE_CHECK
  ↓
PENDING_APPROVAL
  ↓
APPROVED
  ↓
IMPORTING
  ↓
COMPLETED / PARTIAL / FAILED
```

Invalid transitions are rejected. Terminal states (COMPLETED, REJECTED, ROLLED_BACK) cannot transition further.

## Supported Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| CSV | .csv | Comma-separated, header row required |
| JSON | .json | Array of objects |
| GeoJSON | .geojson | FeatureCollection with properties |
| XML | .xml | Simple XML structure |

Unsupported formats (e.g., .exe, .sh, .bat) are rejected.

## Security

- Imported files are treated as untrusted data
- No file is ever executed as code
- File type, size, content, and encoding are validated
- Suspicious content patterns are rejected (script tags, eval, PHP tags)
- Maximum file size: 10 MB
- Maximum records per import: 10,000

## Import Report

Every import produces a report with:
- Import ID, source, dataset version
- Start/end timestamps
- Records read, valid, rejected, imported
- Duplicates detected
- Warnings and errors
- Success/partial success/failure status

## Import Preview

Before approval, administrators see:
- Source, license, dataset version
- Total records, valid records, invalid records
- Possible duplicates
- Warnings and errors
- Estimated final record count
- Sample records (first 5)

## Admin Approval

Approval must be explicit. No import is auto-published.

## Import Monitoring

Admin dashboard shows:
- Active imports, completed imports, failed imports
- Pending review, rejected imports
- Records processed, duplicates, errors, warnings

All metrics come from actual data. No fabricated statistics.

## Import History

For each import, historical records are maintained:
- Import ID, source, dataset version
- Timestamp, status, record counts
- Validation results, duplicate results
- Administrator, rollback status

## Idempotency

Processing the same dataset/version twice does not create duplicates. Uses `source_id` + `dataset_version` + record identity as a unique key.
