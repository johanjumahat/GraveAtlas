package com.putraworks.graveatlas.ui.search;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
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

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Search screen — search graves by name or cemetery.
 * Uses debouncing (400ms) to avoid excessive API calls.
 * Falls back to local cache when offline.
 */
public class SearchFragment extends Fragment implements ApiClient.ApiCallback<List<GraveRecord>> {

    private static final int DEBOUNCE_MS = 400;

    private EditText searchInput;
    private LinearLayout resultsContainer;
    private ProgressBar progressBar;
    private TextView statusText;
    private Button retryBtn;
    private ApiClient apiClient;
    private LocalCache cache;
    private List<GraveRecord> allGraves = new ArrayList<>();
    private Handler debounceHandler = new Handler(Looper.getMainLooper());
    private Runnable debounceRunnable;
    private boolean isLoading = false;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        apiClient = new ApiClient();
        cache = new LocalCache(getContext());

        // Title
        TextView title = new TextView(getContext());
        title.setText("Search Graves");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 16);
        layout.addView(title);

        // Search bar
        searchInput = new EditText(getContext());
        searchInput.setHint("Search by name or cemetery...");
        searchInput.setPadding(24, 24, 24, 24);
        searchInput.setContentDescription("Search input field");
        searchInput.setSingleLine(true);
        layout.addView(searchInput);

        // Status
        statusText = new TextView(getContext());
        statusText.setPadding(0, 16, 0, 16);
        statusText.setTextSize(13);
        statusText.setContentDescription("Search status");
        layout.addView(statusText);

        // Progress
        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        progressBar.setContentDescription("Loading");
        layout.addView(progressBar);

        // Retry button
        retryBtn = new Button(getContext());
        retryBtn.setText("Retry");
        retryBtn.setAllCaps(false);
        retryBtn.setVisibility(View.GONE);
        retryBtn.setOnClickListener(v -> loadGraves());
        layout.addView(retryBtn);

        // Results container
        resultsContainer = new LinearLayout(getContext());
        resultsContainer.setOrientation(LinearLayout.VERTICAL);
        layout.addView(resultsContainer);

        // Load from cache first, then fetch from API
        List<GraveRecord> cached = cache.getCachedGraves();
        if (!cached.isEmpty()) {
            allGraves = cached;
            statusText.setText(cached.size() + " graves (cached)");
            displayResults(cached);
        }

        // Fetch fresh data
        loadGraves();

        // Search filter with debounce
        searchInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (debounceRunnable != null) {
                    debounceHandler.removeCallbacks(debounceRunnable);
                }
                debounceRunnable = () -> filterResults(s.toString());
                debounceHandler.postDelayed(debounceRunnable, DEBOUNCE_MS);
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });

        return layout;
    }

    private void loadGraves() {
        if (isLoading) return;
        isLoading = true;
        progressBar.setVisibility(View.VISIBLE);
        statusText.setText("Loading graves...");
        retryBtn.setVisibility(View.GONE);
        resultsContainer.removeAllViews();
        apiClient.getGraves(this);
    }

    private void filterResults(String query) {
        resultsContainer.removeAllViews();
        if (query.isEmpty()) {
            displayResults(allGraves);
            statusText.setText(allGraves.size() + " graves found");
            return;
        }
        String q = query.toLowerCase();
        List<GraveRecord> filtered = new ArrayList<>();
        for (GraveRecord g : allGraves) {
            if (g.name != null && g.name.toLowerCase().contains(q)) {
                filtered.add(g);
            } else if (g.cemetery != null && g.cemetery.toLowerCase().contains(q)) {
                filtered.add(g);
            }
        }
        statusText.setText(filtered.size() + " results for \"" + query + "\"");
        displayResults(filtered);
    }

    private void displayResults(List<GraveRecord> graves) {
        if (graves.isEmpty()) {
            TextView empty = new TextView(getContext());
            empty.setText(allGraves.isEmpty() ? "No graves available yet." : "No graves found");
            empty.setPadding(0, 24, 0, 24);
            empty.setTextSize(14);
            resultsContainer.addView(empty);
            return;
        }
        for (GraveRecord g : graves) {
            TextView card = new TextView(getContext());
            StringBuilder sb = new StringBuilder();
            sb.append(g.name != null ? g.name : "Unknown");
            if (g.birthDate != null || g.deathDate != null) {
                sb.append("\n");
                if (g.birthDate != null) sb.append(g.birthDate);
                if (g.birthDate != null && g.deathDate != null) sb.append(" — ");
                if (g.deathDate != null) sb.append(g.deathDate);
            }
            if (g.cemetery != null) sb.append("\n📍 ").append(g.cemetery);
            card.setText(sb.toString());
            card.setPadding(24, 24, 24, 24);
            card.setTextSize(14);
            card.setContentDescription("Grave record: " + (g.name != null ? g.name : "Unknown"));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 12);
            card.setLayoutParams(lp);

            if (g.id != null) {
                card.setOnClickListener(v -> {
                    GraveDetailFragment fragment = GraveDetailFragment.newInstance(g.id);
                    if (getActivity() instanceof MainNavActivity) {
                        ((MainNavActivity) getActivity()).loadFragment(fragment);
                    }
                });
            }

            resultsContainer.addView(card);
        }
    }

    @Override
    public void onSuccess(List<GraveRecord> result) {
        allGraves = result;
        cache.cacheGraves(result);
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                isLoading = false;
                progressBar.setVisibility(View.GONE);
                statusText.setText(result.size() + " graves found");
                String currentQuery = searchInput.getText().toString();
                if (currentQuery.isEmpty()) {
                    displayResults(result);
                } else {
                    filterResults(currentQuery);
                }
            });
        }
    }

    @Override
    public void onError(String error) {
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                isLoading = false;
                progressBar.setVisibility(View.GONE);
                boolean isOffline = ApiErrorHandler.isOfflineError(error);
                if (!allGraves.isEmpty()) {
                    statusText.setText("Showing cached data (" + allGraves.size() + " graves)");
                    displayResults(allGraves);
                } else {
                    statusText.setText(error);
                    retryBtn.setVisibility(View.VISIBLE);
                }
            });
        }
    }
}
