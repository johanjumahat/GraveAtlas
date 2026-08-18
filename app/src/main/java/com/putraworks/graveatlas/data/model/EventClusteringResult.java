package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Event clustering result — identifies historical events from burial patterns.
 * Returned by GET /api/linkage/events
 */
public class EventClusteringResult {
    public int threshold;
    public int totalEvents;
    public List<HistoricalEvent> events;
    public YearRange yearRange;

    public static class HistoricalEvent {
        public int year;
        public int deathCount;
        public List<String> cemeteries;
        public int cemeteryCount;
        public boolean isSpike;
        public String spikeRatio;
        public List<String> notableNames;
        public String possibleEvent;

        public static HistoricalEvent fromJson(JSONObject json) {
            HistoricalEvent e = new HistoricalEvent();
            e.year = json.optInt("year", 0);
            e.deathCount = json.optInt("deathCount", 0);
            e.cemeteryCount = json.optInt("cemeteryCount", 0);
            e.isSpike = json.optBoolean("isSpike", false);
            e.spikeRatio = json.has("spikeRatio") && !json.isNull("spikeRatio") ? json.optString("spikeRatio") : null;
            e.possibleEvent = json.optString("possibleEvent", "");

            e.cemeteries = new ArrayList<>();
            JSONArray c = json.optJSONArray("cemeteries");
            if (c != null) {
                for (int i = 0; i < c.length(); i++) {
                    e.cemeteries.add(c.optString(i));
                }
            }

            e.notableNames = new ArrayList<>();
            JSONArray n = json.optJSONArray("notableNames");
            if (n != null) {
                for (int i = 0; i < n.length(); i++) {
                    e.notableNames.add(n.optString(i));
                }
            }
            return e;
        }
    }

    public static class YearRange {
        public int earliest;
        public int latest;

        public static YearRange fromJson(JSONObject json) {
            YearRange yr = new YearRange();
            yr.earliest = json.optInt("earliest", 0);
            yr.latest = json.optInt("latest", 0);
            return yr;
        }
    }

    public static EventClusteringResult fromJson(JSONObject json) {
        EventClusteringResult r = new EventClusteringResult();
        r.threshold = json.optInt("threshold", 5);
        r.totalEvents = json.optInt("totalEvents", 0);

        r.events = new ArrayList<>();
        JSONArray events = json.optJSONArray("events");
        if (events != null) {
            for (int i = 0; i < events.length(); i++) {
                JSONObject e = events.optJSONObject(i);
                if (e != null) r.events.add(HistoricalEvent.fromJson(e));
            }
        }

        JSONObject yr = json.optJSONObject("yearRange");
        if (yr != null) r.yearRange = YearRange.fromJson(yr);

        return r;
    }

    public boolean hasEvents() { return events != null && !events.isEmpty(); }
    public List<HistoricalEvent> getSpikes() {
        List<HistoricalEvent> spikes = new ArrayList<>();
        if (events != null) {
            for (HistoricalEvent e : events) {
                if (e.isSpike) spikes.add(e);
            }
        }
        return spikes;
    }
}
