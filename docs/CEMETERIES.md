# GraveAtlas Cemeteries

## Overview

Cemeteries are the primary geographic unit in GraveAtlas. Each cemetery contains graves, which in turn contain person/memorial records.

## Cemetery Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Stable ID (`cemetery_<hex>`) |
| `name` | string | Yes | Official cemetery name |
| `altNames` | array | No | Alternative or former names |
| `localName` | string | No | Name in local language/script |
| `transliteration` | string | No | Romanized name |
| `countryCode` | string | No | ISO 3166-1 alpha-2 (e.g., `SG`, `FR`) |
| `country` | string | No | Country name |
| `region` | string | No | State/province/region |
| `city` | string | No | City/municipality |
| `locality` | string | No | Neighborhood/locality |
| `address` | string | No | Physical address |
| `latitude` | number | No | -90 to 90 |
| `longitude` | number | No | -180 to 180 |
| `timezone` | string | No | IANA timezone (e.g., `Asia/Singapore`) |
| `cemeteryType` | enum | No | public, private, religious, military, national, historical, family, other |
| `religiousAffiliation` | string | No | Religious/cultural classification |
| `operatingStatus` | enum | No | active, closed, abandoned, unknown |
| `establishedDate` | string | No | YYYY, YYYY-MM, YYYY-MM-DD, unknown |
| `closedDate` | string | No | Same format |
| `website` | string | No | Must start with http:// or https:// |
| `contactInfo` | string | No | Publicly available contact info |
| `description` | string | No | max 5000 chars |
| `accessibility` | string | No | Accessibility information |
| `sourceRefs` | array | No | References to Source records |
| `verificationStatus` | enum | Yes | unverified, community_submitted, under_review, verified, rejected |
| `status` | enum | Yes | published, pending, rejected |
| `submittedAt` | string | Yes | ISO timestamp |
| `updatedAt` | string | No | ISO timestamp |

Unknown information is stored as `null`, never invented.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cemeteries` | None | List cemeteries (paginated) |
| GET | `/api/cemeteries/:id` | None | Get cemetery detail |
| POST | `/api/cemeteries` | Rate-limited | Submit new cemetery |
| GET | `/api/countries` | None | List countries with cemeteries |
| GET | `/api/regions?country=X` | None | List regions in a country |
| GET | `/api/cities?country=X&region=Y` | None | List cities in a region |

## Discovery

Users can discover cemeteries by:
- Searching by name (with Unicode support)
- Browsing by country → region → city
- Viewing on map
- Finding nearby cemeteries (using device location, local-only)

## Internationalization

Cemetery names support all Unicode scripts. Records can store:
- `name` — English/primary name
- `localName` — Original script name (Arabic, Chinese, Japanese, etc.)
- `transliteration` — Romanized version
- `altNames` — Array of all alternative names

Original names are never transliterated away.

## Validation

Server-side validation is authoritative:
- Name is required (max 500 chars)
- Country code must be ISO 3166-1 alpha-2 (2 uppercase letters)
- Website must be valid HTTP(S) URL
- Coordinates validated: lat -90 to 90, lon -180 to 180
- Unexpected fields rejected
- Client cannot set `id`, `status`, `verificationStatus`, or `submittedAt`
