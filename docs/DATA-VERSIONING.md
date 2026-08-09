# Data Versioning

## Overview

Records in GraveAtlas maintain provenance through source references, import IDs, and timestamps.

## Record-Level Versioning

Every record includes:
- `submittedAt` — ISO timestamp of creation
- `updatedAt` — ISO timestamp of last update (null if never updated)
- `sourceRefs` — References to source registry entries
- `verificationStatus` — Current verification state

Git history provides an additional audit trail for all changes.

## Import-Level Versioning

Each import is associated with:
- `import_id` — Unique batch identifier
- `source_id` — Source registry entry
- `dataset_version` — Version of the source dataset

## Safe Updates

For subsequent imports of an existing dataset, changes are classified:

| Classification | Description | Action |
|----------------|-------------|--------|
| NEW | Record not in previous import | Import as new |
| UNCHANGED | Record identical to existing | Skip (no action) |
| UPDATED | Record exists but data changed | Update with audit event |
| REMOVED_FROM_SOURCE | Record in GraveAtlas but not in new source version | Flag for review |
| POSSIBLE_CONFLICT | Both versions have conflicting data | Human review required |

Records are NOT automatically deleted simply because they disappeared from a later source version. They are flagged for human review unless the source's semantics clearly justify removal.

## Provenance Preservation

- Source information is never overwritten
- When an external dataset changes, the system detects what changed before updating
- The original source/reference is preserved even when data is updated
- Import history is maintained (see Part 66)
