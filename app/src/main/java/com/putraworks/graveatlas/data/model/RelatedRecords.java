package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Related records response (Phase 7A, Part 101).
 * Contains nearby cemeteries, people in the same cemetery, and same-region cemeteries.
 * No fabricated relationships — only actual geographic or cemetery-based associations.
 */
public class RelatedRecords {
    public List<RelatedItem> nearby;        // nearby cemeteries (within 50km)
    public List<RelatedItem> sameCemetery;  // people in same cemetery
    public List<RelatedItem> sameRegion;    // cemeteries in same region

    public static RelatedRecords fromJson(JSONObject json) {
        RelatedRecords rr = new RelatedRecords();
        rr.nearby = parseList(json.optJSONArray("nearby"));
        rr.sameCemetery = parseList(json.optJSONArray("sameCemetery"));
        rr.sameRegion = parseList(json.optJSONArray("sameRegion"));
        return rr;
    }

    private static List<RelatedItem> parseList(JSONArray arr) {
        List<RelatedItem> items = new ArrayList<>();
        if (arr == null) return items;
        for (int i = 0; i < arr.length(); i++) {
            try {
                items.add(RelatedItem.fromJson(arr.getJSONObject(i)));
            } catch (Exception e) { /* skip */ }
        }
        return items;
    }

    public boolean hasAnyRelated() {
        return (nearby != null && !nearby.isEmpty()) ||
               (sameCemetery != null && !sameCemetery.isEmpty()) ||
               (sameRegion != null && !sameRegion.isEmpty());
    }

    public static class RelatedItem {
        public String id;
        public String name;
        public String birthDate;
        public String deathDate;
        public String city;
        public String region;
        public String country;
        public double distance; // km, for nearby items
        public Double latitude;
        public Double longitude;

        public static RelatedItem fromJson(JSONObject json) {
            RelatedItem item = new RelatedItem();
            item.id = json.optString("id", null);
            item.name = json.optString("name", "Unknown");
            item.birthDate = json.optString("birthDate", null);
            item.deathDate = json.optString("deathDate", null);
            item.city = json.optString("city", null);
            item.region = json.optString("region", null);
            item.country = json.optString("country", null);
            item.distance = json.optDouble("distance", 0);
            item.latitude = json.has("latitude") && !json.isNull("latitude") ? json.optDouble("latitude") : null;
            item.longitude = json.has("longitude") && !json.isNull("longitude") ? json.optDouble("longitude") : null;
            return item;
        }

        public String getDisplaySubtitle() {
            StringBuilder sb = new StringBuilder();
            if (distance > 0) {
                sb.append(Math.round(distance)).append(" km away");
            }
            if (city != null) {
                if (sb.length() > 0) sb.append(" • ");
                sb.append(city);
            }
            if (birthDate != null || deathDate != null) {
                if (sb.length() > 0) sb.append(" • ");
                if (birthDate != null && deathDate != null) sb.append(birthDate).append(" – ").append(deathDate);
                else if (birthDate != null) sb.append("b. ").append(birthDate);
                else sb.append("d. ").append(deathDate);
            }
            return sb.toString();
        }
    }
}
