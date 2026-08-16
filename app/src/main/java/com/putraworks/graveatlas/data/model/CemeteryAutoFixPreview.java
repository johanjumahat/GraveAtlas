package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Auto-fix preview for a cemetery — proposed fixes without applying them.
 * Returned by GET /api/cemeteries/{id}/autofix/preview
 */
public class CemeteryAutoFixPreview {
    public String cemeteryId;
    public int totalProposed;
    public List<AutoFixProposal> proposedFixes;
    public AutoFixSummary summary;

    public static class AutoFixSummary {
        public int totalFixes;
        public int recordsScanned;
        public int recordsWithFixes;
        public Map<String, Integer> byAction;
        public int highConfidence;
        public int mediumConfidence;
    }

    public static CemeteryAutoFixPreview fromJson(JSONObject json) {
        CemeteryAutoFixPreview result = new CemeteryAutoFixPreview();
        result.cemeteryId = json.optString("cemeteryId", null);
        result.totalProposed = json.optInt("totalProposed", 0);
        result.proposedFixes = new ArrayList<>();

        JSONArray arr = json.optJSONArray("proposedFixes");
        if (arr != null) {
            result.proposedFixes = AutoFixProposal.fromJsonArray(arr);
        }

        JSONObject s = json.optJSONObject("summary");
        if (s != null) {
            result.summary = new AutoFixSummary();
            result.summary.totalFixes = s.optInt("totalFixes", 0);
            result.summary.recordsScanned = s.optInt("recordsScanned", 0);
            result.summary.recordsWithFixes = s.optInt("recordsWithFixes", 0);
            result.summary.highConfidence = s.optInt("highConfidence", 0);
            result.summary.mediumConfidence = s.optInt("mediumConfidence", 0);

            result.summary.byAction = new HashMap<>();
            JSONObject ba = s.optJSONObject("byAction");
            if (ba != null) {
                JSONArray keys = ba.names();
                if (keys != null) {
                    for (int i = 0; i < keys.length(); i++) {
                        String key = keys.optString(i);
                        result.summary.byAction.put(key, ba.optInt(key, 0));
                    }
                }
            }
        }

        return result;
    }

    /**
     * Returns only high-confidence (safe) fixes.
     */
    public List<AutoFixProposal> getSafeFixes() {
        List<AutoFixProposal> safe = new ArrayList<>();
        for (AutoFixProposal f : proposedFixes) {
            if (f.isSafe()) safe.add(f);
        }
        return safe;
    }

    /**
     * Returns only medium-confidence (risky) fixes.
     */
    public List<AutoFixProposal> getRiskyFixes() {
        List<AutoFixProposal> risky = new ArrayList<>();
        for (AutoFixProposal f : proposedFixes) {
            if (!f.isSafe()) risky.add(f);
        }
        return risky;
    }

    /**
     * Returns a one-line summary.
     */
    public String getSummaryLine() {
        if (summary == null) return "No fixes proposed";
        return String.format("%d fixes for %d records (%d safe, %d need review)",
            summary.totalFixes, summary.recordsWithFixes,
            summary.highConfidence, summary.mediumConfidence);
    }
}
