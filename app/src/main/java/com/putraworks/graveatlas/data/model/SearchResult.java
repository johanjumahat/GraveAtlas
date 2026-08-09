package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Search result model for unified search across cemeteries, graves, and people.
 */
public class SearchResult {
    public String type;       // "cemetery", "grave", "person"
    public String id;
    public String name;
    public String country;
    public String region;
    public String city;
    public String cemetery;
    public String cemeteryId;
    public String birthDate;
    public String deathDate;
    public Double latitude;
    public Double longitude;
    public int score;

    public static List<SearchResult> fromJsonArray(JSONArray array) {
        List<SearchResult> results = new ArrayList<>();
        for (int i = 0; i < array.length(); i++) {
            try {
                JSONObject json = array.getJSONObject(i);
                SearchResult r = new SearchResult();
                r.type = json.optString("type", null);
                r.id = json.optString("id", null);
                r.name = json.optString("name", null);
                r.country = json.optString("country", null);
                r.region = json.optString("region", null);
                r.city = json.optString("city", null);
                r.cemetery = json.optString("cemetery", null);
                r.cemeteryId = json.optString("cemeteryId", null);
                r.birthDate = json.optString("birthDate", null);
                r.deathDate = json.optString("deathDate", null);
                r.latitude = json.has("latitude") && !json.isNull("latitude") ? json.optDouble("latitude") : null;
                r.longitude = json.has("longitude") && !json.isNull("longitude") ? json.optDouble("longitude") : null;
                r.score = json.optInt("score", 0);
                results.add(r);
            } catch (Exception e) { /* skip */ }
        }
        return results;
    }

    public String getDisplaySubtitle() {
        StringBuilder sb = new StringBuilder();
        if (type != null) {
            sb.append(type.substring(0, 1).toUpperCase()).append(type.substring(1));
        }
        if (cemetery != null) {
            if (sb.length() > 0) sb.append(" • ");
            sb.append(cemetery);
        }
        if (city != null) {
            if (sb.length() > 0) sb.append(" • ");
            sb.append(city);
        }
        if (country != null) {
            if (sb.length() > 0) sb.append(" • ");
            sb.append(country);
        }
        if (birthDate != null || deathDate != null) {
            if (sb.length() > 0) sb.append(" • ");
            String birth = birthDate != null ? birthDate : "";
            String death = deathDate != null ? deathDate : "";
            if (!birth.isEmpty() && !death.isEmpty()) sb.append(birth).append(" – ").append(death);
            else if (!birth.isEmpty()) sb.append("b. ").append(birth);
            else sb.append("d. ").append(death);
        }
        return sb.toString();
    }
}
