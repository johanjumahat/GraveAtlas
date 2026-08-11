# Long-Term Data Preservation (Phase 9)

## Existing Mechanism (reused, verified live)

GraveAtlas already uses **Git itself as the preservation and versioning layer** for published data — no new system was built. Verified via live GitHub API query of `graveatlas-data`:

```
5248b95 submission: haha (pending review) — 2026-08-10T02:50:12Z
0f43a35 cleanup: post-deploy test — 2026-08-10T01:35:11Z
1bc2fba cemetery submission: Test Deploy Cemetery (pending review) — 2026-08-10T01:35:07Z
```

Every submission, correction, and moderation action is a Git commit, giving:
- Full change history per record (`git log --all -- <file>`, documented in `docs/RECOVERY.md`).
- Revertability without data loss (`git revert`, never force-push — existing policy in `docs/RECOVERY.md`).
- A natural audit trail that doubles as a preservation record.

## Schema Versioning

`docs/DATA-SCHEMA.md` and `docs/DATA-VERSIONING.md` (both pre-existing, Phase 3/5) already define record-level (`submittedAt`, `updatedAt`, `sourceRefs`, `verificationStatus`) and import-level (`import_id`, `source_id`, `dataset_version`) versioning. Current schema version: **1.0.0** (unchanged this phase — no schema migration was needed or performed).

## Release History

GitHub Releases + Git tags on the `GraveAtlas` app repo (via the `Android Release APK` workflow) already record every APK build with its version. Confirmed: 16 successful workflow runs in the last 30, each producing a versioned release artifact when successful.

## Gaps Identified

- **No off-GitHub backup exists.** Both the app code and the data live entirely on GitHub. If GitHub itself became unavailable, there is no independent copy. This is a real single point of failure, but building a second preservation location is a Phase 11+ concern (institutional/federated preservation) — Phase 9 scope is to document this honestly, not to build federation infrastructure prematurely.
- **No automated integrity check (e.g., periodic hash verification) exists yet.** Tracked in `docs/ROADMAP.md` under LATER — not urgent while the dataset is empty.

## What Was NOT Done

No new backup infrastructure, snapshot system, or preservation service was built in this phase. Git + GitHub already provides real version history and revertability, which is genuine (not fabricated) preservation capability appropriate for the project's current size.
