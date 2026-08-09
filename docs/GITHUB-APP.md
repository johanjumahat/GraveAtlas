# GitHub App Setup Guide

## Overview

GraveAtlas uses a GitHub App (not a personal access token) for backend-to-GitHub authentication. The Cloudflare Worker authenticates as the GitHub App to read and write files in the `graveatlas-data` repository.

### Why a GitHub App?

- **Scoped permissions** — only Contents (read/write) and Metadata (read-only)
- **Short-lived tokens** — installation tokens expire automatically (1 hour)
- **Repository-level access** — restricted to `putraworks2026/graveatlas-data` only
- **Audit trail** — all actions logged as the App, not a user
- **No shared credentials** — each installation has its own token
- **No PAT required** — the Android app never touches GitHub directly

## Architecture

```
Android App → HTTPS → Cloudflare Worker → GitHub App (JWT) → Installation Token → GitHub Contents API → pending/{submission}.json
```

The GitHub App is used ONLY by the Cloudflare Worker. The Android app never authenticates with GitHub directly.

## GitHub App Configuration

### App Details

| Field | Value |
|-------|-------|
| Name | GraveAtlas Backend |
| Public | No (private — not installable by others) |
| Homepage | https://github.com/putraworks2026/GraveAtlas |
| Webhook | Not required (leave inactive/empty) |

### Required Repository Permissions

| Permission | Access | Why |
|-----------|--------|-----|
| Contents | Read and write | Read/write/delete files via Contents API |
| Metadata | Read-only | Required by GitHub for all apps |

No other permissions are needed. Do NOT grant Actions, Pull requests, Issues, Administration, Workflows, Checks, or any organization/user permissions.

### Installation

The App must be installed ONLY on:
- `putraworks2026/graveatlas-data`

Do NOT install on all repositories.

## Required Cloudflare Worker Secrets

| Secret | Description |
|--------|-------------|
| `GITHUB_APP_ID` | The GitHub App ID (numeric, found in App settings) |
| `GITHUB_PRIVATE_KEY` | The PEM private key generated in App settings |
| `GITHUB_INSTALLATION_ID` | The installation ID (numeric, found in installation URL/API) |
| `GITHUB_OWNER` | GitHub username: `putraworks2026` |
| `GITHUB_REPO` | Repository name: `graveatlas-data` |
| `GITHUB_BRANCH` | Branch: `main` |
| `ADMIN_TOKEN` | Admin authentication token for API admin routes |

## App ID vs Client ID vs Installation ID

These are three different values — do not confuse them:

- **App ID** — The unique numeric ID of the GitHub App itself. Found at the top of the App's General settings page. This becomes `GITHUB_APP_ID`.
- **Client ID** — A string identifier (e.g., `Iv1.xxxxx`). Used for OAuth user flows. NOT needed for this architecture.
- **Installation ID** — The numeric ID of a specific installation of the App on an account/repo. Found in the installation URL or via the API. This becomes `GITHUB_INSTALLATION_ID`.

## Authentication Flow

```javascript
// 1. Generate JWT from private key (valid 10 minutes)
const jwt = generateJWT(GITHUB_APP_ID, GITHUB_PRIVATE_KEY);

// 2. Exchange JWT for installation token (valid 1 hour)
const token = await fetch(
  `https://api.github.com/app/installations/${GITHUB_INSTALLATION_ID}/access_tokens`,
  { method: 'POST', headers: { Authorization: `Bearer ${jwt}` } }
);

// 3. Use installation token to access repo Contents API
const result = await fetch(
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
  { headers: { Authorization: `token ${token}` } }
);
```

### Token Lifecycle

- **JWT** (from private key): valid 10 minutes
- **Installation token**: valid 1 hour
- **Caching**: Worker caches tokens and refreshes at 50 minutes

### GitHub API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/app/installations/{id}/access_tokens` | Get installation token |
| GET | `/repos/{owner}/{repo}/contents/{path}` | Read file / check existence |
| PUT | `/repos/{owner}/{repo}/contents/{path}` | Write/update file |
| DELETE | `/repos/{owner}/{repo}/contents/{path}` | Delete file |

## Secure Private Key Handling

### Generating the Private Key

1. Go to GitHub → Settings → Developer settings → GitHub Apps → GraveAtlas Backend
2. Scroll to **Private keys**
3. Click **Generate a private key** — downloads a `.pem` file
4. This file IS your `GITHUB_PRIVATE_KEY`

### Adding to Cloudflare (without pasting into any other tool)

```bash
# From your local machine with wrangler installed:
cd backend
npx wrangler secret put GITHUB_PRIVATE_KEY
# Paste the entire contents of the .pem file when prompted
# wrangler encrypts and stores it — it never appears in code or logs
```

### Security Rules

- The private key must NEVER be committed to any repository
- The private key must NEVER be included in the Android app
- The private key must NEVER be pasted into chat tools or third-party services
- The private key lives ONLY in Cloudflare Worker secrets
- If compromised, revoke immediately in GitHub App settings and generate a new key

## Compatibility Note: PKCS#1 vs PKCS#8

GitHub App private keys are generated in **PKCS#1** format (`-----BEGIN RSA PRIVATE KEY-----`).

The Cloudflare Worker's `pemToDer()` function handles **both** PKCS#1 and PKCS#8 formats:
- PKCS#1 keys are automatically wrapped in a PKCS#8 structure for Web Crypto API compatibility
- PKCS#8 keys (`-----BEGIN PRIVATE KEY-----`) are used directly
- No manual key conversion needed

## Test Procedure

### Prerequisites

- GitHub App created with correct permissions
- App installed on `putraworks2026/graveatlas-data`
- Cloudflare Worker secrets configured

### Safe Test (does NOT publish real grave data)

1. **Verify App exists:**
   ```bash
   curl -s -H "Authorization: Bearer <JWT>" https://api.github.com/app
   # Should return app details with name "GraveAtlas Backend"
   ```

2. **Verify installation:**
   ```bash
   curl -s -H "Authorization: Bearer <JWT>" https://api.github.com/app/installations
   # Should show installation on putraworks2026 account
   ```

3. **Verify repo access:**
   ```bash
   curl -s -H "Authorization: token <INSTALLATION_TOKEN>" \
     https://api.github.com/installation/repositories
   # Should list putraworks2026/graveatlas-data
   ```

4. **Write test file:**
   ```bash
   curl -X PUT \
     -H "Authorization: token <INSTALLATION_TOKEN>" \
     -H "Accept: application/vnd.github+json" \
     https://api.github.com/repos/putraworks2026/graveatlas-data/contents/pending/test-app-verification.json \
     -d '{"message": "test: app verification", "content": "eyJ0ZXN0Ijp0cnVlfQ=="}'
   ```

5. **Verify test file exists:**
   ```bash
   curl -s -H "Authorization: token <INSTALLATION_TOKEN>" \
     https://api.github.com/repos/putraworks2026/graveatlas-data/contents/pending/test-app-verification.json
   ```

6. **Remove test file safely:**
   ```bash
   # Get the SHA from step 5 response, then:
   curl -X DELETE \
     -H "Authorization: token <INSTALLATION_TOKEN>" \
     -H "Accept: application/vnd.github+json" \
     https://api.github.com/repos/putraworks2026/graveatlas-data/contents/pending/test-app-verification.json \
     -d '{"message": "cleanup: remove test file", "sha": "<SHA>"}'
   ```

This test does NOT modify or delete any real grave data.
