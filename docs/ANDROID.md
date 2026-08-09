# GraveAtlas Android Application

## Overview

The Android app is the user-facing interface for GraveAtlas. It provides navigation between cemetery/grave browsing, searching, map viewing, and submission features.

## Architecture

The app uses a Fragment-based architecture with placeholder screens in Phase 1:

```
MainActivity (host)
├── HomeFragment         — landing page with quick actions
├── SearchFragment       — search graves by name/cemetery/location
├── MapFragment          — map view of graves (future: OSM/Google Maps)
├── AddGraveFragment     — submission form
├── ContributeFragment   — user's submission history
├── SettingsFragment     — API config, preferences
├── AboutFragment        — app info, data sources, privacy
├── CompassActivity      — compass + GPS (existing feature)
└── ChatActivity         — AI chat (existing feature)
```

## Data Layer

### Models
- `GraveRecord` — full grave record (matches backend JSON schema)
- `GraveSubmission` — submission request (subset of fields)
- `SubmissionResponse` — backend response (success, submissionId, status)

### API Client
`ApiClient` handles all HTTP communication with the Cloudflare Worker:
- Uses OkHttp for networking
- Async callbacks (no blocking on main thread)
- No secrets stored in the app
- Base URL configurable from Settings (stored in SharedPreferences)

## Permissions

| Permission | Purpose | Required |
|------------|---------|----------|
| INTERNET | Backend API communication | Yes |
| ACCESS_FINE_LOCATION | GPS for grave submissions | Optional |
| ACCESS_COARSE_LOCATION | Fallback location | Optional |
| POST_NOTIFICATIONS | Future notification features | Optional |

## What's Implemented (Phase 1)

- Data models matching backend schema
- API client with all endpoints
- Placeholder fragment screens for all navigation destinations
- Navigation route definitions
- Existing chat and compass features preserved

## What's Not Yet Implemented

- Fragment navigation host (BottomNavigationView + NavHost)
- Map SDK integration
- Photo capture and upload
- Form implementation for Add Grave
- Search results display
- Grave detail view
- User authentication
- Offline caching

## Build

The app uses Gradle with:
- compileSdk 34
- minSdk (as configured in build.gradle)
- Java 17
- AndroidX components
- OkHttp for networking

```bash
./gradlew assembleDebug    # Debug build
./gradlew assembleRelease   # Release build (requires signing config)
```

## Dependencies

- OkHttp (HTTP client)
- AndroidX (appcompat, fragments, material components)
- JSON parsing (org.json)
- No paid SDKs or APIs
