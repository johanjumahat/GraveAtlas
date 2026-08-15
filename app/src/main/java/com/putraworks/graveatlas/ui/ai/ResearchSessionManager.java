package com.putraworks.graveatlas.ui.ai;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Research session persistence — saves AI investigations locally so users can
 * resume their research across app sessions.
 *
 * Phase 16.2: Research sessions store the questions asked, answers received,
 * and any records referenced during an investigation.
 *
 * Stored in SharedPreferences as JSON. Each session has:
 * - Unique ID
 * - Title (auto-generated from first question)
 * - Created timestamp
 * - Last accessed timestamp
 * - List of interactions (question + answer pairs)
 * - List of referenced record IDs
 */
public class ResearchSessionManager {

    private static final String PREFS_NAME = "graveatlas_research_sessions";
    private static final String KEY_SESSIONS = "sessions";
    private static final int MAX_SESSIONS = 50;

    private final SharedPreferences prefs;

    public ResearchSessionManager(Context context) {
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    /**
     * A single research session.
     */
    public static class Session {
        public String id;
        public String title;
        public long createdAt;
        public long lastAccessedAt;
        public List<Interaction> interactions = new ArrayList<>();
        public List<String> referencedRecordIds = new ArrayList<>();

        public static class Interaction {
            public String question;
            public String answer;
            public long timestamp;
        }
    }

    /**
     * Create a new research session with the first question.
     */
    public Session createSession(String firstQuestion) {
        Session session = new Session();
        session.id = UUID.randomUUID().toString();
        session.title = generateTitle(firstQuestion);
        session.createdAt = System.currentTimeMillis();
        session.lastAccessedAt = session.createdAt;

        if (firstQuestion != null && !firstQuestion.isEmpty()) {
            Session.Interaction interaction = new Session.Interaction();
            interaction.question = firstQuestion;
            interaction.answer = ""; // Will be filled when AI responds
            interaction.timestamp = session.createdAt;
            session.interactions.add(interaction);
        }

        saveSession(session);
        return session;
    }

    /**
     * Add an AI answer to an existing session's last interaction.
     */
    public void addAnswer(String sessionId, String answer) {
        Session session = getSession(sessionId);
        if (session == null || session.interactions.isEmpty()) return;

        Session.Interaction last = session.interactions.get(session.interactions.size() - 1);
        last.answer = answer;
        session.lastAccessedAt = System.currentTimeMillis();
        saveSession(session);
    }

    /**
     * Add a new question to an existing session.
     */
    public void addQuestion(String sessionId, String question) {
        Session session = getSession(sessionId);
        if (session == null) return;

        Session.Interaction interaction = new Session.Interaction();
        interaction.question = question;
        interaction.answer = "";
        interaction.timestamp = System.currentTimeMillis();
        session.interactions.add(interaction);
        session.lastAccessedAt = System.currentTimeMillis();
        saveSession(session);
    }

    /**
     * Add a referenced record ID to a session.
     */
    public void addReferencedRecord(String sessionId, String recordId) {
        if (recordId == null || recordId.isEmpty()) return;
        Session session = getSession(sessionId);
        if (session == null) return;
        if (!session.referencedRecordIds.contains(recordId)) {
            session.referencedRecordIds.add(recordId);
            session.lastAccessedAt = System.currentTimeMillis();
            saveSession(session);
        }
    }

    /**
     * Get a session by ID.
     */
    public Session getSession(String sessionId) {
        String json = prefs.getString(sessionId, null);
        if (json == null) return null;
        try {
            return fromJson(new JSONObject(json));
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * List all saved sessions, most recent first.
     */
    public List<Session> listSessions() {
        List<Session> sessions = new ArrayList<>();
        String sessionsList = prefs.getString(KEY_SESSIONS, "[]");
        try {
            JSONArray arr = new JSONArray(sessionsList);
            for (int i = 0; i < arr.length(); i++) {
                String id = arr.getString(i);
                Session s = getSession(id);
                if (s != null) {
                    sessions.add(s);
                }
            }
        } catch (Exception e) { /* ignore */ }

        // Sort by lastAccessedAt descending
        sessions.sort((a, b) -> Long.compare(b.lastAccessedAt, a.lastAccessedAt));
        return sessions;
    }

    /**
     * Delete a session by ID.
     */
    public void deleteSession(String sessionId) {
        // Remove from sessions list
        List<Session> all = listSessions();
        JSONArray arr = new JSONArray();
        for (Session s : all) {
            if (!s.id.equals(sessionId)) {
                arr.put(s.id);
            }
        }
        prefs.edit()
                .putString(KEY_SESSIONS, arr.toString())
                .remove(sessionId)
                .apply();
    }

    /**
     * Clear all sessions.
     */
    public void clearAll() {
        List<Session> all = listSessions();
        SharedPreferences.Editor editor = prefs.edit();
        for (Session s : all) {
            editor.remove(s.id);
        }
        editor.remove(KEY_SESSIONS);
        editor.apply();
    }

    // ── Private helpers ──

    private void saveSession(Session session) {
        try {
            JSONObject json = toJson(session);
            prefs.edit().putString(session.id, json.toString()).apply();

            // Update sessions list
            String sessionsList = prefs.getString(KEY_SESSIONS, "[]");
            JSONArray arr = new JSONArray(sessionsList);
            boolean found = false;
            for (int i = 0; i < arr.length(); i++) {
                if (arr.getString(i).equals(session.id)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                arr.put(session.id);
                // Enforce max sessions limit
                while (arr.length() > MAX_SESSIONS) {
                    String oldId = arr.getString(0);
                    arr.remove(0);
                    prefs.edit().remove(oldId).apply();
                }
                prefs.edit().putString(KEY_SESSIONS, arr.toString()).apply();
            }
        } catch (Exception e) { /* ignore */ }
    }

    private String generateTitle(String question) {
        if (question == null || question.isEmpty()) return "New Investigation";
        // Use first 50 chars of question as title
        if (question.length() <= 50) return question;
        return question.substring(0, 47) + "...";
    }

    private JSONObject toJson(Session session) throws Exception {
        JSONObject json = new JSONObject();
        json.put("id", session.id);
        json.put("title", session.title);
        json.put("createdAt", session.createdAt);
        json.put("lastAccessedAt", session.lastAccessedAt);

        JSONArray interactionsArr = new JSONArray();
        for (Interaction i : session.interactions) {
            JSONObject iJson = new JSONObject();
            iJson.put("question", i.question);
            iJson.put("answer", i.answer);
            iJson.put("timestamp", i.timestamp);
            interactionsArr.put(iJson);
        }
        json.put("interactions", interactionsArr);

        JSONArray refsArr = new JSONArray();
        for (String ref : session.referencedRecordIds) {
            refsArr.put(ref);
        }
        json.put("referencedRecordIds", refsArr);

        return json;
    }

    private Session fromJson(JSONObject json) throws Exception {
        Session session = new Session();
        session.id = json.getString("id");
        session.title = json.optString("title", "Untitled");
        session.createdAt = json.optLong("createdAt", 0);
        session.lastAccessedAt = json.optLong("lastAccessedAt", session.createdAt);

        JSONArray interactionsArr = json.optJSONArray("interactions");
        if (interactionsArr != null) {
            for (int i = 0; i < interactionsArr.length(); i++) {
                JSONObject iJson = interactionsArr.getJSONObject(i);
                Interaction interaction = new Interaction();
                interaction.question = iJson.optString("question", "");
                interaction.answer = iJson.optString("answer", "");
                interaction.timestamp = iJson.optLong("timestamp", 0);
                session.interactions.add(interaction);
            }
        }

        JSONArray refsArr = json.optJSONArray("referencedRecordIds");
        if (refsArr != null) {
            for (int i = 0; i < refsArr.length(); i++) {
                session.referencedRecordIds.add(refsArr.getString(i));
            }
        }

        return session;
    }
}
