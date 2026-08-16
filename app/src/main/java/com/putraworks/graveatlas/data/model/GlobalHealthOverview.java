package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * Global health overview across all cemeteries.
 * Returned by GET /api/health/overview
 */
public class GlobalHealthOverview {
    public int totalCemeteries;
    public int totalRecords;
    public int criticalIssues;
    public ContentCoverage contentCoverage;
    public int contentAverage;
    public String globalGrade;

    public static class ContentCoverage {
        public int photoCoverage;
        public int inscriptionCoverage;
        public int sourceCoverage;
        public int coordinateCoverage;
    }

    public static GlobalHealthOverview fromJson(JSONObject json) {
        GlobalHealthOverview result = new GlobalHealthOverview();

        JSONObject overview = json.optJSONObject("overview");
        if (overview == null) return result;

        result.totalCemeteries = overview.optInt("totalCemeteries", 0);
        result.totalRecords = overview.optInt("totalRecords", 0);
        result.criticalIssues = overview.optInt("criticalIssues", 0);
        result.contentAverage = overview.optInt("contentAverage", 0);
        result.globalGrade = overview.optString("globalGrade", "N/A");

        JSONObject cc = overview.optJSONObject("contentCoverage");
        if (cc != null) {
            result.contentCoverage = new ContentCoverage();
            result.contentCoverage.photoCoverage = cc.optInt("photoCoverage", 0);
            result.contentCoverage.inscriptionCoverage = cc.optInt("inscriptionCoverage", 0);
            result.contentCoverage.sourceCoverage = cc.optInt("sourceCoverage", 0);
            result.contentCoverage.coordinateCoverage = cc.optInt("coordinateCoverage", 0);
        }

        return result;
    }

    /**
     * Returns a formatted summary line.
     */
    public String getSummary() {
        return String.format("%d cemeteries | %d records | Grade %s | %d critical issues",
            totalCemeteries, totalRecords, globalGrade, criticalIssues);
    }
}
