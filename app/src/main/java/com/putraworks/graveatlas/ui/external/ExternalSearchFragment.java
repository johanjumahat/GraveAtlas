package com.putraworks.graveatlas.ui.external;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.fragment.app.Fragment;
import androidx.cardview.widget.CardView;

import com.putraworks.graveatlas.R;
import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.api.ExternalSourceClient;
import com.putraworks.graveatlas.data.model.ExternalRecord;
import com.putraworks.graveatlas.ui.source.SourceBadge;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;

/**
 * External Search Fragment (Part 27 — GUI Integration)
 *
 * Lets users search external cemetery/burial sources through the GraveAtlas
 * API gateway. Results display with source badges showing provenance.
 *
 * Users can:
 * - Search external cemetery sources
 * - Find burial records for a cemetery
 * - See where information came from (source badges)
 * - Compare GraveAtlas records with external records
 */
public class ExternalSearchFragment extends Fragment {

    private EditText searchInput;
    private LinearLayout resultsContainer;
    private ProgressBar progressBar;
    private TextView statusText;
    private ExternalSourceClient client;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_external_search, container, false);

        searchInput = view.findViewById(R.id.search_input);
        resultsContainer = view.findViewById(R.id.results_container);
        progressBar = view.findViewById(R.id.progress_bar);
        statusText = view.findViewById(R.id.status_text);

        client = new ExternalSourceClient(getContext());

        searchInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}
            @Override
            public void afterTextChanged(Editable s) {
                if (s.length() >= 3) {
                    performSearch(s.toString());
                }
            }
        });

        return view;
    }

    private void performSearch(String query) {
        if (getView() == null) return;

        progressBar.setVisibility(View.VISIBLE);
        statusText.setVisibility(View.GONE);
        resultsContainer.removeAllViews();

        // Use AI external search endpoint
        try {
            JSONObject body = new JSONObject();
            body.put("query", query);

            client.queryAllSources(new JSONObject().put("search", query), new ApiClient.ApiCallback<ExternalSourceClient.ExternalSearchResult>() {
                @Override
                public void onSuccess(ExternalSourceClient.ExternalSearchResult result) {
                    if (getView() == null) return;
                    progressBar.setVisibility(View.GONE);

                    int totalRecords = result.getTotalRecordCount();
                    if (totalRecords == 0) {
                        statusText.setText("No external records found. Try a different search.");
                        statusText.setVisibility(View.VISIBLE);
                        return;
                    }

                    statusText.setText(totalRecords + " records found from " + result.results.size() + " source(s)");
                    statusText.setVisibility(View.VISIBLE);

                    // Display results grouped by source
                    for (ExternalSourceClient.ExternalSourceResult sourceResult : result.results) {
                        if (sourceResult.records.isEmpty() && !"ok".equals(sourceResult.status)) {
                            // Show unavailable source
                            TextView unavailable = new TextView(getContext());
                            unavailable.setText(sourceResult.sourceName + ": " + (sourceResult.reason != null ? sourceResult.reason : "unavailable"));
                            unavailable.setTextColor(0xFF888888);
                            unavailable.setPadding(16, 8, 16, 8);
                            resultsContainer.addView(unavailable);
                            continue;
                        }

                        // Source header
                        TextView sourceHeader = new TextView(getContext());
                        sourceHeader.setText(sourceResult.sourceName + " (" + sourceResult.records.size() + " records)");
                        sourceHeader.setTextSize(14);
                        sourceHeader.setTypeface(null, android.graphics.Typeface.BOLD);
                        sourceHeader.setTextColor(0xFFD4AF37);
                        sourceHeader.setPadding(16, 16, 16, 4);
                        resultsContainer.addView(sourceHeader);

                        // Records with source badges
                        for (ExternalRecord record : sourceResult.records) {
                            CardView card = new CardView(getContext());
                            card.setRadius(8);
                            card.setCardElevation(2);
                            card.setUseCompatPadding(true);

                            LinearLayout cardContent = new LinearLayout(getContext());
                            cardContent.setOrientation(LinearLayout.VERTICAL);
                            int pad = (int) (12 * getResources().getDisplayMetrics().density);
                            cardContent.setPadding(pad, pad, pad, pad);

                            // Record name
                            TextView nameText = new TextView(getContext());
                            nameText.setText(record.getDisplayName());
                            nameText.setTextSize(16);
                            nameText.setTypeface(null, android.graphics.Typeface.BOLD);
                            cardContent.addView(nameText);

                            // Location
                            if (record.getLocationString() != null && !record.getLocationString().isEmpty()) {
                                TextView locText = new TextView(getContext());
                                locText.setText(record.getLocationString());
                                locText.setTextSize(13);
                                locText.setTextColor(0xFFAAAAAA);
                                cardContent.addView(locText);
                            }

                            // Dates
                            if (record.birthDate != null || record.deathDate != null) {
                                TextView dateText = new TextView(getContext());
                                StringBuilder dates = new StringBuilder();
                                if (record.birthDate != null) dates.append("b. ").append(record.birthDate.substring(0, 4));
                                if (record.deathDate != null) {
                                    if (dates.length() > 0) dates.append("  ");
                                    dates.append("d. ").append(record.deathDate.substring(0, 4));
                                }
                                dateText.setText(dates.toString());
                                dateText.setTextSize(12);
                                dateText.setTextColor(0xFFAAAAAA);
                                cardContent.addView(dateText);
                            }

                            // Source badge
                            LinearLayout badge = SourceBadge.createBadge(getContext(), record, true);
                            cardContent.addView(badge);

                            card.addView(cardContent);
                            resultsContainer.addView(card);
                        }
                    }
                }

                @Override
                public void onError(String error) {
                    if (getView() == null) return;
                    progressBar.setVisibility(View.GONE);
                    statusText.setText("Search error: " + error);
                    statusText.setVisibility(View.VISIBLE);
                }
            });
        } catch (Exception e) {
            progressBar.setVisibility(View.GONE);
            statusText.setText("Search error: " + e.getMessage());
            statusText.setVisibility(View.VISIBLE);
        }
    }
}
