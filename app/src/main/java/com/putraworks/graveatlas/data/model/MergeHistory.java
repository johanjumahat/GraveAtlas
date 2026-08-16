package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * History of all merges performed across the system.
 * Returned by GET /api/merge/history
 */
public class MergeHistory {
    public List<HistoryEntry> history;
    public int totalMerges;

    public static class HistoryEntry {
        public String mergedFromId;
        public String mergedFromName;
        public String mergedAt;
        public String mergedBy;
        public int fieldsApplied;
        public int fieldsSkipped;
        public int similarityScore;
        public String targetRecordId;
        public String targetRecordName;
    }

    public static MergeHistory fromJson(JSONObject json) {
        MergeHistory result = new MergeHistory();
        result.totalMerges = json.optInt("totalMerges", 0);
        result.history = new ArrayList<>();

        JSONArray arr = json.optJSONArray("history");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject e = arr.optJSONObject(i);
                if (e == null) continue;
                HistoryEntry entry = new HistoryEntry();
                entry.mergedFromId = e.optString("mergedFromId", null);
                entry.mergedFromName = e.optString("mergedFromName", "Unknown");
                entry.mergedAt = e.optString("mergedAt", null);
                entry.mergedBy = e.optString("mergedBy", "system");
                entry.fieldsApplied = e.optInt("fieldsApplied", 0);
                entry.fieldsSkipped = e.optInt("fieldsSkipped", 0);
                entry.similarityScore = e.optInt("similarityScore", 0);
                entry.targetRecordId = e.optString("targetRecordId", null);
                entry.targetRecordName = e.optString("targetRecordName", "Unknown");
                result.history.add(entry);
            }
        }

        return result;
    }

    public boolean hasMerges() {
        return totalMerges > 0;
    }
}
