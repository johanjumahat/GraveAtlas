package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Dataset export response with metadata and optional provenance/confidence.
 * Returned by GET /api/export/dataset
 */
public class DatasetExport {
    public ExportMetadata metadata;
    public List<ExportRecord> records;

    public static class ExportMetadata {
        public String exportedAt;
        public String format;
        public int totalRecords;
        public ExportFilters filters;
        public String schema;
        public String license;
    }

    public static class ExportFilters {
        public String cemeteryId;
        public boolean includeProvenance;
        public boolean includeConfidence;
        public boolean includeSources;
        public boolean includeUnpublished;
    }

    public static class ExportRecord {
        public String id;
        public String name;
        public String givenNames;
        public String familyName;
        public String birthDate;
        public String deathDate;
        public String birthPlace;
        public String deathPlace;
        public String cemeteryId;
        public String section;
        public String plot;
        public String latitude;
        public String longitude;
        public String inscription;
        public String occupation;
        public String spouseName;
        public String verificationStatus;
        public String createdDate;
        public String updatedDate;
        public String submitterName;
        public List<String> sourceRefs;
        public JSONObject confidence;
        public JSONObject provenance;
    }

    public static DatasetExport fromJson(JSONObject json) {
        DatasetExport result = new DatasetExport();

        JSONObject meta = json.optJSONObject("metadata");
        if (meta != null) {
            result.metadata = new ExportMetadata();
            result.metadata.exportedAt = meta.optString("exportedAt", null);
            result.metadata.format = meta.optString("format", "JSON");
            result.metadata.totalRecords = meta.optInt("totalRecords", 0);
            result.metadata.schema = meta.optString("schema", "");
            result.metadata.license = meta.optString("license", "");

            JSONObject f = meta.optJSONObject("filters");
            if (f != null) {
                result.metadata.filters = new ExportFilters();
                result.metadata.filters.cemeteryId = f.optString("cemeteryId", null);
                result.metadata.filters.includeProvenance = f.optBoolean("includeProvenance", false);
                result.metadata.filters.includeConfidence = f.optBoolean("includeConfidence", false);
                result.metadata.filters.includeSources = f.optBoolean("includeSources", false);
                result.metadata.filters.includeUnpublished = f.optBoolean("includeUnpublished", false);
            }
        }

        result.records = new ArrayList<>();
        JSONArray arr = json.optJSONArray("records");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject r = arr.optJSONObject(i);
                if (r == null) continue;
                ExportRecord rec = new ExportRecord();
                rec.id = r.optString("id", "");
                rec.name = r.optString("name", null);
                rec.givenNames = r.optString("givenNames", null);
                rec.familyName = r.optString("familyName", null);
                rec.birthDate = r.optString("birthDate", null);
                rec.deathDate = r.optString("deathDate", null);
                rec.birthPlace = r.optString("birthPlace", null);
                rec.deathPlace = r.optString("deathPlace", null);
                rec.cemeteryId = r.optString("cemeteryId", null);
                rec.section = r.optString("section", null);
                rec.plot = r.optString("plot", null);
                rec.latitude = r.optString("latitude", null);
                rec.longitude = r.optString("longitude", null);
                rec.inscription = r.optString("inscription", null);
                rec.occupation = r.optString("occupation", null);
                rec.spouseName = r.optString("spouseName", null);
                rec.verificationStatus = r.optString("verificationStatus", "unverified");
                rec.createdDate = r.optString("createdDate", null);
                rec.updatedDate = r.optString("updatedDate", null);
                rec.submitterName = r.optString("submitterName", null);

                rec.sourceRefs = new ArrayList<>();
                JSONArray srcs = r.optJSONArray("sourceRefs");
                if (srcs != null) {
                    for (int j = 0; j < srcs.length(); j++) rec.sourceRefs.add(srcs.optString(j));
                }

                rec.confidence = r.optJSONObject("confidence");
                rec.provenance = r.optJSONObject("provenance");

                result.records.add(rec);
            }
        }

        return result;
    }

    public int getRecordCount() { return records != null ? records.size() : 0; }

    public String getSummaryLine() {
        if (metadata == null) return "No metadata";
        return String.format("%d records exported — %s — %s",
            metadata.totalRecords, metadata.format, metadata.license);
    }
}
