package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * A watchlist item monitoring a cemetery or individual record.
 * Tracks health changes, new anomalies, unapplied fixes, duplicates, and missing data.
 */
public class WatchlistItem {
    public String id;
    public String targetType;    // "cemetery" or "record"
    public String targetId;
    public String label;
    public String[] watchFor;
    public String createdAt;
    public String lastChecked;
    public WatchStatus lastStatus;
    public boolean active;

    public static class WatchStatus {
        public int healthScore;
        public String healthGrade;
        public int anomalyCount;
        public int criticalAnomalies;
        public int recordCount;
    }

    public static WatchlistItem fromJson(JSONObject json) {
        WatchlistItem result = new WatchlistItem();
        result.id = json.optString("id", null);
        result.targetType = json.optString("targetType", "");
        result.targetId = json.optString("targetId", "");
        result.label = json.optString("label", "");
        result.createdAt = json.optString("createdAt", null);
        result.lastChecked = json.optString("lastChecked", null);
        result.active = json.optBoolean("active", true);

        // Parse watchFor array
        org.json.JSONArray wf = json.optJSONArray("watchFor");
        if (wf != null) {
            result.watchFor = new String[wf.length()];
            for (int i = 0; i < wf.length(); i++) {
                result.watchFor[i] = wf.optString(i);
            }
        } else {
            result.watchFor = new String[0];
        }

        JSONObject ls = json.optJSONObject("lastStatus");
        if (ls != null) {
            result.lastStatus = new WatchStatus();
            result.lastStatus.healthScore = ls.optInt("healthScore", 0);
            result.lastStatus.healthGrade = ls.optString("healthGrade", "N/A");
            result.lastStatus.anomalyCount = ls.optInt("anomalyCount", 0);
            result.lastStatus.criticalAnomalies = ls.optInt("criticalAnomalies", 0);
            result.lastStatus.recordCount = ls.optInt("recordCount", 0);
        }

        return result;
    }

    public boolean isCemeteryWatch() {
        return "cemetery".equals(targetType);
    }

    public boolean isRecordWatch() {
        return "record".equals(targetType);
    }

    public boolean watchesFor(String type) {
        if (watchFor == null) return false;
        for (String w : watchFor) {
            if (w.equals(type)) return true;
        }
        return false;
    }

    public String getDisplayLabel() {
        if (label != null && !label.isEmpty()) return label;
        return targetType + ": " + targetId;
    }
}
