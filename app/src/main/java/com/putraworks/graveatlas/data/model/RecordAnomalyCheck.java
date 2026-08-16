package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Single record anomaly check result.
 * Returned by GET /api/graves/{id}/anomaly-check
 */
public class RecordAnomalyCheck {
    public String recordId;
    public String recordName;
    public int anomalyCount;
    public boolean hasCritical;
    public List<AnomalyItem> anomalies;

    public static class AnomalyItem {
        public String type;
        public String severity;
        public String message;
        public String field;
    }

    public static RecordAnomalyCheck fromJson(JSONObject json) {
        RecordAnomalyCheck result = new RecordAnomalyCheck();
        result.recordId = json.optString("recordId", null);
        result.recordName = json.optString("recordName", null);
        result.anomalyCount = json.optInt("anomalyCount", 0);
        result.hasCritical = json.optBoolean("hasCritical", false);
        result.anomalies = new ArrayList<>();

        JSONArray arr = json.optJSONArray("anomalies");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject a = arr.optJSONObject(i);
                if (a == null) continue;

                AnomalyItem item = new AnomalyItem();
                item.type = a.optString("type", null);
                item.severity = a.optString("severity", "info");
                item.message = a.optString("message", null);
                item.field = a.optString("field", null);
                result.anomalies.add(item);
            }
        }

        return result;
    }

    /**
     * Returns only critical anomalies.
     */
    public List<AnomalyItem> getCriticalAnomalies() {
        List<AnomalyItem> critical = new ArrayList<>();
        for (AnomalyItem a : anomalies) {
            if ("critical".equals(a.severity)) critical.add(a);
        }
        return critical;
    }

    /**
     * Returns true if the record is clean (no anomalies).
     */
    public boolean isClean() {
        return anomalyCount == 0;
    }

    /**
     * Returns a human-readable summary.
     */
    public String getSummary() {
        if (isClean()) return "No anomalies detected";
        int critical = getCriticalAnomalies().size();
        if (critical > 0) {
            return critical + " critical issue" + (critical != 1 ? "s" : "") + " found";
        }
        return anomalyCount + " minor issue" + (anomalyCount != 1 ? "s" : "") + " found";
    }
}
