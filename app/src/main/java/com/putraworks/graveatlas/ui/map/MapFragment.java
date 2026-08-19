package com.putraworks.graveatlas.ui.map;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.MainNavActivity;
import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.api.ApiErrorHandler;
import com.putraworks.graveatlas.data.api.LocalCache;
import com.putraworks.graveatlas.data.model.GraveRecord;
import com.putraworks.graveatlas.ui.gravedetail.GraveDetailFragment;

import java.util.ArrayList;
import java.util.List;

/**
 * Map screen — displays grave locations with grid-based clustering.
 *
 * Features:
 * - Grid-based clustering: nearby records grouped into clusters
 * - Cluster cards show count + representative name
 * - Tapping a cluster opens the device map app at the cluster center
 *   (a cluster covers multiple records, so there's no single detail page to open)
 * - Tapping a single record opens the in-app Grave Detail screen (Section/Plot,
 *   dates, notes, sources, etc.) — from there, "View on Map" opens the device
 *   map app if the user wants external navigation
 * - Single-record cards show Section/Plot ("block"/"lot") when available
 * - No paid map SDK — uses geo: intents
 * - Falls back to cached data when offline
 * - Empty/error/offline states handled gracefully
 */
public class MapFragment extends Fragment implements ApiClient.ApiCallback<List<GraveRecord>> {

    private static final double CLUSTER_GRID_SIZE_KM = 1.0; // ~1km grid cells

    private LinearLayout contentLayout;
    private ProgressBar progressBar;
    private TextView statusText;
    private Button retryBtn;
    private ApiClient apiClient;
    private LocalCache cache;
    private List<GraveRecord> graves = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        apiClient = new ApiClient();
        cache = new LocalCache(getContext());

        TextView title = new TextView(getContext());
        title.setText("Map");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView subtitle = new TextView(getContext());
        subtitle.setText("Locations with coordinates. Tap a location to view details, tap a cluster to open it in your maps app.");
        subtitle.setTextSize(12);
        subtitle.setTextColor(0xFF5F6368);
        subtitle.setPadding(0, 0, 0, 16);
        layout.addView(subtitle);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        progressBar.setContentDescription("Loading");
        layout.addView(progressBar);

        statusText = new TextView(getContext());
        statusText.setPadding(0, 16, 0, 16);
        statusText.setTextSize(13);
        layout.addView(statusText);

        retryBtn = new Button(getContext());
        retryBtn.setText("Retry");
        retryBtn.setAllCaps(false);
        retryBtn.setVisibility(View.GONE);
        retryBtn.setOnClickListener(v -> loadData());
        layout.addView(retryBtn);

        contentLayout = new LinearLayout(getContext());
        contentLayout.setOrientation(LinearLayout.VERTICAL);
        layout.addView(contentLayout);

        // Load cached first
        List<GraveRecord> cached = cache.getCachedGraves();
        if (!cached.isEmpty()) {
            List<GraveRecord> withCoords = new ArrayList<>();
            for (GraveRecord g : cached) {
                if (g.hasCoordinates()) withCoords.add(g);
            }
            if (!withCoords.isEmpty()) {
                graves = withCoords;
                statusText.setText(withCoords.size() + " locations (cached)");
                displayClusters(withCoords);
            }
        }

        loadData();
        return layout;
    }

    private void loadData() {
        progressBar.setVisibility(View.VISIBLE);
        statusText.setText("Loading locations...");
        retryBtn.setVisibility(View.GONE);
        contentLayout.removeAllViews();
        apiClient.getGraves(this);
    }

    // ── Grid-based clustering ──

    /**
     * Groups nearby records into clusters by ~1km grid cells.
     * Records in the same grid cell are grouped; single records show individually.
     */
    private List<Cluster> buildClusters(List<GraveRecord> records) {
        java.util.Map<String, Cluster> clusterMap = new java.util.HashMap<>();

        for (GraveRecord g : records) {
            if (!g.hasCoordinates()) continue;

            String cellKey = gridCellKey(g.latitude, g.longitude, CLUSTER_GRID_SIZE_KM);
            Cluster cluster = clusterMap.get(cellKey);
            if (cluster == null) {
                cluster = new Cluster();
                cluster.cellKey = cellKey;
                cluster.centerLat = g.latitude;
                cluster.centerLon = g.longitude;
                clusterMap.put(cellKey, cluster);
            }
            cluster.records.add(g);
            // Update center as average of all records in the cluster
            cluster.centerLat = (cluster.centerLat * (cluster.records.size() - 1) + g.latitude) / cluster.records.size();
            cluster.centerLon = (cluster.centerLon * (cluster.records.size() - 1) + g.longitude) / cluster.records.size();
        }

        List<Cluster> clusters = new ArrayList<>(clusterMap.values());
        // Sort by cluster size descending — larger clusters first
        clusters.sort((a, b) -> Integer.compare(b.records.size(), a.records.size()));
        return clusters;
    }

    /**
     * Maps a lat/lon to a grid cell key based on the given cell size in km.
     * Uses approximate degree-to-km conversion (1° lat ≈ 111km).
     */
    private String gridCellKey(double lat, double lon, double cellSizeKm) {
        double latStep = cellSizeKm / 111.0;
        double lonStep = cellSizeKm / (111.0 * Math.cos(Math.toRadians(lat)));
        int gridLat = (int) Math.floor(lat / latStep);
        int gridLon = (int) Math.floor(lon / lonStep);
        return gridLat + ":" + gridLon;
    }

    private void displayClusters(List<GraveRecord> records) {
        List<Cluster> clusters = buildClusters(records);

        if (clusters.isEmpty()) {
            displayEmptyState();
            return;
        }

        int singleCount = 0;
        int clusterCount = 0;

        for (Cluster cluster : clusters) {
            if (cluster.records.size() > 1) {
                clusterCount++;
                displayClusterCard(cluster);
            } else {
                singleCount++;
                displaySingleCard(cluster.records.get(0));
            }
        }

        statusText.setText(records.size() + " locations — " + clusterCount + " clusters, " + singleCount + " individual");
    }

    private void displayClusterCard(Cluster cluster) {
        LinearLayout card = new LinearLayout(getContext());
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(24, 24, 24, 24);

        TextView badge = new TextView(getContext());
        badge.setText(String.valueOf(cluster.records.size()));
        badge.setTextSize(18);
        badge.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        badge.setTextColor(0xFF1A73E8);
        card.addView(badge);

        TextView label = new TextView(getContext());
        // Use the first record's name as representative
        GraveRecord rep = cluster.records.get(0);
        String repName = rep.name != null ? rep.name : "Unknown";
        if (cluster.records.size() > 1) {
            label.setText(repName + " and " + (cluster.records.size() - 1) + " more nearby");
        } else {
            label.setText(repName);
        }
        label.setTextSize(14);
        label.setPadding(0, 4, 0, 0);
        card.addView(label);

        TextView coords = new TextView(getContext());
        coords.setText(String.format("📍 %.4f, %.4f", cluster.centerLat, cluster.centerLon));
        coords.setTextSize(12);
        coords.setTextColor(0xFF5F6368);
        coords.setPadding(0, 4, 0, 0);
        card.addView(coords);

        card.setContentDescription("Cluster of " + cluster.records.size() + " locations near " + repName);

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, 12);
        card.setLayoutParams(lp);

        card.setOnClickListener(v -> {
            // Open map at cluster center with a closer zoom
            String geoUri = String.format("geo:%f,%f?z=15&q=%f,%f(%d locations)",
                    cluster.centerLat, cluster.centerLon,
                    cluster.centerLat, cluster.centerLon,
                    cluster.records.size());
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(geoUri));
            startActivity(intent);
        });

        contentLayout.addView(card);
    }

    private void displaySingleCard(GraveRecord g) {
        TextView card = new TextView(getContext());
        StringBuilder sb = new StringBuilder();
        sb.append(g.name != null ? g.name : "Unknown");
        if (g.cemetery != null) sb.append("\n").append(g.cemetery);
        // Section/Plot ("block"/"lot") — shown when the record has them (Part 119 follow-up)
        if (g.section != null && !g.section.isEmpty()) sb.append("\n").append(g.section);
        if (g.plot != null && !g.plot.isEmpty()) sb.append(" · Plot ").append(g.plot);
        sb.append(String.format("\n📍 %.4f, %.4f", g.latitude, g.longitude));
        card.setText(sb.toString());
        card.setPadding(24, 24, 24, 24);
        card.setTextSize(14);
        card.setContentDescription("Location: " + (g.name != null ? g.name : "Unknown"));

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, 12);
        card.setLayoutParams(lp);

        // Open in-app detail screen (Section/Plot, dates, notes, sources, and a
        // "View on Map" button for external navigation if still wanted).
        card.setOnClickListener(v -> {
            if (g.id != null && getActivity() instanceof MainNavActivity) {
                ((MainNavActivity) getActivity()).loadFragment(GraveDetailFragment.newInstance(g.id));
            } else {
                // Fallback: no id to look up a detail page for — open external maps instead
                String geoUri = String.format("geo:%f,%f?q=%f,%f(%s)",
                        g.latitude, g.longitude,
                        g.latitude, g.longitude,
                        g.name != null ? g.name : "Grave Location");
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(geoUri));
                startActivity(intent);
            }
        });
        contentLayout.addView(card);
    }

    private void displayEmptyState() {
        TextView empty = new TextView(getContext());
        empty.setText("No locations with coordinates available.\n\nContributed records may not have coordinates yet.");
        empty.setPadding(0, 24, 0, 24);
        empty.setTextSize(13);
        contentLayout.addView(empty);
    }

    // ── Cluster helper class ──

    private static class Cluster {
        String cellKey;
        double centerLat;
        double centerLon;
        List<GraveRecord> records = new ArrayList<>();
    }

    // ── API callbacks ──

    @Override
    public void onSuccess(List<GraveRecord> result) {
        List<GraveRecord> withCoords = new ArrayList<>();
        for (GraveRecord g : result) {
            if (g.hasCoordinates()) withCoords.add(g);
        }
        graves = withCoords;
        cache.cacheGraves(result);
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                progressBar.setVisibility(View.GONE);
                if (withCoords.isEmpty()) {
                    statusText.setText("No locations with coordinates");
                    displayEmptyState();
                } else {
                    displayClusters(withCoords);
                }
            });
        }
    }

    @Override
    public void onError(String error) {
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                progressBar.setVisibility(View.GONE);
                if (!graves.isEmpty()) {
                    statusText.setText("⚠ Showing cached data (" + graves.size() + " locations)");
                    displayClusters(graves);
                } else {
                    statusText.setText("Unable to load locations.\n" + error);
                    retryBtn.setVisibility(View.VISIBLE);
                }
            });
        }
    }
}
