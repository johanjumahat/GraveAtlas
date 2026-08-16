package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Global cleanup result — aggregated before/after across all cemeteries.
 * Returned by POST /api/cleanup/global
 */
public class GlobalCleanupResult {
    public int totalRecords;
    public int totalCemeteries;
    public HealthSnapshot before;
    public HealthSnapshot after;
    public GlobalImprovement improvement;
    public GlobalFixes fixes;
    public List<CemeteryFixStat> topCemeteries;

    public static class GlobalImprovement {
        public int scoreDelta;
        public String gradeChange;
        public int anomalyReduction;
        public int contentCoverageGain;
    }

    public static class GlobalFixes {
        public int totalProposed;
        public int safeFixes;
        public int riskyFixes;
        public Map<String, Integer> byType;
    }

    public static class CemeteryFixStat {
        public String cemeteryId;
        public int records;
        public int proposedFixes;
    }

    public static GlobalCleanupResult fromJson(JSONObject json) {
        GlobalCleanupResult result = new GlobalCleanupResult();
        result.totalRecords = json.optInt("totalRecords", 0);
        result.totalCemeteries = json.optInt("totalCemeteries", 0);

        result.before = HealthSnapshot.fromJson(json.optJSONObject("before"));
        result.after = HealthSnapshot.fromJson(json.optJSONObject("after"));

        JSONObject imp = json.optJSONObject("improvement");
        if (imp != null) {
            result.improvement = new GlobalImprovement();
            result.improvement.scoreDelta = imp.optInt("scoreDelta", 0);
            result.improvement.gradeChange = imp.optString("gradeChange", null);
            if ("null".equals(result.improvement.gradeChange)) result.improvement.gradeChange = null;
            result.improvement.anomalyReduction = imp.optInt("anomalyReduction", 0);
            result.improvement.contentCoverageGain = imp.optInt("contentCoverageGain", 0);
        }

        JSONObject fx = json.optJSONObject("fixes");
        if (fx != null) {
            result.fixes = new GlobalFixes();
            result.fixes.totalProposed = fx.optInt("totalProposed", 0);
            result.fixes.safeFixes = fx.optInt("safeFixes", 0);
            result.fixes.riskyFixes = fx.optInt("riskyFixes", 0);

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

        result.topCemeteries = new ArrayList<>();
        JSONArray tc = json.optJSONArray("topCemeteries");
        if (tc != null) {
            for (int i = 0; i < tc.length(); i++) {
                JSONObject c = tc.optJSONObject(i);
                if (c == null) continue;
                CemeteryFixStat stat = new CemeteryFixStat();
                stat.cemeteryId = c.optString("cemeteryId", "");
                stat.records = c.optInt("records", 0);
                stat.proposedFixes = c.optInt("proposedFixes", 0);
                result.topCemeteries.add(stat);
            }
        }

        return result;
    }

    /**
     * Returns a summary line.
     */
    public String getSummaryLine() {
        if (improvement == null || before == null || after == null) return "No data";
        return String.format("%d cemeteries, %d records | %s → %s | +%d points",
            totalCemeteries, totalRecords,
            before.getFormattedGrade(), after.getFormattedGrade(), improvement.scoreDelta);
    }
}
