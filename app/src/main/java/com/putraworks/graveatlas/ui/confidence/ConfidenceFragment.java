package com.putraworks.graveatlas.ui.confidence;

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
import com.putraworks.graveatlas.data.model.CemeteryConfidence;
import com.putraworks.graveatlas.data.model.ConfidenceLeaderboard;
import com.putraworks.graveatlas.data.model.ConfidenceScore;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class ConfidenceFragment extends Fragment {
    private ApiClient apiClient;
    private EditText idField;
    private Button recordBtn, cemeteryBtn, batchBtn, leaderboardBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Confidence Scoring");
        title.setTextSize(20); title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); title.setPadding(0, 0, 0, 8);
        layout.addView(title);
        TextView desc = new TextView(getContext());
        desc.setText("Record/cemetery confidence, batch scoring, leaderboard.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16); layout.addView(desc);

        idField = new EditText(getContext()); idField.setHint("Record or Cemetery ID"); layout.addView(idField);

        recordBtn = mkBtn("Record Confidence"); layout.addView(recordBtn);
        cemeteryBtn = mkBtn("Cemetery Confidence"); layout.addView(cemeteryBtn);
        batchBtn = mkBtn("Batch Confidence"); layout.addView(batchBtn);
        leaderboardBtn = mkBtn("Leaderboard"); layout.addView(leaderboardBtn);

        Button batchVerifyBtn = new Button(getContext());
        batchVerifyBtn.setText("Batch Verify Sources");
        batchVerifyBtn.setAllCaps(false);
        layout.addView(batchVerifyBtn);
        progressBar = new ProgressBar(getContext()); progressBar.setVisibility(View.GONE); layout.addView(progressBar);
        resultText = new TextView(getContext()); resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0); layout.addView(resultText);

        recordBtn.setOnClickListener(v -> doAction("record"));
        cemeteryBtn.setOnClickListener(v -> doAction("cemetery"));
        batchBtn.setOnClickListener(v -> doAction("batch"));
        leaderboardBtn.setOnClickListener(v -> doAction("leaderboard"));

        batchVerifyBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.batchVerifySources(new java.util.ArrayList<>(), new ApiClient.ApiCallback<JSONObject>() {
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

        return layout;
    }

    private Button mkBtn(String text) { Button b = new Button(getContext()); b.setText(text); b.setAllCaps(false); return b; }

    private void doAction(String action) {
        setBusy(true);
        String id = idField.getText().toString().trim();
        switch (action) {
            case "record":
                if (id.isEmpty()) { setBusy(false); resultText.setText("Enter a Record ID"); return; }
                apiClient.getRecordConfidence(id, new ApiClient.ApiCallback<ConfidenceScore>() {
                    @Override public void onSuccess(ConfidenceScore result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No score"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "cemetery":
                if (id.isEmpty()) { setBusy(false); resultText.setText("Enter a Cemetery ID"); return; }
                apiClient.getCemeteryConfidence(id, new ApiClient.ApiCallback<CemeteryConfidence>() {
                    @Override public void onSuccess(CemeteryConfidence result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No score"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "batch":
                apiClient.batchConfidence(new ArrayList<>(), new ApiClient.ApiCallback<List<ConfidenceScore>>() {
                    @Override public void onSuccess(List<ConfidenceScore> result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> {
                            setBusy(false);
                            if (result == null || result.isEmpty()) { resultText.setText("No scores"); return; }
                            StringBuilder sb = new StringBuilder();
                            for (ConfidenceScore s : result) sb.append(s.toString()).append("\n");
                            resultText.setText(sb.toString());
                        });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "leaderboard":
                apiClient.getConfidenceLeaderboard(50, null, new ApiClient.ApiCallback<ConfidenceLeaderboard>() {
                    @Override public void onSuccess(ConfidenceLeaderboard result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No leaderboard"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
        }
    }

    private void setBusy(boolean busy) {
        progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
        for (Button b : new Button[]{recordBtn, cemeteryBtn, batchBtn, leaderboardBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Working...");
    }
}
