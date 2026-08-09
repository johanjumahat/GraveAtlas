package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * Country directory entry (Phase 7A, Part 88).
 * Shows country name, code, cemetery count, and memorial count.
 */
public class CountryInfo {
    public String name;
    public String countryCode;
    public int cemeteryCount;
    public int memorialCount;

    public static CountryInfo fromJson(JSONObject json) {
        CountryInfo info = new CountryInfo();
        info.name = json.optString("name", "");
        info.countryCode = json.optString("countryCode", null);
        info.cemeteryCount = json.optInt("cemeteryCount", 0);
        info.memorialCount = json.optInt("memorialCount", 0);
        return info;
    }

    public String getDisplaySubtitle() {
        StringBuilder sb = new StringBuilder();
        if (cemeteryCount > 0) {
            sb.append(cemeteryCount).append(cemeteryCount == 1 ? " cemetery" : " cemeteries");
        }
        if (memorialCount > 0) {
            if (sb.length() > 0) sb.append(" • ");
            sb.append(memorialCount).append(memorialCount == 1 ? " memorial" : " memorials");
        }
        return sb.length() > 0 ? sb.toString() : "No records";
    }
}
