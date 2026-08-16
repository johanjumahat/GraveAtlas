package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * Quick health snapshot used in cleanup before/after comparisons.
 */
public class HealthSnapshot {
    public String grade;        // A, B, C, D, F, N/A
    public int overallScore;
    public int dataQuality;
    public int anomalyFree;
    public int contentCoverage;
    public int duplicateFree;
    public AnomalyStats anomalies;
    public ContentStats content;
    public DuplicateStats duplicates;
    public int completeness;
    public int coverage;

    public static class AnomalyStats {
        public int critical;
        public int warning;
        public int total;
    }

    public static class ContentStats {
        public int photoCoverage;
        public int inscriptionCoverage;
        public int sourceCoverage;
        public int coordinateCoverage;
    }

    public static class DuplicateStats {
        public int count;
        public int rate;
    }

    public static HealthSnapshot fromJson(JSONObject json) {
        if (json == null) return null;
        HealthSnapshot result = new HealthSnapshot();
        result.grade = json.optString("grade", "N/A");
        result.overallScore = json.optInt("overallScore", 0);
        result.dataQuality = json.optInt("dataQuality", 0);
        result.anomalyFree = json.optInt("anomalyFree", 0);
        result.contentCoverage = json.optInt("contentCoverage", 0);
        result.duplicateFree = json.optInt("duplicateFree", 0);
        result.completeness = json.optInt("completeness", 0);
        result.coverage = json.optInt("coverage", 0);

        JSONObject a = json.optJSONObject("anomalies");
        if (a != null) {
            result.anomalies = new AnomalyStats();
            result.anomalies.critical = a.optInt("critical", 0);
            result.anomalies.warning = a.optInt("warning", 0);
            result.anomalies.total = a.optInt("total", 0);
        }

        JSONObject c = json.optJSONObject("content");
        if (c != null) {
            result.content = new ContentStats();
            result.content.photoCoverage = c.optInt("photoCoverage", 0);
            result.content.inscriptionCoverage = c.optInt("inscriptionCoverage", 0);
            result.content.sourceCoverage = c.optInt("sourceCoverage", 0);
            result.content.coordinateCoverage = c.optInt("coordinateCoverage", 0);
        }

        JSONObject d = json.optJSONObject("duplicates");
        if (d != null) {
            result.duplicates = new DuplicateStats();
            result.duplicates.count = d.optInt("count", 0);
            result.duplicates.rate = d.optInt("rate", 0);
        }

        return result;
    }

    public String getFormattedGrade() {
        return String.format("%s (%d%%)", grade, overallScore);
    }
}
