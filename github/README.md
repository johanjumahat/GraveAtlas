# GraveAtlas Data Repository

This repository stores the public cemetery and grave data for GraveAtlas.

## Structure

```
graves/       — Published, approved grave records (JSON)
cemeteries/   — Cemetery location data (JSON)
pending/      — Unverified submissions awaiting moderation
photos/       — Photo storage (referenced by grave records)
index/        — Generated search indexes (do not edit manually)
schema/       — JSON schema definitions for validation
```

## How Submissions Work

1. Users submit graves through the GraveAtlas Android app
2. The Cloudflare Worker backend writes submissions to `pending/`
3. A moderator reviews each submission
4. Approved submissions move from `pending/` to `graves/` with status "published"
5. Rejected submissions stay in `pending/` with status "rejected"

## Data Format

See `schema/grave-schema.json` for the full JSON schema.

All records must include: `id`, `name`, `status`, `submittedAt`

## Validation

GitHub Actions automatically validates:
- JSON syntax
- Required fields present
- Coordinate ranges (lat: -90 to 90, lon: -180 to 180)
- Date format (YYYY-MM-DD)
- Unique IDs (no duplicates)
