package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * Data classification record (public, internal, restricted, confidential).
 * Created via POST /api/governance/classify
 */
public class DataClassification {
    public String recordId;
    public String classification; // public, internal, restricted, confidential
    public String classifiedBy;
    public String reason;
    public String classifiedAt;
    public String previousClassification;

    public static DataClassification fromJson(JSONObject json) {
        DataClassification result = new DataClassification();
        result.recordId = json.optString("recordId", "");
        result.classification = json.optString("classification", "internal");
        result.classifiedBy = json.optString("classifiedBy", "system");
        result.reason = json.optString("reason", "");
        result.classifiedAt = json.optString("classifiedAt", null);
        result.previousClassification = json.optString("previousClassification", null);
        return result;
    }

    public boolean isPublic() { return "public".equals(classification); }
    public boolean isInternal() { return "internal".equals(classification); }
    public boolean isRestricted() { return "restricted".equals(classification); }
    public boolean isConfidential() { return "confidential".equals(classification); }
    public boolean hasChanged() { return previousClassification != null && !previousClassification.equals(classification); }

    public String getClassificationIcon() {
        switch (classification) {
            case "public": return "🌍";
            case "internal": return "🏢";
            case "restricted": return "🔒";
            case "confidential": return "🛡️";
            default: return "🏷️";
        }
    }

    public String getSummaryLine() {
        String prev = hasChanged() ? String.format(" (was %s)", previousClassification) : "";
        return String.format("%s %s — by %s%s", getClassificationIcon(), classification, classifiedBy, prev);
    }
}
