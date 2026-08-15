# GraveAtlas — Features

## Chat

- **Text Chat** — Type and send messages to AI
- **Multi-Provider** — 9 AI providers with dozens of models
- **Auto-Fallback** — Automatically switches to working models if the selected one fails
- **Model Testing** — "Test All" button checks which models are online
- **API Key Management** — Per-provider API key storage via menu
- **Chat History** — Messages persist across app restarts
- **Copy Messages** — Long-press any message to copy

## Voice

- **Voice Conversation Mode** — Tap mic, speak, AI responds with voice + text, auto-listens again
- **Speech-to-Text** — Built-in Android speech recognition
- **Text-to-Speech** — AI responses read aloud with selectable voices
- **Voice Selection** — Long-press speaker icon to pick from device TTS voices
- **Speaker Toggle** — Toggle read-aloud on/off

## Providers (all free tiers)

1. **Pollinations** — No API key needed, works out of the box
2. **Groq** — Ultra-fast inference, generous free tier
3. **Google Gemini** — 15 req/min free
4. **OpenRouter** — Rotating free models
5. **Cerebras** — Fastest inference
6. **Mistral AI** — European models
7. **DeepSeek** — Strong reasoning
8. **Together AI** — Many open-source models
9. **SambaNova** — Fast open-source models

## Discovery & Search (Phase 4-5)

- **Unified Search** — Find graves and cemeteries by name, location, or date
- **Search Ranking** — Exact > normalized > prefix > partial > alt name
- **Unicode Search** — Arabic, Chinese, Japanese, Cyrillic, Hebrew, and more
- **Map** — Interactive map view of cemeteries
- **Country Discovery** (Phase 5) — Browse 177 countries with Unicode names, local names, and cemetery counts
- **Geographic Hierarchy** — Country → Region → City → Cemetery → Grave → Person

## Contribution

- **Add Grave** — Contribute new grave records with GPS coordinates
- **Add Cemetery** — Submit new cemeteries with international fields
- **Corrections** — Submit corrections to existing records
- **My Contributions** — Track records you've submitted
- **Offline** — Queue submissions when offline, auto-retry when connected
- **Idempotency** — Duplicate submissions are safely detected and blocked

## Data Quality & Governance (Phase 4.5)

- **Moderation Queue** — All submissions enter pending state, never auto-published
- **Audit Trail** — Full audit trail for every entity (10 audit actions)
- **Contributor Trust** — Track submission acceptance/rejection rates
- **Report System** — Structured reports (8 types) with lifecycle management
- **Data Quality Engine** — 18 checks (11 ERROR, 6 WARNING, 1 INFO) for data integrity
- **Status Transitions** — Server-enforced state machine for submissions, corrections, reports
- **Soft Delete & Restoration** — Entity lifecycle with recovery
- **Admin Dashboard** — Queue overview, privacy reports, contributor stats

## Data Imports (Phase 5)

- **Source Registry** — Register data sources with license and attribution tracking
- **License Verification** — Automatic license checking (CC0, CC-BY, ODbL, Public Domain, PDDL)
- **Import Framework** — Create, validate, approve, reject, and rollback imports
- **Import Validation** — Record-level validation with path traversal protection
- **Duplicate Detection** — 4-level classification (EXACT, HIGH_CONFIDENCE, POSSIBLE, NEW)
- **Import Idempotency** — Prevent duplicate imports of same source + version
- **Import Rollback** — Remove all records from a specific import safely
- **Data Quality Scoring** — Per-record quality score based on completeness
- **Safe Update Classification** — Detect NEW, UNCHANGED, UPDATED, POSSIBLE_CONFLICT

## Navigation

- **Compass + GPS** — Navigate to grave sites with built-in compass
- **Bottom Navigation** — Home, Map, Search, More
- **Bottom Sheets** — NurOne-style detail sheets

## Settings

- **API Endpoint** — Configure backend API URL
- **Live Version** — App version + build number on About screen
- **Google Login** — Optional, app works without signing in

## Tech Stack

- Java 17, Android SDK 34 (min SDK 24)
- Material Components (Dark Gold theme)
- OkHttp (API client)
- Edge TTS (voice)
- Cloudflare Worker backend
- GitHub App authentication

## Phase 6A — Community Accounts & Contributions

- **User Accounts** — Register with display name, track contributions, account states (ACTIVE/SUSPENDED/DEACTIVATED)
- **User Profiles** — Public profile with display name, bio, contribution count, accepted count, joined date
- **Contribution Center** — Submit cemeteries, graves/memorials, corrections, photos, and reports
- **Submission Workflow** — DRAFT → PENDING_REVIEW → CHANGES_REQUESTED → APPROVED/REJECTED/CANCELLED
- **Drafts** — Save incomplete contributions, continue editing, delete, or submit when ready
- **Contribution History** — Paginated list of own submissions with type and status filters
- **Contribution Details** — Full submission data with reviewer feedback
- **Cancel Contributions** — Users can cancel pending submissions
- **Duplicate Detection** — 4-level check (NO_MATCH, POSSIBLE_DUPLICATE, HIGH_CONFIDENCE_MATCH, EXACT_DUPLICATE) before submitting
- **Photo Contributions** — Submit photos with rights declaration (OWN_WORK, PERMISSION_GRANTED, OPEN_LICENSE, PUBLIC_DOMAIN, UNKNOWN)
- **Authorization** — Users can only access their own contributions and drafts
- **Audit Events** — 9 action types tracked for all contribution operations
- **Rate Limiting** — 30 actions per user per hour
- **18 New API Endpoints** — User, contribution, draft, and photo operations

## Phase 7A — Advanced Search & Global Discovery

- **Global Search** — Unified search across people, cemeteries, memorials, and locations
- **Categorized Results** — Results grouped by category with counts
- **Person Search** — Full name, partial name, alt names, birth/death year, cemetery, country
- **Cemetery Search** — Name, alt names, city, region, country
- **Location Search** — Countries, regions, cities with cemetery counts
- **Name Normalization** — Unicode NFD, accent stripping, preserves source data
- **Country Directory** — Worldwide with actual cemetery and memorial counts
- **Region Directory** — Country → Regions with cemetery counts
- **City Directory** — Country → Region → Cities with coordinates
- **Browse by Location** — Filter cemeteries by geographic hierarchy
- **Advanced Filters** — Country, region, city, birth year, death year, year range, record type
- **Date Search** — Exact year, year range, handles incomplete dates
- **Sorting** — Relevance, name, date, distance (haversine)
- **Server-Side Pagination** — Android never downloads full dataset
- **Search Caching** — 5-min results, 10-min directories
- **Related Records** — Nearby cemeteries, same-cemetery people, same-region cemeteries
- **Internationalization** — Full Unicode support (Arabic, Chinese, Japanese, Korean, Thai, Hebrew, Cyrillic)
- **11 New API Endpoints** — Global search, person/cemetery/location search, directories, browse, related

## Phase 7B — Advanced Maps, Nearby & Saved Places

- **Nearby Discovery** — Find cemeteries and memorials near your location
- **Distance Filters** — 1km, 5km, 10km, 25km radius selection
- **Location Privacy** — One-shot GPS request, no continuous tracking
- **Directions** — Open results in device's native map/navigation app via geo: intent
- **Coordinate Accuracy** — Approximate vs exact coordinate labeling
- **Saved Items** — Bookmark cemeteries, people, memorials, graves (max 500)
- **Recently Viewed** — Local browsing history (max 20, never uploaded)
- **Sharing** — Shareable HTTPS URLs for public records
- **Deep Linking** — graveatlas:// scheme + HTTPS app links with auto-verification
- **Recommendations** — Deterministic geographic proximity (haversine, no AI fabrication)
- **Map Filters** — Cemetery, memorial, country, region, distance
- **Offline Maps** — Graceful degradation when no network
- **Location Permission** — On-demand only, app works without it
- **Data Quality** — Invalid/null coordinates filtered from map display

## Phase 16.1 — AI Database Integration (RAG)

### AI Chat — Real Database Access
- **RAG Interceptor** — Detects search intent in user chat messages and queries the GraveAtlas API for real records before sending to the AI
- **Context Injection** — Search results injected as `[DATABASE CONTEXT]` into the AI prompt, with instruction to cite real record IDs
- **Search Intent Detection** — 20+ trigger phrases ("find", "search for", "show me", "where is", "who is buried", etc.) with non-search filtering for meta-questions
- **Graceful Degradation** — If API search fails or times out, AI proceeds without data context
- **Security** — Only uses public search endpoint; no admin access, no write operations, no secrets

### Evidence Badges in Search
- Search result cards now display evidence status badges
- 6 evidence categories: KNOWN, SOURCE-BACKED, INFERRED, UNCERTAIN, CONFLICTING, NEEDS VERIFICATION
- Badges derived from record verification status field
- Color-coded pill design matching evidence system palette

## Official Data Source Research (2026-08-15)

### Tier 1 — Ready to integrate
- **Singapore NEA data.gov.sg** — Active cemeteries GeoJSON, After Death Facilities, Columbaria. Singapore Open Data Licence. API: `api-open.data.gov.sg`
- **OpenStreetMap** — Cemetery boundaries worldwide via Overpass API. ODbL licence.

### Tier 2 — Potential with partnership
- **BillionGraves** — 300K+ GPS-linked cemeteries, developer notes suggest API access possible
- **UK local councils** — Some publish burial records as open data (varies by council)

### Tier 3 — Reference only
- Interment.net (25M records, free, no API)
- US NCA Gravesite Locator (web search only)
- FamilySearch Wiki (finding aids)

### Not recommended
- FindAGrave (proprietary, Ancestry.com, no API, no reuse rights)
- MUIS/Pusara.sg (no API, phone-based search)

### Import workflow for official data
All official data imports follow the existing framework: Source Registration → License Check → Validation → Duplicate Detection → Moderation → Publication → Import History

## NEA Singapore Cemetery Importer

### Source
- **Provider:** National Environment Agency (NEA), Singapore
- **Dataset:** Active Cemeteries (GEOJSON) — `d_4a9b83ee745c10c3aa5829fb80e09d9c`
- **API:** `https://api-open.data.gov.sg/v1/public/api/datasets/{dataset_id}/poll-download`
- **License:** Singapore Open Data Licence (free, commercial use OK)
- **Attribution:** National Environment Agency. (2020). Active Cemeteries (GEOJSON) [Dataset]. data.gov.sg.

### Coverage
- 9 active cemeteries in Singapore's Choa Chu Kang complex:
  - Ahmadiyya, Bahai, Chinese, Christian, Hindu, Jewish, Muslim, Parsi, Lawn
- Cemetery locations only (no individual grave records)

### Pipeline
1. Fetch GeoJSON from data.gov.sg API
2. License check (Singapore Open Data Licence)
3. Source registration in import framework
4. Format detection (GeoJSON)
5. Normalization (NEA features → GraveAtlas cemetery records)
6. Validation (coordinates, required fields, data integrity)
7. Duplicate detection (against existing records)
8. Quality scoring (government source = high quality)
9. Output: PENDING_APPROVAL (awaits human moderation)

### Security
- All data treated as untrusted input
- File size limits enforced (10 MB max)
- No auto-publish — human moderation required
- No secrets, tokens, or credentials in importer code
- Never executes imported content as code

## OpenStreetMap Cemetery Importer

### Source
- **Provider:** OpenStreetMap contributors worldwide
- **API:** Overpass API (3 endpoints with fallback: overpass-api.de, kumi.systems, openstreetmap.fr)
- **License:** Open Database License (ODbL)
- **Attribution:** © OpenStreetMap contributors (ODbL)

### Coverage
- Worldwide cemetery data (filterable by country via ISO 3166-1 alpha-2 code)
- OSM tags supported: landuse=cemetery, historic=cemetery, amenity=grave_yard, cemetery=grave
- OSM element types: node (point), way (polygon/boundary), relation (multipolygon)
- Localized name extraction (English, French, German, Spanish, Chinese, Japanese + alt_name, loc_name)
- Extracts: address, religion, denomination, operator, establishment/closure dates, Wikidata/Wikipedia refs

### Pipeline
1. Build Overpass QL query (country filter, tag filters, timeout)
2. Fetch from Overpass API (3 endpoints with automatic fallback)
3. License check (ODbL — recognized by import framework)
4. Source registration
5. Coordinate extraction (node: direct, way/relation: centroid)
6. Normalization (OSM elements → GraveAtlas cemetery records)
7. Validation (coordinates, required fields, data integrity)
8. Duplicate detection (against existing records)
9. Quality scoring (community-verified open data)
10. Output: PENDING_APPROVAL (awaits human moderation)

### Security
- All data treated as untrusted input
- File size limits enforced (10 MB max)
- Record count limits enforced (10,000 max)
- Rate limiting (5s minimum between endpoint attempts)
- No auto-publish — human moderation required
- No secrets, tokens, or credentials
- Never executes imported content as code
- Proper User-Agent header for OSM community etiquette

### Verification Status
- OSM records: `source-backed` (community-verified, ODbL licensed)
- NEA records: `verified` (government official data)

## Admin Import API Endpoints

All endpoints require admin authentication (Bearer token).

### Available Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/imports/sources | List available import sources |
| POST | /api/admin/imports/trigger | Trigger a new import (source + options) |
| GET | /api/admin/imports | List all import jobs |
| GET | /api/admin/imports/:importId | Get full import report |
| POST | /api/admin/imports/:importId/approve | Approve & publish records |
| POST | /api/admin/imports/:importId/reject | Reject import (requires reason) |

### Import Lifecycle

```
Trigger → Fetch → Process → Store (pending/imports/) → [PENDING_APPROVAL]
                                                       ↓
                                              Admin reviews report
                                                       ↓
                                              ┌──── approve ────┐
                                              │                │
                                         COMPLETED          PARTIAL
                                         (all published)   (some failed)
                                              │
                                              └──── reject ──── REJECTED (no publish)
```

### State Machine

```
CREATED → LICENSE_REVIEW → VALIDATING → DUPLICATE_CHECK → PENDING_APPROVAL
                                                        ↓
                                               APPROVED → IMPORTING → COMPLETED
                                                        ↓                ↗
                                                  REJECTED      PARTIAL → ROLLED_BACK
                                                                ↘
                                                               FAILED → ROLLED_BACK
```

### Available Sources

1. **nea-singapore** — 9 Singapore cemeteries from data.gov.sg (no options needed)
2. **osm-overpass** — Worldwide cemeteries from OpenStreetMap (optional: area, includeHistoric, includeGraveYard, includeGraves)

### Audit Trail

All import actions are logged to `audit/` in the GitHub data repo:
- IMPORT_TRIGGERED — when an import is started
- IMPORT_FAILED — when an import fails
- IMPORT_APPROVED — when an admin approves (includes published count)
- IMPORT_REJECTED — when an admin rejects (includes reason)

### Security

- All endpoints admin-protected (Bearer token, constant-time comparison)
- Import IDs sanitized to prevent path traversal
- File size limits enforced (10 MB max for import reports)
- No auto-publish — PENDING_APPROVAL is always set first
- GitHub configuration checked before any operation
- OSM area codes validated (ISO 3166-1 alpha-2 format)

## AI Auto-Moderation

No human admin required — the AI moderator reviews and decides on every import automatically.

### How It Works

1. Import is triggered (NEA or OSM)
2. Data is fetched, normalized, validated, deduped, quality-scored
3. **AI moderator reviews the report** against 7 automated checks
4. Decision is made: APPROVED or REJECTED
5. If approved → records are published to the GitHub data repo immediately
6. Every decision is logged to the audit trail with full reasoning

### Decision Criteria

| Check | Auto-Approve | Auto-Reject |
|-------|-------------|-------------|
| License | Recognized (ODbL, CC0, CC-BY, etc.) | Unrecognized or missing |
| Attribution | Present and non-empty | Missing |
| Valid Records | ≥ 1 | 0 |
| Error Rate | < 30% | ≥ 30% |
| Quality Score | ≥ 3.0 (borderline 3.0-4.0 auto-approved) | < 3.0 |
| Duplicate Rate | < 100% | 100% (all duplicates) |
| Coordinates | At least some records have valid coords | All missing coords |

### Audit Trail

Every AI decision is logged with:
- Decision (APPROVED/REJECTED)
- Reasoning (which checks passed/failed)
- Quality score, error rate, duplicate count
- Moderation config used
- Timestamp
- `moderatedBy: ai-auto-moderator`

### Manual Override

Manual approve/reject endpoints remain available for edge cases, but the normal flow is fully autonomous.

## Google Authentication & Abuse Prevention

Users must log in with a Google account before they can submit records.

### How It Works

1. Android app uses GoogleSignIn to get an ID token
2. App sends token to `POST /api/auth/google/verify`
3. Worker verifies token with Google's tokeninfo endpoint (server-side)
4. Worker creates or updates user record with Google identity
5. Worker returns a session token (valid for 7 days)
6. All submission endpoints require the session token

### What Gets Logged (Every Submission)

| Field | Source | Purpose |
|-------|--------|---------|
| userId | GraveAtlas internal | Identify user |
| googleSub | Google account ID (stable) | Prevent multi-account abuse |
| clientIp | CF-Connecting-IP | IP-based rate limiting & tracking |
| userAgent | User-Agent header | Device/client identification |
| contributionId | System-generated | Link to specific submission |
| contributionType | Request | Category of submission |
| timestamp | Server clock | Audit trail |
| success | Server | Whether submission succeeded |

### Abuse Prevention Layers

1. **Google account verification** — Must have a valid, email-verified Google account
2. **Per-user rate limiting** — Already exists (Phase 6A, 10 requests/minute)
3. **Per-IP rate limiting** — Already exists (main index.js, 10 requests/minute)
4. **Banned accounts** — Admin can ban by Google sub; banned accounts cannot re-register
5. **Audit trail** — Every submission logged with full identity metadata
6. **Submission metadata** — Every record stores who submitted it (user, Google sub, IP, user-agent)

### Admin Abuse Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/abuse/log | Get submission audit log (filter by user, Google sub, IP) |
| GET | /api/admin/abuse/stats | Get abuse statistics |
| POST | /api/admin/abuse/ban/:sub | Ban a Google account (requires reason) |
