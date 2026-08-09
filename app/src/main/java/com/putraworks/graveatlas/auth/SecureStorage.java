package com.putraworks.graveatlas.auth;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

/**
 * Encrypted SharedPreferences wrapper for per-user data storage.
 * Each Google account gets its own encrypted preferences file.
 */
public class SecureStorage {

    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_USER_EMAIL = "user_email";
    private static final String KEY_USER_NAME = "user_name";
    private static final String KEY_CHAT_HISTORY = "chat_history";
    private static final String KEY_API_KEYS = "api_keys";
    private static final String KEY_SETTINGS = "settings_json";

    private static MasterKey masterKey;
    private static SharedPreferences globalPrefs;

    /** Initialize the master key for encryption (call once at app start). */
    public static void init(Context context) {
        try {
            if (masterKey == null) {
                masterKey = new MasterKey.Builder(context)
                        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                        .build();
            }
            if (globalPrefs == null) {
                globalPrefs = getEncryptedPrefs(context, "graveatlas_global");
            }
        } catch (Exception e) {
            // Fallback to regular prefs if encryption fails
            globalPrefs = context.getSharedPreferences("graveatlas_global", Context.MODE_PRIVATE);
        }
    }

    /** Get encrypted SharedPreferences for a specific file name. */
        /** Package-private: get encrypted prefs for a file name. */
    static SharedPreferences getEncryptedPrefs(Context context, String fileName) {
        try {
            return EncryptedSharedPreferences.create(
                    context,
                    fileName,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (Exception e) {
            return context.getSharedPreferences(fileName, Context.MODE_PRIVATE);
        }
    }

    /** Save the current logged-in user info (encrypted). */
    public static void saveCurrentUser(Context context, String userId, String email, String name) {
        SharedPreferences prefs = getEncryptedPrefs(context, "graveatlas_global");
        prefs.edit()
                .putString(KEY_USER_ID, userId)
                .putString(KEY_USER_EMAIL, email)
                .putString(KEY_USER_NAME, name)
                .apply();
    }

    /** Get the current logged-in user ID, or null if not logged in. */
    public static String getCurrentUserId(Context context) {
        SharedPreferences prefs = getEncryptedPrefs(context, "graveatlas_global");
        return prefs.getString(KEY_USER_ID, null);
    }

    /** Get the current logged-in user's email, or null. */
    public static String getCurrentUserEmail(Context context) {
        SharedPreferences prefs = getEncryptedPrefs(context, "graveatlas_global");
        return prefs.getString(KEY_USER_EMAIL, null);
    }

    /** Get the current logged-in user's display name, or null. */
    public static String getCurrentUserName(Context context) {
        SharedPreferences prefs = getEncryptedPrefs(context, "graveatlas_global");
        return prefs.getString(KEY_USER_NAME, null);
    }

    /** Clear the current user (logout). */
    public static void clearCurrentUser(Context context) {
        SharedPreferences prefs = getEncryptedPrefs(context, "graveatlas_global");
        prefs.edit()
                .remove(KEY_USER_ID)
                .remove(KEY_USER_EMAIL)
                .remove(KEY_USER_NAME)
                .apply();
    }

    /** Check if a user is logged in. */
    public static boolean isLoggedIn(Context context) {
        return getCurrentUserId(context) != null;
    }

    // ── Per-user data storage ──

    /** Save chat history for a specific user (encrypted). */
    public static void saveChatHistory(Context context, String userId, String jsonHistory) {
        SharedPreferences prefs = getEncryptedPrefs(context, "user_" + userId);
        prefs.edit().putString(KEY_CHAT_HISTORY, jsonHistory).apply();
    }

    /** Load chat history for a specific user (encrypted). */
    public static String loadChatHistory(Context context, String userId) {
        SharedPreferences prefs = getEncryptedPrefs(context, "user_" + userId);
        return prefs.getString(KEY_CHAT_HISTORY, null);
    }

    /** Save API keys for a specific user (encrypted). */
    public static void saveApiKeys(Context context, String userId, String jsonKeys) {
        SharedPreferences prefs = getEncryptedPrefs(context, "user_" + userId);
        prefs.edit().putString(KEY_API_KEYS, jsonKeys).apply();
    }

    /** Load API keys for a specific user (encrypted). */
    public static String loadApiKeys(Context context, String userId) {
        SharedPreferences prefs = getEncryptedPrefs(context, "user_" + userId);
        return prefs.getString(KEY_API_KEYS, null);
    }

    /** Save app settings for a specific user (encrypted). */
    public static void saveSettings(Context context, String userId, String jsonSettings) {
        SharedPreferences prefs = getEncryptedPrefs(context, "user_" + userId);
        prefs.edit().putString(KEY_SETTINGS, jsonSettings).apply();
    }

    /** Load app settings for a specific user (encrypted). */
    public static String loadSettings(Context context, String userId) {
        SharedPreferences prefs = getEncryptedPrefs(context, "user_" + userId);
        return prefs.getString(KEY_SETTINGS, null);
    }
}
