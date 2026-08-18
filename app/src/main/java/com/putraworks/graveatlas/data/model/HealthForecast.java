package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Predictive health forecast for a cemetery.
 * Returned by GET /api/predictions/health-forecast
 */
public class HealthForecast {
    public int currentScore;
    public int predictedScore;
    public String trend; // improving, stable, degrading
    public double slope;
    public String confidence; // high, medium, low
    public int horizonDays;
    public String riskLevel; // low, medium, high
    public List<String> riskFactors;
    public Integer timeToThreshold; // days until score drops below 60, null if N/A
    public List<Integer> historicalScores;
    public String bucketInterval;
    public int totalBuckets;

    public static HealthForecast fromJson(JSONObject json) {
        HealthForecast hf = new HealthForecast();
        hf.currentScore = json.optInt("currentScore", 0);
        hf.predictedScore = json.optInt("predictedScore", 0);
        hf.trend = json.optString("trend", "stable");
        hf.slope = json.optDouble("slope", 0);
        hf.confidence = json.optString("confidence", "low");
        hf.horizonDays = json.optInt("horizonDays", 90);
        hf.riskLevel = json.optString("riskLevel", "low");
        hf.bucketInterval = json.optString("bucketInterval", "7d");
        hf.totalBuckets = json.optInt("totalBuckets", 0);

        // Risk factors
        hf.riskFactors = new ArrayList<>();
        JSONArray rf = json.optJSONArray("riskFactors");
        if (rf != null) {
            for (int i = 0; i < rf.length(); i++) {
                hf.riskFactors.add(rf.optString(i));
            }
        }

        // Time to threshold
        if (json.has("timeToThreshold") && !json.isNull("timeToThreshold")) {
            hf.timeToThreshold = json.optInt("timeToThreshold");
        }

        // Historical scores
        hf.historicalScores = new ArrayList<>();
        JSONArray hs = json.optJSONArray("historicalScores");
        if (hs != null) {
            for (int i = 0; i < hs.length(); i++) {
                hf.historicalScores.add(hs.optInt(i));
            }
        }

        return hf;
    }

    public boolean isDegrading() { return "degrading".equals(trend); }
    public boolean isImproving() { return "improving".equals(trend); }
    public boolean isHighRisk() { return "high".equals(riskLevel); }

    public String getTrendEmoji() {
        switch (trend) {
            case "improving": return "📈";
            case "degrading": return "📉";
            default: return "➡️";
        }
    }

    public String getSummaryLine() {
        return String.format("%s Score: %d → %d (%s, %s confidence)",
            getTrendEmoji(), currentScore, predictedScore, trend, confidence);
    }
}
