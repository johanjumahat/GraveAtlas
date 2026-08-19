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
- **30 AI Feature Phases** — Cemetery intelligence, anomaly detection, enrichment, confidence scoring, predictive insights, natural language queries, smart summaries, cross-reference engine, and more

## Architecture

### Data Model (Country-Prefixed)
GraveAtlas uses a consolidated data repository (`graveatlas-data`) with country-prefixed
subdirectories. The `prefixPath()` function in `github.js` automatically prepends the
default country code (`sg/`) to all data paths.

```
graveatlas-data/
├── sg/                    ← Singapore (active)
│   ├── cemeteries/        ← Cemetery JSON files
│   ├── graves/            ← Grave record JSON files
│   ├── pending/           ← Pending submissions
│   ├── photos/            ← Photo references
│   ├── schema/            ← Schema definitions
│   ├── bukit-brown/       ← Bukit Brown connector data
│   ├── community-data/    ← Community-contributed records
│   └── ...
├── ph/  vn/  th/  id/  my/  ← Future country data
├── old/                   ← Original root content (archived)
├── publication-queue/     ← Operational (not prefixed)
├── audit/                 ← Operational (not prefixed)
└── users/                 ← Operational (not prefixed)
```

### Backend
- **Cloudflare Worker** — https://graveatlas.putraworks-2026.workers.dev
- **Version:** 7.2.31
- **Auth:** GitHub App (JWT + installation token), admin token for write endpoints
- **Rate limiting:** 10/min default, 30/min admin, 60/min search
- **CORS:** Configured for Android app + web access

### API Endpoints
- `GET /api/health` — Health check
- `GET /api/cemeteries` — List all cemeteries
- `GET /api/cemeteries/:id` — Get single cemetery
- `GET /api/cemeteries/:id/stats` — Cemetery statistics
- `GET /api/cemeteries/:id/summary` — Auto-generated summary
- `GET /api/cemeteries/:id/health` — Cemetery health score
- `GET /api/cemeteries/:id/recommendations` — Smart recommendations
- `GET /api/cemeteries/:id/anomalies` — Anomaly detection scan
- `GET /api/cemeteries/:id/duplicates` — Duplicate person detection
- `GET /api/cemeteries/:id/connections` — Family connection network
- `GET /api/graves` — List grave records
- `GET /api/search?q=` — Search graves and cemeteries
- `GET /api/timeline` — Chronological timeline view
- `GET /api/map/query` — AI map queries
- `POST /api/admin/cemeteries` — Create cemetery (admin)
- `POST /api/admin/graves` — Create grave record (admin)
- `GET /api/external/sources` — List external data sources
- `POST /api/external/search-all` — Search all external sources
- `GET /api/external/sg/datasets` — Singapore government datasets
- `POST /api/external/ai-search` — AI-driven external search

### External Cemetery API Integration
GraveAtlas integrates with external cemetery and burial record sources:
- **OpenStreetMap (Overpass API)** — Cemetery locations worldwide
- **Wikidata SPARQL** — Cemetery metadata and historical info
- **data.gov.sg** — Singapore government open data (NEA, NHB)
- **Bukit Brown Cemetery** — Community-maintained burial register
- **GitHub Community Data** — Community-contributed records (CC BY-SA 4.0)

### Key Principles
- External records always display with **source badges** — never shown as native records
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
- Cloudflare Workers (backend)

## Build

```bash
./gradlew assembleRelease
```

APK output: `app/build/outputs/apk/release/`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the mandatory branching workflow. All changes must go through a branch + CI pass before merging to `main`. This applies to AI agents too.
