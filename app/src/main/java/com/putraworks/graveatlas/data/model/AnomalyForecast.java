package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Predictive anomaly emergence forecast.
 * Returned by GET /api/predictions/anomaly-forecast
 */
public class AnomalyForecast {
    public List<AnomalyPrediction> predictions;
    public int totalAnomalyTypes;
    public int horizonDays;
    public int totalAnomalies;
    public String highestRisk;
    public String bucketInterval;

    public static class AnomalyPrediction {
        public String anomalyType;
        public int totalAnomalies;
        public int predictedCount;
        public String trend; // increasing, stable, decreasing
        public double slope;
        public double recentAvg;
        public double olderAvg;
        public SeverityBreakdown severityBreakdown;
        public int riskScore;

        public static class SeverityBreakdown {
            public int critical;
            public int warning;
            public int info;

            public static SeverityBreakdown fromJson(JSONObject json) {
                SeverityBreakdown sb = new SeverityBreakdown();
                sb.critical = json.optInt("critical", 0);
                sb.warning = json.optInt("warning", 0);
                sb.info = json.optInt("info", 0);
                return sb;
            }
        }

        public static AnomalyPrediction fromJson(JSONObject json) {
            AnomalyPrediction ap = new AnomalyPrediction();
            ap.anomalyType = json.optString("anomalyType", "");
            ap.totalAnomalies = json.optInt("totalAnomalies", 0);
            ap.predictedCount = json.optInt("predictedCount", 0);
            ap.trend = json.optString("trend", "stable");
            ap.slope = json.optDouble("slope", 0);
            ap.recentAvg = json.optDouble("recentAvg", 0);
            ap.olderAvg = json.optDouble("olderAvg", 0);
            ap.riskScore = json.optInt("riskScore", 0);

            JSONObject sb = json.optJSONObject("severityBreakdown");
            if (sb != null) {
                ap.severityBreakdown = SeverityBreakdown.fromJson(sb);
            }

            return ap;
        }

        public boolean isIncreasing() { return "increasing".equals(trend); }
        public boolean isHighRisk() { return riskScore >= 60; }

        public String getSummaryLine() {
            return String.format("%s — %d total, %d predicted (%s, risk: %d)",
                anomalyType, totalAnomalies, predictedCount, trend, riskScore);
        }
    }

    public static AnomalyForecast fromJson(JSONObject json) {
        AnomalyForecast af = new AnomalyForecast();
        af.totalAnomalyTypes = json.optInt("totalAnomalyTypes", 0);
        af.horizonDays = json.optInt("horizonDays", 30);
        af.totalAnomalies = json.optInt("totalAnomalies", 0);
        af.highestRisk = json.optString("highestRisk", null);
        af.bucketInterval = json.optString("bucketInterval", "7d");

        af.predictions = new ArrayList<>();
        JSONArray preds = json.optJSONArray("predictions");
        if (preds != null) {
            for (int i = 0; i < preds.length(); i++) {
                JSONObject p = preds.optJSONObject(i);
                if (p != null) {
                    af.predictions.add(AnomalyPrediction.fromJson(p));
                }
            }
        }

        return af;
    }

    public boolean hasEmergingRisks() {
        for (AnomalyPrediction p : predictions) {
            if (p.isIncreasing() && p.riskScore >= 50) return true;
        }
        return false;
    }

    public String getSummaryLine() {
        if (predictions.isEmpty()) return "No anomaly predictions available";
        return String.format("%d anomaly types tracked, %s is highest risk",
            totalAnomalyTypes, highestRisk != null ? highestRisk : "none");
    }
}
