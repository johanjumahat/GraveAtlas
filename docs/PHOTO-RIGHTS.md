# Photo Rights & Image Contributions

## Overview

Users can submit photos for cemeteries, graves, and memorials. Every photo submission requires a rights declaration. Photos with unknown rights are sent to manual review and never auto-published.

## Submitting a Photo

```
POST /api/photos
Headers: X-User-Id: user_xxx
Content-Type: application/json

{
  "targetId": "grave_abc123",
  "targetType": "grave",
  "photoUrl": "https://example.com/photo.jpg",
  "rights": "OWN_WORK",
  "description": "Headstone photo taken during visit",
  "sourceRef": "Personal visit, August 2026"
}
```

**Response (201):**
```json
{
  "success": true,
  "photo": {
    "id": "photo_...",
    "status": "PENDING_REVIEW",
    "rights": "OWN_WORK",
    "createdAt": "2026-08-09T..."
  }
}
```

## Rights Declarations

| Declaration | Meaning | Auto-publish? |
|-------------|---------|---------------|
| `OWN_WORK` | Photo taken/created by the submitter | No — requires review |
| `PERMISSION_GRANTED` | Submitter has permission from rights holder | No — requires review |
| `OPEN_LICENSE` | Photo is under an open license (CC0, CC-BY, etc.) | No — requires review |
| `PUBLIC_DOMAIN` | Photo is in the public domain | No — requires review |
| `UNKNOWN` | Rights status unknown | No — requires manual review with extra scrutiny |

**Important:** Uploading a photo does not transfer ownership. The submitter declares the rights status, but the system does not assume the submitter owns the image merely because they uploaded it.

## Validation

### Required Fields

| Field | Validation |
|-------|------------|
| `targetId` | Non-empty, max 200 chars, no path traversal |
| `targetType` | Must be `cemetery`, `grave`, or `memorial` |
| `photoUrl` | Valid HTTP(S) URL, max 2000 chars |
| `rights` | Must be one of the 5 valid declarations |
| `description` | Optional, max 500 chars |
| `sourceRef` | Optional, source/attribution reference |

### Security

- `file://` URLs are rejected
- Path traversal in targetId is blocked (`../`, `.git`, etc.)
- Photo URLs must be HTTP or HTTPS
- File type validation happens at moderation stage
- Files are never executed or processed as code

## Rate Limiting

Photo submissions count toward the per-user rate limit of 30 actions per hour.

## Audit Trail

Every photo submission creates a `PHOTO_SUBMITTED` audit event recording:
- User ID
- Target record ID
- Target type
- Rights declaration

No photo binary data is stored in audit logs.
