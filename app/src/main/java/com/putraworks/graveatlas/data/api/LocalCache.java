package com.putraworks.graveatlas.data.api;

import android.content.Context;
import android.content.SharedPreferences;

import com.putraworks.graveatlas.data.model.CemeteryRecord;
import com.putraworks.graveatlas.data.model.GraveRecord;
import com.putraworks.graveatlas.data.model.SearchResult;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Simple local cache for public read-only data (graves, cemeteries, search results).
 * Uses SharedPreferences with JSON serialization.
 *
 * Cache expires after CACHE_TTL_MS. When expired, the app fetches fresh data.
 * Search results cached with shorter TTL (SEARCH_CACHE_TTL_MS).
 * Never caches secrets, tokens, or credentials.
 *
 * Part 39: Performance — search result caching to avoid repeated API calls.
 */
public class LocalCache {

    private static final String PREFS_NAME = "graveatlas_cache";
    private static final long CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for list data
    private static final long SEARCH_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes for search
    private static final int MAX_SEARCH_CACHE_ENTRIES = 20;

    private final SharedPreferences prefs;

    public LocalCache(Context context) {
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    // ── Graves cache ──

    public void cacheGraves(List<GraveRecord> graves) {
        try {
            JSONArray arr = new JSONArray();
            for (GraveRecord g : graves) {
                JSONObject obj = new JSONObject();
                obj.put("id", g.id);
                obj.put("name", g.name);
                obj.put("birthDate", g.birthDate);
                obj.put("deathDate", g.deathDate);
                obj.put("cemetery", g.cemetery);
                obj.put("cemeteryId", g.cemeteryId);
                obj.put("cemeteryName", g.cemeteryName);
                obj.put("section", g.section);
                obj.put("plot", g.plot);
                obj.put("latitude", g.latitude);
                obj.put("longitude", g.longitude);
                obj.put("notes", g.notes);
                obj.put("inscription", g.inscription);
                obj.put("status", g.status);
                obj.put("verificationStatus", g.verificationStatus);
                arr.put(obj);
            }
            prefs.edit()
                    .putString("graves", arr.toString())
                    .putLong("graves_cached_at", System.currentTimeMillis())
                    .apply();
        } catch (Exception e) { /* ignore */ }
    }

    public List<GraveRecord> getCachedGraves() {
        String json = prefs.getString("graves", null);
        if (json == null) return new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(json);
            List<GraveRecord> graves = new ArrayList<>();
            for (int i = 0; i < arr.length(); i++) {
                graves.add(GraveRecord.fromJson(arr.getJSONObject(i)));
            }
            return graves;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    // ── Cemeteries cache ──

    public void cacheCemeteries(List<CemeteryRecord> cemeteries) {
        try {
            JSONArray arr = new JSONArray();
            for (CemeteryRecord c : cemeteries) {
                arr.put(CemeteryRecordToJson(c));
            }
            prefs.edit()
                    .putString("cemeteries", arr.toString())
                    .putLong("cemeteries_cached_at", System.currentTimeMillis())
                    .apply();
        } catch (Exception e) { /* ignore */ }
    }

    public List<CemeteryRecord> getCachedCemeteries() {
        String json = prefs.getString("cemeteries", null);
        if (json == null) return new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(json);
            List<CemeteryRecord> cemeteries = new ArrayList<>();
            for (int i = 0; i < arr.length(); i++) {
                cemeteries.add(CemeteryRecord.fromJson(arr.getJSONObject(i)));
            }
            return cemeteries;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private JSONObject CemeteryRecordToJson(CemeteryRecord c) {
        JSONObject obj = new JSONObject();
        try {
            obj.put("id", c.id);
            obj.put("name", c.name);
            obj.put("localName", c.localName);
            obj.put("country", c.country);
            obj.put("region", c.region);
            obj.put("city", c.city);
            obj.put("address", c.address);
            obj.put("latitude", c.latitude);
            obj.put("longitude", c.longitude);
            obj.put("description", c.description);
            obj.put("cemeteryType", c.cemeteryType);
            obj.put("operatingStatus", c.operatingStatus);
            obj.put("status", c.status);
            obj.put("verificationStatus", c.verificationStatus);
        } catch (Exception e) { /* ignore */ }
        return obj;
    }

    // ── Search results cache (Part 39) ──

    public void cacheSearchResults(String query, List<SearchResult> results) {
        try {
            JSONArray arr = new JSONArray();
            for (SearchResult r : results) {
                JSONObject obj = new JSONObject();
                obj.put("type", r.type);
                obj.put("id", r.id);
                obj.put("name", r.name);
                obj.put("country", r.country);
                obj.put("city", r.city);
                obj.put("cemetery", r.cemetery);
                obj.put("cemeteryId", r.cemeteryId);
                obj.put("birthDate", r.birthDate);
                obj.put("deathDate", r.deathDate);
                if (r.latitude != null) obj.put("latitude", r.latitude);
                if (r.longitude != null) obj.put("longitude", r.longitude);
                arr.put(obj);
            }
            String cacheKey = "search_" + sanitizeKey(query);
            prefs.edit()
                    .putString(cacheKey, arr.toString())
                    .putLong(cacheKey + "_at", System.currentTimeMillis())
                    .apply();
        } catch (Exception e) { /* ignore */ }
    }

    public List<SearchResult> getCachedSearchResults(String query) {
        String cacheKey = "search_" + sanitizeKey(query);
        long cachedAt = prefs.getLong(cacheKey + "_at", 0);
        if (System.currentTimeMillis() - cachedAt > SEARCH_CACHE_TTL_MS) {
            return null; // Cache expired
        }
        String json = prefs.getString(cacheKey, null);
        if (json == null) return null;
        try {
            JSONArray arr = new JSONArray(json);
            return SearchResult.fromJsonArray(arr);
        } catch (Exception e) {
            return null;
        }
    }

    public boolean isSearchCacheValid(String query) {
        String cacheKey = "search_" + sanitizeKey(query);
        long cachedAt = prefs.getLong(cacheKey + "_at", 0);
        return System.currentTimeMillis() - cachedAt < SEARCH_CACHE_TTL_MS;
    }

    private String sanitizeKey(String query) {
        return query.toLowerCase().trim().replaceAll("[^a-z0-9]", "_").substring(0, Math.min(query.length(), 50));
    }

    // ── Cache validity checks ──

    public boolean isGravesCacheValid() {
        long cachedAt = prefs.getLong("graves_cached_at", 0);
        return System.currentTimeMillis() - cachedAt < CACHE_TTL_MS;
    }

    public boolean isCemeteriesCacheValid() {
        long cachedAt = prefs.getLong("cemeteries_cached_at", 0);
        return System.currentTimeMillis() - cachedAt < CACHE_TTL_MS;
    }

    public void clear() {
        prefs.edit().clear().apply();
    }

    public void clearSearchCache() {
        SharedPreferences.Editor editor = prefs.edit();
        for (String key : prefs.getAll().keySet()) {
            if (key.startsWith("search_")) {
                editor.remove(key);
            }
        }
        editor.apply();
    }
}
