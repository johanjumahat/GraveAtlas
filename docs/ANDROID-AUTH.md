# Android Google Authentication

## Overview

The GraveAtlas Android app requires Google login before users can submit records (graves, cemeteries, corrections). Browsing, searching, and viewing records remain open without login.

## Architecture

```
Android App                    Cloudflare Worker              Google
────────────                   ──────────────────              ──────
GoogleSignIn SDK
    │
    ▼
Get ID token
    │
    ├──► POST /api/auth/google/verify
    │         │
    │         ├──► Google tokeninfo endpoint ──► Verify token
    │         │                                    │
    │         │◄─── Valid + email verified ────────┘
    │         │
    │         ├── Create/update user record
    │         ├── Check ban list
    │         ├── Generate session token (HMAC)
    │         │
    │         ◄─── { sessionToken, userId, displayName }
    │
    ├── Store in EncryptedSharedPreferences
    │
    ├──► All submissions include:
    │    Authorization: Bearer <sessionToken>
    │    Idempotency-Key: <uuid>
    │         │
    │         ├── Verify session token
    │         ├── Log submission (userId, googleSub, IP, UA)
    │         ├── Process submission
    │         └── Return result
    │
    ◄─── Submission result
```

## Components

### SecureStorage.java

Encrypted storage for session tokens and user info.

| Method | Description |
|--------|-------------|
| `saveSessionToken(ctx, token, sub)` | Store session token + Google sub |
| `getSessionToken(ctx)` | Get valid (non-expired) token or null |
| `getGoogleSub(ctx)` | Get Google account ID |
| `clearSessionToken(ctx)` | Clear session (logout) |
| `hasValidSession(ctx)` | Check if session is valid |
| `canSubmit(ctx)` | Requires login + valid session |
| `saveCurrentUser(ctx, id, email, name)` | Store user info |
| `isLoggedIn(ctx)` | Check if user info exists |

**Security:**
- Uses EncryptedSharedPreferences (AES-256-GCM)
- Client-side token expiry (7 days, matching backend)
- Auto-clears expired tokens on access

### LoginActivity.java

Google Sign-In screen with backend verification.

**Static methods:**
- `requireLogin(ctx)` — Check if user can submit (call from fragments)
- `launch(ctx)` — Start LoginActivity from any activity/fragment

**Flow:**
1. Configure GoogleSignInOptions with `requestIdToken()`
2. Launch Google sign-in intent
3. Get ID token from `GoogleSignInAccount.getIdToken()`
4. Send ID token to `POST /api/auth/google/verify`
5. Store session token from response
6. Return RESULT_OK

**Error handling:**
- Missing ID token → "No ID token received"
- Network error → "Network error: <message>"
- Banned account → Shows banReason from server
- Server error → Parsed error message

### ApiClient.java

All submission endpoints include the Authorization header.

**New methods:**
- `setSessionContext(ctx)` — Wire app context for token retrieval
- `isAuthenticated()` — Check if auth header is available
- `getAuthHeader()` — Returns "Bearer <token>" or null

**Updated endpoints:**
- `submitGraveWithKey()` — Now includes Authorization header
- `submitCemetery()` — Now includes Authorization header
- `submitCorrection()` — Now includes Authorization header

**Note:** Auth header is optional (null if not logged in). Read-only endpoints (search, get, list) do not require auth.

### AddGraveFragment.java

Login gate at the entry point of the submission flow.

```java
private void showReview() {
    SecureStorage.init(getContext());
    if (!SecureStorage.canSubmit(getContext())) {
        Toast.makeText(getContext(), "Please sign in with Google to add records.", Toast.LENGTH_LONG).show();
        LoginActivity.launch(getActivity());
        return;
    }
    // ... continue with submission form
}
```

## Setup Requirements

### 1. Google Cloud Console

1. Create or select a project
2. Configure OAuth consent screen
3. Create Web Application OAuth client ID
4. Set authorized JavaScript origins and redirect URIs
5. Get the Web Client ID

### 2. Backend (wrangler.toml)

```toml
# Set via: wrangler secret put GOOGLE_CLIENT_ID
GOOGLE_CLIENT_ID = "your-web-client-id.apps.googleusercontent.com"
```

### 3. Android (LoginActivity.java)

Replace `CLIENT_ID_PLACEHOLDER` in:
```java
.requestIdToken("CLIENT_ID_PLACEHOLDER")
```
with your actual Web Client ID from Google Cloud Console.

### 4. Android (strings.xml — recommended)

For better configuration management, add to `strings.xml`:
```xml
<string name="google_web_client_id">your-web-client-id.apps.googleusercontent.com</string>
```

And reference it in LoginActivity:
```java
.requestIdToken(getString(R.string.google_web_client_id))
```

## User Experience

### Browsing (No Login Required)
- Search graves and cemeteries
- View grave details
- Browse map
- Use AI chat
- Save favorites

### Submitting (Login Required)
- Add a grave
- Add a cemetery
- Submit a correction
- Submit photos

### Login Screen
- "Sign in with Google" button
- "Browse without signing in" option
- Error messages for failed sign-ins
- Privacy note about server-side verification

## Security Measures

1. **Server-side token verification** — ID tokens verified with Google's tokeninfo endpoint
2. **Encrypted storage** — Session tokens in EncryptedSharedPreferences
3. **7-day expiry** — Both client-side and server-side
4. **Login gates** — All submission entry points check auth
5. **Ban enforcement** — Banned Google accounts cannot re-register
6. **Audit trail** — Every submission logs userId, Google sub, IP, user-agent
7. **No tokens in URLs** — Tokens sent in request body and Authorization header only
8. **Non-exported activity** — LoginActivity not exported in manifest
