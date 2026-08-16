package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Result of applying auto-fixes to a cemetery.
 * Returned by POST /api/cemeteries/{id}/autofix
 */
public class CemeteryAutoFixResult {
    public String cemeteryId;
    public boolean dryRun;
    public int recordsScanned;
    public int recordsFixed;
    public int recordsFlagged;
    public List<RecordFixResult> results;

    public static class RecordFixResult {
        public String recordId;
        public String recordName;
        public List<AppliedChange> appliedFixes;
        public List<AutoFixProposal> flaggedFixes;
    }

    public static class AppliedChange {
        public String field;
        public String action;
        public String oldValue;
        public String newValue;
        public String reason;
    }

    public static CemeteryAutoFixResult fromJson(JSONObject json) {
        CemeteryAutoFixResult result = new CemeteryAutoFixResult();
        result.cemeteryId = json.optString("cemeteryId", null);
        result.dryRun = json.optBoolean("dryRun", false);
        result.recordsScanned = json.optInt("recordsScanned", 0);
        result.recordsFixed = json.optInt("recordsFixed", 0);
        result.recordsFlagged = json.optInt("recordsFlagged", 0);
        result.results = new ArrayList<>();

        // dryRun returns a flat array of results with fixes
        if (result.dryRun) {
            JSONArray arr = json.optJSONArray("results");
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject r = arr.optJSONObject(i);
                    if (r == null) continue;
                    RecordFixResult rfr = new RecordFixResult();
                    rfr.recordId = r.optString("recordId", null);
                    rfr.recordName = r.optString("recordName", null);
                    rfr.appliedFixes = new ArrayList<>();
                    rfr.flaggedFixes = new ArrayList<>();

                    JSONArray fixes = r.optJSONArray("fixes");
                    if (fixes != null) {
                        for (int j = 0; j < fixes.length(); j++) {
                            JSONObject f = fixes.optJSONObject(j);
                            if (f == null) continue;
                            AutoFixProposal proposal = AutoFixProposal.fromJson(f);
                            if (proposal.isSafe()) {
                                AppliedChange ac = new AppliedChange();
                                ac.field = proposal.field;
                                ac.action = proposal.action;
                                ac.oldValue = proposal.currentValue;
                                ac.newValue = proposal.proposedValue;
                                ac.reason = proposal.reason;
                                rfr.appliedFixes.add(ac);
                            } else {
                                rfr.flaggedFixes.add(proposal);
                            }
                        }
                    }
                    result.results.add(rfr);
                }
            }
        } else {
            JSONObject res = json.optJSONObject("results");
            if (res != null) {
                JSONArray applied = res.optJSONArray("applied");
                if (applied != null) {
                    for (int i = 0; i < applied.length(); i++) {
                        JSONObject r = applied.optJSONObject(i);
                        if (r == null) continue;
                        RecordFixResult rfr = new RecordFixResult();
                        rfr.recordId = r.optString("recordId", null);
                        rfr.recordName = r.optString("recordName", null);
                        rfr.appliedFixes = new ArrayList<>();
                        rfr.flaggedFixes = new ArrayList<>();

                        JSONArray af = r.optJSONArray("appliedFixes");
                        if (af != null) {
                            for (int j = 0; j < af.length(); j++) {
                                JSONObject f = af.optJSONObject(j);
                                if (f == null) continue;
                                AppliedChange ac = new AppliedChange();
                                ac.field = f.optString("field", "");
                                ac.action = f.optString("action", "");
                                ac.oldValue = f.optString("oldValue", null);
                                if ("null".equals(ac.oldValue)) ac.oldValue = null;
                                ac.newValue = f.optString("newValue", "");
                                ac.reason = f.optString("reason", "");
                                rfr.appliedFixes.add(ac);
                            }
                        }

                        JSONArray ff = r.optJSONArray("flaggedFixes");
                        if (ff != null) {
                            rfr.flaggedFixes = AutoFixProposal.fromJsonArray(ff);
                        }

                        result.results.add(rfr);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Returns a summary line.
     */
    public String getSummaryLine() {
        if (dryRun) {
            return String.format("Dry run: %d records would be fixed, %d flagged for review",
                recordsFixed, recordsFlagged);
        }
        return String.format("Fixed %d records, flagged %d for review", recordsFixed, recordsFlagged);
    }
}
