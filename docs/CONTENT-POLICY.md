# GraveAtlas Content Policy

## Overview

GraveAtlas is a community-driven platform for cemetery and grave records. This document defines what content is acceptable and how violations are handled.

## Acceptable Content

### Cemetery Records
- Public cemeteries, memorial parks, and burial grounds
- Historical cemetery sites (even if no longer active)
- Cemetery metadata: name, location, type, status, descriptions
- Photos taken by the contributor with proper rights declaration

### Grave Records
- Individual grave markers and memorials
- Person information publicly visible on the grave marker
- Dates, names, relationships as inscribed
- Photos of grave markers taken in public cemeteries

### Corrections
- Factual corrections to existing records
- Additional information from public sources
- Photo improvements or better quality images

## Prohibited Content

| Type | Action | Reason |
|---|---|---|
| Private personal information not on grave marker | Remove + warn | Privacy violation |
| Photos of mourning families without consent | Remove + warn | Privacy violation |
| Defamatory or disrespectful content | Remove + ban | Respect for the deceased |
| Spam or promotional content | Remove + ban | Platform abuse |
| Vandalism or destruction of grave markers | Remove + report | Illegal activity |
| Copyrighted photos without permission | Remove + warn | Copyright violation |
| Content from paid/subscription databases | Remove + warn | Terms violation |
| Automated scraping from other platforms | Remove + warn | Data source violation |

## Moderation Actions

| Action | When | Effect |
|---|---|---|
| Approve | Content verified | Published to public data |
| Request changes | Minor issues | Returned to contributor for correction |
| Reject | Policy violation | Removed from queue, contributor notified |
| Flag for review | Uncertain | Escalated to senior moderator |
| Ban user | Repeated violations | Account deactivated |

## Reporting Workflow

1. User reports a record via `POST /api/reports`
2. Report enters moderation queue (`GET /api/admin/reports`)
3. Moderator reviews and resolves:
   - **Dismiss:** No action needed
   - **Correct:** Submit a correction
   - **Remove:** Record removed from public data
4. Audit event created for the resolution

## Data Quality Standards

| Standard | Enforcement |
|---|---|
| Coordinates within valid range | Server-side validation |
| Dates within reasonable range (1800-current) | Server-side validation |
| Names within length limits (100 chars) | Server-side validation |
| No duplicate records | Duplicate detection on submission |
| Source attribution required for imports | Import framework validation |
| Verification status on all records | Default: `community_submitted` |

## Community Standards

1. **Respect:** All content must be respectful of the deceased and their families
2. **Accuracy:** Contributors should submit accurate information from verifiable sources
3. **Transparency:** All data includes source attribution and verification status
4. **Collaboration:** Corrections and improvements are encouraged
5. **Privacy:** No private information beyond what's on public grave markers

## Appeals

Users whose content is rejected can:
1. Submit a correction with additional context
2. Contact support via the reporting system
3. Request admin review

## Updates

This policy may be updated as the platform evolves. Changes are logged in CHANGELOG.md.
