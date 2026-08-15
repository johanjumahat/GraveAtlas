# API Licensing

## Overview (Part 10)

Before importing or redistributing data, GraveAtlas evaluates:
- License type
- Attribution requirements
- Commercial use restrictions
- Derivative data restrictions
- Redistribution rules
- API terms
- Retention restrictions

## License Evaluation Results

| Decision | Meaning |
|----------|---------|
| `approved` | License is compatible, import allowed |
| `review_required` | License unclear — manual review needed |
| `rejected` | License incompatible — import blocked |

## Compatible Licenses

- CC0 / Public Domain / PDDL
- CC-BY, CC-BY-SA
- ODbL, OGTSL
- Singapore Open Data Licence

## Restricted Licenses (Blocked)

- CC-BY-NC, CC-BY-NC-SA, CC-BY-ND
- All Rights Reserved, Proprietary
- Unknown / unverified

## Rule

**If rights are unclear: DO NOT IMPORT OR REDISTRIBUTE AUTOMATICALLY.**

Instead mark: `LICENSE_REVIEW_REQUIRED`

## Implementation

File: `backend/src/external-connectors/licensing.js`
