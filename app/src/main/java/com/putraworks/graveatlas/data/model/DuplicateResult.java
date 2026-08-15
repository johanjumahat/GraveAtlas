package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Duplicate person detection result.
 * Returned by GET /api/cemeteries/{id}/duplicates
 */
public class DuplicateResult {
    public String cemeteryId;
    public int totalChecked;
    public int duplicatesFound;
    public List<DuplicatePair> duplicates;

    public static class DuplicatePair {
        public RecordRef recordA;
        public RecordRef recordB;
        public int score;
        public List<String> reasons;

        public String getSeverity() {
            if (score >= 80) return "High";
            if (score >= 60) return "Medium";
            return "Low";
        }
    }

    public static class RecordRef {
        public String id;
        public String name;
        public String birthDate;
        public String deathDate;
    }

    public static DuplicateResult fromJson(JSONObject json) {
        DuplicateResult result = new DuplicateResult();
        result.cemeteryId = json.optString("cemeteryId", null);
        result.totalChecked = json.optInt("totalChecked", 0);
        result.duplicatesFound = json.optInt("duplicatesFound", 0);
        result.duplicates = new ArrayList<>();

        JSONArray arr = json.optJSONArray("duplicates");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject pairJson = arr.optJSONObject(i);
                if (pairJson == null) continue;

                DuplicatePair pair = new DuplicatePair();
                pair.score = pairJson.optInt("score", 0);

                // Parse reasons
                pair.reasons = new ArrayList<>();
                JSONArray reasonsArr = pairJson.optJSONArray("reasons");
                if (reasonsArr != null) {
                    for (int j = 0; j < reasonsArr.length(); j++) {
                        pair.reasons.add(reasonsArr.optString(j));
                    }
                }

                // Parse recordA
                JSONObject aJson = pairJson.optJSONObject("recordA");
                if (aJson != null) {
                    pair.recordA = new RecordRef();
                    pair.recordA.id = aJson.optString("id", null);
                    pair.recordA.name = aJson.optString("name", null);
                    pair.recordA.birthDate = aJson.optString("birthDate", null);
                    pair.recordA.deathDate = aJson.optString("deathDate", null);
                }

                // Parse recordB
                JSONObject bJson = pairJson.optJSONObject("recordB");
                if (bJson != null) {
                    pair.recordB = new RecordRef();
                    pair.recordB.id = bJson.optString("id", null);
                    pair.recordB.name = bJson.optString("name", null);
                    pair.recordB.birthDate = bJson.optString("birthDate", null);
                    pair.recordB.deathDate = bJson.optString("deathDate", null);
                }

                result.duplicates.add(pair);
            }
        }

        return result;
    }
}
