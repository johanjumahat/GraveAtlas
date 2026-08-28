package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Deduplication statistics.
 * Returned by GET /api/dedup/stats
 */
public class DedupStatsResult {
    public int totalRecords;
    public int mergedRecords;
    public int potentialDuplicatePairs;
    public int highConfidencePairs;
    public int autoMergeablePairs;
    public int conflictPairs;
    public int estimatedDuplicates;
    public int deduplicationRate;

    public static DedupStatsResult fromJson(JSONObject json) {
        DedupStatsResult r = new DedupStatsResult();
        r.totalRecords = json.optInt("totalRecords", 0);
        r.mergedRecords = json.optInt("mergedRecords", 0);
        r.potentialDuplicatePairs = json.optInt("potentialDuplicatePairs", 0);
        r.highConfidencePairs = json.optInt("highConfidencePairs", 0);
        r.autoMergeablePairs = json.optInt("autoMergeablePairs", 0);
        r.conflictPairs = json.optInt("conflictPairs", 0);
        r.estimatedDuplicates = json.optInt("estimatedDuplicates", 0);
        r.deduplicationRate = json.optInt("deduplicationRate", 0);
        return r;
    }

    public boolean hasPotentialDuplicates() { return potentialDuplicatePairs > 0; }
    public boolean hasConflicts() { return conflictPairs > 0; }
}
