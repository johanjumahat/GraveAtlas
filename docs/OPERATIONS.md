# GraveAtlas Operations & Reliability

## Health Checks

### Liveness
```
GET /api/health/live
```
Returns `200` if the Worker process is alive. No dependency checks. Used for process-level liveness probes.

### Readiness
```
GET /api/health/ready
```
Checks GitHub configuration, KV namespace, and secrets. Returns `200` if all dependencies are ready, `503` if not. Used for deployment readiness gates.

### Health
```
GET /api/health
```
Returns overall status: `operational` (GitHub configured) or `degraded` (missing configuration).

## Metrics

```
GET /api/admin/metrics
```

Returns system metrics:
- GitHub configuration status
- Cache configuration (TTL, enabled)
- Rate limit settings (per-IP, per-user, admin)
- Publication pipeline settings (max batch, max retries, schema version)

## Correlation IDs

Every API response includes an `X-Request-Id` header. If the client sends `X-Request-Id` in the request, it's echoed back. Otherwise, a new UUID is generated (`req_<uuid>`).

This enables:
- Tracing requests across the system
- Debugging user-reported issues
- Matching audit events to specific requests

## Monitoring Strategy

### What to Monitor

| Metric | Source | Alert Threshold |
|---|---|---|
| API error rate | Cloudflare Analytics | > 5% of requests |
| API latency (p95) | Cloudflare Analytics | > 2000ms |
| GitHub API rate limit remaining | `X-RateLimit-Remaining` header | < 100 |
| Publication failures | Publication queue records in FAILED state | > 0 |
| Failed health checks | `/api/health/ready` returning 503 | Any failure |

### Alerting

Alerts are configured via Cloudflare Workers Analytics:
- Error rate spike: > 5% of requests in 5-minute window
- Latency degradation: p95 > 2s for 10 minutes
- GitHub rate limit: remaining < 100

## Backup & Recovery

### Public Data
- **Backup:** Git history (immutable, permanent)
- **Recovery:** `git revert` or `git checkout` to any point in time
- **RPO (Recovery Point Objective):** 0 (Git is real-time)
- **RTO (Recovery Time Objective):** < 5 minutes (git revert + redeploy)

### Private Data (contributions, sessions, audit)
- **Backup:** Stored in same GitHub repo as public data
- **Recovery:** Git history
- **RPO:** Near real-time (each write is a commit)
- **RTO:** < 10 minutes

### Session Data
- **Backup:** Not backed up (ephemeral, 24-hour TTL)
- **Recovery:** Users create new sessions

## CI/CD Pipeline

### Build Pipeline (GitHub Actions)

| Stage | Workflow | Purpose |
|---|---|---|
| Test | `node tests/backend.test.js` | 346+ tests |
| Build | `android-release.yml` | Android APK/AAB |
| Validate | `data-validation.yml` | Data schema validation |
| Security scan | Pre-commit hooks | Secret detection |

### Deployment

1. **Backend (Cloudflare Worker):**
   ```bash
   cd backend && npx wrangler deploy
   ```
   - Deploy from `main` branch only
   - Post-deploy: verify `/api/health/ready` returns 200

2. **Android:**
   - CI builds APK on every push to main
   - Release builds are signed with upload key
   - Artifacts uploaded to GitHub Releases

### Rollback Strategy

1. **Backend:** `npx wrangler rollback` or deploy previous commit
2. **Data:** `git revert <commit-sha>` to undo specific changes
3. **Android:** Revert to previous release tag

## Data Migrations

Schema versioning is handled via the `schemaVersion` field on all published records:
- Current version: `1.0.0`
- Records without a version are treated as `1.0.0`
- Future migrations will:
  1. Bump `CURRENT_SCHEMA_VERSION`
  2. Add migration function to transform old records
  3. Process records in batches (max 50 per batch)

## Dependency Management

- **Node.js:** Use latest LTS
- **Cloudflare Workers:** Auto-updated by Cloudflare
- **Android dependencies:** Check quarterly for updates
- **GitHub Actions:** Pin to major version (e.g., `@v4`)
- **npm audit:** Run monthly

## Scheduled Jobs

| Job | Schedule | Purpose |
|---|---|---|
| Session cleanup | Daily | Remove expired sessions |
| Draft cleanup | Daily | Remove drafts older than 30 days |
| Pending cleanup | Weekly | Remove pending submissions older than 90 days |
| Data quality scan | Weekly | Run `GET /api/admin/data-quality` and log results |

Note: Scheduled jobs can be implemented via Cloudflare Workers Cron Triggers when ready.
