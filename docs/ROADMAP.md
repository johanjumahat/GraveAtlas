# GraveAtlas Roadmap (Phase 9)

Based on evidence gathered during the Phase 9 audit (see `docs/POST-LAUNCH.md` and related Phase 9 docs). This roadmap reflects actual identified gaps, not aspirational features.

## NOW

- Fix malformed `themes.xml` build breakage — **already done** (PR #13, merged 2026-08-11, CI verified green).
- Correct `STATUS.md` test count: 370 → actual measured 415 passing, 0 failed.
- Correct "OSM map" wording in `STATUS.md`/architecture docs to reflect the actual `geo:` intent handoff implementation.
- Add an in-app "Send Feedback" action in Settings (opens a pre-filled GitHub issue — no new backend).
- Add a `SECURITY.md` with a private disclosure contact at the repo root.
- Investigate and reduce the ~40% CI failure rate measured over the last 30 Android Release APK workflow runs (see `docs/POST-LAUNCH.md`).

## NEXT

- Add a Cloudflare Worker staging environment (`[env.staging]` in `wrangler.toml`) to enable safe non-production load and migration testing.
- Apply the existing in-memory response cache (or build a lightweight rebuilt-on-publish search index) to the search path to prevent latency from growing with dataset size.
- Submit the app to Google Play Console (per `docs/STORE-METADATA.md` — release readiness already documented, submission itself not yet done).
- Enable Dependabot / vulnerability alerts on the GitHub repo (currently disabled — confirmed via API: "Dependabot alerts are disabled for this repository").

## LATER

- Revisit coordinated-abuse resistance (CAPTCHA, device-level throttling) — only if real abuse is observed post-launch. No evidence of abuse today.
- Historical trend view in the data-quality dashboard (needs real data volume first).
- Multi-region/CDN considerations — not remotely necessary at current (zero) traffic.

## DO NOT BUILD YET

- Any Phase 10+ capability (institutional accounts, knowledge graphs, federation, AI research assistants, public developer API) — none of these are justified while the dataset is empty and there is no real user base. Building them now would violate the "reject low-value complexity" and "do not build speculative features without evidence" governance rules.
- CAPTCHA/anti-bot tooling — no abuse evidence; would add friction and a third-party privacy surface for no measured benefit.

## Explicitly Not a Roadmap Item

Real-user analytics, retention metrics, and community-growth targets are not planned as fabricated placeholders. They will be defined once the app has actual users to measure — inventing them now would violate the "never fabricate metrics" rule.
