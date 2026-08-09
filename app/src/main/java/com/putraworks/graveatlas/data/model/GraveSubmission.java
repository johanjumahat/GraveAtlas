package com.putraworks.graveatlas.data.model;

/**
 * Submission request sent to the backend.
 * Supports both legacy grave submissions and Phase 4 enhanced fields.
 */
public class GraveSubmission {
    // Legacy fields (backward compatible)
    public String name;
    public String birthDate;
    public String deathDate;
    public String cemetery;
    public String section;
    public String plot;
    public double latitude;
    public double longitude;
    public String notes;

    // Phase 4 enhanced fields
    public String cemeteryId;
    public String countryCode;
    public String country;
    public String region;
    public String city;
    public String locality;
    public String inscription;
    public String[] personIds;
    public String[] sourceRefs;

    public GraveSubmission() {}

    public boolean hasRequiredFields() {
        return name != null && !name.isEmpty();
    }

    public boolean hasValidCoordinates() {
        if (latitude == 0 && longitude == 0) return true; // coordinates optional
        if (latitude < -90 || latitude > 90) return false;
        if (longitude < -180 || longitude > 180) return false;
        return true;
    }
}
