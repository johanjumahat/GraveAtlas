package com.putraworks.graveatlas.ui.intelligent;

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
import com.putraworks.graveatlas.data.model.IntelligentSearchResult;

import java.util.ArrayList;
import java.util.List;
import com.putraworks.graveatlas.data.model.GlobalSearchResponse;
import com.putraworks.graveatlas.data.model.SearchSuggestion;
import org.json.JSONObject;
import java.util.List;
import com.putraworks.graveatlas.data.model.RelatedRecord;

public class IntelligentSearchFragment extends Fragment {

    private ApiClient apiClient;
    private EditText queryField;
    private Button searchBtn;
    private ProgressBar progressBar;
    private TextView statusText, intentText;
    private RecyclerView recyclerView;
    private ResultAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Intelligent Search");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView desc = new TextView(getContext());
        desc.setText("Search in natural language:\n\"graves from 1950s in Bukit Brown\"\n\"verified records with high confidence\"\n\"graves missing coordinates\"");
        desc.setTextSize(12);
        desc.setPadding(0, 0, 0, 16);
        layout.addView(desc);

        queryField = new EditText(getContext());
        queryField.setHint("Ask a question or describe what you're looking for...");
        layout.addView(queryField);

        searchBtn = new Button(getContext());
        searchBtn.setText("Search"); searchBtn.setAllCaps(false);
        searchBtn.setOnClickListener(v -> doSearch());
        layout.addView(searchBtn);

        Button globalSearchBtn = new Button(getContext());
        globalSearchBtn.setText("Global Search");
        globalSearchBtn.setAllCaps(false);
        layout.addView(globalSearchBtn);

        Button suggestBtn = new Button(getContext());
        suggestBtn.setText("Search Suggestions");
        suggestBtn.setAllCaps(false);
        layout.addView(suggestBtn);

        Button crossLangBtn = new Button(getContext());
        crossLangBtn.setText("Cross-Language Search");
        crossLangBtn.setAllCaps(false);
        layout.addView(crossLangBtn);
        Button searchHistoryBtn = new Button(getContext());
        searchHistoryBtn.setText("Search History");
        searchHistoryBtn.setAllCaps(false);
        layout.addView(searchHistoryBtn);
        Button externalSearchBtn = new Button(getContext());
        externalSearchBtn.setText("Search External Sources");
        externalSearchBtn.setAllCaps(false);
        layout.addView(externalSearchBtn);
        Button relatedBtn = new Button(getContext());
        relatedBtn.setText("Find Related Records");
        relatedBtn.setAllCaps(false);
        layout.addView(relatedBtn);
        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        intentText = new TextView(getContext());
        intentText.setTextSize(12); intentText.setPadding(0, 8, 0, 8);
        layout.addView(intentText);

        statusText = new TextView(getContext());
        statusText.setPadding(0, 8, 0, 8);
        layout.addView(statusText);

        recyclerView = new RecyclerView(getContext());
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new ResultAdapter();
        recyclerView.setAdapter(adapter);
        layout.addView(recyclerView);

        globalSearchBtn.setOnClickListener(v -> {
            String q = queryField.getText().toString().trim();
            setBusy(true);
            apiClient.globalSearch(q, null, 1, 50, null, null, null, null, null, null, new ApiClient.ApiCallback<GlobalSearchResponse>() {
                @Override public void onSuccess(GlobalSearchResponse result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText(result != null ? result.toString() : "No results"); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        suggestBtn.setOnClickListener(v -> {
            String q = queryField.getText().toString().trim();
            if (q.isEmpty()) { statusText.setText("Type something first"); return; }
            setBusy(true);
            apiClient.getSearchSuggestions(q, 10, new ApiClient.ApiCallback<List<SearchSuggestion>>() {
                @Override public void onSuccess(List<SearchSuggestion> result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        setBusy(false);
                        if (result == null || result.isEmpty()) { statusText.setText("No suggestions"); return; }
                        StringBuilder sb = new StringBuilder();
                        for (SearchSuggestion s : result) sb.append(s.toString()).append("\n");
                        statusText.setText(sb.toString());
                    });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        crossLangBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.crossLanguageSearch(queryField.getText().toString().trim(), new ApiClient.ApiCallback<JSONObject>() {
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

        searchHistoryBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getSearchHistory(50, new ApiClient.ApiCallback<JSONObject>() {
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

        externalSearchBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.searchExternalSources(queryField.getText().toString().trim(), null, null, 50, new ApiClient.ApiCallback<JSONObject>() {
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

        relatedBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.findRelatedRecords(queryField.getText().toString().trim(), 50, new ApiClient.ApiCallback<java.util.List<RelatedRecord>>() {
                @Override public void onSuccess(java.util.List<RelatedRecord> result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        setBusy(false);
                        if (result == null || result.isEmpty()) { statusText.setText("No results"); return; }
                        StringBuilder sb = new StringBuilder();
                        for (RelatedRecord item : result) sb.append(item.toString()).append("\n");
                        statusText.setText(sb.toString());
                    });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        return layout;
    }

    private void doSearch() {
        String query = queryField.getText().toString().trim();
        if (query.isEmpty()) return;

        progressBar.setVisibility(View.VISIBLE);
        statusText.setText(""); intentText.setText("");
        searchBtn.setEnabled(false);

        apiClient.intelligentSearch(query, null, new ApiClient.ApiCallback<IntelligentSearchResult>() {
            @Override
            public void onSuccess(IntelligentSearchResult result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    searchBtn.setEnabled(true);

                    intentText.setText("Intent: " + (result.intent != null ? result.intent : "search"));
                    statusText.setText(result.totalFound + " results found");

                    List<String[]> items = new ArrayList<>();
                    if (result.results != null) {
                        for (IntelligentSearchResult.SearchResultItem r : result.results) {
                            items.add(new String[]{
                                r.name != null ? r.name : "?",
                                (r.cemeteryId != null ? r.cemeteryId : "") + " | " +
                                (r.birthDate != null ? r.birthDate : "") + " - " + (r.deathDate != null ? r.deathDate : "")
                            });
                        }
                    }
                    adapter.setItems(items);
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    searchBtn.setEnabled(true);
                    statusText.setText("Error: " + error);
                });
            }
        });
    }

    static class ResultAdapter extends RecyclerView.Adapter<ResultAdapter.VH> {
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
