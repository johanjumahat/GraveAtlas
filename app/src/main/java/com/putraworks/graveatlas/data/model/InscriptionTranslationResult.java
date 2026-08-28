package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Phase 22: Inscription Translation Result
 *
 * Represents the result of analyzing and translating a headstone inscription.
 * Contains script detection, translation, transliteration, and cultural notation info.
 */
public class InscriptionTranslationResult {

    // Script detection
    public String originalText;
    public String script;
    public String sourceLanguage;
    public int confidence;
    public String targetLanguage;

    // Translation
    public String translatedText;
    public String transliteratedText;
    public String note;

    // Cultural notations
    public List<CulturalNotation> notations;

    // Translation segments
    public List<TranslationSegment> segments;

    // Cross-language search
    public List<String> expandedQueries;
    public List<String> languages;

    // Supported languages (for info endpoint)
    public List<SupportedLanguage> supportedLanguages;
    public int totalLanguages;
    public int notationsFound;
    public int totalExpanded;

    // Attribution
    public String attribution;

    // Default constructor
    public InscriptionTranslationResult() {
        notations = new ArrayList<>();
        segments = new ArrayList<>();
        expandedQueries = new ArrayList<>();
        languages = new ArrayList<>();
        supportedLanguages = new ArrayList<>();
    }

    /**
     * Check if translation has results.
     */
    public boolean hasTranslation() {
        return translatedText != null && !translatedText.isEmpty();
    }

    /**
     * Check if transliteration is available.
     */
    public boolean hasTransliteration() {
        return transliteratedText != null && !transliteratedText.isEmpty();
    }

    /**
     * Check if any cultural notations were found.
     */
    public boolean hasNotations() {
        return notations != null && !notations.isEmpty();
    }

    /**
     * Check if cross-language expansion found equivalents.
     */
    public boolean hasExpandedQueries() {
        return expandedQueries != null && !expandedQueries.isEmpty();
    }

    /**
     * Check if script was detected.
     */
    public boolean hasScriptDetected() {
        return script != null && !script.equals("unknown") && confidence > 0;
    }

    /**
     * Parse from JSON response.
     */
    public static InscriptionTranslationResult fromJson(JSONObject json) {
        InscriptionTranslationResult result = new InscriptionTranslationResult();

        result.originalText = json.optString("originalText", "");
        result.script = json.optString("script", "unknown");
        result.sourceLanguage = json.optString("sourceLanguage", "unknown");
        result.confidence = json.optInt("confidence", 0);
        result.targetLanguage = json.optString("targetLanguage", "English");
        result.translatedText = json.optString("translatedText", "");
        result.transliteratedText = json.optString("transliteratedText", "");
        result.note = json.optString("note", "");
        result.attribution = json.optString("attribution", "GraveAtlas — AI Inscription Translation");
        result.totalLanguages = json.optInt("totalLanguages", 0);
        result.notationsFound = json.optInt("notationsFound", 0);
        result.totalExpanded = json.optInt("totalExpanded", 0);

        // Parse notations
        JSONArray notationsArray = json.optJSONArray("notations");
        if (notationsArray != null) {
            for (int i = 0; i < notationsArray.length(); i++) {
                JSONObject n = notationsArray.optJSONObject(i);
                if (n != null) {
                    result.notations.add(CulturalNotation.fromJson(n));
                }
            }
        }

        // Parse segments
        JSONArray segmentsArray = json.optJSONArray("segments");
        if (segmentsArray != null) {
            for (int i = 0; i < segmentsArray.length(); i++) {
                JSONObject s = segmentsArray.optJSONObject(i);
                if (s != null) {
                    result.segments.add(TranslationSegment.fromJson(s));
                }
            }
        }

        // Parse expanded queries
        JSONArray expandedArray = json.optJSONArray("expandedQueries");
        if (expandedArray != null) {
            for (int i = 0; i < expandedArray.length(); i++) {
                result.expandedQueries.add(expandedArray.optString(i));
            }
        }

        // Parse languages
        JSONArray languagesArray = json.optJSONArray("languages");
        if (languagesArray != null) {
            for (int i = 0; i < languagesArray.length(); i++) {
                result.languages.add(languagesArray.optString(i));
            }
        }

        // Parse supported languages
        JSONArray langsArray = json.optJSONArray("languages");
        if (langsArray != null && result.totalLanguages > 0) {
            for (int i = 0; i < langsArray.length(); i++) {
                JSONObject l = langsArray.optJSONObject(i);
                if (l != null) {
                    result.supportedLanguages.add(SupportedLanguage.fromJson(l));
                }
            }
        }

        return result;
    }

    /**
     * Cultural/religious notation found in inscription.
     */
    public static class CulturalNotation {
        public String notation;
        public String meaning;
        public String tradition;
        public String language;

        public CulturalNotation() {}

        public static CulturalNotation fromJson(JSONObject json) {
            CulturalNotation n = new CulturalNotation();
            n.notation = json.optString("notation", "");
            n.meaning = json.optString("meaning", "");
            n.tradition = json.optString("tradition", "");
            n.language = json.optString("language", "");
            return n;
        }
    }

    /**
     * A translated segment of the inscription.
     */
    public static class TranslationSegment {
        public String original;
        public String translation;
        public int position;

        public TranslationSegment() {}

        public static TranslationSegment fromJson(JSONObject json) {
            TranslationSegment s = new TranslationSegment();
            s.original = json.optString("original", "");
            s.translation = json.optString("translation", "");
            s.position = json.optInt("position", 0);
            return s;
        }
    }

    /**
     * A supported language for translation.
     */
    public static class SupportedLanguage {
        public String code;
        public String name;
        public String script;
        public String nativeName;
        public boolean transliteration;

        public SupportedLanguage() {}

        public static SupportedLanguage fromJson(JSONObject json) {
            SupportedLanguage l = new SupportedLanguage();
            l.code = json.optString("code", "");
            l.name = json.optString("name", "");
            l.script = json.optString("script", "");
            l.nativeName = json.optString("nativeName", "");
            l.transliteration = json.optBoolean("transliteration", false);
            return l;
        }
    }
}
