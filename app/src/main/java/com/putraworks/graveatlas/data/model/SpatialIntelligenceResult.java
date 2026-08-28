package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

/**
 * Phase 25: Spatial Intelligence Result
 */
public class SpatialIntelligenceResult {
    public List<Cluster> clusters;
    public List<NoisePoint> noise;
    public int totalPoints;
    public int clusterCount;
    public String attribution;

    public static SpatialIntelligenceResult fromJson(JSONObject json) {
        SpatialIntelligenceResult r = new SpatialIntelligenceResult();
        r.clusters = new ArrayList<>();
        r.noise = new ArrayList<>();
        r.totalPoints = json.optInt("totalPoints", 0);
        r.clusterCount = json.optInt("clusterCount", 0);
        r.attribution = json.optString("attribution", "GraveAtlas — AI Spatial Intelligence");
        JSONArray ca = json.optJSONArray("clusters");
        if (ca != null) for (int i = 0; i < ca.length(); i++) r.clusters.add(Cluster.fromJson(ca.optJSONObject(i)));
        JSONArray na = json.optJSONArray("noise");
        if (na != null) for (int i = 0; i < na.length(); i++) r.noise.add(NoisePoint.fromJson(na.optJSONObject(i)));
        return r;
    }

    public static class Cluster {
        public int clusterId, pointCount, radiusMeters;
        public double centerLat, centerLon;
        public static Cluster fromJson(JSONObject json) {
            Cluster c = new Cluster();
            c.clusterId = json.optInt("clusterId", 0);
            c.pointCount = json.optInt("pointCount", 0);
            c.radiusMeters = json.optInt("radiusMeters", 0);
            JSONObject center = json.optJSONObject("center");
            if (center != null) { c.centerLat = center.optDouble("lat", 0); c.centerLon = center.optDouble("lon", 0); }
            return c;
        }
    }

    public static class NoisePoint {
        public String id, name;
        public double lat, lon;
        public static NoisePoint fromJson(JSONObject json) {
            NoisePoint n = new NoisePoint();
            n.id = json.optString("id", "");
            n.name = json.optString("name", "");
            n.lat = json.optDouble("lat", 0);
            n.lon = json.optDouble("lon", 0);
            return n;
        }
    }
}
