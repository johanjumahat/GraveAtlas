package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Global quality report across all cemeteries.
 * Returned by GET /api/reports/global
 */
public class GlobalReport {
    public String reportId;
    public String generatedAt;
    public int totalCemeteries;
    public int totalRecords;
    public HealthSnapshot globalHealth;
    public GlobalContentCoverage globalContentCoverage;
    public List<CemeteryBreakdownEntry> cemeteryBreakdown;
    public ReportMeta reportMetadata;

    public static class GlobalContentCoverage {
        public int totalWithPhotos;
        public int totalWithSources;
        public int totalWithInscriptions;
        public int totalWithCoordinates;
        public int totalWithBirthDate;
        public int totalWithDeathDate;

        public int getPhotoPercent(int total) {
            return total > 0 ? Math.round((totalWithPhotos * 100f) / total) : 0;
        }
        public int getSourcePercent(int total) {
            return total > 0 ? Math.round((totalWithSources * 100f) / total) : 0;
        }
    }

    public static class CemeteryBreakdownEntry {
        public String cemeteryId;
        public int recordCount;
        public int withPhotos;
        public int withSources;
        public int withInscriptions;
        public int criticalAnomalies;
    }

    public static class ReportMeta {
        public String version;
        public String schema;
        public String generator;
        public String license;
    }

    public static GlobalReport fromJson(JSONObject json) {
        GlobalReport result = new GlobalReport();
        result.reportId = json.optString("reportId", null);
        result.generatedAt = json.optString("generatedAt", null);
        result.totalCemeteries = json.optInt("totalCemeteries", 0);
        result.totalRecords = json.optInt("totalRecords", 0);

        result.globalHealth = HealthSnapshot.fromJson(json.optJSONObject("globalHealth"));

        JSONObject gcc = json.optJSONObject("globalContentCoverage");
        if (gcc != null) {
            result.globalContentCoverage = new GlobalContentCoverage();
            result.globalContentCoverage.totalWithPhotos = gcc.optInt("totalWithPhotos", 0);
            result.globalContentCoverage.totalWithSources = gcc.optInt("totalWithSources", 0);
            result.globalContentCoverage.totalWithInscriptions = gcc.optInt("totalWithInscriptions", 0);
            result.globalContentCoverage.totalWithCoordinates = gcc.optInt("totalWithCoordinates", 0);
            result.globalContentCoverage.totalWithBirthDate = gcc.optInt("totalWithBirthDate", 0);
            result.globalContentCoverage.totalWithDeathDate = gcc.optInt("totalWithDeathDate", 0);
        }

        result.cemeteryBreakdown = new ArrayList<>();
        JSONArray cb = json.optJSONArray("cemeteryBreakdown");
        if (cb != null) {
            for (int i = 0; i < cb.length(); i++) {
                JSONObject entry = cb.optJSONObject(i);
                if (entry == null) continue;
                CemeteryBreakdownEntry e = new CemeteryBreakdownEntry();
                e.cemeteryId = entry.optString("cemeteryId", "");
                e.recordCount = entry.optInt("recordCount", 0);
                e.withPhotos = entry.optInt("withPhotos", 0);
                e.withSources = entry.optInt("withSources", 0);
                e.withInscriptions = entry.optInt("withInscriptions", 0);
                e.criticalAnomalies = entry.optInt("criticalAnomalies", 0);
                result.cemeteryBreakdown.add(e);
            }
        }

        JSONObject rm = json.optJSONObject("reportMetadata");
        if (rm != null) {
            result.reportMetadata = new ReportMeta();
            result.reportMetadata.version = rm.optString("version", "1.0");
            result.reportMetadata.schema = rm.optString("schema", "");
            result.reportMetadata.generator = rm.optString("generator", "");
            result.reportMetadata.license = rm.optString("license", "");
        }

        return result;
    }

    public String getSummaryLine() {
        if (globalHealth == null) return "No data";
        return String.format("%d cemeteries, %d records | Grade %s (%d%%)",
            totalCemeteries, totalRecords, globalHealth.grade, globalHealth.overallScore);
    }
}
