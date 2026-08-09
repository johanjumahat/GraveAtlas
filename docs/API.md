# GraveAtlas API Documentation

Base URL: `https://graveatlas-backend.YOUR-SUBDOMAIN.workers.dev`

## Public Endpoints

### GET /
Returns API metadata.

**Response:** `200 OK`
```json
{
  "name": "GraveAtlas API",
  "version": "1.0.0",
  "status": "operational"
}
```

---

### GET /api/health
Health check endpoint.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
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
      "id": "abc12345",
      "name": "John Doe",
      "birthDate": "1950-01-01",
      "deathDate": "2020-06-15",
      "cemetery": "Choa Chu Kang Cemetery",
      "section": "A",
      "plot": "123",
      "latitude": 1.3521,
      "longitude": 103.8198,
      "photoRefs": ["photos/abc12345_1.jpg"],
      "notes": "Additional info",
      "source": "user_submission",
      "status": "published",
      "submittedAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-02T00:00:00Z"
    }
  ]
}
```

---

### POST /api/graves
Submit a new grave record. Submissions enter "pending" state — NOT immediately public.

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

**Validation rules:**
- `name`: required, max 500 chars
- `latitude`: must be -90 to 90
- `longitude`: must be -180 to 180
- `birthDate`/`deathDate`: must be YYYY-MM-DD format
- Total request size: max 50KB

**Response:** `201 Created`
```json
{
  "success": true,
  "submissionId": "sub_abc12345",
  "status": "pending"
}
```

**Error responses:**

`400 Bad Request`
```json
{
  "success": false,
  "error": "Name is required"
}
```

---

### GET /api/graves/:id
Get a single published grave by ID.

**Response:** `200 OK`
```json
{
  "id": "abc12345",
  "name": "John Doe",
  "birthDate": "1950-01-01",
  "deathDate": "2020-06-15",
  "cemetery": "Choa Chu Kang Cemetery",
  "status": "published",
  "submittedAt": "2024-01-01T00:00:00Z"
}
```

`404 Not Found`
```json
{
  "success": false,
  "error": "Grave not found"
}
```

---

### POST /api/graves/:id/report
Report a correction or issue with a grave record.

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

These endpoints require a Bearer token in the Authorization header. Not exposed publicly in Phase 1.

### GET /api/admin/submissions
List pending submissions.

**Headers:** `Authorization: Bearer <ADMIN_TOKEN>`

**Response:** `200 OK`
```json
{
  "success": true,
  "submissions": []
}
```

---

### POST /api/admin/submissions/:id/approve
Approve a pending submission, moving it to published.

**Headers:** `Authorization: Bearer <ADMIN_TOKEN>`

**Response:** `200 OK` (Phase 1: `501 Not Implemented`)

---

### POST /api/admin/submissions/:id/reject
Reject a pending submission.

**Headers:** `Authorization: Bearer <ADMIN_TOKEN>`

**Response:** `200 OK` (Phase 1: `501 Not Implemented`)

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
| 500 | Internal server error |
| 501 | Not yet implemented |
