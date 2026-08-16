package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * A curation task for collaborative work between archivists.
 * Created via POST /api/curation/tasks, retrieved via GET /api/curation/tasks/:id
 */
public class CurationTask {
    public String id;
    public String type;        // verify, enrich, fix, merge, review, transcribe, geocode, cleanup
    public String recordId;
    public String cemeteryId;
    public String title;
    public String description;
    public String priority;    // low, medium, high, urgent
    public String status;      // pending, assigned, in_progress, submitted, reviewing, completed, cancelled
    public String assignedTo;
    public String assignedAt;
    public String createdBy;
    public String createdAt;
    public String updatedAt;
    public String deadline;
    public String submittedBy;
    public String submittedAt;
    public String reviewedBy;
    public String reviewedAt;
    public String reviewResult;  // approved, rejected
    public String reviewNotes;
    public String completionNotes;
    public List<TaskHistoryEntry> history;

    public static class TaskHistoryEntry {
        public String action;
        public String actor;
        public String timestamp;
        public String description;
    }

    public static CurationTask fromJson(JSONObject json) {
        CurationTask result = new CurationTask();
        result.id = json.optString("id", "");
        result.type = json.optString("type", "");
        result.recordId = json.optString("recordId", null);
        result.cemeteryId = json.optString("cemeteryId", null);
        result.title = json.optString("title", "");
        result.description = json.optString("description", "");
        result.priority = json.optString("priority", "medium");
        result.status = json.optString("status", "pending");
        result.assignedTo = json.optString("assignedTo", null);
        result.assignedAt = json.optString("assignedAt", null);
        result.createdBy = json.optString("createdBy", "system");
        result.createdAt = json.optString("createdAt", null);
        result.updatedAt = json.optString("updatedAt", null);
        result.deadline = json.optString("deadline", null);
        result.submittedBy = json.optString("submittedBy", null);
        result.submittedAt = json.optString("submittedAt", null);
        result.reviewedBy = json.optString("reviewedBy", null);
        result.reviewedAt = json.optString("reviewedAt", null);
        result.reviewResult = json.optString("reviewResult", null);
        result.reviewNotes = json.optString("reviewNotes", null);
        result.completionNotes = json.optString("completionNotes", null);

        result.history = new ArrayList<>();
        JSONArray arr = json.optJSONArray("history");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject h = arr.optJSONObject(i);
                if (h == null) continue;
                TaskHistoryEntry entry = new TaskHistoryEntry();
                entry.action = h.optString("action", "");
                entry.actor = h.optString("actor", "");
                entry.timestamp = h.optString("timestamp", "");
                entry.description = h.optString("description", "");
                result.history.add(entry);
            }
        }

        return result;
    }

    public boolean isPending() { return "pending".equals(status); }
    public boolean isAssigned() { return "assigned".equals(status); }
    public boolean isSubmitted() { return "submitted".equals(status); }
    public boolean isCompleted() { return "completed".equals(status); }
    public boolean isUrgent() { return "urgent".equals(priority); }
    public boolean isOverdue() {
        if (deadline == null || isCompleted()) return false;
        try {
            return new org.json.JSONObject(deadline).toString().compareTo(
                new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss").format(new java.util.Date())
            ) < 0;
        } catch (Exception e) { return false; }
    }

    public String getStatusIcon() {
        switch (status) {
            case "pending": return "⏳";
            case "assigned": return "📌";
            case "in_progress": return "🔧";
            case "submitted": return "📤";
            case "reviewing": return "🔍";
            case "completed": return "✅";
            case "cancelled": return "❌";
            default: return "•";
        }
    }

    public String getPriorityIcon() {
        switch (priority) {
            case "urgent": return "🔴";
            case "high": return "🟠";
            case "medium": return "🟡";
            case "low": return "🟢";
            default: return "⚪";
        }
    }

    public String getTypeIcon() {
        switch (type) {
            case "verify": return "✅";
            case "enrich": return "🧠";
            case "fix": return "🔧";
            case "merge": return "🔗";
            case "review": return "🔍";
            case "transcribe": return "📝";
            case "geocode": return "📍";
            case "cleanup": return "🧹";
            default: return "📋";
        }
    }

    public String getSummaryLine() {
        return String.format("%s %s %s — %s", getTypeIcon(), getPriorityIcon(), getStatusIcon(), title);
    }
}
