package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * A single alert generated during a watchlist check.
 * Describes what changed and its severity.
 */
public class WatchAlert {
    public String watchlistItemId;
    public String targetType;      // "cemetery" or "record"
    public String targetId;
    public String label;
    public String alertType;       // health_degradation, new_anomalies, unapplied_fixes,
                                   // duplicate_detected, missing_data
    public String severity;        // critical, high, medium, low
    public String message;
    public int currentValue;
    public Integer previousValue;  // may be null
    public String detectedAt;

    public static WatchAlert fromJson(JSONObject json) {
        WatchAlert result = new WatchAlert();
        result.watchlistItemId = json.optString("watchlistItemId", null);
        result.targetType = json.optString("targetType", "");
        result.targetId = json.optString("targetId", "");
        result.label = json.optString("label", "");
        result.alertType = json.optString("alertType", "");
        result.severity = json.optString("severity", "low");
        result.message = json.optString("message", "");
        result.currentValue = json.optInt("currentValue", 0);

        // Handle null previousValue
        if (json.has("previousValue") && !json.isNull("previousValue")) {
            result.previousValue = json.optInt("previousValue", 0);
        }

        result.detectedAt = json.optString("detectedAt", null);

        return result;
    }

    public boolean isCritical() {
        return "critical".equals(severity);
    }

    public boolean isHigh() {
        return "high".equals(severity);
    }

    public String getFormattedAlertType() {
        switch (alertType) {
            case "health_degradation": return "Health Degradation";
            case "new_anomalies": return "New Anomalies";
            case "unapplied_fixes": return "Unapplied Fixes";
            case "duplicate_detected": return "Duplicate Detected";
            case "missing_data": return "Missing Data";
            default: return alertType;
        }
    }

    public String getSeverityIcon() {
        switch (severity) {
            case "critical": return "🔴";
            case "high": return "🟠";
            case "medium": return "🟡";
            case "low": return "🔵";
            default: return "⚪";
        }
    }
}
