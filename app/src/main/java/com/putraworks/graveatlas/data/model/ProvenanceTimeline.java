package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Global timeline of all provenance events across the system.
 * Returned by GET /api/provenance/timeline
 */
public class ProvenanceTimeline {
    public List<TimelineEvent> timeline;
    public int totalEvents;
    public List<MonthlySummary> monthlySummary;
    public DateRange dateRange;

    public static class TimelineEvent {
        public String timestamp;
        public String action;
        public String actor;
        public String actorRole;
        public String description;
        public String recordId;
        public String recordName;
    }

    public static class MonthlySummary {
        public String month;    // YYYY-MM
        public int count;
        public JSONObject actions; // action name → count
    }

    public static class DateRange {
        public String earliest;
        public String latest;
    }

    public static ProvenanceTimeline fromJson(JSONObject json) {
        ProvenanceTimeline result = new ProvenanceTimeline();
        result.totalEvents = json.optInt("totalEvents", 0);

        result.timeline = new ArrayList<>();
        JSONArray arr = json.optJSONArray("timeline");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject e = arr.optJSONObject(i);
                if (e == null) continue;
                TimelineEvent event = new TimelineEvent();
                event.timestamp = e.optString("timestamp", "unknown");
                event.action = e.optString("action", "");
                event.actor = e.optString("actor", "unknown");
                event.actorRole = e.optString("actorRole", "");
                event.description = e.optString("description", "");
                event.recordId = e.optString("recordId", "");
                event.recordName = e.optString("recordName", "Unknown");
                result.timeline.add(event);
            }
        }

        result.monthlySummary = new ArrayList<>();
        JSONArray ms = json.optJSONArray("monthlySummary");
        if (ms != null) {
            for (int i = 0; i < ms.length(); i++) {
                JSONObject m = ms.optJSONObject(i);
                if (m == null) continue;
                MonthlySummary summary = new MonthlySummary();
                summary.month = m.optString("month", "");
                summary.count = m.optInt("count", 0);
                summary.actions = m.optJSONObject("actions");
                result.monthlySummary.add(summary);
            }
        }

        JSONObject dr = json.optJSONObject("dateRange");
        if (dr != null) {
            result.dateRange = new DateRange();
            result.dateRange.earliest = dr.optString("earliest", null);
            result.dateRange.latest = dr.optString("latest", null);
        }

        return result;
    }

    public boolean hasEvents() {
        return totalEvents > 0;
    }

    public String getSummaryLine() {
        if (dateRange == null) return String.format("%d total events", totalEvents);
        return String.format("%d events from %s to %s", totalEvents,
            dateRange.earliest, dateRange.latest);
    }
}
