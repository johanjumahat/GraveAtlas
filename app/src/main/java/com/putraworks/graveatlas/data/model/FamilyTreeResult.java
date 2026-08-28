package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Phase 23: Family Tree Result
 *
 * Represents a family tree built from grave records.
 * Contains nodes (people) and edges (relationships) plus family clusters.
 */
public class FamilyTreeResult {

    public List<TreeNode> nodes;
    public List<TreeEdge> edges;
    public TreeStats stats;
    public List<List<String>> families;
    public String attribution;

    public FamilyTreeResult() {
        nodes = new ArrayList<>();
        edges = new ArrayList<>();
        families = new ArrayList<>();
    }

    public boolean hasRelationships() {
        return edges != null && !edges.isEmpty();
    }

    public boolean hasFamilies() {
        return families != null && !families.isEmpty();
    }

    public static FamilyTreeResult fromJson(JSONObject json) {
        FamilyTreeResult result = new FamilyTreeResult();
        result.attribution = json.optString("attribution", "GraveAtlas — AI Genealogy System");

        JSONArray nodesArray = json.optJSONArray("nodes");
        if (nodesArray != null) {
            for (int i = 0; i < nodesArray.length(); i++) {
                JSONObject n = nodesArray.optJSONObject(i);
                if (n != null) result.nodes.add(TreeNode.fromJson(n));
            }
        }

        JSONArray edgesArray = json.optJSONArray("edges");
        if (edgesArray != null) {
            for (int i = 0; i < edgesArray.length(); i++) {
                JSONObject e = edgesArray.optJSONObject(i);
                if (e != null) result.edges.add(TreeEdge.fromJson(e));
            }
        }

        JSONObject statsObj = json.optJSONObject("stats");
        if (statsObj != null) {
            result.stats = TreeStats.fromJson(statsObj);
        }

        JSONArray famArray = json.optJSONArray("families");
        if (famArray != null) {
            for (int i = 0; i < famArray.length(); i++) {
                JSONArray fam = famArray.optJSONArray(i);
                if (fam != null) {
                    List<String> family = new ArrayList<>();
                    for (int j = 0; j < fam.length(); j++) {
                        family.add(fam.optString(j));
                    }
                    result.families.add(family);
                }
            }
        }

        return result;
    }

    public static class TreeNode {
        public String id;
        public String name;
        public String surname;
        public String givenName;
        public Integer birthYear;
        public Integer deathYear;
        public String cemeteryId;
        public String section;
        public String plot;

        public static TreeNode fromJson(JSONObject json) {
            TreeNode n = new TreeNode();
            n.id = json.optString("id", "");
            n.name = json.optString("name", "Unknown");
            n.surname = json.optString("surname", "");
            n.givenName = json.optString("givenName", "");
            n.birthYear = json.optInt("birthYear", 0);
            if (n.birthYear == 0) n.birthYear = null;
            n.deathYear = json.optInt("deathYear", 0);
            if (n.deathYear == 0) n.deathYear = null;
            n.cemeteryId = json.optString("cemeteryId", null);
            n.section = json.optString("section", null);
            n.plot = json.optString("plot", null);
            return n;
        }
    }

    public static class TreeEdge {
        public String type;
        public String personA;
        public String personB;
        public String parent;
        public String child;
        public int confidence;
        public List<String> reasons;

        public static TreeEdge fromJson(JSONObject json) {
            TreeEdge e = new TreeEdge();
            e.type = json.optString("type", "");
            e.personA = json.optString("personA", "");
            e.personB = json.optString("personB", "");
            e.parent = json.optString("parent", "");
            e.child = json.optString("child", "");
            e.confidence = json.optInt("confidence", 0);
            e.reasons = new ArrayList<>();
            JSONArray r = json.optJSONArray("reasons");
            if (r != null) {
                for (int i = 0; i < r.length(); i++) {
                    e.reasons.add(r.optString(i));
                }
            }
            return e;
        }
    }

    public static class TreeStats {
        public int totalRecords;
        public int totalRelationships;
        public int familyCount;
        public int largestFamilySize;

        public static TreeStats fromJson(JSONObject json) {
            TreeStats s = new TreeStats();
            s.totalRecords = json.optInt("totalRecords", 0);
            s.totalRelationships = json.optInt("totalRelationships", 0);
            s.familyCount = json.optInt("familyCount", 0);
            s.largestFamilySize = json.optInt("largestFamilySize", 0);
            return s;
        }
    }
}
