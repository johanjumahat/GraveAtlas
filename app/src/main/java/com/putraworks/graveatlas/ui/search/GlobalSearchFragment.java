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
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.MainNavActivity;
import com.putraworks.graveatlas.R;
import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.api.ApiErrorHandler;
import com.putraworks.graveatlas.data.api.LocalCache;
import com.putraworks.graveatlas.data.model.GlobalSearchResponse;
import com.putraworks.graveatlas.data.model.SearchResult;
import com.putraworks.graveatlas.ui.cemetery.CemeteryFragment;
import com.putraworks.graveatlas.ui.gravedetail.GraveDetailFragment;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Phase 7A Advanced Search screen — server-side global search with:
 * - Category filtering (People, Cemeteries, Memorials, Locations)
 * - Advanced filters (country, birth/death year)
 * - Sorting (relevance, name, date, distance)
 * - Server-side pagination (load more)
 * - Empty states with helpful messages
 * - Local search history
 * - Accessibility labels on all controls
 *
 * Does NOT download the full dataset — all search is server-side.
 */
public class GlobalSearchFragment extends Fragment implements ApiClient.ApiCallback<GlobalSearchResponse> {

    private static final int DEBOUNCE_MS = 500;
    private static final int PAGE_SIZE = 20;
    private static final String PREFS_SEARCH_HISTORY = "graveatlas_search_history";
    private static final int MAX_HISTORY = 10;

    private EditText searchInput;
    private LinearLayout categoryBar;
    private LinearLayout resultsContainer;
    private LinearLayout filterPanel;
    private ProgressBar progressBar;
    private TextView statusText;
    private Button retryBtn;
    private Button loadMoreBtn;
    private Button clearFiltersBtn;
    private Button sortBtn;
    private Button filterToggleBtn;
    private EditText countryFilterInput;
    private EditText birthYearFilterInput;
    private EditText deathYearFilterInput;

    private ApiClient apiClient;
    private Handler debounceHandler = new Handler(Looper.getMainLooper());
    private Runnable debounceRunnable;

    private String currentQuery = "";
    private String currentCategory = "all";
    private String currentSort = "relevance";
    private int currentPage = 1;
    private boolean isLoading = false;
    private boolean hasMore = false;
    private boolean filtersVisible = false;

    private final List<SearchResult> allResults = new ArrayList<>();
    private final Set<String> loadedIds = new HashSet<>(); // dedup across pages

    // Category buttons
    private Button btnAll, btnPeople, btnCemeteries, btnMemorials, btnLocations;
    private final List<Button> categoryButtons = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        apiClient = new ApiClient();

        // Title
        TextView title = new TextView(getContext());
        title.setText("Search GraveAtlas");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 16);
        title.setContentDescription("Search heading");
        layout.addView(title);

        // Search bar
        searchInput = new EditText(getContext());
        searchInput.setHint("Search people, cemeteries, locations...");
        searchInput.setPadding(48, 32, 48, 32);
        searchInput.setContentDescription("Search input field");
        searchInput.setSingleLine(true);
        searchInput.setBackground(ContextCompat.getDrawable(getContext(), android.R.drawable.edit_text));
        layout.addView(searchInput);

        // Category bar (Part 83)
        categoryBar = new LinearLayout(getContext());
        categoryBar.setOrientation(LinearLayout.HORIZONTAL);
        categoryBar.setPadding(0, 16, 0, 8);

        btnAll = createCategoryButton("All", "all");
        btnPeople = createCategoryButton("People", "people");
        btnCemeteries = createCategoryButton("Cemeteries", "cemeteries");
        btnMemorials = createCategoryButton("Memorials", "memorials");
        btnLocations = createCategoryButton("Locations", "locations");

        HorizontalScrollView categoryScroll = new HorizontalScrollView(getContext());
        categoryScroll.setHorizontalScrollBarEnabled(false);
        categoryScroll.addView(categoryBar);
        layout.addView(categoryScroll);

        // Sort + Filter toggle row
        LinearLayout controlsRow = new LinearLayout(getContext());
        controlsRow.setOrientation(LinearLayout.HORIZONTAL);
        controlsRow.setPadding(0, 8, 0, 8);

        sortBtn = new Button(getContext());
        sortBtn.setText("Sort: Relevance");
        sortBtn.setAllCaps(false);
        sortBtn.setContentDescription("Change sort order");
        sortBtn.setOnClickListener(v -> cycleSort());
        controlsRow.addView(sortBtn);

        filterToggleBtn = new Button(getContext());
        filterToggleBtn.setText("Filters");
        filterToggleBtn.setAllCaps(false);
        filterToggleBtn.setContentDescription("Toggle advanced filters");
        filterToggleBtn.setOnClickListener(v -> toggleFilters());
        controlsRow.addView(filterToggleBtn);

        clearFiltersBtn = new Button(getContext());
        clearFiltersBtn.setText("Clear");
        clearFiltersBtn.setAllCaps(false);
        clearFiltersBtn.setVisibility(View.GONE);
        clearFiltersBtn.setContentDescription("Clear all filters");
        clearFiltersBtn.setOnClickListener(v -> clearFilters());
        controlsRow.addView(clearFiltersBtn);

        layout.addView(controlsRow);

        // Filter panel (Part 91) — hidden by default
        filterPanel = new LinearLayout(getContext());
        filterPanel.setOrientation(LinearLayout.VERTICAL);
        filterPanel.setVisibility(View.GONE);
        filterPanel.setPadding(16, 8, 16, 8);

        countryFilterInput = new EditText(getContext());
        countryFilterInput.setHint("Country (e.g. Singapore)");
        countryFilterInput.setSingleLine(true);
        countryFilterInput.setContentDescription("Filter by country");
        countryFilterInput.setBackground(ContextCompat.getDrawable(getContext(), android.R.drawable.edit_text));
        filterPanel.addView(countryFilterInput);

        LinearLayout yearRow = new LinearLayout(getContext());
        yearRow.setOrientation(LinearLayout.HORIZONTAL);

        birthYearFilterInput = new EditText(getContext());
        birthYearFilterInput.setHint("Birth year");
        birthYearFilterInput.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        birthYearFilterInput.setContentDescription("Filter by birth year");
        birthYearFilterInput.setBackground(ContextCompat.getDrawable(getContext(), android.R.drawable.edit_text));
        LinearLayout.LayoutParams birthParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
        birthParams.setMargins(0, 0, 8, 0);
        birthYearFilterInput.setLayoutParams(birthParams);
        yearRow.addView(birthYearFilterInput);

        deathYearFilterInput = new EditText(getContext());
        deathYearFilterInput.setHint("Death year");
        deathYearFilterInput.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        deathYearFilterInput.setContentDescription("Filter by death year");
        deathYearFilterInput.setBackground(ContextCompat.getDrawable(getContext(), android.R.drawable.edit_text));
        deathYearFilterInput.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        yearRow.addView(deathYearFilterInput);

        filterPanel.addView(yearRow);

        Button applyFiltersBtn = new Button(getContext());
        applyFiltersBtn.setText("Apply Filters");
        applyFiltersBtn.setAllCaps(false);
        applyFiltersBtn.setContentDescription("Apply filters button");
        applyFiltersBtn.setOnClickListener(v -> {
            toggleFilters(); // hide panel
            resetAndSearch();
        });
        filterPanel.addView(applyFiltersBtn);

        layout.addView(filterPanel);

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
        retryBtn.setContentDescription("Retry search button");
        retryBtn.setOnClickListener(v -> resetAndSearch());
        layout.addView(retryBtn);

        // Results container
        resultsContainer = new LinearLayout(getContext());
        resultsContainer.setOrientation(LinearLayout.VERTICAL);
        layout.addView(resultsContainer);

        // Load more button
        loadMoreBtn = new Button(getContext());
        loadMoreBtn.setText("Load More");
        loadMoreBtn.setAllCaps(false);
        loadMoreBtn.setVisibility(View.GONE);
        loadMoreBtn.setContentDescription("Load more results button");
        loadMoreBtn.setOnClickListener(v -> loadMore());
        layout.addView(loadMoreBtn);

        // Show search history if empty
        showSearchHistory();

        // Search with debounce (Part 104)
        searchInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (debounceRunnable != null) debounceHandler.removeCallbacks(debounceRunnable);
                debounceRunnable = () -> {
                    currentQuery = s.toString().trim();
                    currentPage = 1;
                    allResults.clear();
                    loadedIds.clear();
                    if (currentQuery.length() >= 2) {
                        saveToHistory(currentQuery);
                        performSearch();
                    } else {
                        resultsContainer.removeAllViews();
                        loadMoreBtn.setVisibility(View.GONE);
                        statusText.setText("Type at least 2 characters to search");
                        showSearchHistory();
                    }
                };
                debounceHandler.postDelayed(debounceRunnable, DEBOUNCE_MS);
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });

        return layout;
    }

    private Button createCategoryButton(String label, String category) {
        Button btn = new Button(getContext());
        btn.setText(label);
        btn.setAllCaps(false);
        btn.setContentDescription("Filter by " + label + " category");
        btn.setOnClickListener(v -> {
            currentCategory = category;
            currentPage = 1;
            allResults.clear();
            loadedIds.clear();
            updateCategoryStyles();
            if (currentQuery.length() >= 2) performSearch();
        });
        categoryBar.addView(btn);
        categoryButtons.add(btn);
        updateCategoryStyles();
        return btn;
    }

    private void updateCategoryStyles() {
        for (Button btn : categoryButtons) {
            boolean active = false;
            if (btn == btnAll && currentCategory.equals("all")) active = true;
            else if (btn == btnPeople && currentCategory.equals("people")) active = true;
            else if (btn == btnCemeteries && currentCategory.equals("cemeteries")) active = true;
            else if (btn == btnMemorials && currentCategory.equals("memorials")) active = true;
            else if (btn == btnLocations && currentCategory.equals("locations")) active = true;
            btn.setAlpha(active ? 1.0f : 0.5f);
        }
    }

    private void cycleSort() {
        String[] sorts = {"relevance", "name", "date", "distance"};
        int idx = 0;
        for (int i = 0; i < sorts.length; i++) {
            if (sorts[i].equals(currentSort)) { idx = i; break; }
        }
        idx = (idx + 1) % sorts.length;
        currentSort = sorts[idx];
        sortBtn.setText("Sort: " + currentSort.substring(0, 1).toUpperCase() + currentSort.substring(1));
        if (currentQuery.length() >= 2) resetAndSearch();
    }

    private void toggleFilters() {
        filtersVisible = !filtersVisible;
        filterPanel.setVisibility(filtersVisible ? View.VISIBLE : View.GONE);
        clearFiltersBtn.setVisibility(filtersVisible ? View.VISIBLE : View.GONE);
    }

    private void clearFilters() {
        countryFilterInput.setText("");
        birthYearFilterInput.setText("");
        deathYearFilterInput.setText("");
        resetAndSearch();
    }

    private void resetAndSearch() {
        currentPage = 1;
        allResults.clear();
        loadedIds.clear();
        currentQuery = searchInput.getText().toString().trim();
        if (currentQuery.length() >= 2) performSearch();
    }

    private void performSearch() {
        if (isLoading) return;
        isLoading = true;
        progressBar.setVisibility(View.VISIBLE);
        statusText.setText("Searching...");
        retryBtn.setVisibility(View.GONE);

        String country = countryFilterInput.getText().toString().trim();
        String birthYear = birthYearFilterInput.getText().toString().trim();
        String deathYear = deathYearFilterInput.getText().toString().trim();

        apiClient.globalSearch(currentQuery, currentCategory, currentPage, PAGE_SIZE,
                currentSort, country.isEmpty() ? null : country,
                null, null, // region, city — could be added later
                birthYear.isEmpty() ? null : birthYear,
                deathYear.isEmpty() ? null : deathYear,
                this);
    }

    private void loadMore() {
        if (isLoading || !hasMore) return;
        currentPage++;
        performSearch();
    }

    // ── Search Result Callbacks ──

    @Override
    public void onSuccess(GlobalSearchResponse response) {
        if (getActivity() == null) return;
        getActivity().runOnUiThread(() -> {
            isLoading = false;
            progressBar.setVisibility(View.GONE);

            // Dedup results across pages
            List<SearchResult> newResults = new ArrayList<>();
            for (SearchResult r : response.results) {
                String key = (r.type != null ? r.type : "") + ":" + (r.id != null ? r.id : "") + ":" + (r.name != null ? r.name : "");
                if (!loadedIds.contains(key)) {
                    loadedIds.add(key);
                    newResults.add(r);
                }
            }
            allResults.addAll(newResults);

            hasMore = response.hasMore;
            loadMoreBtn.setVisibility(hasMore ? View.VISIBLE : View.GONE);

            if (allResults.isEmpty()) {
                // Part 102: Empty states
                statusText.setText(getEmptyStateMessage(response));
                resultsContainer.removeAllViews();
                showSearchHistory();
            } else {
                // Category counts (Part 83)
                StringBuilder statusBuilder = new StringBuilder();
                statusBuilder.append(allResults.size()).append(" of ").append(response.total).append(" results");
                if (!response.categories.isEmpty()) {
                    statusBuilder.append(" — ");
                    boolean first = true;
                    for (String cat : response.categories.keySet()) {
                        if (!first) statusBuilder.append(", ");
                        statusBuilder.append(response.categories.get(cat)).append(" ").append(cat);
                        first = false;
                    }
                }
                statusText.setText(statusBuilder.toString());

                if (currentPage == 1) {
                    resultsContainer.removeAllViews();
                }
                displayResults(newResults);
            }
        });
    }

    @Override
    public void onError(String error) {
        if (getActivity() == null) return;
        getActivity().runOnUiThread(() -> {
            isLoading = false;
            progressBar.setVisibility(View.GONE);
            boolean isOffline = ApiErrorHandler.isOfflineError(error);
            if (allResults.isEmpty()) {
                // Part 102: Network failure empty state
                statusText.setText(isOffline ? "No connection. Check your network and try again." : error);
                retryBtn.setVisibility(View.VISIBLE);
                showSearchHistory();
            } else {
                statusText.setText("Failed to load more. Showing " + allResults.size() + " results.");
                loadMoreBtn.setVisibility(hasMore ? View.VISIBLE : View.GONE);
            }
        });
    }

    // ── Display ──

    private void displayResults(List<SearchResult> results) {
        for (SearchResult r : results) {
            TextView card = new TextView(getContext());
            StringBuilder sb = new StringBuilder();

            // Category label (Part 83)
            sb.append(r.getCategoryLabel()).append("\n");

            // Name
            sb.append(r.name != null ? r.name : "Unknown");

            // Subtitle
            String subtitle = r.getDisplaySubtitle();
            if (!subtitle.isEmpty()) {
                sb.append("\n").append(subtitle);
            }

            card.setText(sb.toString());
            card.setPadding(32, 32, 32, 32);
            card.setTextSize(14);
            card.setContentDescription(buildContentDescription(r));
            card.setBackground(ContextCompat.getDrawable(getContext(), android.R.drawable.editbox_background_normal));

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 12);
            card.setLayoutParams(lp);

            // Part 100: Result detail navigation
            card.setOnClickListener(v -> navigateToDetail(r));

            resultsContainer.addView(card);
        }
    }

    private String buildContentDescription(SearchResult r) {
        StringBuilder sb = new StringBuilder();
        sb.append(r.getCategoryLabel());
        if (r.name != null) sb.append(": ").append(r.name);
        String subtitle = r.getDisplaySubtitle();
        if (!subtitle.isEmpty()) sb.append(", ").append(subtitle);
        return sb.toString();
    }

    private void navigateToDetail(SearchResult r) {
        if (r.id == null) return;

        if ("cemetery".equals(r.type)) {
            CemeteryFragment fragment = CemeteryFragment.newInstance(r.id);
            if (getActivity() instanceof MainNavActivity) {
                ((MainNavActivity) getActivity()).loadFragment(fragment);
            }
        } else if ("person".equals(r.type) || "grave".equals(r.type) || "memorial".equals(r.type)) {
            GraveDetailFragment fragment = GraveDetailFragment.newInstance(r.id);
            if (getActivity() instanceof MainNavActivity) {
                ((MainNavActivity) getActivity()).loadFragment(fragment);
            }
        }
        // Location results don't have a detail page yet — could navigate to browse
    }

    // ── Part 102: Empty States ──

    private String getEmptyStateMessage(GlobalSearchResponse response) {
        if (response.message != null && !response.message.isEmpty()) {
            return response.message;
        }
        if (currentQuery.isEmpty() || currentQuery.length() < 2) {
            return "Type at least 2 characters to search";
        }
        // Suggest alternatives (Part 102)
        return "No results found for \"" + currentQuery + "\".\nTry a different spelling, fewer words, or a different category.";
    }

    // ── Part 103: Search History (local) ──

    private void showSearchHistory() {
        if (!currentQuery.isEmpty() || !allResults.isEmpty()) return;

        List<String> history = getSearchHistory();
        if (history.isEmpty()) return;

        TextView historyLabel = new TextView(getContext());
        historyLabel.setText("Recent searches");
        historyLabel.setTextSize(13);
        historyLabel.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        historyLabel.setPadding(0, 16, 0, 8);
        historyLabel.setContentDescription("Recent searches heading");
        resultsContainer.addView(historyLabel);

        for (String term : history) {
            Button historyBtn = new Button(getContext());
            historyBtn.setText(term);
            historyBtn.setAllCaps(false);
            historyBtn.setContentDescription("Search again for " + term);
            historyBtn.setOnClickListener(v -> {
                searchInput.setText(term);
                searchInput.setSelection(term.length());
                currentQuery = term;
                resetAndSearch();
            });
            resultsContainer.addView(historyBtn);
        }

        Button clearHistoryBtn = new Button(getContext());
        clearHistoryBtn.setText("Clear History");
        clearHistoryBtn.setAllCaps(false);
        clearHistoryBtn.setContentDescription("Clear search history button");
        clearHistoryBtn.setOnClickListener(v -> {
            clearSearchHistory();
            resultsContainer.removeAllViews();
        });
        resultsContainer.addView(clearHistoryBtn);
    }

    private List<String> getSearchHistory() {
        if (getContext() == null) return new ArrayList<>();
        try {
            String stored = getContext().getSharedPreferences(PREFS_SEARCH_HISTORY, 0)
                    .getString("history", "");
            if (stored.isEmpty()) return new ArrayList<>();
            JSONArray arr = new JSONArray(stored);
            List<String> history = new ArrayList<>();
            for (int i = 0; i < arr.length(); i++) {
                history.add(arr.getString(i));
            }
            return history;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private void saveToHistory(String query) {
        if (getContext() == null || query.isEmpty()) return;
        List<String> history = getSearchHistory();
        history.remove(query); // remove if exists (dedup)
        history.add(0, query); // add to front
        while (history.size() > MAX_HISTORY) history.remove(history.size() - 1);
        try {
            JSONArray arr = new JSONArray(history);
            getContext().getSharedPreferences(PREFS_SEARCH_HISTORY, 0)
                    .edit().putString("history", arr.toString()).apply();
        } catch (Exception e) { /* skip */ }
    }

    private void clearSearchHistory() {
        if (getContext() == null) return;
        getContext().getSharedPreferences(PREFS_SEARCH_HISTORY, 0)
                .edit().remove("history").apply();
    }
}
