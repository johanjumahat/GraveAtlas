package com.putraworks.graveatlas.ui.watchlist;

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
import com.putraworks.graveatlas.data.model.WatchlistItem;
import com.putraworks.graveatlas.data.model.WatchlistCheckResult;


import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class WatchlistFragment extends Fragment {

    private ApiClient apiClient;
    private EditText targetIdField, targetTypeField;
    private Button addBtn, checkBtn;
    private ProgressBar progressBar;
    private TextView statusText, emptyText;
    private RecyclerView recyclerView;
    private WatchlistAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Watchlist"); title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView desc = new TextView(getContext());
        desc.setText("Monitor cemeteries and records for health degradation, new anomalies, unapplied fixes, and duplicates.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16);
        layout.addView(desc);

        targetIdField = new EditText(getContext());
        targetIdField.setHint("Cemetery or Record ID");
        layout.addView(targetIdField);

        targetTypeField = new EditText(getContext());
        targetTypeField.setHint("Type (cemetery or grave)");
        layout.addView(targetTypeField);

        addBtn = new Button(getContext());
        addBtn.setText("Add to Watchlist"); addBtn.setAllCaps(false);
        addBtn.setOnClickListener(v -> addToWatchlist());
        layout.addView(addBtn);

        checkBtn = new Button(getContext());
        checkBtn.setText("Run Check"); checkBtn.setAllCaps(false);
        checkBtn.setOnClickListener(v -> runCheck());
        layout.addView(checkBtn);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        statusText = new TextView(getContext());
        statusText.setPadding(0, 8, 0, 8);
        layout.addView(statusText);

        recyclerView = new RecyclerView(getContext());
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new WatchlistAdapter();
        recyclerView.setAdapter(adapter);
        layout.addView(recyclerView);

        emptyText = new TextView(getContext());
        emptyText.setText("Watchlist is empty.");
        emptyText.setPadding(0, 32, 0, 0);
        emptyText.setVisibility(View.GONE);
        layout.addView(emptyText);

        loadWatchlist();
        return layout;
    }

    private void loadWatchlist() {
        progressBar.setVisibility(View.VISIBLE);
        apiClient.getWatchlist(new ApiClient.ApiCallback<List<WatchlistItem>>() {
            @Override
            public void onSuccess(List<WatchlistItem> result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    List<String[]> items = new ArrayList<>();
                    for (WatchlistItem w : result) {
                        items.add(new String[]{
                            w.targetType + ": " + w.targetId,
                            "Added: " + (w.createdAt != null ? w.createdAt : "") +
                            (w.active ? " | Active" : " | Inactive")
                        });
                    }
                    adapter.setItems(items);
                    emptyText.setVisibility(result.isEmpty() ? View.VISIBLE : View.GONE);
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

    private void addToWatchlist() {
        String id = targetIdField.getText().toString().trim();
        String type = targetTypeField.getText().toString().trim();
        if (id.isEmpty() || type.isEmpty()) { statusText.setText("ID and type required"); return; }

        progressBar.setVisibility(View.VISIBLE);
        apiClient.addToWatchlist(type, id, new String[]{"health_drop", "new_anomaly", "duplicate_found"}, id,
                new ApiClient.ApiCallback<WatchlistItem>() {
            @Override
            public void onSuccess(WatchlistItem result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    statusText.setText("Added to watchlist");
                    targetIdField.setText("");
                    loadWatchlist();
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

    private void runCheck() {
        progressBar.setVisibility(View.VISIBLE);
        statusText.setText("Running watchlist check...");
        apiClient.checkWatchlist(new ApiClient.ApiCallback<WatchlistCheckResult>() {
            @Override
            public void onSuccess(WatchlistCheckResult result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    statusText.setText("Check complete: " + result.totalAlerts + " alerts (" + result.criticalAlerts + " critical)");
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

    static class WatchlistAdapter extends RecyclerView.Adapter<WatchlistAdapter.VH> {
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
