package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Intelligent search result with relevance scoring and match reasons.
 * Returned by POST /api/search/intelligent
 */
public class IntelligentSearchResult {
    public String query;
    public ParsedQuery parsed;
    public List<SearchResultItem> results;
    public int totalFound;
    public String intent;
    public String message;

    public static class ParsedQuery {
        public String originalQuery;
        public List<String> names;
        public DateRange dateRange;
        public List<String> places;
        public List<String> cemeteryKeywords;
        public String verificationStatus;
        public Integer confidenceThreshold;
        public String confidenceDirection;
        public boolean hasAnomalies;
        public Boolean hasSources;
        public Boolean hasCoordinates;
        public int limit;
        public String sortBy;
        public String intent;
    }

    public static class DateRange {
        public String start;
        public String end;
    }

    public static class SearchResultItem {
        public String id;
        public String name;
        public String birthDate;
        public String deathDate;
        public String cemeteryId;
        public String section;
        public String plot;
        public String verificationStatus;
        public int relevanceScore;
        public List<String> matchReasons;
    }

    public static IntelligentSearchResult fromJson(JSONObject json) {
        IntelligentSearchResult result = new IntelligentSearchResult();
        result.query = json.optString("query", "");
        result.totalFound = json.optInt("totalFound", 0);
        result.intent = json.optString("intent", "search");
        result.message = json.optString("message", "");

        JSONObject p = json.optJSONObject("parsed");
        if (p != null) {
            result.parsed = new ParsedQuery();
            result.parsed.originalQuery = p.optString("originalQuery", "");
            result.parsed.verificationStatus = p.optString("verificationStatus", null);
            result.parsed.confidenceThreshold = p.has("confidenceThreshold") ? p.optInt("confidenceThreshold") : null;
            result.parsed.confidenceDirection = p.optString("confidenceDirection", null);
            result.parsed.hasAnomalies = p.optBoolean("hasAnomalies", false);
            result.parsed.hasSources = p.has("hasSources") ? (Boolean) p.opt("hasSources") : null;
            result.parsed.hasCoordinates = p.has("hasCoordinates") ? (Boolean) p.opt("hasCoordinates") : null;
            result.parsed.limit = p.optInt("limit", 50);
            result.parsed.sortBy = p.optString("sortBy", "relevance");
            result.parsed.intent = p.optString("intent", "search");

            result.parsed.names = new ArrayList<>();
            JSONArray names = p.optJSONArray("names");
            if (names != null) for (int i = 0; i < names.length(); i++) result.parsed.names.add(names.optString(i));

            result.parsed.places = new ArrayList<>();
            JSONArray places = p.optJSONArray("places");
            if (places != null) for (int i = 0; i < places.length(); i++) result.parsed.places.add(places.optString(i));

            result.parsed.cemeteryKeywords = new ArrayList<>();
            JSONArray cks = p.optJSONArray("cemeteryKeywords");
            if (cks != null) for (int i = 0; i < cks.length(); i++) result.parsed.cemeteryKeywords.add(cks.optString(i));

            JSONObject dr = p.optJSONObject("dateRange");
            if (dr != null) {
                result.parsed.dateRange = new DateRange();
                result.parsed.dateRange.start = dr.optString("start", null);
                result.parsed.dateRange.end = dr.optString("end", null);
            }
        }

        result.results = new ArrayList<>();
        JSONArray arr = json.optJSONArray("results");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject r = arr.optJSONObject(i);
                if (r == null) continue;
                SearchResultItem item = new SearchResultItem();
                item.id = r.optString("id", "");
                item.name = r.optString("name", null);
                item.birthDate = r.optString("birthDate", null);
                item.deathDate = r.optString("deathDate", null);
                item.cemeteryId = r.optString("cemeteryId", null);
                item.section = r.optString("section", null);
                item.plot = r.optString("plot", null);
                item.verificationStatus = r.optString("verificationStatus", "unverified");
                item.relevanceScore = r.optInt("relevanceScore", 0);
                item.matchReasons = new ArrayList<>();
                JSONArray reasons = r.optJSONArray("matchReasons");
                if (reasons != null) for (int j = 0; j < reasons.length(); j++) item.matchReasons.add(reasons.optString(j));
                result.results.add(item);
            }
        }

        return result;
    }

    public boolean hasResults() { return totalFound > 0; }
    public boolean isCountIntent() { return "count".equals(intent); }
    public boolean isFixIntent() { return "fix".equals(intent); }

    public String getSummaryLine() {
        if (parsed != null && parsed.dateRange != null) {
            String range = parsed.dateRange.start != null && parsed.dateRange.end != null
                ? parsed.dateRange.start + "-" + parsed.dateRange.end
                : parsed.dateRange.start != null ? "after " + parsed.dateRange.start
                : "before " + parsed.dateRange.end;
            return String.format("%d results for '%s' (%s)", totalFound, query, range);
        }
        return String.format("%d results for '%s'", totalFound, query);
    }
}
