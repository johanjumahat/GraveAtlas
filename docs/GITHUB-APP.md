# GitHub App Setup Guide

## Why a GitHub App?

GraveAtlas uses a GitHub App (not a personal access token) for backend-to-GitHub authentication because:

- **Scoped permissions** — only what's needed
- **Short-lived tokens** — installation tokens expire automatically
- **Repository-level access** — not user-level
- **Audit trail** — all actions logged as the App, not a user
- **No shared credentials** — each installation has its own token

## Setup Steps

### 1. Create the GitHub App

1. Go to GitHub → Settings → Developer settings → GitHub Apps → New GitHub App
2. Set name: `GraveAtlas Backend`
3. Set homepage URL: `https://github.com/putraworks2026/GraveAtlas`
4. Set webhook URL: (leave empty for now)
5. Set repository permissions:
   - Contents: Read and write
   - Metadata: Read-only
   - Pull requests: Read and write (for future moderation PRs)
6. Set account permissions: none
7. Subscribe to events: (none for Phase 1)
8. Create the App

### 2. Generate a Private Key

1. In the App settings, scroll to "Private keys"
2. Click "Generate a private key"
3. Download the `.pem` file — this is your `GITHUB_PRIVATE_KEY`
4. Note the App ID — this is your `GITHUB_APP_ID`

### 3. Install the App

1. In the App settings, click "Install App"
2. Install it on the `putraworks2026` account
3. Select the `kubur-sg-data` repository
4. Note the installation ID from the URL — this is your `GITHUB_INSTALLATION_ID`

### 4. Configure Cloudflare Secrets

```bash
npx wrangler secret put GITHUB_APP_ID
npx wrangler secret put GITHUB_PRIVATE_KEY
npx wrangler secret put GITHUB_INSTALLATION_ID
```

### 5. Authentication Flow (Backend)

```javascript
// 1. Generate JWT from private key
const jwt = generateJWT(GITHUB_APP_ID, GITHUB_PRIVATE_KEY);

// 2. Exchange JWT for installation token
const token = await fetch(`https://api.github.com/app/installations/${INSTALLATION_ID}/access_tokens`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${jwt}` }
});

// 3. Use installation token to access repo
const result = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
  headers: { Authorization: `token ${token}` }
});
```

### Token Lifecycle

- JWT (from private key): valid 10 minutes
- Installation token: valid 1 hour
- Backend generates new tokens as needed — no long-lived tokens stored

## Security Notes

- The private key (`GITHUB_PRIVATE_KEY`) must NEVER be committed to any repository
- The private key must NEVER be included in the Android app
- The private key lives only in Cloudflare Worker secrets
- If compromised, revoke and regenerate immediately
