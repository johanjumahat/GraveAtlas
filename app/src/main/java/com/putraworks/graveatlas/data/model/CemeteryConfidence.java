package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Cemetery-wide confidence score summary.
 * Returned by GET /api/cemeteries/{id}/confidence
 */
public class CemeteryConfidence {
    public String cemeteryId;
    public int totalRecords;
    public List<RecordScore> recordScores;
    public CemeteryConfidenceSummary cemeterySummary;
    public String computedAt;

    public static class RecordScore {
        public String recordId;
        public String recordName;
        public int score;
        public String tier;
    }

    public static class CemeteryConfidenceSummary {
        public int averageScore;
        public int platinumCount;
        public int goldCount;
        public int silverCount;
        public int bronzeCount;
        public int unverifiedCount;
        public int totalRecords;
    }

    public static CemeteryConfidence fromJson(JSONObject json) {
        CemeteryConfidence result = new CemeteryConfidence();
        result.cemeteryId = json.optString("cemeteryId", null);
        result.totalRecords = json.optInt("totalRecords", 0);
        result.computedAt = json.optString("computedAt", null);

        result.recordScores = new ArrayList<>();
        JSONArray arr = json.optJSONArray("recordScores");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject rs = arr.optJSONObject(i);
                if (rs == null) continue;
                RecordScore score = new RecordScore();
                score.recordId = rs.optString("recordId", "");
                score.recordName = rs.optString("recordName", "Unknown");
                score.score = rs.optInt("score", 0);
                score.tier = rs.optString("tier", "unverified");
                result.recordScores.add(score);
            }
        }

        JSONObject cs = json.optJSONObject("cemeterySummary");
        if (cs != null) {
            result.cemeterySummary = new CemeteryConfidenceSummary();
            result.cemeterySummary.averageScore = cs.optInt("averageScore", 0);
            result.cemeterySummary.platinumCount = cs.optInt("platinumCount", 0);
            result.cemeterySummary.goldCount = cs.optInt("goldCount", 0);
            result.cemeterySummary.silverCount = cs.optInt("silverCount", 0);
            result.cemeterySummary.bronzeCount = cs.optInt("bronzeCount", 0);
            result.cemeterySummary.unverifiedCount = cs.optInt("unverifiedCount", 0);
            result.cemeterySummary.totalRecords = cs.optInt("totalRecords", 0);
        }

        return result;
    }

    public boolean isHighQuality() {
        return cemeterySummary != null && cemeterySummary.averageScore >= 75;
    }

    public String getSummaryLine() {
        if (cemeterySummary == null) return "No confidence data";
        return String.format("Avg %d/100 — %d 💎 %d 🥇 %d 🥈 %d 🥉",
            cemeterySummary.averageScore,
            cemeterySummary.platinumCount, cemeterySummary.goldCount,
            cemeterySummary.silverCount, cemeterySummary.bronzeCount);
    }
}
