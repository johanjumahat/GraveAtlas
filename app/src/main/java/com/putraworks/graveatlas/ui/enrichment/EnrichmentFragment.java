package com.putraworks.graveatlas.ui.enrichment;

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
import com.putraworks.graveatlas.data.model.EnrichmentGapsResult;
import com.putraworks.graveatlas.data.model.EnrichmentSuggestionsResult;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class EnrichmentFragment extends Fragment {

    private ApiClient apiClient;
    private EditText recordIdField, cemeteryIdField;
    private Button suggestionsBtn, gapsBtn, prioritiesBtn;
    private ProgressBar progressBar;
    private TextView statusText;
    private RecyclerView recyclerView;
    private SuggestionAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Data Enrichment"); title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView desc = new TextView(getContext());
        desc.setText("AI-suggested missing fields, enrichment gaps, and priorities.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16);
        layout.addView(desc);

        recordIdField = new EditText(getContext());
        recordIdField.setHint("Record ID (for specific suggestions)");
        layout.addView(recordIdField);

        cemeteryIdField = new EditText(getContext());
        cemeteryIdField.setHint("Cemetery ID (optional filter)");
        layout.addView(cemeteryIdField);

        LinearLayout btnRow = new LinearLayout(getContext());
        btnRow.setOrientation(LinearLayout.HORIZONTAL);

        suggestionsBtn = new Button(getContext());
        suggestionsBtn.setText("Suggestions"); suggestionsBtn.setAllCaps(false);
        suggestionsBtn.setOnClickListener(v -> loadSuggestions());
        btnRow.addView(suggestionsBtn);

        gapsBtn = new Button(getContext());
        gapsBtn.setText("Gaps"); gapsBtn.setAllCaps(false);
        gapsBtn.setOnClickListener(v -> loadGaps());
        btnRow.addView(gapsBtn);

        prioritiesBtn = new Button(getContext());
        prioritiesBtn.setText("Priorities"); prioritiesBtn.setAllCaps(false);
        prioritiesBtn.setOnClickListener(v -> loadPriorities());
        btnRow.addView(prioritiesBtn);
        layout.addView(btnRow);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        statusText = new TextView(getContext());
        statusText.setPadding(0, 8, 0, 8);
        layout.addView(statusText);

        recyclerView = new RecyclerView(getContext());
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new SuggestionAdapter();
        recyclerView.setAdapter(adapter);
        layout.addView(recyclerView);

        return layout;
    }

    private void loadSuggestions() {
        String id = recordIdField.getText().toString().trim();
        if (id.isEmpty()) { statusText.setText("Enter a record ID"); return; }

        progressBar.setVisibility(View.VISIBLE);
        apiClient.getEnrichmentSuggestions(id, new ApiClient.ApiCallback<EnrichmentSuggestionsResult>() {
            @Override
            public void onSuccess(EnrichmentSuggestionsResult result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    List<String[]> items = new ArrayList<>();
                    if (result.suggestions != null) {
                        for (com.putraworks.graveatlas.data.model.EnrichmentSuggestion s : result.suggestions) {
                            items.add(new String[]{
                                s.field + ": " + (s.suggestedName != null ? s.suggestedName : s.suggestedValue),
                                s.reasoning + " (confidence: " + s.confidence + "%)"
                            });
                        }
                    }
                    adapter.setItems(items);
                    statusText.setText(items.size() + " suggestions (completeness: " + result.currentCompleteness + "%)");
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

    private void loadGaps() {
        String cemeteryId = cemeteryIdField.getText().toString().trim();
        if (cemeteryId.isEmpty()) cemeteryId = null;

        progressBar.setVisibility(View.VISIBLE);
        apiClient.getEnrichmentGaps(cemeteryId, null, new ApiClient.ApiCallback<EnrichmentGapsResult>() {
            @Override
            public void onSuccess(EnrichmentGapsResult result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    List<String[]> items = new ArrayList<>();
                    items.add(new String[]{"Total Records", String.valueOf(result.totalRecords)});
                    items.add(new String[]{"Avg Completeness", result.avgCompleteness + "%"});
                    items.add(new String[]{"Total Gaps", String.valueOf(result.totalGaps)});
                    if (result.gapFields != null) {
                        for (String field : result.gapFields) {
                            items.add(new String[]{"Gap: " + field, ""});
                        }
                    }
                    adapter.setItems(items);
                    statusText.setText("Gaps analysis complete");
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

    private void loadPriorities() {
        String cemeteryId = cemeteryIdField.getText().toString().trim();
        if (cemeteryId.isEmpty()) cemeteryId = null;

        progressBar.setVisibility(View.VISIBLE);
        apiClient.getEnrichmentPriorities(cemeteryId, 20, new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    List<String[]> items = new ArrayList<>();
                    org.json.JSONArray arr = result.optJSONArray("priorities");
                    if (arr != null) {
                        for (int i = 0; i < arr.length(); i++) {
                            org.json.JSONObject p = arr.optJSONObject(i);
                            if (p != null) {
                                items.add(new String[]{
                                    (i + 1) + ". " + p.optString("action", "?"),
                                    p.optString("description", "") + " | Impact: " + p.optString("impact", "?")
                                });
                            }
                        }
                    }
                    adapter.setItems(items);
                    statusText.setText(items.size() + " priorities");
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

    static class SuggestionAdapter extends RecyclerView.Adapter<SuggestionAdapter.VH> {
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
}
