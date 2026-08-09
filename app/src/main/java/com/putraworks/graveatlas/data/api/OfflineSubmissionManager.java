package com.putraworks.graveatlas.data.api;

import android.content.Context;
import android.content.SharedPreferences;

import com.putraworks.graveatlas.data.model.GraveSubmission;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Manages submissions that couldn't be sent due to network issues.
 * Stores them locally in SharedPreferences and retries when connectivity returns.
 *
 * Uses exponential backoff: retry after 30s, 60s, 120s, 300s, then stops.
 * Maximum 5 retry attempts per submission.
 *
 * Each submission has a client-generated idempotency ID to prevent duplicates.
 */
public class OfflineSubmissionManager {

    private static final String PREFS_NAME = "graveatlas_offline";
    private static final String KEY_PENDING = "pending_submissions";
    private static final int MAX_RETRIES = 5;
    private static final long[] BACKOFF_MS = {30000, 60000, 120000, 300000, 600000};

    private final SharedPreferences prefs;
    private final ApiClient apiClient;

    public OfflineSubmissionManager(Context context, ApiClient apiClient) {
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.apiClient = apiClient;
    }

    /**
     * Save a submission for later retry.
     * Returns the local idempotency ID for the saved submission.
     */
    public String savePending(GraveSubmission submission) {
        try {
            JSONArray arr = getPendingArray();
            JSONObject item = new JSONObject();
            String localId = "local_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
            item.put("localId", localId);
            item.put("name", submission.name);
            item.put("birthDate", submission.birthDate);
            item.put("deathDate", submission.deathDate);
            item.put("cemetery", submission.cemetery);
            item.put("section", submission.section);
            item.put("plot", submission.plot);
            item.put("latitude", submission.latitude);
            item.put("longitude", submission.longitude);
            item.put("notes", submission.notes);
            item.put("retryCount", 0);
            item.put("nextRetryAt", System.currentTimeMillis() + BACKOFF_MS[0]);
            item.put("status", "waiting");
            item.put("savedAt", System.currentTimeMillis());

            arr.put(item);
            prefs.edit().putString(KEY_PENDING, arr.toString()).apply();
            return localId;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Get all pending submissions with their current status.
     */
    public List<PendingSubmission> getPendingSubmissions() {
        List<PendingSubmission> list = new ArrayList<>();
        try {
            JSONArray arr = getPendingArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.getJSONObject(i);
                PendingSubmission ps = new PendingSubmission();
                ps.localId = item.optString("localId");
                ps.name = item.optString("name");
                ps.retryCount = item.optInt("retryCount", 0);
                ps.status = item.optString("status", "waiting");
                ps.serverSubmissionId = item.optString("serverSubmissionId", null);
                ps.savedAt = item.optLong("savedAt", 0);
                list.add(ps);
            }
        } catch (Exception e) {
            // Return empty list on parse error
        }
        return list;
    }

    /**
     * Attempt to send all submissions that are ready for retry.
     * Returns the number of submissions attempted.
     */
    public int retryPending() {
        List<PendingSubmission> pending = getPendingSubmissions();
        int attempted = 0;
        long now = System.currentTimeMillis();

        for (PendingSubmission ps : pending) {
            if (!"waiting".equals(ps.status)) continue;
            if (ps.retryCount >= MAX_RETRIES) {
                markFailed(ps.localId, "Max retries reached");
                continue;
            }
            // Check if it's time to retry
            try {
                JSONArray arr = getPendingArray();
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject item = arr.getJSONObject(i);
                    if (item.optString("localId").equals(ps.localId)) {
                        long nextRetry = item.optLong("nextRetryAt", 0);
                        if (now < nextRetry) break;
                        // Attempt retry
                        attempted++;
                        sendPending(item, i, arr);
                        break;
                    }
                }
            } catch (Exception e) {
                // Continue to next submission
            }
        }
        return attempted;
    }

    private void sendPending(JSONObject item, int index, JSONArray arr) {
        GraveSubmission submission = new GraveSubmission();
        submission.name = item.optString("name");
        submission.birthDate = item.optString("birthDate", null);
        submission.deathDate = item.optString("deathDate", null);
        submission.cemetery = item.optString("cemetery", null);
        submission.section = item.optString("section", null);
        submission.plot = item.optString("plot", null);
        submission.latitude = item.optDouble("latitude", 0);
        submission.longitude = item.optDouble("longitude", 0);
        submission.notes = item.optString("notes", null);

        // Clear nulls
        if (submission.birthDate != null && submission.birthDate.isEmpty()) submission.birthDate = null;
        if (submission.deathDate != null && submission.deathDate.isEmpty()) submission.deathDate = null;
        if (submission.cemetery != null && submission.cemetery.isEmpty()) submission.cemetery = null;
        if (submission.section != null && submission.section.isEmpty()) submission.section = null;
        if (submission.plot != null && submission.plot.isEmpty()) submission.plot = null;
        if (submission.notes != null && submission.notes.isEmpty()) submission.notes = null;

        apiClient.submitGrave(submission, new ApiClient.ApiCallback<com.putraworks.graveatlas.data.model.SubmissionResponse>() {
            @Override
            public void onSuccess(com.putraworks.graveatlas.data.model.SubmissionResponse result) {
                try {
                    JSONArray current = getPendingArray();
                    JSONArray updated = new JSONArray();
                    for (int i = 0; i < current.length(); i++) {
                        JSONObject it = current.getJSONObject(i);
                        if (!it.optString("localId").equals(item.optString("localId"))) {
                            updated.put(it);
                        }
                    }
                    prefs.edit().putString(KEY_PENDING, updated.toString()).apply();
                } catch (Exception e) { /* ignore */ }
            }

            @Override
            public void onError(String error) {
                try {
                    JSONArray current = getPendingArray();
                    for (int i = 0; i < current.length(); i++) {
                        JSONObject it = current.getJSONObject(i);
                        if (it.optString("localId").equals(item.optString("localId"))) {
                            int retryCount = it.optInt("retryCount", 0) + 1;
                            it.put("retryCount", retryCount);
                            it.put("lastError", error);
                            if (retryCount >= MAX_RETRIES) {
                                it.put("status", "failed");
                            } else {
                                int backoffIndex = Math.min(retryCount, BACKOFF_MS.length - 1);
                                it.put("nextRetryAt", System.currentTimeMillis() + BACKOFF_MS[backoffIndex]);
                            }
                            break;
                        }
                    }
                    prefs.edit().putString(KEY_PENDING, current.toString()).apply();
                } catch (Exception e) { /* ignore */ }
            }
        });
    }

    private void markFailed(String localId, String reason) {
        try {
            JSONArray arr = getPendingArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.getJSONObject(i);
                if (item.optString("localId").equals(localId)) {
                    item.put("status", "failed");
                    item.put("lastError", reason);
                    break;
                }
            }
            prefs.edit().putString(KEY_PENDING, arr.toString()).apply();
        } catch (Exception e) { /* ignore */ }
    }

    /**
     * Remove a submission from the pending list (e.g., after successful send).
     */
    public void removePending(String localId) {
        try {
            JSONArray arr = getPendingArray();
            JSONArray updated = new JSONArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.getJSONObject(i);
                if (!item.optString("localId").equals(localId)) {
                    updated.put(item);
                }
            }
            prefs.edit().putString(KEY_PENDING, updated.toString()).apply();
        } catch (Exception e) { /* ignore */ }
    }

    /**
     * Get the count of pending submissions.
     */
    public int getPendingCount() {
        return getPendingSubmissions().size();
    }

    private JSONArray getPendingArray() {
        String json = prefs.getString(KEY_PENDING, "[]");
        try {
            return new JSONArray(json);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static class PendingSubmission {
        public String localId;
        public String name;
        public int retryCount;
        public String status; // "waiting", "failed"
        public String serverSubmissionId;
        public long savedAt;
    }
}
