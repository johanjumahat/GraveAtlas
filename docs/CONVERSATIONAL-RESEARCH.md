# Conversational Research Workspace — Phase 16

**Status:** PARTIALLY IMPLEMENTED
**Date:** 2026-08-11

## Design Flow: ASK → EXPLORE → EVIDENCE → COMPARE → SAVE

### ASK ✅
- Users can ask questions via AI command bar or chat interface
- Suggested prompts guide first-time users

### EXPLORE ✅
- AI suggests searching in the app's search tab
- "Find Related Records" action navigates to search with relevant query
- Cemetery and grave records browsable through existing UI

### EVIDENCE ✅
- Evidence badges on records show verification status
- "Show Sources" action displays source information
- "Check Provenance" shows full provenance chain

### COMPARE ⬜
- No multi-record comparison view implemented
- AI can help reason about comparisons in chat, but no side-by-side UI

### SAVE ⬜
- No research collections or saved investigations
- Existing SavedItemsManager saves individual items but not research sessions

## Limitations
- Users can move from AI questions to records, but not back to AI with record context (except from grave detail)
- No research collections or workspace
