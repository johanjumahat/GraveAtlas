# GraveAtlas — Status

**Current Version:** 1.0.0
**Status:** Initial release
**Last Updated:** 2026-08-09

## Build Status

- [x] Project structure created
- [x] Chat module ported from AI Signal Pro
- [x] Trading features removed
- [x] AI chat as main page
- [x] Multi-provider support
- [x] Voice conversation mode
- [x] Text-to-speech
- [x] Chat history persistence
- [x] GitHub Actions CI/CD pipeline configured
- [x] Automatic versioning (version.properties + run_number)
- [x] Automatic release APK builds on push to main
- [x] Automatic GitHub Release creation with APK + SHA-256
- [ ] Production release signing (needs GitHub Secrets: KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD)

## CI/CD Pipeline

`.github/workflows/android-release.yml` — triggers on push to `main` and `workflow_dispatch`.

Pipeline: checkout → JDK 17 → Android SDK → read version → set up signing → validate → test → lint → build release APK → verify APK → rename → SHA-256 → upload artifact → GitHub Release → bump version.

If signing secrets are not configured, builds use debug signing and the release notes will indicate this.

## Notes

- Pollinations works out of the box with no API key
- All other providers require free API keys from their respective platforms
- App ID: `com.putraworks.graveatlas`
- Repo: https://github.com/putraworks2026/GraveAtlas (private)
