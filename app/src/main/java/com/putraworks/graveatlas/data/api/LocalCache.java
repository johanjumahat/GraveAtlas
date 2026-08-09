package com.putraworks.graveatlas.data.api;

import android.content.Context;
import android.content.SharedPreferences;

import com.putraworks.graveatlas.data.model.CemeteryRecord;
import com.putraworks.graveatlas.data.model.GraveRecord;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Simple local cache for public read-only data (graves, cemeteries).
 * Uses SharedPreferences with JSON serialization.
 *
 * Cache expires after CACHE_TTL_MS. When expired, the app should fetch fresh data.
 * Never caches secrets, tokens, or credentials.
 */
public class LocalCache {

    private static final String PREFS_NAME = "graveatlas_cache";
    private static final long CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    private final SharedPreferences prefs;

    public LocalCache(Context context) {
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

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
                obj.put("section", g.section);
                obj.put("plot", g.plot);
                obj.put("latitude", g.latitude);
                obj.put("longitude", g.longitude);
                obj.put("notes", g.notes);
                obj.put("status", g.status);
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
                JSONObject obj = arr.getJSONObject(i);
                GraveRecord g = new GraveRecord();
                g.id = obj.optString("id", null);
                g.name = obj.optString("name", null);
                g.birthDate = obj.optString("birthDate", null);
                g.deathDate = obj.optString("deathDate", null);
                g.cemetery = obj.optString("cemetery", null);
                g.section = obj.optString("section", null);
                g.plot = obj.optString("plot", null);
                g.latitude = obj.optDouble("latitude", 0);
                g.longitude = obj.optDouble("longitude", 0);
                g.notes = obj.optString("notes", null);
                g.status = obj.optString("status", null);
                graves.add(g);
            }
            return graves;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public void cacheCemeteries(List<CemeteryRecord> cemeteries) {
        try {
            JSONArray arr = new JSONArray();
            for (CemeteryRecord c : cemeteries) {
                JSONObject obj = new JSONObject();
                obj.put("id", c.id);
                obj.put("name", c.name);
                obj.put("address", c.address);
                obj.put("latitude", c.latitude);
                obj.put("longitude", c.longitude);
                obj.put("description", c.description);
                obj.put("status", c.status);
                arr.put(obj);
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
                JSONObject obj = arr.getJSONObject(i);
                CemeteryRecord c = new CemeteryRecord();
                c.id = obj.optString("id", null);
                c.name = obj.optString("name", null);
                c.address = obj.optString("address", null);
                c.latitude = obj.optDouble("latitude", 0);
                c.longitude = obj.optDouble("longitude", 0);
                c.description = obj.optString("description", null);
                c.status = obj.optString("status", null);
                cemeteries.add(c);
            }
            return cemeteries;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

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
}
