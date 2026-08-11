# Community Feedback Routing (Phase 9)

## Current State

GraveAtlas has no live users yet (see `docs/POST-LAUNCH.md`), so there is no real feedback volume to report. This document defines the **structure** for routing feedback once the app is public, built on existing Phase 3/6 workflows (reports, moderation queue, audit log) rather than new infrastructure.

## Feedback Categories & Routing

| Category | Entry point | Routed to | Existing mechanism used |
|---|---|---|---|
| Bug report | In-app "Report a problem" (Settings) → GitHub issue via admin, or direct GitHub issue | Maintainer | GitHub Issues (repo already has issue tracking enabled; 0 open currently) |
| Incorrect data | Grave/cemetery detail → "Report" action | Moderation queue | `POST /api/reports` (existing, see `docs/MODERATION.md`) |
| Missing cemetery/record | "Add a Grave" / "Contribute" flow | Submission → moderation | `POST /api/submit` → `pending/` (existing) |
| Map issue | Report action on map pin | Moderation queue | Same reports pipeline, tagged `type: map` |
| Usability / feature request | No dedicated channel yet | — | **Gap identified below** |
| Privacy concern | Settings → Privacy, or direct contact | Admin (manual) | `docs/PRIVACY-REQUESTS.md` process |
| Security / abuse | No dedicated channel yet | — | **Gap identified below** |

## Gaps Found (evidence-based)

1. **No in-app feature-request or usability feedback channel.** Confirmed by reading `SettingsFragment.java` and `AboutFragment.java` — neither exposes a feedback form or contact link beyond the GitHub repo URLs.
2. **No dedicated security-disclosure contact.** No `SECURITY.md` disclosure email/contact was found distinct from the general `docs/SECURITY.md` policy doc (that doc describes internal controls, not an external reporting channel).

## Recommendation (NOW / NEXT — not built automatically)

- NOW: Add a "Send Feedback" action in Settings that opens a pre-filled GitHub issue (no new backend needed — reuses existing public repo).
- NEXT: Add a `SECURITY.md` at repo root with a private disclosure contact, per standard GitHub security-advisory practice.

Both are listed in `docs/ROADMAP.md`; neither has been implemented in this phase (feature governance requires evidence + explicit approval before building — see `docs/FEATURE-GOVERNANCE.md`).
