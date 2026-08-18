package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Predictive curation workload forecast.
 * Returned by GET /api/predictions/curation-forecast
 */
public class CurationForecast {
    public Backlog backlog;
    public int estimatedDaysToClear;
    public String processingRate;
    public int predictedWeeklyLoad;
    public String workloadLevel; // normal, moderate, high, low
    public TrendData trends;
    public int horizonDays;
    public List<ActivityBucket> historicalActivity;

    public static class Backlog {
        public int pendingReview;
        public int unverified;
        public int missingSources;
        public int withAnomalies;

        public static Backlog fromJson(JSONObject json) {
            Backlog b = new Backlog();
            b.pendingReview = json.optInt("pendingReview", 0);
            b.unverified = json.optInt("unverified", 0);
            b.missingSources = json.optInt("missingSources", 0);
            b.withAnomalies = json.optInt("withAnomalies", 0);
            return b;
        }

        public int getTotal() {
            return pendingReview + unverified + missingSources + withAnomalies;
        }
    }

    public static class TrendInfo {
        public double recent;
        public int predicted;
        public String trend;
        public double slope;

        public static TrendInfo fromJson(JSONObject json) {
            TrendInfo ti = new TrendInfo();
            ti.recent = json.optDouble("recent", 0);
            ti.predicted = json.optInt("predicted", 0);
            ti.trend = json.optString("trend", "stable");
            ti.slope = json.optDouble("slope", 0);
            return ti;
        }
    }

    public static class TrendData {
        public TrendInfo newRecords;
        public TrendInfo updates;
        public TrendInfo reviews;
        public TrendInfo enrichments;
        public TrendInfo anomalies;

        public static TrendData fromJson(JSONObject json) {
            TrendData td = new TrendData();
            td.newRecords = json.optJSONObject("newRecords") != null ? TrendInfo.fromJson(json.optJSONObject("newRecords")) : new TrendInfo();
            td.updates = json.optJSONObject("updates") != null ? TrendInfo.fromJson(json.optJSONObject("updates")) : new TrendInfo();
            td.reviews = json.optJSONObject("reviews") != null ? TrendInfo.fromJson(json.optJSONObject("reviews")) : new TrendInfo();
            td.enrichments = json.optJSONObject("enrichments") != null ? TrendInfo.fromJson(json.optJSONObject("enrichments")) : new TrendInfo();
            td.anomalies = json.optJSONObject("anomalies") != null ? TrendInfo.fromJson(json.optJSONObject("anomalies")) : new TrendInfo();
            return td;
        }
    }

    public static class ActivityBucket {
        public int week;
        public int newRecords;
        public int updates;
        public int reviews;
        public int enrichments;
        public int anomalies;

        public static ActivityBucket fromJson(JSONObject json) {
            ActivityBucket ab = new ActivityBucket();
            ab.week = json.optInt("week", 0);
            ab.newRecords = json.optInt("newRecords", 0);
            ab.updates = json.optInt("updates", 0);
            ab.reviews = json.optInt("reviews", 0);
            ab.enrichments = json.optInt("enrichments", 0);
            ab.anomalies = json.optInt("anomalies", 0);
            return ab;
        }
    }

    public static CurationForecast fromJson(JSONObject json) {
        CurationForecast cf = new CurationForecast();
        cf.estimatedDaysToClear = json.optInt("estimatedDaysToClear", 0);
        cf.processingRate = json.optString("processingRate", "");
        cf.predictedWeeklyLoad = json.optInt("predictedWeeklyLoad", 0);
        cf.workloadLevel = json.optString("workloadLevel", "normal");
        cf.horizonDays = json.optInt("horizonDays", 30);

        JSONObject bl = json.optJSONObject("backlog");
        if (bl != null) cf.backlog = Backlog.fromJson(bl);

        JSONObject td = json.optJSONObject("trends");
        if (td != null) cf.trends = TrendData.fromJson(td);

        cf.historicalActivity = new ArrayList<>();
        JSONArray ha = json.optJSONArray("historicalActivity");
        if (ha != null) {
            for (int i = 0; i < ha.length(); i++) {
                JSONObject b = ha.optJSONObject(i);
                if (b != null) cf.historicalActivity.add(ActivityBucket.fromJson(b));
            }
        }

        return cf;
    }

    public boolean isHighWorkload() { return "high".equals(workloadLevel); }

    public String getWorkloadEmoji() {
        switch (workloadLevel) {
            case "high": return "🔴";
            case "moderate": return "🟡";
            case "low": return "🟢";
            default: return "⚪";
        }
    }

    public String getSummaryLine() {
        return String.format("%s Workload: %s — %d items/week, ~%d days to clear backlog",
            getWorkloadEmoji(), workloadLevel, predictedWeeklyLoad, estimatedDaysToClear);
    }
}
