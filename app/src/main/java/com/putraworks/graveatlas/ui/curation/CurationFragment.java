package com.putraworks.graveatlas.ui.curation;

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
import com.putraworks.graveatlas.data.model.CurationQueue;
import com.putraworks.graveatlas.data.model.CurationStats;
import com.putraworks.graveatlas.data.model.CurationTask;
import com.putraworks.graveatlas.data.model.RecordLock;

import org.json.JSONObject;

import java.util.List;
import com.putraworks.graveatlas.data.model.CurationTask;

public class CurationFragment extends Fragment {
    private ApiClient apiClient;
    private EditText taskIdField, assigneeField;
    private Button createBtn, listBtn, queueBtn, statsBtn, assignBtn, completeBtn, reviewBtn, lockBtn, unlockBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Curation Workflow");
        title.setTextSize(20); title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); title.setPadding(0, 0, 0, 8);
        layout.addView(title);
        TextView desc = new TextView(getContext());
        desc.setText("Manage curation tasks, assign work, complete reviews, lock records.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16); layout.addView(desc);

        taskIdField = new EditText(getContext()); taskIdField.setHint("Task or Record ID"); layout.addView(taskIdField);
        assigneeField = new EditText(getContext()); assigneeField.setHint("Assignee"); layout.addView(assigneeField);

        createBtn = mkBtn("Create Task"); layout.addView(createBtn);
        listBtn = mkBtn("List Tasks"); layout.addView(listBtn);
        queueBtn = mkBtn("Queue"); layout.addView(queueBtn);
        statsBtn = mkBtn("Stats"); layout.addView(statsBtn);
        assignBtn = mkBtn("Assign"); layout.addView(assignBtn);
        completeBtn = mkBtn("Complete"); layout.addView(completeBtn);
        reviewBtn = mkBtn("Review"); layout.addView(reviewBtn);
        lockBtn = mkBtn("Lock Record"); layout.addView(lockBtn);
        unlockBtn = mkBtn("Unlock Record"); layout.addView(unlockBtn);

        Button getTaskBtn = new Button(getContext());
        getTaskBtn.setText("Get Curation Task");
        getTaskBtn.setAllCaps(false);
        layout.addView(getTaskBtn);
        Button velocityBtn = new Button(getContext());
        velocityBtn.setText("Curation Velocity");
        velocityBtn.setAllCaps(false);
        layout.addView(velocityBtn);
        Button correctionStatusBtn = new Button(getContext());
        correctionStatusBtn.setText("Correction Status");
        correctionStatusBtn.setAllCaps(false);
        layout.addView(correctionStatusBtn);
        progressBar = new ProgressBar(getContext()); progressBar.setVisibility(View.GONE); layout.addView(progressBar);
        resultText = new TextView(getContext()); resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0); layout.addView(resultText);

        createBtn.setOnClickListener(v -> doAction("create"));
        listBtn.setOnClickListener(v -> doAction("list"));
        queueBtn.setOnClickListener(v -> doAction("queue"));
        statsBtn.setOnClickListener(v -> doAction("stats"));
        assignBtn.setOnClickListener(v -> doAction("assign"));
        completeBtn.setOnClickListener(v -> doAction("complete"));
        reviewBtn.setOnClickListener(v -> doAction("review"));
        lockBtn.setOnClickListener(v -> doAction("lock"));
        unlockBtn.setOnClickListener(v -> doAction("unlock"));

        getTaskBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getCurationTask("", new ApiClient.ApiCallback<CurationTask>() {
                @Override public void onSuccess(CurationTask result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No data"); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });

        velocityBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getCurationVelocity(null, "30d", new ApiClient.ApiCallback<JSONObject>() {
                @Override public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); try { resultText.setText(result.toString(2)); } catch (Exception e) { resultText.setText(result.toString()); } });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });

        correctionStatusBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getCorrectionStatus("", new ApiClient.ApiCallback<ApiClient.SubmissionStatus>() {
                @Override public void onSuccess(ApiClient.SubmissionStatus result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No data"); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });

        return layout;
    }

    private Button mkBtn(String text) { Button b = new Button(getContext()); b.setText(text); b.setAllCaps(false); return b; }

    private void doAction(String action) {
        setBusy(true);
        String tid = taskIdField.getText().toString().trim();
        String assignee = assigneeField.getText().toString().trim();
        switch (action) {
            case "create":
                apiClient.createCurationTask("review", null, null, "Task", "", "normal", null, null, "admin", new ApiClient.ApiCallback<CurationTask>() {
                    @Override public void onSuccess(CurationTask result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "Created"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "list":
                apiClient.listCurationTasks(null, null, null, null, null, 50, new ApiClient.ApiCallback<List<CurationTask>>() {
                    @Override public void onSuccess(List<CurationTask> result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> {
                            setBusy(false);
                            if (result == null || result.isEmpty()) { resultText.setText("No tasks"); return; }
                            StringBuilder sb = new StringBuilder();
                            for (CurationTask t : result) sb.append(t.toString()).append("\n");
                            resultText.setText(sb.toString());
                        });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "queue":
                apiClient.getCurationQueue(50, new ApiClient.ApiCallback<CurationQueue>() {
                    @Override public void onSuccess(CurationQueue result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "Empty queue"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "stats":
                apiClient.getCurationStats(new ApiClient.ApiCallback<CurationStats>() {
                    @Override public void onSuccess(CurationStats result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No stats"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "assign":
                if (tid.isEmpty()) { setBusy(false); resultText.setText("Enter a Task ID"); return; }
                apiClient.assignTask(tid, assignee.isEmpty() ? "admin" : assignee, "admin", jcb());
                break;
            case "complete":
                if (tid.isEmpty()) { setBusy(false); resultText.setText("Enter a Task ID"); return; }
                apiClient.completeTask(tid, "admin", "", jcb());
                break;
            case "review":
                if (tid.isEmpty()) { setBusy(false); resultText.setText("Enter a Task ID"); return; }
                apiClient.reviewTask(tid, "admin", true, "", jcb());
                break;
            case "lock":
                if (tid.isEmpty()) { setBusy(false); resultText.setText("Enter a Record ID"); return; }
                apiClient.lockRecord(tid, "admin", 60, new ApiClient.ApiCallback<RecordLock>() {
                    @Override public void onSuccess(RecordLock result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "Locked"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "unlock":
                if (tid.isEmpty()) { setBusy(false); resultText.setText("Enter a Record ID"); return; }
                apiClient.unlockRecord(tid, "admin", jcb());
                break;
        }
    }

    private ApiClient.ApiCallback<JSONObject> jcb() {
        return new ApiClient.ApiCallback<JSONObject>() {
            @Override public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); try { resultText.setText(result.toString(2)); } catch (Exception e) { resultText.setText(result.toString()); } });
            }
            @Override public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        };
    }

    private void setBusy(boolean busy) {
        progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
        for (Button b : new Button[]{createBtn, listBtn, queueBtn, statsBtn, assignBtn, completeBtn, reviewBtn, lockBtn, unlockBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Working...");
    }
}
