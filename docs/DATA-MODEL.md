# GraveAtlas Data Model

## Overview

GraveAtlas uses a hierarchical, worldwide data model for cemeteries, graves, and memorials.

## Geographic Hierarchy

```
Country (ISO 3166-1 alpha-2)
  ↓ optional
Region / State / Province
  ↓ optional
District / County
  ↓ optional
City / Municipality
  ↓ optional
Locality
  ↓
Cemetery
  ↓ optional
Section
  ↓ optional
Plot
  ↓
Grave
  ↓
Person / Memorial
```

Countries can skip levels. Not every country uses states, provinces, or counties.

## Entity Relationships

```
Country → Region → City → Cemetery
                          ↓
                        Section → Plot → Grave
                                        ↓
                                      Person/Memorial
                                        ↓
                                      Source (references)
```

Records reference each other by stable ID:
- `Grave.cemeteryId` → `Cemetery.id`
- `Grave.personIds[]` → `Person.id[]`
- `Person.graveId` → `Grave.id`
- `Cemetery.sourceRefs[]` → `Source.id[]`
- `Grave.sourceRefs[]` → `Source.id[]`
- `Correction.targetId` → any record ID

## Stable IDs

| Entity | Format | Example |
|--------|--------|---------|
| Cemetery | `cemetery_<16+ hex chars>` | `cemetery_a1b2c3d4e5f6a1b2` |
| Grave | `grave_<16+ hex chars>` | `grave_a1b2c3d4e5f6a1b2` |
| Person | `person_<16+ hex chars>` | `person_a1b2c3d4e5f6a1b2` |
| Source | `source_<16+ hex chars>` | `source_a1b2c3d4e5f6a1b2` |
| Correction | `correction_<16+ hex chars>` | `correction_a1b2c3d4e5f6a1b2` |
| Submission | `sub_<16+ hex chars>` | `sub_a1b2c3d4e5f6a1b2` |

IDs are crypto-secure random hex strings. They never change, even if names change. Names are never used as IDs.

## Date Format

| Format | Example | Meaning |
|--------|---------|---------|
| YYYY | `1902` | Year only |
| YYYY-MM | `1902-05` | Year and month |
| YYYY-MM-DD | `1902-05-12` | Full date |
| `unknown` | `unknown` | Date unknown |
| `approx_YYYY` | `approx_1902` | Approximate date |

Dates are never silently converted from partial to exact.

## Verification Status

Every record has a `verificationStatus` field:

| Status | Meaning |
|--------|---------|
| `unverified` | Record exists but not verified |
| `community_submitted` | Submitted by community member |
| `under_review` | Being reviewed by moderators |
| `verified` | Verified against authoritative sources |
| `rejected` | Submitted but rejected |

Community-submitted information is never presented as verified.

## Data Versioning

All records include:
- `submittedAt` — ISO timestamp of creation
- `updatedAt` — ISO timestamp of last update (null if never updated)

Git history provides additional audit trail. Corrections maintain their own audit trail.

## Storage Structure

```
cemeteries/   — Published cemetery records (JSON, one file per record)
graves/       — Published grave records (JSON, one file per record)
people/       — Published person records (JSON, one file per record)
pending/      — Submissions and corrections awaiting review
photos/       — Photo files (referenced by grave records)
sources/      — Source reference records
schema/       — JSON schema definitions
```

## Data Normalization

- Graves reference `cemeteryId` instead of duplicating cemetery info
- Persons reference `graveId` instead of duplicating grave info
- Source references (`sourceRefs`) link to Source records
- Display fields like `cemeteryName` are denormalized for convenience only

## Privacy

- No device identifiers (IMEI, Android ID, etc.) in any record
- No user IP addresses stored in records
- No private contact information published
- Only publicly available information is stored
- User location is used locally for "nearby" features, never uploaded
