package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Review queue containing tasks awaiting review or assignment.
 * Returned by GET /api/curation/queue
 */
public class CurationQueue {
    public List<QueueEntry> queue;
    public int totalInQueue;
    public int submittedCount;
    public int pendingCount;

    public static class QueueEntry {
        public String id;
        public String type;
        public String title;
        public String priority;
        public String status;
        public String assignedTo;
        public String recordId;
        public String cemeteryId;
        public String createdAt;
        public String submittedAt;
        public String deadline;
    }

    public static CurationQueue fromJson(JSONObject json) {
        CurationQueue result = new CurationQueue();
        result.totalInQueue = json.optInt("totalInQueue", 0);
        result.submittedCount = json.optInt("submittedCount", 0);
        result.pendingCount = json.optInt("pendingCount", 0);

        result.queue = new ArrayList<>();
        JSONArray arr = json.optJSONArray("queue");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject e = arr.optJSONObject(i);
                if (e == null) continue;
                QueueEntry entry = new QueueEntry();
                entry.id = e.optString("id", "");
                entry.type = e.optString("type", "");
                entry.title = e.optString("title", "");
                entry.priority = e.optString("priority", "medium");
                entry.status = e.optString("status", "pending");
                entry.assignedTo = e.optString("assignedTo", null);
                entry.recordId = e.optString("recordId", null);
                entry.cemeteryId = e.optString("cemeteryId", null);
                entry.createdAt = e.optString("createdAt", null);
                entry.submittedAt = e.optString("submittedAt", null);
                entry.deadline = e.optString("deadline", null);
                result.queue.add(entry);
            }
        }

        return result;
    }

    public boolean hasTasks() { return totalInQueue > 0; }
    public boolean hasReviewTasks() { return submittedCount > 0; }

    public String getSummaryLine() {
        return String.format("%d in queue (%d awaiting review, %d available)",
            totalInQueue, submittedCount, pendingCount);
    }
}
