package com.putraworks.graveatlas.ui.community;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.putraworks.graveatlas.data.api.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Community screen — feed, leaderboard, and stats.
 * GET /api/community/feed, GET /api/community/leaderboard, GET /api/community/stats
 */
public class CommunityFragment extends Fragment {

    private ApiClient apiClient;
    private ProgressBar progressBar;
    private TextView statsText, emptyText;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Community");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 16);
        layout.addView(title);

        // Stats section
        statsText = new TextView(getContext());
        statsText.setTextSize(13);
        statsText.setPadding(0, 8, 0, 16);
        layout.addView(statsText);

        // Leaderboard section
        TextView lbTitle = new TextView(getContext());
        lbTitle.setText("Top Contributors");
        lbTitle.setTextSize(16);
        lbTitle.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        lbTitle.setPadding(0, 16, 0, 8);
        layout.addView(lbTitle);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        RecyclerView leaderboardView = new RecyclerView(getContext());
        leaderboardView.setLayoutManager(new LinearLayoutManager(getContext()));
        leaderboardView.setNestedScrollingEnabled(false);
        layout.addView(leaderboardView);
        SimpleAdapter leaderboardAdapter = new SimpleAdapter();
        leaderboardView.setAdapter(leaderboardAdapter);

        // Feed section
        TextView feedTitle = new TextView(getContext());
        feedTitle.setText("Recent Activity");
        feedTitle.setTextSize(16);
        feedTitle.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        feedTitle.setPadding(0, 24, 0, 8);
        layout.addView(feedTitle);

        RecyclerView feedView = new RecyclerView(getContext());
        feedView.setLayoutManager(new LinearLayoutManager(getContext()));
        feedView.setNestedScrollingEnabled(false);
        layout.addView(feedView);
        SimpleAdapter feedAdapter = new SimpleAdapter();
        feedView.setAdapter(feedAdapter);

        emptyText = new TextView(getContext());
        emptyText.setText("No recent activity.");
        emptyText.setPadding(0, 16, 0, 0);
        emptyText.setVisibility(View.GONE);
        layout.addView(emptyText);

        // Load stats
        apiClient.getCommunityStats(new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    StringBuilder sb = new StringBuilder();
                    sb.append("Total Records: ").append(result.optInt("totalRecords", 0)).append("\n");
                    sb.append("Total Contributors: ").append(result.optInt("totalContributors", 0)).append("\n");
                    sb.append("Pending Reviews: ").append(result.optInt("pendingSubmissions", 0)).append("\n");
                    sb.append("Photos: ").append(result.optInt("totalPhotos", 0));
                    statsText.setText(sb.toString());
                });
            }
            @Override
            public void onError(String error) {}
        });

        // Load leaderboard
        apiClient.getCommunityLeaderboard(20, new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    List<String[]> items = new ArrayList<>();
                    JSONArray arr = result.optJSONArray("leaderboard");
                    if (arr == null) arr = result.optJSONArray("data");
                    if (arr != null) {
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject e = arr.optJSONObject(i);
                            if (e != null) {
                                items.add(new String[]{
                                    (i + 1) + ". " + e.optString("displayName", "Anonymous"),
                                    e.optInt("contributionCount", 0) + " contributions"
                                });
                            }
                        }
                    }
                    leaderboardAdapter.setItems(items);
                });
            }
            @Override
            public void onError(String error) {}
        });

        // Load feed
        progressBar.setVisibility(View.VISIBLE);
        apiClient.getCommunityFeed(50, 0, new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    List<String[]> items = new ArrayList<>();
                    JSONArray arr = result.optJSONArray("feed");
                    if (arr == null) arr = result.optJSONArray("data");
                    if (arr != null) {
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject e = arr.optJSONObject(i);
                            if (e != null) {
                                items.add(new String[]{
                                    e.optString("type", "activity"),
                                    e.optString("authorName", "Someone") + " — " + e.optString("description", "") +
                                    " (" + e.optString("createdAt", "") + ")"
                                });
                            }
                        }
                    }
                    feedAdapter.setItems(items);
                    emptyText.setVisibility(items.isEmpty() ? View.VISIBLE : View.GONE);
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    emptyText.setText("Error: " + error);
                    emptyText.setVisibility(View.VISIBLE);
                });
            }
        });

        return layout;
    }

    static class SimpleAdapter extends RecyclerView.Adapter<SimpleAdapter.VH> {
        private List<String[]> items = new ArrayList<>();
        void setItems(List<String[]> i) { items = i; notifyDataSetChanged(); }
        @NonNull @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            TextView tv = new TextView(parent.getContext());
            tv.setPadding(16, 12, 16, 12);
            tv.setTextSize(13);
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
