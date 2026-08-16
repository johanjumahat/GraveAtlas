package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * Import batch report — full report with quality scores + metadata summary.
 * Returned by POST /api/import/batch-report
 */
public class ImportBatchReport {
    public String sourceName;
    public String license;
    public int batchSize;
    public String generatedAt;
    public QualitySummary quality;
    public BatchMetadata metadata;
    public JSONObject fieldCoverage;
    public int errorCount;
    public int warningCount;

    public static class QualitySummary {
        public int completeness;
        public int coverage;
        public int consistency;
        public int overall;
        public String recommendation;
    }

    public static class BatchMetadata {
        public int uniqueCemeteries;
        public int uniqueCountries;
        public int recordsWithPhotos;
        public int recordsWithInscriptions;
        public int recordsWithSources;
        public int recordsWithCoordinates;
        public int dateRangeStart;
        public int dateRangeEnd;
    }

    public static ImportBatchReport fromJson(JSONObject json) {
        ImportBatchReport report = new ImportBatchReport();

        JSONObject batchReport = json.optJSONObject("batchReport");
        if (batchReport == null) return report;

        report.sourceName = batchReport.optString("sourceName", "Unknown");
        report.license = batchReport.optString("license", "Not specified");
        report.batchSize = batchReport.optInt("batchSize", 0);
        report.generatedAt = batchReport.optString("generatedAt", "");
        report.errorCount = batchReport.optInt("errorCount", 0);
        report.warningCount = batchReport.optInt("warningCount", 0);
        report.fieldCoverage = batchReport.optJSONObject("fieldCoverage");

        // Parse quality
        JSONObject q = batchReport.optJSONObject("quality");
        if (q != null) {
            report.quality = new QualitySummary();
            report.quality.completeness = q.optInt("completeness", 0);
            report.quality.coverage = q.optInt("coverage", 0);
            report.quality.consistency = q.optInt("consistency", 0);
            report.quality.overall = q.optInt("overall", 0);
            report.quality.recommendation = q.optString("recommendation", "review");
        }

        // Parse metadata
        JSONObject m = batchReport.optJSONObject("metadata");
        if (m != null) {
            report.metadata = new BatchMetadata();
            report.metadata.uniqueCemeteries = m.optInt("uniqueCemeteries", 0);
            report.metadata.uniqueCountries = m.optInt("uniqueCountries", 0);
            report.metadata.recordsWithPhotos = m.optInt("recordsWithPhotos", 0);
            report.metadata.recordsWithInscriptions = m.optInt("recordsWithInscriptions", 0);
            report.metadata.recordsWithSources = m.optInt("recordsWithSources", 0);
            report.metadata.recordsWithCoordinates = m.optInt("recordsWithCoordinates", 0);

            JSONObject dr = m.optJSONObject("dateRange");
            if (dr != null) {
                report.metadata.dateRangeStart = dr.optInt("start", 0);
                report.metadata.dateRangeEnd = dr.optInt("end", 0);
            }
        }

        return report;
    }

    /**
     * Returns a one-line summary string.
     */
    public String getSummaryLine() {
        if (quality == null) return "No quality data";
        return String.format("%d records | Overall: %d%% | %s",
            batchSize, quality.overall, quality.recommendation);
    }
}
