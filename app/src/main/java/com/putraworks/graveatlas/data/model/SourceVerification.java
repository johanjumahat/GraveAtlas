package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Verification result for a single source reference.
 * Checks URL liveness, archive availability, and content type.
 */
public class SourceVerification {
    public String ref;
    public String url;
    public String status;       // live, dead, restricted, unreachable, timeout, unverifiable, invalid, unknown
    public int confidence;      // 0-100
    public int statusCode;
    public String contentType;
    public boolean archived;
    public String archiveUrl;
    public String archiveTimestamp;
    public List<String> notes;
    public String type;         // url, citation

    public static SourceVerification fromJson(JSONObject json) {
        SourceVerification result = new SourceVerification();
        result.ref = json.optString("ref", null);
        result.url = json.optString("url", null);
        result.status = json.optString("status", "unknown");
        result.confidence = json.optInt("confidence", 0);
        result.statusCode = json.optInt("statusCode", 0);
        result.contentType = json.optString("contentType", null);
        result.archived = json.optBoolean("archived", false);
        result.archiveUrl = json.optString("archiveUrl", null);
        result.archiveTimestamp = json.optString("archiveTimestamp", null);
        result.type = json.optString("type", null);

        result.notes = new ArrayList<>();
        JSONArray notesArr = json.optJSONArray("notes");
        if (notesArr != null) {
            for (int i = 0; i < notesArr.length(); i++) {
                result.notes.add(notesArr.optString(i));
            }
        }

        return result;
    }

    public boolean isLive() {
        return "live".equals(status);
    }

    public boolean isDead() {
        return "dead".equals(status);
    }

    public boolean isAccessible() {
        return "live".equals(status) || "redirect".equals(status);
    }

    public boolean hasArchive() {
        return archived && archiveUrl != null;
    }

    public String getStatusIcon() {
        switch (status) {
            case "live": return "✅";
            case "dead": return "❌";
            case "restricted": return "🔒";
            case "unreachable": return "⚠️";
            case "timeout": return "⏱️";
            case "unverifiable": return "❓";
            case "invalid": return "⛔";
            default: return "⚪";
        }
    }
}
