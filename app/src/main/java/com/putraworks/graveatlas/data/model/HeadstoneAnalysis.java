package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * AI headstone analysis result — structured data extracted from a headstone photo.
 */
public class HeadstoneAnalysis {
    public String analysisId;
    public String photoUrl;
    public String submittedAt;
    public String status; // analyzed, confirmed
    public String detectedText;
    public ParsedData parsedData;
    public GraveRecord suggestedRecord;
    public List<String> warnings;
    public String confirmedRecordId;

    public static class ParsedData {
        public String personName;
        public String givenNames;
        public String familyName;
        public String birthDate;
        public String deathDate;
        public String inscription;
        public String language;
        public String script;
        public String epitaph;
        public List<String> symbols;
        public double confidence;

        public static ParsedData fromJson(JSONObject json) {
            ParsedData pd = new ParsedData();
            pd.personName = json.optString("personName", null);
            pd.givenNames = json.optString("givenNames", null);
            pd.familyName = json.optString("familyName", null);
            pd.birthDate = json.optString("birthDate", null);
            pd.deathDate = json.optString("deathDate", null);
            pd.inscription = json.optString("inscription", null);
            pd.language = json.optString("language", null);
            pd.script = json.optString("script", null);
            pd.epitaph = json.optString("epitaph", null);
            pd.confidence = json.optDouble("confidence", 0);

            pd.symbols = new ArrayList<>();
            JSONArray symArr = json.optJSONArray("symbols");
            if (symArr != null) {
                for (int i = 0; i < symArr.length(); i++) {
                    pd.symbols.add(symArr.optString(i));
                }
            }
            return pd;
        }
    }

    public static class GraveRecord {
        public String personName;
        public String givenNames;
        public String familyName;
        public String birthDate;
        public String deathDate;
        public String cemeteryId;
        public String inscription;
        public String language;
        public String script;
        public String sourcePhoto;
        public double confidenceScore;
        public String status;

        public static GraveRecord fromJson(JSONObject json) {
            GraveRecord gr = new GraveRecord();
            gr.personName = json.optString("personName", null);
            gr.givenNames = json.optString("givenNames", null);
            gr.familyName = json.optString("familyName", null);
            gr.birthDate = json.optString("birthDate", null);
            gr.deathDate = json.optString("deathDate", null);
            gr.cemeteryId = json.optString("cemeteryId", null);
            gr.inscription = json.optString("inscription", null);
            gr.language = json.optString("language", null);
            gr.script = json.optString("script", null);
            gr.sourcePhoto = json.optString("sourcePhoto", null);
            gr.confidenceScore = json.optDouble("confidenceScore", 0);
            gr.status = json.optString("status", "pending_confirmation");
            return gr;
        }
    }

    public static HeadstoneAnalysis fromJson(JSONObject json) {
        HeadstoneAnalysis ha = new HeadstoneAnalysis();
        ha.analysisId = json.optString("analysisId", "");
        ha.photoUrl = json.optString("photoUrl", "");
        ha.submittedAt = json.optString("submittedAt", "");
        ha.status = json.optString("status", "analyzed");
        ha.detectedText = json.optString("detectedText", "");
        ha.confirmedRecordId = json.optString("confirmedRecordId", null);

        JSONObject pd = json.optJSONObject("parsedData");
        if (pd != null) ha.parsedData = ParsedData.fromJson(pd);

        JSONObject sr = json.optJSONObject("suggestedRecord");
        if (sr != null) ha.suggestedRecord = GraveRecord.fromJson(sr);

        ha.warnings = new ArrayList<>();
        JSONArray warnArr = json.optJSONArray("warnings");
        if (warnArr != null) {
            for (int i = 0; i < warnArr.length(); i++) {
                ha.warnings.add(warnArr.optString(i));
            }
        }
        return ha;
    }

    public boolean isConfirmed() { return "confirmed".equals(status); }
    public boolean hasLowConfidence() { return parsedData != null && parsedData.confidence < 0.5; }
    public boolean hasName() { return parsedData != null && parsedData.personName != null; }
    public boolean hasDates() {
        return parsedData != null && (parsedData.birthDate != null || parsedData.deathDate != null);
    }
}
