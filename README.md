# GraveAtlas

A worldwide cemetery & memorial locator for Android. Search, explore, and contribute grave records globally.

## Features

- **Search** — Find graves and cemeteries by name, location, or date
- **Map** — Interactive map view of nearby cemeteries
- **Add Grave** — Contribute new grave records with GPS coordinates
- **Compass + GPS** — Navigate to grave sites with built-in compass
- **AI Chat** — Ask questions about cemeteries and genealogy
- **My Contributions** — Track records you've submitted
- **Settings** — Configure API endpoint and preferences

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
