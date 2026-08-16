package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Global recommendations across all cemeteries.
 * Returned by GET /api/recommendations/global
 */
public class GlobalRecommendations {
    public List<CemeteryRecommendations.Recommendation> recommendations;
    public GlobalSummary summary;

    public static class GlobalSummary {
        public int total;
        public int critical;
        public int high;
        public int medium;
        public int low;
        public int totalCemeteries;
        public int totalRecords;
    }

    public static GlobalRecommendations fromJson(JSONObject json) {
        GlobalRecommendations result = new GlobalRecommendations();
        result.recommendations = new ArrayList<>();

        JSONArray arr = json.optJSONArray("recommendations");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject r = arr.optJSONObject(i);
                if (r == null) continue;

                CemeteryRecommendations.Recommendation rec = new CemeteryRecommendations.Recommendation();
                rec.category = r.optString("category", "");
                rec.priority = r.optString("priority", "low");
                rec.title = r.optString("title", "");
                rec.description = r.optString("description", "");
                rec.affectedRecords = r.optInt("affectedRecords", 0);
                rec.estimatedEffort = r.optString("estimatedEffort", "low");
                rec.actionEndpoint = r.optString("actionEndpoint", null);
                if ("null".equals(rec.actionEndpoint)) rec.actionEndpoint = null;

                result.recommendations.add(rec);
            }
        }

        JSONObject s = json.optJSONObject("summary");
        if (s != null) {
            result.summary = new GlobalSummary();
            result.summary.total = s.optInt("total", 0);
            result.summary.critical = s.optInt("critical", 0);
            result.summary.high = s.optInt("high", 0);
            result.summary.medium = s.optInt("medium", 0);
            result.summary.low = s.optInt("low", 0);
            result.summary.totalCemeteries = s.optInt("totalCemeteries", 0);
            result.summary.totalRecords = s.optInt("totalRecords", 0);
        }

        return result;
    }

    /**
     * Returns only critical recommendations.
     */
    public List<CemeteryRecommendations.Recommendation> getCriticalRecommendations() {
        List<CemeteryRecommendations.Recommendation> critical = new ArrayList<>();
        for (CemeteryRecommendations.Recommendation r : recommendations) {
            if ("critical".equals(r.priority)) critical.add(r);
        }
        return critical;
    }

    /**
     * Returns a formatted summary line.
     */
    public String getSummaryLine() {
        if (summary == null) return "No recommendations";
        return String.format("%d cemeteries, %d records | %d recommendations (%d critical)",
            summary.totalCemeteries, summary.totalRecords, summary.total, summary.critical);
    }
}
