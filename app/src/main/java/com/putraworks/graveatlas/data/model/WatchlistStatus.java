package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * Lightweight status summary of the watchlist.
 * Returned by GET /api/watchlist/status
 */
public class WatchlistStatus {
    public int activeItems;
    public int totalItems;
    public String lastCheckedAt;
    public boolean needsCheck;

    public static WatchlistStatus fromJson(JSONObject json) {
        WatchlistStatus result = new WatchlistStatus();
        result.activeItems = json.optInt("activeItems", 0);
        result.totalItems = json.optInt("totalItems", 0);
        result.lastCheckedAt = json.optString("lastCheckedAt", null);
        result.needsCheck = json.optBoolean("needsCheck", true);
        return result;
    }

    public String getStatusLine() {
        if (totalItems == 0) return "Watchlist empty";
        String checkStatus = needsCheck ? "needs check" : "up to date";
        return String.format("%d items — %s", totalItems, checkStatus);
    }
}
