# GraveAtlas

A worldwide cemetery & memorial locator for Android. Search, explore, and contribute grave records globally.

## Features

- **Search** — Find graves and cemeteries by name, location, or date
- **Map** — Interactive map view of nearby cemeteries
- **Add Grave** — Contribute new grave records with GPS coordinates
- **Compass + GPS** — Navigate to grave sites with built-in compass
- **AI Chat** — Ask questions about cemeteries and genealogy
- **My Contributions** — Track records you've submitted
- **Nearby** — Discover cemeteries and memorials near your location
- **Saved Items** — Bookmark records and view browsing history
- **Sharing** — Share records via deep links and HTTPS URLs
- **Settings** — Configure API endpoint and preferences

## External Cemetery API Integration

GraveAtlas integrates with external cemetery and burial record sources to provide
comprehensive worldwide coverage beyond community-submitted records.

### Supported Sources
- **OpenStreetMap (Overpass API)** — Cemetery locations, names, and geometry worldwide
- **Wikidata SPARQL** — Cemetery metadata, coordinates, and historical information

### Architecture (28-part integration)
- **Parts 1-3**: Source registry, discovery, and OSM connector
- **Parts 4-6**: External grave schema, cemetery matching, and field mapping
- **Parts 7-9**: Provenance badges, licensing enforcement, and rate limiting
- **Parts 10-12**: Redis-compatible caching, graceful failure handling, and schema change detection
- **Part 13**: API gateway (orchestrates all source queries)
- **Parts 14-15**: Data quality validation and batch import framework
- **Parts 16-17**: AI external search with source transparency
- **Part 18**: Search fallback (internal-only when external sources are unavailable)
- **Part 19**: Map integration (external cemeteries on the map view)
- **Part 20**: External data import workflow
- **Parts 21-22**: Privacy review and API security controls
- **Part 23**: Audit logging for all external API calls
- **Part 24**: Cost control (response size limits, request budgets)
- **Part 25**: Data quality scoring
- **Part 26**: API health dashboard (`GET /api/external/health`)
- **Part 27**: GUI integration (ExternalSearchFragment with source badges)
- **Part 28**: Full documentation (21 docs)

### API Endpoints
- `GET /api/external/sources` — List available external sources
- `GET /api/external/health` — Health dashboard for all sources
- `POST /api/external/search` — Search a specific source
- `POST /api/external/search-all` — Search all sources in parallel
- `POST /api/external/ai-search` — AI-driven external search with source transparency
- `POST /api/external/import` — Import external record as GraveAtlas record
- `POST /api/external/privacy-review` — Privacy review for a record
- `GET /api/external/provenance/{id}` — Get provenance chain for a record

### Key Principles
- External records always display with **source badges** — they are never shown as native GraveAtlas records
- The AI never claims to have searched a source it did not actually query
- All external API calls are cached, rate-limited, and audited
- Privacy review redacts sensitive data before display
- License compliance is enforced per-source (CC-BY, ODbL, etc.)

## Tech Stack

- Java 17
- Android SDK 34 (min SDK 24)
- Material Components (Dark Gold theme)
- BottomNavigationView + BottomSheetDialog (NurOne-style UI)
- CardView, RecyclerView
- OkHttp (API client)
- Edge TTS (voice)

## Build

```bash
./gradlew assembleRelease
```

APK output: `app/build/outputs/apk/release/`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the mandatory branching workflow. All changes must go through a branch + CI pass before merging to `main`. This applies to AI agents too.
