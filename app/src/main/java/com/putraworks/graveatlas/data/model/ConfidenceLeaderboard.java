package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Global leaderboard of records by confidence score.
 * Returned by GET /api/confidence/leaderboard
 */
public class ConfidenceLeaderboard {
    public List<LeaderboardEntry> leaderboard;
    public int totalRecords;
    public TierDistribution tierDistribution;
    public String computedAt;

    public static class LeaderboardEntry {
        public String recordId;
        public String recordName;
        public String cemeteryId;
        public int score;
        public String tier;
        public String verificationStatus;
    }

    public static class TierDistribution {
        public int platinum;
        public int gold;
        public int silver;
        public int bronze;
        public int unverified;
    }

    public static ConfidenceLeaderboard fromJson(JSONObject json) {
        ConfidenceLeaderboard result = new ConfidenceLeaderboard();
        result.totalRecords = json.optInt("totalRecords", 0);
        result.computedAt = json.optString("computedAt", null);

        result.leaderboard = new ArrayList<>();
        JSONArray arr = json.optJSONArray("leaderboard");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject e = arr.optJSONObject(i);
                if (e == null) continue;
                LeaderboardEntry entry = new LeaderboardEntry();
                entry.recordId = e.optString("recordId", "");
                entry.recordName = e.optString("recordName", "Unknown");
                entry.cemeteryId = e.optString("cemeteryId", null);
                entry.score = e.optInt("score", 0);
                entry.tier = e.optString("tier", "unverified");
                entry.verificationStatus = e.optString("verificationStatus", "unverified");
                result.leaderboard.add(entry);
            }
        }

        JSONObject td = json.optJSONObject("tierDistribution");
        if (td != null) {
            result.tierDistribution = new TierDistribution();
            result.tierDistribution.platinum = td.optInt("platinum", 0);
            result.tierDistribution.gold = td.optInt("gold", 0);
            result.tierDistribution.silver = td.optInt("silver", 0);
            result.tierDistribution.bronze = td.optInt("bronze", 0);
            result.tierDistribution.unverified = td.optInt("unverified", 0);
        }

        return result;
    }

    public boolean hasTopTierRecords() {
        return tierDistribution != null && (tierDistribution.platinum > 0 || tierDistribution.gold > 0);
    }

    public String getDistributionLine() {
        if (tierDistribution == null) return "No distribution data";
        return String.format("💎 %d | 🥇 %d | 🥈 %d | 🥉 %d | ⚪ %d",
            tierDistribution.platinum, tierDistribution.gold,
            tierDistribution.silver, tierDistribution.bronze,
            tierDistribution.unverified);
    }
}
