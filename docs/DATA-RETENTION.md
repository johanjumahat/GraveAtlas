# GraveAtlas Data Retention Policy

## Overview

This document defines how GraveAtlas handles data retention, deletion, and expiration across all data types.

## Data Categories

### Public Data (GitHub Repository)

| Data Type | Location | Retention | Rationale |
|---|---|---|---|
| Published grave records | `graves/*.json` | Permanent | Public historical record |
| Published cemetery records | `cemeteries/*.json` | Permanent | Public historical record |
| Published person records | `people/*.json` | Permanent | Public historical record |
| Source/provenance records | `sources/*.json` | Permanent | Attribution tracking |
| Audit events | `audit/*.json` | Permanent | Immutable accountability trail |
| Moderation notes | `moderation-notes/*.json` | Permanent | Moderator accountability |

**Deletion:** Public records are never hard-deleted. Corrections or removals create new audit events and update the record. This preserves historical integrity.

### Private Data (Worker State)

| Data Type | Location | Retention | Deletion |
|---|---|---|---|
| Pending submissions | `pending/*.json` | 90 days from creation | Auto-expire or admin reject |
| Draft contributions | `drafts/*.json` | 30 days from last update | Auto-expire or user delete |
| User accounts | `users/*.json` | Until user requests deletion | Admin can deactivate |
| Session tokens | `sessions/*.json` | 24 hours from creation | Auto-expire and revoke |
| Publication queue | `publication-queue/*.json` | Until published or failed | Failed records retained for retry |

### User Data

| Data Type | Retention | Deletion Path |
|---|---|---|
| Display name | Until account deletion | Admin deactivation |
| Profile bio | Until account deletion | User can clear via profile update |
| Contribution history | Permanent (linked to published records) | Contributions are anonymized, not deleted |
| Session data | 24 hours | Auto-expire |

## Deletion Procedures

### User Account Deletion

1. User requests deletion via support/contact
2. Admin sets `accountStatus: 'DEACTIVATED'` in user record
3. User's display name is anonymized to "Deleted User"
4. Published contributions remain (public record) but are disassociated from the user profile
5. Active sessions are revoked
6. Drafts are deleted

### Record Correction/Removal

1. User submits a correction or report
2. Moderator reviews the correction
3. If approved, the record is updated (not deleted)
4. The original data is preserved in the audit trail
5. A new audit event records the correction

## Auto-Expiration

| Data | TTL | Cleanup Method |
|---|---|---|
| Sessions | 24h | Marked `revoked: true` on first access after expiry |
| Drafts | 30 days | Deleted on next access if expired |
| Pending submissions | 90 days | Deleted or auto-rejected |

## Privacy Compliance

- **Data minimization:** Only collect necessary data (display name, optional bio)
- **Purpose limitation:** Data used only for grave/cemetery contribution system
- **Transparency:** This document is public
- **User rights:** Users can request deletion, view their data, submit corrections

## Backup & Recovery

- Public data: backed up via Git history (permanent)
- Private data: no separate backup — stored in GitHub repo alongside public data
- Recovery: Git history provides point-in-time recovery for all data
