package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Community tribute / memorial message on a grave or cemetery record.
 */
public class Tribute {
    public String tributeId;
    public String targetType;
    public String targetId;
    public String userId;
    public String displayName;
    public String message;
    public String type; // candle, message, photo-memory, flower
    public String createdAt;
    public String status;
    public int likeCount;
    public boolean hasLiked;

    public static Tribute fromJson(JSONObject json) {
        Tribute t = new Tribute();
        t.tributeId = json.optString("tributeId", "");
        t.targetType = json.optString("targetType", "");
        t.targetId = json.optString("targetId", "");
        t.userId = json.optString("userId", null);
        t.displayName = json.optString("displayName", "Anonymous");
        t.message = json.optString("message", "");
        t.type = json.optString("type", "message");
        t.createdAt = json.optString("createdAt", "");
        t.status = json.optString("status", "active");
        t.likeCount = json.optInt("likeCount", 0);
        t.hasLiked = json.optBoolean("hasLiked", false);
        return t;
    }

    public static List<Tribute> fromJsonArray(JSONArray arr) {
        List<Tribute> list = new ArrayList<>();
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.optJSONObject(i);
                if (obj != null) list.add(fromJson(obj));
            }
        }
        return list;
    }

    public boolean isCandle() { return "candle".equals(type); }
    public boolean isMessage() { return "message".equals(type); }
    public boolean isFlower() { return "flower".equals(type); }
    public boolean isAnonymous() { return userId == null; }
}
