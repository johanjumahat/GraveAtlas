package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Phase 24: Memorial Story Result
 */
public class MemorialStoryResult {

    public String title;
    public String fullText;
    public List<StorySection> sections;
    public StoryMetadata metadata;
    public String attribution;

    public MemorialStoryResult() {
        sections = new ArrayList<>();
    }

    public boolean hasSections() { return sections != null && !sections.isEmpty(); }

    public static MemorialStoryResult fromJson(JSONObject json) {
        MemorialStoryResult result = new MemorialStoryResult();
        result.title = json.optString("title", "");
        result.fullText = json.optString("fullText", "");
        result.attribution = json.optString("attribution", "GraveAtlas — AI Memorial Story Generator");

        JSONArray s = json.optJSONArray("sections");
        if (s != null) {
            for (int i = 0; i < s.length(); i++) {
                JSONObject sec = s.optJSONObject(i);
                if (sec != null) {
                    StorySection section = new StorySection();
                    section.title = sec.optString("title", "");
                    section.text = sec.optString("text", "");
                    result.sections.add(section);
                }
            }
        }

        JSONObject m = json.optJSONObject("metadata");
        if (m != null) {
            result.metadata = StoryMetadata.fromJson(m);
        }
        return result;
    }

    public static class StorySection {
        public String title;
        public String text;
    }

    public static class StoryMetadata {
        public String recordId;
        public String name;
        public int birthYear;
        public int deathYear;
        public int wordCount;
        public int sectionsGenerated;
        public List<String> enrichmentUsed;

        public static StoryMetadata fromJson(JSONObject json) {
            StoryMetadata m = new StoryMetadata();
            m.recordId = json.optString("recordId", "");
            m.name = json.optString("name", "");
            m.birthYear = json.optInt("birthYear", 0);
            m.deathYear = json.optInt("deathYear", 0);
            m.wordCount = json.optInt("wordCount", 0);
            m.sectionsGenerated = json.optInt("sectionsGenerated", 0);
            m.enrichmentUsed = new ArrayList<>();
            JSONArray arr = json.optJSONArray("enrichmentUsed");
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) m.enrichmentUsed.add(arr.optString(i));
            }
            return m;
        }
    }
}
