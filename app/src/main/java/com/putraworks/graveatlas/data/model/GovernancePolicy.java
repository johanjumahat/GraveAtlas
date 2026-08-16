package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * A governance policy (retention, privacy, access, classification, consent, deletion).
 * Created via POST /api/governance/policies
 */
public class GovernancePolicy {
    public String id;
    public String type;        // retention, privacy, access, classification, consent, deletion
    public String name;
    public String description;
    public JSONObject rules;
    public Integer retentionDays;
    public String classification; // public, internal, restricted, confidential
    public String createdBy;
    public String createdAt;
    public String updatedAt;
    public boolean enabled;
    public int appliedCount;
    public String lastApplied;

    public static GovernancePolicy fromJson(JSONObject json) {
        GovernancePolicy result = new GovernancePolicy();
        result.id = json.optString("id", "");
        result.type = json.optString("type", "");
        result.name = json.optString("name", "");
        result.description = json.optString("description", "");
        result.rules = json.optJSONObject("rules");
        result.retentionDays = json.has("retentionDays") && !json.isNull("retentionDays")
            ? json.optInt("retentionDays") : null;
        result.classification = json.optString("classification", "internal");
        result.createdBy = json.optString("createdBy", "system");
        result.createdAt = json.optString("createdAt", null);
        result.updatedAt = json.optString("updatedAt", null);
        result.enabled = json.optBoolean("enabled", true);
        result.appliedCount = json.optInt("appliedCount", 0);
        result.lastApplied = json.optString("lastApplied", null);
        return result;
    }

    public boolean isActive() { return enabled; }
    public boolean hasRetention() { return retentionDays != null && retentionDays > 0; }

    public String getTypeIcon() {
        switch (type) {
            case "retention": return "⏳";
            case "privacy": return "🔒";
            case "access": return "🔑";
            case "classification": return "🏷️";
            case "consent": return "✅";
            case "deletion": return "🗑️";
            default: return "📋";
        }
    }

    public String getSummaryLine() {
        String status = enabled ? "active" : "disabled";
        String retention = retentionDays != null ? String.format(", %d-day retention", retentionDays) : "";
        return String.format("%s %s — %s (%s%s, applied %d times)",
            getTypeIcon(), name, type, status, retention, appliedCount);
    }
}
