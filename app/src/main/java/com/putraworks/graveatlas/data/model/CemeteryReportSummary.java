package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Lightweight report summary for a cemetery.
 * Returned by GET /api/cemeteries/{id}/report/summary
 */
public class CemeteryReportSummary {
    public String cemeteryId;
    public String cemeteryName;
    public int recordCount;
    public String healthGrade;
    public int healthScore;
    public int completeness;
    public int contentCoverage;
    public AnomalyCounts anomalies;
    public DuplicateCounts duplicates;
    public int photoCoverage;
    public int sourceCoverage;
    public int inscriptionCoverage;
    public String generatedAt;

    public static class AnomalyCounts {
        public int critical;
        public int warning;
    }

    public static class DuplicateCounts {
        public int count;
        public int rate;
    }

    public static CemeteryReportSummary fromJson(JSONObject json) {
        CemeteryReportSummary result = new CemeteryReportSummary();
        result.cemeteryId = json.optString("cemeteryId", null);
        result.cemeteryName = json.optString("cemeteryName", "Unknown Cemetery");
        result.recordCount = json.optInt("recordCount", 0);
        result.healthGrade = json.optString("healthGrade", "N/A");
        result.healthScore = json.optInt("healthScore", 0);
        result.completeness = json.optInt("completeness", 0);
        result.contentCoverage = json.optInt("contentCoverage", 0);
        result.photoCoverage = json.optInt("photoCoverage", 0);
        result.sourceCoverage = json.optInt("sourceCoverage", 0);
        result.inscriptionCoverage = json.optInt("inscriptionCoverage", 0);
        result.generatedAt = json.optString("generatedAt", null);

        JSONObject a = json.optJSONObject("anomalies");
        if (a != null) {
            result.anomalies = new AnomalyCounts();
            result.anomalies.critical = a.optInt("critical", 0);
            result.anomalies.warning = a.optInt("warning", 0);
        }

        JSONObject d = json.optJSONObject("duplicates");
        if (d != null) {
            result.duplicates = new DuplicateCounts();
            result.duplicates.count = d.optInt("count", 0);
            result.duplicates.rate = d.optInt("rate", 0);
        }

        return result;
    }

    public String getSummaryLine() {
        return String.format("%s — Grade %s (%d%%) | %d records | %d critical anomalies",
            cemeteryName, healthGrade, healthScore, recordCount,
            anomalies != null ? anomalies.critical : 0);
    }
}
