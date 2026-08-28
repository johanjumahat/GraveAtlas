package com.putraworks.graveatlas.ui.summaries;

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
import com.putraworks.graveatlas.data.model.CemeterySummary;
import com.putraworks.graveatlas.data.model.DatasetSummary;
import com.putraworks.graveatlas.data.model.HealthReportSummary;

import org.json.JSONObject;

public class SummariesFragment extends Fragment {
    private ApiClient apiClient;
    private EditText idField, formatField;
    private Button cemeteryBtn, recordBtn, datasetBtn, healthBtn, customBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Summaries");
        title.setTextSize(20); title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); title.setPadding(0, 0, 0, 8);
        layout.addView(title);
        TextView desc = new TextView(getContext());
        desc.setText("AI summaries for cemeteries, records, dataset, health reports, and custom queries.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16); layout.addView(desc);

        idField = new EditText(getContext()); idField.setHint("Cemetery or Record ID"); layout.addView(idField);
        formatField = new EditText(getContext()); formatField.setHint("Format (text/markdown/json)"); layout.addView(formatField);

        cemeteryBtn = mkBtn("Cemetery Summary"); layout.addView(cemeteryBtn);
        recordBtn = mkBtn("Record Summary"); layout.addView(recordBtn);
        datasetBtn = mkBtn("Dataset Summary"); layout.addView(datasetBtn);
        healthBtn = mkBtn("Health Report"); layout.addView(healthBtn);
        customBtn = mkBtn("Custom Summary"); layout.addView(customBtn);

        progressBar = new ProgressBar(getContext()); progressBar.setVisibility(View.GONE); layout.addView(progressBar);
        resultText = new TextView(getContext()); resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0); layout.addView(resultText);

        cemeteryBtn.setOnClickListener(v -> summary("cemetery"));
        recordBtn.setOnClickListener(v -> summary("record"));
        datasetBtn.setOnClickListener(v -> summary("dataset"));
        healthBtn.setOnClickListener(v -> summary("health"));
        customBtn.setOnClickListener(v -> summary("custom"));

        return layout;
    }

    private Button mkBtn(String text) { Button b = new Button(getContext()); b.setText(text); b.setAllCaps(false); return b; }

    private void summary(String type) {
        setBusy(true);
        String id = idField.getText().toString().trim();
        String fmt = formatField.getText().toString().trim();
        if (fmt.isEmpty()) fmt = "text";

        switch (type) {
            case "cemetery":
                if (id.isEmpty()) { setBusy(false); resultText.setText("Enter a cemetery ID"); return; }
                apiClient.getCemeterySummary(id, new ApiClient.ApiCallback<CemeterySummary>() {
                    @Override public void onSuccess(CemeterySummary result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No summary"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "record":
                if (id.isEmpty()) { setBusy(false); resultText.setText("Enter a record ID"); return; }
                apiClient.generateCustomSummary("record", id, fmt, jcb());
                break;
            case "dataset":
                apiClient.getDatasetSummary(new ApiClient.ApiCallback<DatasetSummary>() {
                    @Override public void onSuccess(DatasetSummary result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No summary"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "health":
                String cid = id.isEmpty() ? null : id;
                apiClient.getHealthReportSummary(cid, new ApiClient.ApiCallback<HealthReportSummary>() {
                    @Override public void onSuccess(HealthReportSummary result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No summary"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "custom":
                apiClient.generateCustomSummary("custom", id.isEmpty() ? "general" : id, fmt, jcb());
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
        for (Button b : new Button[]{cemeteryBtn, recordBtn, datasetBtn, healthBtn, customBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Generating summary...");
    }
}
