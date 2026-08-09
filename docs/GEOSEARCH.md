# Geographic Search

## Overview

GraveAtlas supports efficient geographic queries for cemetery and grave discovery.

## Supported Query Types

| Query | Description |
|-------|-------------|
| Cemeteries near user | Within a radius of user's current location |
| Cemeteries in [country] | Filter by country name or ISO code |
| Cemeteries in [city] | Filter by city name |
| Graves within radius | Graves near a specific point |
| Cemeteries within map viewport | Bounding box query |

## Implementation

### Bounded Queries

All geographic queries use bounded parameters:
- `lat`, `lon`, `radius` (in km) for radius queries
- `bounds` (north, south, east, west) for viewport queries
- `country`, `region`, `city` for hierarchical filtering

The Android app never downloads the complete worldwide dataset. All filtering is server-side.

### Map Clustering

When many cemeteries exist in a geographic area:
- Markers are clustered by grid cells
- As users zoom in, more individual markers appear
- At low zoom, country/region-level clusters are shown
- At high zoom, individual cemetery markers are shown

### Distance Calculation

Haversine formula is used for distance calculations:
```
distance = 2 * R * atan2(sqrt(a), sqrt(1-a))
where a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
and R = 6371 km (Earth radius)
```

## Caching

| Data | Cache TTL | Notes |
|------|-----------|-------|
| Country list | 10 minutes | Changes rarely |
| Region list | 5 minutes | Changes with new cemeteries |
| City list | 5 minutes | Changes with new cemeteries |
| Cemetery detail | 5 minutes | Changes with updates |
| Search results | Not cached | Fresh results needed |
