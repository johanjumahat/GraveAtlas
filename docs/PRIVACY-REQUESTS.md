# GraveAtlas Privacy & Takedown

## Overview

GraveAtlas handles sensitive information about deceased individuals and their resting places. Privacy requests are taken seriously and handled through a controlled review process.

## Privacy Report Types

Users can submit privacy-related reports via the report system:

| Type | Use Case |
|------|----------|
| `PRIVACY_CONCERN` | General privacy concern about a record |
| `INCORRECT_INFORMATION` | Personal information is incorrect |
| `INAPPROPRIATE_PHOTO` | Photo should be removed (privacy) |

## Takedown Process

```
Privacy report submitted
     ↓
Report OPEN (prioritized in admin queue)
     ↓
Admin reviews (privacy reports are flagged for priority)
     ↓
RESOLVED → Record corrected, archived, or removed
REJECTED → Report invalid, no action taken
```

### Priority Handling

Privacy-related reports (`PRIVACY_CONCERN`, `INAPPROPRIATE_PHOTO`) are highlighted in the admin dashboard. The dashboard shows a separate count of privacy reports so admins can prioritize them.

### Resolution Actions

Admins can take the following actions for privacy reports:
1. **Correct** — Fix the incorrect personal information
2. **Archive** — Set record lifecycle to `ARCHIVED` (hidden but recoverable)
3. **Remove** — Set record lifecycle to `REMOVED_PENDING_REVIEW` then `REMOVED`
4. **Reject** — If the report is invalid (information is public record)

## What Is NOT Automatically Done

- Legitimate historical records are NOT automatically deleted
- Records are NOT removed simply because a report is filed
- Photos are NOT deleted without admin review
- No automated takedown — all require human review

## Soft Delete (Part 18)

Records use lifecycle states instead of immediate deletion:

| State | Description |
|------|-------------|
| `ACTIVE` | Normal published state |
| `ARCHIVED` | Hidden from public view, recoverable |
| `REMOVED_PENDING_REVIEW` | Marked for removal, awaiting final review |
| `REMOVED` | Removed, but recoverable via admin restore |

This ensures:
- Accidental removals can be reversed
- Audit trail preserves the history
- Records are never permanently lost without deliberate action

## Restoration (Part 19)

Admins can restore archived or removed records:

```
POST /api/admin/restore/:id
Authorization: Bearer <ADMIN_TOKEN>
```

Restoration creates an audit event with action `RESTORE`. Only admins can restore records. Normal users cannot.

## Data Recovery

See [docs/RECOVERY.md](RECOVERY.md) for full recovery procedures.

## Privacy of Contributors (Part 23)

- Contributor email addresses are NOT stored or exposed
- Device identifiers are NOT collected
- IP addresses are NOT stored in records
- Precise private location is NOT uploaded
- Contributor statistics are admin-only, not publicly exposed
- Contributors are tracked by an anonymous `contributorId` only
