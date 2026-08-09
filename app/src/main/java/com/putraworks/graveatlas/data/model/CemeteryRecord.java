package com.putraworks.graveatlas.data.model;

/**
 * Cemetery record model matching the backend cemetery schema.
 * All fields except id and name are optional.
 */
public class CemeteryRecord {
    public String id;
    public String name;
    public String address;
    public double latitude;
    public double longitude;
    public String description;
    public String status;
    public String submittedAt;
    public String updatedAt;

    public CemeteryRecord() {}

    public boolean hasCoordinates() {
        return latitude != 0 || longitude != 0;
    }

    public boolean isPublished() {
        return "published".equals(status);
    }
}
