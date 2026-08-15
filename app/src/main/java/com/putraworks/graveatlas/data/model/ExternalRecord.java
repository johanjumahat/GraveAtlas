package com.putraworks.graveatlas.data.model;

import org.json.JSONObject;

/**
 * Normalized external record schema (Part 5).
 *
 * Represents a record retrieved from an external cemetery/burial API.
 * Every field is nullable — we never invent missing data.
 *
 * External records remain distinguishable from GraveAtlas records.
 */
public class ExternalRecord {
    public String externalRecordId;
    public String personName;
    public String givenNames;
    public String familyName;
    public String cemetery;
    public String cemeteryId;
    public String burialDate;
    public String deathDate;
    public String birthDate;
    public String gravePlot;
    public String section;
    public String row;
    public double latitude;
    public double longitude;
    public String recordUrl;
    public String sourceOrganization;
    public String sourceId;
    public String sourceTimestamp;
    public String sourceVersion;
    public String license;
    public String confidence;
    public String status;

    // Provenance
    public String provenanceSourceName;
    public String provenanceApiEndpoint;
    public String provenanceRetrievalTime;
    public String provenanceExternalId;

    // Import state
    public String importState; // DISCOVERED, LICENSE_CHECK, VALIDATED, MATCH_REVIEW, APPROVED, IMPORTED, VERIFIED, REJECTED

    public ExternalRecord() {}

    public boolean isFromExternalSource() {
        return sourceId != null && !sourceId.isEmpty();
    }

    public String getDisplayName() {
        if (personName != null && !personName.isEmpty()) return personName;
        StringBuilder sb = new StringBuilder();
        if (givenNames != null) sb.append(givenNames);
        if (familyName != null) {
            if (sb.length() > 0) sb.append(" ");
            sb.append(familyName);
        }
        return sb.length() > 0 ? sb.toString() : "Unknown";
    }

    public String getLocationString() {
        StringBuilder sb = new StringBuilder();
        if (cemetery != null) sb.append(cemetery);
        if (section != null) {
            if (sb.length() > 0) sb.append(", Section ");
            sb.append(section);
        }
        if (gravePlot != null) {
            if (sb.length() > 0) sb.append(", Plot ");
            sb.append(gravePlot);
        }
        return sb.toString();
    }

    public static ExternalRecord fromJson(JSONObject json) {
        ExternalRecord r = new ExternalRecord();
        r.externalRecordId = json.optString("externalRecordId", null);
        r.personName = json.optString("personName", null);
        r.givenNames = json.optString("givenNames", null);
        r.familyName = json.optString("familyName", null);
        r.cemetery = json.optString("cemetery", null);
        r.cemeteryId = json.optString("cemeteryId", null);
        r.burialDate = json.optString("burialDate", null);
        r.deathDate = json.optString("deathDate", null);
        r.birthDate = json.optString("birthDate", null);
        r.gravePlot = json.optString("gravePlot", null);
        r.section = json.optString("section", null);
        r.row = json.optString("row", null);
        r.latitude = json.optDouble("latitude", 0);
        r.longitude = json.optDouble("longitude", 0);
        r.recordUrl = json.optString("recordUrl", null);
        r.sourceOrganization = json.optString("sourceOrganization", null);
        r.sourceId = json.optString("sourceId", null);
        r.sourceTimestamp = json.optString("sourceTimestamp", null);
        r.sourceVersion = json.optString("sourceVersion", null);
        r.license = json.optString("license", null);
        r.confidence = json.optString("confidence", null);
        r.status = json.optString("status", null);
        r.importState = json.optString("importState", "DISCOVERED");

        // Provenance
        if (json.has("provenance")) {
            JSONObject prov = json.optJSONObject("provenance");
            if (prov != null) {
                r.provenanceSourceName = prov.optString("sourceName", null);
                r.provenanceApiEndpoint = prov.optString("apiEndpoint", null);
                r.provenanceRetrievalTime = prov.optString("retrievalTime", null);
                r.provenanceExternalId = prov.optString("externalRecordId", null);
            }
        }

        return r;
    }

    public String getProvenanceSummary() {
        StringBuilder sb = new StringBuilder();
        if (provenanceSourceName != null) sb.append(provenanceSourceName);
        if (provenanceRetrievalTime != null) {
            if (sb.length() > 0) sb.append(" — ");
            sb.append("Retrieved: ").append(provenanceRetrievalTime.substring(0, 10));
        }
        if (license != null) {
            if (sb.length() > 0) sb.append(" — ");
            sb.append("License: ").append(license);
        }
        return sb.length() > 0 ? sb.toString() : "Unknown source";
    }
}
