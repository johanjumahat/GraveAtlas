package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Photo quality assessment result — scored evaluation of a cemetery/headstone photo.
 */
public class PhotoAssessment {
    public String assessmentId;
    public String photoUrl;
    public String photoType;
    public String submittedAt;
    public int qualityScore;        // 0-100
    public String grade;            // A, B, C, D, F
    public String ocrReadiness;     // high, medium, low
    public List<Issue> issues;
    public List<String> recommendations;
    public List<String> strengths;
    public List<EnhancementSuggestion> enhancementSuggestions;

    public static class Issue {
        public String severity;    // high, medium, low
        public String field;       // brightness, contrast, sharpness, etc.
        public String message;

        public static Issue fromJson(JSONObject json) {
            Issue i = new Issue();
            i.severity = json.optString("severity", "");
            i.field = json.optString("field", "");
            i.message = json.optString("message", "");
            return i;
        }
    }

    public static class EnhancementSuggestion {
        public int step;
        public String action;
        public String description;
        public String tool;
        public String impact;      // high, medium, low

        public static EnhancementSuggestion fromJson(JSONObject json) {
            EnhancementSuggestion es = new EnhancementSuggestion();
            es.step = json.optInt("step", 1);
            es.action = json.optString("action", "");
            es.description = json.optString("description", "");
            es.tool = json.optString("tool", "");
            es.impact = json.optString("impact", "medium");
            return es;
        }
    }

    public static PhotoAssessment fromJson(JSONObject json) {
        PhotoAssessment pa = new PhotoAssessment();
        pa.assessmentId = json.optString("assessmentId", "");
        pa.photoUrl = json.optString("photoUrl", "");
        pa.photoType = json.optString("photoType", "unknown");
        pa.submittedAt = json.optString("submittedAt", "");
        pa.qualityScore = json.optInt("qualityScore", 0);
        pa.grade = json.optString("grade", "F");
        pa.ocrReadiness = json.optString("ocrReadiness", "low");

        pa.issues = new ArrayList<>();
        JSONArray issueArr = json.optJSONArray("issues");
        if (issueArr != null) {
            for (int i = 0; i < issueArr.length(); i++) {
                pa.issues.add(Issue.fromJson(issueArr.optJSONObject(i)));
            }
        }

        pa.recommendations = new ArrayList<>();
        JSONArray recArr = json.optJSONArray("recommendations");
        if (recArr != null) {
            for (int i = 0; i < recArr.length(); i++) {
                pa.recommendations.add(recArr.optString(i));
            }
        }

        pa.strengths = new ArrayList<>();
        JSONArray strArr = json.optJSONArray("strengths");
        if (strArr != null) {
            for (int i = 0; i < strArr.length(); i++) {
                pa.strengths.add(strArr.optString(i));
            }
        }

        pa.enhancementSuggestions = new ArrayList<>();
        JSONArray enhArr = json.optJSONArray("enhancementSuggestions");
        if (enhArr != null) {
            for (int i = 0; i < enhArr.length(); i++) {
                pa.enhancementSuggestions.add(EnhancementSuggestion.fromJson(enhArr.optJSONObject(i)));
            }
        }

        return pa;
    }

    public boolean isHighQuality() { return qualityScore >= 80; }
    public boolean isOcrReady() { return "high".equals(ocrReadiness); }
    public boolean hasHighSeverityIssues() {
        for (Issue i : issues) {
            if ("high".equals(i.severity)) return true;
        }
        return false;
    }
}
