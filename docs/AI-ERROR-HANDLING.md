# AI Error Handling — Phase 16

**Status:** IMPLEMENTED
**Date:** 2026-08-11

## How the AI Handles Uncertainty

### System Prompt Rules
The AI system prompt instructs:
- "If you don't know, say so clearly. State what evidence is missing."
- "Never fabricate historical facts, dates, names, locations, or sources."
- "Never present inference as established fact."

### User Experience
- When AI is uncertain, it explicitly says so
- AI offers alternative searches when it can't answer directly
- AI asks for clarification when questions are ambiguous
- Evidence categories (KNOWN, INFERRED, UNCERTAIN, etc.) label confidence levels

### Provider Fallback
- If the active AI provider fails, the app automatically tries the next provider
- If all providers fail, an error message is shown to the user
- No silent failures — errors are always displayed

### No Fabrication
- AI does not invent records, sources, or historical facts
- Records without verified sources show "NEEDS VERIFICATION" badge
- Source field shows "Community-submitted (needs verification)" when no source exists
