# GraveAtlas Secrets Configuration

## Overview

The GraveAtlas Cloudflare Worker requires four secrets and three non-secret environment variables. This document explains how to configure each one.

**NEVER commit secret values to the repository. NEVER put secrets in the Android app.**

## Required Cloudflare Worker Secrets

These must be set via `wrangler secret put` or the Cloudflare dashboard. They are encrypted at rest and only available in the Worker runtime.

### GITHUB_APP_ID

The numeric ID of the GraveAtlas GitHub App.

**Where to find it:** GitHub → Settings → Developer settings → GitHub Apps → GraveAtlas Backend → General settings (top of page).

**How to set:**
```bash
cd backend
npx wrangler secret put GITHUB_APP_ID
# Enter the numeric App ID when prompted
```

### GITHUB_PRIVATE_KEY

The PEM-format private key for the GitHub App.

**Where to find it:** GitHub → Settings → Developer settings → GitHub Apps → GraveAtlas Backend → Private keys → Generate a private key. This downloads a `.pem` file.

**How to set:**
```bash
cd backend
npx wrangler secret put GITHUB_PRIVATE_KEY
# Paste the entire contents of the .pem file when prompted
```

**Security rules:**
- Never commit the `.pem` file to any repository
- Never include it in the Android app
- Never paste it into chat tools or third-party services
- Never print it in logs
- If compromised, revoke it immediately in GitHub App settings and generate a new key

### GITHUB_INSTALLATION_ID

The numeric ID of the GitHub App installation on the target repository.

**Where to find it:** After installing the GitHub App on `putraworks2026/graveatlas-data`, the installation ID appears in the installation URL or can be retrieved via the API:

```bash
# Generate a JWT first (use scripts/github-app-token.sh or manually),
# then:
curl -s -H "Authorization: Bearer <JWT>" https://api.github.com/app/installations
# The "id" field of the relevant installation is GITHUB_INSTALLATION_ID
```

**How to set:**
```bash
cd backend
npx wrangler secret put GITHUB_INSTALLATION_ID
# Enter the numeric installation ID when prompted
```

### ADMIN_TOKEN

A cryptographically secure random token for admin API authentication.

**How to generate:**
```bash
node scripts/generate-admin-token.js
```

This generates a 64-byte (512-bit) random token encoded as base64url.

**How to set:**
```bash
cd backend
npx wrangler secret put ADMIN_TOKEN
# Paste the generated token when prompted
```

**Security rules:**
- Save the token in a password manager immediately
- Never commit it to the repository
- Never put it in the Android app
- Never print it in API responses
- Never log it
- Never share it via chat or email
- Use the `Authorization: Bearer <ADMIN_TOKEN>` header for admin endpoints only

## Non-Secret Environment Variables

These are set in `wrangler.toml` under `[vars]` — they are not sensitive.

| Variable | Value | Description |
|----------|-------|-------------|
| `GITHUB_OWNER` | `putraworks2026` | GitHub username/org |
| `GITHUB_REPO` | `graveatlas-data` | Target data repository |
| `GITHUB_BRANCH` | `main` | Branch for all operations |

## Optional Environment Variables

| Variable | Description |
|----------|-------------|
| `ALLOWED_ORIGIN` | If set, enables CORS for this origin (e.g., `https://admin.example.com`). Android native clients do not need CORS. |

## Secret Rotation

### Rotating GITHUB_PRIVATE_KEY

1. Go to GitHub → Settings → Developer settings → GitHub Apps → GraveAtlas Backend
2. Generate a new private key
3. Update the Cloudflare secret: `npx wrangler secret put GITHUB_PRIVATE_KEY`
4. Delete the old key in GitHub App settings
5. Verify the Worker still works via `/api/health`

### Rotating ADMIN_TOKEN

1. Generate a new token: `node scripts/generate-admin-token.js`
2. Update the Cloudflare secret: `npx wrangler secret put ADMIN_TOKEN`
3. Update your password manager entry
4. The old token immediately stops working

### Revoking the GitHub App

1. Go to GitHub → Settings → Developer settings → GitHub Apps → GraveAtlas Backend
2. Scroll to "Danger Zone" → Delete the App
3. Remove all Cloudflare secrets related to GitHub
4. The Worker will gracefully degrade — public endpoints still work, data operations return empty results

## Verification

After setting all secrets, verify the configuration:

```bash
# Health check — should show githubConfigured: true, adminConfigured: true
curl https://graveatlas.putraworks-2026.workers.dev/api/health

# Admin status (requires valid ADMIN_TOKEN)
curl -H "Authorization: Bearer <ADMIN_TOKEN>" \
  https://graveatlas.putraworks-2026.workers.dev/api/admin/status
```
