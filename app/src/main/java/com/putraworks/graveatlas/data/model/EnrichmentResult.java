package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Record enrichment result — AI-suggested missing field values.
 * Returned by GET /api/graves/{id}/enrich
 */
public class EnrichmentResult {
    public String recordId;
    public String recordName;
    public int suggestionsCount;
    public List<EnrichmentSuggestion> suggestions;

    public static class EnrichmentSuggestion {
        public String field;
        public Object suggestedValue; // String, List<String>, or List<JSONObject>
        public String confidence; // "high", "medium", "low"
        public String reason;
    }

    public static EnrichmentResult fromJson(JSONObject json) {
        EnrichmentResult result = new EnrichmentResult();
        result.recordId = json.optString("recordId", null);
        result.recordName = json.optString("recordName", null);
        result.suggestionsCount = json.optInt("suggestionsCount", 0);
        result.suggestions = new ArrayList<>();

        JSONArray arr = json.optJSONArray("suggestions");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject sug = arr.optJSONObject(i);
                if (sug == null) continue;

                EnrichmentSuggestion s = new EnrichmentSuggestion();
                s.field = sug.optString("field", null);
                s.confidence = sug.optString("confidence", "low");
                s.reason = sug.optString("reason", null);

                // suggestedValue can be string, array, or null
                if (sug.has("suggestedValue") && !sug.isNull("suggestedValue")) {
                    Object val = sug.opt("suggestedValue");
                    s.suggestedValue = val;
                }

                result.suggestions.add(s);
            }
        }

        return result;
    }

    /**
     * Returns suggestions filtered by confidence level.
     */
    public List<EnrichmentSuggestion> getSuggestionsByConfidence(String level) {
        List<EnrichmentSuggestion> filtered = new ArrayList<>();
        for (EnrichmentSuggestion s : suggestions) {
            if (level.equalsIgnoreCase(s.confidence)) {
                filtered.add(s);
            }
        }
        return filtered;
    }

    /**
     * Returns only high-confidence suggestions.
     */
    public List<EnrichmentSuggestion> getHighConfidenceSuggestions() {
        return getSuggestionsByConfidence("high");
    }

    /**
     * Count of high-confidence suggestions.
     */
    public int getHighConfidenceCount() {
        return getHighConfidenceSuggestions().size();
    }
}
