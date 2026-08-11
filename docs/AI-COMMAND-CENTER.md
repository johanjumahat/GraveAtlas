# AI Command Center — Phase 16

**Status:** IMPLEMENTED
**Date:** 2026-08-11

## Overview

The AI Command Center is the primary natural-language interface for GraveAtlas. It allows users to ask research questions in plain language and receive evidence-linked responses.

## Implementation

### Entry Points
1. **Home screen AI command bar** — text input + send button at top of HomeFragment
2. **Suggested research prompts** — 6 pre-written prompts below the command bar
3. **AI Chat activity** (MainActivity) — full chat interface with provider selection, voice input, conversation history
4. **Contextual "Explain this Record"** — opens AI chat from grave detail with record context

### Supported Input
- ✅ Text input
- ✅ Voice input (existing mic button with speech-to-text)
- ✅ Suggested prompts
- ✅ Conversation history (persisted in EncryptedSharedPreferences)
- ✅ Contextual follow-up (conversation context maintained)
- ⬜ Current-screen awareness (partial — only from grave detail)

### AI Response Quality
- Responses grounded in evidence categories
- AI explicitly states when it doesn't know
- AI does not have direct database access — it helps users think, search, and reason
- AI suggests searching in the app's search tab for specific records

## Limitations
- No direct database integration (AI cannot query GraveAtlas API)
- No real-time data in responses (AI reasons about general knowledge only)
- Voice input is speech-to-text only; no spoken AI responses in navigation context
