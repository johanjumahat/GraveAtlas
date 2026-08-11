# Feature Governance Log (Phase 9)

Per Phase 9 rules, every proposed feature must be evaluated before being built. No speculative features were built in this phase. This log records the features *identified* during the Phase 9 audit (from `docs/COMMUNITY-FEEDBACK.md`, `docs/SEARCH-QUALITY.md`, `docs/SCALING.md`, `docs/COMMUNITY-SAFETY.md`) and their governance evaluation.

| Feature | User problem | Evidence | Benefit | Complexity | Security impact | Privacy impact | Cost | Maintenance | Compatibility | Decision |
|---|---|---|---|---|---|---|---|---|---|---|
| In-app "Send Feedback" (Settings) | No usability/feature-request channel exists | Code read of `SettingsFragment.java`/`AboutFragment.java` confirms gap | Captures feedback before public launch | Low — opens a pre-filled GitHub issue URL, no new backend | None | None (no PII collected beyond what user types into GitHub) | Free | Low | No breaking changes | **Approved for NOW** |
| `SECURITY.md` disclosure contact | No private security-reporting channel | Confirmed absent from repo root | Enables responsible disclosure before launch | Trivial — a markdown file | Positive (encourages private disclosure over public issues) | None | Free | Trivial | None | **Approved for NOW** |
| Cloudflare Worker staging environment | Cannot safely load/migration-test | `wrangler.toml` has one environment only | Enables future safe testing | Low-medium — one more `[env.staging]` block + separate secrets | None (isolated from prod) | None | Free (2nd Worker on free tier) | Low | None | **Approved for NEXT** |
| Search result caching / index | Search latency (0.4-0.65s) will scale poorly | Live latency measurement + code read of `handleSearch()` | Faster search as dataset grows | Medium — needs cache invalidation on publish | Low (must not cache stale moderation state) | None | Free | Medium | None | **Approved for NEXT** (no urgency — 0 records today) |
| CAPTCHA / device fingerprinting on submissions | Coordinated abuse resistance | No incidents observed; theoretical gap only | Would reduce abuse risk at scale | Medium-high — third-party dependency, added friction | Positive if abuse occurs | Adds a third-party data flow (privacy trade-off) | Possible cost depending on provider | Medium | Adds external dependency | **Rejected for now — DO NOT BUILD YET.** No abuse evidence exists; added complexity and a new third-party privacy surface is not justified pre-launch. Revisit if real abuse is observed. |
| Fix "OSM map" wording in docs | Documentation says OSM map; code uses geo-intents | Code read of `MapFragment.java`, no map SDK in `build.gradle` | Documentation accuracy | Trivial | None | None | Free | Trivial | None | **Approved for NOW** |
| Correct `STATUS.md` test count (370 → 415) | Stale metric in project status doc | Re-ran `tests/run.js`, measured 415 passing | Documentation accuracy | Trivial | None | None | Free | Trivial | None | **Approved for NOW** |

## Experiments

No experiments were run in this phase — there is no live traffic to experiment against. Any future experiment must define purpose, limited scope, measurable success criteria, review, and rollback before starting (per Phase 9 rules); none currently qualify.
