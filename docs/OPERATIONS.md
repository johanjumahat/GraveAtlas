# Operations Guide

**Last updated:** 2026-08-09

## Daily Operations

### Monitoring

| Metric | Where to Check | Frequency |
|--------|---------------|-----------|
| API health | GET /api/health | Daily |
| Data quality | GET /api/admin/data-quality | Weekly |
| Pending submissions | GET /api/admin/submissions | Daily |
| Pending reports | GET /api/admin/reports | Daily |
| Pending corrections | GET /api/admin/corrections | Daily |
| Admin dashboard | GET /api/admin/dashboard | Daily |

### Moderation Workflow

1. Review pending submissions: `GET /api/admin/submissions`
2. Approve or reject: `POST /api/admin/submissions/:id/approve` or `POST /api/admin/submissions/:id/reject`
3. Review reports: `GET /api/admin/reports`
4. Resolve or reject reports: `POST /api/admin/reports/:id/resolve` or `POST /api/admin/reports/:id/reject`
5. Review corrections: `GET /api/admin/corrections`
6. Approve or reject corrections

### Import Workflow

1. Register source: Use createSourceRegistryEntry() with license verification
2. Validate dataset: Use validateDataset()
3. Detect duplicates: Use detectDuplicates()
4. Generate preview: Use generateImportPreview()
5. Admin reviews and approves
6. Import records (tagged with import_id)
7. Generate report: Use generateImportReport()
8. If needed, rollback using import_id

## Deployment

### Cloudflare Worker

Deploy using Wrangler:
```
cd backend
wrangler deploy
```

Secrets are configured via Cloudflare dashboard or:
```
wrangler secret put GITHUB_APP_ID
wrangler secret put GITHUB_PRIVATE_KEY
wrangler secret put GITHUB_INSTALLATION_ID
wrangler secret put ADMIN_TOKEN
```

### Android App

Build release APK:
```
./gradlew assembleRelease
```

APK is output to `app/build/outputs/apk/release/`.

## Configuration

### Worker Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| GITHUB_APP_ID | Yes | GitHub App ID |
| GITHUB_PRIVATE_KEY | Yes | GitHub App private key (PEM) |
| GITHUB_INSTALLATION_ID | Yes | GitHub App installation ID |
| GITHUB_OWNER | Yes | GitHub organization/user |
| GITHUB_REPO | Yes | Data repository name |
| GITHUB_BRANCH | Yes | Data repository branch |
| ADMIN_TOKEN | Yes | Admin authentication token |
| ALLOWED_ORIGIN | No | CORS allowed origin |

### Android Configuration

| Setting | Value |
|---------|-------|
| API URL | Configurable in Settings (default: production Worker) |
| Package | com.putraworks.graveatlas |
| Version | 4.4.1 (code 40) |
