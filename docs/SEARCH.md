# Advanced Search & Global Discovery

## Overview

Phase 7A introduces a unified global search system with categorized results, advanced filters, sorting, pagination, geographic directories, and related records. All search is server-side — the Android app never downloads the full dataset.

## Search Categories

| Category | Description |
|----------|-------------|
| People | Grave and memorial records with person names |
| Cemeteries | Cemetery records worldwide |
| Memorials | Memorial-type records |
| Locations | Countries, regions, and cities derived from cemetery data |

## API Endpoints

### Global Search

```
GET /api/search/global?q=smith&type=all&page=1&pageSize=20&sort=relevance&country=Singapore&birthYear=1950
```

Returns categorized results with counts per category.

### Person Search

```
GET /api/search/people?q=john&birthYear=1950&deathYear=2000&country=Singapore&sort=name&page=1&pageSize=20
```

### Cemetery Search

```
GET /api/search/cemeteries?q=bukit&country=Singapore&region=Central&city=Kranji&sort=name&page=1
```

### Location Search

```
GET /api/search/locations?q=singapore
```

Returns countries, regions, and cities matching the query.

### Country Directory

```
GET /api/countries
```

Returns all countries with cemetery and memorial counts.

### Region Directory

```
GET /api/countries/Singapore/regions
```

### City Directory

```
GET /api/countries/Singapore/regions/Central%20Region/cities
```

### Browse by Location

```
GET /api/browse?country=Singapore&region=Central&city=Kranji
```

Returns cemeteries filtered by geographic hierarchy.

### Related Records

```
GET /api/related/cemetery_123?type=cemetery
GET /api/related/grave_456?type=grave
```

Returns nearby cemeteries, people in the same cemetery, and related records in the same region.

## Filters (Part 91)

| Filter | Parameter | Values |
|--------|-----------|--------|
| Country | `country` | Country name (case-insensitive) |
| Region | `region` | Region name |
| City | `city` | City name |
| Birth year | `birthYear` | 4-digit year (1700-2030) |
| Death year | `deathYear` | 4-digit year (1700-2030) |
| Year range start | `yearStart` | 4-digit year |
| Year range end | `yearEnd` | 4-digit year |
| Record type | `type` | people, cemeteries, memorials, locations, all |

## Sorting (Part 93)

| Sort | Description |
|------|-------------|
| `relevance` | By match score (default) |
| `name` | Alphabetical by name |
| `date` | Most recent dates first |
| `distance` | Nearest to given lat/lon coordinates |

## Pagination (Part 94)

- Default page size: 20
- Maximum page size: 100
- `page` starts at 1
- Response includes `total`, `count`, `hasMore`

## Name Normalization (Part 85)

Search normalization:
- Lowercase conversion
- Unicode NFD decomposition + accent stripping
- Punctuation removed (keeps hyphens, apostrophes, spaces)
- Multiple spaces collapsed
- **Original source data is never modified**

## Caching (Part 99)

- Directory data (countries, regions, cities): 10-minute TTL
- Search results: 5-minute TTL
- Cache is automatically evicted when full (LRU)
- Cache is cleared when data is updated

## Security (Part 97)

- Path traversal queries are normalized to plain text
- No GitHub credentials exposed to client
- Maximum query length: 200 characters
- All parameters validated
- Rate limited via existing IP-based limiter
- No arbitrary file or repository access through search

## Internationalization (Part 107)

- Unicode names supported (Arabic, Chinese, Japanese, Korean, Thai, Hebrew, Cyrillic)
- Accent-insensitive search (José matches Jose)
- Alternative names, local names, and transliterations searched
- Multiple date formats supported (year-only, year-month, full date, approx, unknown)
