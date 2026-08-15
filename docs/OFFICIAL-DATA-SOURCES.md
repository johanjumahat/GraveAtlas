# GraveAtlas — Official Data Sources & API Research

**Date:** 2026-08-15
**Purpose:** Document all investigated official APIs and data sources for potential integration with GraveAtlas

---

## 1. Singapore — NEA (National Environment Agency) via data.gov.sg

### Status: ✅ IMPORTER BUILT — Cemetery locations from NEA data.gov.sg

**Importer:** `backend/src/importers/nea-singapore.js`
**Tests:** `tests/nea-importer.test.js` (42 tests, all passing)

**Datasets:**

| Dataset | ID | Format | License |
|---|---|---|---|
| Active Cemeteries (GEOJSON) | `d_4a9b83ee745c10c3aa5829fb80e09d9c` | GeoJSON | Singapore Open Data Licence (free, commercial OK) |
| After Death Facilities (GEOJSON) | `d_8057b4f4c7eca22c3c51c4ac05440f21` | GeoJSON | Singapore Open Data Licence |
| Dedicated Columbaria (GEOJSON) | `d_9b0752e9d3f1f9d957d5d8be2b58dfff` | GeoJSON | Singapore Open Data Licence |

**API endpoint:**
```
GET https://api-open.data.gov.sg/v1/public/api/datasets/{dataset_id}/poll-download
```

**What it provides:**
- Cemetery names, coordinates (lat/lng), street addresses, descriptions
- All active cemeteries in Singapore (Choa Chu Kang complex: Chinese, Muslim, Christian, Hindu, Jewish, Parsi, Bahai, Ahmadiyya, Lawn)
- After-death facilities (crematoria, columbaria)

**What it does NOT provide:**
- Individual grave/burial records
- Names of buried persons
- Dates of birth/death
- Plot/block numbers

**Integration potential:** HIGH for cemetery location data. Can be imported as verified cemetery records with SOURCE-BACKED evidence status.

**Attribution required:** National Environment Agency. (2020). Active Cemeteries (GEOJSON). data.gov.sg.

---

## 2. Singapore — MUIS (Islamic Religious Council of Singapore)

### Status: ❌ NO PUBLIC API

**What exists:**
- MUIS oversees Muslim burial practices in Singapore
- Pusara Abadi (Choa Chu Kang Muslim Cemetery) — managed by Wareesan Management
- Online grave search at pusara.sg (launched after ~3 years of development)
- Exhumation programme phases documented on MUIS social media

**What is NOT available:**
- No public API
- No downloadable dataset
- Grave search requires phone contact with NEA's Choa Chu Kang Cemetery Office (6795 9731)
- The pusara.sg search facility appears to be a web-only interface

**Integration potential:** LOW (would require partnership with MUIS/Wareesan Management)

---

## 3. KuburSearch (kubursearch.com)

### Status: ⚠️ COMMUNITY-DRIVEN — No documented API

**What exists:**
- Community-driven database for Muslim graves in Singapore (Pusara Aman & Pusara Abadi) and Malaysia
- Search by Block and Plot numbers
- Mobile app available on Google Play
- Blog and services

**What is NOT available:**
- No documented public API
- No data download facility
- Terms of use unclear for data reuse

**Integration potential:** LOW (would need to contact KuburSearch for partnership/data access)

---

## 4. FindAGrave (findagrave.com)

### Status: ❌ NO PUBLIC API — Owned by Ancestry.com

**What exists:**
- 265+ million memorials from 560,000+ cemeteries in 249 countries
- Free to search and contribute
- Mobile app available

**What is NOT available:**
- No public API (confirmed by multiple sources)
- Scraping is against their terms of service
- Data is proprietary (Ancestry.com owned)

**Integration potential:** NONE (proprietary data, no API, no data reuse rights)

---

## 5. BillionGraves (billiongraves.com)

### Status: ⚠️ POSSIBLE API — Needs direct contact

**What exists:**
- GPS-linked cemetery database, crowdsourced
- 300,000+ cemeteries scanned
- Mobile app for iOS/Android
- Developer notes mentioned on social media (Week 5 developer notes)

**What is NOT confirmed:**
- No public API documentation found
- Developer notes suggest some API access may exist for partners
- Data licensing terms unclear

**Integration potential:** MEDIUM (contact BillionGraves for partnership/API access)

---

## 6. US National Cemetery Administration (NCA)

### Status: ⚠️ WEB SEARCH ONLY — No documented public API

**What exists:**
- Nationwide Gravesite Locator (cem.va.gov/nationwide-gravesite-locator/)
- Burial records of veterans and eligible family members
- Data updated daily
- 173 national cemeteries

**What is NOT available:**
- No documented REST API
- No bulk data download
- Web search interface only

**Integration potential:** LOW (could potentially be used for manual data entry, but no automated import)

---

## 7. Interment.net

### Status: ⚠️ FREE DATABASE — No API

**What exists:**
- 25 million+ cemetery record transcriptions
- Free to search
- Compiled by volunteers, genealogists, and government agencies

**What is NOT available:**
- No documented API
- No bulk download
- Data is transcriptions (not official records)

**Integration potential:** LOW (could be used as a reference source for manual entry, but no automated import)

---

## 8. OpenStreetMap (OSM)

### Status: ✅ IMPORTER BUILT — Cemetery boundaries worldwide via Overpass API

**Importer:** `backend/src/importers/osm-overpass.js`
**Tests:** `tests/osm-importer.test.js` (67 tests, all passing)

**What exists:**
- Tag: `landuse=cemetery` — cemetery boundaries
- Tag: `historic=cemetery` — historic cemetery designation
- Tag: `cemetery=grave` — individual grave markers
- Open data under ODbL license
- Overpass API for querying

**API:**
```
Overpass API: https://overpass-api.de/api/interpreter
```

**What it provides:**
- Cemetery boundaries and locations worldwide
- Some individual grave markers (varies by region)
- Coordinates, names, and basic metadata

**What it does NOT provide:**
- Names of buried persons (not typically tagged in OSM)
- Dates of birth/death
- Comprehensive grave records

**Integration potential:** HIGH for cemetery location/boundary data. ODbL license allows reuse with attribution.

**Attribution required:** © OpenStreetMap contributors

---

## 9. FamilySearch Wiki

### Status: ⚠️ REFERENCE ONLY — No API for records

**What exists:**
- Comprehensive wiki with cemetery information by country
- Links to various cemetery record sources
- Historical record collections (some searchable online)

**Integration potential:** LOW (reference for finding data sources, not a data source itself)

---

## 10. UK Local Councils (various)

### Status: ⚠️ VARIES — Some open data, no unified API

**What exists:**
- Some UK local councils publish burial records as open data
- Example: Stirling Council — 86,000+ burial records as open data
- ArcGIS Open Data portals for some councils

**Integration potential:** MEDIUM (case-by-case basis for each council)

---

## Summary: Recommended Data Sources for GraveAtlas

### Tier 1 — Ready to integrate now:

1. **Singapore NEA data.gov.sg** — Cemetery location data (GeoJSON), Singapore Open Data Licence
2. **OpenStreetMap** — Cemetery boundaries worldwide, ODbL licence

### Tier 2 — Potential with partnership:

3. **BillionGraves** — Contact for API access (300K+ cemeteries, GPS-linked)
4. **UK local councils** — Case-by-case open data agreements

### Tier 3 — Reference only (no automated import):

5. **Interment.net** — 25M records, free, no API
6. **US NCA Gravesite Locator** — Veterans' graves, web search only
7. **FamilySearch Wiki** — Finding aids

### NOT recommended:

8. **FindAGrave** — Proprietary, no API, no data reuse rights
9. **MUIS/Pusara.sg** — No API, phone-based search only

---

## Import Workflow for Official Data

Any data imported from these sources must follow the GraveAtlas import framework:

1. **Source Registration** — Register the source in the import registry
2. **License Check** — Verify the license permits our use case
3. **Validation** — Validate data format and required fields
4. **Duplicate Detection** — Check for existing records
5. **Moderation** — Human review of import
6. **Publication** — Publish with attribution
7. **Import History** — Record import for rollback capability

### Evidence status for imported data:
- NEA data.gov.sg → `SOURCE-BACKED` (government open data)
- OpenStreetMap → `SOURCE-BACKED` (community-verified, ODbL)
- User contributions → `NEEDS VERIFICATION` (pending review)
