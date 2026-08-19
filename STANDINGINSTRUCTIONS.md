# GraveAtlas — Standing Instructions

## Core Rules

- Use zero credits for messages and integrations whenever possible.
- Use the local environment only unless approval is given.
- Do not use sub-agents.
- Use backend/local functions instead of AI services whenever possible, except AI image generation.
- Ask for approval before using credits, cloud AI, external APIs, integrations, or services.
- Stop and ask for approval before any irreversible action.

## Assets

- Download required assets once. Cache locally. Reuse whenever possible.
- Download again only if missing, outdated, or corrupted.
- Reuse existing code, libraries, templates, prompts, assets, and dependencies before creating new.
- Remove unused skills, agents, dependencies, and image generation tools except the selected one.

## Workflows

- Replace all "Invoke Superagent" steps with backend/local function calls.
- Pause scheduled workflows when credits are exhausted.
- Resume automatically after credits reset.
- Complete one task at a time.
- Stop on errors, record the reason, and resume from the last completed checkpoint.

## Security

- Never hardcode secrets in the repo.
- Store API keys and keystore passwords in environment variables or local.properties.
- `local.properties` is in .gitignore and must never be committed.
- Scrub files for API keys, secrets, credentials before saving or uploading.
- Remove or redact exposed secrets before saving or uploading.
- Report any security risks found.
- Store configuration in environment variables whenever possible.

## Repository

- Private repository. Keep repos private unless approval given.
- Enable GitHub Actions workflow write permissions.
- Use the specified repository name.

### Repository Structure
Create if missing:
- README.md
- STATUS.md
- CHANGELOG.md
- FEATURES.md
- STANDINGINSTRUCTIONS.md

Organize files into:
- Automations, Workflows, Scripts, Skills, Documents, Prompts, Templates
- Assets, Background Images, Configuration, Build Outputs, Archive, Logs

### Project Startup
Before starting work:
1. Read `PROJECT_RULES.md`, `INSTRUCTIONS.md`, `TASKS.md`
2. Read every file in `standards/`
3. Read `progress.md`
4. Skip completed or assigned tasks
5. Resume from the last completed checkpoint

### Synchronization
- Back up local files before major changes.
- Sync local files, GitHub, and Google Drive after every successful change.
- Keep local, GitHub, and Google Drive synchronized.
- Archive replaced files before overwriting.
- Never overwrite user files without a backup.
- Commit and push after every completed phase.
- Update GitHub and Google Drive when only one message credit remains.

## Documentation
Keep these files updated automatically:
- README.md
- STATUS.md
- CHANGELOG.md
- FEATURES.md
- STANDINGINSTRUCTIONS.md

## Manuscript Workflow
- Find the next missing `manuscript.md`.
- Generate it from the outline only.
- Update `progress.md` and `metadata.md`.
- Continue until all missing manuscripts are complete.

## Android Build
- Configure GitHub Actions to build the APK automatically.
- Auto-increment version code on each build.
- Keep application ID (`com.putraworks.graveatlas`) unchanged unless approved.
- Generate app icon if missing.
- Sign release builds.
- Upload build artifacts after every successful build.
- Provide latest signed APK download link.
- Archive previous builds.

## Validation
- Verify every completed task before marking complete.
- Run available tests before completion.
- Fix errors before continuing.
- Verify downloaded assets before caching.
- Verify file integrity after synchronization.

## Logging
- Log task start and completion.
- Log errors and warnings.
- Log security findings.
- Log backups and synchronization.
- Log created, modified, deleted, and archived files.

## Performance
- Prefer local execution.
- Minimize network requests.
- Reuse cached resources.
- Avoid duplicate processing.
- Remove temporary files after successful completion.
- Keep the workspace clean.

## Execution Order
1. Read project files.
2. Sync and back up.
3. Resume from last checkpoint.
4. Complete one phase.
5. Validate and test.
6. Scrub secrets.
7. Update documentation.
8. Commit and push.
9. Sync GitHub and Google Drive.
10. Upload build artifacts.
11. Record logs and status.
12. Report completion.

## Completion
- Ensure validation passes.
- Ensure no exposed secrets remain.
- Ensure no unresolved errors remain before finishing.
- Ensure documentation is current.
- Ensure GitHub and Google Drive are synchronized.
- Ensure backups are complete.

## GraveAtlas-Specific
- **Data repo:** `graveatlas-data` (consolidated, country-prefixed subdirectories)
- **Country prefix:** `sg/` is DEFAULT_COUNTRY, applied automatically by `prefixPath()` in `github.js`
- **Country-prefixed dirs:** graves, cemeteries, pending, photos, bukit-brown, schema, index, community-data, people
- **Operational dirs (not prefixed):** publication-queue, audit, users
- **Worker URL:** https://graveatlas.putraworks-2026.workers.dev
- **Google Drive sync:** Not needed for this project (confirmed 2026-08-19)
