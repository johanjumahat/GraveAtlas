package com.putraworks.graveatlas.ui.contribute;

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

import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.api.OfflineSubmissionManager;

import java.util.List;

/**
 * My Contributions screen — shows user's pending submissions and
 * allows checking submission status by ID.
 * Also retries offline submissions.
 */
public class ContributeFragment extends Fragment {

    private LinearLayout contentLayout;
    private ProgressBar progressBar;
    private TextView statusText;
    private Button retryOfflineBtn;
    private EditText submissionIdField;
    private Button checkStatusBtn;
    private TextView statusResult;
    private ApiClient apiClient;
    private OfflineSubmissionManager offlineManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        apiClient = new ApiClient();
        offlineManager = new OfflineSubmissionManager(getContext(), apiClient);

        TextView title = new TextView(getContext());
        title.setText("My Contributions");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 16);
        layout.addView(title);

        // Offline submissions section
        TextView offlineTitle = new TextView(getContext());
        offlineTitle.setText("Offline Submissions");
        offlineTitle.setTextSize(15);
        offlineTitle.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        offlineTitle.setPadding(0, 16, 0, 8);
        layout.addView(offlineTitle);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        statusText = new TextView(getContext());
        statusText.setPadding(0, 8, 0, 8);
        statusText.setTextSize(13);
        layout.addView(statusText);

        contentLayout = new LinearLayout(getContext());
        contentLayout.setOrientation(LinearLayout.VERTICAL);
        layout.addView(contentLayout);

        retryOfflineBtn = new Button(getContext());
        retryOfflineBtn.setText("Retry Pending");
        retryOfflineBtn.setAllCaps(false);
        retryOfflineBtn.setOnClickListener(v -> {
            int attempted = offlineManager.retryPending();
            statusText.setText(attempted > 0 ? "Retrying " + attempted + " submission(s)..." : "No submissions ready to retry.");
            refreshOfflineList();
        });
        layout.addView(retryOfflineBtn);

        // Divider
        View divider = new View(getContext());
        divider.setBackgroundColor(0xFFE0E0E0);
        LinearLayout.LayoutParams divParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 2);
        divParams.setMargins(0, 24, 0, 24);
        divider.setLayoutParams(divParams);
        layout.addView(divider);

        // Check submission status
        TextView checkTitle = new TextView(getContext());
        checkTitle.setText("Check Submission Status");
        checkTitle.setTextSize(15);
        checkTitle.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        checkTitle.setPadding(0, 0, 0, 8);
        layout.addView(checkTitle);

        submissionIdField = new EditText(getContext());
        submissionIdField.setHint("Enter submission ID (e.g. sub_abc123...)");
        submissionIdField.setSingleLine(true);
        submissionIdField.setPadding(16, 16, 16, 16);
        submissionIdField.setContentDescription("Submission ID input");
        layout.addView(submissionIdField);

        checkStatusBtn = new Button(getContext());
        checkStatusBtn.setText("Check Status");
        checkStatusBtn.setAllCaps(false);
        layout.addView(checkStatusBtn);

        statusResult = new TextView(getContext());
        statusResult.setPadding(0, 16, 0, 0);
        statusResult.setTextSize(14);
        layout.addView(statusResult);

        checkStatusBtn.setOnClickListener(v -> checkStatus());

        refreshOfflineList();
        return layout;
    }

    private void refreshOfflineList() {
        contentLayout.removeAllViews();
        List<OfflineSubmissionManager.PendingSubmission> pending = offlineManager.getPendingSubmissions();

        if (pending.isEmpty()) {
            TextView empty = new TextView(getContext());
            empty.setText("No pending offline submissions.");
            empty.setTextSize(13);
            empty.setTextColor(0xFF5F6368);
            contentLayout.addView(empty);
            return;
        }

        statusText.setText(pending.size() + " submission(s) waiting for connection");
        for (OfflineSubmissionManager.PendingSubmission ps : pending) {
            TextView card = new TextView(getContext());
            StringBuilder sb = new StringBuilder();
            sb.append("Name: ").append(ps.name != null ? ps.name : "Unknown").append("\n");
            sb.append("Status: ").append(ps.status).append("\n");
            sb.append("Retries: ").append(ps.retryCount);
            card.setText(sb.toString());
            card.setPadding(16, 16, 16, 16);
            card.setTextSize(13);
            contentLayout.addView(card);
        }
    }

    private void checkStatus() {
        String id = submissionIdField.getText().toString().trim();
        if (id.isEmpty()) {
            statusResult.setText("Please enter a submission ID.");
            return;
        }

        progressBar.setVisibility(View.VISIBLE);
        checkStatusBtn.setEnabled(false);
        statusResult.setText("Checking...");

        apiClient.getSubmissionStatus(id, new ApiClient.ApiCallback<ApiClient.SubmissionStatus>() {
            @Override
            public void onSuccess(ApiClient.SubmissionStatus result) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        checkStatusBtn.setEnabled(true);
                        StringBuilder sb = new StringBuilder();
                        sb.append("Status: ").append(result.status != null ? result.status : "unknown");
                        if (result.name != null) sb.append("\nName: ").append(result.name);
                        if (result.submittedAt != null) sb.append("\nSubmitted: ").append(result.submittedAt);
                        if (result.updatedAt != null) sb.append("\nUpdated: ").append(result.updatedAt);
                        statusResult.setText(sb.toString());
                    });
                }
            }

            @Override
            public void onError(String error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        checkStatusBtn.setEnabled(true);
                        statusResult.setText(error);
                    });
                }
            }
        });
    }
}
