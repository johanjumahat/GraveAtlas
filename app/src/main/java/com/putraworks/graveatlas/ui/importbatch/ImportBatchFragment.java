package com.putraworks.graveatlas.ui.importbatch;

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
import com.putraworks.graveatlas.data.model.ImportBatchReport;
import com.putraworks.graveatlas.data.model.ImportQualityScore;

import org.json.JSONArray;

public class ImportBatchFragment extends Fragment {
    private ApiClient apiClient;
    private EditText cemeteryIdField;
    private Button scoreBtn, reportBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Import Scoring");
        title.setTextSize(20); title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); title.setPadding(0, 0, 0, 8);
        layout.addView(title);
        TextView desc = new TextView(getContext());
        desc.setText("Score import quality and generate batch reports before loading data.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16); layout.addView(desc);

        cemeteryIdField = new EditText(getContext()); cemeteryIdField.setHint("Cemetery ID"); layout.addView(cemeteryIdField);

        scoreBtn = mkBtn("Score Import"); layout.addView(scoreBtn);
        reportBtn = mkBtn("Batch Report"); layout.addView(reportBtn);

        progressBar = new ProgressBar(getContext()); progressBar.setVisibility(View.GONE); layout.addView(progressBar);
        resultText = new TextView(getContext()); resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0); layout.addView(resultText);

        scoreBtn.setOnClickListener(v -> score());
        reportBtn.setOnClickListener(v -> report());

        return layout;
    }

    private Button mkBtn(String text) { Button b = new Button(getContext()); b.setText(text); b.setAllCaps(false); return b; }

    private void score() {
        setBusy(true);
        apiClient.scoreImportBatch(new JSONArray(), "default", new ApiClient.ApiCallback<ImportQualityScore>() {
            @Override public void onSuccess(ImportQualityScore result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No score"); });
            }
            @Override public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void report() {
        setBusy(true);
        apiClient.getImportBatchReport(new JSONArray(), "default", "CC-BY", new ApiClient.ApiCallback<ImportBatchReport>() {
            @Override public void onSuccess(ImportBatchReport result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No report"); });
            }
            @Override public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void setBusy(boolean busy) {
        progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
        for (Button b : new Button[]{scoreBtn, reportBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Working...");
    }
}
