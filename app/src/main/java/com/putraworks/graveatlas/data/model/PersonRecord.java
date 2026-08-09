package com.putraworks.graveatlas.data.model;

/**
 * Person / Memorial record model.
 * Represents a person memorialized in a grave.
 */
public class PersonRecord {
    public String id;
    public String displayName;
    public String givenNames;
    public String familyName;
    public String localName;
    public String transliteration;
    public String birthDate;
    public String deathDate;
    public Boolean birthDateApprox;
    public Boolean deathDateApprox;
    public String biography;
    public String memorialNotes;
    public String graveId;
    public String verificationStatus;
    public String status;
    public String submittedAt;
    public String updatedAt;

    public static PersonRecord fromJson(org.json.JSONObject json) {
        PersonRecord p = new PersonRecord();
        p.id = json.optString("id", null);
        p.displayName = json.optString("displayName", null);
        p.givenNames = json.optString("givenNames", null);
        p.familyName = json.optString("familyName", null);
        p.localName = json.optString("localName", null);
        p.transliteration = json.optString("transliteration", null);
        p.birthDate = json.optString("birthDate", null);
        p.deathDate = json.optString("deathDate", null);
        p.birthDateApprox = json.optBoolean("birthDateApprox", false);
        p.deathDateApprox = json.optBoolean("deathDateApprox", false);
        p.biography = json.optString("biography", null);
        p.memorialNotes = json.optString("memorialNotes", null);
        p.graveId = json.optString("graveId", null);
        p.verificationStatus = json.optString("verificationStatus", "unverified");
        p.status = json.optString("status", "pending");
        p.submittedAt = json.optString("submittedAt", null);
        p.updatedAt = json.optString("updatedAt", null);
        return p;
    }

    /**
     * Returns a formatted date string handling partial dates.
     * "1902" → "1902", "1902-05" → "May 1902", "1902-05-12" → "12 May 1902"
     */
    public static String formatDate(String date) {
        if (date == null || date.isEmpty() || date.equals("unknown")) return "Unknown";
        if (date.startsWith("approx_")) return "c. " + date.substring(7);

        String[] parts = date.split("-");
        if (parts.length == 1) return parts[0]; // Year only
        if (parts.length == 2) { // Year-month
            int month = Integer.parseInt(parts[1]);
            String[] months = {"", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
            if (month >= 1 && month <= 12) return months[month] + " " + parts[0];
            return parts[0];
        }
        if (parts.length == 3) { // Full date
            int month = Integer.parseInt(parts[1]);
            String[] months = {"", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
            if (month >= 1 && month <= 12) return parts[2] + " " + months[month] + " " + parts[0];
            return date;
        }
        return date;
    }

    /**
     * Returns a formatted display name combining given and family names if available.
     */
    public String getFullName() {
        if (givenNames != null && familyName != null) return givenNames + " " + familyName;
        return displayName != null ? displayName : "Unknown";
    }

    /**
     * Returns formatted life dates.
     */
    public String getLifeDates() {
        String birth = birthDate != null ? formatDate(birthDate) : null;
        String death = deathDate != null ? formatDate(deathDate) : null;
        if (birth != null && death != null) return birth + " – " + death;
        if (birth != null) return "b. " + birth;
        if (death != null) return "d. " + death;
        return "";
    }
}
