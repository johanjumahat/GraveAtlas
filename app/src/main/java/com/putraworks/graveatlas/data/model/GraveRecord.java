package com.putraworks.graveatlas.data.model;

/**
 * Grave record model matching the backend JSON schema.
 * All fields except id are optional — not all data is always available.
 */
public class GraveRecord {
    public String id;
    public String name;
    public String birthDate;
    public String deathDate;
    public String cemetery;
    public String section;
    public String plot;
    public double latitude;
    public double longitude;
    public String[] photoRefs;
    public String notes;
    public String source;
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
}
