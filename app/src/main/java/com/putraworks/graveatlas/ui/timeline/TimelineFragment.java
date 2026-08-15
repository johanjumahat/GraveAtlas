package com.putraworks.graveatlas.ui.timeline;

import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.data.api.ApiClient;
import java.util.List;
import com.putraworks.graveatlas.data.model.GraveRecord;
import com.putraworks.graveatlas.ui.evidence.EvidenceStatus;
import com.putraworks.graveatlas.ui.gravedetail.GraveDetailFragment;
import com.putraworks.graveatlas.MainNavActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;

/**
 * Timeline Fragment — displays a chronological timeline of events.
 *
 * Phase 16.3: AI Timelines — interactive timelines linking DATE → EVENT → RECORD → SOURCE.
 *
 * Features:
 * - Vertical timeline with decade grouping
 * - Event type icons (birth, death, burial, cemetery established)
 * - Evidence badges on each event
 * - Tap event → navigate to grave detail
 * - Sorted chronologically (oldest first)
 * - Natural-language summary at top
 *
 * Data source: GET /api/graves (returns all graves, then builds events locally)
 * For large datasets, the backend should provide a /api/timeline endpoint.
 */
public class TimelineFragment extends Fragment {
    private ApiClient apiClient = new ApiClient();

    private LinearLayout timelineContainer;
    private ProgressBar progressBar;
    private TextView summaryText;
    private List<TimelineEvent> allEvents = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        ScrollView scrollView = new ScrollView(getContext());
        scrollView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        LinearLayout root = new LinearLayout(getContext());
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(48, 48, 48, 48);

        // Title
        TextView title = new TextView(getContext());
        title.setText("📊 Timeline");
        title.setTextSize(22);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 24);
        root.addView(title);

        // Summary text
        summaryText = new TextView(getContext());
        summaryText.setTextSize(13);
        summaryText.setPadding(0, 0, 0, 24);
        root.addView(summaryText);

        // Progress bar
        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.VISIBLE);
        root.addView(progressBar);

        // Timeline events container
        timelineContainer = new LinearLayout(getContext());
        timelineContainer.setOrientation(LinearLayout.VERTICAL);
        root.addView(timelineContainer);

        scrollView.addView(root);
        return scrollView;
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        loadTimelineData();
    }

    /**
     * Load grave records from the backend and build timeline events.
     */
    private void loadTimelineData() {
        timelineContainer.removeAllViews();
        progressBar.setVisibility(View.VISIBLE);

        apiClient.getGraves(new ApiClient.ApiCallback<List<GraveRecord>>() {
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    summaryText.setText("Failed to load timeline data. Check your connection.");
                    Toast.makeText(getContext(), "Error: " + error, Toast.LENGTH_SHORT).show();
                });
            }

            @Override
            public void onSuccess(List<GraveRecord> graves) {
                allEvents = buildEvents(graves != null ? graves : new ArrayList<>());

                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    displayTimeline();
                });
            }
        });
    }

    /**
     * Build timeline events from a list of grave records.
     */
    private List<TimelineEvent> buildEvents(List<GraveRecord> graves) {
        List<TimelineEvent> events = new ArrayList<>();
        for (GraveRecord g : graves) {
            if (g.birthDate != null && !g.birthDate.isEmpty()) {
                events.add(TimelineEvent.fromBirth(g));
            }
            if (g.deathDate != null && !g.deathDate.isEmpty()) {
                events.add(TimelineEvent.fromDeath(g));
            }
            if (events.isEmpty() && g.submittedAt != null && !g.submittedAt.isEmpty()) {
                events.add(TimelineEvent.fromRecordCreated(g));
            }
        }
        return TimelineEvent.sortChronologically(events);
    }

    /**
     * Display the timeline with decade grouping.
     */
    private void displayTimeline() {
        timelineContainer.removeAllViews();

        if (allEvents.isEmpty()) {
            summaryText.setText("No timeline events available. Records need birth or death dates to appear on the timeline.");
            return;
        }

        // Summary
        summaryText.setText(TimelineEvent.generateSummary(allEvents));

        // Group by decade
        List<TimelineEvent.DecadeGroup> groups = TimelineEvent.groupByDecade(allEvents);

        for (TimelineEvent.DecadeGroup group : groups) {
            // Decade header
            TextView decadeHeader = new TextView(getContext());
            decadeHeader.setText("—" + group.label + "—  (" + group.getEventCount() + " events)");
            decadeHeader.setTextSize(16);
            decadeHeader.setTypeface(Typeface.DEFAULT_BOLD);
            decadeHeader.setPadding(0, 32, 0, 16);
            timelineContainer.addView(decadeHeader);

            // Events in this decade
            for (TimelineEvent event : group.events) {
                timelineContainer.addView(createEventCard(event));
            }
        }
    }

    /**
     * Create a card for a single timeline event.
     */
    private View createEventCard(TimelineEvent event) {
        LinearLayout card = new LinearLayout(getContext());
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setPadding(16, 16, 16, 16);
        card.setGravity(Gravity.CENTER_VERTICAL);

        // Left: vertical line + dot (timeline visual)
        LinearLayout timelineLine = new LinearLayout(getContext());
        timelineLine.setOrientation(LinearLayout.VERTICAL);
        timelineLine.setGravity(Gravity.CENTER_HORIZONTAL);
        timelineLine.setLayoutParams(new LinearLayout.LayoutParams(48, LinearLayout.LayoutParams.WRAP_CONTENT));

        View dot = new View(getContext());
        dot.setLayoutParams(new LinearLayout.LayoutParams(24, 24));
        dot.setBackgroundColor(getEventColor(event.type));
        timelineLine.addView(dot);

        card.addView(timelineLine);

        // Right: event content
        LinearLayout content = new LinearLayout(getContext());
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(16, 0, 0, 0);
        content.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        // Event type + date
        LinearLayout typeRow = new LinearLayout(getContext());
        typeRow.setOrientation(LinearLayout.HORIZONTAL);
        typeRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView typeLabel = new TextView(getContext());
        typeLabel.setText(event.type.label);
        typeLabel.setTextSize(12);
        typeLabel.setTypeface(Typeface.DEFAULT_BOLD);
        typeLabel.setTextColor(getEventColor(event.type));
        typeRow.addView(typeLabel);

        TextView dateLabel = new TextView(getContext());
        dateLabel.setText("  •  " + event.getFormattedDate());
        dateLabel.setTextSize(12);
        typeRow.addView(dateLabel);

        content.addView(typeRow);

        // Title (person name)
        TextView titleLabel = new TextView(getContext());
        titleLabel.setText(event.title);
        titleLabel.setTextSize(14);
        titleLabel.setTypeface(Typeface.DEFAULT_BOLD);
        titleLabel.setPadding(0, 4, 0, 0);
        content.addView(titleLabel);

        // Description
        if (event.description != null && !event.description.isEmpty()) {
            TextView descLabel = new TextView(getContext());
            descLabel.setText(event.description);
            descLabel.setTextSize(12);
            descLabel.setPadding(0, 4, 0, 0);
            content.addView(descLabel);
        }

        // Cemetery name
        if (event.cemeteryName != null && !event.cemeteryName.isEmpty()) {
            TextView cemeteryLabel = new TextView(getContext());
            cemeteryLabel.setText("📍 " + event.cemeteryName);
            cemeteryLabel.setTextSize(11);
            cemeteryLabel.setPadding(0, 4, 0, 0);
            content.addView(cemeteryLabel);
        }

        // Evidence badge
        if (event.verificationStatus != null) {
            EvidenceStatus.Category category = EvidenceStatus.fromVerificationStatus(event.verificationStatus);
            TextView badge = EvidenceStatus.createBadge(getContext(), category);
            badge.setPadding(0, 8, 0, 0);
            content.addView(badge);
        }

        card.addView(content);

        // Click → navigate to grave detail
        if ("grave".equals(event.recordType) && event.recordId != null) {
            card.setClickable(true);
            card.setFocusable(true);
            card.setOnClickListener(v -> {
                if (getActivity() instanceof MainNavActivity) {
                    ((MainNavActivity) getActivity()).loadFragment(
                            GraveDetailFragment.newInstance(event.recordId)
                    );
                }
            });

            // Long press → show event details
            card.setOnLongClickListener(v -> {
                showEventDetails(event);
                return true;
            });
        }

        return card;
    }

    /**
     * Show a dialog with full event details.
     */
    private void showEventDetails(TimelineEvent event) {
        StringBuilder sb = new StringBuilder();
        sb.append("Event: ").append(event.type.label).append("\n\n");
        sb.append("Date: ").append(event.getFormattedDate()).append("\n");
        sb.append("Person: ").append(event.title).append("\n");
        if (event.cemeteryName != null) sb.append("Cemetery: ").append(event.cemeteryName).append("\n");
        if (event.description != null) sb.append("\n").append(event.description).append("\n");
        if (event.verificationStatus != null) sb.append("Evidence: ").append(event.verificationStatus).append("\n");
        if (event.hasValidDate()) sb.append("Year: ").append(event.year).append("\n");
        if (!event.sourceRefs.isEmpty()) sb.append("Sources: ").append(event.sourceRefs.size()).append(" reference(s)\n");

        new AlertDialog.Builder(getContext())
                .setTitle("Timeline Event")
                .setMessage(sb.toString())
                .setPositiveButton("OK", null)
                .setNeutralButton("View Record", (d, w) -> {
                    if (getActivity() instanceof MainNavActivity) {
                        ((MainNavActivity) getActivity()).loadFragment(
                                GraveDetailFragment.newInstance(event.recordId)
                        );
                    }
                })
                .show();
    }

    /**
     * Get color for event type.
     */
    private int getEventColor(TimelineEvent.EventType type) {
        switch (type) {
            case BIRTH: return Color.parseColor("#4CAF50");    // Green
            case DEATH: return Color.parseColor("#9E9E9E");    // Gray
            case BURIAL: return Color.parseColor("#795548");  // Brown
            case CEMETERY_ESTABLISHED: return Color.parseColor("#2196F3"); // Blue
            case INSCRIPTION: return Color.parseColor("#FF9800"); // Orange
            case RECORD_CREATED: return Color.parseColor("#9C27B0"); // Purple
            case RECORD_UPDATED: return Color.parseColor("#00BCD4"); // Cyan
            default: return Color.GRAY;
        }
    }
}
