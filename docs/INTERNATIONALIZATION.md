# GraveAtlas Internationalization

## Overview

GraveAtlas is designed for worldwide use from the ground up. All text fields support full Unicode, and the geographic model is flexible enough for any country's administrative hierarchy.

## Unicode Support

All text fields (names, descriptions, inscriptions, etc.) support the full Unicode character set. No transliteration is applied to stored data. Original characters are always preserved.

### Supported Scripts

| Script | Example | Language |
|--------|---------|----------|
| Arabic | مقبرة الجنة | Arabic |
| Chinese | 安祥园 | Chinese |
| Japanese | 青山霊園 | Japanese |
| Korean | 국립묘지 | Korean |
| Cyrillic | кладбище | Russian, Bulgarian, etc. |
| Greek | κοιμητήριο | Greek |
| Hebrew | בית קברות | Hebrew |
| Devanagari | कब्रिस्तान | Hindi, Sanskrit |
| Thai | สุสาน | Thai |
| Latin | Cimetière | French, Spanish, etc. |
| Accented Latin | café | French, German, etc. |

### Search and Unicode

Search normalizes text for matching:
1. Convert to lowercase
2. NFD decomposition (separate base characters from diacritics)
3. Remove diacritics (accents)
4. Trim whitespace

This means searching for "cafe" matches "café", and searching for "café" also matches "café" (exact match scores higher).

Original characters are never modified in stored data.

## Multi-Language Names

Records can store multiple name variants:

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Primary/English display name | `Pere Lachaise` |
| `localName` | Original script name | `Cimetière du Père Lachaise` |
| `transliteration` | Romanized version | `An Xiang Yuan` |
| `altNames` | Array of all alternatives | `["BBC", "Bukit Brown Cemetery"]` |

Search checks all name variants and ranks them accordingly.

## Geographic Hierarchy

Not every country uses the same administrative levels. GraveAtlas supports a flexible hierarchy:

```
Country (ISO 3166-1 alpha-2 code)
  ↓ optional
Region / State / Province
  ↓ optional
District / County
  ↓ optional
City / Municipality
  ↓ optional
Locality
```

Countries can skip levels. For example:
- Singapore: Country → City (no state)
- Japan: Country → Prefecture → City
- USA: Country → State → County → City
- France: Country → Region → Department → Commune

## Country Codes

Country codes use ISO 3166-1 alpha-2 format (2 uppercase letters):
- `SG` — Singapore
- `FR` — France
- `JP` — Japan
- `US` — United States
- `MY` — Malaysia
- `ID` — Indonesia

Country codes are validated server-side.

## Date Format

Dates use an internationally safe representation:

| Format | Example | Meaning |
|--------|---------|---------|
| YYYY | `1902` | Year only |
| YYYY-MM | `1902-05` | Year and month |
| YYYY-MM-DD | `1902-05-12` | Full date |
| `unknown` | `unknown` | Date unknown |
| `approx_YYYY` | `approx_1902` | Approximate date |

Dates are stored in ISO 8601 format. Display formatting follows the user's locale on the Android client.

Partial dates are never silently converted to exact dates. `1902` stays `1902`, not `1902-01-01`.

## Postal Codes

Postal/zip codes are not stored or validated — formats vary wildly worldwide. Addresses are stored as free-text strings.

## Timezones

Cemetery records can optionally store an IANA timezone (e.g., `Asia/Singapore`, `Europe/Paris`, `America/New_York`). This is for display purposes only.
