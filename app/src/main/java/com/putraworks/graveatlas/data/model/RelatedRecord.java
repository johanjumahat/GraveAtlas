package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Related record found by similarity search.
 * Returned by GET /api/search/related
 */
public class RelatedRecord {
    public String id;
    public String name;
    public String birthDate;
    public String deathDate;
    public String cemeteryId;
    public String section;
    public int relationScore;
    public List<String> relationTypes;

    public static List<RelatedRecord> fromJsonArray(JSONObject json) {
        List<RelatedRecord> result = new ArrayList<>();
        JSONArray arr = json.optJSONArray("related");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject r = arr.optJSONObject(i);
                if (r == null) continue;
                RelatedRecord rec = new RelatedRecord();
                rec.id = r.optString("id", "");
                rec.name = r.optString("name", null);
                rec.birthDate = r.optString("birthDate", null);
                rec.deathDate = r.optString("deathDate", null);
                rec.cemeteryId = r.optString("cemeteryId", null);
                rec.section = r.optString("section", null);
                rec.relationScore = r.optInt("relationScore", 0);
                rec.relationTypes = new ArrayList<>();
                JSONArray types = r.optJSONArray("relationTypes");
                if (types != null) {
                    for (int j = 0; j < types.length(); j++) rec.relationTypes.add(types.optString(j));
                }
                result.add(rec);
            }
        }
        return result;
    }

    public boolean isSameCemetery() { return relationTypes != null && relationTypes.contains("same_cemetery"); }
    public boolean isSameSection() { return relationTypes != null && relationTypes.contains("same_section"); }
    public boolean isSameFamily() { return relationTypes != null && relationTypes.contains("same_family"); }
    public boolean hasSharedSources() { return relationTypes != null && relationTypes.contains("shared_sources"); }
    public boolean hasSimilarDates() { return relationTypes != null && relationTypes.contains("similar_dates"); }

    public String getRelationSummary() {
        if (relationTypes == null || relationTypes.isEmpty()) return "Related";
        return String.join(", ", relationTypes).replace("_", " ");
    }

    public String getSummaryLine() {
        return String.format("%s (%d%% match — %s)", name != null ? name : "Unknown", relationScore, getRelationSummary());
    }
}
