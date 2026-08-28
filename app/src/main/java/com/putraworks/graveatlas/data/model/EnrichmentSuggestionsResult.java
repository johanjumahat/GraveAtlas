package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Enrichment suggestions result for a single record.
 * Returned by GET /api/enrichment/suggestions/:recordId
 */
public class EnrichmentSuggestionsResult {
    public String recordId;
    public String recordName;
    public int currentCompleteness;
    public List<EnrichmentSuggestion> suggestions;
    public int suggestionCount;

    public static EnrichmentSuggestionsResult fromJson(JSONObject json) {
        EnrichmentSuggestionsResult r = new EnrichmentSuggestionsResult();
        r.recordId = json.optString("recordId", "");
        r.recordName = json.optString("recordName", "Unknown");
        r.currentCompleteness = json.optInt("currentCompleteness", 0);
        r.suggestionCount = json.optInt("suggestionCount", 0);

        r.suggestions = new ArrayList<>();
        JSONArray arr = json.optJSONArray("suggestions");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject s = arr.optJSONObject(i);
                if (s != null) r.suggestions.add(EnrichmentSuggestion.fromJson(s));
            }
        }
        return r;
    }

    public List<EnrichmentSuggestion> getHighConfidenceSuggestions() {
        List<EnrichmentSuggestion> high = new ArrayList<>();
        if (suggestions != null) {
            for (EnrichmentSuggestion s : suggestions) {
                if (s.isHighConfidence()) high.add(s);
            }
        }
        return high;
    }

    public boolean hasSuggestions() { return suggestions != null && !suggestions.isEmpty(); }
}
