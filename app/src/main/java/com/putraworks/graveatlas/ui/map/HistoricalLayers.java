package com.putraworks.graveatlas.ui.map;

import com.putraworks.graveatlas.data.model.GraveRecord;

import java.util.ArrayList;
import java.util.List;

/**
 * Historical Map Layers — organizes grave records into time-based layers.
 *
 * Phase 16.4: AI Map — historical layers, source overlays.
 *
 * Layers group records by era, allowing users to visualize historical patterns:
 * - PRE_1800: Pre-1800 (very old records)
 * - C19_EARLY: 1800-1849
 * - C19_LATE: 1850-1899
 * - C20_EARLY: 1900-1949
 * - C20_LATE: 1950-1999
 * - C21: 2000-present
 *
 * Each layer can be toggled on/off, and records can be filtered by source type:
 * - SOURCE_BACKED: records with source references
 * - COMMUNITY: user-submitted records without external sources
 * - ALL: everything
 */
public class HistoricalLayers {

    public enum Era {
        PRE_1800("Pre-1800", 0, 1799, "🏛️"),
        C19_EARLY("1800–1849", 1800, 1849, "⛪"),
        C19_LATE("1850–1899", 1850, 1899, "⚰️"),
        C20_EARLY("1900–1949", 1900, 1949, "🪦"),
        C20_LATE("1950–1999", 1950, 1999, "🌾"),
        C21("2000–Present", 2000, 9999, "📅");

        public final String label;
        public final int startYear;
        public final int endYear;
        public final String icon;

        Era(String label, int startYear, int endYear, String icon) {
            this.label = label;
            this.startYear = startYear;
            this.endYear = endYear;
            this.icon = icon;
        }
    }

    public enum SourceFilter {
        ALL("All Sources", "📜"),
        SOURCE_BACKED("Source-Backed", "📖"),
        COMMUNITY("Community-Submitted", "✍️");

        public final String label;
        public final String icon;

        SourceFilter(String label, String icon) {
            this.label = label;
            this.icon = icon;
        }
    }

    public static class Layer {
        public Era era;
        public SourceFilter sourceFilter;
        public boolean visible;
        public List<GraveRecord> records;

        public Layer(Era era, SourceFilter sourceFilter) {
            this.era = era;
            this.sourceFilter = sourceFilter;
            this.visible = true;
            this.records = new ArrayList<>();
        }

        public int getRecordCount() {
            return records.size();
        }

        public String getDisplayName() {
            return era.icon + " " + era.label + " (" + sourceFilter.label + ")";
        }
    }

    private List<Layer> layers = new ArrayList<>();
    private boolean initialized = false;

    /**
     * Initialize all era × source filter combinations as layers.
     */
    public HistoricalLayers() {
        for (Era era : Era.values()) {
            for (SourceFilter sf : SourceFilter.values()) {
                layers.add(new Layer(era, sf));
            }
        }
        initialized = true;
    }

    /**
     * Build layers from a list of grave records.
     */
    public void buildFromRecords(List<GraveRecord> records) {
        // Clear existing
        for (Layer l : layers) l.records.clear();

        for (GraveRecord r : records) {
            int year = extractYear(r);
            boolean hasSources = r.sourceRefs != null && !r.sourceRefs.isEmpty();

            // Determine era
            Era era = getEraForYear(year);
            if (era == null) continue;

            // Add to ALL layer
            getLayer(era, SourceFilter.ALL).records.add(r);

            // Add to source-specific layer
            if (hasSources) {
                getLayer(era, SourceFilter.SOURCE_BACKED).records.add(r);
            } else {
                getLayer(era, SourceFilter.COMMUNITY).records.add(r);
            }
        }
    }

    /**
     * Get the era for a given year.
     */
    public static Era getEraForYear(int year) {
        if (year <= 0) return null;
        for (Era era : Era.values()) {
            if (year >= era.startYear && year <= era.endYear) return era;
        }
        return null;
    }

    /**
     * Get a specific layer by era and source filter.
     */
    public Layer getLayer(Era era, SourceFilter sf) {
        for (Layer l : layers) {
            if (l.era == era && l.sourceFilter == sf) return l;
        }
        return null;
    }

    /**
     * Get all layers.
     */
    public List<Layer> getLayers() {
        return layers;
    }

    /**
     * Get only visible layers.
     */
    public List<Layer> getVisibleLayers() {
        List<Layer> visible = new ArrayList<>();
        for (Layer l : layers) {
            if (l.visible && l.getRecordCount() > 0) visible.add(l);
        }
        return visible;
    }

    /**
     * Toggle a layer's visibility.
     */
    public void toggleLayer(Era era, SourceFilter sf) {
        Layer l = getLayer(era, sf);
        if (l != null) l.visible = !l.visible;
    }

    /**
     * Set visibility for an entire era (all source filters).
     */
    public void setEraVisible(Era era, boolean visible) {
        for (Layer l : layers) {
            if (l.era == era) l.visible = visible;
        }
    }

    /**
     * Set visibility for a source filter across all eras.
     */
    public void setSourceFilterVisible(SourceFilter sf, boolean visible) {
        for (Layer l : layers) {
            if (l.sourceFilter == sf) l.visible = visible;
        }
    }

    /**
     * Get all records from visible layers (deduplicated).
     */
    public List<GraveRecord> getVisibleRecords() {
        List<GraveRecord> result = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();

        for (Layer l : layers) {
            if (!l.visible) continue;
            for (GraveRecord r : l.records) {
                if (r.id != null && !seen.contains(r.id)) {
                    seen.add(r.id);
                    result.add(r);
                }
            }
        }
        return result;
    }

    /**
     * Get the total count of records across all layers (deduplicated).
     */
    public int getTotalRecordCount() {
        java.util.Set<String> ids = new java.util.HashSet<>();
        for (Layer l : layers) {
            for (GraveRecord r : l.records) {
                if (r.id != null) ids.add(r.id);
            }
        }
        return ids.size();
    }

    /**
     * Get a summary of all eras with counts.
     */
    public String getSummary() {
        StringBuilder sb = new StringBuilder();
        sb.append("Historical Layers Summary:\n\n");

        for (Era era : Era.values()) {
            Layer allLayer = getLayer(era, SourceFilter.ALL);
            int count = allLayer.getRecordCount();
            if (count > 0) {
                int sourced = getLayer(era, SourceFilter.SOURCE_BACKED).getRecordCount();
                int community = getLayer(era, SourceFilter.COMMUNITY).getRecordCount();
                sb.append(era.icon).append(" ").append(era.label)
                        .append(": ").append(count).append(" records")
                        .append(" (").append(sourced).append(" sourced, ")
                        .append(community).append(" community)\n");
            }
        }

        if (sb.toString().trim().equals("Historical Layers Summary:")) {
            return "No records available for layering.";
        }

        return sb.toString().trim();
    }

    /**
     * Extract year from a grave record (death date preferred).
     */
    private static int extractYear(GraveRecord r) {
        String date = r.deathDate != null ? r.deathDate : r.birthDate;
        if (date == null || date.isEmpty()) return -1;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\d{4}").matcher(date);
        if (m.find()) return Integer.parseInt(m.group());
        return -1;
    }

    /**
     * Check if layers have been initialized and populated.
     */
    public boolean isInitialized() {
        return initialized;
    }
}
