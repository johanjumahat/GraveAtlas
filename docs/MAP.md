# GraveAtlas Map

## Overview

The map screen displays cemetery and grave locations with coordinates. It uses a no-paid-SDK approach — locations are displayed as a list and opened in the device's default map application via `geo:` intents.

## Architecture

### Design Constraints

- **No paid map SDK** — GraveAtlas does not use Google Maps SDK or any paid mapping library
- **Device map handoff** — `geo:` intents open the user's preferred map app (Google Maps, OsmAnd, etc.)
- **Server-side filtering** — The Android app never downloads the complete worldwide dataset
- **Bounded queries** — All geographic queries use bounded parameters (radius, viewport)

### Data Flow

```
Android app → GET /api/nearby?lat=X&lon=Y&radius=Z
            → Results displayed as cards
            → User taps card → geo: intent → device map app
```

## Map Fragment

`MapFragment.java` displays all grave records that have coordinates:

1. Loads cached data first (instant display from previous session)
2. Fetches fresh data from API
3. Filters to records with valid coordinates only
4. Displays each location as a card with name, cemetery, and coordinates
5. Tapping a card opens the device's map app at that location

### Empty States

| State | Display |
|-------|---------|
| No locations with coordinates | "No locations with coordinates available." |
| Loading | "Loading locations..." with progress bar |
| Network error (cached data available) | "Showing cached data (N locations)" |
| Network error (no cache) | Error message + Retry button |
| Invalid/null coordinates | Filtered out — not displayed |

### Coordinate Filtering

Records with invalid coordinates are never displayed on the map:
- `null` latitude or longitude → excluded
- (0, 0) coordinates → treated as valid (Null Island is a real place)
- Out-of-range coordinates → excluded by backend validation before storage

## Clustering

### Grid-Based Clustering

When the dataset grows, markers are grouped by geographic grid cells to prevent visual overload:

- **Low zoom / many markers:** Records in the same grid cell are grouped into a cluster
- **High zoom / few markers:** Individual records are shown
- **Cluster cell size:** Dynamically adjusts based on result density

### Android Implementation

The Android app groups nearby results by proximity:
- Results within the same ~1 km grid cell are grouped
- Cluster cards show the count and representative name
- Tapping a cluster zooms in (opens map app at cluster center with closer zoom)

### Backend Support

The backend supports viewport-bounded queries:
- `GET /api/nearby?lat=X&lon=Y&radius=Z` — radius-bounded query (max 100 km)
- Results are sorted by distance
- Pagination prevents unbounded result sets
- Invalid/null coordinates filtered server-side

## Nearby Fragment

`NearbyFragment.java` (Phase 7B) provides location-based discovery:
- Requests location permission on-demand only
- One-shot location request (no continuous tracking)
- Distance filters: 1km, 5km, 10km, 25km
- Results include cemeteries and memorials
- Tapping a result opens the device map app
- App works without location permission (user can enter coordinates manually)

## Location Privacy

- Location is requested one-shot, never continuously tracked
- User coordinates are never uploaded to the server
- The server only sees the query parameters (lat, lon, radius)
- Permission is requested only when the user explicitly invokes "nearby"
- App fully functional without location permission

## Offline Behavior

- Cached grave data is displayed when network is unavailable
- Status indicator shows "Showing cached data" when offline
- Retry button appears when network fails and no cache available
- No empty error screen — always shows something useful
