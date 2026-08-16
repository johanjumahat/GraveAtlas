package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Single record auto-fix result.
 * Returned by POST /api/graves/{id}/autofix and POST /api/graves/{id}/autofix/apply
 */
public class RecordAutoFixResult {
    public String recordId;
    public String recordName;
    public List<AutoFixProposal> proposedFixes;
    public int totalFixes;
    public int highConfidence;
    public int mediumConfidence;
    public boolean hasSafeFixes;
    public boolean hasRiskyFixes;

    // For apply endpoint
    public int applied;
    public int flagged;
    public List<AppliedChange> changes;
    public List<AutoFixProposal> flaggedFixes;

    public static class AppliedChange {
        public String field;
        public String action;
        public String oldValue;
        public String newValue;
        public String reason;
    }

    public static RecordAutoFixResult fromJson(JSONObject json) {
        RecordAutoFixResult result = new RecordAutoFixResult();
        result.recordId = json.optString("recordId", null);
        result.recordName = json.optString("recordName", null);
        result.totalFixes = json.optInt("totalFixes", 0);
        result.highConfidence = json.optInt("highConfidence", 0);
        result.mediumConfidence = json.optInt("mediumConfidence", 0);
        result.hasSafeFixes = json.optBoolean("hasSafeFixes", false);
        result.hasRiskyFixes = json.optBoolean("hasRiskyFixes", false);
        result.applied = json.optInt("applied", 0);
        result.flagged = json.optInt("flagged", 0);

        result.proposedFixes = new ArrayList<>();
        JSONArray pf = json.optJSONArray("proposedFixes");
        if (pf != null) {
            result.proposedFixes = AutoFixProposal.fromJsonArray(pf);
        }

        result.changes = new ArrayList<>();
        JSONArray ch = json.optJSONArray("changes");
        if (ch != null) {
            for (int i = 0; i < ch.length(); i++) {
                JSONObject c = ch.optJSONObject(i);
                if (c == null) continue;
                AppliedChange ac = new AppliedChange();
                ac.field = c.optString("field", "");
                ac.action = c.optString("action", "");
                ac.oldValue = c.optString("oldValue", null);
                if ("null".equals(ac.oldValue)) ac.oldValue = null;
                ac.newValue = c.optString("newValue", "");
                ac.reason = c.optString("reason", "");
                result.changes.add(ac);
            }
        }

        result.flaggedFixes = new ArrayList<>();
        JSONArray ff = json.optJSONArray("flaggedFixes");
        if (ff != null) {
            result.flaggedFixes = AutoFixProposal.fromJsonArray(ff);
        }

        return result;
    }

    /**
     * Returns true if the record is clean (no fixes needed).
     */
    public boolean isClean() {
        return totalFixes == 0 && applied == 0;
    }

    /**
     * Returns a summary line.
     */
    public String getSummaryLine() {
        if (isClean()) return "No fixes needed";
        if (applied > 0) {
            return String.format("Applied %d fix(es)", applied);
        }
        return String.format("%d fixes proposed (%d safe, %d need review)",
            totalFixes, highConfidence, mediumConfidence);
    }
}
