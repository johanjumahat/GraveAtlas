package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Health report summary.
 * Returned by GET /api/summaries/health-report
 */
public class HealthReportSummary {
    public String report;
    public int healthScore;
    public String grade;

    public static HealthReportSummary fromJson(JSONObject json) {
        HealthReportSummary hrs = new HealthReportSummary();
        hrs.report = json.optString("report", "");
        hrs.healthScore = json.optInt("healthScore", 0);
        hrs.grade = json.optString("grade", "F");
        return hrs;
    }

    public boolean isExcellent() { return healthScore >= 80; }
    public boolean isGood() { return healthScore >= 70; }
    public boolean isPoor() { return healthScore < 60; }

    public String getGradeEmoji() {
        switch (grade) {
            case "A": return "🟢";
            case "B": return "🟢";
            case "C": return "🟡";
            case "D": return "🟠";
            default: return "🔴";
        }
    }
}
