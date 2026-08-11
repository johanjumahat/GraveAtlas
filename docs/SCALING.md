# Scaling Assessment (Phase 9)

Builds on the existing `docs/SCALABILITY.md` (Phase 5/7 architecture plan). This document adds **measured** current-state evidence rather than re-describing the architecture.

## Current Load (measured, 2026-08-11)

| Metric | Value | Source |
|---|---|---|
| Published records | 0 cemeteries, 0 graves | Live `graveatlas-data` repo |
| Backend dependencies | 0 runtime deps (`"dependencies": {}` in `backend/package.json`) | package.json |
| Worker platform | Cloudflare Workers free tier | `docs/CLOUDFLARE.md` |
| GitHub API rate limit exposure | Uses GitHub App installation token (higher rate limit than PAT) | `docs/GITHUB-APP.md` |

At current volume (zero production records, zero real traffic), the architecture is nowhere near its documented limits (`docs/SCALABILITY.md` cites <50,000 records and <100 req/min sustained as the GitHub-backed design envelope). There is no evidence of any scaling pressure today.

## Non-Production Testing Performed

None performed in this phase. The rules for Phase 9 explicitly prohibit uncontrolled production load testing, and there is no staging environment separate from the single deployed Worker to safely load-test against. This is itself a gap:

**Finding (MEDIUM):** No staging/non-production Cloudflare Worker environment exists — `wrangler.toml` defines a single environment. Load and migration testing cannot be performed safely without risking the only deployed instance. Recommended for `docs/ROADMAP.md` NEXT: add a `[env.staging]` block in `wrangler.toml` (Cloudflare Workers supports this at no additional cost on the free tier for a second Worker).

## Scaling Triggers to Watch (not yet reached)

Reusing the thresholds already documented in `docs/SCALABILITY.md`:
- Dataset approaching 50,000 records → consider a proper database (e.g., D1) instead of GitHub-file storage.
- Sustained >100 req/min → evaluate Cloudflare KV/cache in front of the GitHub read path.

Neither threshold is remotely close to being hit (current dataset: 0 records).

## Conclusion

No scaling work is justified right now — the honest, evidence-based conclusion is that GraveAtlas is pre-launch and scaling concerns are premature. The one actionable item is adding a staging environment before any load or migration testing is attempted (tracked in `docs/ROADMAP.md`).
