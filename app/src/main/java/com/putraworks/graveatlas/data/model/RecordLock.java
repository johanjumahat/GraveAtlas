package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * Record lock for exclusive editing during collaborative curation.
 * Created via POST /api/curation/lock, removed via DELETE /api/curation/lock
 */
public class RecordLock {
    public String recordId;
    public String lockedBy;
    public String lockedAt;
    public String expiresAt;

    public static RecordLock fromJson(JSONObject json) {
        RecordLock result = new RecordLock();
        result.recordId = json.optString("recordId", "");
        result.lockedBy = json.optString("lockedBy", "");
        result.lockedAt = json.optString("lockedAt", null);
        result.expiresAt = json.optString("expiresAt", null);
        return result;
    }

    public boolean isExpired() {
        if (expiresAt == null) return true;
        try {
            long expires;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                expires = java.time.Instant.parse(expiresAt).toEpochMilli();
            } else {
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat(
                    "yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US);
                sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
                expires = sdf.parse(expiresAt).getTime();
            }
            return expires < System.currentTimeMillis();
        } catch (Exception e) {
            return true;
        }
    }

    public boolean isActive() { return !isExpired(); }

    public String getSummaryLine() {
        if (isExpired()) return "Lock expired";
        return String.format("Locked by %s, expires %s", lockedBy, expiresAt);
    }
}
