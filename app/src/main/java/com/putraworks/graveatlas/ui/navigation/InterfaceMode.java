package com.putraworks.graveatlas.ui.navigation;

/**
 * Adaptive Interface Modes for GraveAtlas.
 *
 * Each mode adapts the bottom navigation, default home screen,
 * and AI system prompt context to the user's current workflow.
 *
 * Modes:
 * - RESEARCH:   AI-first exploration, evidence trails, timeline, research canvas
 * - MAP:        Geographic exploration, GPS, compass, nearby cemeteries
 * - ARCHIVE:    Record management, search, cemetery browsing, contributions
 * - INSTITUTION: Data import, admin, moderation (for museums/institutions)
 * - PUBLIC:     Simplified, read-only casual browsing
 */
public enum InterfaceMode {

    RESEARCH(
        "Research",
        "AI-first exploration with evidence trails, timelines, and research canvas",
        new String[]{"home", "search", "map", "more"},
        "home"
    ),

    MAP(
        "Map Explorer",
        "Geographic exploration with GPS, compass, and nearby cemeteries",
        new String[]{"home", "map", "search", "more"},
        "map"
    ),

    ARCHIVE(
        "Archive Manager",
        "Record management, search, cemetery browsing, and contributions",
        new String[]{"home", "search", "more"},
        "search"
    ),

    INSTITUTION(
        "Institution",
        "Data import, admin, moderation, and quality control",
        new String[]{"home", "search", "more"},
        "home"
    ),

    PUBLIC(
        "Public Browser",
        "Simplified, read-only browsing for casual visitors",
        new String[]{"home", "search", "map", "more"},
        "home"
    );

    private final String label;
    private final String description;
    private final String[] navItems;
    private final String defaultScreen;

    InterfaceMode(String label, String description, String[] navItems, String defaultScreen) {
        this.label = label;
        this.description = description;
        this.navItems = navItems;
        this.defaultScreen = defaultScreen;
    }

    public String getLabel() { return label; }
    public String getDescription() { return description; }
    public String[] getNavItems() { return navItems; }
    public String getDefaultScreen() { return defaultScreen; }

    /**
     * Get the AI context hint for this mode — prepended to the AI system prompt
     * so the AI knows what interface context the user is in.
     */
    public String getAIContextHint() {
        switch (this) {
            case RESEARCH:
                return "The user is in RESEARCH mode — prioritize evidence trails, source citations, "
                    + "timeline references, and research canvas connections. Suggest deeper investigation paths.";
            case MAP:
                return "The user is in MAP EXPLORER mode — prioritize geographic context, nearby cemeteries, "
                    + "coordinates, and map-based discovery. Suggest map actions when relevant.";
            case ARCHIVE:
                return "The user is in ARCHIVE MANAGER mode — prioritize record completeness, verification status, "
                    + "and data quality. Suggest contributions, edits, and duplicate checks.";
            case INSTITUTION:
                return "The user is in INSTITUTION mode — prioritize data import workflows, moderation, "
                    + "and bulk operations. Reference admin tools and import pipeline.";
            case PUBLIC:
                return "The user is in PUBLIC BROWSER mode — keep responses simple and accessible. "
                    + "Avoid jargon, explain technical terms, and focus on discovery.";
            default:
                return "";
        }
    }

    /**
     * Check if this mode allows editing/contributing.
     */
    public boolean canContribute() {
        return this != PUBLIC;
    }

    /**
     * Check if this mode shows admin/import tools.
     */
    public boolean showAdminTools() {
        return this == INSTITUTION;
    }

    /**
     * Check if this mode shows the compass and GPS features prominently.
     */
    public boolean emphasizeMap() {
        return this == MAP || this == RESEARCH;
    }

    /**
     * Check if this mode shows the research canvas.
     */
    public boolean showResearchCanvas() {
        return this == RESEARCH;
    }

    /**
     * Check if this mode shows the timeline.
     */
    public boolean showTimeline() {
        return this == RESEARCH || this == ARCHIVE;
    }

    /**
     * Check if this mode shows the AI command bar.
     */
    public boolean showAICommandBar() {
        return this != PUBLIC;
    }

    /**
     * Parse a mode from its label string (case-insensitive).
     */
    public static InterfaceMode fromLabel(String label) {
        if (label == null) return RESEARCH;
        for (InterfaceMode mode : values()) {
            if (mode.label.equalsIgnoreCase(label) || mode.name().equalsIgnoreCase(label)) {
                return mode;
            }
        }
        return RESEARCH;
    }
}
