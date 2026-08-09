package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * Region directory entry (Phase 7A, Part 89).
 */
public class RegionInfo {
    public String name;
    public String country;
    public int cemeteryCount;

    public static RegionInfo fromJson(JSONObject json) {
        RegionInfo info = new RegionInfo();
        info.name = json.optString("name", "");
        info.country = json.optString("country", "");
        info.cemeteryCount = json.optInt("cemeteryCount", 0);
        return info;
    }

    public String getDisplaySubtitle() {
        return cemeteryCount + (cemeteryCount == 1 ? " cemetery" : " cemeteries");
    }
}
