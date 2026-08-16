package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Verification result for all sources of a single record.
 * Returned by POST /api/graves/{id}/sources/verify
 */
public class RecordSourceVerification {
    public String recordId;
    public String recordName;
    public int totalSources;
    public List<SourceVerification> results;
    public VerificationSummary summary;

    public static class VerificationSummary {
        public int total;
        public int live;
        public int dead;
        public int restricted;
        public int unreachable;
        public int unverifiable;
        public int archived;
        public String overallStatus;    // verified, partial, unverified, critical, no_sources
        public int overallConfidence;  // 0-100
        public int verificationScore;   // percentage of live sources
    }

    public static RecordSourceVerification fromJson(JSONObject json) {
        RecordSourceVerification result = new RecordSourceVerification();
        result.recordId = json.optString("recordId", null);
        result.recordName = json.optString("recordName", "Unknown");
        result.totalSources = json.optInt("totalSources", 0);

        result.results = new ArrayList<>();
        JSONArray arr = json.optJSONArray("results");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject sv = arr.optJSONObject(i);
                if (sv != null) result.results.add(SourceVerification.fromJson(sv));
            }
        }

        JSONObject s = json.optJSONObject("summary");
        if (s != null) {
            result.summary = new VerificationSummary();
            result.summary.total = s.optInt("total", 0);
            result.summary.live = s.optInt("live", 0);
            result.summary.dead = s.optInt("dead", 0);
            result.summary.restricted = s.optInt("restricted", 0);
            result.summary.unreachable = s.optInt("unreachable", 0);
            result.summary.unverifiable = s.optInt("unverifiable", 0);
            result.summary.archived = s.optInt("archived", 0);
            result.summary.overallStatus = s.optString("overallStatus", "unverified");
            result.summary.overallConfidence = s.optInt("overallConfidence", 0);
            result.summary.verificationScore = s.optInt("verificationScore", 0);
        }

        return result;
    }

    public boolean isFullyVerified() {
        return summary != null && "verified".equals(summary.overallStatus);
    }

    public boolean hasDeadSources() {
        return summary != null && summary.dead > 0;
    }

    public boolean hasCriticalStatus() {
        return summary != null && "critical".equals(summary.overallStatus);
    }

    public String getSummaryLine() {
        if (summary == null) return "No verification data";
        return String.format("%d sources: %d live, %d dead, %d archived — %s (%d%%)",
            summary.total, summary.live, summary.dead, summary.archived,
            summary.overallStatus, summary.verificationScore);
    }
}
