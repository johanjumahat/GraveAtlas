package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Enrichment suggestions for a single record.
 * Returned by GET /api/enrichment/suggestions/:recordId
 */
public class EnrichmentSuggestion {
    public String field;
    public Object suggestedValue;
    public String suggestedName;
    public int confidence;
    public String source;
    public String reasoning;

    public static EnrichmentSuggestion fromJson(JSONObject json) {
        EnrichmentSuggestion es = new EnrichmentSuggestion();
        es.field = json.optString("field", "");
        es.suggestedName = json.optString("suggestedName", null);

        // Value can be int or string
        Object val = json.opt("suggestedValue");
        if (val != null) es.suggestedValue = val;

        es.confidence = json.optInt("confidence", 0);
        es.source = json.optString("source", "");
        es.reasoning = json.optString("reasoning", "");
        return es;
    }

    public boolean isHighConfidence() { return confidence >= 75; }
    public boolean isMediumConfidence() { return confidence >= 50 && confidence < 75; }
    public boolean isLowConfidence() { return confidence < 50; }
}
