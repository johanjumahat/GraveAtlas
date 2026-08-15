package com.putraworks.graveatlas.ui.researchcanvas;

import com.putraworks.graveatlas.data.model.GraveRecord;
import com.putraworks.graveatlas.data.model.PersonRecord;
import com.putraworks.graveatlas.data.model.RelatedRecords;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Research Canvas — visual graph model for exploring record relationships.
 *
 * Phase 16.5: Research Canvas — visual graph: PERSON → CEMETERY → RECORD → SOURCE.
 *
 * The canvas represents the research landscape as a graph of nodes and edges:
 *
 * Node types:
 * - PERSON: An individual memorialized in the records
 * - CEMETERY: A burial ground with geographic location
 * - RECORD: A grave record (the core data unit)
 * - SOURCE: A source reference (archive, document, database)
 * - LOCATION: A geographic location (city, region, country)
 *
 * Edge types:
 * - BURIED_IN: PERSON → CEMETERY (person is interred at cemetery)
 * - RECORDED_IN: PERSON → RECORD (person appears in a record)
 * - LOCATED_IN: CEMETERY → LOCATION (cemetery is in a location)
 * - CITED_BY: RECORD → SOURCE (record is backed by a source)
 * - NEAR: CEMETERY → CEMETERY (cemeteries within proximity)
 * - SAME_CEMETERY: PERSON → PERSON (people in same cemetery)
 * - SAME_REGION: CEMETERY → CEMETERY (cemeteries in same region)
 *
 * The graph enables:
 * - Visual exploration of connections
 * - Discovery of patterns (e.g., multiple records from same source)
 * - Evidence trail tracing (record → source → verification)
 * - Relationship discovery (people in same cemetery, nearby cemeteries)
 */
public class ResearchGraph {

    // ── Node types ──

    public enum NodeType {
        PERSON("👤", "Person"),
        CEMETERY("⛪", "Cemetery"),
        RECORD("📋", "Record"),
        SOURCE("📚", "Source"),
        LOCATION("📍", "Location");

        public final String icon;
        public final String label;

        NodeType(String icon, String label) {
            this.icon = icon;
            this.label = label;
        }
    }

    // ── Edge types ──

    public enum EdgeType {
        BURIED_IN("buried in"),
        RECORDED_IN("recorded in"),
        LOCATED_IN("located in"),
        CITED_BY("cited by"),
        NEAR("near"),
        SAME_CEMETERY("same cemetery"),
        SAME_REGION("same region"),
        RELATED_TO("related to");

        public final String label;

        EdgeType(String label) {
            this.label = label;
        }
    }

    // ── Graph elements ──

    public static class GraphNode {
        public String id;
        public NodeType type;
        public String title;
        public String subtitle;
        public String recordId;          // Link to GraveRecord if applicable
        public Double latitude;
        public Double longitude;
        public String verificationStatus;
        public boolean isHighlighted;

        public GraphNode(String id, NodeType type, String title, String subtitle) {
            this.id = id;
            this.type = type;
            this.title = title;
            this.subtitle = subtitle;
        }

        public String getDisplayText() {
            return type.icon + " " + title;
        }
    }

    public static class GraphEdge {
        public String fromId;
        public String toId;
        public EdgeType type;
        public String label;
        public double weight;        // Edge weight (e.g., distance for NEAR)

        public GraphEdge(String fromId, String toId, EdgeType type) {
            this.fromId = fromId;
            this.toId = toId;
            this.type = type;
            this.label = type.label;
            this.weight = 1.0;
        }
    }

    // ── Graph state ──

    private Map<String, GraphNode> nodes = new HashMap<>();
    private List<GraphEdge> edges = new ArrayList<>();
    private Set<String> highlightedNodeIds = new HashSet<>();

    /**
     * Build a research graph from a GraveRecord and its related records.
     *
     * @param grave The primary grave record (center of the graph)
     * @param related Related records (nearby cemeteries, same cemetery people, same region)
     */
    public void buildFromRecord(GraveRecord grave, RelatedRecords related) {
        nodes.clear();
        edges.clear();
        highlightedNodeIds.clear();

        // ── Central PERSON node ──
        String personId = "person:" + (grave.id != null ? grave.id : "unknown");
        GraphNode personNode = new GraphNode(personId, NodeType.PERSON, grave.name != null ? grave.name : "Unknown",
                formatDateRange(grave.birthDate, grave.deathDate));
        personNode.recordId = grave.id;
        personNode.verificationStatus = grave.verificationStatus;
        personNode.latitude = grave.latitude;
        personNode.longitude = grave.longitude;
        personNode.isHighlighted = true;
        nodes.put(personId, personNode);
        highlightedNodeIds.add(personId);

        // ── Central RECORD node ──
        String recordId = "record:" + (grave.id != null ? grave.id : "unknown");
        GraphNode recordNode = new GraphNode(recordId, NodeType.RECORD,
                "Record #" + (grave.id != null ? grave.id : "?"),
                grave.verificationStatus != null ? grave.verificationStatus : "unverified");
        recordNode.recordId = grave.id;
        recordNode.verificationStatus = grave.verificationStatus;
        nodes.put(recordId, recordNode);

        // PERSON → RECORD edge
        edges.add(new GraphEdge(personId, recordId, EdgeType.RECORDED_IN));

        // ── CEMETERY node ──
        String cemeteryName = grave.cemeteryName != null ? grave.cemeteryName : (grave.cemetery != null ? grave.cemetery : "Unknown Cemetery");
        String cemeteryId = "cemetery:" + cemeteryName.hashCode();
        GraphNode cemeteryNode = new GraphNode(cemeteryId, NodeType.CEMETERY, cemeteryName,
                grave.cemeteryName != null ? grave.cemeteryName : "");
        cemeteryNode.latitude = grave.latitude;
        cemeteryNode.longitude = grave.longitude;
        if (!nodes.containsKey(cemeteryId)) {
            nodes.put(cemeteryId, cemeteryNode);
        }

        // PERSON → CEMETERY edge
        edges.add(new GraphEdge(personId, cemeteryId, EdgeType.BURIED_IN));

        // ── LOCATION node ──
        StringBuilder locName = new StringBuilder();
        if (grave.cemeteryName != null) locName.append(grave.cemeteryName);
        else if (grave.cemetery != null) locName.append(grave.cemetery);
        if (locName.length() > 0) {
            String locationId = "location:" + locName.toString().hashCode();
            GraphNode locNode = new GraphNode(locationId, NodeType.LOCATION, locName.toString(), "");
            if (!nodes.containsKey(locationId)) {
                nodes.put(locationId, locNode);
            }
            // CEMETERY → LOCATION edge
            edges.add(new GraphEdge(cemeteryId, locationId, EdgeType.LOCATED_IN));
        }

        // ── SOURCE nodes ──
        if (grave.sourceRefs != null) {
            for (String source : grave.sourceRefs) {
                if (source == null || source.trim().isEmpty()) continue;
                String sourceId = "source:" + source.hashCode();
                GraphNode sourceNode = new GraphNode(sourceId, NodeType.SOURCE, source, "Source Reference");
                if (!nodes.containsKey(sourceId)) {
                    nodes.put(sourceId, sourceNode);
                }
                // RECORD → SOURCE edge
                edges.add(new GraphEdge(recordId, sourceId, EdgeType.CITED_BY));
            }
        }

        // ── Related: nearby cemeteries ──
        if (related != null && related.nearby != null) {
            for (RelatedRecords.RelatedItem item : related.nearby) {
                String nearbyCemeteryId = "cemetery:" + (item.name != null ? item.name.hashCode() : item.id);
                GraphNode nearbyNode = new GraphNode(nearbyCemeteryId, NodeType.CEMETERY, item.name, item.getDisplaySubtitle());
                nearbyNode.latitude = item.latitude;
                nearbyNode.longitude = item.longitude;
                if (!nodes.containsKey(nearbyCemeteryId)) {
                    nodes.put(nearbyCemeteryId, nearbyNode);
                }
                // CEMETERY → NEAR CEMETERY edge
                GraphEdge nearEdge = new GraphEdge(cemeteryId, nearbyCemeteryId, EdgeType.NEAR);
                nearEdge.weight = item.distance;
                nearEdge.label = Math.round(item.distance) + " km";
                edges.add(nearEdge);
            }
        }

        // ── Related: same cemetery people ──
        if (related != null && related.sameCemetery != null) {
            for (RelatedRecords.RelatedItem item : related.sameCemetery) {
                String relatedPersonId = "person:" + (item.id != null ? item.id : item.name.hashCode());
                GraphNode relatedPerson = new GraphNode(relatedPersonId, NodeType.PERSON, item.name, item.getDisplaySubtitle());
                relatedPerson.recordId = item.id;
                if (!nodes.containsKey(relatedPersonId)) {
                    nodes.put(relatedPersonId, relatedPerson);
                }
                // PERSON → PERSON (same cemetery)
                edges.add(new GraphEdge(personId, relatedPersonId, EdgeType.SAME_CEMETERY));
            }
        }

        // ── Related: same region cemeteries ──
        if (related != null && related.sameRegion != null) {
            for (RelatedRecords.RelatedItem item : related.sameRegion) {
                String regionCemeteryId = "cemetery:" + (item.name != null ? item.name.hashCode() : item.id);
                GraphNode regionCem = new GraphNode(regionCemeteryId, NodeType.CEMETERY, item.name, item.getDisplaySubtitle());
                regionCem.latitude = item.latitude;
                regionCem.longitude = item.longitude;
                if (!nodes.containsKey(regionCemeteryId)) {
                    nodes.put(regionCemeteryId, regionCem);
                }
                // CEMETERY → CEMETERY (same region)
                edges.add(new GraphEdge(cemeteryId, regionCemeteryId, EdgeType.SAME_REGION));
            }
        }
    }

    /**
     * Get all nodes in the graph.
     */
    public List<GraphNode> getNodes() {
        return new ArrayList<>(nodes.values());
    }

    /**
     * Get all edges in the graph.
     */
    public List<GraphEdge> getEdges() {
        return new ArrayList<>(edges);
    }

    /**
     * Get a node by ID.
     */
    public GraphNode getNode(String id) {
        return nodes.get(id);
    }

    /**
     * Get edges connected to a specific node.
     */
    public List<GraphEdge> getEdgesForNode(String nodeId) {
        List<GraphEdge> result = new ArrayList<>();
        for (GraphEdge e : edges) {
            if (e.fromId.equals(nodeId) || e.toId.equals(nodeId)) {
                result.add(e);
            }
        }
        return result;
    }

    /**
     * Get nodes connected to a specific node (neighbors).
     */
    public List<GraphNode> getNeighbors(String nodeId) {
        List<GraphNode> result = new ArrayList<>();
        Set<String> neighborIds = new HashSet<>();
        for (GraphEdge e : edges) {
            if (e.fromId.equals(nodeId)) neighborIds.add(e.toId);
            else if (e.toId.equals(nodeId)) neighborIds.add(e.fromId);
        }
        for (String id : neighborIds) {
            GraphNode n = nodes.get(id);
            if (n != null) result.add(n);
        }
        return result;
    }

    /**
     * Get the central (highlighted) node.
     */
    public GraphNode getCentralNode() {
        for (String id : highlightedNodeIds) {
            return nodes.get(id);
        }
        return null;
    }

    /**
     * Count nodes by type.
     */
    public Map<NodeType, Integer> getNodeCounts() {
        Map<NodeType, Integer> counts = new HashMap<>();
        for (NodeType nt : NodeType.values()) counts.put(nt, 0);
        for (GraphNode n : nodes.values()) {
            counts.put(n.type, counts.get(n.type) + 1);
        }
        return counts;
    }

    /**
     * Count edges by type.
     */
    public Map<EdgeType, Integer> getEdgeCounts() {
        Map<EdgeType, Integer> counts = new HashMap<>();
        for (EdgeType et : EdgeType.values()) counts.put(et, 0);
        for (GraphEdge e : edges) {
            counts.put(e.type, counts.get(e.type) + 1);
        }
        return counts;
    }

    /**
     * Generate a text summary of the graph.
     */
    public String getSummary() {
        Map<NodeType, Integer> nc = getNodeCounts();
        Map<EdgeType, Integer> ec = getEdgeCounts();

        StringBuilder sb = new StringBuilder();
        sb.append("Research Canvas Summary\n\n");

        GraphNode center = getCentralNode();
        if (center != null) {
            sb.append("Central: ").append(center.getDisplayText()).append("\n");
        }

        sb.append("\nNodes:\n");
        for (NodeType nt : NodeType.values()) {
            int count = nc.get(nt);
            if (count > 0) sb.append("  ").append(nt.icon).append(" ").append(nt.label).append(": ").append(count).append("\n");
        }

        sb.append("\nConnections:\n");
        for (EdgeType et : EdgeType.values()) {
            int count = ec.get(et);
            if (count > 0) sb.append("  ").append(et.label).append(": ").append(count).append("\n");
        }

        // Evidence trail
        int sourceCount = nc.get(NodeType.SOURCE);
        if (sourceCount > 0) {
            sb.append("\nEvidence: ").append(sourceCount).append(" source reference(s) found.\n");
        } else {
            sb.append("\nEvidence: No external sources — community-submitted record.\n");
        }

        return sb.toString().trim();
    }

    /**
     * Format a date range string.
     */
    private static String formatDateRange(String birth, String death) {
        if (birth != null && death != null) return birth + " – " + death;
        if (birth != null) return "b. " + birth;
        if (death != null) return "d. " + death;
        return "";
    }
}
