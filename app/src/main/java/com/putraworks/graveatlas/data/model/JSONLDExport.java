package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * JSON-LD export with linked data context and provenance.
 * Returned by GET /api/export/jsonld
 */
public class JSONLDExport {
    public JSONObject context;  // @context object
    public List<JSONObject> graph;  // @graph array of entities
    public JSONLDMetadata metadata;

    public static class JSONLDMetadata {
        public String exportedAt;
        public int totalEntities;
        public String schema;
        public String vocabulary;
    }

    public static JSONLDExport fromJson(JSONObject json) {
        JSONLDExport result = new JSONLDExport();

        result.context = json.optJSONObject("@context");

        result.graph = new ArrayList<>();
        JSONArray arr = json.optJSONArray("@graph");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject entity = arr.optJSONObject(i);
                if (entity != null) result.graph.add(entity);
            }
        }

        JSONObject meta = json.optJSONObject("metadata");
        if (meta != null) {
            result.metadata = new JSONLDMetadata();
            result.metadata.exportedAt = meta.optString("exportedAt", null);
            result.metadata.totalEntities = meta.optInt("totalEntities", 0);
            result.metadata.schema = meta.optString("schema", "JSON-LD 1.1");
            result.metadata.vocabulary = meta.optString("vocabulary", "");
        }

        return result;
    }

    public int getEntityCount() { return graph != null ? graph.size() : 0; }

    public String getSummaryLine() {
        if (metadata == null) return String.format("%d entities", getEntityCount());
        return String.format("%d entities — %s — %s", getEntityCount(), metadata.schema, metadata.vocabulary);
    }
}
