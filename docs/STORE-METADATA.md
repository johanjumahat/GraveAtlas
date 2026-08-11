# GraveAtlas Store Metadata

## Google Play Store

### App Details
- **App name:** GraveAtlas — Cemetery & Grave Finder
- **Package ID:** com.putraworks.graveatlas
- **Category:** Maps & Navigation
- **Content rating:** Everyone
- **Target audience:** General

### Short Description (80 chars max)
Discover, explore, and contribute to cemetery records worldwide.

### Full Description
GraveAtlas is a community-driven cemetery and grave records platform. Search through thousands of cemetery records, explore graves on a map, and contribute new records to help preserve memorial information for future generations.

Features:
• Search cemeteries and graves by name, location, or date
• Browse by country, region, and city
• View detailed grave and cemetery records with source attribution
• See nearby cemeteries on a map with clustering
• Save favorite records for offline access
• Contribute new records and corrections
• Community-moderated data quality with verification status
- All data is public, transparent, and community-curated

Every record includes source attribution and verification status. Data quality is maintained through a community moderation system.

### Screenshots Required
1. Home screen with quick actions
2. Search results with filters
3. Cemetery detail view
4. Grave detail with source attribution
5. Map view with markers
6. Nearby cemeteries list
7. Contribution form
8. Saved records (offline)

### App Icon
- Adaptive icon configured (mipmap-anydpi-v26)
- Round icon configured
- All densities: mdpi, hdpi, xhdpi, xxhdpi

### Permissions Declaration
- **INTERNET:** Required for API access to search and browse records
- **ACCESS_FINE_LOCATION:** Used for nearby search (optional, user-initiated)
- **ACCESS_COARSE_LOCATION:** Fallback for nearby search (optional)
- **ACCESS_NETWORK_STATE:** Used to detect online/offline status

### Data Safety (Google Play)
- **No data collected:** The app does not collect personal data beyond the user's display name
- **No data shared:** No data is shared with third parties
- **Encryption:** All API communication over HTTPS
- **Data deletion:** Users can request account deletion via in-app reporting

### Privacy Policy URL
Published in docs/PRIVACY.md — must be hosted at a public URL for Play Store

### Target SDK
- minSdk: 24 (Android 7.0)
- targetSdk: 34 (Android 14)
- compileSdk: 34

### Build Variants
- **Debug:** For development and testing
- **Release:** Signed with upload key, minified with ProGuard
