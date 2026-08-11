# GraveAtlas Development Guide

## Prerequisites

- Node.js 18+ (for backend/tests)
- Android SDK (compileSdk 34, minSdk 24)
- Gradle 8.x (wrapper included)
- Cloudflare account (for Worker deployment)
- GitHub account with App creation access

## Project Structure

```
graveatlas/
├── app/                    # Android application
│   ├── build.gradle        # App-level build config
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/putraworks/graveatlas/
│       │   ├── MainActivity.java          # Chat interface
│       │   ├── MainNavActivity.java        # Navigation host
│       │   ├── auth/LoginActivity.java     # User login
│       │   ├── compass/                    # Compass + GPS
│       │   ├── data/                       # API client + models
│       │   └── ui/                         # Fragments (screens)
│       └── res/                            # Layouts, drawables, values
├── backend/
│   ├── package.json
│   ├── wrangler.toml                       # Cloudflare Worker config
│   └── src/
│       ├── index.js                        # Main API (60+ routes)
│       ├── github.js                       # GitHub App integration
│       ├── phase6a.js                      # User accounts + contributions
│       ├── phase7a.js                      # Advanced search + discovery
│       ├── countries.js                    # Country directory data
│       └── import-framework.js             # Open-data import pipeline
├── github/
│   ├── README.md                           # Public data repo README
│   └── schema/                            # JSON Schema files
│       ├── grave-schema.json
│       ├── cemetery-schema.json
│       ├── person-schema.json
│       ├── source-schema.json
│       └── correction-schema.json
├── scripts/
│   ├── validate-grave.js                   # Single record validation
│   └── check-duplicates.js                 # Duplicate ID detection
├── tests/
│   ├── backend.test.js                    # 346 tests
│   └── run.js                              # Test runner
├── docs/                                   # 48+ documentation files
├── .github/workflows/
│   ├── android-release.yml                 # Android CI/CD
│   └── data-validation.yml                 # Data validation CI
└── .env.example                            # Environment variable template
```

## Environment Setup

1. Copy `.env.example` to `.env` and fill in values
2. Set up GitHub App (see `docs/GITHUB-APP.md`)
3. Configure Cloudflare Worker secrets (see `docs/CLOUDFLARE.md`)

### Required Environment Variables

| Variable | Description |
|---|---|
| GITHUB_APP_ID | GitHub App ID |
| GITHUB_PRIVATE_KEY | GitHub App private key (PEM) |
| GITHUB_INSTALLATION_ID | GitHub App installation ID |
| GITHUB_REPO_OWNER | Repository owner (putraworks2026) |
| GITHUB_REPO_NAME | Data repository name (graveatlas-data) |
| ADMIN_TOKEN | Admin authentication token |
| ALLOWED_ORIGIN | CORS allowed origin |

## Running Tests

```bash
# Run all 346 backend tests
node tests/backend.test.js

# Validate a single grave record
node scripts/validate-grave.js path/to/record.json

# Check for duplicate IDs
node scripts/check-duplicates.js /path/to/data/repo
```

## Building the Android App

```bash
# Debug build
./gradlew assembleDebug

# Release build (requires signing config)
./gradlew assembleRelease
```

## Deploying the Backend

```bash
cd backend
npx wrangler deploy
```

## CI/CD

- **android-release.yml** — Builds APK on push to main, uploads artifact
- **data-validation.yml** — Validates data files on push to data repository

## Development Principles

1. **No secrets in source** — all credentials via environment variables
2. **Validate everything** — input validation on every endpoint
3. **Moderation first** — no auto-publication of user submissions
4. **Provenance required** — every factual record has source attribution
5. **Audit everything** — significant actions create audit events
6. **Least privilege** — GitHub App has only required permissions
7. **Server-side authority** — never trust client-side role checks
8. **No fabricated data** — missing values are null, never invented
