package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Dataset-level summary for auto-documentation.
 * Returned by GET /api/summaries/dataset
 */
public class DatasetSummary {
    public String overview;
    public String dateRange;
    public int totalRecords;
    public int totalCemeteries;
    public DatasetStats stats;
    public List<String> topCemeteries;
    public List<CemeteryEntry> cemeteryList;
    public List<String> qualityIssues;
    public List<String> recommendations;
    public String generatedAt;

    public static class DatasetStats {
        public int verified;
        public int unverified;
        public int withAnomalies;
        public int withSources;
        public int withCoordinates;
        public int avgConfidence;

        public static DatasetStats fromJson(JSONObject json) {
            DatasetStats s = new DatasetStats();
            s.verified = json.optInt("verified", 0);
            s.unverified = json.optInt("unverified", 0);
            s.withAnomalies = json.optInt("withAnomalies", 0);
            s.withSources = json.optInt("withSources", 0);
            s.withCoordinates = json.optInt("withCoordinates", 0);
            s.avgConfidence = json.optInt("avgConfidence", 0);
            return s;
        }
    }

    public static class CemeteryEntry {
        public String name;
        public int count;
        public int verified;
        public int withAnomalies;

        public static CemeteryEntry fromJson(JSONObject json) {
            CemeteryEntry ce = new CemeteryEntry();
            ce.name = json.optString("name", "");
            ce.count = json.optInt("count", 0);
            ce.verified = json.optInt("verified", 0);
            ce.withAnomalies = json.optInt("withAnomalies", 0);
            return ce;
        }
    }

    public static DatasetSummary fromJson(JSONObject json) {
        DatasetSummary ds = new DatasetSummary();
        ds.overview = json.optString("overview", "");
        ds.dateRange = json.optString("dateRange", "");
        ds.totalRecords = json.optInt("totalRecords", 0);
        ds.totalCemeteries = json.optInt("totalCemeteries", 0);
        ds.generatedAt = json.optString("generatedAt", "");

        JSONObject stats = json.optJSONObject("stats");
        if (stats != null) ds.stats = DatasetStats.fromJson(stats);

        ds.topCemeteries = new ArrayList<>();
        JSONArray tc = json.optJSONArray("topCemeteries");
        if (tc != null) {
            for (int i = 0; i < tc.length(); i++) {
                ds.topCemeteries.add(tc.optString(i));
            }
        }

        ds.cemeteryList = new ArrayList<>();
        JSONArray cl = json.optJSONArray("cemeteryList");
        if (cl != null) {
            for (int i = 0; i < cl.length(); i++) {
                JSONObject c = cl.optJSONObject(i);
                if (c != null) ds.cemeteryList.add(CemeteryEntry.fromJson(c));
            }
        }

        ds.qualityIssues = new ArrayList<>();
        JSONArray qi = json.optJSONArray("qualityIssues");
        if (qi != null) {
            for (int i = 0; i < qi.length(); i++) {
                ds.qualityIssues.add(qi.optString(i));
            }
        }

        ds.recommendations = new ArrayList<>();
        JSONArray rec = json.optJSONArray("recommendations");
        if (rec != null) {
            for (int i = 0; i < rec.length(); i++) {
                ds.recommendations.add(rec.optString(i));
            }
        }

        return ds;
    }

    public boolean hasQualityIssues() { return qualityIssues != null && !qualityIssues.isEmpty(); }
    public boolean hasRecommendations() { return recommendations != null && !recommendations.isEmpty(); }
}
