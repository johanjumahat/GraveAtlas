package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Search result model for unified search across cemeteries, graves, people, and locations.
 * Phase 7A adds: category, subtype, altNames, cemeteryType, region.
 */
public class SearchResult {
    public String type;       // "cemetery", "grave", "person", "memorial", "location"
    public String category;   // "cemeteries", "people", "memorials", "locations"
    public String subtype;    // for locations: "country", "region", "city"
    public String id;
    public String name;
    public List<String> altNames;
    public String country;
    public String region;
    public String city;
    public String cemetery;
    public String cemeteryId;
    public String cemeteryType;
    public String section;
    public String plot;
    public String birthDate;
    public String deathDate;
    public Double latitude;
    public Double longitude;
    public int score;
    public int cemeteryCount; // for location results
    public String verificationStatus; // Phase 16.2: evidence badge in search results

    public static List<SearchResult> fromJsonArray(JSONArray array) {
        List<SearchResult> results = new ArrayList<>();
        for (int i = 0; i < array.length(); i++) {
            try {
                JSONObject json = array.getJSONObject(i);
                SearchResult r = new SearchResult();
                r.type = json.optString("type", null);
                r.category = json.optString("category", null);
                r.subtype = json.optString("subtype", null);
                r.id = json.optString("id", null);
                r.name = json.optString("name", null);
                r.country = json.optString("country", null);
                r.region = json.optString("region", null);
                r.city = json.optString("city", null);
                r.cemetery = json.optString("cemetery", null);
                r.cemeteryId = json.optString("cemeteryId", null);
                r.cemeteryType = json.optString("cemeteryType", null);
                r.section = json.optString("section", null);
                r.plot = json.optString("plot", null);
                r.birthDate = json.optString("birthDate", null);
                r.deathDate = json.optString("deathDate", null);
                r.latitude = json.has("latitude") && !json.isNull("latitude") ? json.optDouble("latitude") : null;
                r.longitude = json.has("longitude") && !json.isNull("longitude") ? json.optDouble("longitude") : null;
                r.score = json.optInt("score", 0);
                r.cemeteryCount = json.optInt("cemeteryCount", 0);
                r.verificationStatus = json.optString("verificationStatus", null);

                // Parse alt names array
                JSONArray altArr = json.optJSONArray("altNames");
                if (altArr != null) {
                    r.altNames = new ArrayList<>();
                    for (int j = 0; j < altArr.length(); j++) {
                        r.altNames.add(altArr.getString(j));
                    }
                }
                results.add(r);
            } catch (Exception e) { /* skip */ }
        }
        return results;
    }

    public String getCategoryLabel() {
        if (category != null) {
            return category.substring(0, 1).toUpperCase() + category.substring(1);
        }
        if (type != null) {
            return type.substring(0, 1).toUpperCase() + type.substring(1);
        }
        return "";
    }

    public String getDisplaySubtitle() {
        StringBuilder sb = new StringBuilder();

        // For location results, show subtype and cemetery count
        if ("location".equals(type) && subtype != null) {
            sb.append(subtype.substring(0, 1).toUpperCase()).append(subtype.substring(1));
            if (cemeteryCount > 0) {
                if (sb.length() > 0) sb.append(" • ");
                sb.append(cemeteryCount).append(cemeteryCount == 1 ? " cemetery" : " cemeteries");
            }
            return sb.toString();
        }

        // For cemeteries, show location info
        if ("cemetery".equals(type)) {
            sb.append("Cemetery");
            if (cemeteryType != null) {
                sb.append(" (").append(cemeteryType).append(")");
            }
            if (city != null) {
                if (sb.length() > 0) sb.append(" • ");
                sb.append(city);
            }
            if (region != null) {
                if (sb.length() > 0) sb.append(" • ");
                sb.append(region);
            }
            if (country != null) {
                if (sb.length() > 0) sb.append(" • ");
                sb.append(country);
            }
            return sb.toString();
        }

        // For people/graves/memorials
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
