# GraveAtlas v7.1.4 — Release Notes

## What's New

### Phase 9 Post-Launch Improvements
- **Search caching** — Search queries are now cached for 5 minutes, reducing response time for repeated searches
- **Send Feedback** — New "Send Feedback" button in Settings opens a pre-filled GitHub issue for bug reports and feature suggestions
- **Security hardening** — Dependabot vulnerability alerts and automated security fixes enabled on the repository
- **Staging environment** — Separate staging Worker deployment available for safe load testing

### Improvements
- Dynamic version display on About screen
- Corrected architecture documentation (geo: intent handoff, not OSM)
- SECURITY.md with private vulnerability disclosure process
- Structured bug report template for GitHub issues

### Technical
- 415 tests passing (0 failures)
- Backend: search response cache with invalidation on publish
- Infrastructure: Cloudflare Worker staging environment config
- CI: GitHub Actions release APK workflow verified
