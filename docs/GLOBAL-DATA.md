# Global Data

## Overview

GraveAtlas supports worldwide geographic discovery using a flexible hierarchy that does not assume a single country model.

## Geographic Hierarchy

```
WORLD
  ↓
COUNTRY (ISO 3166-1 alpha-2)
  ↓ optional
REGION / State / Province
  ↓ optional
DISTRICT / County (not used by all countries)
  ↓ optional
CITY / Municipality
  ↓ optional
LOCALITY / Neighborhood
  ↓
CEMETERY
  ↓ optional
SECTION
  ↓ optional
PLOT
  ↓
GRAVE / MEMORIAL
  ↓
PERSON
```

Not every country uses every level. Countries without states/provinces can skip directly from Country → City → Cemetery.

## Country Directory

The country directory (`backend/src/countries.js`) contains 177 countries with:
- ISO 3166-1 alpha-2 code
- English name
- Local endonym (original script)
- Alternative names

The directory is a static reference of country metadata. It does NOT contain cemetery or grave records. Cemetery counts come from actual GraveAtlas data.

### Distinction

| Label | Meaning |
|-------|---------|
| "GraveAtlas records: X" | X records exist in GraveAtlas for this country |
| "No GraveAtlas data" | GraveAtlas has no records for this country yet |
| NOT used: "No cemeteries exist" | We do NOT claim a country has zero cemeteries |

## Unicode Support

- Country, region, and city names are stored in their original script
- Search normalization (NFD + accent removal) is for matching only
- Original names are never modified or transliterated during storage
- Display shows the original name; normalized version is used internally

## Flexible Hierarchy Examples

| Country | Hierarchy |
|---------|-----------|
| Singapore | Country → City → Cemetery |
| Japan | Country → Region (Prefecture) → City → Cemetery |
| United States | Country → Region (State) → City → Cemetery |
| Saudi Arabia | Country → Region (Province) → City → Cemetery |
| Vatican City | Country → Cemetery |
