# GraveAtlas Architecture

## Overview

GraveAtlas is a community-driven Android application for discovering, recording, searching, and maintaining public cemetery and grave information.

## System Architecture

```
Android App (Java)
    |
    | HTTPS (no secrets in app)
    v
Cloudflare Worker API
    |
    | GitHub App authentication (JWT + installation token)
    v
GitHub Repository (graveatlas-data)
    |
    +-- pending/      (unverified submissions, awaiting moderation)
    +-- graves/       (approved, published grave records)
    +-- cemeteries/   (cemetery location data)
    +-- photos/       (photo storage)
    +-- index/        (generated search indexes)
    +-- schema/        (JSON schema definitions)
    |
    v
GitHub Actions
    +-- validation (JSON schema, required fields, coordinate ranges)
    +-- duplicate detection (unique ID enforcement)
    +-- indexing (search index generation)
    +-- tests
    +-- consistency checks
```

## Key Design Principles

1. **No secrets in the Android app.** The app communicates only with the Cloudflare Worker over HTTPS. GitHub credentials live exclusively in the Worker environment.

2. **GitHub App, not personal token.** The backend authenticates to GitHub using a GitHub App with installation tokens, not a personal access token.

3. **Moderation before publication.** User submissions enter a `pending/` state. A moderator must approve before a record moves to `graves/` and becomes public.

4. **Modular architecture.** Each component (Android, backend, data, docs) is independently replaceable.

5. **Free/open-source infrastructure.** GitHub (free tier), Cloudflare Workers (free tier), Android (open-source SDK).

## Project Structure

```
GraveAtlas/
├── app/                    # Android application (Gradle standard layout)
│   └── src/main/java/com/putraworks/graveatlas/
│       ├── chat/           # AI chat feature (existing)
│       ├── compass/        # Compass + GPS feature
│       ├── data/
│       │   ├── api/        # API client for Cloudflare Worker
│       │   └── model/      # Data models (GraveRecord, GraveSubmission)
│       └── ui/
│           ├── home/        # Home screen
│           ├── search/     # Search screen
│           ├── map/        # Map screen
│           ├── grave/      # Grave detail screen (future)
│           ├── addgrave/  # Add grave form
│           ├── contribute/# User contributions
│           ├── settings/  # Settings
│           ├── about/     # About
│           └── navigation/# Navigation routes
├── backend/                # Cloudflare Worker backend
│   ├── src/index.js        # Main Worker code
│   ├── package.json
│   ├── wrangler.toml       # Cloudflare configuration
│   └── .env.example        # Placeholder environment config
├── github/                 # GitHub repo structure & schema
│   └── schema/
│       ├── grave-schema.json
│       └── cemetery-schema.json
├── docs/                   # All documentation
├── scripts/                # Utility scripts
├── tests/                  # Backend tests
└── .github/workflows/      # CI/CD + data validation
```

## Note on /app vs /android

The request specified `/android` as the directory name. The existing project uses `/app`, which is the standard Android Gradle structure. Renaming would break the Gradle build configuration. The project keeps `/app` for Android and uses `/backend`, `/github`, `/docs`, `/scripts`, `/tests` for other components.

## Phase 1 Status

### Implemented
- Project structure with all required directories
- Android placeholder screens (Home, Search, Map, Add Grave, Contribute, Settings, About)
- Data models (GraveRecord, GraveSubmission, SubmissionResponse)
- API client with all endpoints (health, graves CRUD, report)
- Cloudflare Worker with all API routes and validation
- JSON schemas for grave and cemetery records
- GitHub Actions data validation workflow
- 20 backend tests (all passing)
- Environment configuration templates
- Full documentation set

### Not Yet Implemented
- Fragment-based navigation host in MainActivity
- Map SDK integration (OSM or Google Maps)
- Photo capture and upload
- GitHub App authentication in backend
- GitHub API integration (read/write to repo)
- Moderation workflow (approve/reject)
- Rate limiting with Cloudflare KV
- Search index generation
- User authentication

### External Configuration Required
- Cloudflare Worker deployment
- GitHub App creation and private key
- GitHub repository: graveatlas-data
- Cloudflare secrets (GITHUB_APP_ID, GITHUB_PRIVATE_KEY, etc.)
