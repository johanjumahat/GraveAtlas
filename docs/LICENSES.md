# Licenses

## Overview

Every external dataset imported into GraveAtlas must have documented permission/licensing information before import.

## Recognized Licenses

| License | Attribution Required | Share-Alike | Notes |
|---------|---------------------|-------------|-------|
| CC0 | No | No | Creative Commons — public domain dedication |
| Public Domain | No | No | Works in the public domain |
| PDDL | No | No | Open Data Commons Public Domain Dedication |
| CC-BY | Yes | No | Creative Commons Attribution |
| CC-BY-SA | Yes | Yes | Creative Commons Attribution-ShareAlike |
| CC-BY-ND | Yes | No | Creative Commons Attribution-NoDerivs |
| CC-BY-NC | Yes | No | Creative Commons Attribution-NonCommercial |
| CC-BY-NC-SA | Yes | Yes | Creative Commons Attribution-NonCommercial-ShareAlike |
| ODbL | Yes | Yes | Open Data Commons Open Database License |

## Rules

1. **If license/permission is unclear: DO NOT IMPORT.** Mark as `LICENSE_REVIEW_REQUIRED`.
2. **"Publicly visible online" ≠ "free to redistribute."** A dataset being accessible does not mean it is licensed for reuse.
3. **Attribution must be preserved.** If a license requires attribution, that attribution is displayed in the source interface.
4. **No legal claims beyond what the license states.** We do not interpret licenses beyond their explicit terms.
5. **Unrecognized licenses require manual review.** A human must verify the license before import proceeds.

## License Verification Process

```
Dataset arrives
  ↓
License field present?
  ↓ No → LICENSE_REVIEW_REQUIRED (do not import)
  ↓ Yes
  ↓
License recognized?
  ↓ No → LICENSE_REVIEW_REQUIRED (manual review)
  ↓ Yes
  ↓
Attribution required?
  ↓ Yes → Preserve attribution in source registry
  ↓ No → Proceed without attribution requirement
  ↓
Share-alike required?
  ↓ Yes → Derived works must use compatible license
  ↓ No → No restriction on derived works
  ↓
Proceed with import
```
