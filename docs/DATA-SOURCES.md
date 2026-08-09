# Data Sources

**Last updated:** 2026-08-09

## Overview

This document lists all data sources used by GraveAtlas.

## Current Data Sources

### Community Contributions
- **Source:** User-submitted records via the Android app
- **License:** User-contributed (published under GraveAtlas's data model)
- **Attribution:** Contributor display name (if provided)
- **Status:** Active
- **Verification:** All submissions go through moderation

### No External Datasets Imported

No external datasets have been imported into the production data repository. All import framework features have been tested with synthetic data only.

## Import Framework

The import framework (backend/src/import-framework.js) supports importing from external sources with:

- License verification (CC0, CC-BY, CC-BY-SA, ODbL, Public Domain, PDDL)
- Source registry with attribution tracking
- Duplicate detection
- Data quality scoring
- Import rollback capability

Any future external imports will be documented here with:
- Source name and URL
- License and attribution
- Import ID and date
- Record count
- Dataset version

## Data Quality

| Metric | Value |
|--------|-------|
| Total cemetery records | GraveAtlas database statistics (check /api/admin/data-quality) |
| Total grave records | GraveAtlas database statistics |
| Records with sources | GraveAtlas database statistics |
| Records with coordinates | GraveAtlas database statistics |

These are GraveAtlas database statistics, NOT worldwide cemetery totals.
