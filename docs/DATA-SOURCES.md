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


## Singapore Government Open Data (data.gov.sg)

**Source ID:** `datagov-sg`
**Status:** Implemented (live connector)
**License:** Singapore Open Data Licence (free for personal and commercial use)
**Attribution:** NEA (cemetery/facility datasets), NHB (monuments dataset)

### Datasets

| Dataset | Agency | Type | Records | Updated |
|---------|--------|------|---------|---------|
| Active Cemeteries (GEOJSON) | NEA | Cemetery locations | ~10 features | 2024-03-13 |
| After Death Facilities | NEA | Crematoria, cemeteries, columbaria | ~12 features | 2015-02-02 |
| Dedicated Columbaria (GEOJSON) | NEA | Columbaria | 3 features | 2024-03-13 |
| National Monuments (GEOJSON) | NHB | Heritage monuments | ~72 features | 2026-04-16 |

### Scope

- **Cemetery/facility LOCATIONS only** — not individual burial records
- Geographic coverage: Singapore (nationwide)
- Government-managed facilities (Choa Chu Kang complex, Mandai, Yishun)

### Individual Burial Records

Individual burial records are NOT available via data.gov.sg:
- **Bukit Brown Cemetery burial registers (1922-1972):** Held by National Archives of Singapore (NAS) as digitised PDFs at [nas.gov.sg/archivesonline/bukitbrown](https://www.nas.gov.sg/archivesonline/bukitbrown)
- **Choa Chu Kang Cemetery burial records:** Managed by NEA internally, not published as open data
- **FamilySearch:** Has some microfilmed Singapore cemetery records at [familysearch.org](https://www.familysearch.org/en/wiki/Singapore_Cemeteries)

### API Access

- **Poll-Download API:** `GET https://api-open.data.gov.sg/v1/public/api/datasets/{datasetId}/poll-download`
- **Datastore Search API:** `GET https://data.gov.sg/api/action/datastore_search?resource_id={datasetId}`
- **Rate limit:** 5 requests/minute (public), higher with API key

See [SINGAPORE-GOV-DATA.md](./SINGAPORE-GOV-DATA.md) for full documentation.
