package com.putraworks.graveatlas.ui.provenance;

import android.os.Bundle;
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
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.model.ProvenanceChain;
import com.putraworks.graveatlas.data.model.ProvenanceSearch;
import com.putraworks.graveatlas.data.model.ProvenanceTimeline;

import java.util.ArrayList;
import java.util.List;
import com.putraworks.graveatlas.data.model.SourceCoverageResult;
import com.putraworks.graveatlas.data.model.SourceVerificationStatus;
import org.json.JSONObject;

public class ProvenanceFragment extends Fragment {

    private ApiClient apiClient;
    private EditText recordIdField, actorField;
    private Button recordBtn, timelineBtn, searchBtn;
    private ProgressBar progressBar;
    private TextView statusText, emptyText;
    private RecyclerView recyclerView;
    private EventAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Provenance & History"); title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView desc = new TextView(getContext());
        desc.setText("Trace every modification to a record: creation, moderation, verification, corrections, enrichment, merges, fixes.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16);
        layout.addView(desc);

        recordIdField = new EditText(getContext());
        recordIdField.setHint("Record ID");
        layout.addView(recordIdField);

        actorField = new EditText(getContext());
        actorField.setHint("Filter by actor (optional)");
        layout.addView(actorField);

        LinearLayout btnRow = new LinearLayout(getContext());
        btnRow.setOrientation(LinearLayout.HORIZONTAL);

        recordBtn = new Button(getContext());
        recordBtn.setText("Record History"); recordBtn.setAllCaps(false);
        recordBtn.setOnClickListener(v -> loadRecordProvenance());
        btnRow.addView(recordBtn);

        timelineBtn = new Button(getContext());
        timelineBtn.setText("Global Timeline"); timelineBtn.setAllCaps(false);
        timelineBtn.setOnClickListener(v -> loadTimeline());
        btnRow.addView(timelineBtn);

        searchBtn = new Button(getContext());
        searchBtn.setText("Search"); searchBtn.setAllCaps(false);
        searchBtn.setOnClickListener(v -> searchProvenance());
        btnRow.addView(searchBtn);
        layout.addView(btnRow);

        Button coverageBtn = new Button(getContext());
        coverageBtn.setText("Source Coverage");
        coverageBtn.setAllCaps(false);
        layout.addView(coverageBtn);

        Button addEntryBtn = new Button(getContext());
        addEntryBtn.setText("Add Provenance Entry");
        addEntryBtn.setAllCaps(false);
        layout.addView(addEntryBtn);

        Button exportProvBtn = new Button(getContext());
        exportProvBtn.setText("Export Provenance");
        exportProvBtn.setAllCaps(false);
        layout.addView(exportProvBtn);

        Button verifyStatusBtn = new Button(getContext());
        verifyStatusBtn.setText("Verification Status");
        verifyStatusBtn.setAllCaps(false);
        layout.addView(verifyStatusBtn);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        statusText = new TextView(getContext());
        statusText.setPadding(0, 8, 0, 8);
        layout.addView(statusText);

        recyclerView = new RecyclerView(getContext());
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new EventAdapter();
        recyclerView.setAdapter(adapter);
        layout.addView(recyclerView);

        emptyText = new TextView(getContext());
        emptyText.setText("No provenance events.");
        emptyText.setPadding(0, 32, 0, 0);
        emptyText.setVisibility(View.GONE);
        layout.addView(emptyText);

        coverageBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getSourceCoverage(new ApiClient.ApiCallback<SourceCoverageResult>() {
                @Override public void onSuccess(SourceCoverageResult result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText(result != null ? result.toString() : "No coverage data"); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        addEntryBtn.setOnClickListener(v -> {
            String rid = recordIdField.getText().toString().trim();
            if (rid.isEmpty()) { statusText.setText("Enter a Record ID"); return; }
            setBusy(true);
            apiClient.addProvenanceEntry(rid, "update", "admin", "curator", "Manual update", null, new ApiClient.ApiCallback<JSONObject>() {
                @Override public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Entry added"); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        exportProvBtn.setOnClickListener(v -> {
            String rid = recordIdField.getText().toString().trim();
            if (rid.isEmpty()) { statusText.setText("Enter a Record ID"); return; }
            setBusy(true);
            apiClient.exportProvenance(rid, new ApiClient.ApiCallback<JSONObject>() {
                @Override public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); try { statusText.setText(result.toString(2)); } catch (Exception e) { statusText.setText(result.toString()); } });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        verifyStatusBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getSourceVerificationStatus(new ApiClient.ApiCallback<SourceVerificationStatus>() {
                @Override public void onSuccess(SourceVerificationStatus result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText(result != null ? result.toString() : "No status"); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        return layout;
    }

    private void loadRecordProvenance() {
        String id = recordIdField.getText().toString().trim();
        if (id.isEmpty()) { statusText.setText("Enter a record ID"); return; }

        progressBar.setVisibility(View.VISIBLE);
        apiClient.getRecordProvenance(id, new ApiClient.ApiCallback<ProvenanceChain>() {
            @Override
            public void onSuccess(ProvenanceChain result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    List<String[]> events = new ArrayList<>();
                    if (result.chain != null) {
                        for (ProvenanceChain.ProvenanceEntry e : result.chain) {
                            events.add(new String[]{
                                e.action + " by " + e.actor,
                                e.description + "\n" + e.timestamp
                            });
                        }
                    }
                    adapter.setItems(events);
                    statusText.setText(events.size() + " provenance events");
                    emptyText.setVisibility(events.isEmpty() ? View.VISIBLE : View.GONE);
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    statusText.setText("Error: " + error);
                });
            }
        });
    }

    private void loadTimeline() {
        progressBar.setVisibility(View.VISIBLE);
        apiClient.getProvenanceTimeline(null, null, 50, new ApiClient.ApiCallback<ProvenanceTimeline>() {
            @Override
            public void onSuccess(ProvenanceTimeline result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    List<String[]> events = new ArrayList<>();
                    if (result.timeline != null) {
                        for (ProvenanceTimeline.TimelineEvent e : result.timeline) {
                            events.add(new String[]{
                                e.action + " by " + e.actor,
                                (e.recordName != null ? e.recordName : e.recordId) + "\n" + e.timestamp
                            });
                        }
                    }
                    adapter.setItems(events);
                    statusText.setText(events.size() + " events");
                    emptyText.setVisibility(events.isEmpty() ? View.VISIBLE : View.GONE);
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    statusText.setText("Error: " + error);
                });
            }
        });
    }

    private void searchProvenance() {
        String actor = actorField.getText().toString().trim();
        if (actor.isEmpty()) { statusText.setText("Enter an actor name to search"); return; }

        progressBar.setVisibility(View.VISIBLE);
        apiClient.searchProvenance(actor, null, null, null, null, null, 50, new ApiClient.ApiCallback<ProvenanceSearch>() {
            @Override
            public void onSuccess(ProvenanceSearch result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    List<String[]> events = new ArrayList<>();
                    if (result.results != null) {
                        for (ProvenanceSearch.SearchEntry e : result.results) {
                            events.add(new String[]{
                                e.action + " by " + e.actor,
                                (e.recordName != null ? e.recordName : e.recordId) + "\n" + e.timestamp
                            });
                        }
                    }
                    adapter.setItems(events);
                    statusText.setText(events.size() + " events by " + actor);
                    emptyText.setVisibility(events.isEmpty() ? View.VISIBLE : View.GONE);
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    statusText.setText("Error: " + error);
                });
            }
        });
    }

    static class EventAdapter extends RecyclerView.Adapter<EventAdapter.VH> {
        private List<String[]> items = new ArrayList<>();
        void setItems(List<String[]> i) { items = i; notifyDataSetChanged(); }
        @NonNull @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            TextView tv = new TextView(parent.getContext());
            tv.setPadding(16, 12, 16, 12); tv.setTextSize(13);
            return new VH(tv);
        }
        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            String[] item = items.get(position);
            ((TextView) holder.itemView).setText(item[0] + "\n" + (item.length > 1 ? item[1] : ""));
        }
        @Override
        public int getItemCount() { return items.size(); }
        static class VH extends RecyclerView.ViewHolder { VH(View v) { super(v); } }
    }

    private void setBusy(boolean busy) {
        if (progressBar != null) progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
    }

}
