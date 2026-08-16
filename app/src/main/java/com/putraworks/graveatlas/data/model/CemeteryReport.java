package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Comprehensive quality report for a cemetery.
 * Returned by GET /api/cemeteries/{id}/report
 */
public class CemeteryReport {
    public String reportId;
    public String generatedAt;
    public String cemeteryId;
    public String cemeteryName;
    public CemeteryMetadata cemeteryMetadata;
    public int recordCount;
    public HealthSnapshot health;
    public ContentCoverage contentCoverage;
    public DateRange dateRange;
    public ReportStats statistics;
    public AnomalySummary anomalySummary;
    public RecommendationsSummary recommendations;
    public CleanupPreviewInfo cleanupPreview;
    public ReportMetadata reportMetadata;

    public static class CemeteryMetadata {
        public String country;
        public String region;
        public String city;
        public String establishedDate;
    }

    public static class ContentCoverage {
        public int withPhotos;
        public int withInscriptions;
        public int withSources;
        public int withCoordinates;
        public int withSection;
        public int withPlot;
        public int withBirthDate;
        public int withDeathDate;
        public int withGivenNames;
        public int withFamilyName;

        public int getPhotoPercent(int total) {
            return total > 0 ? Math.round((withPhotos * 100f) / total) : 0;
        }
        public int getSourcePercent(int total) {
            return total > 0 ? Math.round((withSources * 100f) / total) : 0;
        }
        public int getInscriptionPercent(int total) {
            return total > 0 ? Math.round((withInscriptions * 100f) / total) : 0;
        }
        public int getCoordinatePercent(int total) {
            return total > 0 ? Math.round((withCoordinates * 100f) / total) : 0;
        }
    }

    public static class DateRange {
        public int earliest;
        public int latest;

        public String getFormattedRange() {
            if (earliest == latest) return String.valueOf(earliest);
            return earliest + " – " + latest;
        }
    }

    public static class ReportStats {
        public int totalRecords;
        public int verifiedRecords;
        public int unverified;
        public int communitySubmitted;
        public int withPhotos;
        public int withInscriptions;
        public int withSources;
        public int withCoordinates;
        public int withBirthDate;
        public int withDeathDate;
        public int withGivenNames;
        public int withFamilyName;
        public int withSection;
        public int withPlot;
        public int photoCoverage;
        public int inscriptionCoverage;
        public int sourceCoverage;
        public int coordinateCoverage;
        public int dateCoverage;
        public int nameCoverage;
        public DateRange deathYearRange;
    }

    public static class AnomalySummary {
        public int critical;
        public int warning;
        public int info;
        public int total;
        public JSONObject byType;
    }

    public static class RecommendationsSummary {
        public int total;
        public int critical;
        public int high;
        public int medium;
        public int low;
        public List<TopItem> topItems;

        public static class TopItem {
            public String category;
            public String priority;
            public String title;
            public int affectedRecords;
        }
    }

    public static class CleanupPreviewInfo {
        public String currentGrade;
        public int currentScore;
        public String projectedGrade;
        public int projectedScore;
        public int scoreDelta;
        public int totalProposedFixes;
        public int safeFixes;
        public int riskyFixes;
    }

    public static class ReportMetadata {
        public String version;
        public String schema;
        public String generator;
        public String license;
    }

    public static CemeteryReport fromJson(JSONObject json) {
        CemeteryReport result = new CemeteryReport();
        result.reportId = json.optString("reportId", null);
        result.generatedAt = json.optString("generatedAt", null);
        result.cemeteryId = json.optString("cemeteryId", null);
        result.cemeteryName = json.optString("cemeteryName", "Unknown Cemetery");
        result.recordCount = json.optInt("recordCount", 0);

        result.health = HealthSnapshot.fromJson(json.optJSONObject("health"));

        JSONObject cc = json.optJSONObject("contentCoverage");
        if (cc != null) {
            result.contentCoverage = new ContentCoverage();
            result.contentCoverage.withPhotos = cc.optInt("withPhotos", 0);
            result.contentCoverage.withInscriptions = cc.optInt("withInscriptions", 0);
            result.contentCoverage.withSources = cc.optInt("withSources", 0);
            result.contentCoverage.withCoordinates = cc.optInt("withCoordinates", 0);
            result.contentCoverage.withSection = cc.optInt("withSection", 0);
            result.contentCoverage.withPlot = cc.optInt("withPlot", 0);
            result.contentCoverage.withBirthDate = cc.optInt("withBirthDate", 0);
            result.contentCoverage.withDeathDate = cc.optInt("withDeathDate", 0);
            result.contentCoverage.withGivenNames = cc.optInt("withGivenNames", 0);
            result.contentCoverage.withFamilyName = cc.optInt("withFamilyName", 0);
        }

        JSONObject dr = json.optJSONObject("dateRange");
        if (dr != null) {
            result.dateRange = new DateRange();
            result.dateRange.earliest = dr.optInt("earliest", 0);
            result.dateRange.latest = dr.optInt("latest", 0);
        }

        JSONObject cm = json.optJSONObject("cemeteryMetadata");
        if (cm != null) {
            result.cemeteryMetadata = new CemeteryMetadata();
            result.cemeteryMetadata.country = cm.optString("country", null);
            result.cemeteryMetadata.region = cm.optString("region", null);
            result.cemeteryMetadata.city = cm.optString("city", null);
            result.cemeteryMetadata.establishedDate = cm.optString("establishedDate", null);
        }

        JSONObject stats = json.optJSONObject("statistics");
        if (stats != null) {
            result.statistics = new ReportStats();
            result.statistics.totalRecords = stats.optInt("totalRecords", 0);
            result.statistics.verifiedRecords = stats.optInt("verifiedRecords", 0);
            result.statistics.unverified = stats.optInt("unverified", 0);
            result.statistics.communitySubmitted = stats.optInt("communitySubmitted", 0);
            result.statistics.withPhotos = stats.optInt("withPhotos", 0);
            result.statistics.withInscriptions = stats.optInt("withInscriptions", 0);
            result.statistics.withSources = stats.optInt("withSources", 0);
            result.statistics.withCoordinates = stats.optInt("withCoordinates", 0);
            result.statistics.withBirthDate = stats.optInt("withBirthDate", 0);
            result.statistics.withDeathDate = stats.optInt("withDeathDate", 0);
            result.statistics.withGivenNames = stats.optInt("withGivenNames", 0);
            result.statistics.withFamilyName = stats.optInt("withFamilyName", 0);
            result.statistics.withSection = stats.optInt("withSection", 0);
            result.statistics.withPlot = stats.optInt("withPlot", 0);
            result.statistics.photoCoverage = stats.optInt("photoCoverage", 0);
            result.statistics.inscriptionCoverage = stats.optInt("inscriptionCoverage", 0);
            result.statistics.sourceCoverage = stats.optInt("sourceCoverage", 0);
            result.statistics.coordinateCoverage = stats.optInt("coordinateCoverage", 0);
            result.statistics.dateCoverage = stats.optInt("dateCoverage", 0);
            result.statistics.nameCoverage = stats.optInt("nameCoverage", 0);

            JSONObject dyr = stats.optJSONObject("deathYearRange");
            if (dyr != null) {
                result.statistics.deathYearRange = new DateRange();
                result.statistics.deathYearRange.earliest = dyr.optInt("earliest", 0);
                result.statistics.deathYearRange.latest = dyr.optInt("latest", 0);
            }
        }

        JSONObject as = json.optJSONObject("anomalySummary");
        if (as != null) {
            result.anomalySummary = new AnomalySummary();
            result.anomalySummary.critical = as.optInt("critical", 0);
            result.anomalySummary.warning = as.optInt("warning", 0);
            result.anomalySummary.info = as.optInt("info", 0);
            result.anomalySummary.total = as.optInt("total", 0);
            result.anomalySummary.byType = as.optJSONObject("byType");
        }

        JSONObject recs = json.optJSONObject("recommendations");
        if (recs != null) {
            result.recommendations = new RecommendationsSummary();
            result.recommendations.total = recs.optInt("total", 0);
            result.recommendations.critical = recs.optInt("critical", 0);
            result.recommendations.high = recs.optInt("high", 0);
            result.recommendations.medium = recs.optInt("medium", 0);
            result.recommendations.low = recs.optInt("low", 0);
            result.recommendations.topItems = new ArrayList<>();

            JSONArray items = recs.optJSONArray("topItems");
            if (items != null) {
                for (int i = 0; i < items.length(); i++) {
                    JSONObject item = items.optJSONObject(i);
                    if (item == null) continue;
                    RecommendationsSummary.TopItem ti = new RecommendationsSummary.TopItem();
                    ti.category = item.optString("category", "");
                    ti.priority = item.optString("priority", "");
                    ti.title = item.optString("title", "");
                    ti.affectedRecords = item.optInt("affectedRecords", 0);
                    result.recommendations.topItems.add(ti);
                }
            }
        }

        JSONObject cp = json.optJSONObject("cleanupPreview");
        if (cp != null) {
            result.cleanupPreview = new CleanupPreviewInfo();
            result.cleanupPreview.currentGrade = cp.optString("currentGrade", "");
            result.cleanupPreview.currentScore = cp.optInt("currentScore", 0);
            result.cleanupPreview.projectedGrade = cp.optString("projectedGrade", "");
            result.cleanupPreview.projectedScore = cp.optInt("projectedScore", 0);
            result.cleanupPreview.scoreDelta = cp.optInt("scoreDelta", 0);
            result.cleanupPreview.totalProposedFixes = cp.optInt("totalProposedFixes", 0);
            result.cleanupPreview.safeFixes = cp.optInt("safeFixes", 0);
            result.cleanupPreview.riskyFixes = cp.optInt("riskyFixes", 0);
        }

        JSONObject rm = json.optJSONObject("reportMetadata");
        if (rm != null) {
            result.reportMetadata = new ReportMetadata();
            result.reportMetadata.version = rm.optString("version", "1.0");
            result.reportMetadata.schema = rm.optString("schema", "");
            result.reportMetadata.generator = rm.optString("generator", "");
            result.reportMetadata.license = rm.optString("license", "");
        }

        return result;
    }

    /**
     * Returns a formatted report title.
     */
    public String getReportTitle() {
        return String.format("Quality Report: %s (%s, %d records)",
            cemeteryName, health != null ? health.grade : "?", recordCount);
    }
}
