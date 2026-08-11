# Evidence-First Results — Phase 16

**Status:** IMPLEMENTED
**Date:** 2026-08-11

## Evidence Categories

| Category | Color | Description |
|---|---|---|
| KNOWN | Green (#2E7D32) | Established, well-documented facts |
| SOURCE-BACKED | Blue (#1565C0) | Supported by a specific cited source |
| INFERRED | Yellow (#F9A825) | Reasoned from evidence, not directly stated |
| UNCERTAIN | Orange (#EF6C00) | Evidence is weak, incomplete, or ambiguous |
| CONFLICTING | Red (#C62828) | Sources disagree |
| NEEDS VERIFICATION | Gray (#616161) | Unverified community contribution |

## Implementation

- `EvidenceStatus.java` — Enum with all categories, color resources, descriptions
- `fromVerificationStatus(String)` — Maps backend verification status to evidence category
- `createBadge(Context, Category)` — Creates pill-shaped badge view with category color
- Badges appear on grave detail and cemetery list cards
- AI system prompt instructs the AI to label claims with evidence categories

## Rules
- Inference is never presented as fact
- Records without verified sources show "NEEDS VERIFICATION" badge
- Source information always visible in record detail
