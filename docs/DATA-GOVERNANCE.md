# GraveAtlas Data Governance

## Data Lifecycle

### 1. Creation
- **User contribution:** User submits via Android app or API
- **Import:** Batch import from open-data sources (with license check)
- **Status:** `DRAFT` (user can edit) or `PENDING_REVIEW` (submitted)

### 2. Review
- **Moderator:** Reviews submission, requests changes, approves, or rejects
- **Quality checks:** Duplicate detection, coordinate validation, date validation
- **Audit:** All moderator actions logged in audit trail

### 3. Publication
- **Safe publish:** Retry-enabled publication via GitHub API
- **Change diff:** Before/after comparison stored in audit trail
- **Merge safety:** Conflict detection prevents concurrent overwrites
- **Schema versioning:** All records tagged with `schemaVersion`

### 4. Discovery
- **Public access:** Records available via public API (no auth required)
- **Search:** Full-text search with normalization, relevance scoring
- **Map:** Viewport-based search with bounding box queries
- **Browse:** Country → Region → City → Cemetery → Grave navigation

### 5. Correction
- **User correction:** Any user can submit a correction to any record
- **Moderator review:** Corrections go through the same review pipeline
- **Immutable audit:** Original data preserved in audit trail

### 6. Removal
- **Report:** Users can report records for removal
- **Moderator:** Reviews and resolves reports
- **Soft delete:** Records are updated, not hard-deleted (preserves history)
- **Audit:** Removal reason and moderator logged

## Data Classification

| Classification | Examples | Access |
|---|---|---|
| Public | Grave records, cemetery records, person records | No auth required |
| Internal | User accounts, contribution drafts | User owns their data |
| Restricted | Moderation notes, audit events | Admin/moderator only |
| Security-sensitive | API tokens, signing keys | Server-side only, never exposed |

## Data Sources

| Source | Type | License | Quality |
|---|---|---|---|
| User contributions | Community | CC-BY-SA (contributor agrees) | Community-submitted |
| Open data imports | Government/NGO | Varies (checked per import) | Verified |
| Cemetery directories | Public records | Public domain | Reference |

## Provenance

Every record includes `sourceRefs` documenting where the data came from:
- `source`: Name of the source (e.g., "User contribution", "Open data import")
- `url`: Link to the source (if available)
- `license`: Data license (e.g., "CC-BY-SA", "Public domain")
- `retrievedAt`: When the data was obtained
- `contributorId`: User who submitted (for community contributions)

## Verification Status

| Status | Meaning |
|---|---|
| `unverified` | No verification performed |
| `community_submitted` | Submitted by a community member |
| `under_review` | Moderator is reviewing |
| `verified` | Moderator or admin has verified the data |
| `rejected` | Data was found to be inaccurate |

## Dataset Versioning

- **Schema version:** `1.0.0` (tracked per-record via `schemaVersion` field)
- **Dataset version:** Auto-incremented by CI on each successful build
- **Compatibility:** Future schema changes maintain backward compatibility
- **Migration:** Batch migration function processes old records (max 50 per batch)

## Data Quality Metrics

Available via `GET /api/admin/data-quality`:
- Total records
- Duplicates detected
- Missing coordinates
- Missing source references
- Invalid date ranges
- Unverified records percentage

## Backup & Recovery

- **Public data:** Git history (permanent, point-in-time recovery)
- **Audit trail:** Git history (immutable, append-only)
- **User data:** Stored in same Git repo (recoverable)
- **Session data:** Ephemeral (24-hour TTL, not backed up)

## Compliance

- **GDPR:** User can request data deletion, no unnecessary personal data collected
- **Open data:** All published data is open and public
- **Attribution:** All data includes source attribution
- **Transparency:** Data quality metrics and audit trail are accessible to admins
