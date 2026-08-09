# GraveAtlas Database Design

## Overview

The "database" is a public GitHub repository (`kubur-sg-data`) containing JSON files. This approach provides:

- Full history and audit trail via Git
- Community transparency
- Free hosting on GitHub
- Version control built-in
- No database server to maintain

## Repository Structure

```
kubur-sg-data/
├── graves/
│   ├── abc12345.json      # Individual grave record
│   ├── def67890.json
│   └── ...
├── cemeteries/
│   ├── cem001.json        # Cemetery location data
│   └── ...
├── pending/
│   ├── sub_abc123.json    # Unverified submissions awaiting moderation
│   └── ...
├── photos/
│   ├── abc12345_1.jpg     # Photos referenced by grave records
│   └── ...
├── index/
│   ├── names.json         # Generated search indexes
│   └── locations.json
├── schema/
│   ├── grave-schema.json  # JSON Schema for validation
│   └── cemetery-schema.json
└── README.md
```

## Grave Record Schema

```json
{
  "id": "abc12345",
  "name": "John Doe",
  "birthDate": "1950-01-01",
  "deathDate": "2020-06-15",
  "cemetery": "Choa Chu Kang Cemetery",
  "section": "A",
  "plot": "123",
  "latitude": 1.3521,
  "longitude": 103.8198,
  "photoRefs": ["photos/abc12345_1.jpg"],
  "notes": "Optional notes",
  "source": "user_submission",
  "status": "published",
  "submittedAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-02T00:00:00Z"
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (8-64 alphanumeric chars) |
| name | string | Yes | Name of the deceased (max 500 chars) |
| birthDate | string\|null | No | YYYY-MM-DD |
| deathDate | string\|null | No | YYYY-MM-DD |
| cemetery | string\|null | No | Cemetery name (max 2000 chars) |
| section | string\|null | No | Section within cemetery |
| plot | string\|null | No | Plot number/identifier |
| latitude | number\|null | No | -90 to 90 |
| longitude | number\|null | No | -180 to 180 |
| photoRefs | string[]\|null | No | Paths to photos in photos/ directory |
| notes | string\|null | No | Additional notes (max 2000 chars) |
| source | string\|null | No | Source of the record |
| status | string | Yes | published, pending, rejected, reported |
| submittedAt | string | Yes | ISO timestamp |
| updatedAt | string\|null | No | ISO timestamp of last update |

## Cemetery Record Schema

```json
{
  "id": "cem001",
  "name": "Choa Chu Kang Cemetery",
  "address": "Cemetery Road, Singapore",
  "latitude": 1.3521,
  "longitude": 103.8198,
  "description": "Public cemetery",
  "status": "published",
  "submittedAt": "2024-01-01T00:00:00Z"
}
```

## Submission Lifecycle

```
User submits → pending/{sub_id}.json → Validation → Moderation
                                                      ├── Approved → graves/{id}.json
                                                      └── Rejected → rejected status
```

1. User submits via POST /api/graves
2. Backend writes to `pending/` directory
3. Moderator reviews via admin endpoint
4. Approved: record moves to `graves/{id}.json` with status "published"
5. Rejected: record stays in `pending/` with status "rejected"

## Indexing

GitHub Actions generates search indexes in `index/`:
- `names.json` — name → record ID mapping
- `locations.json` — geohash → record IDs mapping
- `cemetery_index.json` — cemetery → record IDs mapping

Indexes are regenerated on each approved publication.
