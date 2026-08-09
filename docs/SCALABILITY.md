# Scalability Plan

## Current Architecture

```
Android App (HTTPS)
    ↓
Cloudflare Worker (free tier)
    ↓
GitHub App (installation token)
    ↓
GitHub Repository (graveatlas-data)
```

## Scaling Limits of Current Architecture

The GitHub-backed architecture works well for:
- Small to medium datasets (< 50,000 records)
- Moderate traffic (< 100 requests/minute sustained)
- Community contributions with moderation

### Known Limitations

| Limit | Threshold | Impact |
|-------|-----------|--------|
| GitHub API rate limits | 5,000 requests/hour (installation token) | Search becomes slow or unavailable |
| Cloudflare Worker CPU | 10ms per request (free tier) | Complex search queries may timeout |
| Worker isolate memory | 128 MB | Large datasets can't be loaded in memory |
| GitHub Contents API | One file at a time | Listing graves requires N requests for N files |
| No full-text search index | — | Search scans files sequentially |

### When to Evolve

The current architecture should be evaluated when ANY of the following occur:

1. **Record count exceeds 50,000** — List/search operations become too slow
2. **Concurrent users exceed 100** — Worker isolates and GitHub API limits become bottlenecks
3. **Search latency exceeds 3 seconds** — User experience degrades
4. **Data import volume exceeds 1,000 records/batch** — GitHub API rate limits become a constraint
5. **Geographic queries (radius search) become common** — Sequential scanning is inefficient

## Future Architecture (NOT implemented — documented only)

```
Android App (HTTPS)
    ↓
Cloudflare Worker (API gateway)
    ↓
Search/Data API (Meilisearch, Typesense, or similar)
    ↓
Scalable database/index
    ↓
GitHub (archival/public data source)
```

### Migration Strategy (when needed)

1. **Phase A: Add read cache layer**
   - Deploy a search index alongside GitHub
   - Worker reads from index for search, falls back to GitHub for writes
   - GitHub remains the source of truth

2. **Phase B: Migrate writes to database**
   - Writes go to database, synced to GitHub for public archive
   - Search uses database index
   - GitHub becomes archival, not primary

3. **Phase C: Full migration**
   - All reads/writes via database
   - GitHub used only for public data archive and Git history
   - Worker becomes thin API proxy

### Candidate Technologies

| Component | Option | Cost | Notes |
|-----------|--------|------|-------|
| Search index | Meilisearch | Free (self-hosted) | Full-text, typo-tolerant, fast |
| Search index | Typesense | Free (self-hosted) | Similar to Meilisearch |
| Database | PostgreSQL | Free (self-hosted) | Relational, JSON support |
| Cache | Redis | Free (self-hosted) | Key-value cache |
| Hosting | Fly.io | Free tier | Container hosting |

## Principle

Do NOT migrate prematurely. The current architecture is free, simple, and sufficient for the current scale. Only migrate when the current architecture has demonstrably become a bottleneck, not when it theoretically might become one.

## Caching Strategy (current)

| Data | Cache TTL | Reason |
|------|-----------|--------|
| Country list | 10 minutes | Changes rarely |
| Region list | 5 minutes | Changes with new cemeteries |
| City list | 5 minutes | Changes with new cemeteries |
| Cemetery detail | 5 minutes | Changes with updates |
| Search results | Not cached | Fresh results needed |
| Grave detail | 5 minutes | Changes with corrections |
| Admin dashboard | Not cached | Real-time data needed |

Cache is in-memory per Worker isolate. Cache is cleared on deploy.
