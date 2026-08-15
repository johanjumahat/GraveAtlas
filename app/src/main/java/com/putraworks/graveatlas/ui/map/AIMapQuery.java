package com.putraworks.graveatlas.ui.map;

import com.putraworks.graveatlas.data.model.GraveRecord;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AI Map Query Parser — interprets natural-language queries about map data.
 *
 * Phase 16.4: AI Map — natural-language map queries, historical layers, source overlays.
 *
 * Users can ask things like:
 *   "Show me graves from the 1900s in Singapore"
 *   "Find all records near Bukit Brown"
 *   "Display only source-backed records"
 *   "Show cemetery established before 1950"
 *
 * The parser extracts:
 * - Location names (city, cemetery, country)
 * - Time periods (year, decade, range)
 * - Evidence filters (source-backed, verified, unverified)
 * - Record types (grave, cemetery)
 * - Proximity queries ("near X")
 */
public class AIMapQuery {

    public static class MapQuery {
        // Filters extracted from the query
        public String locationName;        // "Singapore", "Bukit Brown"
        public Integer startYear;          // 1900
        public Integer endYear;            // 1999
        public String evidenceFilter;      // "source_backed", "verified", "unverified", null
        public String recordType;          // "grave", "cemetery", null
        public boolean proximityOnly;      // true if "near X" query
        public String originalQuery;       // Original user text
        public boolean isEmpty;            // No filters extracted
        public boolean wantsExternalSources;  // true if query asks for external source data

        public boolean hasFilters() {
            return locationName != null
                    || startYear != null
                    || endYear != null
                    || evidenceFilter != null
                    || recordType != null;
        }

        public String getDescription() {
            StringBuilder sb = new StringBuilder();
            if (recordType != null) sb.append(recordType).append("s ");
            else sb.append("records ");
            if (locationName != null) sb.append("in ").append(locationName).append(" ");
            if (startYear != null && endYear != null) {
                if (startYear.equals(endYear)) sb.append("from ").append(startYear);
                else sb.append("from ").append(startYear).append(" to ").append(endYear);
            } else if (startYear != null) sb.append("from ").append(startYear).append(" onwards");
            else if (endYear != null) sb.append("before ").append(endYear);
            if (evidenceFilter != null) sb.append(" [").append(evidenceFilter).append("]");
            return sb.toString().trim();
        }
    }

    // ── Patterns ──

    private static final Pattern YEAR_PATTERN = Pattern.compile("\\b(1[5-9]\\d{2}|20[0-5]\\d)\\b");
    private static final Pattern DECADE_PATTERN = Pattern.compile("\\b(1[5-9]|20[0-5])0s\\b");
    private static final Pattern YEAR_RANGE_PATTERN = Pattern.compile("(\\d{4})\\s*(?:to|-|–|until)\\s*(\\d{4})");
    private static final Pattern BEFORE_PATTERN = Pattern.compile("(?:before|prior to|pre-)\\s*(\\d{4})");
    private static final Pattern AFTER_PATTERN = Pattern.compile("(?:after|since|from|post-)\\s*(\\d{4})");

    private static final Pattern SOURCE_BACKED_PATTERN = Pattern.compile(
            "\\b(?:source[- ]?backed|sourced|cited|documented|verified)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern UNVERIFIED_PATTERN = Pattern.compile(
            "\\b(?:unverified|unconfirmed|needs verification|pending)\\b", Pattern.CASE_INSENSITIVE);

    private static final Pattern NEAR_PATTERN = Pattern.compile(
            "\\b(?:near|around|close to|in the area of)\\s+([\\w\\s]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern IN_PATTERN = Pattern.compile(
            "\\b(?:in|at|within)\\s+([\\w\\s]+)", Pattern.CASE_INSENSITIVE);

    private static final Pattern CEMETERY_PATTERN = Pattern.compile(
            "\\b(?:cemetery|cemeteries|memorial|memorials|burial ground|graveyard)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern GRAVE_PATTERN = Pattern.compile(
            "\\b(?:grave|graves|tomb|tombs|plot|burial|interment)\\b", Pattern.CASE_INSENSITIVE);

    /**
     * Parse a natural-language query into a structured MapQuery.
     */
    public static MapQuery parse(String query) {
        MapQuery mq = new MapQuery();
        mq.originalQuery = query;

        if (query == null || query.trim().isEmpty()) {
            mq.isEmpty = true;
            return mq;
        }

        String lower = query.toLowerCase();

        // ── Extract year range ──
        Matcher rangeMatcher = YEAR_RANGE_PATTERN.matcher(query);
        if (rangeMatcher.find()) {
            mq.startYear = Integer.parseInt(rangeMatcher.group(1));
            mq.endYear = Integer.parseInt(rangeMatcher.group(2));
        } else {
            // Check for decade (e.g., "1900s")
            Matcher decadeMatcher = DECADE_PATTERN.matcher(query);
            if (decadeMatcher.find()) {
                String decade = decadeMatcher.group(1);
                mq.startYear = Integer.parseInt(decade + "0");
                mq.endYear = mq.startYear + 9;
            } else {
                // Check before/after
                Matcher beforeMatcher = BEFORE_PATTERN.matcher(query);
                if (beforeMatcher.find()) {
                    mq.endYear = Integer.parseInt(beforeMatcher.group(1));
                }
                Matcher afterMatcher = AFTER_PATTERN.matcher(query);
                if (afterMatcher.find()) {
                    mq.startYear = Integer.parseInt(afterMatcher.group(1));
                }
                // Single year
                if (mq.startYear == null && mq.endYear == null) {
                    Matcher yearMatcher = YEAR_PATTERN.matcher(query);
                    if (yearMatcher.find()) {
                        int year = Integer.parseInt(yearMatcher.group(1));
                        mq.startYear = year;
                        mq.endYear = year;
                    }
                }
            }
        }

        // ── Extract evidence filter ──
        if (SOURCE_BACKED_PATTERN.matcher(query).find()) {
            mq.evidenceFilter = "source_backed";
        } else if (UNVERIFIED_PATTERN.matcher(query).find()) {
            mq.evidenceFilter = "unverified";
        }

        // ── Extract record type ──
        if (CEMETERY_PATTERN.matcher(query).find()) {
            mq.recordType = "cemetery";
        } else if (GRAVE_PATTERN.matcher(query).find()) {
            mq.recordType = "grave";
        }

        // ── Extract location (near X or in X) ──
        Matcher nearMatcher = NEAR_PATTERN.matcher(query);
        if (nearMatcher.find()) {
            mq.locationName = nearMatcher.group(1).trim();
            mq.proximityOnly = true;
        } else {
            Matcher inMatcher = IN_PATTERN.matcher(query);
            if (inMatcher.find()) {
                String loc = inMatcher.group(1).trim();
                // Filter out common non-location words
                if (!isStopWord(loc)) {
                    mq.locationName = loc;
                }
            }
        }

        // ── Detect external source requests ──
        if (EXTERNAL_SOURCE_PATTERN.matcher(query).find()) {
            mq.wantsExternalSources = true;
        }

        mq.isEmpty = !mq.hasFilters();
        return mq;
    }

    /**
     * Check if a word is a common stop word, not a location.
     */
    private static boolean isStopWord(String word) {
        String lower = word.toLowerCase().trim();
        String[] stops = {"the", "a", "an", "all", "this", "that", "these", "those",
                "view", "show", "display", "find", "search", "map", "records"};
        for (String s : stops) {
            if (lower.equals(s) || lower.startsWith(s + " ")) return true;
        }
        return false;
    }

    /**
     * Apply a MapQuery to filter a list of grave records.
     */
    public static List<GraveRecord> applyFilters(List<GraveRecord> records, MapQuery query) {
        if (query == null || query.isEmpty) return records;

        List<GraveRecord> filtered = new ArrayList<>();
        for (GraveRecord r : records) {
            boolean include = true;

            // Year filter (check birth or death date)
            if (query.startYear != null || query.endYear != null) {
                int recordYear = extractYear(r);
                if (recordYear > 0) {
                    if (query.startYear != null && recordYear < query.startYear) include = false;
                    if (query.endYear != null && recordYear > query.endYear) include = false;
                } else {
                    include = false; // No date → exclude from time-filtered results
                }
            }

            // Evidence filter
            if (include && query.evidenceFilter != null) {
                String status = r.verificationStatus;
                if (status == null) status = "unverified";
                if ("source_backed".equals(query.evidenceFilter)) {
                    if (!"source_backed".equals(status) && !"verified".equals(status)) include = false;
                } else if ("unverified".equals(query.evidenceFilter)) {
                    if (!"unverified".equals(status) && !"needs_verification".equals(status)) include = false;
                }
            }

            // Location filter
            if (include && query.locationName != null) {
                String loc = query.locationName.toLowerCase();
                boolean matches = false;
                if (r.cemeteryName != null && r.cemeteryName.toLowerCase().contains(loc)) matches = true;
                if (r.cemetery != null && r.cemetery.toLowerCase().contains(loc)) matches = true;
                if (r.name != null && r.name.toLowerCase().contains(loc)) matches = true;
                if (!matches) include = false;
            }

            if (include) filtered.add(r);
        }
        return filtered;
    }

    /**
     * Extract the best year from a grave record (death date preferred, then birth).
     */
    private static int extractYear(GraveRecord r) {
        String date = r.deathDate != null ? r.deathDate : r.birthDate;
        if (date == null || date.isEmpty()) return -1;
        Matcher m = YEAR_PATTERN.matcher(date);
        if (m.find()) return Integer.parseInt(m.group(1));
        return -1;
    }

    /**
     * Generate a natural-language response for the AI map query.
     */
    public static String generateResponse(MapQuery query, int resultCount) {
        if (query == null || query.isEmpty) {
            return "Showing all " + resultCount + " records on the map.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Found ").append(resultCount).append(" ");
        sb.append(query.getDescription()).append(" ");

        if (resultCount == 0) {
            sb = new StringBuilder();
            sb.append("No records match your query for ");
            sb.append(query.getDescription()).append(".");
            sb.append(" Try broadening your search criteria.");
        } else if (resultCount <= 5) {
            sb.append("— showing all results.");
        } else if (resultCount <= 50) {
            sb.append("— showing all on the map.");
        } else {
            sb.append("— displaying as clusters on the map. Zoom in for detail.");
        }

        return sb.toString();
    }
}
