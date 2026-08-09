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

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | None | API metadata |
| GET | /api/health | None | Health check (no secrets exposed) |
| GET | /api/graves | None | List published graves |
| POST | /api/graves | None (rate-limited) | Submit new grave (pending) |
| GET | /api/graves/:id | None | Get single grave |
| POST | /api/graves/:id/report | None (rate-limited) | Report correction |
| GET | /api/admin/submissions | Admin | List pending submissions |
| GET | /api/admin/reports | Admin | List pending reports |
| GET | /api/admin/status | Admin | System status and counts |
| POST | /api/admin/submissions/:id/approve | Admin | Approve & publish submission |
| POST | /api/admin/submissions/:id/reject | Admin | Reject submission |

## CORS

CORS is disabled by default. Android native clients do not need CORS.

To enable CORS for a web admin interface, set the `ALLOWED_ORIGIN` secret:

```bash
npx wrangler secret put ALLOWED_ORIGIN
# Enter the allowed origin, e.g.: https://admin.example.com
```

## Rate Limiting

POST endpoints (`/api/graves`, `/api/graves/:id/report`) are rate-limited to 10 requests per IP per minute. This uses in-memory tracking per Worker isolate (no paid KV required). Rate-limited requests return `429 Too Many Requests`.

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
