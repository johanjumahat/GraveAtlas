# GraveAtlas Data Repository

This repository stores the public cemetery, grave, and memorial data for GraveAtlas — the worldwide cemetery and memorial platform.

## Structure

```
cemeteries/   — Published, approved cemetery records (JSON)
graves/       — Published, approved grave/memorial records (JSON)
people/       — Published person/memorial records (JSON)
pending/      — Unverified submissions, corrections, and reports awaiting moderation
photos/       — Photo storage (referenced by grave records)
sources/      — Source reference records
schema/       — JSON schema definitions for validation
```

## Data Model (Phase 4)

### Geographic Hierarchy

```
Country (ISO 3166-1 alpha-2 code)
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

Countries can skip levels — not every country uses states, provinces, or counties.

### Entity IDs

All entities have stable IDs that never change:

| Entity | ID Format | Example |
|--------|----------|---------|
| Cemetery | `cemetery_<hex>` | `cemetery_a1b2c3d4e5f6a1b2` |
| Grave | `grave_<hex>` | `grave_a1b2c3d4e5f6a1b2` |
| Person | `person_<hex>` | `person_a1b2c3d4e5f6a1b2` |
| Source | `source_<hex>` | `source_a1b2c3d4e5f6a1b2` |
| Correction | `correction_<hex>` | `correction_a1b2c3d4e5f6a1b2` |
| Submission | `sub_<hex>` | `sub_a1b2c3d4e5f6a1b2` |

IDs are crypto-secure random hex strings. Names are NOT used as IDs.

### Verification Status

Every record has a `verificationStatus` field:

| Status | Meaning |
|--------|---------|
| `unverified` | Record exists but has not been verified |
| `community_submitted` | Submitted by a community member |
| `under_review` | Currently being reviewed by moderators |
| `verified` | Verified against authoritative sources |
| `rejected` | Submitted but rejected during review |

### Date Format

Dates support flexible representation:

| Format | Example | Meaning |
|--------|---------|---------|
| YYYY | `1902` | Year only |
| YYYY-MM | `1902-05` | Year and month |
| YYYY-MM-DD | `1902-05-12` | Full date |
| `unknown` | `unknown` | Date unknown |
| `approx_YYYY` | `approx_1902` | Approximate date |

### Internationalization

- All text fields support full Unicode (Arabic, Chinese, Japanese, Korean, Cyrillic, etc.)
- Records can store: `name` (English/primary), `localName` (original script), `transliteration` (romanized), `altNames` (array of alternatives)
- Original names are never transliterated away

## Submission Workflow

```
User Submission
     ↓
PENDING (in pending/ directory)
     ↓
Admin Review (via /api/admin/submissions)
     ↓
APPROVED → Published (moved to graves/ or cemeteries/)
REJECTED → Stays in pending/ with status "rejected"
```

Submissions are **never** auto-published.

### Correction Workflow

```
Existing Record
     ↓
User submits correction (POST /api/corrections)
     ↓
Correction stored in pending/ (does NOT overwrite original)
     ↓
Admin Review
     ↓
ACCEPT → Original record updated
REJECT → Correction rejected, original unchanged
```

## Validation

GitHub Actions automatically validates:
- JSON syntax
- Required fields present
- Coordinate ranges (lat: -90 to 90, lon: -180 to 180)
- Date format (YYYY, YYYY-MM, YYYY-MM-DD, unknown, approx_*)
- Unique IDs (no duplicates)
- Country codes (ISO 3166-1 alpha-2)
- Verification status values

## Privacy

- No device identifiers in submissions
- No private contact information published
- No precise user location uploaded (only cemetery/grave coordinates)
- No personal data beyond what is necessary for memorial records

## Sources

Every factual record can reference sources via `sourceRefs`. Sources include:
- Cemetery official records
- Public records
- Historical documents
- Photographs
- Contributor-provided sources

Sources must include: title, type, attribution (where required), and license/permission.

Do not import copyrighted datasets without proper licensing.
