# Smart Record Cards — Phase 16

**Status:** IMPLEMENTED
**Date:** 2026-08-11

## Card Design
Smart record cards contain:
- ✅ Name (bold, prominent)
- ✅ Evidence status (badge)
- ✅ Location (address + coordinates)
- ✅ Source/provenance (always visible)
- ✅ Actions (contextual buttons on grave detail)
- ⬜ Date (not all records have dates)
- ⬜ Related records (link exists but no inline preview)
- ⬜ Expandable (cards are flat, not expandable)

## Implementation
- Cemetery list: LinearLayout cards with badge, name, address, coordinates, description
- Grave detail: Full layout with badge, all fields, source, and 6 contextual action buttons
- Provenance is always visible — never hidden behind expand/collapse

## Limitation
Cards are not expandable/collapsible. All information is shown by default.
