# Map Quality Review (Phase 9)

## Actual Implementation (verified by code read, not assumed from docs)

`app/src/main/java/com/putraworks/graveatlas/ui/map/MapFragment.java` (326 lines) does **not** embed a map SDK. It uses Android `geo:` URI intents to hand off to the device's default maps app:

```java
String geoUri = String.format("geo:%f,%f?z=15&q=%f,%f(%d locations)", ...);
Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(geoUri));
startActivity(intent);
```

**Discrepancy found:** `STATUS.md` describes the architecture as including "OSM map" (OpenStreetMap). Code inspection found no `osmdroid` or any map-rendering dependency in `app/build.gradle` — the map dependency list is empty of any map SDK. The actual behavior is a geo-intent handoff, which is a legitimate zero-cost, no-paid-SDK approach, but the documentation calling it "OSM map" is inaccurate and should be corrected (tracked as a LOW finding).

## Mobile Map Usability (what was tested)

- Single grave / cluster handoff to external maps app: code present for both single-location (`geoUri` with one point) and multi-location cluster (`?q=...(N locations)`) intents.
- No in-app map rendering means no in-app clustering, marker icons, or zoom/pan UI to evaluate — those responsibilities are delegated entirely to the user's installed maps app (Google Maps, etc.).

## Coordinates / Data on Map

NOT AVAILABLE for real coordinate quality — 0 published graves/cemeteries exist (see `docs/POST-LAUNCH.md`). The deterministic validation (`invalid_lat`, `invalid_lon` checks in `scripts/data-quality-check.js`) already rejects out-of-range coordinates before publication, so once data exists, gross coordinate errors should be caught pre-publication rather than discovered on the map.

## Zero/Slow/Failed Map Loads

Not applicable — there is no in-app map to load/fail. The `geo:` intent either succeeds (opens external app) or fails if no maps app is installed on the device, which is a device-configuration edge case, not a GraveAtlas defect.

## Recommendation

- LOW: Correct `STATUS.md` / `docs/ARCHITECTURE.md` wording from "OSM map" to "external maps handoff (geo: intent)" to keep documentation evidence-accurate.
- No functional map changes are justified by current evidence — the geo-intent approach has no measured usability complaints (no users yet) and avoids maintaining a map SDK/API-key dependency.
