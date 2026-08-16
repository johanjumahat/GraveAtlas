package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Complete provenance chain for a single record.
 * Traces every modification from creation through all changes.
 * Returned by GET /api/graves/{id}/provenance
 */
public class ProvenanceChain {
    public String recordId;
    public String recordName;
    public List<ProvenanceEntry> chain;
    public ProvenanceMetadata metadata;

    public static class ProvenanceEntry {
        public String timestamp;
        public String action;        // created, moderated, verified, corrected, enriched, merged, fixed, source_verified, updated
        public String actor;
        public String actorRole;     // submitter, moderator, verifier, community, AI, archivist, system, manual
        public String description;
        public List<String> fields;
        public Object oldValue;
        public Object newValue;
        public MergeDetails mergeDetails;
        public List<String> source;
    }

    public static class MergeDetails {
        public String mergedFromId;
        public String mergedFromName;
        public int fieldsApplied;
        public int fieldsSkipped;
        public int similarityScore;
    }

    public static class ProvenanceMetadata {
        public int totalEntries;
        public int uniqueActors;
        public List<String> actorList;
        public List<String> actionTypes;
        public List<String> actorRoles;
        public String firstEntry;
        public String lastEntry;
        public String span;
    }

    public static ProvenanceChain fromJson(JSONObject json) {
        ProvenanceChain result = new ProvenanceChain();
        result.recordId = json.optString("recordId", null);
        result.recordName = json.optString("recordName", "Unknown");

        result.chain = new ArrayList<>();
        JSONArray arr = json.optJSONArray("chain");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject e = arr.optJSONObject(i);
                if (e == null) continue;
                ProvenanceEntry entry = new ProvenanceEntry();
                entry.timestamp = e.optString("timestamp", "unknown");
                entry.action = e.optString("action", "");
                entry.actor = e.optString("actor", "unknown");
                entry.actorRole = e.optString("actorRole", "");
                entry.description = e.optString("description", "");
                entry.oldValue = e.opt("oldValue");
                entry.newValue = e.opt("newValue");

                entry.fields = new ArrayList<>();
                JSONArray fields = e.optJSONArray("fields");
                if (fields != null) {
                    for (int j = 0; j < fields.length(); j++) {
                        entry.fields.add(fields.optString(j));
                    }
                }

                entry.source = new ArrayList<>();
                JSONArray source = e.optJSONArray("source");
                if (source != null) {
                    for (int j = 0; j < source.length(); j++) {
                        entry.source.add(source.optString(j));
                    }
                }

                JSONObject md = e.optJSONObject("mergeDetails");
                if (md != null) {
                    entry.mergeDetails = new MergeDetails();
                    entry.mergeDetails.mergedFromId = md.optString("mergedFromId", null);
                    entry.mergeDetails.mergedFromName = md.optString("mergedFromName", null);
                    entry.mergeDetails.fieldsApplied = md.optInt("fieldsApplied", 0);
                    entry.mergeDetails.fieldsSkipped = md.optInt("fieldsSkipped", 0);
                    entry.mergeDetails.similarityScore = md.optInt("similarityScore", 0);
                }

                result.chain.add(entry);
            }
        }

        JSONObject m = json.optJSONObject("metadata");
        if (m != null) {
            result.metadata = new ProvenanceMetadata();
            result.metadata.totalEntries = m.optInt("totalEntries", 0);
            result.metadata.uniqueActors = m.optInt("uniqueActors", 0);

            result.metadata.actorList = new ArrayList<>();
            JSONArray actors = m.optJSONArray("actorList");
            if (actors != null) {
                for (int i = 0; i < actors.length(); i++) result.metadata.actorList.add(actors.optString(i));
            }

            result.metadata.actionTypes = new ArrayList<>();
            JSONArray actions = m.optJSONArray("actionTypes");
            if (actions != null) {
                for (int i = 0; i < actions.length(); i++) result.metadata.actionTypes.add(actions.optString(i));
            }

            result.metadata.actorRoles = new ArrayList<>();
            JSONArray roles = m.optJSONArray("actorRoles");
            if (roles != null) {
                for (int i = 0; i < roles.length(); i++) result.metadata.actorRoles.add(roles.optString(i));
            }

            result.metadata.firstEntry = m.optString("firstEntry", null);
            result.metadata.lastEntry = m.optString("lastEntry", null);
            result.metadata.span = m.optString("span", "unknown");
        }

        return result;
    }

    public boolean hasHistory() {
        return chain != null && chain.size() > 1;
    }

    public int getEntryCount() {
        return chain != null ? chain.size() : 0;
    }

    public String getSummaryLine() {
        if (metadata == null) return "No provenance data";
        return String.format("%d entries, %d actors, span: %s",
            metadata.totalEntries, metadata.uniqueActors, metadata.span);
    }

    public String getActionIcon(String action) {
        switch (action) {
            case "created": return "✨";
            case "moderated": return "📋";
            case "verified": return "✅";
            case "corrected": return "✏️";
            case "enriched": return "🧠";
            case "merged": return "🔗";
            case "fixed": return "🔧";
            case "source_verified": return "🔍";
            case "updated": return "📝";
            case "added": return "➕";
            default: return "•";
        }
    }
}
