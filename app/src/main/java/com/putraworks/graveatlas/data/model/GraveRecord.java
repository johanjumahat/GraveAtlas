package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Grave record model matching the Phase 4 worldwide grave schema.
 * Supports cemetery references, person references, inscriptions, sources.
 */
public class GraveRecord {
    public String id;
    public String cemeteryId;
    public String cemeteryName;
    public String cemetery;  // Legacy field for backward compatibility
    public String sectionId;
    public String section;
    public String plot;
    public String graveIdentifier;
    public double latitude;
    public double longitude;
    public List<String> personIds;
    public String name;  // Legacy/primary display name
    public String birthDate;
    public String deathDate;
    public String inscription;
    public String[] photoRefs;
    public String notes;
    public List<String> sourceRefs;
    public String source;  // Legacy field
    public String verificationStatus;
    public String status;
    public String submittedAt;
    public String updatedAt;

    public GraveRecord() {}

    public boolean isValid() {
        if (id == null || id.isEmpty()) return false;
        if (latitude < -90 || latitude > 90) return false;
        if (longitude < -180 || longitude > 180) return false;
        return true;
    }

    public boolean hasCoordinates() {
        return latitude != 0 || longitude != 0;
    }

    /**
     * Returns the cemetery name from either the new cemeteryName field or legacy cemetery field.
     */
    public String getCemeteryName() {
        if (cemeteryName != null && !cemeteryName.isEmpty()) return cemeteryName;
        return cemetery;
    }

    /**
     * Returns the verification status as a user-friendly label.
     */
    public String getVerificationLabel() {
        if (verificationStatus == null) return "Unverified";
        switch (verificationStatus) {
            case "verified": return "Verified";
            case "community_submitted": return "Community Submitted";
            case "under_review": return "Under Review";
            case "rejected": return "Rejected";
            default: return "Unverified";
        }
    }

    /**
     * Returns formatted life dates string.
     */
    public String getLifeDates() {
        String birth = birthDate != null ? PersonRecord.formatDate(birthDate) : null;
        String death = deathDate != null ? PersonRecord.formatDate(deathDate) : null;
        if (birth != null && death != null) return birth + " – " + death;
        if (birth != null) return "b. " + birth;
        if (death != null) return "d. " + death;
        return "";
    }

    public static GraveRecord fromJson(JSONObject json) {
        GraveRecord g = new GraveRecord();
        g.id = json.optString("id", null);
        g.cemeteryId = json.optString("cemeteryId", null);
        g.cemeteryName = json.optString("cemeteryName", null);
        g.cemetery = json.optString("cemetery", null);
        g.sectionId = json.optString("sectionId", null);
        g.section = json.optString("section", null);
        g.plot = json.optString("plot", null);
        g.graveIdentifier = json.optString("graveIdentifier", null);
        g.latitude = json.optDouble("latitude", 0);
        g.longitude = json.optDouble("longitude", 0);
        g.name = json.optString("name", null);
        g.birthDate = json.optString("birthDate", null);
        g.deathDate = json.optString("deathDate", null);
        g.inscription = json.optString("inscription", null);
        g.notes = json.optString("notes", null);
        g.source = json.optString("source", null);
        g.verificationStatus = json.optString("verificationStatus", "unverified");
        g.status = json.optString("status", "pending");
        g.submittedAt = json.optString("submittedAt", null);
        g.updatedAt = json.optString("updatedAt", null);

        // Parse personIds
        g.personIds = new ArrayList<>();
        if (json.has("personIds") && !json.isNull("personIds")) {
            JSONArray arr = json.optJSONArray("personIds");
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) {
                    g.personIds.add(arr.optString(i));
                }
            }
        }

        // Parse sourceRefs
        g.sourceRefs = new ArrayList<>();
        if (json.has("sourceRefs") && !json.isNull("sourceRefs")) {
            JSONArray arr = json.optJSONArray("sourceRefs");
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) {
                    g.sourceRefs.add(arr.optString(i));
                }
            }
        }

        // Parse photoRefs
        if (json.has("photoRefs") && !json.isNull("photoRefs")) {
            JSONArray arr = json.optJSONArray("photoRefs");
            if (arr != null) {
                g.photoRefs = new String[arr.length()];
                for (int i = 0; i < arr.length(); i++) {
                    g.photoRefs[i] = arr.optString(i);
                }
            }
        }

        return g;
    }

    public static List<GraveRecord> fromJsonArray(JSONArray array) {
        List<GraveRecord> list = new ArrayList<>();
        for (int i = 0; i < array.length(); i++) {
            try {
                list.add(fromJson(array.getJSONObject(i)));
            } catch (Exception e) { /* skip */ }
        }
        return list;
    }
}
