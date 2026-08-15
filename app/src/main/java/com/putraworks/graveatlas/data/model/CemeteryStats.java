package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * Cemetery statistics model — statistical summary of a cemetery's grave records.
 * Returned by GET /api/cemeteries/{id}/stats
 */
public class CemeteryStats {
    public String cemeteryId;
    public int totalRecords;
    public int verifiedRecords;
    public int communitySubmitted;
    public int unverified;
    public int withPhotos;
    public int withInscriptions;
    public int withSources;
    public DateRange dateRange;
    public JSONObject decadeBreakdown;
    public TopName[] topNames;
    public JSONObject typeBreakdown;

    public static class DateRange {
        public Integer earliest;
        public Integer latest;
    }

    public static class TopName {
        public String name;
        public int count;
    }

    public static CemeteryStats fromJson(JSONObject json) {
        CemeteryStats stats = new CemeteryStats();
        stats.cemeteryId = json.optString("cemeteryId", null);
        stats.totalRecords = json.optInt("totalRecords", 0);
        stats.verifiedRecords = json.optInt("verifiedRecords", 0);
        stats.communitySubmitted = json.optInt("communitySubmitted", 0);
        stats.unverified = json.optInt("unverified", 0);
        stats.withPhotos = json.optInt("withPhotos", 0);
        stats.withInscriptions = json.optInt("withInscriptions", 0);
        stats.withSources = json.optInt("withSources", 0);

        JSONObject dr = json.optJSONObject("dateRange");
        if (dr != null) {
            stats.dateRange = new DateRange();
            stats.dateRange.earliest = dr.isNull("earliest") ? null : dr.optInt("earliest");
            stats.dateRange.latest = dr.isNull("latest") ? null : dr.optInt("latest");
        }

        stats.decadeBreakdown = json.optJSONObject("decadeBreakdown");
        stats.typeBreakdown = json.optJSONObject("typeBreakdown");

        // Parse topNames array
        if (json.has("topNames") && !json.isNull("topNames")) {
            org.json.JSONArray arr = json.optJSONArray("topNames");
            if (arr != null) {
                stats.topNames = new TopName[arr.length()];
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject tn = arr.optJSONObject(i);
                    if (tn != null) {
                        stats.topNames[i] = new TopName();
                        stats.topNames[i].name = tn.optString("name", "");
                        stats.topNames[i].count = tn.optInt("count", 0);
                    }
                }
            }
        }

        return stats;
    }

    /**
     * Verification rate as percentage (0-100).
     */
    public int getVerificationRate() {
        if (totalRecords == 0) return 0;
        return (int) ((verifiedRecords * 100.0) / totalRecords);
    }

    /**
     * Photo coverage rate as percentage (0-100).
     */
    public int getPhotoCoverage() {
        if (totalRecords == 0) return 0;
        return (int) ((withPhotos * 100.0) / totalRecords);
    }

    /**
     * Source coverage rate as percentage (0-100).
     */
    public int getSourceCoverage() {
        if (totalRecords == 0) return 0;
        return (int) ((withSources * 100.0) / totalRecords);
    }
}
