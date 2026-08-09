package com.putraworks.graveatlas.ui.navigation;

/**
 * Navigation routes for the app.
 */
public class NavRoute {
    public static final String HOME = "home";
    public static final String SEARCH = "search";
    public static final String MAP = "map";
    public static final String GRAVE_DETAIL = "grave/{id}";
    public static final String ADD_GRAVE = "add_grave";
    public static final String EDIT_GRAVE = "edit_grave/{id}";
    public static final String CONTRIBUTE = "contribute";
    public static final String SETTINGS = "settings";
    public static final String ABOUT = "about";
    public static final String COMPASS = "compass";

    public static String graveDetail(String id) {
        return GRAVE_DETAIL.replace("{id}", id);
    }

    public static String editGrave(String id) {
        return EDIT_GRAVE.replace("{id}", id);
    }
}
