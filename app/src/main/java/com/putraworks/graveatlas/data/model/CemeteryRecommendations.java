package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Smart recommendations for a cemetery.
 * Returned by GET /api/cemeteries/{id}/recommendations
 */
public class CemeteryRecommendations {
    public String cemeteryId;
    public List<Recommendation> recommendations;
    public RecommendationSummary summary;

    public static class Recommendation {
        public String category;    // data_quality, anomalies, enrichment, duplicates, content, connections
        public String priority;    // critical, high, medium, low
        public String title;
        public String description;
        public int affectedRecords;
        public String estimatedEffort; // low, medium, high
        public String actionEndpoint;   // nullable — API endpoint to address

        /**
         * Returns priority as a numeric urgency (0=critical, 3=low).
         */
        public int getPriorityOrder() {
            switch (priority) {
                case "critical": return 0;
                case "high": return 1;
                case "medium": return 2;
                default: return 3;
            }
        }

        /**
         * Returns a formatted severity label.
         */
        public String getPriorityLabel() {
            switch (priority) {
                case "critical": return "Critical";
                case "high": return "High Priority";
                case "medium": return "Medium Priority";
                default: return "Low Priority";
            }
        }

        /**
         * Returns the emoji icon for this recommendation category.
         */
        public String getCategoryIcon() {
            switch (category) {
                case "data_quality": return "📊";
                case "anomalies": return "⚠️";
                case "enrichment": return "✨";
                case "duplicates": return "🔗";
                case "content": return "📸";
                case "connections": return "👪";
                default: return "📋";
            }
        }
    }

    public static class RecommendationSummary {
        public int total;
        public int critical;
        public int high;
        public int medium;
        public int low;
        public int recordsAnalyzed;
    }

    public static CemeteryRecommendations fromJson(JSONObject json) {
        CemeteryRecommendations result = new CemeteryRecommendations();
        result.cemeteryId = json.optString("cemeteryId", null);
        result.recommendations = new ArrayList<>();

        JSONArray arr = json.optJSONArray("recommendations");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject r = arr.optJSONObject(i);
                if (r == null) continue;

                Recommendation rec = new Recommendation();
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

        // Parse summary
        JSONObject s = json.optJSONObject("summary");
        if (s != null) {
            result.summary = new RecommendationSummary();
            result.summary.total = s.optInt("total", 0);
            result.summary.critical = s.optInt("critical", 0);
            result.summary.high = s.optInt("high", 0);
            result.summary.medium = s.optInt("medium", 0);
            result.summary.low = s.optInt("low", 0);
            result.summary.recordsAnalyzed = s.optInt("recordsAnalyzed", 0);
        }

        return result;
    }

    /**
     * Returns only critical recommendations.
     */
    public List<Recommendation> getCriticalRecommendations() {
        List<Recommendation> critical = new ArrayList<>();
        for (Recommendation r : recommendations) {
            if ("critical".equals(r.priority)) critical.add(r);
        }
        return critical;
    }

    /**
     * Returns recommendations filtered by category.
     */
    public List<Recommendation> getByCategory(String category) {
        List<Recommendation> filtered = new ArrayList<>();
        for (Recommendation r : recommendations) {
            if (category.equals(r.category)) filtered.add(r);
        }
        return filtered;
    }

    /**
     * Returns true if there are any critical or high priority recommendations.
     */
    public boolean hasUrgentIssues() {
        return summary != null && (summary.critical > 0 || summary.high > 0);
    }

    /**
     * Returns a one-line summary.
     */
    public String getSummaryLine() {
        if (summary == null) return "No recommendations";
        return String.format("%d recommendations: %d critical, %d high, %d medium, %d low",
            summary.total, summary.critical, summary.high, summary.medium, summary.low);
    }
}
