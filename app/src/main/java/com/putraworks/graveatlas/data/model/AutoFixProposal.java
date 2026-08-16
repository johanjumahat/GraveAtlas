package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Proposed auto-fix for a single field in a record.
 */
public class AutoFixProposal {
    public String recordId;
    public String recordName;
    public String field;          // name, birthDate, deathDate, givenNames, familyName, etc.
    public String action;         // add, normalize, estimate, swap, trim, swap_dates
    public String currentValue;   // nullable — current value (or null if adding)
    public String proposedValue;  // the proposed new value
    public String confidence;     // high, medium
    public String reason;          // explanation of why the fix is proposed

    /**
     * Returns true if this is a high-confidence fix that can be auto-applied.
     */
    public boolean isSafe() {
        return "high".equals(confidence);
    }

    /**
     * Returns a human-readable label for the action.
     */
    public String getActionLabel() {
        switch (action) {
            case "add": return "Add missing field";
            case "normalize": return "Normalize format";
            case "estimate": return "Estimate value";
            case "swap": return "Fix swapped coordinates";
            case "trim": return "Trim whitespace";
            case "swap_dates": return "Fix swapped dates";
            default: return action;
        }
    }

    /**
     * Returns the emoji icon for this fix type.
     */
    public String getIcon() {
        switch (action) {
            case "add": return "➕";
            case "normalize": return "🔄";
            case "estimate": return "💡";
            case "swap": return "🔄";
            case "trim": return "✂️";
            case "swap_dates": return "📅";
            default: return "🔧";
        }
    }

    public static AutoFixProposal fromJson(JSONObject json) {
        AutoFixProposal fix = new AutoFixProposal();
        fix.recordId = json.optString("recordId", null);
        fix.recordName = json.optString("recordName", null);
        fix.field = json.optString("field", "");
        fix.action = json.optString("action", "");
        fix.currentValue = json.optString("currentValue", null);
        if ("null".equals(fix.currentValue)) fix.currentValue = null;
        fix.proposedValue = json.optString("proposedValue", "");
        fix.confidence = json.optString("confidence", "medium");
        fix.reason = json.optString("reason", "");
        return fix;
    }

    public static List<AutoFixProposal> fromJsonArray(JSONArray arr) {
        List<AutoFixProposal> list = new ArrayList<>();
        if (arr == null) return list;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject obj = arr.optJSONObject(i);
            if (obj != null) list.add(fromJson(obj));
        }
        return list;
    }
}
