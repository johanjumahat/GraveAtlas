package com.putraworks.graveatlas.ui.gravedetail;

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
import com.putraworks.graveatlas.data.model.GraveRecord;

/**
 * Grave detail screen — shows full information for a single published grave.
 * Tapping a grave in Search opens this screen.
 */
public class GraveDetailFragment extends Fragment {

    private static final String ARG_GRAVE_ID = "grave_id";

    private String graveId;
    private ApiClient apiClient;
    private LinearLayout contentLayout;
    private ProgressBar progressBar;
    private TextView errorText;
    private Button retryBtn;

    public static GraveDetailFragment newInstance(String graveId) {
        GraveDetailFragment fragment = new GraveDetailFragment();
        Bundle args = new Bundle();
        args.putString(ARG_GRAVE_ID, graveId);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            graveId = getArguments().getString(ARG_GRAVE_ID);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        apiClient = new ApiClient();

        // Back button
        Button backBtn = new Button(getContext());
        backBtn.setText("← Back");
        backBtn.setAllCaps(false);
        backBtn.setOnClickListener(v -> {
            if (getActivity() instanceof MainNavActivity) {
                ((MainNavActivity) getActivity()).loadFragment(new com.putraworks.graveatlas.ui.search.SearchFragment());
            }
        });
        layout.addView(backBtn);

        // Progress
        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        progressBar.setContentDescription("Loading");
        layout.addView(progressBar);

        // Error
        errorText = new TextView(getContext());
        errorText.setPadding(0, 16, 0, 16);
        layout.addView(errorText);

        // Retry
        retryBtn = new Button(getContext());
        retryBtn.setText("Retry");
        retryBtn.setAllCaps(false);
        retryBtn.setVisibility(View.GONE);
        retryBtn.setOnClickListener(v -> loadGrave());
        layout.addView(retryBtn);

        // Content
        contentLayout = new LinearLayout(getContext());
        contentLayout.setOrientation(LinearLayout.VERTICAL);
        layout.addView(contentLayout);

        loadGrave();
        return layout;
    }

    private void loadGrave() {
        if (graveId == null) return;
        progressBar.setVisibility(View.VISIBLE);
        errorText.setText("");
        retryBtn.setVisibility(View.GONE);
        contentLayout.removeAllViews();

        apiClient.getGrave(graveId, new ApiClient.ApiCallback<GraveRecord>() {
            @Override
            public void onSuccess(GraveRecord grave) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        displayGrave(grave);
                    });
                }
            }

            @Override
            public void onError(String error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        errorText.setText(error);
                        retryBtn.setVisibility(View.VISIBLE);
                    });
                }
            }
        });
    }

    private void displayGrave(GraveRecord grave) {
        // Phase 16: Evidence badge
        EvidenceStatus.Category evidenceCat = EvidenceStatus.fromVerificationStatus(grave.status);
        TextView badge = EvidenceStatus.createBadge(getContext(), evidenceCat);
        LinearLayout badgeRow = new LinearLayout(getContext());
        badgeRow.setOrientation(LinearLayout.HORIZONTAL);
        badgeRow.setPadding(0, 8, 0, 8);
        badgeRow.addView(badge);
        contentLayout.addView(badgeRow);

        // Name
        addField("Name", grave.name, true);

        // Dates
        if (grave.birthDate != null || grave.deathDate != null) {
            StringBuilder dates = new StringBuilder();
            if (grave.birthDate != null) dates.append(grave.birthDate);
            if (grave.birthDate != null && grave.deathDate != null) dates.append(" \u2014 ");
            if (grave.deathDate != null) dates.append(grave.deathDate);
            addField("Life Dates", dates.toString(), false);
        }

        // Cemetery
        if (grave.cemetery != null) addField("Cemetery", grave.cemetery, false);
        if (grave.section != null) addField("Section", grave.section, false);
        if (grave.plot != null) addField("Plot", grave.plot, false);

        // Coordinates
        if (grave.hasCoordinates()) {
            addField("Coordinates", String.format("%.4f, %.4f", grave.latitude, grave.longitude), false);
        }

        // Notes
        if (grave.notes != null && !grave.notes.isEmpty()) {
            addField("Notes", grave.notes, false);
        }

        // Provenance / Source info
        if (grave.source != null && !grave.source.isEmpty()) {
            addField("Source", grave.source, false);
        } else {
            addField("Source", "Community-submitted (needs verification)", false);
        }

        // Status
        if (grave.status != null) {
            addField("Verification Status", grave.status, false);
        }

        // ===== Phase 16: Contextual Actions =====
        addContextualActions(grave);
    }

    /**
     * Phase 16: Contextual actions for grave records.
     * Provides research-oriented actions: Explain, Show Sources, Find Related,
     * View on Map, Add to Research, View Timeline, Check Provenance.
     */
    private void addContextualActions(GraveRecord grave) {
        // Section divider
        TextView divider = new TextView(getContext());
        divider.setText("ACTIONS");
        divider.setTextSize(11);
        divider.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        divider.setTextColor(0xFF6E6B67);
        divider.setPadding(0, 24, 0, 8);
        contentLayout.addView(divider);

        // Open in Maps
        if (grave.hasCoordinates()) {
            Button mapsBtn = new Button(getContext());
            mapsBtn.setText("View on Map");
            mapsBtn.setAllCaps(false);
            mapsBtn.setOnClickListener(v -> {
                String geoUri = String.format("geo:%f,%f?q=%f,%f(%s)",
                        grave.latitude, grave.longitude,
                        grave.latitude, grave.longitude,
                        grave.name != null ? grave.name : "Grave");
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(geoUri));
                startActivity(intent);
            });
            contentLayout.addView(mapsBtn);
        }

        // Explain this record (AI)
        Button explainBtn = new Button(getContext());
        explainBtn.setText("Explain this Record");
        explainBtn.setAllCaps(false);
        explainBtn.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), MainActivity.class);
            intent.putExtra("prefill_question",
                com.putraworks.graveatlas.chat.AISystemPrompts.graveContextPrompt(
                    grave.name, grave.cemetery, grave.birthDate, grave.deathDate,
                    grave.status, grave.source));
            startActivity(intent);
        });
        contentLayout.addView(explainBtn);

        // Show sources
        Button sourcesBtn = new Button(getContext());
        sourcesBtn.setText("Show Sources");
        sourcesBtn.setAllCaps(false);
        sourcesBtn.setOnClickListener(v -> {
            if (grave.source != null && !grave.source.isEmpty()) {
                android.widget.Toast.makeText(getContext(),
                    "Source: " + grave.source, android.widget.Toast.LENGTH_LONG).show();
            } else {
                android.widget.Toast.makeText(getContext(),
                    "No verified source. This record is community-submitted and needs verification.",
                    android.widget.Toast.LENGTH_LONG).show();
            }
        });
        contentLayout.addView(sourcesBtn);

        // Find related records
        Button relatedBtn = new Button(getContext());
        relatedBtn.setText("Find Related Records");
        relatedBtn.setAllCaps(false);
        relatedBtn.setOnClickListener(v -> {
            if (getActivity() instanceof MainNavActivity) {
                com.putraworks.graveatlas.ui.search.SearchFragment search = new com.putraworks.graveatlas.ui.search.SearchFragment();
                Bundle args = new Bundle();
                args.putString("query", grave.cemetery != null ? grave.cemetery : grave.name);
                search.setArguments(args);
                ((MainNavActivity) getActivity()).loadFragment(search);
            }
        });
        contentLayout.addView(relatedBtn);

        // Check provenance
        Button provenanceBtn = new Button(getContext());
        provenanceBtn.setText("Check Provenance");
        provenanceBtn.setAllCaps(false);
        provenanceBtn.setOnClickListener(v -> {
            StringBuilder provenance = new StringBuilder();
            provenance.append("Record ID: ").append(grave.id != null ? grave.id : "Unknown").append("\n");
            provenance.append("Status: ").append(grave.status != null ? grave.status : "Unknown").append("\n");
            if (grave.source != null) provenance.append("Source: ").append(grave.source).append("\n");
            provenance.append("Evidence Category: ").append(
                EvidenceStatus.fromVerificationStatus(grave.status).getLabel());
            android.widget.Toast.makeText(getContext(),
                provenance.toString(), android.widget.Toast.LENGTH_LONG).show();
        });
        contentLayout.addView(provenanceBtn);

        // Report correction
        Button reportBtn = new Button(getContext());
        reportBtn.setText("Report Correction");
        reportBtn.setAllCaps(false);
        reportBtn.setOnClickListener(v -> {
            android.widget.Toast.makeText(getContext(),
                "Report feature: long-press to submit correction",
                android.widget.Toast.LENGTH_SHORT).show();
        });
        contentLayout.addView(reportBtn);
    }

    private void addField(String label, String value, boolean isTitle) {
        if (value == null || value.isEmpty()) return;

        TextView labelView = new TextView(getContext());
        labelView.setText(label);
        labelView.setTextSize(12);
        labelView.setTextColor(0xFF5F6368);
        labelView.setPadding(0, 16, 0, 4);
        labelView.setContentDescription(label);
        contentLayout.addView(labelView);

        TextView valueView = new TextView(getContext());
        valueView.setText(value);
        valueView.setTextSize(isTitle ? 22 : 15);
        if (isTitle) {
            valueView.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        }
        valueView.setPadding(0, 0, 0, 8);
        valueView.setContentDescription(label + ": " + value);
        contentLayout.addView(valueView);
    }
}
