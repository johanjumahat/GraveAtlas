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

import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.api.ApiErrorHandler;
import com.putraworks.graveatlas.data.api.LocalCache;
import com.putraworks.graveatlas.data.model.GraveRecord;

import java.util.List;

/**
 * Map screen — lists grave locations with coordinates and opens device maps app.
 * No paid map SDK — uses geo: intents to open the device's default map application.
 * Falls back to cached data when offline.
 */
public class MapFragment extends Fragment implements ApiClient.ApiCallback<List<GraveRecord>> {

    private LinearLayout contentLayout;
    private ProgressBar progressBar;
    private TextView statusText;
    private Button retryBtn;
    private ApiClient apiClient;
    private LocalCache cache;
    private List<GraveRecord> graves = new java.util.ArrayList<>();

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
        subtitle.setText("Locations with coordinates. Tap to open in your maps app.");
        subtitle.setTextSize(12);
        subtitle.setTextColor(0xFF5F6368);
        subtitle.setPadding(0, 0, 0, 16);
        layout.addView(subtitle);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
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
            List<GraveRecord> withCoords = new java.util.ArrayList<>();
            for (GraveRecord g : cached) {
                if (g.hasCoordinates()) withCoords.add(g);
            }
            if (!withCoords.isEmpty()) {
                graves = withCoords;
                statusText.setText(withCoords.size() + " locations (cached)");
                displayLocations(withCoords);
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

    private void displayLocations(List<GraveRecord> graves) {
        if (graves.isEmpty()) {
            TextView empty = new TextView(getContext());
            empty.setText("No locations with coordinates available.");
            empty.setPadding(0, 24, 0, 24);
            contentLayout.addView(empty);
            return;
        }

        for (GraveRecord g : graves) {
            if (!g.hasCoordinates()) continue;

            TextView card = new TextView(getContext());
            StringBuilder sb = new StringBuilder();
            sb.append(g.name != null ? g.name : "Unknown");
            if (g.cemetery != null) sb.append("\n").append(g.cemetery);
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

            card.setOnClickListener(v -> {
                String geoUri = String.format("geo:%f,%f?q=%f,%f(%s)",
                        g.latitude, g.longitude,
                        g.latitude, g.longitude,
                        g.name != null ? g.name : "Grave Location");
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(geoUri));
                startActivity(intent);
            });
            contentLayout.addView(card);
        }
    }

    @Override
    public void onSuccess(List<GraveRecord> result) {
        List<GraveRecord> withCoords = new java.util.ArrayList<>();
        for (GraveRecord g : result) {
            if (g.hasCoordinates()) withCoords.add(g);
        }
        graves = withCoords;
        cache.cacheGraves(result);
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                progressBar.setVisibility(View.GONE);
                statusText.setText(withCoords.size() + " locations");
                displayLocations(withCoords);
            });
        }
    }

    @Override
    public void onError(String error) {
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                progressBar.setVisibility(View.GONE);
                if (!graves.isEmpty()) {
                    statusText.setText("Showing cached data (" + graves.size() + " locations)");
                    displayLocations(graves);
                } else {
                    statusText.setText(error);
                    retryBtn.setVisibility(View.VISIBLE);
                }
            });
        }
    }
}
