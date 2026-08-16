package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * Global source verification status summary.
 * Returned by GET /api/sources/verify/status
 */
public class SourceVerificationStatus {
    public int totalRecords;
    public int recordsWithSources;
    public int totalSourceRefs;
    public int uniqueUrlsChecked;
    public int liveUrls;
    public int deadUrls;
    public int sourceHealthScore;
    public String checkedAt;

    public static SourceVerificationStatus fromJson(JSONObject json) {
        SourceVerificationStatus result = new SourceVerificationStatus();
        result.totalRecords = json.optInt("totalRecords", 0);
        result.recordsWithSources = json.optInt("recordsWithSources", 0);
        result.totalSourceRefs = json.optInt("totalSourceRefs", 0);
        result.uniqueUrlsChecked = json.optInt("uniqueUrlsChecked", 0);
        result.liveUrls = json.optInt("liveUrls", 0);
        result.deadUrls = json.optInt("deadUrls", 0);
        result.sourceHealthScore = json.optInt("sourceHealthScore", 0);
        result.checkedAt = json.optString("checkedAt", null);
        return result;
    }

    public boolean isHealthy() {
        return sourceHealthScore >= 80;
    }

    public String getStatusLine() {
        return String.format("%d/%d URLs live — %d%% health | %d records with sources",
            liveUrls, uniqueUrlsChecked, sourceHealthScore, recordsWithSources);
    }
}
