package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Community feed item — recent tributes, contributions, photos.
 */
public class CommunityFeedItem {
    public String type; // tribute, contribution, photo
    public String tributeId;
    public String targetType;
    public String targetId;
    public String displayName;
    public String message;
    public String tributeType;
    public int likes;
    public String createdAt;

    public static CommunityFeedItem fromJson(JSONObject json) {
        CommunityFeedItem item = new CommunityFeedItem();
        item.type = json.optString("type", "");
        item.tributeId = json.optString("tributeId", "");
        item.targetType = json.optString("targetType", "");
        item.targetId = json.optString("targetId", "");
        item.displayName = json.optString("displayName", "Anonymous");
        item.message = json.optString("message", "");
        item.tributeType = json.optString("tributeType", "");
        item.likes = json.optInt("likes", 0);
        item.createdAt = json.optString("createdAt", "");
        return item;
    }

    public static List<CommunityFeedItem> fromJsonArray(JSONArray arr) {
        List<CommunityFeedItem> list = new ArrayList<>();
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.optJSONObject(i);
                if (obj != null) list.add(fromJson(obj));
            }
        }
        return list;
    }

    public boolean isTribute() { return "tribute".equals(type); }
    public boolean isContribution() { return "contribution".equals(type); }
    public boolean isPhoto() { return "photo".equals(type); }
}
