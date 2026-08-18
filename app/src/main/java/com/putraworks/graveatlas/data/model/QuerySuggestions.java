package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Query suggestions result.
 * Returned by GET /api/query/suggestions
 */
public class QuerySuggestions {
    public List<String> suggestions;
    public List<String> cemeteryNames;

    public static QuerySuggestions fromJson(JSONObject json) {
        QuerySuggestions qs = new QuerySuggestions();

        qs.suggestions = new ArrayList<>();
        JSONArray s = json.optJSONArray("suggestions");
        if (s != null) {
            for (int i = 0; i < s.length(); i++) {
                qs.suggestions.add(s.optString(i));
            }
        }

        qs.cemeteryNames = new ArrayList<>();
        JSONArray cn = json.optJSONArray("cemeteryNames");
        if (cn != null) {
            for (int i = 0; i < cn.length(); i++) {
                qs.cemeteryNames.add(cn.optString(i));
            }
        }

        return qs;
    }

    public boolean hasSuggestions() { return suggestions != null && !suggestions.isEmpty(); }
}
