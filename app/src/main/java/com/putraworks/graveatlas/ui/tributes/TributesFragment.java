package com.putraworks.graveatlas.ui.tributes;

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

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class TributesFragment extends Fragment {

    private ApiClient apiClient;
    private RecyclerView recyclerView;
    private ProgressBar progressBar;
    private TextView emptyText, statusText;
    private EditText graveIdField, messageField;
    private Button submitBtn;
    private TributeAdapter adapter;
    private String targetGraveId;

    public TributesFragment() {}
    public TributesFragment(String graveId) { targetGraveId = graveId; }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Tributes");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 16);
        layout.addView(title);

        graveIdField = new EditText(getContext());
        graveIdField.setHint("Grave ID");
        if (targetGraveId != null) graveIdField.setText(targetGraveId);
        layout.addView(graveIdField);

        messageField = new EditText(getContext());
        messageField.setHint("Write a tribute message...");
        messageField.setMinLines(3);
        layout.addView(messageField);

        submitBtn = new Button(getContext());
        submitBtn.setText("Add Tribute");
        submitBtn.setAllCaps(false);
        submitBtn.setOnClickListener(v -> submitTribute());
        layout.addView(submitBtn);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        statusText = new TextView(getContext());
        statusText.setPadding(0, 8, 0, 8);
        layout.addView(statusText);

        recyclerView = new RecyclerView(getContext());
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new TributeAdapter();
        recyclerView.setAdapter(adapter);
        layout.addView(recyclerView);

        emptyText = new TextView(getContext());
        emptyText.setText("No tributes yet.");
        emptyText.setPadding(0, 32, 0, 0);
        emptyText.setVisibility(View.GONE);
        layout.addView(emptyText);

        loadTributes();
        return layout;
    }

    private void loadTributes() {
        progressBar.setVisibility(View.VISIBLE);
        emptyText.setVisibility(View.GONE);
        String graveId = targetGraveId != null ? targetGraveId : "";
        apiClient.listTributes("grave", graveId, 50, 0, new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    List<Tribute> tributes = new ArrayList<>();
                    JSONArray arr = result.optJSONArray("tributes");
                    if (arr == null) arr = result.optJSONArray("data");
                    if (arr != null) {
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject t = arr.optJSONObject(i);
                            if (t != null) tributes.add(new Tribute(
                                t.optString("id", ""), t.optString("targetId", ""),
                                t.optString("authorName", "Anonymous"),
                                t.optString("message", ""),
                                t.optString("createdAt", ""),
                                t.optInt("likes", 0)
                            ));
                        }
                    }
                    adapter.setTributes(tributes);
                    emptyText.setVisibility(tributes.isEmpty() ? View.VISIBLE : View.GONE);
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

    private void submitTribute() {
        String graveId = graveIdField.getText().toString().trim();
        String message = messageField.getText().toString().trim();
        if (graveId.isEmpty() || message.isEmpty()) {
            statusText.setText("Grave ID and message are required");
            return;
        }
        submitBtn.setEnabled(false);
        progressBar.setVisibility(View.VISIBLE);
        apiClient.createTribute("grave", graveId, message, "tribute", false, new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    submitBtn.setEnabled(true);
                    progressBar.setVisibility(View.GONE);
                    messageField.setText("");
                    statusText.setText("Tribute added!");
                    loadTributes();
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    submitBtn.setEnabled(true);
                    progressBar.setVisibility(View.GONE);
                    statusText.setText("Error: " + error);
                });
            }
        });
    }

    static class Tribute {
        String id, graveId, author, message, createdAt;
        int likes;
        Tribute(String id, String graveId, String author, String message, String createdAt, int likes) {
            this.id = id; this.graveId = graveId; this.author = author;
            this.message = message; this.createdAt = createdAt; this.likes = likes;
        }
    }

    static class TributeAdapter extends RecyclerView.Adapter<TributeAdapter.VH> {
        private List<Tribute> tributes = new ArrayList<>();
        void setTributes(List<Tribute> t) { tributes = t; notifyDataSetChanged(); }
        @NonNull @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            TextView tv = new TextView(parent.getContext());
            tv.setPadding(16, 16, 16, 16); tv.setTextSize(14);
            return new VH(tv);
        }
        @Override public void onBindViewHolder(@NonNull VH holder, int position) {
            Tribute t = tributes.get(position);
            ((TextView) holder.itemView).setText(t.author + " → " + t.graveId + "\n" + t.message + "\n" + t.likes + " likes | " + t.createdAt);
        }
        @Override public int getItemCount() { return tributes.size(); }
        static class VH extends RecyclerView.ViewHolder { VH(View v) { super(v); } }
    }
}
