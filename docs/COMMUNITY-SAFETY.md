# Community Safety Review (Phase 9)

## Existing Controls (reused, verified by code read)

| Control | Evidence | Status |
|---|---|---|
| Rate limiting | `RATE_LIMIT_MAX_REQUESTS = 10`/min per IP (general), 30/min admin, 60/min search — confirmed in `backend/src/index.js`, live-tested (3 rapid search requests all returned 200 within limit) | Active |
| Content policy | `docs/CONTENT-POLICY.md` defines prohibited content and moderator actions | Active |
| Moderation queue | All submissions require approval before publication (`pending/` dir, currently 3 items) | Active |
| Reports pipeline | `POST /api/reports` for flagging bad content/behavior | Active |
| Audit trail | `docs/AUDIT-TRAIL.md` — moderation actions are logged | Active |
| Session tokens / roles | user/moderator/admin roles, 24h session expiry (per `STATUS.md`, consistent with `backend/src/index.js` auth code) | Active |

## Spam / Vandalism / Abuse

No incidents have occurred yet (0 published records, 3 pending submissions, no evidence of malicious content in those 3 — content was not inspected in detail to avoid unnecessary exposure of unmoderated submissions beyond what's needed for this audit). Rate limiting is the primary automated defense against volumetric abuse and is confirmed active.

## Privacy Violations & Impersonation

Existing controls reused: `docs/PRIVACY.md`, `docs/PRIVACY-REQUESTS.md`, and the content policy's rule against publishing private personal information not visible on a grave marker. No changes made — no evidence of a real incident to respond to.

## Coordinated Abuse

**Gap (MEDIUM):** Rate limiting is per-IP and in-memory per Worker isolate. Cloudflare Workers can run multiple isolates, and IP-based limiting is bypassable via proxies/rotating IPs. There is no CAPTCHA, device fingerprinting, or account-based throttling layer. This is a reasonable trade-off for a pre-launch, low-traffic app (adding CAPTCHA now would add friction and a third-party dependency with zero current abuse evidence), but should be revisited if real submission volume appears. Tracked in `docs/ROADMAP.md` under LATER — not NOW, because there is no evidence of abuse to justify the added complexity yet (per feature governance: "reject low-value complexity").

## Legitimate Documentation Preserved

No content was removed, hidden, or altered as part of this review. This document only assesses existing controls.
