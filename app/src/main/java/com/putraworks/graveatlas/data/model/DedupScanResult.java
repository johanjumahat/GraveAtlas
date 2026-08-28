package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Result of a duplicate scan.
 * Returned by GET /api/dedup/scan
 */
public class DedupScanResult {
    public int totalScanned;
    public int duplicatePairs;
    public int autoMergeable;
    public int needsReview;
    public List<DuplicatePair> duplicates;

    public static class DuplicatePair {
        public RecordRef record1;
        public RecordRef record2;
        public int matchScore;
        public List<String> matchReasons;
        public List<FieldConflict> conflicts;
        public boolean hasConflicts;
        public String recommendedAction;

        public static DuplicatePair fromJson(JSONObject json) {
            DuplicatePair dp = new DuplicatePair();
            dp.matchScore = json.optInt("matchScore", 0);
            dp.hasConflicts = json.optBoolean("hasConflicts", false);
            dp.recommendedAction = json.optString("recommendedAction", "review_and_merge");

            dp.record1 = RecordRef.fromJson(json.optJSONObject("record1"));
            dp.record2 = RecordRef.fromJson(json.optJSONObject("record2"));

            dp.matchReasons = new ArrayList<>();
            JSONArray reasons = json.optJSONArray("matchReasons");
            if (reasons != null) {
                for (int i = 0; i < reasons.length(); i++) {
                    dp.matchReasons.add(reasons.optString(i));
                }
            }

            dp.conflicts = new ArrayList<>();
            JSONArray conflicts = json.optJSONArray("conflicts");
            if (conflicts != null) {
                for (int i = 0; i < conflicts.length(); i++) {
                    JSONObject c = conflicts.optJSONObject(i);
                    if (c != null) dp.conflicts.add(FieldConflict.fromJson(c));
                }
            }
            return dp;
        }
    }

    public static class RecordRef {
        public String id;
        public String name;
        public String cemetery;

        public static RecordRef fromJson(JSONObject json) {
            RecordRef r = new RecordRef();
            if (json != null) {
                r.id = json.optString("id", "");
                r.name = json.optString("name", "Unknown");
                r.cemetery = json.optString("cemetery", "");
            }
            return r;
        }
    }

    public static class FieldConflict {
        public String field;
        public Object value1;
        public Object value2;

        public static FieldConflict fromJson(JSONObject json) {
            FieldConflict fc = new FieldConflict();
            fc.field = json.optString("field", "");
            fc.value1 = json.opt("value1");
            fc.value2 = json.opt("value2");
            return fc;
        }
    }

    public static DedupScanResult fromJson(JSONObject json) {
        DedupScanResult r = new DedupScanResult();
        r.totalScanned = json.optInt("totalScanned", 0);
        r.duplicatePairs = json.optInt("duplicatePairs", 0);
        r.autoMergeable = json.optInt("autoMergeable", 0);
        r.needsReview = json.optInt("needsReview", 0);

        r.duplicates = new ArrayList<>();
        JSONArray dups = json.optJSONArray("duplicates");
        if (dups != null) {
            for (int i = 0; i < dups.length(); i++) {
                JSONObject d = dups.optJSONObject(i);
                if (d != null) r.duplicates.add(DuplicatePair.fromJson(d));
            }
        }
        return r;
    }

    public boolean hasDuplicates() { return duplicatePairs > 0; }
    public boolean hasAutoMergeable() { return autoMergeable > 0; }
}
