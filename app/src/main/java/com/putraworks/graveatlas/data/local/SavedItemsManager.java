package com.putraworks.graveatlas.data.local;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Local storage manager for saved items and recently viewed records (Phase 7B).
 * All data is stored locally in SharedPreferences — never uploaded to server.
 *
 * Saved items: cemeteries, people, memorials (Part 122-123)
 * Recently viewed: local browsing history (Part 124)
 */
public class SavedItemsManager {
    private static final String PREFS_NAME = "graveatlas_saved";
    private static final String KEY_SAVED = "saved_items";
    private static final String KEY_RECENT = "recently_viewed";
    private static final int MAX_RECENT = 20;

    private final Context context;

    public SavedItemsManager(Context context) {
        this.context = context.getApplicationContext();
    }

    // ── Saved Items (Part 122) ──

    public static class SavedItem {
        public String type;   // "cemetery", "person", "memorial", "grave"
        public String id;
        public String name;
        public String subtitle; // optional display subtitle
        public long savedAt;

        public JSONObject toJson() {
            JSONObject json = new JSONObject();
            try {
                json.put("type", type);
                json.put("id", id);
                json.put("name", name != null ? name : "");
                json.put("subtitle", subtitle != null ? subtitle : "");
                json.put("savedAt", savedAt);
            } catch (Exception e) { /* skip */ }
            return json;
        }

        public static SavedItem fromJson(JSONObject json) {
            SavedItem item = new SavedItem();
            item.type = json.optString("type", "");
            item.id = json.optString("id", "");
            item.name = json.optString("name", "");
            item.subtitle = json.optString("subtitle", "");
            item.savedAt = json.optLong("savedAt", 0);
            return item;
        }

        public String getKey() {
            return type + ":" + id;
        }
    }

    public List<SavedItem> getSavedItems() {
        List<SavedItem> items = new ArrayList<>();
        try {
            String stored = getPrefs().getString(KEY_SAVED, "");
            if (stored.isEmpty()) return items;
            JSONArray arr = new JSONArray(stored);
            for (int i = 0; i < arr.length(); i++) {
                items.add(SavedItem.fromJson(arr.getJSONObject(i)));
            }
        } catch (Exception e) { /* skip */ }
        return items;
    }

    public List<SavedItem> getSavedItemsByType(String type) {
        List<SavedItem> all = getSavedItems();
        List<SavedItem> filtered = new ArrayList<>();
        for (SavedItem item : all) {
            if (item.type.equals(type)) filtered.add(item);
        }
        return filtered;
    }

    public boolean isSaved(String type, String id) {
        String key = type + ":" + id;
        for (SavedItem item : getSavedItems()) {
            if (item.getKey().equals(key)) return true;
        }
        return false;
    }

    public void saveItem(String type, String id, String name, String subtitle) {
        if (type == null || id == null || id.contains("..") || id.contains("/") || id.contains("\\")) return;
        List<SavedItem> items = getSavedItems();
        // Check if already saved (dedup)
        for (SavedItem item : items) {
            if (item.getKey().equals(type + ":" + id)) return;
        }
        SavedItem newItem = new SavedItem();
        newItem.type = type;
        newItem.id = id;
        newItem.name = name != null ? name : "Unknown";
        newItem.subtitle = subtitle != null ? subtitle : "";
        newItem.savedAt = System.currentTimeMillis();
        items.add(0, newItem); // newest first
        persistSaved(items);
    }

    public void removeSaved(String type, String id) {
        String key = type + ":" + id;
        List<SavedItem> items = getSavedItems();
        items.removeIf(item -> item.getKey().equals(key));
        persistSaved(items);
    }

    public void clearAllSaved() {
        getPrefs().edit().remove(KEY_SAVED).apply();
    }

    public int getSavedCount() {
        return getSavedItems().size();
    }

    private void persistSaved(List<SavedItem> items) {
        try {
            JSONArray arr = new JSONArray();
            for (SavedItem item : items) {
                arr.put(item.toJson());
            }
            getPrefs().edit().putString(KEY_SAVED, arr.toString()).apply();
        } catch (Exception e) { /* skip */ }
    }

    // ── Recently Viewed (Part 124) ──

    public static class RecentItem {
        public String type;
        public String id;
        public String name;
        public long viewedAt;

        public JSONObject toJson() {
            JSONObject json = new JSONObject();
            try {
                json.put("type", type);
                json.put("id", id);
                json.put("name", name != null ? name : "");
                json.put("viewedAt", viewedAt);
            } catch (Exception e) { /* skip */ }
            return json;
        }

        public static RecentItem fromJson(JSONObject json) {
            RecentItem item = new RecentItem();
            item.type = json.optString("type", "");
            item.id = json.optString("id", "");
            item.name = json.optString("name", "");
            item.viewedAt = json.optLong("viewedAt", 0);
            return item;
        }
    }

    public List<RecentItem> getRecentlyViewed() {
        List<RecentItem> items = new ArrayList<>();
        try {
            String stored = getPrefs().getString(KEY_RECENT, "");
            if (stored.isEmpty()) return items;
            JSONArray arr = new JSONArray(stored);
            for (int i = 0; i < arr.length(); i++) {
                items.add(RecentItem.fromJson(arr.getJSONObject(i)));
            }
        } catch (Exception e) { /* skip */ }
        return items;
    }

    public void addRecentlyViewed(String type, String id, String name) {
        if (type == null || id == null || id.contains("..") || id.contains("/") || id.contains("\\")) return;
        List<RecentItem> items = getRecentlyViewed();
        // Remove if already exists (dedup)
        String key = type + ":" + id;
        items.removeIf(item -> (item.type + ":" + item.id).equals(key));
        // Add to front
        RecentItem newItem = new RecentItem();
        newItem.type = type;
        newItem.id = id;
        newItem.name = name != null ? name : "Unknown";
        newItem.viewedAt = System.currentTimeMillis();
        items.add(0, newItem);
        // Trim to max
        while (items.size() > MAX_RECENT) items.remove(items.size() - 1);
        try {
            JSONArray arr = new JSONArray();
            for (RecentItem item : items) {
                arr.put(item.toJson());
            }
            getPrefs().edit().putString(KEY_RECENT, arr.toString()).apply();
        } catch (Exception e) { /* skip */ }
    }

    public void clearRecentlyViewed() {
        getPrefs().edit().remove(KEY_RECENT).apply();
    }

    private android.content.SharedPreferences getPrefs() {
        return context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE);
    }
}
