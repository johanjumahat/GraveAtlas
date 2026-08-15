package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Family connection network within a cemetery.
 * Returned by GET /api/cemeteries/{id}/connections
 */
public class ConnectionNetwork {
    public String cemeteryId;
    public int totalRecords;
    public int totalConnections;
    public int totalFamilyGroups;
    public List<Connection> connections;
    public List<FamilyGroup> familyGroups;

    public static class Connection {
        public String sourceId;
        public String targetId;
        public String sourceName;
        public String targetName;
        public String relationship;
        public String confidence; // "high", "medium", "low"
        public List<String> reasons;
    }

    public static class FamilyGroup {
        public String surname;
        public int memberCount;
        public List<FamilyMember> members;
    }

    public static class FamilyMember {
        public String id;
        public String name;
        public String birthDate;
        public String deathDate;
        public String section;
        public String plot;
    }

    public static ConnectionNetwork fromJson(JSONObject json) {
        ConnectionNetwork network = new ConnectionNetwork();
        network.cemeteryId = json.optString("cemeteryId", null);
        network.totalRecords = json.optInt("totalRecords", 0);
        network.totalConnections = json.optInt("totalConnections", 0);
        network.totalFamilyGroups = json.optInt("totalFamilyGroups", 0);
        network.connections = new ArrayList<>();
        network.familyGroups = new ArrayList<>();

        // Parse connections
        JSONArray connArr = json.optJSONArray("connections");
        if (connArr != null) {
            for (int i = 0; i < connArr.length(); i++) {
                JSONObject c = connArr.optJSONObject(i);
                if (c == null) continue;

                Connection conn = new Connection();
                conn.sourceId = c.optString("sourceId", null);
                conn.targetId = c.optString("targetId", null);
                conn.sourceName = c.optString("sourceName", null);
                conn.targetName = c.optString("targetName", null);
                conn.relationship = c.optString("relationship", null);
                conn.confidence = c.optString("confidence", "low");

                conn.reasons = new ArrayList<>();
                JSONArray reasonsArr = c.optJSONArray("reasons");
                if (reasonsArr != null) {
                    for (int j = 0; j < reasonsArr.length(); j++) {
                        conn.reasons.add(reasonsArr.optString(j));
                    }
                }

                network.connections.add(conn);
            }
        }

        // Parse family groups
        JSONArray groupArr = json.optJSONArray("familyGroups");
        if (groupArr != null) {
            for (int i = 0; i < groupArr.length(); i++) {
                JSONObject g = groupArr.optJSONObject(i);
                if (g == null) continue;

                FamilyGroup group = new FamilyGroup();
                group.surname = g.optString("surname", null);
                group.memberCount = g.optInt("memberCount", 0);
                group.members = new ArrayList<>();

                JSONArray members = g.optJSONArray("members");
                if (members != null) {
                    for (int j = 0; j < members.length(); j++) {
                        JSONObject m = members.optJSONObject(j);
                        if (m == null) continue;

                        FamilyMember member = new FamilyMember();
                        member.id = m.optString("id", null);
                        member.name = m.optString("name", null);
                        member.birthDate = m.optString("birthDate", null);
                        member.deathDate = m.optString("deathDate", null);
                        member.section = m.optString("section", null);
                        member.plot = m.optString("plot", null);
                        group.members.add(member);
                    }
                }

                network.familyGroups.add(group);
            }
        }

        return network;
    }

    /**
     * Returns connections filtered by confidence level.
     */
    public List<Connection> getConnectionsByConfidence(String level) {
        List<Connection> filtered = new ArrayList<>();
        for (Connection c : connections) {
            if (level.equalsIgnoreCase(c.confidence)) {
                filtered.add(c);
            }
        }
        return filtered;
    }

    /**
     * Returns the largest family group, or null if none.
     */
    public FamilyGroup getLargestFamilyGroup() {
        if (familyGroups == null || familyGroups.isEmpty()) return null;
        return familyGroups.get(0); // Already sorted by member count desc from backend
    }
}
