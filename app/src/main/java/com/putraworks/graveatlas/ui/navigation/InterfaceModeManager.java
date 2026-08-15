package com.putraworks.graveatlas.ui.navigation;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Manages the current Adaptive Interface Mode.
 *
 * Persists the user's mode selection across sessions and provides
 * the current mode to activities and fragments.
 */
public class InterfaceModeManager {

    private static final String PREFS_NAME = "graveatlas_interface_mode";
    private static final String KEY_MODE = "interface_mode";
    private static final String KEY_FIRST_LAUNCH = "first_mode_selection";

    private static InterfaceMode currentMode = InterfaceMode.RESEARCH;
    private static boolean initialized = false;

    /**
     * Initialize from persisted preferences. Call once at app startup.
     */
    public static void init(Context context) {
        if (initialized) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String saved = prefs.getString(KEY_MODE, null);
        if (saved != null) {
            currentMode = InterfaceMode.fromLabel(saved);
        }
        initialized = true;
    }

    /**
     * Get the current interface mode.
     */
    public static InterfaceMode getCurrentMode() {
        return currentMode;
    }

    /**
     * Set the interface mode and persist it.
     */
    public static void setMode(Context context, InterfaceMode mode) {
        currentMode = mode;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_MODE, mode.name()).apply();
    }

    /**
     * Check if this is the first launch (mode not yet selected).
     */
    public static boolean isFirstLaunch(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(KEY_FIRST_LAUNCH, true);
    }

    /**
     * Mark that the user has selected a mode (no longer first launch).
     */
    public static void markModeSelected(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_FIRST_LAUNCH, false).apply();
    }

    /**
     * Get the AI context hint for the current mode.
     */
    public static String getCurrentAIContextHint() {
        return currentMode.getAIContextHint();
    }

    /**
     * Check if the current mode allows contributing.
     */
    public static boolean canContribute() {
        return currentMode.canContribute();
    }

    /**
     * Check if the current mode shows admin tools.
     */
    public static boolean showAdminTools() {
        return currentMode.showAdminTools();
    }

    /**
     * Check if the current mode emphasizes map features.
     */
    public static boolean emphasizeMap() {
        return currentMode.emphasizeMap();
    }

    /**
     * Check if the current mode shows the research canvas.
     */
    public static boolean showResearchCanvas() {
        return currentMode.showResearchCanvas();
    }

    /**
     * Check if the current mode shows the timeline.
     */
    public static boolean showTimeline() {
        return currentMode.showTimeline();
    }

    /**
     * Check if the current mode shows the AI command bar.
     */
    public static boolean showAICommandBar() {
        return currentMode.showAICommandBar();
    }

    /**
     * Reset to default (for testing).
     */
    public static void reset() {
        currentMode = InterfaceMode.RESEARCH;
        initialized = false;
    }
}
