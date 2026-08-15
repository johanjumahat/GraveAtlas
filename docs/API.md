# GraveAtlas API Documentation

Base URL: `https://graveatlas.putraworks-2026.workers.dev`

## Public Endpoints

### GET /
Returns API metadata.

**Response:** `200 OK`
```json
{
  "name": "GraveAtlas API",
  "version": "2.0.0",
  "status": "operational"
}
```

---

### GET /api/health
Health check endpoint. Does not expose secrets.

**Response:** `200 OK`
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

---

### GET /api/graves
List all published graves.

**Response:** `200 OK`
```json
{
  "success": true,
  "graves": [
    {
      "id": "sub_abc123",
      "name": "John Doe",
      "birthDate": "1950-01-01",
      "deathDate": "2020-06-15",
      "cemetery": "Choa Chu Kang Cemetery",
      "section": "A",
      "plot": "123",
      "latitude": 1.3521,
      "longitude": 103.8198,
      "photoRefs": null,
      "notes": "Additional info",
      "source": "user_submission",
      "status": "published",
      "submittedAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-02T00:00:00Z"
    }
  ],
  "count": 1
}
```

---

### POST /api/graves
Submit a new grave record. Submissions enter "pending" state — NOT immediately public. Rate-limited: 10 requests/minute/IP.

**Request:**
```json
{
  "name": "John Doe",
  "birthDate": "1950-01-01",
  "deathDate": "2020-06-15",
  "cemetery": "Choa Chu Kang Cemetery",
  "section": "A",
  "plot": "123",
  "latitude": 1.3521,
  "longitude": 103.8198,
  "notes": "Optional notes"
}
```

**Required fields:** `name`

**Optional fields:** `birthDate`, `deathDate`, `cemetery`, `section`, `plot`, `latitude`, `longitude`, `notes`

**Allowed fields only:** Fields not in the above list are rejected.

**Validation rules:**
- `name`: required, string, max 500 chars
- `latitude`: number, -90 to 90
- `longitude`: number, -180 to 180
- `birthDate`/`deathDate`: YYYY-MM-DD format
- Total request size: max 50KB
- Per-field length: max 2000 chars (except name: 500)

**Response:** `201 Created`
```json
{
  "success": true,
  "submissionId": "sub_a1b2c3d4e5f6",
  "status": "pending"
}
```

**Error responses:**

| Code | Error |
|------|-------|
| 400 | Invalid JSON body |
| 400 | Name is required |
| 400 | Invalid latitude (must be -90 to 90) |
| 400 | Invalid longitude (must be -180 to 180) |
| 400 | Invalid birthDate format (use YYYY-MM-DD) |
| 400 | Request too large (max 50KB) |
| 400 | Invalid request (unexpected field) |
| 413 | Request too large (max 50KB) |
| 429 | Too many requests |
| 502 | Unable to save submission (GitHub upstream error) |

---

### GET /api/graves/:id
Get a single published grave by ID. ID is sanitized to prevent path traversal.

**Response:** `200 OK` — Grave record JSON

`404 Not Found`
```json
{
  "success": false,
  "error": "Grave not found"
}
```

---

### POST /api/graves/:id/report
Report a correction or issue with a grave record. Rate-limited: 10 requests/minute/IP.

**Request:**
```json
{
  "report": "The death date is incorrect."
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Report received. It will be reviewed by moderators."
}
```

---

## Admin Endpoints (Protected)

All admin endpoints require `Authorization: Bearer <ADMIN_TOKEN>` header.

### GET /api/admin/submissions
List pending submissions (excludes reports).

**Response:** `200 OK`
```json
{
  "success": true,
  "submissions": [],
  "count": 0
}
```

---

### GET /api/admin/reports
List pending correction reports.

**Response:** `200 OK`
```json
{
  "success": true,
  "reports": [],
  "count": 0
}
```

---

### GET /api/admin/status
System status and data counts.

**Response:** `200 OK`
```json
{
  "success": true,
  "status": {
    "githubConfigured": true,
    "adminConfigured": true,
    "pendingSubmissions": 3,
    "publishedGraves": 150,
    "pendingReports": 1
  }
}
```

---

### POST /api/admin/submissions/:id/approve
Approve a pending submission. Moves it from `pending/` to `graves/` and sets status to `published`.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Submission sub_abc approved and published",
  "graveId": "sub_abc"
}
```

---

### POST /api/admin/submissions/:id/reject
Reject a pending submission. Updates the file in `pending/` with status `rejected`.

**Request (optional):**
```json
{
  "reason": "Duplicate submission"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Submission sub_abc rejected"
}
```


---

## Admin Import Management Endpoints

All endpoints require admin authentication: `Authorization: Bearer <ADMIN_TOKEN>`

### GET /api/admin/imports/sources

List available official data import sources.

**Response:** `200 OK`
```json
{
  "success": true,
  "sources": [
    {
      "id": "nea-singapore",
      "name": "Singapore NEA — Active Cemeteries",
      "description": "9 active cemeteries in Singapore from data.gov.sg (GeoJSON)",
      "license": "Singapore Open Data Licence",
      "attribution": "National Environment Agency. (2020). Active Cemeteries (GEOJSON)",
      "country": "Singapore",
      "recordType": "cemetery",
      "requiresOptions": false
    },
    {
      "id": "osm-overpass",
      "name": "OpenStreetMap — Cemeteries (Overpass API)",
      "description": "Worldwide cemetery data from OpenStreetMap contributors (ODbL)",
      "license": "ODbL",
      "attribution": "© OpenStreetMap contributors (ODbL)",
      "country": null,
      "recordType": "cemetery",
      "requiresOptions": true,
      "options": {
        "area": { "type": "string", "required": false, "description": "ISO 3166-1 alpha-2 country code" },
        "includeHistoric": { "type": "boolean", "default": true },
        "includeGraveYard": { "type": "boolean", "default": true },
        "includeGraves": { "type": "boolean", "default": false }
      }
    }
  ],
  "count": 2
}
```

### POST /api/admin/imports/trigger

Trigger a new data import from an official source.

**Request Body:**
```json
{
  "source": "nea-singapore",
  "options": {}
}
```

For OSM:
```json
{
  "source": "osm-overpass",
  "options": {
    "area": "SG",
    "includeHistoric": true
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "importId": "nea-singapore-2026-08-15-1700000000",
  "source": "nea-singapore",
  "status": "PENDING_APPROVAL",
  "summary": {
    "validRecords": 9,
    "invalidRecords": 0,
    "duplicates": 0,
    "qualityScore": 4.0,
    "attribution": "National Environment Agency. (2020). Active Cemeteries (GEOJSON)",
    "license": "Singapore Open Data Licence"
  },
  "message": "Import processed. 9 records ready for review."
}
```

### GET /api/admin/imports

List all import jobs.

**Response:** `200 OK`
```json
{
  "success": true,
  "imports": [
    {
      "importId": "nea-singapore-2026-08-15-1700000000",
      "source": "nea-singapore",
      "date": "2026-08-15"
    }
  ],
  "count": 1
}
```

### GET /api/admin/imports/:importId

Get full import report (including all records, errors, duplicates, quality scores).

**Response:** `200 OK` — full import report with records array.

### POST /api/admin/imports/:importId/approve

Approve import and publish records to the GitHub data repository.

**Request Body (optional):**
```json
{
  "notes": "Verified all 9 Singapore cemeteries against NEA website."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "importId": "nea-singapore-2026-08-15-1700000000",
  "status": "COMPLETED",
  "published": 9,
  "totalRecords": 9,
  "errors": 0,
  "message": "Import approved. 9 records published."
}
```

### POST /api/admin/imports/:importId/reject

Reject import. Records are NOT published.

**Request Body:**
```json
{
  "reason": "Data quality concerns — coordinates appear outdated."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "importId": "nea-singapore-2026-08-15-1700000000",
  "status": "REJECTED",
  "message": "Import rejected. Records not published."
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing auth header) |
| 403 | Forbidden (invalid admin token) |
| 404 | Not found |
| 413 | Request too large |
| 429 | Too many requests (rate limited) |
| 500 | Internal server error |
| 502 | Upstream GitHub service unavailable |
| 503 | GitHub not configured |

**No error response exposes:** GitHub tokens, private keys, ADMIN_TOKEN, internal paths, stack traces, or environment details.
