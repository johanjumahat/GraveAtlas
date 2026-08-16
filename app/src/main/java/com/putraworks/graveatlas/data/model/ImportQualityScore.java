package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Import quality score result — evaluates a batch of records.
 * Returned by POST /api/import/score
 */
public class ImportQualityScore {
    public String sourceName;
    public int batchSize;
    public Scores scores;
    public String recommendation; // "accept", "review", "reject"
    public JSONObject fieldCoverage;
    public int errorCount;
    public int warningCount;
    public List<BatchError> errors;
    public List<BatchWarning> warnings;
    public List<RecordScore> recordScores;

    public static class Scores {
        public int completeness;
        public int coverage;
        public int consistency;
        public int overall;
    }

    public static class BatchError {
        public int recordIndex; // -1 if batch-level
        public String error;
    }

    public static class BatchWarning {
        public int recordIndex; // -1 if batch-level
        public String warning;
    }

    public static class RecordScore {
        public int index;
        public String id;
        public String name;
        public int completeness;
        public int coverage;
        public int consistency;
        public int overall;
        public List<String> errors;
        public List<String> warnings;
    }

    public static ImportQualityScore fromJson(JSONObject json) {
        ImportQualityScore result = new ImportQualityScore();
        result.sourceName = json.optString("sourceName", "Unknown");
        result.batchSize = json.optInt("batchSize", 0);
        result.recommendation = json.optString("recommendation", "review");
        result.errorCount = json.optInt("errorCount", 0);
        result.warningCount = json.optInt("warningCount", 0);
        result.fieldCoverage = json.optJSONObject("fieldCoverage");

        // Parse scores
        JSONObject scores = json.optJSONObject("scores");
        if (scores != null) {
            result.scores = new Scores();
            result.scores.completeness = scores.optInt("completeness", 0);
            result.scores.coverage = scores.optInt("coverage", 0);
            result.scores.consistency = scores.optInt("consistency", 0);
            result.scores.overall = scores.optInt("overall", 0);
        }

        // Parse errors
        result.errors = new ArrayList<>();
        JSONArray errArr = json.optJSONArray("errors");
        if (errArr != null) {
            for (int i = 0; i < errArr.length(); i++) {
                JSONObject e = errArr.optJSONObject(i);
                if (e == null) continue;
                BatchError err = new BatchError();
                err.recordIndex = e.optInt("recordIndex", -1);
                err.error = e.optString("error", "");
                result.errors.add(err);
            }
        }

        // Parse warnings
        result.warnings = new ArrayList<>();
        JSONArray warnArr = json.optJSONArray("warnings");
        if (warnArr != null) {
            for (int i = 0; i < warnArr.length(); i++) {
                JSONObject w = warnArr.optJSONObject(i);
                if (w == null) continue;
                BatchWarning warn = new BatchWarning();
                warn.recordIndex = w.optInt("recordIndex", -1);
                warn.warning = w.optString("warning", "");
                result.warnings.add(warn);
            }
        }

        // Parse record scores
        result.recordScores = new ArrayList<>();
        JSONArray recArr = json.optJSONArray("recordScores");
        if (recArr != null) {
            for (int i = 0; i < recArr.length(); i++) {
                JSONObject r = recArr.optJSONObject(i);
                if (r == null) continue;
                RecordScore rs = new RecordScore();
                rs.index = r.optInt("index", 0);
                rs.id = r.optString("id", null);
                rs.name = r.optString("name", null);
                rs.completeness = r.optInt("completeness", 0);
                rs.coverage = r.optInt("coverage", 0);
                rs.consistency = r.optInt("consistency", 0);
                rs.overall = r.optInt("overall", 0);

                rs.errors = new ArrayList<>();
                JSONArray re = r.optJSONArray("errors");
                if (re != null) {
                    for (int j = 0; j < re.length(); j++) rs.errors.add(re.optString(j));
                }

                rs.warnings = new ArrayList<>();
                JSONArray rw = r.optJSONArray("warnings");
                if (rw != null) {
                    for (int j = 0; j < rw.length(); j++) rs.warnings.add(rw.optString(j));
                }

                result.recordScores.add(rs);
            }
        }

        return result;
    }

    /**
     * Returns the recommendation as a human-readable label.
     */
    public String getRecommendationLabel() {
        switch (recommendation) {
            case "accept": return "Accept — quality is good";
            case "reject": return "Reject — quality is too low";
            default: return "Review — needs manual check";
        }
    }

    /**
     * Returns records with overall score below threshold.
     */
    public List<RecordScore> getLowQualityRecords(int threshold) {
        List<RecordScore> low = new ArrayList<>();
        for (RecordScore rs : recordScores) {
            if (rs.overall < threshold) low.add(rs);
        }
        return low;
    }

    /**
     * Returns only records with errors.
     */
    public List<RecordScore> getRecordsWithErrors() {
        List<RecordScore> withErrors = new ArrayList<>();
        for (RecordScore rs : recordScores) {
            if (rs.errors != null && !rs.errors.isEmpty()) withErrors.add(rs);
        }
        return withErrors;
    }
}
