# GraveAtlas Data Schema

## Overview

GraveAtlas uses JSON Schema (draft-07) to define all data entities. Schemas are stored in the public data repository under `schema/` and validated on both submission and publication.

## Schema Files

| Schema | File | Description |
|---|---|---|
| Grave Record | `schema/grave-schema.json` | A single grave/record entry |
| Cemetery Record | `schema/cemetery-schema.json` | A cemetery location |
| Person / Memorial | `schema/person-schema.json` | A person or memorial record |
| Source | `schema/source-schema.json` | A source/provenance reference |
| Correction | `schema/correction-schema.json` | A user-submitted correction |
| Audit Event | `schema/audit-event-schema.json` | An audit trail event |

## Core Entities

### Grave Record
Required fields: `id`, `name`, `status`, `submittedAt`

| Field | Type | Required | Constraints |
|---|---|---|---|
| id | string | yes | Pattern: `^[a-z0-9]{8,64}$` |
| name | string | yes | maxLength: 500 |
| birthDate | string\|null | no | Format: YYYY-MM-DD |
| deathDate | string\|null | no | Format: YYYY-MM-DD |
| cemetery | string\|null | no | maxLength: 2000 |
| section | string\|null | no | maxLength: 2000 |
| plot | string\|null | no | maxLength: 2000 |
| latitude | number\|null | no | -90 to 90 |
| longitude | number\|null | no | -180 to 180 |
| photoRefs | array\|null | no | String references |
| notes | string\|null | no | maxLength: 2000 |
| source | string\|null | no | Source attribution |
| status | string | yes | Enum: published, pending, rejected, reported |
| submittedAt | string | yes | ISO 8601 datetime |
| updatedAt | string\|null | no | ISO 8601 datetime |

### Cemetery Record
Required fields: `id`, `name`, `status`, `submittedAt`

| Field | Type | Required | Constraints |
|---|---|---|---|
| id | string | yes | Pattern: `^[a-z0-9]{8,64}$` |
| name | string | yes | maxLength: 2000 |
| address | string\|null | no | maxLength: 2000 |
| latitude | number\|null | no | -90 to 90 |
| longitude | number\|null | no | -180 to 180 |
| description | string\|null | no | maxLength: 5000 |
| status | string | yes | Enum: published, pending, rejected |
| submittedAt | string | yes | ISO 8601 datetime |
| updatedAt | string\|null | no | ISO 8601 datetime |

### Person / Memorial Record
Required fields: `id`, `displayName`, `status`, `submittedAt`

| Field | Type | Required | Constraints |
|---|---|---|---|
| id | string | yes | Pattern: `^person_[a-z0-9]{16,64}$` |
| displayName | string | yes | maxLength: 500 |
| givenNames | string\|null | no | maxLength: 500 |
| familyName | string\|null | no | maxLength: 500 |
| altNames | array\|null | no | String array |
| localName | string\|null | no | maxLength: 500 |
| transliteration | string\|null | no | maxLength: 500 |
| birthDate | string\|null | no | YYYY, YYYY-MM, YYYY-MM-DD, unknown, approx_* |
| deathDate | string\|null | no | Same as birthDate |
| birthDateApprox | boolean\|null | no | True if approximate |
| deathDateApprox | boolean\|null | no | True if approximate |
| biography | string\|null | no | maxLength: 5000 |
| memorialNotes | string\|null | no | maxLength: 2000 |
| graveId | string\|null | no | Pattern: `^grave_[a-z0-9]{16,64}$` |
| sourceRefs | array\|null | no | Pattern: `^source_[a-z0-9]{16,64}$` |
| verificationStatus | string | no | Enum: unverified, community_submitted, under_review, verified, rejected |
| status | string | yes | Enum: published, pending, rejected |
| submittedAt | string | yes | ISO 8601 datetime |
| updatedAt | string\|null | no | ISO 8601 datetime |

### Source Record
Required fields: `id`, `title`, `submittedAt`

| Field | Type | Required | Constraints |
|---|---|---|---|
| id | string | yes | Pattern: `^source_[a-z0-9]{16,64}$` |
| title | string | yes | maxLength: 500 |
| sourceType | string | no | Enum: cemetery_record, official_record, public_record, historical_document, photograph, contributor_provided, other |
| url | string\|null | no | Must start with http(s):// |
| attribution | string\|null | no | maxLength: 2000 |
| license | string\|null | no | maxLength: 500 |
| importDate | string\|null | no | ISO 8601 datetime |
| datasetVersion | string\|null | no | maxLength: 200 |
| description | string\|null | no | maxLength: 2000 |
| submittedAt | string | yes | ISO 8601 datetime |

### Correction Record
Required fields: `id`, `targetId`, `targetType`, `corrections`, `status`, `submittedAt`

| Field | Type | Required | Constraints |
|---|---|---|---|
| id | string | yes | Pattern: `^correction_[a-z0-9]{16,64}$` |
| targetId | string | yes | ID of record being corrected |
| targetType | string | yes | Enum: grave, cemetery, person, source |
| corrections | object | yes | Field-by-field corrections |
| reason | string\|null | no | maxLength: 2000 |
| sourceRefs | array\|null | no | String array |
| status | string | yes | Enum: pending, under_review, accepted, rejected |
| reviewNotes | string\|null | no | maxLength: 2000 (private — never exposed publicly) |
| submittedAt | string | yes | ISO 8601 datetime |
| updatedAt | string\|null | no | ISO 8601 datetime |

### Audit Event
Required fields: `id`, `action`, `entityType`, `entityId`, `timestamp`

| Field | Type | Required | Constraints |
|---|---|---|---|
| id | string | yes | Pattern: `^audit_[a-z0-9]+$` |
| action | string | yes | Enum: CREATE, UPDATE, DELETE, APPROVE, REJECT, REQUEST_CORRECTION, VERIFY, UNVERIFY, REPORT, RESTORE |
| entityType | string | yes | Type of entity affected |
| entityId | string\|null | no | ID of affected entity |
| userId | string\|null | no | ID of user who performed the action |
| timestamp | string | yes | ISO 8601 datetime |
| details | object\|null | no | Additional context (no secrets) |

## Validation Rules

1. **All records** are validated against their schema before submission acceptance.
2. **Coordinates** must be within valid ranges (-90/90 lat, -180/180 lon).
3. **Dates** must match the required format patterns.
4. **IDs** must match their entity-specific patterns.
5. **No additional properties** are allowed (`additionalProperties: false` on all schemas).
6. **Duplicate IDs** are detected and rejected (see `scripts/check-duplicates.js`).
7. **Publication** requires a second validation pass before writing to the public repository.

## Provenance

Every public factual record must have traceable provenance:
- `source` field in grave records
- `sourceRefs` array in person records
- Source records in the `source/` directory with attribution and license info

No historical information should be invented. Missing values must be left as `null`, not fabricated.
