# Grave API GUI Integration

## Overview (Part 27)

External grave/cemetery sources are integrated into the Phase 16 AI-native GUI.

## User Capabilities

Users can ask the AI:
- "Find burial records for this cemetery."
- "Search external cemetery sources."
- "Compare GraveAtlas records with external records."
- "Show me where this information came from."
- "Find possible matching records."

## Source Origin

The GUI makes source origin obvious through **Source Badges** (`SourceBadge.java`):

```
SOURCE: OpenStreetMap (via Overpass API)
STATUS: External / Source-backed (high confidence)
RETRIEVED: 2026-08-15
LICENSE: ODbL 1.0
```

External records never appear as native GraveAtlas records.

## Android Components

| Component | File | Purpose |
|-----------|------|---------|
| ExternalRecord | `data/model/ExternalRecord.java` | Normalized record model |
| SourceBadge | `ui/source/SourceBadge.java` | Source attribution UI |
| ExternalSourceClient | `data/api/ExternalSourceClient.java` | API client for gateway |

## API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/external/sources` | GET | List available sources |
| `/api/external/query` | POST | Query a specific source |
| `/api/external/query-all` | POST | Query all sources |
| `/api/external/health` | GET | Health dashboard |
| `/api/external/match-cemetery` | POST | Cemetery matching |
| `/api/external/match-records` | POST | Record matching |
| `/api/external/validate` | POST | Data quality validation |
| `/api/external/privacy-review` | POST | Privacy review |
