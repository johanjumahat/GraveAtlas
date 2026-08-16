package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Autocomplete suggestion for search.
 * Returned by GET /api/search/suggest
 */
public class SearchSuggestion {
    public String text;
    public String type;  // filter, date, place, name, count, intent

    public static List<SearchSuggestion> fromJson(JSONObject json) {
        List<SearchSuggestion> result = new ArrayList<>();
        JSONArray arr = json.optJSONArray("suggestions");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject s = arr.optJSONObject(i);
                if (s == null) continue;
                SearchSuggestion suggestion = new SearchSuggestion();
                suggestion.text = s.optString("text", "");
                suggestion.type = s.optString("type", "unknown");
                result.add(suggestion);
            }
        }
        return result;
    }

    public boolean isFilter() { return "filter".equals(type); }
    public boolean isDate() { return "date".equals(type); }
    public boolean isPlace() { return "place".equals(type); }
    public boolean isName() { return "name".equals(type); }
    public boolean isCount() { return "count".equals(type); }
    public boolean isIntent() { return "intent".equals(type); }

    public String getTypeIcon() {
        switch (type) {
            case "filter": return "🔍";
            case "date": return "📅";
            case "place": return "📍";
            case "name": return "👤";
            case "count": return "🔢";
            case "intent": return "🎯";
            default: return "💡";
        }
    }

    public String getDisplayLine() {
        return String.format("%s %s", getTypeIcon(), text);
    }
}
