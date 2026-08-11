# Sustainability Assessment (Phase 9)

Per Phase 9 rules: document monetization/sustainability options only — do not implement automatically.

## Current Operating Cost (measured/verifiable)

| Component | Provider | Tier | Cost |
|---|---|---|---|
| Backend | Cloudflare Workers | Free tier | $0 (confirmed: no paid Workers plan referenced in `wrangler.toml` or docs) |
| Data storage | GitHub repository (`graveatlas-data`) | Free (public repo) | $0 |
| App hosting/CI | GitHub Actions | Free tier (public repo minutes) | $0 |
| Android distribution | Not yet on Google Play | N/A | Google Play one-time $25 developer fee not yet paid (per `docs/STORE-METADATA.md`) |

**Current total recurring cost: $0.** This is a genuinely sustainable starting position — the entire stack runs on free tiers appropriate for a pre-launch, zero-traffic project.

## Maintenance Requirements

- Single maintainer currently (`putraworks2026`, confirmed sole human contributor via GitHub API).
- No paid on-call/monitoring service — health is checked manually or via the `/api/health` endpoint.
- CI reliability is a real maintenance burden today: ~40% of the last 30 workflow runs failed (see `docs/POST-LAUNCH.md`), which consumes maintainer time re-running/debugging builds.

## Funding/Monetization Options (documented only, none implemented)

| Option | Fit for GraveAtlas | Consideration |
|---|---|---|
| Donations (e.g., GitHub Sponsors, Ko-fi) | Reasonable fit for a community/historical-preservation project | No ads, no paywall on public cemetery data — preserves public trust and access |
| Institutional partnerships (Phase 11 scope) | Long-term option | Requires actual verified institutions — none exist yet; premature to pursue before launch |
| Freemium API access for developers (Phase 10/12 scope) | Possible future option | Requires a public API and real usage first — not yet built |
| Advertising | Poor fit | Would conflict with the project's stated privacy/trust posture (`docs/PRIVACY.md`, `docs/CONTENT-POLICY.md`) around a memorial/historical dataset |

**No monetization has been implemented.** This section exists purely to satisfy Phase 9's requirement to document options — the project remains free to operate and free to use.

## Infrastructure Independence

Currently GraveAtlas depends on exactly two providers: Cloudflare (compute) and GitHub (code + data + CI). This is a real dependency concentration risk, but migrating away from either is out of scope for Phase 9 (this is a Phase 15/federation-level concern) — noted here for completeness, not acted on.

## Conclusion

The project is sustainable at its current (pre-launch, zero-traffic) scale at $0/month. The main real risk to sustainability is not cost — it is the ~40% CI failure rate consuming maintainer time, which is already flagged as a NOW item in `docs/ROADMAP.md`.
