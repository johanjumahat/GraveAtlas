package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Merge proposal for two duplicate records.
 * Contains field-by-field comparison with recommendations.
 * Returned by POST /api/graves/{idA}/merge/preview/{idB}
 */
public class MergeProposal {
    public RecordInfo recordA;
    public RecordInfo recordB;
    public int similarityScore;
    public List<FieldProposal> proposals;
    public ProposalSummary summary;
    public String recommendedAction;  // safe_to_merge, merge_with_caution, manual_review_required

    public static class RecordInfo {
        public String id;
        public String name;
        public String verificationStatus;
        public String cemeteryId;
    }

    public static class FieldProposal {
        public String field;
        public Object valueA;
        public Object valueB;
        public String recommendation;  // keep_a, keep_b, keep_either, merge_both, manual_review
        public Object recommendedValue;
        public String confidence;      // high, medium, low
        public String reason;
    }

    public static class ProposalSummary {
        public int totalFields;
        public int identicalFields;
        public int conflictFields;
        public int resolvedFields;
        public int autoResolvable;
        public int needsManualReview;
    }

    public static MergeProposal fromJson(JSONObject json) {
        MergeProposal result = new MergeProposal();
        result.similarityScore = json.optInt("similarityScore", 0);
        result.recommendedAction = json.optString("recommendedAction", "manual_review_required");

        // Parse recordA
        JSONObject ra = json.optJSONObject("recordA");
        if (ra != null) {
            result.recordA = new RecordInfo();
            result.recordA.id = ra.optString("id", "");
            result.recordA.name = ra.optString("name", "Unknown");
            result.recordA.verificationStatus = ra.optString("verificationStatus", "unverified");
            result.recordA.cemeteryId = ra.optString("cemeteryId", null);
        }

        // Parse recordB
        JSONObject rb = json.optJSONObject("recordB");
        if (rb != null) {
            result.recordB = new RecordInfo();
            result.recordB.id = rb.optString("id", "");
            result.recordB.name = rb.optString("name", "Unknown");
            result.recordB.verificationStatus = rb.optString("verificationStatus", "unverified");
            result.recordB.cemeteryId = rb.optString("cemeteryId", null);
        }

        // Parse proposals
        result.proposals = new ArrayList<>();
        JSONArray arr = json.optJSONArray("proposal");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject p = arr.optJSONObject(i);
                if (p == null) continue;
                FieldProposal fp = new FieldProposal();
                fp.field = p.optString("field", "");
                fp.valueA = p.opt("valueA");
                fp.valueB = p.opt("valueB");
                fp.recommendation = p.optString("recommendation", "manual_review");
                fp.recommendedValue = p.opt("recommendedValue");
                fp.confidence = p.optString("confidence", "low");
                fp.reason = p.optString("reason", "");
                result.proposals.add(fp);
            }
        }

        // Parse summary
        JSONObject s = json.optJSONObject("summary");
        if (s != null) {
            result.summary = new ProposalSummary();
            result.summary.totalFields = s.optInt("totalFields", 0);
            result.summary.identicalFields = s.optInt("identicalFields", 0);
            result.summary.conflictFields = s.optInt("conflictFields", 0);
            result.summary.resolvedFields = s.optInt("resolvedFields", 0);
            result.summary.autoResolvable = s.optInt("autoResolvable", 0);
            result.summary.needsManualReview = s.optInt("needsManualReview", 0);
        }

        return result;
    }

    public boolean isSafeToMerge() {
        return "safe_to_merge".equals(recommendedAction);
    }

    public boolean needsManualReview() {
        return "manual_review_required".equals(recommendedAction);
    }

    public String getSummaryLine() {
        if (summary == null) return "No summary available";
        return String.format("%d fields: %d identical, %d conflicts, %d auto-resolvable, %d need review",
            summary.totalFields, summary.identicalFields, summary.conflictFields,
            summary.autoResolvable, summary.needsManualReview);
    }
}
