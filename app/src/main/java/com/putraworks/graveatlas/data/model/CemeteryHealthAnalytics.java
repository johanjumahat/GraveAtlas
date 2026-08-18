package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Cemetery health score with breakdown metrics for analytics dashboard.
 * Returned by GET /api/analytics/cemetery-health
 */
public class CemeteryHealthAnalytics {
    public String cemeteryId;
    public int totalRecords;
    public int healthScore;
    public int avgConfidence;
    public int verificationRate;
    public int sourceRate;
    public int coordinateRate;
    public int anomalyRate;
    public int totalAnomalies;
    public String grade; // A, B, C, D, F

    public static List<CemeteryHealthAnalytics> fromJson(JSONObject json) {
        List<CemeteryHealthAnalytics> result = new ArrayList<>();
        JSONArray arr = json.optJSONArray("cemeteries");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject c = arr.optJSONObject(i);
                if (c == null) continue;
                CemeteryHealthAnalytics ch = new CemeteryHealthAnalytics();
                ch.cemeteryId = c.optString("cemeteryId", "");
                ch.totalRecords = c.optInt("totalRecords", 0);
                ch.healthScore = c.optInt("healthScore", 0);
                ch.avgConfidence = c.optInt("avgConfidence", 0);
                ch.verificationRate = c.optInt("verificationRate", 0);
                ch.sourceRate = c.optInt("sourceRate", 0);
                ch.coordinateRate = c.optInt("coordinateRate", 0);
                ch.anomalyRate = c.optInt("anomalyRate", 0);
                ch.totalAnomalies = c.optInt("totalAnomalies", 0);
                ch.grade = c.optString("grade", "F");
                result.add(ch);
            }
        }
        return result;
    }

    public boolean isGradeA() { return "A".equals(grade); }
    public boolean isGradeF() { return "F".equals(grade); }

    public String getGradeColor() {
        switch (grade) {
            case "A": return "🟢";
            case "B": return "🟢";
            case "C": return "🟡";
            case "D": return "🟠";
            case "F": return "🔴";
            default: return "⚪";
        }
    }

    public String getSummaryLine() {
        return String.format("%s %s — Score: %d, %d records, %d%% verified",
            getGradeColor(), grade, healthScore, totalRecords, verificationRate);
    }
}
