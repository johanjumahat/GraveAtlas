package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Result of applying a merge between two records.
 * Returned by POST /api/graves/{idA}/merge/apply/{idB}
 */
public class MergeResult {
    public String mergedRecordId;
    public String mergedFromId;
    public List<AppliedField> appliedFields;
    public List<SkippedField> skippedFields;
    public int totalApplied;
    public int totalSkipped;
    public MergeHistoryEntry mergeHistory;

    public static class AppliedField {
        public String field;
        public String source;    // keep_a, keep_b, keep_either, merge_both, override
        public Object value;
        public String confidence; // may be null for overrides
    }

    public static class SkippedField {
        public String field;
        public String reason;
    }

    public static class MergeHistoryEntry {
        public String mergedFromId;
        public String mergedFromName;
        public String mergedAt;
        public String mergedBy;
        public int fieldsApplied;
        public int fieldsSkipped;
        public int similarityScore;
    }

    public static MergeResult fromJson(JSONObject json) {
        MergeResult result = new MergeResult();
        result.mergedRecordId = json.optString("mergedRecordId", null);
        result.mergedFromId = json.optString("mergedFromId", null);
        result.totalApplied = json.optInt("totalApplied", 0);
        result.totalSkipped = json.optInt("totalSkipped", 0);

        // Parse applied fields
        result.appliedFields = new ArrayList<>();
        JSONArray applied = json.optJSONArray("appliedFields");
        if (applied != null) {
            for (int i = 0; i < applied.length(); i++) {
                JSONObject af = applied.optJSONObject(i);
                if (af == null) continue;
                AppliedField field = new AppliedField();
                field.field = af.optString("field", "");
                field.source = af.optString("source", "");
                field.value = af.opt("value");
                field.confidence = af.optString("confidence", null);
                result.appliedFields.add(field);
            }
        }

        // Parse skipped fields
        result.skippedFields = new ArrayList<>();
        JSONArray skipped = json.optJSONArray("skippedFields");
        if (skipped != null) {
            for (int i = 0; i < skipped.length(); i++) {
                JSONObject sf = skipped.optJSONObject(i);
                if (sf == null) continue;
                SkippedField field = new SkippedField();
                field.field = sf.optString("field", "");
                field.reason = sf.optString("reason", "");
                result.skippedFields.add(field);
            }
        }

        // Parse merge history entry
        JSONObject mh = json.optJSONObject("mergeHistory");
        if (mh != null) {
            result.mergeHistory = new MergeHistoryEntry();
            result.mergeHistory.mergedFromId = mh.optString("mergedFromId", null);
            result.mergeHistory.mergedFromName = mh.optString("mergedFromName", "Unknown");
            result.mergeHistory.mergedAt = mh.optString("mergedAt", null);
            result.mergeHistory.mergedBy = mh.optString("mergedBy", "system");
            result.mergeHistory.fieldsApplied = mh.optInt("fieldsApplied", 0);
            result.mergeHistory.fieldsSkipped = mh.optInt("fieldsSkipped", 0);
            result.mergeHistory.similarityScore = mh.optInt("similarityScore", 0);
        }

        return result;
    }

    public String getSummaryLine() {
        return String.format("Merged %s into %s — %d fields applied, %d skipped",
            mergedFromId, mergedRecordId, totalApplied, totalSkipped);
    }
}
