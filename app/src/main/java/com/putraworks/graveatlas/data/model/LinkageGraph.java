package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Linkage graph for relationship visualization.
 * Returned by GET /api/linkage/graph
 */
public class LinkageGraph {
    public String recordId;
    public int depth;
    public GraphData graph;

    public static class GraphData {
        public List<GraphNode> nodes;
        public List<GraphEdge> edges;
        public GraphStats stats;

        public static class GraphNode {
            public String id;
            public String name;
            public String cemetery;
            public Integer birthYear;
            public Integer deathYear;

            public static GraphNode fromJson(JSONObject json) {
                GraphNode n = new GraphNode();
                n.id = json.optString("id", "");
                n.name = json.optString("name", "Unknown");
                n.cemetery = json.optString("cemetery", "");
                n.birthYear = json.has("birthYear") && !json.isNull("birthYear") ? json.optInt("birthYear") : null;
                n.deathYear = json.has("deathYear") && !json.isNull("deathYear") ? json.optInt("deathYear") : null;
                return n;
            }
        }

        public static class GraphEdge {
            public String source;
            public String target;
            public String type;
            public double strength;

            public static GraphEdge fromJson(JSONObject json) {
                GraphEdge e = new GraphEdge();
                e.source = json.optString("source", "");
                e.target = json.optString("target", "");
                e.type = json.optString("type", "");
                e.strength = json.optDouble("strength", 0);
                return e;
            }
        }

        public static class GraphStats {
            public int nodeCount;
            public int edgeCount;
            public EdgeTypeCounts edgeTypes;

            public static class EdgeTypeCounts {
                public int family;
                public int same_cemetery;
                public int same_year;
                public int proximity;
                public int shared_source;

                public static EdgeTypeCounts fromJson(JSONObject json) {
                    EdgeTypeCounts c = new EdgeTypeCounts();
                    c.family = json.optInt("family", 0);
                    c.same_cemetery = json.optInt("same_cemetery", 0);
                    c.same_year = json.optInt("same_year", 0);
                    c.proximity = json.optInt("proximity", 0);
                    c.shared_source = json.optInt("shared_source", 0);
                    return c;
                }
            }

            public static GraphStats fromJson(JSONObject json) {
                GraphStats s = new GraphStats();
                s.nodeCount = json.optInt("nodeCount", 0);
                s.edgeCount = json.optInt("edgeCount", 0);
                JSONObject et = json.optJSONObject("edgeTypes");
                if (et != null) s.edgeTypes = EdgeTypeCounts.fromJson(et);
                return s;
            }
        }

        public static GraphData fromJson(JSONObject json) {
            GraphData g = new GraphData();

            g.nodes = new ArrayList<>();
            JSONArray nodes = json.optJSONArray("nodes");
            if (nodes != null) {
                for (int i = 0; i < nodes.length(); i++) {
                    JSONObject n = nodes.optJSONObject(i);
                    if (n != null) g.nodes.add(GraphNode.fromJson(n));
                }
            }

            g.edges = new ArrayList<>();
            JSONArray edges = json.optJSONArray("edges");
            if (edges != null) {
                for (int i = 0; i < edges.length(); i++) {
                    JSONObject e = edges.optJSONObject(i);
                    if (e != null) g.edges.add(GraphEdge.fromJson(e));
                }
            }

            JSONObject stats = json.optJSONObject("stats");
            if (stats != null) g.stats = GraphStats.fromJson(stats);

            return g;
        }
    }

    public static LinkageGraph fromJson(JSONObject json) {
        LinkageGraph lg = new LinkageGraph();
        lg.recordId = json.optString("recordId", "");
        lg.depth = json.optInt("depth", 1);
        JSONObject g = json.optJSONObject("graph");
        if (g != null) lg.graph = GraphData.fromJson(g);
        return lg;
    }

    public boolean hasNodes() { return graph != null && graph.nodes != null && !graph.nodes.isEmpty(); }
}
