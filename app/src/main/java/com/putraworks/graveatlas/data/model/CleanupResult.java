package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Cleanup pass result — before/after health comparison.
 * Returned by POST /api/cemeteries/{id}/cleanup and GET /api/cemeteries/{id}/cleanup/preview
 */
public class CleanupResult {
    public String cemeteryId;
    public boolean dryRun;
    public int recordCount;
    public HealthSnapshot before;
    public HealthSnapshot after;
    public CleanupImprovement improvement;
    public CleanupFixes fixes;
    public List<AppliedDetail> appliedDetails;

    public static class CleanupImprovement {
        public int scoreDelta;
        public String gradeChange;     // null if no change, else "C → B"
        public int anomalyReduction;
        public int contentCoverageGain;
        // Preview-only fields
        public int fixesProposed;
        public int safeFixes;
        public int riskyFixes;
        public Map<String, Integer> fixTypeCounts;
    }

    public static class CleanupFixes {
        public int totalApplied;
        public int totalFlagged;
        public int recordsFixed;
        public Map<String, Integer> byType;
    }

    public static class AppliedDetail {
        public String recordId;
        public String recordName;
        public int fixesApplied;
        public int flagged;
    }

    public static CleanupResult fromJson(JSONObject json) {
        CleanupResult result = new CleanupResult();
        result.cemeteryId = json.optString("cemeteryId", null);
        result.dryRun = json.optBoolean("dryRun", false);
        result.recordCount = json.optInt("recordCount", 0);

        result.before = HealthSnapshot.fromJson(json.optJSONObject("before"));
        result.after = HealthSnapshot.fromJson(json.optJSONObject("after"));

        JSONObject imp = json.optJSONObject("improvement");
        if (imp != null) {
            result.improvement = new CleanupImprovement();
            result.improvement.scoreDelta = imp.optInt("scoreDelta", 0);
            result.improvement.gradeChange = imp.optString("gradeChange", null);
            if ("null".equals(result.improvement.gradeChange)) result.improvement.gradeChange = null;
            result.improvement.anomalyReduction = imp.optInt("anomalyReduction", 0);
            result.improvement.contentCoverageGain = imp.optInt("contentCoverageGain", 0);

            // Preview-only fields
            result.improvement.fixesProposed = imp.optInt("fixesProposed", 0);
            result.improvement.safeFixes = imp.optInt("safeFixes", 0);
            result.improvement.riskyFixes = imp.optInt("riskyFixes", 0);

            result.improvement.fixTypeCounts = new HashMap<>();
            JSONObject ftc = imp.optJSONObject("fixTypeCounts");
            if (ftc != null) {
                JSONArray keys = ftc.names();
                if (keys != null) {
                    for (int i = 0; i < keys.length(); i++) {
                        String key = keys.optString(i);
                        result.improvement.fixTypeCounts.put(key, ftc.optInt(key, 0));
                    }
                }
            }
        }

        JSONObject fx = json.optJSONObject("fixes");
        if (fx != null) {
            result.fixes = new CleanupFixes();
            result.fixes.totalApplied = fx.optInt("totalApplied", 0);
            result.fixes.totalFlagged = fx.optInt("totalFlagged", 0);
            result.fixes.recordsFixed = fx.optInt("recordsFixed", 0);

            result.fixes.byType = new HashMap<>();
            JSONObject bt = fx.optJSONObject("byType");
            if (bt != null) {
                JSONArray keys = bt.names();
                if (keys != null) {
                    for (int i = 0; i < keys.length(); i++) {
                        String key = keys.optString(i);
                        result.fixes.byType.put(key, bt.optInt(key, 0));
                    }
                }
            }
        }

        result.appliedDetails = new ArrayList<>();
        JSONArray ad = json.optJSONArray("appliedDetails");
        if (ad != null) {
            for (int i = 0; i < ad.length(); i++) {
                JSONObject d = ad.optJSONObject(i);
                if (d == null) continue;
                AppliedDetail detail = new AppliedDetail();
                detail.recordId = d.optString("recordId", null);
                detail.recordName = d.optString("recordName", null);
                detail.fixesApplied = d.optInt("fixesApplied", 0);
                detail.flagged = d.optInt("flagged", 0);
                result.appliedDetails.add(detail);
            }
        }

        return result;
    }

    /**
     * Returns true if the cleanup improved the health score.
     */
    public boolean hasImprovement() {
        return improvement != null && improvement.scoreDelta > 0;
    }

    /**
     * Returns a formatted before→after summary.
     */
    public String getBeforeAfterSummary() {
        if (before == null || after == null) return "No data";
        String gradeStr = improvement != null && improvement.gradeChange != null
            ? " (" + improvement.gradeChange + ")" : "";
        return String.format("%s → %s%s | +%d points",
            before.getFormattedGrade(), after.getFormattedGrade(), gradeStr, improvement != null ? improvement.scoreDelta : 0);
    }
}
