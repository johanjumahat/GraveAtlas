package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Analytics dashboard with key metrics across records, confidence, sources,
 * cemeteries, and health.
 * Returned by GET /api/analytics/dashboard
 */
public class AnalyticsDashboard {
    public String timeRange;
    public String generatedAt;
    public DashboardSummary summary;
    public DashboardConfidence confidence;
    public DashboardSources sources;
    public DashboardCemeteries cemeteries;
    public DashboardHealth health;

    public static class DashboardSummary {
        public int totalRecords;
        public int recentRecords;
        public int verifiedRecords;
        public int unverifiedRecords;
        public int verificationRate;
        public int recordsWithCoordinates;
        public int recordsWithSources;
        public int recordsWithAnomalies;
        public int coordinateCoverage;
        public int sourceCoverage;
        public int anomalyRate;
    }

    public static class DashboardConfidence {
        public int averageScore;
        public int high, medium, low;
        public ConfidenceDistribution distribution;

        public static class ConfidenceDistribution {
            public int high, medium, low;
        }
    }

    public static class DashboardSources {
        public int totalReferences;
        public double averagePerRecord;
        public int recordsWithSources;
        public int recordsWithoutSources;
    }

    public static class DashboardCemeteries {
        public int totalCemeteries;
        public List<CemeteryEntry> topCemeteries;

        public static class CemeteryEntry {
            public String cemeteryId;
            public int total;
            public int verified;
            public int withAnomalies;
        }
    }

    public static class DashboardHealth {
        public int overallScore;
        public int anomalyRate;
        public int verificationRate;
        public int sourceRate;
        public int coordinateRate;
    }

    public static AnalyticsDashboard fromJson(JSONObject json) {
        AnalyticsDashboard result = new AnalyticsDashboard();
        JSONObject d = json.optJSONObject("dashboard");
        if (d == null) d = json;

        result.timeRange = d.optString("timeRange", "30d");
        result.generatedAt = d.optString("generatedAt", null);

        JSONObject s = d.optJSONObject("summary");
        if (s != null) {
            result.summary = new DashboardSummary();
            result.summary.totalRecords = s.optInt("totalRecords", 0);
            result.summary.recentRecords = s.optInt("recentRecords", 0);
            result.summary.verifiedRecords = s.optInt("verifiedRecords", 0);
            result.summary.unverifiedRecords = s.optInt("unverifiedRecords", 0);
            result.summary.verificationRate = s.optInt("verificationRate", 0);
            result.summary.recordsWithCoordinates = s.optInt("recordsWithCoordinates", 0);
            result.summary.recordsWithSources = s.optInt("recordsWithSources", 0);
            result.summary.recordsWithAnomalies = s.optInt("recordsWithAnomalies", 0);
            result.summary.coordinateCoverage = s.optInt("coordinateCoverage", 0);
            result.summary.sourceCoverage = s.optInt("sourceCoverage", 0);
            result.summary.anomalyRate = s.optInt("anomalyRate", 0);
        }

        JSONObject c = d.optJSONObject("confidence");
        if (c != null) {
            result.confidence = new DashboardConfidence();
            result.confidence.averageScore = c.optInt("averageScore", 0);
            result.confidence.high = c.optInt("high", 0);
            result.confidence.medium = c.optInt("medium", 0);
            result.confidence.low = c.optInt("low", 0);
            JSONObject dist = c.optJSONObject("distribution");
            if (dist != null) {
                result.confidence.distribution = new DashboardConfidence.ConfidenceDistribution();
                result.confidence.distribution.high = dist.optInt("high", 0);
                result.confidence.distribution.medium = dist.optInt("medium", 0);
                result.confidence.distribution.low = dist.optInt("low", 0);
            }
        }

        JSONObject src = d.optJSONObject("sources");
        if (src != null) {
            result.sources = new DashboardSources();
            result.sources.totalReferences = src.optInt("totalReferences", 0);
            result.sources.averagePerRecord = src.optDouble("averagePerRecord", 0);
            result.sources.recordsWithSources = src.optInt("recordsWithSources", 0);
            result.sources.recordsWithoutSources = src.optInt("recordsWithoutSources", 0);
        }

        JSONObject cem = d.optJSONObject("cemeteries");
        if (cem != null) {
            result.cemeteries = new DashboardCemeteries();
            result.cemeteries.totalCemeteries = cem.optInt("totalCemeteries", 0);
            result.cemeteries.topCemeteries = new ArrayList<>();
            JSONArray arr = cem.optJSONArray("topCemeteries");
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject ce = arr.optJSONObject(i);
                    if (ce == null) continue;
                    DashboardCemeteries.CemeteryEntry entry = new DashboardCemeteries.CemeteryEntry();
                    entry.cemeteryId = ce.optString("cemeteryId", "");
                    entry.total = ce.optInt("total", 0);
                    entry.verified = ce.optInt("verified", 0);
                    entry.withAnomalies = ce.optInt("withAnomalies", 0);
                    result.cemeteries.topCemeteries.add(entry);
                }
            }
        }

        JSONObject h = d.optJSONObject("health");
        if (h != null) {
            result.health = new DashboardHealth();
            result.health.overallScore = h.optInt("overallScore", 0);
            result.health.anomalyRate = h.optInt("anomalyRate", 0);
            result.health.verificationRate = h.optInt("verificationRate", 0);
            result.health.sourceRate = h.optInt("sourceRate", 0);
            result.health.coordinateRate = h.optInt("coordinateRate", 0);
        }

        return result;
    }

    public String getHealthGrade() {
        int score = health != null ? health.overallScore : 0;
        if (score >= 90) return "A";
        if (score >= 80) return "B";
        if (score >= 70) return "C";
        if (score >= 60) return "D";
        return "F";
    }

    public String getSummaryLine() {
        if (summary == null) return "No dashboard data";
        return String.format("%d records — %d%% verified, %d%% sourced, health: %s",
            summary.totalRecords, summary.verificationRate, summary.sourceCoverage, getHealthGrade());
    }
}
