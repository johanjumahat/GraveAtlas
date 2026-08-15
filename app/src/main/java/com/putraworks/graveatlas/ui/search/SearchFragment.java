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
import com.putraworks.graveatlas.ui.evidence.EvidenceStatus;
import com.putraworks.graveatlas.ui.gravedetail.GraveDetailFragment;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Search screen — search graves by name or cemetery.
 * Uses debouncing (400ms) to avoid excessive API calls.
 * Falls back to local cache when offline.
 *
 * Phase 16.2: Now shows evidence badges on search result cards.
 * Includes "Why am I seeing this?" transparency feature.
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

    /**
     * Display search results as cards with evidence badges.
     * Phase 16.2: Each card now includes an evidence badge and "Why?" transparency link.
     */
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
            // Card container
            LinearLayout card = new LinearLayout(getContext());
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(24, 24, 24, 24);
            card.setContentDescription("Grave record: " + (g.name != null ? g.name : "Unknown"));

            LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            cardLp.setMargins(0, 0, 0, 12);
            card.setLayoutParams(cardLp);

            // Top row: name + evidence badge
            LinearLayout topRow = new LinearLayout(getContext());
            topRow.setOrientation(LinearLayout.HORIZONTAL);
            topRow.setGravity(android.view.Gravity.CENTER_VERTICAL);

            TextView nameView = new TextView(getContext());
            nameView.setText(g.name != null ? g.name : "Unknown");
            nameView.setTextSize(15);
            nameView.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            LinearLayout.LayoutParams nameLp = new LinearLayout.LayoutParams(
                    0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
            topRow.addView(nameView, nameLp);

            // Evidence badge
            EvidenceStatus.Category category = EvidenceStatus.fromVerificationStatus(g.verificationStatus);
            TextView badge = EvidenceStatus.createBadge(getContext(), category);
            topRow.addView(badge);

            card.addView(topRow);

            // Dates
            if (g.birthDate != null || g.deathDate != null) {
                TextView dates = new TextView(getContext());
                StringBuilder sb = new StringBuilder();
                if (g.birthDate != null) sb.append(g.birthDate);
                if (g.birthDate != null && g.deathDate != null) sb.append(" — ");
                if (g.deathDate != null) sb.append(g.deathDate);
                dates.setText(sb.toString());
                dates.setTextSize(13);
                dates.setPadding(0, 4, 0, 0);
                card.addView(dates);
            }

            // Cemetery
            if (g.cemetery != null) {
                TextView cemeteryView = new TextView(getContext());
                cemeteryView.setText("📍 " + g.cemetery);
                cemeteryView.setTextSize(13);
                cemeteryView.setPadding(0, 4, 0, 0);
                card.addView(cemeteryView);
            }

            // "Why am I seeing this?" transparency link
            TextView whyLink = new TextView(getContext());
            whyLink.setText("Why am I seeing this?");
            whyLink.setTextSize(11);
            whyLink.setPadding(0, 8, 0, 0);
            whyLink.setOnClickListener(v -> showEvidenceExplanation(g, category));
            card.addView(whyLink);

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

    /**
     * Show a dialog explaining why this record appears and what its evidence status means.
     * Phase 16.2 transparency feature.
     */
    private void showEvidenceExplanation(GraveRecord g, EvidenceStatus.Category category) {
        StringBuilder explanation = new StringBuilder();
        explanation.append("Evidence Status: ").append(category.getLabel()).append("\n\n");
        explanation.append(category.getDescription()).append("\n\n");

        if (g.verificationStatus != null && !g.verificationStatus.isEmpty()) {
            explanation.append("Backend status: ").append(g.verificationStatus).append("\n");
        } else {
            explanation.append("Backend status: not set (defaults to unverified)\n");
        }

        if (g.source != null && !g.source.isEmpty()) {
            explanation.append("Source: ").append(g.source).append("\n");
        } else if (g.sourceRefs != null && !g.sourceRefs.isEmpty()) {
            explanation.append("Sources: ").append(g.sourceRefs.size()).append(" reference(s)\n");
        } else {
            explanation.append("Source: none cited\n");
        }

        explanation.append("\nThis record appears because it matches your search query. ");
        if (g.name != null) {
            explanation.append("The name \"").append(g.name).append("\" matched. ");
        }
        if (g.cemetery != null) {
            explanation.append("Cemetery: ").append(g.cemetery).append(". ");
        }
        explanation.append("\n\nThe evidence badge indicates how well-documented this record is. ");
        explanation.append("You can help improve it by submitting corrections or additional sources.");

        new androidx.appcompat.app.AlertDialog.Builder(getContext())
                .setTitle("Why am I seeing this?")
                .setMessage(explanation.toString())
                .setPositiveButton("OK", null)
                .setNeutralButton("Report Issue", (d, w) -> {
                    // Could link to correction submission
                    if (g.id != null && getActivity() instanceof MainNavActivity) {
                        GraveDetailFragment fragment = GraveDetailFragment.newInstance(g.id);
                        ((MainNavActivity) getActivity()).loadFragment(fragment);
                    }
                })
                .show();
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
