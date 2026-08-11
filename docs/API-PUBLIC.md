# GraveAtlas Public API

Base URL: `https://graveatlas.putraworks-2026.workers.dev`

All responses include an `X-Request-Id` header for correlation and tracing.

## Public Endpoints

These endpoints are accessible without authentication. They return only published, public data.

### GET /
API metadata.

```json
{ "name": "GraveAtlas API", "version": "7.1.0", "status": "operational" }
```

### GET /api/health
Health check. Does not expose secrets.

```json
{
  "status": "ok",
  "service": "GraveAtlas",
  "version": "7.1.0",
  "githubConfigured": true,
  "adminConfigured": true,
  "timestamp": "2026-08-11T00:00:00.000Z"
}
```

### GET /api/graves
List published graves.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | int | 100 | Max records (1-500) |
| offset | int | 0 | Pagination offset |

### GET /api/graves/{id}
Single grave record by ID.

### GET /api/cemeteries
List published cemeteries.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | int | 100 | Max records (1-500) |
| offset | int | 0 | Pagination offset |
| country | string | — | Filter by country name or ISO code |
| region | string | — | Filter by region |
| city | string | — | Filter by city |

### GET /api/cemeteries/{id}
Single cemetery record by ID.

### GET /api/search
Search graves and cemeteries.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | yes | Search query (min 2 chars) |
| limit | int | no | Max results (default 50, max 500) |
| offset | int | no | Pagination offset |

### GET /api/search/global
Unified search across people, cemeteries, memorials, and locations.

| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query (min 2 chars, max 200) |
| category | string | people, cemeteries, memorials, locations, all |
| country | string | Filter by country |
| region | string | Filter by region |
| city | string | Filter by city |
| type | string | Record type filter |
| sort | string | relevance, name, date, distance |
| page | int | Page number (default 1) |
| limit | int | Page size (default 20, max 100) |

### GET /api/search/people
Search person/memorial records.

### GET /api/search/cemeteries
Search cemetery records.

### GET /api/search/locations
Search by geographic location.

### GET /api/people/{id}
Person/memorial record by ID.

### GET /api/nearby
Find records near a location.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| lat | float | yes | Latitude (-90 to 90) |
| lon | float | yes | Longitude (-180 to 180) |
| radius | float | no | Search radius in km (default 10, max 100) |
| type | string | no | all, cemetery, grave |

### GET /api/related/{id}
Records related to the given record (same cemetery, same section, nearby).

### GET /api/recommendations/{id}
Geographic proximity recommendations (deterministic, no AI).

### GET /api/record/{type}/{id}
Public record detail for share links.

### GET /api/browse
Browse by location (country, region, city filters).

### GET /api/countries
Worldwide country directory with ISO codes and local names.

### GET /api/countries/{country}/regions
Regions/states/provinces for a country.

### GET /api/countries/{country}/regions/{region}/cities
Cities for a region within a country.

## Submission Endpoints

These endpoints accept user submissions. All submissions enter "pending" state — never auto-published. Rate-limited: 10 requests/minute per IP.

### POST /api/graves
Submit a new grave record.

### POST /api/cemeteries
Submit a new cemetery record.

### POST /api/corrections
Submit a correction to an existing record.

### POST /api/photos
Submit a photo contribution (metadata + rights declaration).

### POST /api/graves/{id}/report
Report a grave record (incorrect info, duplicate, privacy, etc.).

### GET /api/submissions/{id}
Check submission status (public — by submission ID).

### GET /api/corrections/{id}
Check correction status (public — by correction ID).

## User Endpoints

### POST /api/user/register
Register/update user account (display name, profile).

### POST /api/user/session
Create a session token (24-hour expiry).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| (header) X-User-Id | string | yes | User ID |

Returns `sessionId`, `userId`, `role`, `expiresAt`.

### DELETE /api/user/session
Revoke a session (sign-out).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| (header) X-User-Id | string | yes | User ID |
| sessionId | string | yes (body) | Session ID to revoke |

### GET /api/user/profile
Get own profile (requires X-User-Id header).

### PUT /api/user/profile
Update profile (requires X-User-Id header).

### GET /api/users/{userId}/profile
Public profile for a user (display name only).

## Contribution Endpoints

### POST /api/contributions
Create a contribution (cemetery, grave, correction, photo).

### GET /api/contributions
List user's contributions (requires X-User-Id header).

### GET /api/contributions/{id}
Get contribution detail.

### POST /api/contributions/{id}/cancel
Cancel a pending contribution.

### POST /api/contributions/check-duplicate
Check if a similar contribution already exists.

### POST /api/drafts
Create a draft contribution.

### GET /api/drafts
List user's drafts.

### GET /api/drafts/{id}
Get a draft.

### PUT /api/drafts/{id}
Update a draft.

### DELETE /api/drafts/{id}
Delete a draft.

### POST /api/drafts/{id}/submit
Submit a draft for review.

## Admin Endpoints

All admin endpoints require `Authorization: Bearer <ADMIN_TOKEN>`. Rate-limited: 30 requests/minute.

### GET /api/admin/submissions
List pending submissions.

### POST /api/admin/submissions/{id}/approve
Approve and publish a submission.

### POST /api/admin/submissions/{id}/reject
Reject a submission with reason.

### GET /api/admin/reports
List user reports.

### POST /api/admin/reports/{id}/resolve
Resolve a report.

### POST /api/admin/reports/{id}/reject
Reject a report.

### GET /api/admin/corrections
List pending corrections.

### POST /api/admin/corrections/{id}/approve
Approve a correction.

### POST /api/admin/corrections/{id}/reject
Reject a correction.

### GET /api/admin/audit
List all audit events.

### GET /api/admin/audit/{entityId}
Audit trail for a specific entity.

### GET /api/admin/dashboard
Admin dashboard with counts and statistics.

### GET /api/admin/contributors
List contributors.

### GET /api/admin/data-quality
Data quality report (errors, warnings, info).

### GET /api/admin/status
System status.

### POST /api/admin/restore/{id}
Restore a removed record.

### GET /api/admin/contributions
List all contributions (all users).

### POST /api/admin/contributions/{id}/notes
Add a private moderation note to a contribution.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| note | string | yes | Note text (1-2000 chars) |

### GET /api/admin/contributions/{id}/notes
List moderation notes for a contribution (moderator/admin only).

### GET /api/admin/users
List all registered users (public profiles only).

### POST /api/admin/users/{id}/role
Assign a role to a user.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| role | string | yes | Enum: user, moderator, admin |

## Rate Limits

| Endpoint type | Limit | Window |
|---------------|-------|--------|
| Submissions (POST) | 10 | per minute per IP |
| Search (GET) | 60 | per minute per IP |
| Admin | 30 | per minute per IP |
| User operations | 20 | per minute per user |

Rate-limited responses return `429` with `{ "success": false, "error": "Too many requests" }`.

## Error Responses

All errors follow the format:
```json
{ "success": false, "error": "Description of what went wrong" }
```

Common status codes: 200 (success), 400 (bad request), 404 (not found), 429 (rate limited), 500 (server error), 502 (upstream error).

No stack traces, file paths, or internal details are exposed in error responses.
