# GraveAtlas Public Data

## Overview

GraveAtlas maintains a worldwide database of cemeteries, graves, and memorials. All public data is stored in a GitHub repository (`graveatlas-data`) as structured JSON files, one record per file. The data is readable by the public and writable only through the moderation workflow.

## Data Repository

**Repository:** `putraworks2026/graveatlas-data`
**Access:** Public read, controlled write (GitHub App only)
**Format:** JSON (one file per record)
**Validation:** JSON Schema (draft-07)

### Directory Structure

```
graveatlas-data/
├── cemeteries/     Published cemetery records
├── graves/         Published grave records
├── people/         Published person/memorial records
├── sources/        Source/provenance records
├── pending/        Submissions awaiting moderation (not public)
├── photos/         Photo files referenced by records
├── audit/          Audit trail events
└── schema/         JSON Schema definitions
```

## Publication Boundary

Users never get direct write access to the repository. The flow is:

1. **User submits** via Android app → Cloudflare Worker API
2. **Worker validates** and stores submission in `pending/`
3. **Moderator reviews** via admin endpoints
4. **On approval**, Worker writes to public directory via GitHub App
5. **Audit event** records the publication

The GitHub App has controlled permissions — it can read/write repository files but cannot change settings, add collaborators, or access other repositories.

## Data Freshness

| Data | Cache TTL | Source |
|------|-----------|--------|
| Cemetery list | 5 minutes | Response cache |
| Cemetery detail | 5 minutes | Response cache |
| Grave list | 5 minutes | Response cache |
| Country directory | 10 minutes | Directory cache |
| Region directory | 10 minutes | Directory cache |
| City directory | 10 minutes | Directory cache |
| Search results | 5 minutes | Search cache |
| Nearby results | 5 minutes | Search cache |

Cache is per-Worker-isolate. Admin actions (approve, reject, restore) clear relevant caches.

## Geographic Coverage

GraveAtlas supports worldwide coverage with:
- ISO 3166-1 alpha-2 country codes
- Local/endonym country names
- Hierarchical browsing: Country → Region → City → Cemetery
- Radius-based nearby search (max 100 km)
- Viewport-based map queries (bounded)

The Android app never downloads the complete worldwide dataset. All geographic filtering is server-side.

## No Fabricated Data

GraveAtlas does not invent or fabricate records:
- Missing values are `null`, never guessed
- Approximate dates are explicitly labeled (`approx_YYYY`)
- Unverified records show `verificationStatus: unverified`
- Community-submitted records are labeled as such, never presented as verified
- No AI-generated cemetery or grave records

## Privacy in Public Data

- No device identifiers in any record
- No user IP addresses stored in records
- No private contact information published
- Contributor profiles show only display name (no email, no internal ID)
- User location is used locally for "nearby" features, never uploaded
- Moderation notes are private (never exposed through public endpoints)

## Data Sources

1. **Community contributions** — User-submitted records via the Android app
2. **Import framework** — Controlled pipeline for open-data imports (CC0, CC-BY, CC-BY-SA, ODbL, PDDL, Public Domain)
3. **No external datasets currently imported** — All import framework features tested with synthetic data only

See `docs/DATA-SOURCES.md` for the full source registry.
