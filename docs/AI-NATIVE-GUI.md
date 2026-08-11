# AI-Native GUI — Phase 16

**Phase:** 16
**Status:** IMPLEMENTED (partial)
**Date:** 2026-08-11

## What Was Built

### AI-Native Home Screen
- Home screen redesigned with "What would you like to investigate?" prompt
- AI command bar at top of home screen — type a question, tap send, opens AI chat
- Six suggested research prompts shown below the command bar
- Tapping a suggested prompt opens AI chat with the question pre-filled and auto-sent

### AI Research Assistant System Prompt
- Replaced generic chatbot prompt with GraveAtlas research assistant identity
- AI now knows about evidence categories (KNOWN, SOURCE-BACKED, INFERRED, UNCERTAIN, CONFLICTING, NEEDS VERIFICATION)
- AI refuses to fabricate historical facts, dates, names, or sources
- AI suggests research directions and identifies evidence gaps
- Contextual prompts for grave and cemetery records (passed via intent extras)

### Evidence-First Badges
- Six evidence categories with distinct colors
- Badges appear on grave detail and cemetery list cards
- Category derived from record's verification status field
- Badge colors: green (KNOWN), blue (SOURCE-BACKED), yellow (INFERRED), orange (UNCERTAIN), red (CONFLICTING), gray (NEEDS VERIFICATION)

### Smart Record Cards
- Cemetery list redesigned as expandable cards with evidence badge, name, location, coordinates, description
- Grave detail shows evidence badge, all fields, provenance/source, and contextual actions
- Provenance always visible — never hidden behind expand/collapse

### Contextual Actions (Grave Detail)
- "View on Map" — opens external maps with geo: intent
- "Explain this Record" — opens AI chat with grave context prompt
- "Show Sources" — displays source information or "needs verification" notice
- "Find Related Records" — searches for related cemetery/person records
- "Check Provenance" — shows record ID, status, source, evidence category
- "Report Correction" — existing correction reporting

## What Was NOT Built (Honest Limitations)

- **Voice navigation**: Existing mic button in chat provides voice input, but no spoken navigation or research queries
- **Research Canvas**: Visual graph workspace (PERSON → CEMETERY → RECORD → SOURCE) not implemented
- **Multimodal/OCR**: No photo scanning, OCR, or document upload
- **AI Map**: Map remains standard — no natural-language map queries, historical layers, or source overlays
- **AI Timelines**: No interactive timeline view
- **Adaptive Interface Modes**: No Research/Map/Archive/Institution/Public mode toggle
- **Desktop GUI**: App is mobile-only; no desktop research layout
- **Research Memory**: No persistent research sessions or saved investigations
- **AI Transparency "Why am I seeing this?"**: Not implemented

## Technical Details

- **AISystemPrompts.java** — Research assistant identity, contextual prompts, suggested prompts
- **EvidenceStatus.java** — Evidence category enum, badge creation, verification status mapping
- **evidence_badge_bg.xml** — Rounded badge drawable
- **Colors** — Six evidence colors + AI UI colors added to colors.xml
- **HomeFragment** — AI command bar + suggested prompts container
- **GraveDetailFragment** — Evidence badge + 6 contextual action buttons
- **CemeteryFragment** — Smart record cards with evidence badges
- **MainActivity** — Prefill question handling from home screen
- **AIClient** — Research assistant system prompt for both OpenAI-compatible and Gemini formats

## AI Providers

The app uses **free AI providers only** — no paid services:
- Pollinations (default, no API key needed)
- Groq, Google Gemini, OpenRouter, Cerebras, Mistral, DeepSeek, Together AI, SambaNova
- Multi-provider fallback: if one provider fails, automatically tries the next
