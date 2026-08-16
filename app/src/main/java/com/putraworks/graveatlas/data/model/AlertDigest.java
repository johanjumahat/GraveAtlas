package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Alert digest summarizing recent notifications and alert status.
 * Returned by GET /api/alerts/digest
 */
public class AlertDigest {
    public String period;
    public String generatedAt;
    public DigestSummary summary;
    public JSONObject byType;
    public JSONObject bySeverity;
    public List<Notification> recentNotifications;

    public static class DigestSummary {
        public int totalNotifications;
        public int unread;
        public int dismissed;
        public int activeAlertRules;
    }

    public static AlertDigest fromJson(JSONObject json) {
        AlertDigest result = new AlertDigest();
        JSONObject d = json.optJSONObject("digest");
        if (d == null) d = json;

        result.period = d.optString("period", "");
        result.generatedAt = d.optString("generatedAt", null);

        JSONObject s = d.optJSONObject("summary");
        if (s != null) {
            result.summary = new DigestSummary();
            result.summary.totalNotifications = s.optInt("totalNotifications", 0);
            result.summary.unread = s.optInt("unread", 0);
            result.summary.dismissed = s.optInt("dismissed", 0);
            result.summary.activeAlertRules = s.optInt("activeAlertRules", 0);
        }

        result.byType = d.optJSONObject("byType");
        result.bySeverity = d.optJSONObject("bySeverity");

        result.recentNotifications = new ArrayList<>();
        JSONArray arr = d.optJSONArray("recentNotifications");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject n = arr.optJSONObject(i);
                if (n != null) result.recentNotifications.add(Notification.fromJson(n));
            }
        }

        return result;
    }

    public boolean hasUnread() { return summary != null && summary.unread > 0; }
    public boolean hasCritical() {
        return bySeverity != null && bySeverity.optInt("critical", 0) > 0;
    }

    public String getSummaryLine() {
        if (summary == null) return "No digest data";
        return String.format("%d notifications (%d unread, %d dismissed) — %d active rules",
            summary.totalNotifications, summary.unread, summary.dismissed, summary.activeAlertRules);
    }
}
