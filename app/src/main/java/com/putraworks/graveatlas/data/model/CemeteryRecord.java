package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Cemetery record model matching the Phase 4 worldwide cemetery schema.
 * Supports international fields, multi-language names, geographic hierarchy.
 */
public class CemeteryRecord {
    public String id;
    public String name;
    public List<String> altNames;
    public String localName;
    public String transliteration;
    public String countryCode;
    public String country;
    public String region;
    public String city;
    public String locality;
    public String address;
    public double latitude;
    public double longitude;
    public String timezone;
    public String cemeteryType;
    public String religiousAffiliation;
    public String operatingStatus;
    public String establishedDate;
    public String closedDate;
    public String website;
    public String contactInfo;
    public String description;
    public String accessibility;
    public List<String> sourceRefs;
    public String verificationStatus;
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

    /**
     * Returns the best display name: local name if available, otherwise name.
     */
    public String getDisplayName() {
        return localName != null && !localName.isEmpty() ? localName : name;
    }

    /**
     * Returns formatted location string: city, region, country.
     */
    public String getLocationString() {
        StringBuilder sb = new StringBuilder();
        if (city != null && !city.isEmpty()) sb.append(city);
        if (region != null && !region.isEmpty()) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(region);
        }
        if (country != null && !country.isEmpty()) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(country);
        }
        return sb.toString();
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

    public static CemeteryRecord fromJson(JSONObject json) {
        CemeteryRecord c = new CemeteryRecord();
        c.id = json.optString("id", null);
        c.name = json.optString("name", null);
        c.localName = json.optString("localName", null);
        c.transliteration = json.optString("transliteration", null);
        c.countryCode = json.optString("countryCode", null);
        c.country = json.optString("country", null);
        c.region = json.optString("region", null);
        c.city = json.optString("city", null);
        c.locality = json.optString("locality", null);
        c.address = json.optString("address", null);
        c.latitude = json.optDouble("latitude", 0);
        c.longitude = json.optDouble("longitude", 0);
        c.timezone = json.optString("timezone", null);
        c.cemeteryType = json.optString("cemeteryType", null);
        c.religiousAffiliation = json.optString("religiousAffiliation", null);
        c.operatingStatus = json.optString("operatingStatus", null);
        c.establishedDate = json.optString("establishedDate", null);
        c.closedDate = json.optString("closedDate", null);
        c.website = json.optString("website", null);
        c.contactInfo = json.optString("contactInfo", null);
        c.description = json.optString("description", null);
        c.accessibility = json.optString("accessibility", null);
        c.verificationStatus = json.optString("verificationStatus", "unverified");
        c.status = json.optString("status", "pending");
        c.submittedAt = json.optString("submittedAt", null);
        c.updatedAt = json.optString("updatedAt", null);

        // Parse altNames array
        c.altNames = new ArrayList<>();
        if (json.has("altNames") && !json.isNull("altNames")) {
            JSONArray arr = json.optJSONArray("altNames");
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) {
                    c.altNames.add(arr.optString(i));
                }
            }
        }

        // Parse sourceRefs array
        c.sourceRefs = new ArrayList<>();
        if (json.has("sourceRefs") && !json.isNull("sourceRefs")) {
            JSONArray arr = json.optJSONArray("sourceRefs");
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) {
                    c.sourceRefs.add(arr.optString(i));
                }
            }
        }

        return c;
    }

    public static List<CemeteryRecord> fromJsonArray(JSONArray array) {
        List<CemeteryRecord> list = new ArrayList<>();
        for (int i = 0; i < array.length(); i++) {
            try {
                list.add(fromJson(array.getJSONObject(i)));
            } catch (Exception e) { /* skip */ }
        }
        return list;
    }
}
