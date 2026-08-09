# GraveAtlas Android API Integration

## Production API URL

```
https://graveatlas.putraworks-2026.workers.dev
```

Configurable via Settings screen (SharedPreferences). No hardcoded secrets.

## Architecture

```
Android App (HTTPS)
    ↓
Cloudflare Worker (graveatlas)
    ↓
GitHub App (GraveAtlas Backend)
    ↓
GitHub Repository (putraworks2026/graveatlas-data)
    ├── graves/        (published records)
    ├── cemeteries/    (cemetery data)
    ├── pending/       (unverified submissions)
    └── schema/        (JSON schemas)
```

The Android app NEVER communicates directly with GitHub. All writes go through the Worker.

## API Endpoints Used

### Public Endpoints (no auth required)

| Method | Path | Android Usage |
|--------|------|---------------|
| GET | `/api/health` | Settings: connection test |
| GET | `/api/graves` | Search: load all graves, client-side filter |
| GET | `/api/graves/:id` | GraveDetail: view single grave |
| POST | `/api/graves` | AddGrave: submit new grave |
| POST | `/api/graves/:id/report` | GraveDetail: report correction |
| GET | `/api/cemeteries` | CemeteryFragment: browse cemeteries |
| GET | `/api/cemeteries/:id` | Cemetery detail (future) |
| GET | `/api/submissions/:id` | ContributeFragment: check submission status |

### Admin Endpoints (not used by Android app)

Admin endpoints require `ADMIN_TOKEN` and are not accessible from the Android app.

## Request/Response Models

### Grave Record

```json
{
  "id": "sub_abc123",
  "name": "John Doe",
  "birthDate": "1950-01-01",
  "deathDate": "2020-06-15",
  "cemetery": "Choa Chu Kang",
  "section": "A",
  "plot": "123",
  "latitude": 1.3521,
  "longitude": 103.8198,
  "photoRefs": null,
  "notes": "Optional notes",
  "source": "user_submission",
  "status": "published",
  "submittedAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-02T00:00:00Z"
}
```

### Cemetery Record

```json
{
  "id": "cem001",
  "name": "Choa Chu Kang Cemetery",
  "address": "Singapore",
  "latitude": 1.35,
  "longitude": 103.8,
  "description": "A large cemetery",
  "status": "published",
  "submittedAt": "2026-01-01T00:00:00Z"
}
```

### Submission Response

```json
{
  "success": true,
  "submissionId": "sub_abc123",
  "status": "pending"
}
```

### Submission Status

```json
{
  "success": true,
  "id": "sub_abc123",
  "status": "pending|published|rejected",
  "name": "John Doe",
  "submittedAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-02T00:00:00Z"
}
```

### Health Response

```json
{
  "status": "ok",
  "service": "GraveAtlas",
  "version": "2.0.0",
  "githubConfigured": true,
  "adminConfigured": true,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## Authentication

The Android app does NOT use authentication. All public endpoints are accessible without credentials.

Admin endpoints (`/api/admin/*`) require `ADMIN_TOKEN` which is NEVER stored in the Android app.

## Submission Workflow

1. User fills out Add Grave form
2. App shows a review screen with all entered data
3. User confirms submission
4. App sends `POST /api/graves` to the Worker
5. Worker validates, writes to `pending/` in graveatlas-data
6. Worker returns `{ success, submissionId, status: "pending" }`
7. App displays the submission ID to the user
8. User can check status via ContributeFragment using the submission ID
9. Moderator reviews via admin endpoints and approves/rejects

### Offline Behavior

If the submission fails due to network issues:
1. The submission is saved locally in SharedPreferences
2. User sees "Your submission has been saved and will be sent when you're connected"
3. The app retries with exponential backoff (30s, 60s, 120s, 300s, 600s)
4. Maximum 5 retry attempts
5. User can manually retry from the ContributeFragment
6. Each submission has a client-generated idempotency ID

## Error Handling

| Error | User Message |
|-------|-------------|
| 400 | "Your submission contains invalid information. Please check the fields and try again." |
| 404 | "The requested record was not found." |
| 429 | "Too many requests. Please wait a moment and try again." |
| 500/502 | "The server is temporarily unavailable. Please try again later." |
| Timeout | "The request timed out. Please try again." |
| DNS failure | "Unable to reach the server. You may be offline." |
| Offline | "You're offline. Your submission has been saved and will sync when you're connected." |

No error message exposes: tokens, keys, GitHub URLs, stack traces, or internal details.

## Rate Limiting

The backend limits POST endpoints to 10 requests/minute/IP. The Android app:
- Does NOT poll aggressively
- Uses debouncing (400ms) for search input
- Caches responses for 5 minutes
- Respects 429 responses with backoff

## Local Cache

Public data (graves, cemeteries) is cached in SharedPreferences with a 5-minute TTL.
When offline, the app displays cached data with a "cached" indicator.
Cache can be cleared from Settings.

Never cached: ADMIN_TOKEN, GitHub credentials, tokens, passwords.

## Privacy

- Location: only used when the user is adding a grave (with permission)
- No background location tracking
- No personal data collection
- Submissions are anonymous
- No device identifiers sent to server
- No contacts, SMS, call logs, or unrelated device data accessed

## Map Integration

No paid map SDK. The app uses `geo:` intents to open the device's default maps application.
Users tap a location to open it in their preferred map app for directions.

## Android Screens

| Screen | Description |
|--------|-------------|
| Home | Overview, quick actions, data summary |
| Search | Search graves with debouncing, cache fallback |
| Map | List of locations with coordinates, tap to open in maps |
| Cemeteries | Browse and search cemeteries |
| Add Grave | Form with review step, offline support |
| Grave Detail | Full grave record view with map link |
| My Contributions | Submission tracking, offline queue, status checking |
| Settings | API health check, URL config, cache management |
| About | App info, architecture, privacy |

## Android Permissions

| Permission | Usage |
|-----------|-------|
| INTERNET | Communicate with Cloudflare Worker API |
| ACCESS_FINE_LOCATION | GPS when adding graves (optional, user-triggered) |
| ACCESS_COARSE_LOCATION | Fallback location |
| POST_NOTIFICATIONS | Future notification features |
| RECORD_AUDIO | AI Chat feature (existing) |

No permissions for: contacts, SMS, call logs, storage, camera (photos via backend only).
