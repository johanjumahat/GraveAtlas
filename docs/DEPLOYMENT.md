# GraveAtlas Deployment Guide

## Overview

GraveAtlas uses two deployment targets:

1. **Backend** → Cloudflare Workers (free tier)
2. **Android app** → GitHub Actions builds APK, GitHub Releases distributes

## Backend Deployment (Cloudflare Worker)

### Prerequisites
- Cloudflare account (free tier)
- Wrangler CLI installed

### Steps

1. Install dependencies:
```bash
cd backend
npm install
```

2. Login to Cloudflare:
```bash
npx wrangler login
```

3. Set secrets (NEVER commit these):
```bash
npx wrangler secret put GITHUB_APP_ID
npx wrangler secret put GITHUB_PRIVATE_KEY
npx wrangler secret put GITHUB_INSTALLATION_ID
npx wrangler secret put ADMIN_TOKEN
```

4. Set non-secret variables in `wrangler.toml`:
```toml
[vars]
GITHUB_OWNER = "putraworks2026"
GITHUB_REPO = "kubur-sg-data"
GITHUB_BRANCH = "main"
```

5. Deploy:
```bash
npx wrangler deploy
```

6. Test health endpoint:
```bash
curl https://graveatlas-backend.YOUR-SUBDOMAIN.workers.dev/api/health
```

### Local Development
```bash
npx wrangler dev
```

## Android App Deployment

The Android APK is built automatically by GitHub Actions on every push to `main`.

### Prerequisites
- GitHub repository secrets for signing (KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD)
- These must be configured by the repository owner

### Build Process
1. Push to `main` triggers `.github/workflows/android-release.yml`
2. Pipeline: checkout → JDK 17 → SDK → build → sign → release
3. APK is published as a GitHub Release artifact
4. SHA-256 checksum provided for verification

### Manual Build
```bash
cd app
./gradlew assembleRelease
```

## Data Repository Deployment

The public data repository (`kubur-sg-data`) is a separate GitHub repository:

1. Create private repo `kubur-sg-data`
2. Create the directory structure (graves/, cemeteries/, pending/, photos/, index/, schema/)
3. Copy schema files from this repo's `github/schema/` to the data repo's `schema/`
4. Create README.md in the data repo
5. The backend Worker will read/write to this repo via GitHub App

## Verification Checklist

After deployment, verify:
- [ ] `GET /api/health` returns 200
- [ ] `POST /api/graves` with valid data returns 201 with pending status
- [ ] `POST /api/graves` with invalid data returns 400
- [ ] `GET /api/admin/submissions` without token returns 401
- [ ] `GET /api/admin/submissions` with valid token returns 200
- [ ] Android app can reach the backend
- [ ] No secrets in any committed files
- [ ] GitHub Actions data validation passes
