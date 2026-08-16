package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Result of a watchlist check — contains all generated alerts.
 * Returned by POST /api/watchlist/check
 */
public class WatchlistCheckResult {
    public List<WatchAlert> alerts;
    public int checkedItems;
    public int totalAlerts;
    public int criticalAlerts;
    public int highAlerts;
    public String checkedAt;

    public static WatchlistCheckResult fromJson(JSONObject json) {
        WatchlistCheckResult result = new WatchlistCheckResult();
        result.checkedItems = json.optInt("checkedItems", 0);
        result.totalAlerts = json.optInt("totalAlerts", 0);
        result.criticalAlerts = json.optInt("criticalAlerts", 0);
        result.highAlerts = json.optInt("highAlerts", 0);
        result.checkedAt = json.optString("checkedAt", null);

        result.alerts = new ArrayList<>();
        JSONArray arr = json.optJSONArray("alerts");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject a = arr.optJSONObject(i);
                if (a == null) continue;
                result.alerts.add(WatchAlert.fromJson(a));
            }
        }

        return result;
    }

    public boolean hasCriticalAlerts() {
        return criticalAlerts > 0;
    }

    public boolean hasAlerts() {
        return totalAlerts > 0;
    }

    public String getSummaryLine() {
        if (totalAlerts == 0) {
            return String.format("Checked %d items — no alerts", checkedItems);
        }
        return String.format("Checked %d items — %d alerts (%d critical, %d high)",
            checkedItems, totalAlerts, criticalAlerts, highAlerts);
    }
}
