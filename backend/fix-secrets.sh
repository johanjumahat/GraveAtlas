#!/bin/bash
#
# GraveAtlas — Cloudflare Worker Secret Fix Script
# Run from the backend/ directory after `wrangler login`
#
# This script re-sets the GitHub App secrets that may have been
# stored with incorrect formatting (escaped newlines, missing headers, etc.)
#

set -e

echo "============================================"
echo "  GraveAtlas Worker Secret Fix"
echo "============================================"
echo ""

# ── 1. Check wrangler auth ──
if ! npx wrangler whoami 2>/dev/null | grep -q "Account"; then
  echo "✗ Not logged into Cloudflare. Run: npx wrangler login"
  exit 1
fi
echo "✓ Cloudflare authenticated"

# ── 2. Set GITHUB_APP_ID ──
echo ""
echo "Setting GITHUB_APP_ID..."
echo "4533958" | npx wrangler secret put GITHUB_APP_ID
echo "✓ GITHUB_APP_ID set"

# ── 3. Set GITHUB_PRIVATE_KEY ──
echo ""
echo "Setting GITHUB_PRIVATE_KEY..."
echo "Paste your private key .pem file contents below, then press Ctrl+D:"
npx wrangler secret put GITHUB_PRIVATE_KEY
echo "✓ GITHUB_PRIVATE_KEY set"

# ── 4. Set GITHUB_INSTALLATION_ID ──
echo ""
echo "Setting GITHUB_INSTALLATION_ID..."
echo "152344676" | npx wrangler secret put GITHUB_INSTALLATION_ID
echo "✓ GITHUB_INSTALLATION_ID set"

# ── 5. Set ADMIN_TOKEN (keep existing if you know it) ──
echo ""
echo "Setting ADMIN_TOKEN..."
echo "Enter your admin token (or press Ctrl+C to skip if already set):"
npx wrangler secret put ADMIN_TOKEN
echo "✓ ADMIN_TOKEN set"

# ── 6. Deploy ──
echo ""
echo "Deploying Worker..."
npx wrangler deploy

# ── 7. Test ──
echo ""
echo "Testing health endpoint..."
sleep 3
WORKER_URL=$(grep -oP 'https://graveatlas[a-z0-9.-]+\.workers\.dev' /dev/null 2>/dev/null || echo "https://graveatlas.putraworks-2026.workers.dev")
echo "Worker URL: $WORKER_URL"
curl -s "$WORKER_URL/api/health" | python3 -m json.tool

echo ""
echo "Testing graves endpoint..."
curl -s "$WORKER_URL/api/graves" | python3 -m json.tool

echo ""
echo "============================================"
echo "  Done! Check the output above:"
echo "  - health should show githubConfigured: true"
echo "  - graves should return actual data (not 'Unable to fetch')"
echo "============================================"
