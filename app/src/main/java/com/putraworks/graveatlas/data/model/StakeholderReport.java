package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Stakeholder report combining all analytics into a comprehensive summary.
 * Returned by GET /api/analytics/stakeholder-report
 */
public class StakeholderReport {
    public String generatedAt;
    public String timeRange;
    public String cemeteryId;
    public ExecutiveSummary executiveSummary;
    public DataQuality dataQuality;
    public AnomalySummary anomalySummary;
    public List<Recommendation> recommendations;
    public List<CemeteryBreakdownEntry> cemeteryBreakdown;

    public static class ExecutiveSummary {
        public int totalRecords;
        public int verifiedRecords;
        public int verificationRate;
        public int averageConfidence;
        public int totalAnomalies;
        public int anomalyRate;
        public int sourceCoverage;
        public int coordinateCoverage;
        public String healthGrade;
    }

    public static class DataQuality {
        public int confidenceScore;
        public int verificationRate;
        public int sourceCoverage;
        public int coordinateCoverage;
        public int anomalyRate;
    }

    public static class AnomalySummary {
        public int total;
        public JSONObject byType;
        public List<AnomalyTypeEntry> topTypes;

        public static class AnomalyTypeEntry {
            public String type;
            public int count;
        }
    }

    public static class Recommendation {
        public String priority; // high, medium, low
        public String action;
        public String detail;
    }

    public static class CemeteryBreakdownEntry {
        public String cemeteryId;
        public int recordCount;
    }

    public static StakeholderReport fromJson(JSONObject json) {
        StakeholderReport result = new StakeholderReport();
        JSONObject r = json.optJSONObject("report");
        if (r == null) r = json;

        result.generatedAt = r.optString("generatedAt", null);
        result.timeRange = r.optString("timeRange", "30d");
        result.cemeteryId = r.optString("cemeteryId", "all");

        JSONObject es = r.optJSONObject("executiveSummary");
        if (es != null) {
            result.executiveSummary = new ExecutiveSummary();
            result.executiveSummary.totalRecords = es.optInt("totalRecords", 0);
            result.executiveSummary.verifiedRecords = es.optInt("verifiedRecords", 0);
            result.executiveSummary.verificationRate = es.optInt("verificationRate", 0);
            result.executiveSummary.averageConfidence = es.optInt("averageConfidence", 0);
            result.executiveSummary.totalAnomalies = es.optInt("totalAnomalies", 0);
            result.executiveSummary.anomalyRate = es.optInt("anomalyRate", 0);
            result.executiveSummary.sourceCoverage = es.optInt("sourceCoverage", 0);
            result.executiveSummary.coordinateCoverage = es.optInt("coordinateCoverage", 0);
            result.executiveSummary.healthGrade = es.optString("healthGrade", "F");
        }

        JSONObject dq = r.optJSONObject("dataQuality");
        if (dq != null) {
            result.dataQuality = new DataQuality();
            result.dataQuality.confidenceScore = dq.optInt("confidenceScore", 0);
            result.dataQuality.verificationRate = dq.optInt("verificationRate", 0);
            result.dataQuality.sourceCoverage = dq.optInt("sourceCoverage", 0);
            result.dataQuality.coordinateCoverage = dq.optInt("coordinateCoverage", 0);
            result.dataQuality.anomalyRate = dq.optInt("anomalyRate", 0);
        }

        JSONObject as = r.optJSONObject("anomalySummary");
        if (as != null) {
            result.anomalySummary = new AnomalySummary();
            result.anomalySummary.total = as.optInt("total", 0);
            result.anomalySummary.byType = as.optJSONObject("byType");
            result.anomalySummary.topTypes = new ArrayList<>();
            JSONArray tt = as.optJSONArray("topTypes");
            if (tt != null) {
                for (int i = 0; i < tt.length(); i++) {
                    JSONObject t = tt.optJSONObject(i);
                    if (t == null) continue;
                    AnomalySummary.AnomalyTypeEntry e = new AnomalySummary.AnomalyTypeEntry();
                    e.type = t.optString("type", "");
                    e.count = t.optInt("count", 0);
                    result.anomalySummary.topTypes.add(e);
                }
            }
        }

        result.recommendations = new ArrayList<>();
        JSONArray recs = r.optJSONArray("recommendations");
        if (recs != null) {
            for (int i = 0; i < recs.length(); i++) {
                JSONObject rec = recs.optJSONObject(i);
                if (rec == null) continue;
                Recommendation recommendation = new Recommendation();
                recommendation.priority = rec.optString("priority", "medium");
                recommendation.action = rec.optString("action", "");
                recommendation.detail = rec.optString("detail", "");
                result.recommendations.add(recommendation);
            }
        }

        result.cemeteryBreakdown = new ArrayList<>();
        JSONArray cb = r.optJSONArray("cemeteryBreakdown");
        if (cb != null) {
            for (int i = 0; i < cb.length(); i++) {
                JSONObject cbe = cb.optJSONObject(i);
                if (cbe == null) continue;
                CemeteryBreakdownEntry entry = new CemeteryBreakdownEntry();
                entry.cemeteryId = cbe.optString("cemeteryId", "");
                entry.recordCount = cbe.optInt("recordCount", 0);
                result.cemeteryBreakdown.add(entry);
            }
        }

        return result;
    }

    public boolean hasCriticalIssues() {
        return executiveSummary != null && executiveSummary.healthGrade.equals("F");
    }

    public int getRecommendationCount() {
        return recommendations != null ? recommendations.size() : 0;
    }

    public int getHighPriorityCount() {
        if (recommendations == null) return 0;
        int count = 0;
        for (Recommendation r : recommendations) {
            if ("high".equals(r.priority)) count++;
        }
        return count;
    }

    public String getSummaryLine() {
        if (executiveSummary == null) return "No report data";
        return String.format("Grade %s — %d records, %d%% verified, %d anomalies, %d recommendations",
            executiveSummary.healthGrade, executiveSummary.totalRecords,
            executiveSummary.verificationRate, executiveSummary.totalAnomalies, getRecommendationCount());
    }
}
