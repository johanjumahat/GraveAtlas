# Community Data — Cemetery & Grave Records

This directory contains community-contributed cemetery and grave records for GraveAtlas.

## How to Contribute

### Option 1: GitHub Issue (Easiest)
1. Go to [Issues](https://github.com/johanjumahat/GraveAtlas/issues/new)
2. Use the "New Cemetery/Grave Record" template
3. Fill in the details and attach photos

### Option 2: Pull Request (For JSON contributions)
1. Create a JSON file in this directory (see `template.json`)
2. Add any photos to `community-data/photos/`
3. Submit a Pull Request

## JSON Record Format

```json
{
  "id": "community-bukit-brown-001",
  "name": "Bukit Brown Cemetery",
  "cemetery": "Bukit Brown Cemetery",
  "country": "Singapore",
  "city": "Singapore",
  "latitude": 1.3347,
  "longitude": 103.8140,
  "description": "Historic Chinese cemetery established 1922",
  "photoUrl": "https://raw.githubusercontent.com/johanjumahat/GraveAtlas/main/community-data/photos/bukit-brown.jpg",
  "contributedDate": "2026-08-15",
  "contributorName": "community",
  "verificationStatus": "unverified"
}
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique ID (community-<name>-<number>) |
| name | string | Yes | Display name (person or cemetery) |
| cemetery | string | No | Cemetery name (if this is a grave record) |
| personName | string | No | Person's name (if this is a grave record) |
| givenNames | string | No | Given/first names |
| familyName | string | No | Family/surname |
| birthDate | string | No | Birth date (YYYY-MM-DD) |
| deathDate | string | No | Death date (YYYY-MM-DD) |
| burialDate | string | No | Burial date (YYYY-MM-DD) |
| country | string | No | Country |
| city | string | No | City |
| region | string | No | State/region |
| latitude | number | No | Latitude |
| longitude | number | No | Longitude |
| gravePlot | string | No | Plot number |
| section | string | No | Section/block |
| description | string | No | Description or notes |
| photoUrl | string | No | URL to a photo (raw GitHub URL) |
| contributedDate | string | Yes | Date contributed (YYYY-MM-DD) |
| contributorName | string | No | Contributor name (optional, "anonymous" if not provided) |
| verificationStatus | string | No | "verified" or "unverified" (default: unverified) |

## License

All community data is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
