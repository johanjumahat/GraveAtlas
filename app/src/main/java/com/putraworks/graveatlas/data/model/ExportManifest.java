package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Export manifest describing all available data and export options.
 * Returned by GET /api/export/manifest
 */
public class ExportManifest {
    public String schema;
    public String generatedAt;
    public RecordStats recordStats;
    public List<CemeteryEntry> cemeteries;
    public DateRange dateRange;
    public List<AvailableFormat> availableFormats;
    public String license;
    public JSONObject exportOptions;

    public static class RecordStats {
        public int total;
        public int published;
        public int unpublished;
        public int withSources;
        public int withCoordinates;
        public int totalSourceRefs;
    }

    public static class CemeteryEntry {
        public String id;
        public int recordCount;
    }

    public static class DateRange {
        public String earliest;
        public String latest;
    }

    public static class AvailableFormat {
        public String format;
        public String endpoint;
        public String description;
    }

    public static ExportManifest fromJson(JSONObject json) {
        ExportManifest result = new ExportManifest();

        JSONObject m = json.optJSONObject("manifest");
        if (m == null) m = json; // fallback

        result.schema = m.optString("schema", "");
        result.generatedAt = m.optString("generatedAt", null);
        result.license = m.optString("license", "");

        JSONObject rs = m.optJSONObject("recordStats");
        if (rs != null) {
            result.recordStats = new RecordStats();
            result.recordStats.total = rs.optInt("total", 0);
            result.recordStats.published = rs.optInt("published", 0);
            result.recordStats.unpublished = rs.optInt("unpublished", 0);
            result.recordStats.withSources = rs.optInt("withSources", 0);
            result.recordStats.withCoordinates = rs.optInt("withCoordinates", 0);
            result.recordStats.totalSourceRefs = rs.optInt("totalSourceRefs", 0);
        }

        result.cemeteries = new ArrayList<>();
        JSONArray cems = m.optJSONArray("cemeteries");
        if (cems != null) {
            for (int i = 0; i < cems.length(); i++) {
                JSONObject c = cems.optJSONObject(i);
                if (c == null) continue;
                CemeteryEntry entry = new CemeteryEntry();
                entry.id = c.optString("id", "");
                entry.recordCount = c.optInt("recordCount", 0);
                result.cemeteries.add(entry);
            }
        }

        JSONObject dr = m.optJSONObject("dateRange");
        if (dr != null) {
            result.dateRange = new DateRange();
            result.dateRange.earliest = dr.optString("earliest", null);
            result.dateRange.latest = dr.optString("latest", null);
        }

        result.availableFormats = new ArrayList<>();
        JSONArray formats = m.optJSONArray("availableFormats");
        if (formats != null) {
            for (int i = 0; i < formats.length(); i++) {
                JSONObject f = formats.optJSONObject(i);
                if (f == null) continue;
                AvailableFormat fmt = new AvailableFormat();
                fmt.format = f.optString("format", "");
                fmt.endpoint = f.optString("endpoint", "");
                fmt.description = f.optString("description", "");
                result.availableFormats.add(fmt);
            }
        }

        result.exportOptions = m.optJSONObject("exportOptions");

        return result;
    }

    public boolean hasData() {
        return recordStats != null && recordStats.total > 0;
    }

    public String getSummaryLine() {
        if (recordStats == null) return "No data available";
        return String.format("%d records (%d published), %d cemeteries, %s",
            recordStats.total, recordStats.published,
            cemeteries != null ? cemeteries.size() : 0, license);
    }
}
