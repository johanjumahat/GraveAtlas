# Singapore Government Open Data Connector (data.gov.sg)

## Overview

GraveAtlas integrates with Singapore's official open data portal (data.gov.sg) to provide
cemetery, columbaria, crematorium, and national monument data from government sources.

## Supported Datasets

| Dataset | Agency | Record Type | Dataset ID | Last Updated |
|---------|--------|-------------|------------|--------------|
| Active Cemeteries (GEOJSON) | NEA | Cemetery | d_4a9b83ee745c10c3aa5829fb80e09d9c | 2024-03-13 |
| After Death Facilities | NEA | Cemetery/Crematorium/Columbarium | d_8057b4f4c7eca22c3c51c4ac05440f21 | 2015-02-02 |
| Dedicated Columbaria (GEOJSON) | NEA | Columbarium | d_9b0752e9d3f1f9d957d5d8be2b58dfff | 2024-03-13 |
| National Monuments (GEOJSON) | NHB | Monument/Heritage | d_b29c230ec6b609e29ed42f71ca9a8767 | 2026-04-16 |

## API Access

The connector uses two data.gov.sg API endpoints:

### 1. Poll-Download API (full dataset download)

```
GET https://api-open.data.gov.sg/v1/public/api/datasets/{datasetId}/poll-download
```

Returns a temporary download URL for the full dataset (GeoJSON).

### 2. Datastore Search API (row-level search)

```
GET https://data.gov.sg/api/action/datastore_search?resource_id={datasetId}
```

Supports filtering, pagination, and field selection.

## Rate Limits

- **Public (no API key)**: 5 requests per minute
- **With API key**: Higher limits (register at data.gov.sg)

GraveAtlas treats this as a low-volume, cached connector. Dataset results are cached
to minimize API calls.

## License

All datasets are under the **Singapore Open Data Licence** — free for personal and
commercial use with attribution.

## Attribution

- NEA datasets: "National Environment Agency. (YEAR). DATASET_NAME [Dataset]. data.gov.sg."
- NHB datasets: "National Heritage Board. (YEAR). DATASET_NAME [Dataset]. data.gov.sg."

## Data Scope

These datasets contain **facility locations only** — not individual burial records.

- Cemetery locations, boundaries, and facility details (name, address, description)
- Columbarium locations
- Crematorium locations
- National monuments (may include heritage cemetery-adjacent sites)

### Individual burial records

Individual burial records are NOT available via data.gov.sg:
- **Bukit Brown Cemetery burial registers (1922-1972)**: Held by National Archives of
  Singapore (NAS) as digitised PDFs at https://www.nas.gov.sg/archivesonline/bukitbrown
- **Choa Chu Kang Cemetery burial records**: Managed by NEA internally, not published
  as open data
- **FamilySearch** has some microfilmed Singapore cemetery records at
  https://www.familysearch.org/en/wiki/Singapore_Cemeteries

## Connector Implementation

- **File**: `backend/src/external-connectors/connectors/datagov-sg-connector.js`
- **Source ID**: `datagov-sg`
- **Registry entry**: `backend/src/external-connectors/registry.js`
- **Gateway integration**: `backend/src/external-connectors/gateway.js`

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/external/sg/datasets` | List all SG government datasets |
| GET | `/api/external/sources` | List all implemented external sources (includes datagov-sg) |
| POST | `/api/external/ai-search` | AI-driven search across all sources |
| GET | `/api/external/health` | Health dashboard (includes datagov-sg status) |

## AI Integration

The AI chat recognizes Singapore-specific keywords and triggers the data.gov.sg connector:
- `nea`, `nhb`, `data.gov.sg`, `singapore government`
- `bukit brown`, `choa chu kang`, `chua chu kang`, `kranji`
- `columbarium`, `crematorium`
- `national environment agency`, `national heritage board`

Results display with source badges: "Singapore Government Open Data (data.gov.sg)" with
attribution to the specific agency (NEA or NHB).
