# Cloudflare Worker Configuration

## Overview

The GraveAtlas backend runs on Cloudflare Workers — a serverless edge computing platform.

## Worker Details

| Field | Value |
|-------|-------|
| Worker name | `graveatlas` |
| URL | `https://graveatlas.putraworks-2026.workers.dev` |
| Source repo | `putraworks2026/GraveAtlas` |
| Root directory | `backend` |
| Build command | none |
| Deploy command | `npx wrangler deploy` |

## wrangler.toml

```toml
name = "graveatlas"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
GITHUB_OWNER = "putraworks2026"
GITHUB_REPO = "graveatlas-data"
GITHUB_BRANCH = "main"

# Secrets set via: wrangler secret put <NAME>
# GITHUB_APP_ID
# GITHUB_PRIVATE_KEY
# GITHUB_INSTALLATION_ID
# ADMIN_TOKEN
```

## Setting Secrets

Secrets are encrypted and only available in the Worker runtime — not in wrangler.toml, not in logs, not in the repo.

```bash
cd backend
npx wrangler secret put GITHUB_APP_ID
npx wrangler secret put GITHUB_PRIVATE_KEY
npx wrangler secret put GITHUB_INSTALLATION_ID
npx wrangler secret put ADMIN_TOKEN
```

See [SECRETS.md](./SECRETS.md) for detailed instructions on obtaining each value.

## API Routes

### Public Endpoints (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API metadata |
| GET | `/api/health` | Health check (no secrets exposed) |
| GET | `/api/graves` | List published graves (paginated) |
| POST | `/api/graves` | Submit new grave (rate-limited, enters pending) |
| GET | `/api/graves/:id` | Get single grave by ID |
| POST | `/api/graves/:id/report` | Report a grave for correction (rate-limited) |
| GET | `/api/cemeteries` | List cemeteries (paginated) |
| GET | `/api/cemeteries/:id` | Get single cemetery by ID |
| POST | `/api/cemeteries` | Submit new cemetery (rate-limited, enters pending) |
| GET | `/api/submissions/:id` | Check submission status by ID |
| POST | `/api/corrections` | Submit a correction (rate-limited, enters pending) |
| GET | `/api/corrections/:id` | Check correction status by ID |
| GET | `/api/search` | Search graves and cemeteries |
| GET | `/api/search/global` | Global search (graves, cemeteries, people) |
| GET | `/api/search/people` | Search people records |
| GET | `/api/search/cemeteries` | Search cemeteries only |
| GET | `/api/search/locations` | Search by geographic location |
| GET | `/api/people/:id` | Get person record by ID |
| GET | `/api/countries` | List countries |
| GET | `/api/regions` | List regions (filter by country) |
| GET | `/api/cities` | List cities (filter by region) |
| GET | `/api/countries/:code/regions` | Get regions for a country |
| GET | `/api/countries/:code/regions/:region/cities` | Get cities for a region |
| GET | `/api/browse` | Browse data by hierarchy |
| GET | `/api/related/:id` | Get related records |
| GET | `/api/nearby` | Find nearby graves/cemeteries by coordinates |
| GET | `/api/record/:type/:id` | Get record by type and ID (cemeteries or graves) |
| GET | `/api/recommendations/:id` | Get recommendations based on a record |
| POST | `/api/photos` | Submit photo reference (rate-limited) |
| POST | `/api/user/register` | Register user account |
| GET | `/api/user/profile` | Get current user profile |
| PUT | `/api/user/profile` | Update user profile |
| GET | `/api/users/:id/profile` | Get public user profile |
| POST | `/api/contributions` | Submit a contribution |
| GET | `/api/contributions` | List contributions |
| GET | `/api/contributions/:id` | Get contribution by ID |
| POST | `/api/contributions/:id/cancel` | Cancel a contribution |
| POST | `/api/contributions/check-duplicate` | Check for duplicate contribution |
| POST | `/api/drafts` | Save a draft |
| GET | `/api/drafts` | List drafts |
| GET | `/api/drafts/:id` | Get draft by ID |
| PUT | `/api/drafts/:id` | Update draft |
| DELETE | `/api/drafts/:id` | Delete draft |
| POST | `/api/drafts/:id/submit` | Submit draft for review |

### Admin Endpoints (requires `Authorization: Bearer <ADMIN_TOKEN>`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/submissions` | List pending submissions |
| GET | `/api/admin/reports` | List pending reports |
| GET | `/api/admin/status` | System status and counts |
| GET | `/api/admin/dashboard` | Dashboard with metrics and stats |
| POST | `/api/admin/submissions/:id/approve` | Approve & publish submission |
| POST | `/api/admin/submissions/:id/reject` | Reject submission |
| GET | `/api/admin/corrections` | List pending corrections |
| POST | `/api/admin/corrections/:id/approve` | Approve correction |
| POST | `/api/admin/corrections/:id/reject` | Reject correction |
| GET | `/api/admin/audit` | List audit events |
| GET | `/api/admin/audit/:id` | Get audit trail for an entity |
| GET | `/api/admin/contributors` | List contributors |
| GET | `/api/admin/data-quality` | Data quality metrics |
| POST | `/api/admin/reports/:id/resolve` | Resolve a report |
| POST | `/api/admin/reports/:id/reject` | Reject a report |
| POST | `/api/admin/restore/:id` | Restore an archived/removed record |

## CORS

CORS is disabled by default. Android native clients do not need CORS.

To enable CORS for a web admin interface, set the `ALLOWED_ORIGIN` secret:

```bash
npx wrangler secret put ALLOWED_ORIGIN
# Enter the allowed origin, e.g.: https://admin.example.com
```

The Worker never uses `Access-Control-Allow-Origin: *`. Only the explicitly configured origin is allowed.

## Rate Limiting

POST endpoints (`/api/graves`, `/api/cemeteries`, `/api/corrections`, `/api/graves/:id/report`, `/api/photos`) are rate-limited to 10 requests per IP per minute. Search endpoints get 60 per minute. Admin endpoints get 30 per minute. This uses in-memory tracking per Worker isolate (no paid KV required). Rate-limited requests return `429 Too Many Requests`.

## Error Handling

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Invalid submission / missing fields |
| 401 | Unauthorized (missing admin token) |
| 403 | Forbidden (invalid admin token) |
| 404 | Not found |
| 409 | Duplicate submission / invalid state transition |
| 413 | Request too large (max 50KB) |
| 429 | Too many requests |
| 500 | Internal server error |
| 502 | Upstream GitHub service unavailable |
| 503 | Service unavailable (GitHub not configured) |

Errors never expose: GitHub API URLs, stack traces, private keys, internal environment variables, GitHub access tokens, or Cloudflare internals.

## Monitoring

- Cloudflare dashboard: request counts, error rates, CPU usage
- Worker logs: `wrangler tail`
- Health endpoint: `/api/health` for uptime monitoring
- Admin status: `/api/admin/status` for data counts

## Cost

- **Free tier:** 100,000 requests/day — sufficient for early community use
- **Paid tier ($5/mo):** 10M requests/month — for scale
- No cost for secrets or environment variables

## Deployment

The Worker is deployed via Cloudflare's GitHub integration:
1. Push to `putraworks2026/GraveAtlas` main branch
2. Cloudflare automatically builds and deploys from the `backend/` directory
3. Or deploy manually: `cd backend && npx wrangler deploy`

**Do NOT deploy until:**
- All tests pass
- Security scan passes
- No secrets are committed
- GitHub App code is correct
