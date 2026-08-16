package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * GeoJSON FeatureCollection export for mapping applications.
 * Returned by GET /api/export/geojson
 */
public class GeoJSONExport {
    public String type;  // "FeatureCollection"
    public List<GeoFeature> features;
    public GeoJSONMetadata metadata;

    public static class GeoFeature {
        public String type;  // "Feature"
        public GeoGeometry geometry;
        public GeoProperties properties;
    }

    public static class GeoGeometry {
        public String type;  // "Point"
        public double[] coordinates;  // [longitude, latitude]
    }

    public static class GeoProperties {
        public String id;
        public String name;
        public String birthDate;
        public String deathDate;
        public String cemeteryId;
        public String section;
        public String plot;
        public String inscription;
        public String verificationStatus;
    }

    public static class GeoJSONMetadata {
        public String exportedAt;
        public int totalFeatures;
        public String schema;
        public String coordinateSystem;
    }

    public static GeoJSONExport fromJson(JSONObject json) {
        GeoJSONExport result = new GeoJSONExport();
        result.type = json.optString("type", "FeatureCollection");

        result.features = new ArrayList<>();
        JSONArray arr = json.optJSONArray("features");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject f = arr.optJSONObject(i);
                if (f == null) continue;
                GeoFeature feature = new GeoFeature();
                feature.type = f.optString("type", "Feature");

                JSONObject geom = f.optJSONObject("geometry");
                if (geom != null) {
                    feature.geometry = new GeoGeometry();
                    feature.geometry.type = geom.optString("type", "Point");
                    JSONArray coords = geom.optJSONArray("coordinates");
                    if (coords != null && coords.length() >= 2) {
                        feature.geometry.coordinates = new double[]{coords.optDouble(0), coords.optDouble(1)};
                    }
                }

                JSONObject props = f.optJSONObject("properties");
                if (props != null) {
                    feature.properties = new GeoProperties();
                    feature.properties.id = props.optString("id", "");
                    feature.properties.name = props.optString("name", null);
                    feature.properties.birthDate = props.optString("birthDate", null);
                    feature.properties.deathDate = props.optString("deathDate", null);
                    feature.properties.cemeteryId = props.optString("cemeteryId", null);
                    feature.properties.section = props.optString("section", null);
                    feature.properties.plot = props.optString("plot", null);
                    feature.properties.inscription = props.optString("inscription", null);
                    feature.properties.verificationStatus = props.optString("verificationStatus", "unverified");
                }

                result.features.add(feature);
            }
        }

        JSONObject meta = json.optJSONObject("metadata");
        if (meta != null) {
            result.metadata = new GeoJSONMetadata();
            result.metadata.exportedAt = meta.optString("exportedAt", null);
            result.metadata.totalFeatures = meta.optInt("totalFeatures", 0);
            result.metadata.schema = meta.optString("schema", "GeoJSON RFC 7946");
            result.metadata.coordinateSystem = meta.optString("coordinateSystem", "WGS84");
        }

        return result;
    }

    public int getFeatureCount() { return features != null ? features.size() : 0; }

    public String getSummaryLine() {
        if (metadata == null) return String.format("%d features", getFeatureCount());
        return String.format("%d features — %s — %s", getFeatureCount(), metadata.schema, metadata.coordinateSystem);
    }
}
