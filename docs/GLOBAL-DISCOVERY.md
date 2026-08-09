# Global Discovery

## Overview

Phase 7A enables worldwide geographic discovery through a hierarchical directory: Country → Region → City → Cemetery → Graves/Memorials.

## Geographic Hierarchy

```
Country
  └── Region
       └── City/Locality
            └── Cemetery
                 └── Graves / Memorials / People
```

## Country Directory (Part 88)

The country directory lists all countries that have at least one published cemetery record. Each entry shows:

- Country name
- Country code (ISO 3166-1 alpha-2, when available)
- Cemetery count (actual indexed data — never fabricated)
- Memorial/person count (when available)

**API:** `GET /api/countries`

## Region Directory (Part 89)

Drill into a country to see its regions. Each region shows:

- Region name
- Country
- Cemetery count

**API:** `GET /api/countries/:country/regions`

## City/Locality Directory (Part 90)

Drill into a region to see its cities. Each city shows:

- City name
- Country and region
- Cemetery count
- Representative coordinates (when available)

**API:** `GET /api/countries/:country/regions/:region/cities`

## Browse by Location (Part 87)

Users can browse cemeteries at any level of the hierarchy:

- By country only
- By country + region
- By country + region + city

**API:** `GET /api/browse?country=...&region=...&city=...`

## Related Records (Part 101)

When viewing a detail page, the system shows related records based on actual data:

### Cemetery Detail
- **Nearby cemeteries** — within 50km, sorted by distance (max 5)
- **People in this cemetery** — graves associated with this cemetery (max 10)

### Grave/Person Detail
- **People in the same cemetery** — other graves in the same cemetery (max 10)
- **Cemeteries in the same region** — other cemeteries in the same country (max 5)

**No fabricated relationships.** Only records that actually share geographic proximity or cemetery association are shown.

## Data Source

All geographic data is derived from published cemetery records. The directory is built dynamically from the actual data — if no cemeteries exist for a country, that country does not appear in the directory.

## Caching

- Directory data is cached for 10 minutes
- Search results are cached for 5 minutes
- Cache is LRU-evicted when capacity is reached
- No stale data persists beyond TTL
