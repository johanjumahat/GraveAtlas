# GraveAtlas — Standing Instructions

## Core Rules

- Use zero credits for messages and integrations whenever possible.
- Use the local environment only unless approval is given.
- Use backend/local functions instead of AI services whenever possible.
- Ask for approval before using credits, cloud AI, external APIs, integrations, or services.
- Stop and ask for approval before any irreversible action.

## Security

- Never hardcode secrets in the repo.
- Store API keys and keystore passwords in environment variables or local.properties.
- local.properties is in .gitignore and must never be committed.
- Scrub files for API keys, secrets, credentials before saving or uploading.

## Repository

- Private repository.
- Keep repos private unless approval given.
- Enable GitHub Actions workflow write permissions.

## Documentation

Keep these files updated automatically:
- README.md
- STATUS.md
- CHANGELOG.md
- FEATURES.md
- STANDINGINSTRUCTIONS.md

## Android Build

- Configure GitHub Actions to build the APK automatically.
- Auto increment version code on each build.
- Keep application ID (`com.putraworks.graveatlas`) unchanged unless approved.
- Generate app icon if missing.
- Sign release builds.
- Upload build artifacts after every successful build.
- Provide latest signed APK download link.
- Archive previous builds.

## Execution Order

1. Read project files.
2. Sync and back up.
3. Resume from last checkpoint.
4. Complete one phase.
5. Validate and test.
6. Scrub secrets.
7. Update documentation.
8. Commit and push.
9. Upload build artifacts.
10. Record logs and status.
11. Report completion.
