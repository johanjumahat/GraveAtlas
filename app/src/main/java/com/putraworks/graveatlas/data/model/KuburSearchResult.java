package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Kubur Search connector result — deep-link search results from kubursearch.com.
 */
public class KuburSearchResult {
    public String query;
    public String attribution;
    public String note;
    public String website;
    public List<SearchLink> searchLinks;
    public List<CemeteryCoverage> cemeteries;
    public int total;
    public List<String> sourcesQueried;

    public static class SearchLink {
        public String url;
        public String description;
        public String type;      // search, cemetery, special

        public static SearchLink fromJson(JSONObject json) {
            SearchLink link = new SearchLink();
            link.url = json.optString("url", "");
            link.description = json.optString("description", "");
            link.type = json.optString("type", "");
            return link;
        }
    }

    public static class CemeteryCoverage {
        public String name;
        public String region;
        public double latitude;
        public double longitude;
        public String type;
        public String status;
        public String coverageStatus;
        public String recordCount;
        public String kuburSearchUrl;
        public String notes;

        public static CemeteryCoverage fromJson(JSONObject json) {
            CemeteryCoverage c = new CemeteryCoverage();
            c.name = json.optString("name", "");
            c.region = json.optString("region", "");
            c.latitude = json.optDouble("latitude", 0);
            c.longitude = json.optDouble("longitude", 0);
            c.type = json.optString("type", "muslim");
            c.status = json.optString("status", "active");
            c.coverageStatus = json.optString("coverageStatus", "unknown");
            c.recordCount = json.optString("recordCount", "");
            c.kuburSearchUrl = json.optString("kuburSearchUrl", "");
            c.notes = json.optString("notes", "");
            return c;
        }
    }

    public static KuburSearchResult fromJson(JSONObject json) {
        KuburSearchResult result = new KuburSearchResult();
        result.query = json.optString("query", null);
        result.attribution = json.optString("attribution", "Kubur Search — kubursearch.com");
        result.note = json.optString("note", "");
        result.website = json.optString("website", "https://kubursearch.com");
        result.total = json.optInt("total", 0);

        result.searchLinks = new ArrayList<>();
        JSONArray linkArr = json.optJSONArray("searchLinks");
        if (linkArr != null) {
            for (int i = 0; i < linkArr.length(); i++) {
                result.searchLinks.add(SearchLink.fromJson(linkArr.optJSONObject(i)));
            }
        }

        result.cemeteries = new ArrayList<>();
        JSONArray cemArr = json.optJSONArray("cemeteries");
        if (cemArr != null) {
            for (int i = 0; i < cemArr.length(); i++) {
                result.cemeteries.add(CemeteryCoverage.fromJson(cemArr.optJSONObject(i)));
            }
        }

        result.sourcesQueried = new ArrayList<>();
        JSONArray srcArr = json.optJSONArray("sourcesQueried");
        if (srcArr != null) {
            for (int i = 0; i < srcArr.length(); i++) {
                result.sourcesQueried.add(srcArr.optString(i));
            }
        }

        return result;
    }

    public boolean hasResults() { return total > 0; }
    public boolean hasCemeteryCoverage() { return cemeteries != null && cemeteries.size() > 0; }
}
