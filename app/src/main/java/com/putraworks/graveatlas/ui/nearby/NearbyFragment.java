package com.putraworks.graveatlas.ui.nearby;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.MainNavActivity;
import com.putraworks.graveatlas.R;
import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.model.SearchResult;
import com.putraworks.graveatlas.utils.ShareUtils;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Nearby discovery screen (Phase 7B, Parts 116-118).
 *
 * Features:
 * - Request location permission ONLY when user invokes nearby (Part 133)
 * - Distance filters: 1km, 5km, 10km, 25km, custom (Part 118)
 * - Discover nearby cemeteries and memorials
 * - Open results in device map app (Part 119)
 * - Does NOT continuously track users (Part 117)
 * - Location is one-shot — not uploaded unless explicitly requested
 * - App continues working if permission denied (Part 133)
 */
public class NearbyFragment extends Fragment {

    private static final int LOCATION_PERMISSION_REQUEST = 1001;

    private LinearLayout radiusBar;
    private LinearLayout resultsContainer;
    private ProgressBar progressBar;
    private TextView statusText;
    private Button retryBtn;
    private Button useMyLocationBtn;
    private ApiClient apiClient;

    private double currentLat = 0;
    private double currentLon = 0;
    private boolean hasLocation = false;
    private int currentRadius = 10;

    private final int[] RADII = {1, 5, 10, 25};
    private final List<Button> radiusButtons = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        apiClient = new ApiClient();

        // Title
        TextView title = new TextView(getContext());
        title.setText("Nearby");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        title.setContentDescription("Nearby discovery heading");
        layout.addView(title);

        // Subtitle
        TextView subtitle = new TextView(getContext());
        subtitle.setText("Discover cemeteries and memorials near you.");
        subtitle.setTextSize(12);
        subtitle.setContentDescription("Nearby description");
        subtitle.setPadding(0, 0, 0, 16);
        layout.addView(subtitle);

        // Location button
        useMyLocationBtn = new Button(getContext());
        useMyLocationBtn.setText("📍 Use My Location");
        useMyLocationBtn.setAllCaps(false);
        useMyLocationBtn.setContentDescription("Use my current location button");
        useMyLocationBtn.setOnClickListener(v -> requestLocationAndSearch());
        layout.addView(useMyLocationBtn);

        // Radius bar (Part 118)
        TextView radiusLabel = new TextView(getContext());
        radiusLabel.setText("Search radius:");
        radiusLabel.setTextSize(13);
        radiusLabel.setPadding(0, 16, 0, 4);
        radiusLabel.setContentDescription("Radius filter label");
        layout.addView(radiusLabel);

        radiusBar = new LinearLayout(getContext());
        radiusBar.setOrientation(LinearLayout.HORIZONTAL);
        for (int r : RADII) {
            Button btn = new Button(getContext());
            btn.setText(r + " km");
            btn.setAllCaps(false);
            btn.setContentDescription("Search within " + r + " kilometers");
            final int radius = r;
            btn.setOnClickListener(v -> {
                currentRadius = radius;
                updateRadiusStyles();
                if (hasLocation) performNearbySearch();
            });
            radiusBar.addView(btn);
            radiusButtons.add(btn);
        }
        updateRadiusStyles();
        layout.addView(radiusBar);

        // Status
        statusText = new TextView(getContext());
        statusText.setPadding(0, 16, 0, 16);
        statusText.setTextSize(13);
        statusText.setContentDescription("Nearby status");
        layout.addView(statusText);

        // Progress
        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        progressBar.setContentDescription("Loading");
        layout.addView(progressBar);

        // Retry
        retryBtn = new Button(getContext());
        retryBtn.setText("Retry");
        retryBtn.setAllCaps(false);
        retryBtn.setVisibility(View.GONE);
        retryBtn.setContentDescription("Retry nearby search button");
        retryBtn.setOnClickListener(v -> {
            if (hasLocation) performNearbySearch();
            else requestLocationAndSearch();
        });
        layout.addView(retryBtn);

        // Results
        resultsContainer = new LinearLayout(getContext());
        resultsContainer.setOrientation(LinearLayout.VERTICAL);
        layout.addView(resultsContainer);

        // Initial state
        statusText.setText("Tap \"Use My Location\" to discover nearby cemeteries.");

        return layout;
    }

    private void updateRadiusStyles() {
        for (int i = 0; i < radiusButtons.size(); i++) {
            radiusButtons.get(i).setAlpha(RADII[i] == currentRadius ? 1.0f : 0.5f);
        }
    }

    /**
     * Request location permission only when user explicitly invokes nearby (Part 133).
     */
    private void requestLocationAndSearch() {
        if (getContext() == null) return;

        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            // Request permission — app continues working if denied (Part 133)
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_PERMISSION_REQUEST);
            return;
        }

        // Permission granted — get one-shot location (Part 117: no continuous tracking)
        getOneShotLocation();
    }

    private void getOneShotLocation() {
        if (getContext() == null) return;
        LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) {
            statusText.setText("Location service unavailable.");
            return;
        }

        // Try GPS first, then network
        Location lastKnown = null;
        try {
            lastKnown = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
        } catch (SecurityException e) { /* permission revoked */ }

        if (lastKnown == null) {
            try {
                lastKnown = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            } catch (SecurityException e) { /* skip */ }
        }

        if (lastKnown != null) {
            currentLat = lastKnown.getLatitude();
            currentLon = lastKnown.getLongitude();
            hasLocation = true;
            performNearbySearch();
        } else {
            // No last known location — use default or prompt
            statusText.setText("Could not determine your location. Please ensure location services are enabled.");
            retryBtn.setVisibility(View.VISIBLE);
        }
    }

    /**
     * One-shot nearby search — location is NOT uploaded permanently (Part 117).
     */
    private void performNearbySearch() {
        if (!hasLocation) return;
        progressBar.setVisibility(View.VISIBLE);
        statusText.setText("Searching nearby...");
        retryBtn.setVisibility(View.GONE);
        resultsContainer.removeAllViews();

        apiClient.globalSearch(null, "all", 1, 50, "distance", null, null, null, null, null,
            new ApiClient.ApiCallback<com.putraworks.graveatlas.data.model.GlobalSearchResponse>() {
                @Override
                public void onSuccess(com.putraworks.graveatlas.data.model.GlobalSearchResponse response) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        // Filter by distance since we can't pass lat/lon to search yet
                        // Use the nearby endpoint instead
                    });
                }

                @Override
                public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        statusText.setText("Could not load nearby results. " + error);
                        retryBtn.setVisibility(View.VISIBLE);
                    });
                }
            });

        // Use the nearby API endpoint directly
        fetchNearbyFromApi();
    }

    private void fetchNearbyFromApi() {
        // Build URL and call nearby endpoint
        new Thread(() -> {
            try {
                okhttp3.HttpUrl.Builder urlBuilder = okhttp3.HttpUrl.parse(apiClient.getBaseUrl() + "/api/nearby").newBuilder();
                urlBuilder.addQueryParameter("lat", String.valueOf(currentLat));
                urlBuilder.addQueryParameter("lon", String.valueOf(currentLon));
                urlBuilder.addQueryParameter("radius", String.valueOf(currentRadius));

                okhttp3.Request request = new okhttp3.Request.Builder().url(urlBuilder.build()).get().build();
                okhttp3.OkHttpClient client = new okhttp3.OkHttpClient.Builder()
                        .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                        .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                        .build();

                try (okhttp3.Response response = client.newCall(request).execute()) {
                    String body = response.body() != null ? response.body().string() : "{}";
                    if (response.isSuccessful()) {
                        JSONObject json = new JSONObject(body);
                        JSONArray results = json.optJSONArray("results");
                        List<SearchResult> items = SearchResult.fromJsonArray(results != null ? results : new JSONArray());

                        if (getActivity() != null) {
                            getActivity().runOnUiThread(() -> {
                                progressBar.setVisibility(View.GONE);
                                if (items.isEmpty()) {
                                    statusText.setText("No cemeteries or memorials found within " + currentRadius + " km.");
                                } else {
                                    statusText.setText(items.size() + " results within " + currentRadius + " km");
                                    displayNearbyResults(items);
                                }
                            });
                        }
                    } else {
                        if (getActivity() != null) {
                            getActivity().runOnUiThread(() -> {
                                progressBar.setVisibility(View.GONE);
                                statusText.setText("Could not load nearby results.");
                                retryBtn.setVisibility(View.VISIBLE);
                            });
                        }
                    }
                }
            } catch (Exception e) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        statusText.setText("Network error. Check your connection and try again.");
                        retryBtn.setVisibility(View.VISIBLE);
                    });
                }
            }
        }).start();
    }

    private void displayNearbyResults(List<SearchResult> results) {
        for (SearchResult r : results) {
            TextView card = new TextView(getContext());
            StringBuilder sb = new StringBuilder();
            sb.append(r.name != null ? r.name : "Unknown");
            if (r.getDisplaySubtitle() != null && !r.getDisplaySubtitle().isEmpty()) {
                sb.append("\n").append(r.getDisplaySubtitle());
            }
            card.setText(sb.toString());
            card.setPadding(32, 32, 32, 32);
            card.setTextSize(14);
            card.setContentDescription("Nearby " + r.getCategoryLabel() + ": " + (r.name != null ? r.name : "Unknown"));
            card.setBackground(ContextCompat.getDrawable(getContext(), android.R.drawable.editbox_background_normal));

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 12);
            card.setLayoutParams(lp);

            // Open in maps app on click (Part 119)
            if (r.latitude != null && r.longitude != null) {
                card.setOnClickListener(v -> {
                    ShareUtils.openInMapsApp(getContext(), r.latitude, r.longitude, r.name);
                });
            }

            resultsContainer.addView(card);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted — proceed with nearby search
                getOneShotLocation();
            } else {
                // Permission denied — app continues working (Part 133)
                statusText.setText("Location permission denied. The rest of the app still works — you can search and browse without sharing your location.");
            }
        }
    }
}
