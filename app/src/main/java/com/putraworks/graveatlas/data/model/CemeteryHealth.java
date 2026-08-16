package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

/**
 * Cemetery health dashboard — composite quality score.
 * Returned by GET /api/cemeteries/{id}/health
 */
public class CemeteryHealth {
    public String cemeteryId;
    public String cemeteryName;
    public HealthData health;

    public static class HealthData {
        public String grade; // A, B, C, D, F, N/A
        public String gradeColor; // green, yellow, orange, red
        public int overallScore;
        public String recommendation;
        public int recordCount;
        public ScoreBreakdown scores;
        public AnomalySummary anomalies;
        public EnrichmentSummary enrichment;
        public DuplicateSummary duplicates;
        public ConnectionSummary connections;
        public ContentCoverage content;
        public int completeness;
        public int coverage;
        public JSONObject fieldCoverage;
        public int medianDeathYear;
    }

    public static class ScoreBreakdown {
        public int dataQuality;
        public int anomalyFree;
        public int enrichmentCoverage;
        public int duplicateFree;
        public int contentCoverage;
    }

    public static class AnomalySummary {
        public int critical;
        public int warning;
        public int info;
        public int total;
        public int rate;
        public Map<String, Integer> byType;
    }

    public static class EnrichmentSummary {
        public int recordsNeedingEnrichment;
        public int enrichmentRate;
    }

    public static class DuplicateSummary {
        public int count;
        public int rate;
    }

    public static class ConnectionSummary {
        public int familyGroups;
        public int connectionDensity;
    }

    public static class ContentCoverage {
        public int photoCoverage;
        public int inscriptionCoverage;
        public int sourceCoverage;
        public int coordinateCoverage;
    }

    public static CemeteryHealth fromJson(JSONObject json) {
        CemeteryHealth result = new CemeteryHealth();
        result.cemeteryId = json.optString("cemeteryId", null);
        result.cemeteryName = json.optString("cemeteryName", null);

        JSONObject h = json.optJSONObject("health");
        if (h == null) return result;

        result.health = new HealthData();
        result.health.grade = h.optString("grade", "N/A");
        result.health.gradeColor = h.optString("gradeColor", "gray");
        result.health.overallScore = h.optInt("overallScore", 0);
        result.health.recommendation = h.optString("recommendation", "");
        result.health.recordCount = h.optInt("recordCount", 0);
        result.health.completeness = h.optInt("completeness", 0);
        result.health.coverage = h.optInt("coverage", 0);
        result.health.medianDeathYear = h.optInt("medianDeathYear", 0);
        result.health.fieldCoverage = h.optJSONObject("fieldCoverage");

        // Parse scores
        JSONObject s = h.optJSONObject("scores");
        if (s != null) {
            result.health.scores = new ScoreBreakdown();
            result.health.scores.dataQuality = s.optInt("dataQuality", 0);
            result.health.scores.anomalyFree = s.optInt("anomalyFree", 0);
            result.health.scores.enrichmentCoverage = s.optInt("enrichmentCoverage", 0);
            result.health.scores.duplicateFree = s.optInt("duplicateFree", 0);
            result.health.scores.contentCoverage = s.optInt("contentCoverage", 0);
        }

        // Parse anomalies
        JSONObject a = h.optJSONObject("anomalies");
        if (a != null) {
            result.health.anomalies = new AnomalySummary();
            result.health.anomalies.critical = a.optInt("critical", 0);
            result.health.anomalies.warning = a.optInt("warning", 0);
            result.health.anomalies.info = a.optInt("info", 0);
            result.health.anomalies.total = a.optInt("total", 0);
            result.health.anomalies.rate = a.optInt("rate", 0);

            result.health.anomalies.byType = new HashMap<>();
            JSONObject bt = a.optJSONObject("byType");
            if (bt != null) {
                JSONArray keys = bt.names();
                if (keys != null) {
                    for (int i = 0; i < keys.length(); i++) {
                        String key = keys.optString(i);
                        result.health.anomalies.byType.put(key, bt.optInt(key, 0));
                    }
                }
            }
        }

        // Parse enrichment
        JSONObject e = h.optJSONObject("enrichment");
        if (e != null) {
            result.health.enrichment = new EnrichmentSummary();
            result.health.enrichment.recordsNeedingEnrichment = e.optInt("recordsNeedingEnrichment", 0);
            result.health.enrichment.enrichmentRate = e.optInt("enrichmentRate", 0);
        }

        // Parse duplicates
        JSONObject d = h.optJSONObject("duplicates");
        if (d != null) {
            result.health.duplicates = new DuplicateSummary();
            result.health.duplicates.count = d.optInt("count", 0);
            result.health.duplicates.rate = d.optInt("rate", 0);
        }

        // Parse connections
        JSONObject c = h.optJSONObject("connections");
        if (c != null) {
            result.health.connections = new ConnectionSummary();
            result.health.connections.familyGroups = c.optInt("familyGroups", 0);
            result.health.connections.connectionDensity = c.optInt("connectionDensity", 0);
        }

        // Parse content
        JSONObject ct = h.optJSONObject("content");
        if (ct != null) {
            result.health.content = new ContentCoverage();
            result.health.content.photoCoverage = ct.optInt("photoCoverage", 0);
            result.health.content.inscriptionCoverage = ct.optInt("inscriptionCoverage", 0);
            result.health.content.sourceCoverage = ct.optInt("sourceCoverage", 0);
            result.health.content.coordinateCoverage = ct.optInt("coordinateCoverage", 0);
        }

        return result;
    }

    /**
     * Returns true if the cemetery has critical issues.
     */
    public boolean hasCriticalIssues() {
        return health != null && health.anomalies != null && health.anomalies.critical > 0;
    }

    /**
     * Returns a formatted grade string like "A (92%)".
     */
    public String getFormattedGrade() {
        if (health == null) return "N/A";
        return String.format("%s (%d%%)", health.grade, health.overallScore);
    }

    /**
     * Returns the emoji color indicator for the grade.
     */
    public String getGradeEmoji() {
        if (health == null) return "⚪";
        switch (health.gradeColor) {
            case "green": return "🟢";
            case "yellow": return "🟡";
            case "orange": return "🟠";
            case "red": return "🔴";
            default: return "⚪";
        }
    }
}
