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
