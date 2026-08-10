package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Response model for the global search endpoint (Phase 7A).
 * Contains categorized results with per-category counts and pagination info.
 */
public class GlobalSearchResponse {
    public List<SearchResult> results;
    public Map<String, Integer> categories; // category -> count
    public int count;       // results in current page
    public int total;       // total results across all pages
    public int page;
    public int pageSize;
    public boolean hasMore;
    public String query;
    public String message;  // optional message (empty results, etc.)

    public static GlobalSearchResponse fromJson(JSONObject json) {
        GlobalSearchResponse resp = new GlobalSearchResponse();
        resp.results = new ArrayList<>();
        resp.categories = new HashMap<>();

        JSONArray resultsArr = json.optJSONArray("results");
        if (resultsArr != null) {
            resp.results = SearchResult.fromJsonArray(resultsArr);
        }

        JSONObject catObj = json.optJSONObject("categories");
        if (catObj != null) {
            java.util.Iterator<String> keys = catObj.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                resp.categories.put(key, catObj.optInt(key, 0));
            }
        }

        resp.count = json.optInt("count", 0);
        resp.total = json.optInt("total", 0);
        resp.page = json.optInt("page", 1);
        resp.pageSize = json.optInt("pageSize", 20);
        resp.hasMore = json.optBoolean("hasMore", false);
        resp.query = json.optString("query", "");
        resp.message = json.optString("message", "");

        return resp;
    }

    public int getCategoryCount(String category) {
        Integer count = categories.get(category);
        return count != null ? count : 0;
    }

    public boolean hasResults() {
        return results != null && !results.isEmpty();
    }
}
