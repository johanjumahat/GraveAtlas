package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Suggested merge pair within a cemetery.
 * Returned by GET /api/cemeteries/{id}/merge/suggestions
 */
public class MergeSuggestion {
    public RecordRef recordA;
    public RecordRef recordB;
    public int matchScore;
    public List<String> matchReasons;
    public String recommendedAction;  // high_confidence_merge, likely_duplicate, possible_duplicate

    public static class RecordRef {
        public String id;
        public String name;
        public String deathDate;
        public String verificationStatus;
    }

    public static List<MergeSuggestion> fromJsonArray(JSONObject json) {
        List<MergeSuggestion> result = new ArrayList<>();
        JSONArray arr = json.optJSONArray("suggestions");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject s = arr.optJSONObject(i);
                if (s == null) continue;
                MergeSuggestion ms = new MergeSuggestion();
                ms.matchScore = s.optInt("matchScore", 0);
                ms.recommendedAction = s.optString("recommendedAction", "possible_duplicate");

                JSONObject ra = s.optJSONObject("recordA");
                if (ra != null) {
                    ms.recordA = new RecordRef();
                    ms.recordA.id = ra.optString("id", "");
                    ms.recordA.name = ra.optString("name", "Unknown");
                    ms.recordA.deathDate = ra.optString("deathDate", null);
                    ms.recordA.verificationStatus = ra.optString("verificationStatus", "unverified");
                }

                JSONObject rb = s.optJSONObject("recordB");
                if (rb != null) {
                    ms.recordB = new RecordRef();
                    ms.recordB.id = rb.optString("id", "");
                    ms.recordB.name = rb.optString("name", "Unknown");
                    ms.recordB.deathDate = rb.optString("deathDate", null);
                    ms.recordB.verificationStatus = rb.optString("verificationStatus", "unverified");
                }

                ms.matchReasons = new ArrayList<>();
                JSONArray reasons = s.optJSONArray("matchReasons");
                if (reasons != null) {
                    for (int j = 0; j < reasons.length(); j++) {
                        ms.matchReasons.add(reasons.optString(j));
                    }
                }

                result.add(ms);
            }
        }
        return result;
    }

    public boolean isHighConfidence() {
        return "high_confidence_merge".equals(recommendedAction);
    }

    public String getSummaryLine() {
        String nameA = recordA != null ? recordA.name : "?";
        String nameB = recordB != null ? recordB.name : "?";
        return String.format("%s ↔ %s (%d%% match — %s)", nameA, nameB, matchScore, recommendedAction);
    }
}
