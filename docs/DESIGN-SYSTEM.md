# Design System — Phase 16

**Status:** UPDATED
**Date:** 2026-08-11

## Visual Language
Modern, calm, research-oriented. Dark theme with gold accents.

## Color Palette

### Base Colors
| Token | Hex | Usage |
|---|---|---|
| bg_root | #0B0B0D | Root background |
| bg_surface | #1A1A1E | Card surfaces |
| bg_surface_2 | #222226 | Input fields, secondary surfaces |
| gold | #E0A845 | Primary accent, buttons |
| gold_light | #F2C572 | Highlights |
| text_primary_dark | #F5F1E8 | Primary text |
| text_secondary_dark | #A8A5A0 | Secondary text |
| text_muted_dark | #6E6B67 | Muted text, labels |
| divider_dark | #2C2C30 | Dividers |

### Evidence Status Colors (Phase 16)
| Token | Hex | Category |
|---|---|---|
| evidence_known | #2E7D32 | KNOWN (green) |
| evidence_source_backed | #1565C0 | SOURCE-BACKED (blue) |
| evidence_inferred | #F9A825 | INFERRED (yellow) |
| evidence_uncertain | #EF6C00 | UNCERTAIN (orange) |
| evidence_conflicting | #C62828 | CONFLICTING (red) |
| evidence_needs_verification | #616161 | NEEDS VERIFICATION (gray) |

### AI UI Colors (Phase 16)
| Token | Hex | Usage |
|---|---|---|
| ai_bg | #141418 | AI surfaces |
| ai_bubble_user | #2A2417 | User message bubble |
| ai_bubble_ai | #1E1E24 | AI message bubble |
| ai_accent | #E0A845 | AI accent |

## Typography
- Title: 18-22sp, bold
- Body: 13-15sp, regular
- Label: 10-12sp, bold, letter-spacing 0.1
- Badge: 10sp, bold, white on colored background

## Components

### Evidence Badge
- Pill shape, 12dp corner radius
- 10sp bold white text
- Colored background per evidence category
- 24dp horizontal, 8dp vertical padding

### Smart Record Card
- Vertical layout
- Evidence badge at top
- Bold name (16sp)
- Secondary info (13sp, secondary color)
- Tertiary info (12sp, muted color)
- 24dp padding, 12dp bottom margin

### AI Command Bar
- Input field with send button
- Gold send button, 42dp circular
- Dark input background
- 14sp text

### Suggested Prompt
- Text button with background
- 13sp secondary text color
- 32dp horizontal, 24dp vertical padding
- 4dp vertical margin

## Spacing
- Screen padding: 16dp horizontal
- Card padding: 18-24dp
- Section margin: 16dp
- Item margin: 8-12dp
