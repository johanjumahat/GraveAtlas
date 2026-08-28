package com.putraworks.graveatlas.ui.notifications;

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
import com.putraworks.graveatlas.data.model.Notification;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import com.putraworks.graveatlas.data.model.Notification;

public class NotificationsFragment extends Fragment {

    private ApiClient apiClient;
    private RecyclerView recyclerView;
    private ProgressBar progressBar;
    private TextView emptyText, resultText;
    private Button unreadBtn, allBtn, markAllBtn;
    private NotificationAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Notifications");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 16);
        layout.addView(title);

        LinearLayout btnRow = new LinearLayout(getContext());
        btnRow.setOrientation(LinearLayout.HORIZONTAL);

        allBtn = new Button(getContext()); allBtn.setText("All"); allBtn.setAllCaps(false);
        allBtn.setOnClickListener(v -> loadAll());
        btnRow.addView(allBtn);

        unreadBtn = new Button(getContext()); unreadBtn.setText("Unread"); unreadBtn.setAllCaps(false);
        unreadBtn.setOnClickListener(v -> loadUnread());
        btnRow.addView(unreadBtn);

        markAllBtn = new Button(getContext()); markAllBtn.setText("Mark All Read"); markAllBtn.setAllCaps(false);
        markAllBtn.setOnClickListener(v -> markAllRead());
        btnRow.addView(markAllBtn);
        layout.addView(btnRow);

        EditText notifIdField = new EditText(getContext());
        notifIdField.setHint("Notification ID");
        layout.addView(notifIdField);

        Button markReadBtn = new Button(getContext());
        markReadBtn.setText("Mark Read");
        markReadBtn.setAllCaps(false);
        layout.addView(markReadBtn);

        Button dismissBtn = new Button(getContext());
        dismissBtn.setText("Dismiss");
        dismissBtn.setAllCaps(false);
        layout.addView(dismissBtn);

        resultText = new TextView(getContext());
        resultText.setTextSize(13);
        resultText.setPadding(0, 16, 0, 0);
        layout.addView(resultText);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        recyclerView = new RecyclerView(getContext());
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new NotificationAdapter();
        recyclerView.setAdapter(adapter);
        layout.addView(recyclerView);

        emptyText = new TextView(getContext());
        emptyText.setText("No notifications.");
        emptyText.setPadding(0, 32, 0, 0);
        emptyText.setVisibility(View.GONE);
        layout.addView(emptyText);

        loadAll();
        markReadBtn.setOnClickListener(v -> {
            String nid = notifIdField.getText().toString().trim();
            if (nid.isEmpty()) { resultText.setText("Enter notification ID"); return; }
            setBusy(true);
            apiClient.markNotificationRead(nid, new ApiClient.ApiCallback<JSONObject>() {
                @Override public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Marked read: " + nid); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });

        dismissBtn.setOnClickListener(v -> {
            String nid = notifIdField.getText().toString().trim();
            if (nid.isEmpty()) { resultText.setText("Enter notification ID"); return; }
            setBusy(true);
            apiClient.dismissNotification(nid, new ApiClient.ApiCallback<JSONObject>() {
                @Override public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Dismissed: " + nid); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });

        return layout;
    }

    private void loadAll() {
        progressBar.setVisibility(View.VISIBLE);
        emptyText.setVisibility(View.GONE);
        apiClient.listNotifications(null, null, null, 50, new ApiClient.ApiCallback<List<Notification>>() {
            @Override
            public void onSuccess(List<Notification> result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    adapter.setNotifications(result);
                    emptyText.setVisibility(result.isEmpty() ? View.VISIBLE : View.GONE);
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
    }

    private void loadUnread() {
        progressBar.setVisibility(View.VISIBLE);
        emptyText.setVisibility(View.GONE);
        apiClient.getUnreadNotifications(new ApiClient.ApiCallback<List<Notification>>() {
            @Override
            public void onSuccess(List<Notification> result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    adapter.setNotifications(result);
                    emptyText.setVisibility(result.isEmpty() ? View.VISIBLE : View.GONE);
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
    }

    private void markAllRead() {
        apiClient.markAllNotificationsRead(new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> loadAll());
            }
            @Override
            public void onError(String error) {}
        });
    }

    static class NotificationAdapter extends RecyclerView.Adapter<NotificationAdapter.VH> {
        private List<Notification> notifs = new ArrayList<>();
        void setNotifications(List<Notification> n) { notifs = n; notifyDataSetChanged(); }
        @NonNull @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            TextView tv = new TextView(parent.getContext());
            tv.setPadding(16, 16, 16, 16); tv.setTextSize(13);
            return new VH(tv);
        }
        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            Notification n = notifs.get(position);
            String prefix = n.read ? "" : "[NEW] ";
            String sev = "critical".equals(n.severity) ? "!!!" : "warning".equals(n.severity) ? "!" : "";
            ((TextView) holder.itemView).setText(prefix + sev + " " + n.type + "\n" + n.title + "\n" + n.message);
        }
        @Override
        public int getItemCount() { return notifs.size(); }
        static class VH extends RecyclerView.ViewHolder { VH(View v) { super(v); } }
    }

    private void setBusy(boolean busy) {
        if (progressBar != null) progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
    }

}
