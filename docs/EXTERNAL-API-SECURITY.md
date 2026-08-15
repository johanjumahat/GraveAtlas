# External API Security

## Overview (Part 22)

Protects: API keys, OAuth tokens, service credentials, webhook secrets, provider credentials.

## Never Place Credentials In

- Frontend code
- GitHub commits
- Logs
- Screenshots
- Generated PDFs
- AI prompts

## Secret Scanning

All data is scanned before logging or storage:

```javascript
const { hasSecrets, type } = scanForSecrets(data);
// Detects: api_key, access_token, secret, private_key, bearer_token
```

## Response Sanitization

API responses are sanitized — known secret fields are stripped:

```javascript
const safe = sanitizeResponse(response);
// Removes: apiKey, secret, token, password, credentials, authToken, accessToken, refreshToken
```

## Authentication

- The API gateway inherits GraveAtlas's existing authentication system
- Provider credentials are stored only in environment variables
- No provider credentials are ever exposed to clients

## Implementation

File: `backend/src/external-connectors/privacy-security.js`
