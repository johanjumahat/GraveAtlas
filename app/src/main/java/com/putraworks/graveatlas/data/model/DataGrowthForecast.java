package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Predictive data growth forecast.
 * Returned by GET /api/predictions/data-growth
 */
public class DataGrowthForecast {
    public DataSnapshot current;
    public DataSnapshot predicted;
    public double growthRatePerDay;
    public String growthTrend; // accelerating, stable, decelerating
    public int horizonDays;
    public List<GrowthBucket> historicalGrowth;
    public List<Milestone> milestones;

    public static class DataSnapshot {
        public int records;
        public int cemeteries;
        public double storageMB;

        public static DataSnapshot fromJson(JSONObject json) {
            DataSnapshot ds = new DataSnapshot();
            ds.records = json.optInt("records", 0);
            ds.cemeteries = json.optInt("cemeteries", 0);
            ds.storageMB = json.optDouble("storageMB", 0);
            return ds;
        }
    }

    public static class GrowthBucket {
        public int bucket;
        public int newRecords;
        public int newCemeteries;

        public static GrowthBucket fromJson(JSONObject json) {
            GrowthBucket gb = new GrowthBucket();
            gb.bucket = json.optInt("bucket", 0);
            gb.newRecords = json.optInt("newRecords", 0);
            gb.newCemeteries = json.optInt("newCemeteries", 0);
            return gb;
        }
    }

    public static class Milestone {
        public int target;
        public int daysRemaining;
        public String estimatedDate;

        public static Milestone fromJson(JSONObject json) {
            Milestone m = new Milestone();
            m.target = json.optInt("target", 0);
            m.daysRemaining = json.optInt("daysRemaining", 0);
            m.estimatedDate = json.optString("estimatedDate", "");
            return m;
        }
    }

    public static DataGrowthForecast fromJson(JSONObject json) {
        DataGrowthForecast dg = new DataGrowthForecast();
        dg.growthRatePerDay = json.optDouble("growthRatePerDay", 0);
        dg.growthTrend = json.optString("growthTrend", "stable");
        dg.horizonDays = json.optInt("horizonDays", 180);

        JSONObject curr = json.optJSONObject("current");
        if (curr != null) dg.current = DataSnapshot.fromJson(curr);

        JSONObject pred = json.optJSONObject("predicted");
        if (pred != null) dg.predicted = DataSnapshot.fromJson(pred);

        dg.historicalGrowth = new ArrayList<>();
        JSONArray hg = json.optJSONArray("historicalGrowth");
        if (hg != null) {
            for (int i = 0; i < hg.length(); i++) {
                JSONObject b = hg.optJSONObject(i);
                if (b != null) dg.historicalGrowth.add(GrowthBucket.fromJson(b));
            }
        }

        dg.milestones = new ArrayList<>();
        JSONArray ms = json.optJSONArray("milestones");
        if (ms != null) {
            for (int i = 0; i < ms.length(); i++) {
                JSONObject m = ms.optJSONObject(i);
                if (m != null) dg.milestones.add(Milestone.fromJson(m));
            }
        }

        return dg;
    }

    public boolean isAccelerating() { return "accelerating".equals(growthTrend); }

    public String getTrendEmoji() {
        switch (growthTrend) {
            case "accelerating": return "🚀";
            case "decelerating": return "🐌";
            default: return "➡️";
        }
    }

    public String getSummaryLine() {
        return String.format("%s %d → %d records (%.1f/day, %s)",
            getTrendEmoji(), current != null ? current.records : 0,
            predicted != null ? predicted.records : 0, growthRatePerDay, growthTrend);
    }
}
