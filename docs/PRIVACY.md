# Privacy Policy

**Last updated:** 2026-08-11
**Status:** Production-ready for Google Play Store

## Overview

GraveAtlas is a public cemetery and grave record platform. This privacy policy describes how information is handled.

## What Information We Handle

### Public Data

The following information is published in the public data repository (putraworks2026/graveatlas-data) and is accessible to anyone:

- Cemetery names, locations, and metadata
- Grave records (deceased persons' names, birth/death dates, inscriptions)
- Source attributions for imported data
- Contributor display names (as provided)

### User-Submitted Data

When a user submits a contribution, correction, or report:

- The submitted content is stored in the pending queue
- The submission is reviewed by a moderator before publication
- The user's IP address is NOT stored permanently
- No email address is required for submission
- Session tokens expire after 24 hours and are not shared with third parties

### Location Data

- Location data is used only for nearby search when the user explicitly enables it
- Location is never stored on the server
- Location is never shared with third parties
- Users can use the app without enabling location access

### What We Do NOT Collect

- We do not use analytics or tracking
- We do not collect device identifiers
- We do not serve advertising
- We do not track user location persistently
- We do not use cookies
- We do not collect biometric data
- We do not collect email addresses
- We do not collect phone numbers

## Data Storage

All data is stored in GitHub repositories:
- Application code: putraworks2026/GraveAtlas (private)
- Public data: putraworks2026/graveatlas-data (public)

No third-party databases or cloud services are used for user data.

## Data Retention

| Data Type | Retention Period |
|---|---|
| Published records | Permanent (public record) |
| Pending submissions | 90 days, then auto-expired |
| Draft contributions | 30 days, then auto-expired |
| Session tokens | 24 hours, then auto-expired |
| Audit events | Permanent (immutable) |

See `docs/DATA-RETENTION.md` for full details.

## Data Deletion

Users can request deletion of their account and personal data:
1. Submit a report through the app (Report button on any record)
2. Or contact the repository owner via GitHub

Account deletion process:
- User's display name is anonymized to "Deleted User"
- Published contributions remain as public records but are disassociated from the user profile
- Active sessions are revoked
- Drafts are deleted

## Privacy/Takedown Requests

If you believe your privacy is affected by information in GraveAtlas:

1. Submit a report through the app (Report button on any grave record)
2. Or contact the repository owner via GitHub

We will acknowledge and review all privacy requests within 7 days.

## Third-Party Services

- **Cloudflare (Worker hosting):** Processes API requests, does not store user data
- **GitHub (data storage):** Stores all public data in repositories
- **OpenStreetMap (map tiles):** Map display uses OSM tiles; OSM privacy policy applies to map tile requests

No other third-party services are used.

## Children's Privacy

GraveAtlas is not directed at children under 13. We do not knowingly collect information from children. If you believe a child has submitted information, contact us to have it removed.

## Security

- All API communication is over HTTPS (TLS)
- Security headers are enforced (HSTS, X-Content-Type-Options, X-Frame-Options, CSP)
- No secrets are stored in the app or source code
- User data is separated from public data
- See `docs/SECURITY-INVENTORY.md` for full security details

## Changes to This Policy

This policy may be updated. Changes will be documented in the repository CHANGELOG.md and the "Last updated" date will be revised.

## Contact

For privacy questions or requests, contact the repository owner via GitHub: https://github.com/putraworks2026/GraveAtlas
