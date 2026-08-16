package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Cemetery-wide source verification report.
 * Returned by POST /api/cemeteries/{id}/sources/verify
 */
public class CemeterySourceVerification {
    public String cemeteryId;
    public int totalRecords;
    public List<RecordVerificationEntry> recordVerifications;
    public CemeteryVerificationSummary cemeterySummary;
    public String verifiedAt;

    public static class RecordVerificationEntry {
        public String recordId;
        public String recordName;
        public int totalSources;
        public RecordSourceVerification.VerificationSummary summary;
    }

    public static class CemeteryVerificationSummary {
        public int totalRecords;
        public int recordsWithSources;
        public int totalSources;
        public int liveSources;
        public int deadSources;
        public String overallStatus;   // verified, partial, unverified, no_sources
        public int verificationScore;
    }

    public static CemeterySourceVerification fromJson(JSONObject json) {
        CemeterySourceVerification result = new CemeterySourceVerification();
        result.cemeteryId = json.optString("cemeteryId", null);
        result.totalRecords = json.optInt("totalRecords", 0);
        result.verifiedAt = json.optString("verifiedAt", null);

        result.recordVerifications = new ArrayList<>();
        JSONArray arr = json.optJSONArray("recordVerifications");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject rv = arr.optJSONObject(i);
                if (rv == null) continue;
                RecordVerificationEntry entry = new RecordVerificationEntry();
                entry.recordId = rv.optString("recordId", null);
                entry.recordName = rv.optString("recordName", "Unknown");
                entry.totalSources = rv.optInt("totalSources", 0);

                JSONObject s = rv.optJSONObject("summary");
                if (s != null) {
                    entry.summary = new RecordSourceVerification.VerificationSummary();
                    entry.summary.total = s.optInt("total", 0);
                    entry.summary.live = s.optInt("live", 0);
                    entry.summary.dead = s.optInt("dead", 0);
                    entry.summary.restricted = s.optInt("restricted", 0);
                    entry.summary.unreachable = s.optInt("unreachable", 0);
                    entry.summary.unverifiable = s.optInt("unverifiable", 0);
                    entry.summary.archived = s.optInt("archived", 0);
                    entry.summary.overallStatus = s.optString("overallStatus", "unverified");
                    entry.summary.overallConfidence = s.optInt("overallConfidence", 0);
                    entry.summary.verificationScore = s.optInt("verificationScore", 0);
                }
                result.recordVerifications.add(entry);
            }
        }

        JSONObject cs = json.optJSONObject("cemeterySummary");
        if (cs != null) {
            result.cemeterySummary = new CemeteryVerificationSummary();
            result.cemeterySummary.totalRecords = cs.optInt("totalRecords", 0);
            result.cemeterySummary.recordsWithSources = cs.optInt("recordsWithSources", 0);
            result.cemeterySummary.totalSources = cs.optInt("totalSources", 0);
            result.cemeterySummary.liveSources = cs.optInt("liveSources", 0);
            result.cemeterySummary.deadSources = cs.optInt("deadSources", 0);
            result.cemeterySummary.overallStatus = cs.optString("overallStatus", "unverified");
            result.cemeterySummary.verificationScore = cs.optInt("verificationScore", 0);
        }

        return result;
    }

    public boolean isHealthy() {
        return cemeterySummary != null && cemeterySummary.verificationScore >= 80;
    }

    public String getSummaryLine() {
        if (cemeterySummary == null) return "No verification data";
        return String.format("%d records, %d sources — %d live, %d dead — %s (%d%%)",
            cemeterySummary.totalRecords, cemeterySummary.totalSources,
            cemeterySummary.liveSources, cemeterySummary.deadSources,
            cemeterySummary.overallStatus, cemeterySummary.verificationScore);
    }
}
