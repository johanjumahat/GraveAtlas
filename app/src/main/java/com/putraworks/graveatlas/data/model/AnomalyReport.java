package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Cemetery anomaly detection result.
 * Returned by GET /api/cemeteries/{id}/anomalies
 */
public class AnomalyReport {
    public String cemeteryId;
    public int anomalyCount;
    public List<Anomaly> anomalies;
    public AnomalySummary summary;

    public static class Anomaly {
        public String recordId;
        public String recordName;
        public String type; // date_anomaly, name_anomaly, coordinate_anomaly, plot_anomaly, completeness_anomaly, statistical_outlier
        public String severity; // critical, warning, info
        public String message;
        public String field;
        public List<DuplicateRecord> duplicateRecords; // only for plot anomalies
    }

    public static class DuplicateRecord {
        public String id;
        public String name;
    }

    public static class AnomalySummary {
        public int total;
        public int critical;
        public int warning;
        public int info;
        public Map<String, Integer> byType;
        public int recordsScanned;
        public int medianDeathYear;
    }

    public static AnomalyReport fromJson(JSONObject json) {
        AnomalyReport report = new AnomalyReport();
        report.cemeteryId = json.optString("cemeteryId", null);
        report.anomalyCount = json.optInt("anomalyCount", 0);
        report.anomalies = new ArrayList<>();

        JSONArray arr = json.optJSONArray("anomalies");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject a = arr.optJSONObject(i);
                if (a == null) continue;

                Anomaly anomaly = new Anomaly();
                anomaly.recordId = a.optString("recordId", null);
                anomaly.recordName = a.optString("recordName", null);
                anomaly.type = a.optString("type", null);
                anomaly.severity = a.optString("severity", "info");
                anomaly.message = a.optString("message", null);
                anomaly.field = a.optString("field", null);

                // Parse duplicate records if present (plot anomalies)
                anomaly.duplicateRecords = new ArrayList<>();
                JSONArray dups = a.optJSONArray("duplicateRecords");
                if (dups != null) {
                    for (int j = 0; j < dups.length(); j++) {
                        JSONObject d = dups.optJSONObject(j);
                        if (d == null) continue;
                        DuplicateRecord dr = new DuplicateRecord();
                        dr.id = d.optString("id", null);
                        dr.name = d.optString("name", null);
                        anomaly.duplicateRecords.add(dr);
                    }
                }

                report.anomalies.add(anomaly);
            }
        }

        // Parse summary
        JSONObject s = json.optJSONObject("summary");
        if (s != null) {
            report.summary = new AnomalySummary();
            report.summary.total = s.optInt("total", 0);
            report.summary.critical = s.optInt("critical", 0);
            report.summary.warning = s.optInt("warning", 0);
            report.summary.info = s.optInt("info", 0);
            report.summary.recordsScanned = s.optInt("recordsScanned", 0);
            report.summary.medianDeathYear = s.optInt("medianDeathYear", 0);

            report.summary.byType = new HashMap<>();
            JSONObject bt = s.optJSONObject("byType");
            if (bt != null) {
                JSONArray keys = bt.names();
                if (keys != null) {
                    for (int i = 0; i < keys.length(); i++) {
                        String key = keys.optString(i);
                        report.summary.byType.put(key, bt.optInt(key, 0));
                    }
                }
            }
        }

        return report;
    }

    /**
     * Returns only critical anomalies.
     */
    public List<Anomaly> getCriticalAnomalies() {
        List<Anomaly> critical = new ArrayList<>();
        for (Anomaly a : anomalies) {
            if ("critical".equals(a.severity)) critical.add(a);
        }
        return critical;
    }

    /**
     * Returns anomalies filtered by type.
     */
    public List<Anomaly> getAnomaliesByType(String type) {
        List<Anomaly> filtered = new ArrayList<>();
        for (Anomaly a : anomalies) {
            if (type.equals(a.type)) filtered.add(a);
        }
        return filtered;
    }

    /**
     * Returns true if there are any critical anomalies.
     */
    public boolean hasCriticalAnomalies() {
        return summary != null && summary.critical > 0;
    }

    /**
     * Returns records with anomalies (unique by recordId).
     */
    public int getUniqueRecordsWithAnomalies() {
        List<String> ids = new ArrayList<>();
        for (Anomaly a : anomalies) {
            if (a.recordId != null && !ids.contains(a.recordId)) {
                ids.add(a.recordId);
            }
        }
        return ids.size();
    }
}
