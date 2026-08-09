package com.putraworks.graveatlas.ui.search;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.model.GraveRecord;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Search screen — search graves by name or cemetery.
 * Phase 2: functional search with live API call.
 */
public class SearchFragment extends Fragment implements ApiClient.ApiCallback<List<GraveRecord>> {

    private EditText searchInput;
    private LinearLayout resultsContainer;
    private ProgressBar progressBar;
    private TextView statusText;
    private ApiClient apiClient;
    private List<GraveRecord> allGraves = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        // Search bar
        searchInput = new EditText(getContext());
        searchInput.setHint("Search by name or cemetery...");
        searchInput.setPadding(16, 16, 16, 16);
        layout.addView(searchInput);

        // Status
        statusText = new TextView(getContext());
        statusText.setPadding(0, 16, 0, 16);
        statusText.setTextSize(13);
        layout.addView(statusText);

        // Progress
        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        // Results container
        resultsContainer = new LinearLayout(getContext());
        resultsContainer.setOrientation(LinearLayout.VERTICAL);
        layout.addView(resultsContainer);

        // Init API client
        apiClient = new ApiClient();

        // Load graves
        loadGraves();

        // Search filter
        searchInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterResults(s.toString());
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });

        return layout;
    }

    private void loadGraves() {
        progressBar.setVisibility(View.VISIBLE);
        statusText.setText("Loading graves...");
        resultsContainer.removeAllViews();
        apiClient.getGraves(this);
    }

    private void filterResults(String query) {
        resultsContainer.removeAllViews();
        if (query.isEmpty()) {
            displayResults(allGraves);
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
        displayResults(filtered);
    }

    private void displayResults(List<GraveRecord> graves) {
        if (graves.isEmpty()) {
            TextView empty = new TextView(getContext());
            empty.setText("No graves found");
            empty.setPadding(0, 16, 0, 16);
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
            if (g.cemetery != null) sb.append("\n").append(g.cemetery);
            card.setText(sb.toString());
            card.setPadding(24, 24, 24, 24);
            card.setTextSize(14);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 12);
            card.setLayoutParams(lp);
            resultsContainer.addView(card);
        }
    }

    @Override
    public void onSuccess(List<GraveRecord> result) {
        allGraves = result;
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                progressBar.setVisibility(View.GONE);
                statusText.setText(result.size() + " graves found");
                displayResults(result);
            });
        }
    }

    @Override
    public void onError(String error) {
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                progressBar.setVisibility(View.GONE);
                statusText.setText("Could not load graves: " + error + "\n\n(Data will be available once the backend is deployed.)");
            });
        }
    }
}
