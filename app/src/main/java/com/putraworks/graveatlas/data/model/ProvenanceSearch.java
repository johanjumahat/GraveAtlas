package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Search results for provenance entries across all records.
 * Returned by GET /api/provenance/search
 */
public class ProvenanceSearch {
    public List<SearchEntry> results;
    public int totalFound;
    public SearchFilters filters;

    public static class SearchEntry extends ProvenanceChain.ProvenanceEntry {
        public String recordId;
        public String recordName;
    }

    public static class SearchFilters {
        public String actor;
        public String action;
        public String actorRole;
        public String recordId;
        public String startDate;
        public String endDate;
    }

    public static ProvenanceSearch fromJson(JSONObject json) {
        ProvenanceSearch result = new ProvenanceSearch();
        result.totalFound = json.optInt("totalFound", 0);

        result.results = new ArrayList<>();
        JSONArray arr = json.optJSONArray("results");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject e = arr.optJSONObject(i);
                if (e == null) continue;
                SearchEntry entry = new SearchEntry();
                entry.timestamp = e.optString("timestamp", "unknown");
                entry.action = e.optString("action", "");
                entry.actor = e.optString("actor", "unknown");
                entry.actorRole = e.optString("actorRole", "");
                entry.description = e.optString("description", "");
                entry.recordId = e.optString("recordId", "");
                entry.recordName = e.optString("recordName", "Unknown");

                entry.fields = new ArrayList<>();
                JSONArray fields = e.optJSONArray("fields");
                if (fields != null) {
                    for (int j = 0; j < fields.length(); j++) entry.fields.add(fields.optString(j));
                }

                entry.source = new ArrayList<>();
                JSONArray source = e.optJSONArray("source");
                if (source != null) {
                    for (int j = 0; j < source.length(); j++) entry.source.add(source.optString(j));
                }

                result.results.add(entry);
            }
        }

        JSONObject f = json.optJSONObject("filters");
        if (f != null) {
            result.filters = new SearchFilters();
            result.filters.actor = f.optString("actor", null);
            result.filters.action = f.optString("action", null);
            result.filters.actorRole = f.optString("actorRole", null);
            result.filters.recordId = f.optString("recordId", null);
            result.filters.startDate = f.optString("startDate", null);
            result.filters.endDate = f.optString("endDate", null);
        }

        return result;
    }
}
