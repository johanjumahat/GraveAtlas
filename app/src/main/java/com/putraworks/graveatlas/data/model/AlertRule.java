package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * An alert rule that automatically triggers notifications when conditions are met.
 * Created via POST /api/alerts/rules, retrieved via GET /api/alerts/rules
 */
public class AlertRule {
    public String id;
    public String name;
    public String condition;   // anomaly_count_above, confidence_below, source_dead_above,
                               // duplicate_count_above, review_queue_above, lock_expiry_below, records_below
    public double threshold;
    public String cemeteryId;
    public String type;        // notification type to fire
    public String severity;    // info, warning, critical
    public String message;
    public boolean enabled;
    public String createdBy;
    public String createdAt;
    public String updatedAt;
    public String lastTriggered;
    public int triggerCount;

    public static AlertRule fromJson(JSONObject json) {
        AlertRule result = new AlertRule();
        result.id = json.optString("id", "");
        result.name = json.optString("name", "");
        result.condition = json.optString("condition", "");
        result.threshold = json.optDouble("threshold", 0);
        result.cemeteryId = json.optString("cemeteryId", null);
        result.type = json.optString("type", "custom");
        result.severity = json.optString("severity", "warning");
        result.message = json.optString("message", "");
        result.enabled = json.optBoolean("enabled", true);
        result.createdBy = json.optString("createdBy", "system");
        result.createdAt = json.optString("createdAt", null);
        result.updatedAt = json.optString("updatedAt", null);
        result.lastTriggered = json.optString("lastTriggered", null);
        result.triggerCount = json.optInt("triggerCount", 0);
        return result;
    }

    public boolean isActive() { return enabled; }
    public boolean hasTriggered() { return triggerCount > 0; }

    public String getConditionDescription() {
        switch (condition) {
            case "anomaly_count_above":
                return "Anomalies exceed " + (int) threshold;
            case "confidence_below":
                return "Confidence drops below " + (int) threshold;
            case "source_dead_above":
                return "Dead sources exceed " + (int) threshold;
            case "duplicate_count_above":
                return "Duplicates exceed " + (int) threshold;
            case "review_queue_above":
                return "Review queue exceeds " + (int) threshold;
            case "lock_expiry_below":
                return "Locks expiring within " + (int) threshold + " min";
            case "records_below":
                return "Record count below " + (int) threshold;
            default:
                return condition;
        }
    }

    public String getSummaryLine() {
        String status = enabled ? "active" : "disabled";
        return String.format("%s — %s (%s, triggered %d times)", name, getConditionDescription(), status, triggerCount);
    }
}
