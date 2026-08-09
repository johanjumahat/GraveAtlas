# Import Framework

## Overview

The Import Framework provides a controlled pipeline for importing legitimate open-data datasets into GraveAtlas.

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

Rejected imports stop at any stage. Rolled-back imports can be rolled forward.

## Supported Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| CSV | .csv | Comma-separated, header row required |
| JSON | .json | Array of objects |
| GeoJSON | .geojson | FeatureCollection with properties |
| XML | .xml | Simple XML structure |

## Recognized Licenses

| License | Attribution Required | Share-Alike |
|---------|---------------------|-------------|
| CC0 | No | No |
| Public Domain | No | No |
| PDDL | No | No |
| CC-BY | Yes | No |
| CC-BY-SA | Yes | Yes |
| ODbL | Yes | Yes |

Unrecognized licenses are marked `LICENSE_REVIEW_REQUIRED` and must be manually reviewed.

## Duplicate Classification

| Classification | Score Range | Action |
|----------------|-------------|--------|
| EXACT_DUPLICATE | ≥ 0.95 | Reject from import |
| HIGH_CONFIDENCE_MATCH | ≥ 0.80 | Admin review — merge or keep both |
| POSSIBLE_MATCH | ≥ 0.50 | Admin review — manual decision |
| NEW_RECORD | < 0.50 | Import as new record |

## Data Quality Score

Deterministic score (0-10) based on:
- Source references available (2 points)
- Valid coordinates (2 points)
- Complete cemetery info (1.5 points)
- Complete dates (1.5 points)
- Verified status (2 points)
- Source quality bonus (up to 1 point)

This is labeled "DATA QUALITY" — not "TRUTH SCORE".

## Import Report

Every import produces a report with:
- Import ID, source, dataset version
- Start/end timestamps
- Records read, valid, rejected, imported
- Duplicates detected
- Warnings and errors

## Rollback

All imported records are tagged with `import_id`. An import can be rolled back by identifying and removing all records with that import ID.

## Security

- Imported files are treated as untrusted data
- No file is ever executed as code
- File type, size, content, and encoding are validated
- Suspicious content patterns are rejected
- Maximum file size: 10 MB
- Maximum records per import: 10,000
