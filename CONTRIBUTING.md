# Contributing to GraveAtlas

## Git Workflow — MANDATORY for ALL Contributors (Including AI Agents)

**Every change must follow this workflow. No exceptions.**

### 1. Create a Branch
Never commit directly to `main`. Always create a feature branch first:

```bash
git checkout -b <type>/<short-description>
```

Branch naming conventions:
- `feat/` — new feature (e.g., `feat/redesign-chat-layout`)
- `fix/` — bug fix (e.g., `fix/missing-import`)
- `chore/` — maintenance, config, docs (e.g., `chore/update-readme`)

### 2. Make Your Changes
Commit with clear, descriptive messages:

```bash
git commit -m "Redesign chat layout to dark gold theme"
```

### 3. Push the Branch

```bash
git push origin <branch-name>
```

### 4. Open a Pull Request
Open a PR against `main`. Include a description of what changed and why.

### 5. Wait for CI to Pass
The GitHub Actions workflow runs unit tests, lint, and builds the APK. **Do not merge until CI passes.**

If CI fails:
- Fix the issue on the same branch
- Push the fix
- Wait for CI to re-run

### 6. Merge to Main
Only after CI passes, merge the PR to `main`:

```bash
git checkout main
git pull origin main
git merge --no-ff <branch-name>
git push origin main
```

Or use the GitHub PR "Squash and merge" button.

### 7. Clean Up
Delete the feature branch after merging:

```bash
git branch -d <branch-name>
git push origin --delete <branch-name>
```

---

## AI Agent Instructions

If you are an AI agent working on this repository:

1. **Follow the branching workflow above.** Do not push to `main` directly.
2. **Wait for CI.** After pushing your branch, check the GitHub Actions status. Only merge when it passes.
3. **Self-review.** Check for compilation errors, lint issues, and missing imports before pushing.
4. **One PR per logical change.** Don't bundle unrelated changes.

---

## Build & Test

```bash
# Run unit tests
./gradlew test

# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Run lint
./gradlew lint
```

## Style Guide

- **Language:** Java 17
- **Min SDK:** 24, Target SDK:** 34
- **Theme:** Dark Gold (NurOne-style) — see `res/values/colors.xml`
- **Layouts:** Use XML layouts, not programmatic views
- **Icons:** Use vector drawables (`res/drawable/`), not PNGs
- **Colors:** Use color resources from `colors.xml`, never hardcode hex values in layouts
