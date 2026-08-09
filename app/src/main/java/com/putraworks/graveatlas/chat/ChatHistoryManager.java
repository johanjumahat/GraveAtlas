package com.putraworks.graveatlas.chat;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import com.putraworks.graveatlas.auth.SecureStorage;

import java.util.ArrayList;
import java.util.List;

/**
 * Persists chat history to EncryptedSharedPreferences, scoped per
 * logged-in Google user. History survives activity recreation, backgrounding,
 * and process death. Wiped only when user taps "Clear Chat".
 */
public class ChatHistoryManager {
    private static final String KEY_MESSAGES = "messages";
    private static final int MAX_STORED_MESSAGES = 300;

    private final SharedPreferences prefs;

    public ChatHistoryManager(Context context) {
        SecureStorage.init(context);
        String userId = SecureStorage.getCurrentUserId(context);

        // Per-user encrypted prefs if logged in, encrypted global otherwise
        String prefsName = (userId != null) ? "user_" + userId + "_chat" : "graveatlas_chat";
        try {
            prefs = SecureStorage.getEncryptedPrefs(context, prefsName);
        } catch (Exception e) {
            prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE);
        }
    }

    public void save(List<ChatMessage> messages) {
        try {
            JSONArray arr = new JSONArray();
            int start = Math.max(0, messages.size() - MAX_STORED_MESSAGES);
            for (int i = start; i < messages.size(); i++) {
                ChatMessage m = messages.get(i);
                JSONObject o = new JSONObject();
                o.put("content", m.getContent());
                o.put("isUser", m.isUser());
                o.put("isError", m.isError());
                o.put("timestamp", m.getTimestamp());
                arr.put(o);
            }
            prefs.edit().putString(KEY_MESSAGES, arr.toString()).apply();
        } catch (Exception e) {
            // non-fatal
        }
    }

    public List<ChatMessage> load() {
        List<ChatMessage> result = new ArrayList<>();
        try {
            String json = prefs.getString(KEY_MESSAGES, null);
            if (json == null) return result;
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                ChatMessage m = new ChatMessage(
                        o.getString("content"),
                        o.getBoolean("isUser"),
                        o.optBoolean("isError", false));
                result.add(m);
            }
        } catch (Exception e) {
            // return whatever was parsed
        }
        return result;
    }

    public void clear() {
        prefs.edit().remove(KEY_MESSAGES).apply();
    }

    public boolean hasHistory() {
        return prefs.contains(KEY_MESSAGES);
    }
}
