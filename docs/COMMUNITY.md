# Community Accounts & Contributions

## Overview

Phase 6A introduces community accounts and a contribution system. Users can register, create contributions (cemeteries, graves, corrections, photos), save drafts, and track their submission history.

## User Accounts

### Registration

Users register by sending a `POST /api/user/register` request with a display name. The Android app generates a local user ID (UUID format: `user_<timestamp><random>`) and sends it as the `X-User-Id` header.

**Request:**
```json
{
  "displayName": "John Doe",
  "bio": "Cemetery researcher"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_...",
    "displayName": "John Doe",
    "bio": "Cemetery researcher",
    "joinedDate": "2026-08-09T...",
    "contributionCount": 0,
    "acceptedCount": 0
  },
  "isNew": true
}
```

### Account States

- `ACTIVE` — Normal account, can create contributions
- `SUSPENDED` — Cannot create new contributions (set by admin)
- `DEACTIVATED` — Account removed, profile hidden

### Profile

Users can view their own profile via `GET /api/user/profile` and update it via `PUT /api/user/profile`.

Public profiles are available via `GET /api/users/:id/profile` — shows only display name, bio, joined date, and contribution counts. No email, tokens, or internal data are exposed.

## Contribution Center

The contribution center provides four options:

1. **Add cemetery** — Submit a new cemetery record
2. **Add grave/memorial** — Submit a new grave or memorial record
3. **Suggest correction** — Propose changes to existing records
4. **Add photo** — Submit a photo for a cemetery or grave

All contributions enter `PENDING_REVIEW` status. No user submission is published directly.

## API Endpoints

### User

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/user/register` | Register or update user account |
| GET | `/api/user/profile` | Get own profile |
| PUT | `/api/user/profile` | Update profile |
| GET | `/api/users/:id/profile` | Get public profile |

### Contributions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/contributions` | Create a contribution |
| GET | `/api/contributions` | List my contributions (paginated) |
| GET | `/api/contributions/:id` | Get contribution details |
| POST | `/api/contributions/:id/cancel` | Cancel a pending contribution |
| POST | `/api/contributions/check-duplicate` | Check for duplicates before submitting |

### Drafts

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/drafts` | Create a draft |
| GET | `/api/drafts` | List my drafts |
| GET | `/api/drafts/:id` | Get draft details |
| PUT | `/api/drafts/:id` | Update draft |
| DELETE | `/api/drafts/:id` | Delete draft |
| POST | `/api/drafts/:id/submit` | Submit draft for review |

### Photos

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/photos` | Submit a photo contribution |

## Authentication

User identification uses the `X-User-Id` HTTP header. This is a lightweight identity system suitable for the current phase. Future phases may replace this with OAuth or Firebase Auth.

**Security:**
- User IDs are validated (`user_` prefix + alphanumeric)
- All contribution access is user-scoped — users can only see/modify their own submissions
- Admin endpoints remain protected with Bearer token auth
- Rate limiting: 30 contribution actions per user per hour
