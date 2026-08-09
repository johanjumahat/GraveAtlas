package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * City/locality directory entry (Phase 7A, Part 90).
 */
public class CityInfo {
    public String name;
    public String country;
    public String region;
    public int cemeteryCount;
    public Double latitude;
    public Double longitude;

    public static CityInfo fromJson(JSONObject json) {
        CityInfo info = new CityInfo();
        info.name = json.optString("name", "");
        info.country = json.optString("country", "");
        info.region = json.optString("region", null);
        info.cemeteryCount = json.optInt("cemeteryCount", 0);
        info.latitude = json.has("latitude") && !json.isNull("latitude") ? json.optDouble("latitude") : null;
        info.longitude = json.has("longitude") && !json.isNull("longitude") ? json.optDouble("longitude") : null;
        return info;
    }

    public String getDisplaySubtitle() {
        return cemeteryCount + (cemeteryCount == 1 ? " cemetery" : " cemeteries");
    }
}
