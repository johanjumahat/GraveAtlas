# AI Copilot — Phase 16

**Status:** PARTIALLY IMPLEMENTED
**Date:** 2026-08-11

## Contextual Assistance

### Implemented
- **Searching**: AI can help formulate search queries and suggest search strategies
- **Explaining records**: "Explain this Record" action on grave detail opens AI chat with record context
- **Identifying gaps**: AI system prompt instructs it to identify evidence gaps
- **Suggesting research questions**: AI offers suggested prompts for investigation
- **Navigating GraveAtlas**: AI can direct users to search tab, map, or specific features

### Not Implemented
- **Comparing sources**: No multi-source comparison UI
- **Summarizing evidence**: AI can summarize in chat but no dedicated summary view

## Permissions & Privacy
- AI does not have direct database access
- AI conversations are stored locally in EncryptedSharedPreferences per user
- AI does not access private data or bypass authorization
- No conversation data sent to external servers beyond the chosen AI provider
