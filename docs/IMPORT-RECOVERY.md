# Import Recovery

## Overview

Every bulk import is reversible. Records created by an import can be identified and removed.

## Rollback Mechanism

### Record Tagging

All imported records are associated with:
- `import_id` — Unique identifier for the import batch
- `sourceRefs` — Reference to source registry entry
- Record IDs follow the `phase5test` pattern for test data

### Rollback Process

1. Administrator identifies an import to roll back (by `import_id`)
2. System finds all records tagged with that `import_id`
3. Records are removed from the data repository
4. Git history provides an additional audit trail
5. An audit event is created documenting the rollback
6. Unrelated production records are NOT affected

### Safety

- Rollback targets specific `import_id` records only
- No global destructive operations are used
- Git history preserves the original state
- An audit event is always created

### Status Transitions for Rollback

| From | To | Allowed |
|------|----|---------|
| PARTIAL | ROLLED_BACK | Yes |
| FAILED | ROLLED_BACK | Yes |
| COMPLETED | ROLLED_BACK | No (terminal) |
| ROLLED_BACK | any | No (terminal) |

A completed import cannot be rolled back through status transitions. It must be manually reviewed.

## Error Handling

If an import encounters an unexpected error:
1. The error is recorded in the import report
2. The affected operation stops or safely pauses
3. Already-valid state is preserved
4. No corrupted partial records enter production
5. The import is marked as FAILED or PARTIAL

### Partial Import

If some records are valid and some are not:
- Valid records can be published (with explicit admin approval)
- Invalid records are quarantined
- The import is marked as PARTIAL
- The report clearly shows valid vs. invalid counts
