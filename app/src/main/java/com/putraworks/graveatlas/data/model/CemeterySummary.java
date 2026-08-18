package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Cemetery summary for auto-documentation.
 * Returned by GET /api/summaries/cemetery/:cemeteryId
 */
public class CemeterySummary {
    public String cemeteryId;
    public String cemeteryName;
    public String overview;
    public SummaryStats stats;
    public List<NotableRecord> notableRecords;
    public List<String> qualityIssues;
    public List<String> recommendations;
    public String generatedAt;

    public static class SummaryStats {
        public int totalRecords;
        public int verified;
        public int unverified;
        public int withAnomalies;
        public int withSources;
        public int withCoordinates;
        public int avgConfidence;
        public ConfidenceTiers confidenceTiers;

        public static class ConfidenceTiers {
            public int platinum;
            public int gold;
            public int silver;
            public int bronze;
            public int unranked;

            public static ConfidenceTiers fromJson(JSONObject json) {
                ConfidenceTiers ct = new ConfidenceTiers();
                ct.platinum = json.optInt("platinum", 0);
                ct.gold = json.optInt("gold", 0);
                ct.silver = json.optInt("silver", 0);
                ct.bronze = json.optInt("bronze", 0);
                ct.unranked = json.optInt("unranked", 0);
                return ct;
            }
        }

        public static SummaryStats fromJson(JSONObject json) {
            SummaryStats s = new SummaryStats();
            s.totalRecords = json.optInt("totalRecords", 0);
            s.verified = json.optInt("verified", 0);
            s.unverified = json.optInt("unverified", 0);
            s.withAnomalies = json.optInt("withAnomalies", 0);
            s.withSources = json.optInt("withSources", 0);
            s.withCoordinates = json.optInt("withCoordinates", 0);
            s.avgConfidence = json.optInt("avgConfidence", 0);

            JSONObject ct = json.optJSONObject("confidenceTiers");
            if (ct != null) s.confidenceTiers = ConfidenceTiers.fromJson(ct);

            return s;
        }

        public double getVerificationRate() {
            return totalRecords > 0 ? (double) verified / totalRecords : 0;
        }
    }

    public static class NotableRecord {
        public String id;
        public String name;
        public String summary;
        public int confidence;

        public static NotableRecord fromJson(JSONObject json) {
            NotableRecord nr = new NotableRecord();
            nr.id = json.optString("id", "");
            nr.name = json.optString("name", "Unknown");
            nr.summary = json.optString("summary", "");
            nr.confidence = json.optInt("confidence", 0);
            return nr;
        }
    }

    public static CemeterySummary fromJson(JSONObject json) {
        CemeterySummary cs = new CemeterySummary();
        cs.cemeteryId = json.optString("cemeteryId", "");
        cs.cemeteryName = json.optString("cemeteryName", "");
        cs.overview = json.optString("overview", "");
        cs.generatedAt = json.optString("generatedAt", "");

        JSONObject stats = json.optJSONObject("stats");
        if (stats != null) cs.stats = SummaryStats.fromJson(stats);

        cs.notableRecords = new ArrayList<>();
        JSONArray nr = json.optJSONArray("notableRecords");
        if (nr != null) {
            for (int i = 0; i < nr.length(); i++) {
                JSONObject r = nr.optJSONObject(i);
                if (r != null) cs.notableRecords.add(NotableRecord.fromJson(r));
            }
        }

        cs.qualityIssues = new ArrayList<>();
        JSONArray qi = json.optJSONArray("qualityIssues");
        if (qi != null) {
            for (int i = 0; i < qi.length(); i++) {
                cs.qualityIssues.add(qi.optString(i));
            }
        }

        cs.recommendations = new ArrayList<>();
        JSONArray rec = json.optJSONArray("recommendations");
        if (rec != null) {
            for (int i = 0; i < rec.length(); i++) {
                cs.recommendations.add(rec.optString(i));
            }
        }

        return cs;
    }

    public boolean hasQualityIssues() { return qualityIssues != null && !qualityIssues.isEmpty(); }
    public boolean hasRecommendations() { return recommendations != null && !recommendations.isEmpty(); }
}
