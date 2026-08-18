package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Family linkage result.
 * Returned by GET /api/linkage/family/:cemeteryId
 */
public class FamilyLinkageResult {
    public String cemeteryId;
    public int totalLinks;
    public List<FamilyLink> links;
    public List<SurnameGroup> surnameGroups;

    public static class FamilyLink {
        public RecordRef recordA;
        public RecordRef recordB;
        public String surname;
        public int matchScore;
        public List<String> matchReasons;
        public String relationship;

        public static class RecordRef {
            public String id;
            public String name;
            public Integer birthYear;
            public Integer deathYear;

            public static RecordRef fromJson(JSONObject json) {
                RecordRef r = new RecordRef();
                r.id = json.optString("id", "");
                r.name = json.optString("name", "Unknown");
                r.birthYear = json.has("birthYear") && !json.isNull("birthYear") ? json.optInt("birthYear") : null;
                r.deathYear = json.has("deathYear") && !json.isNull("deathYear") ? json.optInt("deathYear") : null;
                return r;
            }
        }

        public static FamilyLink fromJson(JSONObject json) {
            FamilyLink fl = new FamilyLink();
            JSONObject a = json.optJSONObject("recordA");
            JSONObject b = json.optJSONObject("recordB");
            if (a != null) fl.recordA = RecordRef.fromJson(a);
            if (b != null) fl.recordB = RecordRef.fromJson(b);
            fl.surname = json.optString("surname", "");
            fl.matchScore = json.optInt("matchScore", 0);
            fl.relationship = json.optString("relationship", "");

            fl.matchReasons = new ArrayList<>();
            JSONArray reasons = json.optJSONArray("matchReasons");
            if (reasons != null) {
                for (int i = 0; i < reasons.length(); i++) {
                    fl.matchReasons.add(reasons.optString(i));
                }
            }
            return fl;
        }
    }

    public static class SurnameGroup {
        public String surname;
        public int count;

        public static SurnameGroup fromJson(JSONObject json) {
            SurnameGroup sg = new SurnameGroup();
            sg.surname = json.optString("surname", "");
            sg.count = json.optInt("count", 0);
            return sg;
        }
    }

    public static FamilyLinkageResult fromJson(JSONObject json) {
        FamilyLinkageResult r = new FamilyLinkageResult();
        r.cemeteryId = json.optString("cemeteryId", "");
        r.totalLinks = json.optInt("totalLinks", 0);

        r.links = new ArrayList<>();
        JSONArray links = json.optJSONArray("links");
        if (links != null) {
            for (int i = 0; i < links.length(); i++) {
                JSONObject l = links.optJSONObject(i);
                if (l != null) r.links.add(FamilyLink.fromJson(l));
            }
        }

        r.surnameGroups = new ArrayList<>();
        JSONArray sg = json.optJSONArray("surnameGroups");
        if (sg != null) {
            for (int i = 0; i < sg.length(); i++) {
                JSONObject g = sg.optJSONObject(i);
                if (g != null) r.surnameGroups.add(SurnameGroup.fromJson(g));
            }
        }

        return r;
    }

    public boolean hasLinks() { return links != null && !links.isEmpty(); }
}
