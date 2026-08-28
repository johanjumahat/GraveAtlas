package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Multi-country source coverage and search results.
 * Returned by Phase 18 endpoints.
 */
public class SourceCoverageResult {
    public int totalSources;
    public int implementedSources;
    public int totalCountries;
    public List<SourceEntry> globalSources;
    public List<CountrySources> countries;

    public static class SourceEntry {
        public String sourceId;
        public String sourceName;
        public String dataType;
        public String coverage;
        public String license;
        public String attribution;

        public static SourceEntry fromJson(JSONObject json) {
            SourceEntry e = new SourceEntry();
            e.sourceId = json.optString("sourceId", "");
            e.sourceName = json.optString("sourceName", "");
            e.dataType = json.optString("dataType", "");
            e.coverage = json.optString("coverage", "");
            e.license = json.optString("license", "");
            e.attribution = json.optString("attribution", "");
            return e;
        }
    }

    public static class CountrySources {
        public String country;
        public int totalSources;
        public List<SourceEntry> sources;

        public static CountrySources fromJson(JSONObject json) {
            CountrySources cs = new CountrySources();
            cs.country = json.optString("country", "");
            cs.totalSources = json.optInt("totalSources", 0);
            cs.sources = new ArrayList<>();
            JSONArray arr = json.optJSONArray("sources");
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject s = arr.optJSONObject(i);
                    if (s != null) cs.sources.add(SourceEntry.fromJson(s));
                }
            }
            return cs;
        }
    }

    public static SourceCoverageResult fromJson(JSONObject json) {
        SourceCoverageResult r = new SourceCoverageResult();
        r.totalSources = json.optInt("totalSources", 0);
        r.implementedSources = json.optInt("implementedSources", 0);
        r.totalCountries = json.optInt("totalCountries", 0);

        r.globalSources = new ArrayList<>();
        JSONArray global = json.optJSONArray("global");
        if (global != null) {
            for (int i = 0; i < global.length(); i++) {
                JSONObject s = global.optJSONObject(i);
                if (s != null) r.globalSources.add(SourceEntry.fromJson(s));
            }
        }

        r.countries = new ArrayList<>();
        JSONArray countries = json.optJSONArray("countries");
        if (countries != null) {
            for (int i = 0; i < countries.length(); i++) {
                JSONObject c = countries.optJSONObject(i);
                if (c != null) r.countries.add(CountrySources.fromJson(c));
            }
        }
        return r;
    }

    public boolean hasGlobalSources() { return globalSources != null && !globalSources.isEmpty(); }
    public boolean hasMultipleCountries() { return totalCountries > 1; }
}
