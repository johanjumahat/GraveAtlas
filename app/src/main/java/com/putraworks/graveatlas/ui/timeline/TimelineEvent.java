package com.putraworks.graveatlas.ui.timeline;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * Timeline event model — represents a single point on a chronological timeline.
 *
 * Phase 16.3: AI Timelines — interactive timelines linking DATE → EVENT → RECORD → SOURCE.
 *
 * Each event wraps a GraveRecord (or cemetery) and provides:
 * - Event type (BIRTH, DEATH, BURIAL, CEMETERY_ESTABLISHED, INSCRIPTION, RECORD_CREATED)
 * - Date (parsed from the record's date fields)
 * - Display label and description
 * - Evidence status (from the underlying record)
 * - Source references
 */
public class TimelineEvent {

    public enum EventType {
        BIRTH("Birth"),
        DEATH("Death"),
        BURIAL("Burial"),
        CEMETERY_ESTABLISHED("Cemetery Established"),
        INSCRIPTION("Inscription"),
        RECORD_CREATED("Record Added"),
        RECORD_UPDATED("Record Updated");

        public final String label;

        EventType(String label) {
            this.label = label;
        }
    }

    public String id;
    public EventType type;
    public String date;         // ISO date (YYYY-MM-DD) or partial (YYYY, YYYY-MM)
    public String year;         // Extracted year for sorting
    public String title;        // Display title (person name or cemetery name)
    public String description;  // Additional context
    public String recordId;     // ID of the GraveRecord or Cemetery
    public String recordType;   // "grave" or "cemetery"
    public String cemeteryName; // Name of the cemetery
    public String verificationStatus;
    public List<String> sourceRefs;
    public double latitude;
    public double longitude;

    public TimelineEvent() {
        sourceRefs = new ArrayList<>();
    }

    /**
     * Check if this event has a valid date for sorting.
     */
    public boolean hasValidDate() {
        return year != null && !year.isEmpty();
    }

    /**
     * Get a formatted date string for display.
     */
    public String getFormattedDate() {
        if (date == null || date.isEmpty()) return "Unknown date";
        // Handle partial dates
        if (date.length() == 4) return date; // Year only
        if (date.length() == 7) return date; // YYYY-MM
        if (date.length() >= 10) {
            // YYYY-MM-DD → readable format
            String[] parts = date.substring(0, 10).split("-");
            if (parts.length >= 3) {
                String[] months = {"Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
                try {
                    int month = Integer.parseInt(parts[1]);
                    if (month >= 1 && month <= 12) {
                        return months[month - 1] + " " + parts[2] + ", " + parts[0];
                    }
                } catch (NumberFormatException e) { /* ignore */ }
            }
        }
        return date;
    }

    /**
     * Get the year as an integer for sorting. Returns -1 if unknown.
     */
    public int getYearInt() {
        if (year == null || year.isEmpty()) return -1;
        try {
            return Integer.parseInt(year);
        } catch (NumberFormatException e) {
            // Try to extract first 4 digits
            for (int i = 0; i < year.length() - 3; i++) {
                try {
                    return Integer.parseInt(year.substring(i, i + 4));
                } catch (NumberFormatException ignored) {}
            }
            return -1;
        }
    }

    /**
     * Build a TimelineEvent from a GraveRecord's birth date.
     */
    public static TimelineEvent fromBirth(com.putraworks.graveatlas.data.model.GraveRecord grave) {
        TimelineEvent event = new TimelineEvent();
        event.id = "birth_" + grave.id;
        event.type = EventType.BIRTH;
        event.date = grave.birthDate;
        event.year = extractYear(grave.birthDate);
        event.title = grave.name != null ? grave.name : "Unknown";
        event.description = "Born" + (grave.cemeteryName != null ? " — later interred at " + grave.cemeteryName : "");
        event.recordId = grave.id;
        event.recordType = "grave";
        event.cemeteryName = grave.cemeteryName;
        event.verificationStatus = grave.verificationStatus;
        event.sourceRefs = grave.sourceRefs;
        event.latitude = grave.latitude;
        event.longitude = grave.longitude;
        return event;
    }

    /**
     * Build a TimelineEvent from a GraveRecord's death date.
     */
    public static TimelineEvent fromDeath(com.putraworks.graveatlas.data.model.GraveRecord grave) {
        TimelineEvent event = new TimelineEvent();
        event.id = "death_" + grave.id;
        event.type = EventType.DEATH;
        event.date = grave.deathDate;
        event.year = extractYear(grave.deathDate);
        event.title = grave.name != null ? grave.name : "Unknown";
        event.description = "Passed away" + (grave.cemeteryName != null ? " — interred at " + grave.cemeteryName : "");
        event.recordId = grave.id;
        event.recordType = "grave";
        event.cemeteryName = grave.cemeteryName;
        event.verificationStatus = grave.verificationStatus;
        event.sourceRefs = grave.sourceRefs;
        event.latitude = grave.latitude;
        event.longitude = grave.longitude;
        return event;
    }

    /**
     * Build a TimelineEvent from a GraveRecord's submission date.
     */
    public static TimelineEvent fromRecordCreated(com.putraworks.graveatlas.data.model.GraveRecord grave) {
        TimelineEvent event = new TimelineEvent();
        event.id = "created_" + grave.id;
        event.type = EventType.RECORD_CREATED;
        event.date = grave.submittedAt;
        event.year = extractYear(grave.submittedAt);
        event.title = "Record added: " + (grave.name != null ? grave.name : "Unknown");
        event.description = "Community contribution to GraveAtlas";
        event.recordId = grave.id;
        event.recordType = "grave";
        event.cemeteryName = grave.cemeteryName;
        event.verificationStatus = grave.verificationStatus;
        event.sourceRefs = grave.sourceRefs;
        return event;
    }

    /**
     * Build a TimelineEvent from a cemetery's establishment date.
     */
    public static TimelineEvent fromCemeteryEstablished(String cemeteryId, String cemeteryName, String establishedDate, double lat, double lon) {
        TimelineEvent event = new TimelineEvent();
        event.id = "est_" + cemeteryId;
        event.type = EventType.CEMETERY_ESTABLISHED;
        event.date = establishedDate;
        event.year = extractYear(establishedDate);
        event.title = cemeteryName != null ? cemeteryName : "Unknown Cemetery";
        event.description = "Cemetery established";
        event.recordId = cemeteryId;
        event.recordType = "cemetery";
        event.verificationStatus = "source_backed";
        event.latitude = lat;
        event.longitude = lon;
        return event;
    }

    /**
     * Extract a 4-digit year from a date string.
     * Handles YYYY-MM-DD, YYYY-MM, YYYY, and ISO timestamps.
     */
    public static String extractYear(String date) {
        if (date == null || date.isEmpty()) return "";
        // Try to find a 4-digit year
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\d{4}").matcher(date);
        if (m.find()) {
            return m.group();
        }
        return "";
    }

    /**
     * Sort a list of events chronologically (oldest first).
     */
    public static List<TimelineEvent> sortChronologically(List<TimelineEvent> events) {
        List<TimelineEvent> sorted = new ArrayList<>(events);
        Collections.sort(sorted, new Comparator<TimelineEvent>() {
            @Override
            public int compare(TimelineEvent a, TimelineEvent b) {
                int yearA = a.getYearInt();
                int yearB = b.getYearInt();
                if (yearA == -1 && yearB == -1) return 0;
                if (yearA == -1) return 1;  // Unknown dates go last
                if (yearB == -1) return -1;
                return Integer.compare(yearA, yearB);
            }
        });
        return sorted;
    }

    /**
     * Filter events to a specific year range (inclusive).
     */
    public static List<TimelineEvent> filterByYearRange(List<TimelineEvent> events, int startYear, int endYear) {
        List<TimelineEvent> filtered = new ArrayList<>();
        for (TimelineEvent e : events) {
            int year = e.getYearInt();
            if (year >= startYear && year <= endYear) {
                filtered.add(e);
            }
        }
        return filtered;
    }

    /**
     * Group events by decade.
     * Returns a list of {decade, events} pairs.
     */
    public static List<DecadeGroup> groupByDecade(List<TimelineEvent> events) {
        List<DecadeGroup> groups = new ArrayList<>();
        java.util.Map<Integer, List<TimelineEvent>> decadeMap = new java.util.TreeMap<>();

        for (TimelineEvent e : events) {
            int year = e.getYearInt();
            if (year == -1) continue;
            int decade = (year / 10) * 10;
            if (!decadeMap.containsKey(decade)) {
                decadeMap.put(decade, new ArrayList<>());
            }
            decadeMap.get(decade).add(e);
        }

        for (java.util.Map.Entry<Integer, List<TimelineEvent>> entry : decadeMap.entrySet()) {
            DecadeGroup group = new DecadeGroup();
            group.decade = entry.getKey();
            group.label = entry.getKey() + "s";
            group.events = sortChronologically(entry.getValue());
            groups.add(group);
        }

        return groups;
    }

    /**
     * A group of events in a single decade.
     */
    public static class DecadeGroup {
        public int decade;
        public String label;
        public List<TimelineEvent> events;

        public int getEventCount() {
            return events != null ? events.size() : 0;
        }
    }

    /**
     * Generate a natural-language timeline summary for AI chat.
     * Example: "3 events from 1900s-1950s: 2 births, 1 death"
     */
    public static String generateSummary(List<TimelineEvent> events) {
        if (events == null || events.isEmpty()) return "No timeline events available.";

        List<TimelineEvent> sorted = sortChronologically(events);
        int firstYear = sorted.get(0).getYearInt();
        int lastYear = sorted.get(sorted.size() - 1).getYearInt();

        int births = 0, deaths = 0, burials = 0, other = 0;
        for (TimelineEvent e : events) {
            switch (e.type) {
                case BIRTH: births++; break;
                case DEATH: deaths++; break;
                case BURIAL: burials++; break;
                default: other++; break;
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append(events.size()).append(" event(s)");
        if (firstYear != -1 && lastYear != -1 && firstYear != lastYear) {
            sb.append(" spanning ").append(firstYear).append(" to ").append(lastYear);
        } else if (firstYear != -1) {
            sb.append(" in ").append(firstYear);
        }
        sb.append(": ");
        if (births > 0) sb.append(births).append(births == 1 ? " birth" : " births");
        if (deaths > 0) {
            if (births > 0) sb.append(", ");
            sb.append(deaths).append(deaths == 1 ? " death" : " deaths");
        }
        if (burials > 0) sb.append(", ").append(burials).append(burials == 1 ? " burial" : " burials");
        if (other > 0) sb.append(", ").append(other).append(" other");
        sb.append(".");

        return sb.toString();
    }

    /**
     * Convert event to JSON for persistence or AI context.
     */
    public JSONObject toJson() {
        JSONObject json = new JSONObject();
        try {
            json.put("id", id);
            json.put("type", type.name());
            json.put("date", date != null ? date : "");
            json.put("year", year != null ? year : "");
            json.put("title", title != null ? title : "");
            json.put("description", description != null ? description : "");
            json.put("recordId", recordId != null ? recordId : "");
            json.put("recordType", recordType != null ? recordType : "");
            json.put("cemeteryName", cemeteryName != null ? cemeteryName : "");
            json.put("verificationStatus", verificationStatus != null ? verificationStatus : "");
            json.put("latitude", latitude);
            json.put("longitude", longitude);
            JSONArray refs = new JSONArray();
            for (String ref : sourceRefs) refs.put(ref);
            json.put("sourceRefs", refs);
        } catch (Exception e) { /* ignore */ }
        return json;
    }
}
