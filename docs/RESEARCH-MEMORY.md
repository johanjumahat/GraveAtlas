# Research Memory — Phase 16

**Status:** PARTIALLY IMPLEMENTED
**Date:** 2026-08-11

## What Exists
- Chat history persisted in EncryptedSharedPreferences per user
- Up to 300 messages stored
- History survives activity recreation, backgrounding, and process death
- User can clear chat history via "Clear Chat" button

## What Phase 16 Requires (Not Yet Built)
- ⬜ Continuation of research sessions across app launches
- ⬜ Current investigation tracking
- ⬜ Selected records memory
- ⬜ Saved evidence collections
- ⬜ Research notes
- ⬜ Previous questions history
- ⬜ User can inspect and delete research history (chat can be cleared, but no research-specific history)

## Privacy
- Chat history is per-user (scoped by Google user ID if logged in)
- Stored in encrypted storage
- No chat data sent to external servers beyond the chosen AI provider
- User can clear history at any time
