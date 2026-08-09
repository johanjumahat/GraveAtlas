package com.putraworks.kuburai.chat;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

/**
 * Manages API keys and chat settings via SharedPreferences.
 * Each provider has its own API key storage.
 * Also stores per-model "working" test results.
 */
public class SettingsManager {
    private static final String PREFS_NAME = "kubur_ai_settings";
    private static final String KEY_PREFIX = "api_key_";
    private static final String KEY_PROVIDER = "selected_provider";
    private static final String KEY_MODEL_PREFIX = "selected_model_";
    private static final String KEY_STATUS_PREFIX = "model_status_";
    private static final String KEY_SELECTED_VOICE = "selected_voice";
    private static final String KEY_TTS_ENABLED = "tts_enabled";

    private final SharedPreferences prefs;

    public SettingsManager(Context context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    // ── API Keys ──

    public String getApiKey(String providerId) {
        return prefs.getString(KEY_PREFIX + providerId, "");
    }

    public void setApiKey(String providerId, String key) {
        prefs.edit().putString(KEY_PREFIX + providerId, key).apply();
    }

    public boolean hasApiKey(String providerId) {
        String key = getApiKey(providerId);
        return key != null && !key.trim().isEmpty();
    }

    // ── Provider / Model selection ──

    public int getSelectedProvider() {
        return prefs.getInt(KEY_PROVIDER, 0);
    }

    public void setSelectedProvider(int index) {
        prefs.edit().putInt(KEY_PROVIDER, index).apply();
    }

    public String getSelectedModel(String providerId) {
        return prefs.getString(KEY_MODEL_PREFIX + providerId, null);
    }

    public void setSelectedModel(String providerId, String modelId) {
        prefs.edit().putString(KEY_MODEL_PREFIX + providerId, modelId).apply();
    }

    // ── Model test statuses (persisted until user re-tests) ──

    public Boolean getModelStatus(String providerId, String modelId) {
        JSONObject statuses = getStatuses(providerId);
        if (statuses.has(modelId)) {
            return statuses.optBoolean(modelId, false);
        }
        return null;
    }

    public void setModelStatus(String providerId, String modelId, boolean working) {
        try {
            JSONObject statuses = getStatuses(providerId);
            statuses.put(modelId, working);
            prefs.edit().putString(KEY_STATUS_PREFIX + providerId, statuses.toString()).apply();
        } catch (Exception e) {
            // ignore
        }
    }

    public void clearModelStatuses(String providerId) {
        prefs.edit().remove(KEY_STATUS_PREFIX + providerId).apply();
    }

    // ── Text-to-speech toggle (persisted) ──

    public boolean isTtsEnabled() {
        return prefs.getBoolean(KEY_TTS_ENABLED, false);
    }

    public void setTtsEnabled(boolean enabled) {
        prefs.edit().putBoolean(KEY_TTS_ENABLED, enabled).apply();
    }

    public String getSelectedVoice() {
        return prefs.getString(KEY_SELECTED_VOICE, null);
    }

    public void setSelectedVoice(String voiceName) {
        prefs.edit().putString(KEY_SELECTED_VOICE, voiceName).apply();
    }

    private JSONObject getStatuses(String providerId) {
        String json = prefs.getString(KEY_STATUS_PREFIX + providerId, "{}");
        try {
            return new JSONObject(json);
        } catch (Exception e) {
            return new JSONObject();
        }
    }
}
