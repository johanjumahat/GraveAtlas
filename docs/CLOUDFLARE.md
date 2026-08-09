# Cloudflare Worker Configuration

## Overview

The GraveAtlas backend runs on Cloudflare Workers — a serverless edge computing platform.

## Why Cloudflare Workers?

- **Free tier:** 100,000 requests/day
- **Global edge:** low latency worldwide
- **No server maintenance:** just deploy and forget
- **Built-in security:** DDoS protection, TLS, rate limiting
- **Secrets management:** encrypted at rest

## Configuration

### wrangler.toml

```toml
name = "graveatlas-backend"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
GITHUB_OWNER = "putraworks2026"
GITHUB_REPO = "graveatlas-data"
GITHUB_BRANCH = "main"
```

### Secrets (set via CLI)

```bash
npx wrangler secret put GITHUB_APP_ID
npx wrangler secret put GITHUB_PRIVATE_KEY
npx wrangler secret put GITHUB_INSTALLATION_ID
npx wrangler secret put ADMIN_TOKEN
```

Secrets are encrypted and only available in the Worker runtime — not in wrangler.toml, not in logs, not in the repo.

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | None | API metadata |
| GET | /api/health | None | Health check |
| GET | /api/graves | None | List published graves |
| POST | /api/graves | None | Submit new grave (pending) |
| GET | /api/graves/:id | None | Get single grave |
| POST | /api/graves/:id/report | None | Report correction |
| GET | /api/admin/submissions | Admin | List pending submissions |
| POST | /api/admin/submissions/:id/approve | Admin | Approve submission |
| POST | /api/admin/submissions/:id/reject | Admin | Reject submission |

## CORS

The Worker returns CORS headers allowing all origins (`*`). For production, this should be restricted to the app's domain.

## Rate Limiting (Future)

Phase 2 will implement rate limiting using:
- Cloudflare KV for per-IP counters
- Sliding window algorithm
- Configurable limits per endpoint

## Monitoring

- Cloudflare dashboard shows request counts, error rates, CPU usage
- Worker logs available via `wrangler tail`
- Health endpoint `/api/health` for uptime monitoring

## Cost

- **Free tier:** 100,000 requests/day — sufficient for early community use
- **Paid tier ($5/mo):** 10M requests/month — for scale
- No cost for secrets or KV (within free tier limits)
