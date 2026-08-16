package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Comprehensive confidence score for a single record.
 * Combines 7 signals into a 0-100 score with transparent breakdown.
 *
 * Returned by GET /api/graves/{id}/confidence
 */
public class ConfidenceScore {
    public int score;
    public int maxScore;
    public String tier;  // platinum, gold, silver, bronze, unverified
    public List<SignalBreakdown> breakdown;
    public String computedAt;

    public static class SignalBreakdown {
        public String signal;      // completeness, verification, sourceQuality, etc.
        public int score;
        public int max;
        public List<String> detailLines;
    }

    public static ConfidenceScore fromJson(JSONObject json) {
        ConfidenceScore result = new ConfidenceScore();
        result.score = json.optInt("score", 0);
        result.maxScore = json.optInt("maxScore", 100);
        result.tier = json.optString("tier", "unverified");
        result.computedAt = json.optString("computedAt", null);

        result.breakdown = new ArrayList<>();
        JSONObject bd = json.optJSONObject("breakdown");
        if (bd != null) {
            String[] signals = {"completeness", "verification", "sourceQuality",
                "anomalyFree", "mergeHistory", "community", "geoPrecision"};
            for (String signal : signals) {
                JSONObject s = bd.optJSONObject(signal);
                if (s == null) continue;
                SignalBreakdown sb = new SignalBreakdown();
                sb.signal = signal;
                sb.score = s.optInt("score", 0);
                sb.max = s.optInt("max", 0);
                sb.detailLines = new ArrayList<>();
                JSONArray details = s.optJSONArray("details");
                if (details != null) {
                    for (int i = 0; i < details.length(); i++) {
                        JSONObject d = details.optJSONObject(i);
                        if (d != null) {
                            sb.detailLines.add(d.toString());
                        }
                    }
                }
                result.breakdown.add(sb);
            }
        }

        return result;
    }

    public boolean isPlatinum() { return "platinum".equals(tier); }
    public boolean isGold() { return "gold".equals(tier); }
    public boolean isSilver() { return "silver".equals(tier); }
    public boolean isBronze() { return "bronze".equals(tier); }
    public boolean isUnverified() { return "unverified".equals(tier); }

    public boolean isHighConfidence() { return score >= 75; }
    public boolean isMediumConfidence() { return score >= 50 && score < 75; }
    public boolean isLowConfidence() { return score < 50; }

    public String getTierIcon() {
        switch (tier) {
            case "platinum": return "💎";
            case "gold": return "🥇";
            case "silver": return "🥈";
            case "bronze": return "🥉";
            default: return "⚪";
        }
    }

    public String getTierLabel() {
        switch (tier) {
            case "platinum": return "Platinum";
            case "gold": return "Gold";
            case "silver": return "Silver";
            case "bronze": return "Bronze";
            default: return "Unverified";
        }
    }

    public String getSummaryLine() {
        return String.format("%d/100 — %s %s", score, getTierIcon(), getTierLabel());
    }
}
