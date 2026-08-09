#!/usr/bin/env bash
# github-app-token.sh — Generate a GitHub App installation access token
# Usage: ./github-app-token.sh [REPO_NAME]
# Output: Prints the installation token to stdout (for use in scripts)
#
# Requires: GITHUB_APP_ID and GITHUB_APP_PEM_PATH env vars (or .agents/.env)
# Requires: Python3 with pyjwt + cryptography

set -euo pipefail

# Load env if not set
if [ -z "${GITHUB_APP_ID:-}" ] || [ -z "${GITHUB_APP_PEM_PATH:-}" ]; then
  ENV_FILE="${ENV_FILE:-/app/.agents/.env}"
  if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
  else
    echo "Error: GITHUB_APP_ID and GITHUB_APP_PEM_PATH must be set" >&2
    exit 1
  fi
fi

if [ ! -f "$GITHUB_APP_PEM_PATH" ]; then
  echo "Error: PEM file not found at $GITHUB_APP_PEM_PATH" >&2
  exit 1
fi

python3 -c "
import jwt, time, json, sys, urllib.request

app_id = '$GITHUB_APP_ID'
pem_path = '$GITHUB_APP_PEM_PATH'

with open(pem_path) as f:
    private_key = f.read()

# Generate JWT
payload = {
    'iat': int(time.time()) - 60,
    'exp': int(time.time()) + 600,
    'iss': app_id
}
token = jwt.encode(payload, private_key, algorithm='RS256')

# List installations and get token for first one
req = urllib.request.Request(
    'https://api.github.com/app/installations',
    headers={
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    }
)
resp = urllib.request.urlopen(req)
installations = json.loads(resp.read())

if not installations:
    print('Error: No installations found', file=sys.stderr)
    sys.exit(1)

inst_id = installations[0]['id']

# Get installation access token
req2 = urllib.request.Request(
    f'https://api.github.com/app/installations/{inst_id}/access_tokens',
    method='POST',
    headers={
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    }
)
resp2 = urllib.request.urlopen(req2)
tok_data = json.loads(resp2.read())
print(tok_data['token'])
"
