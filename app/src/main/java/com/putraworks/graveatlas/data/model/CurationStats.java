package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * Curation statistics across all tasks.
 * Returned by GET /api/curation/stats
 */
public class CurationStats {
    public int total;
    public JSONObject byStatus;
    public JSONObject byType;
    public JSONObject byPriority;
    public int activeLocks;

    public static CurationStats fromJson(JSONObject json) {
        CurationStats result = new CurationStats();
        result.total = json.optInt("total", 0);
        result.byStatus = json.optJSONObject("byStatus");
        result.byType = json.optJSONObject("byType");
        result.byPriority = json.optJSONObject("byPriority");
        result.activeLocks = json.optInt("activeLocks", 0);
        return result;
    }

    public int getPending() { return byStatus != null ? byStatus.optInt("pending", 0) : 0; }
    public int getAssigned() { return byStatus != null ? byStatus.optInt("assigned", 0) : 0; }
    public int getSubmitted() { return byStatus != null ? byStatus.optInt("submitted", 0) : 0; }
    public int getCompleted() { return byStatus != null ? byStatus.optInt("completed", 0) : 0; }
    public int getUrgent() { return byPriority != null ? byPriority.optInt("urgent", 0) : 0; }

    public int getActiveTasks() {
        return getPending() + getAssigned() + getSubmitted();
    }

    public double getCompletionRate() {
        if (total == 0) return 0;
        return Math.round((getCompleted() * 100.0 / total) * 10) / 10.0;
    }

    public String getSummaryLine() {
        return String.format("%d total (%d pending, %d assigned, %d submitted, %d completed) — %d locks",
            total, getPending(), getAssigned(), getSubmitted(), getCompleted(), activeLocks);
    }
}
