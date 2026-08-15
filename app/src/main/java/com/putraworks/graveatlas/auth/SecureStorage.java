package com.putraworks.graveatlas.auth;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

/**
 * Encrypted SharedPreferences wrapper for per-user data storage.
 * Each Google account gets its own encrypted preferences file.
 *
 * Stores:
 * - Google account info (userId, email, name)
 * - Backend session token (from /api/auth/google/verify)
 * - Per-user chat history, API keys, settings
 */
public class SecureStorage {

    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_USER_EMAIL = "user_email";
    private static final String KEY_USER_NAME = "user_name";
    private static final String KEY_SESSION_TOKEN = "session_token";
    private static final String KEY_GOOGLE_SUB = "google_sub";
    private static final String KEY_LOGIN_TIME = "login_time";
    private static final String KEY_CHAT_HISTORY = "chat_history";
    private static final String KEY_API_KEYS = "api_keys";
    private static final String KEY_SETTINGS = "settings_json";

    // Session tokens expire after 7 days (matching backend)
    private static final long SESSION_MAX_AGE_MS = 7L * 24 * 60 * 60 * 1000;

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
    public static SharedPreferences getEncryptedPrefs(Context context, String fileName) {
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

    // ── Session Token ──

    /** Save the backend session token (from /api/auth/google/verify). */
    public static void saveSessionToken(Context context, String token, String googleSub) {
        SharedPreferences prefs = getEncryptedPrefs(context, "graveatlas_global");
        prefs.edit()
                .putString(KEY_SESSION_TOKEN, token)
                .putString(KEY_GOOGLE_SUB, googleSub)
                .putLong(KEY_LOGIN_TIME, System.currentTimeMillis())
                .apply();
    }

    /** Get the backend session token, or null if not logged in or expired. */
    public static String getSessionToken(Context context) {
        SharedPreferences prefs = getEncryptedPrefs(context, "graveatlas_global");
        String token = prefs.getString(KEY_SESSION_TOKEN, null);
        if (token == null) return null;

        // Check token age
        long loginTime = prefs.getLong(KEY_LOGIN_TIME, 0);
        if (loginTime == 0) return null;
        long age = System.currentTimeMillis() - loginTime;
        if (age > SESSION_MAX_AGE_MS) {
            // Token expired — clear it
            clearSessionToken(context);
            return null;
        }

        return token;
    }

    /** Get the Google sub (stable account ID) for the current session. */
    public static String getGoogleSub(Context context) {
        SharedPreferences prefs = getEncryptedPrefs(context, "graveatlas_global");
        return prefs.getString(KEY_GOOGLE_SUB, null);
    }

    /** Clear the session token (logout from backend). */
    public static void clearSessionToken(Context context) {
        SharedPreferences prefs = getEncryptedPrefs(context, "graveatlas_global");
        prefs.edit()
                .remove(KEY_SESSION_TOKEN)
                .remove(KEY_GOOGLE_SUB)
                .remove(KEY_LOGIN_TIME)
                .apply();
    }

    /** Check if the user has a valid (non-expired) session token. */
    public static boolean hasValidSession(Context context) {
        return getSessionToken(context) != null;
    }

    // ── User Info ──

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

    /** Clear the current user (full logout). */
    public static void clearCurrentUser(Context context) {
        SharedPreferences prefs = getEncryptedPrefs(context, "graveatlas_global");
        prefs.edit().clear().apply();
    }

    /** Check if a user is logged in (has user info). */
    public static boolean isLoggedIn(Context context) {
        return getCurrentUserId(context) != null;
    }

    /**
     * Check if the user can submit records.
     * Requires both user info AND a valid session token.
     */
    public static boolean canSubmit(Context context) {
        return isLoggedIn(context) && hasValidSession(context);
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
