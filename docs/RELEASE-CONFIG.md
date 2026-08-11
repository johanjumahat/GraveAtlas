# GraveAtlas Release Configuration

## Release Versioning

| Component | Current Version | Scheme |
|---|---|---|
| Backend API | 7.1.0 | Semantic (MAJOR.MINOR.PATCH) |
| Android app | 1.0.0 | Semantic (MAJOR.MINOR.PATCH) |
| Data schema | 1.0.0 | Semantic |
| Dataset | Auto-incremented via CI | Build number |

## Release Candidate Process

1. **Freeze:** No new features merged to main
2. **Test:** Run full test suite (346+ tests)
3. **Build:** CI produces signed APK/AAB
4. **Verify:** Install on test device, verify core flows
5. **Tag:** Create git tag `v<version>`
6. **Release:** Upload to Google Play Console (internal track)

## Android Release Build

### Signing Configuration

```gradle
// In app/build.gradle
signingConfigs {
    release {
        storeFile file(System.getenv("KEYSTORE_FILE") ?: "debug.keystore")
        storePassword System.getenv("KEYSTORE_PASSWORD") ?: "android"
        keyAlias System.getenv("KEY_ALIAS") ?: "androiddebugkey"
        keyPassword System.getenv("KEY_PASSWORD") ?: "android"
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### CI Build (GitHub Actions)

The `android-release.yml` workflow:
1. Checks out code
2. Sets up Java 17
3. Builds release APK with signing
4. Auto-increments version code
5. Uploads APK as artifact
6. Creates GitHub Release with download link

### Build Artifacts

| Artifact | Format | Location |
|---|---|---|
| Release APK | .apk | GitHub Releases |
| Release AAB | .aab | Google Play Console |
| Build metadata | .json | GitHub Actions artifacts |

## Release Test Matrix

| Test | Device/API | Steps |
|---|---|---|
| Clean install | Android 14 (API 34) | Install, launch, navigate all screens |
| Clean install | Android 12 (API 31) | Install, launch, navigate all screens |
| Clean install | Android 10 (API 29) | Install, launch, navigate all screens |
| Upgrade | Android 14 | Install previous version, upgrade, verify data |
| Search | Any | Search for cemetery, grave, person |
| Contribute | Any | Submit a contribution draft |
| Map | Any | Open map, verify markers appear |
| Offline | Any | Disable network, verify saved records accessible |

## Store Metadata

### App Name
GraveAtlas — Cemetery & Grave Finder

### Short Description
Discover, explore, and contribute to cemetery records worldwide.

### Full Description
GraveAtlas is a community-driven cemetery and grave records platform. Search through thousands of cemetery records, explore graves on a map, and contribute new records to help preserve memorial information for future generations.

Features:
- Search cemeteries and graves by name, location, or date
- Browse by country, region, and city
- View detailed grave and cemetery records
- See nearby cemeteries on a map
- Save favorite records for offline access
- Contribute new records and corrections
- Community-moderated data quality

All data is public, transparent, and community-curated. Every record includes source attribution and verification status.

### Category
Maps & Navigation / Reference

### Content Rating
Everyone

### Privacy Policy
See `docs/PRIVACY.md`

### Terms of Use
See `docs/TERMS.md`

### Target SDK
- minSdk: 24 (Android 7.0)
- targetSdk: 34 (Android 14)
- compileSdk: 34

### Permissions
- `INTERNET` — API access
- `ACCESS_FINE_LOCATION` — Nearby search (optional)
- `ACCESS_COARSE_LOCATION` — Nearby search fallback (optional)
- `ACCESS_NETWORK_STATE` — Online/offline detection

## Release Gate Checklist

- [ ] All 346+ tests pass
- [ ] No secrets in source code
- [ ] No hardcoded credentials
- [ ] APK installs cleanly on Android 10/12/14
- [ ] Core flows work: search, detail, map, contribute
- [ ] Offline mode shows saved records
- [ ] Privacy policy is current
- [ ] Terms of use is current
- [ ] App icon and splash screen correct
- [ ] Store screenshots captured
- [ ] Version code incremented
- [ ] Release notes written
- [ ] APK signed with release key
