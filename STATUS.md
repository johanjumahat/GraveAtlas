# GraveAtlas — Project Status

**Current Version:** 7.2.42 (build 174)
**Last Updated:** 2026-08-19
**Status:** Active — all PRs merged, CI green

## Recent Changes (v7.2.42)

### UI Fixes (PR #50 — merged)
- Removed duplicate AI input box from home screen
- Added research topic dropdown (All topics / categories)
- Fixed text visibility (TextInputEditText → EditText)
- Fixed WrongViewCast lint error

### Provider Reorder (PR #51 — merged)
- Auto mode now tries: Gemini → Cohere → Kilo → LLM7 → OpenRouter →
  HuggingFace → Groq → Z.AI → Mistral → Pollinations → Cerebras →
  DeepSeek → Together AI → SambaNova
- Keyed providers without configured keys are auto-skipped

### Earlier (v7.2.41)
- R8 minification enabled (APK ~7.9MB, down from larger)
- SDK 35 / AGP 8.6.1 upgrade
- Sequential AI provider fallback logic
- AI response formatting tightened (no search dumps)

## CI Status
- All builds passing on main
- Latest successful build: #178

## Known Issues
- None currently open

## Next Steps
- Monitor provider availability (Gemini/Cohere free tiers)
- Consider adding more no-key providers as they become available
