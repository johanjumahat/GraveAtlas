package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Data gap analysis result.
 * Returned by GET /api/enrichment/gaps
 */
public class EnrichmentGapsResult {
    public int totalRecords;
    public int avgCompleteness;
    public int totalGaps;
    public List<String> gapFields;
    public java.util.Map<String, GapInfo> gaps;

    public static class GapInfo {
        public int missingCount;
        public int totalRecords;
        public int missingPercent;
        public List<String> recordIds;

        public static GapInfo fromJson(JSONObject json) {
            GapInfo gi = new GapInfo();
            gi.missingCount = json.optInt("missingCount", 0);
            gi.totalRecords = json.optInt("totalRecords", 0);
            gi.missingPercent = json.optInt("missingPercent", 0);

            gi.recordIds = new ArrayList<>();
            JSONArray ids = json.optJSONArray("recordIds");
            if (ids != null) {
                for (int i = 0; i < ids.length(); i++) {
                    gi.recordIds.add(ids.optString(i));
                }
            }
            return gi;
        }
    }

    public static EnrichmentGapsResult fromJson(JSONObject json) {
        EnrichmentGapsResult r = new EnrichmentGapsResult();
        r.totalRecords = json.optInt("totalRecords", 0);
        r.avgCompleteness = json.optInt("avgCompleteness", 0);
        r.totalGaps = json.optInt("totalGaps", 0);

        r.gapFields = new ArrayList<>();
        JSONArray gf = json.optJSONArray("gapFields");
        if (gf != null) {
            for (int i = 0; i < gf.length(); i++) {
                r.gapFields.add(gf.optString(i));
            }
        }

        r.gaps = new java.util.HashMap<>();
        JSONObject gapsObj = json.optJSONObject("gaps");
        if (gapsObj != null) {
            java.util.Iterator<String> keys = gapsObj.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                JSONObject gapJson = gapsObj.optJSONObject(key);
                if (gapJson != null) {
                    r.gaps.put(key, GapInfo.fromJson(gapJson));
                }
            }
        }

        return r;
    }

    public boolean hasGaps() { return totalGaps > 0; }
    public GapInfo getWorstGap() {
        GapInfo worst = null;
        if (gaps != null) {
            for (GapInfo g : gaps.values()) {
                if (worst == null || g.missingCount > worst.missingCount) worst = g;
            }
        }
        return worst;
    }
}
