# Sources

## Overview

Every external dataset imported into GraveAtlas must have a registered source with documented licensing.

## Source Registry

Each source entry contains:

| Field | Required | Description |
|-------|----------|-------------|
| sourceId | Yes | Crypto-secure ID (`source_<16+ hex>`) |
| sourceName | Yes | Human-readable source name |
| organization | No | Organization if known |
| sourceUrl | No | URL of the source organization |
| datasetUrl | No | Direct URL to the dataset |
| license | Yes | License or permission type |
| attribution | If required by license | Required attribution text |
| permissionStatus | Yes | PENDING_REVIEW, APPROVED, REJECTED, ACTIVE, DISABLED |
| datasetVersion | No | Version identifier |
| publicationDate | No | When the dataset was published |
| importDate | Yes | When it was imported into GraveAtlas |
| importer | No | Who performed the import |
| recordCount | Yes | Number of records from this source |
| status | Yes | Current status |

## Source Quality Levels

| Level | Description | Quality Weight |
|-------|-------------|----------------|
| official_cemetery_source | Official cemetery records | 5 |
| public_historical_source | Public historical records | 4 |
| open_government_dataset | Open government data | 4 |
| community_contribution | Community-submitted data | 2 |
| unverified_source | Unverified source | 1 |

Imported records are NOT automatically marked as VERIFIED based on source type alone.
