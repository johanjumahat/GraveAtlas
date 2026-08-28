package com.putraworks.graveatlas.ui.sources;

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
import com.putraworks.graveatlas.data.model.RecordSourceVerification;
import com.putraworks.graveatlas.data.model.SourceVerification;
import com.putraworks.graveatlas.data.model.SourceVerificationStatus;

public class SourceVerificationFragment extends Fragment {

    private ApiClient apiClient;
    private EditText recordIdField;
    private Button verifyBtn, statusBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Source Verification"); title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView desc = new TextView(getContext());
        desc.setText("Check if source URLs on records are still live, dead, restricted, or archived.\nChecks URL liveness via HEAD request and queries Wayback Machine for archived copies.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16);
        layout.addView(desc);

        recordIdField = new EditText(getContext());
        recordIdField.setHint("Record ID (leave empty for global status)");
        layout.addView(recordIdField);

        verifyBtn = new Button(getContext());
        verifyBtn.setText("Verify Record Sources"); verifyBtn.setAllCaps(false);
        verifyBtn.setOnClickListener(v -> verifySources());
        layout.addView(verifyBtn);

        statusBtn = new Button(getContext());
        statusBtn.setText("Global Source Status"); statusBtn.setAllCaps(false);
        statusBtn.setOnClickListener(v -> globalStatus());
        layout.addView(statusBtn);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        resultText = new TextView(getContext());
        resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0);
        layout.addView(resultText);

        globalStatus();
        return layout;
    }

    private void verifySources() {
        String id = recordIdField.getText().toString().trim();
        if (id.isEmpty()) { resultText.setText("Enter a record ID"); return; }

        progressBar.setVisibility(View.VISIBLE);
        verifyBtn.setEnabled(false);
        resultText.setText("Verifying sources...");

        apiClient.verifyRecordSources(id, new ApiClient.ApiCallback<RecordSourceVerification>() {
            @Override
            public void onSuccess(RecordSourceVerification result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    verifyBtn.setEnabled(true);
                    StringBuilder sb = new StringBuilder();
                    sb.append("Record: ").append(result.recordName != null ? result.recordName : result.recordId).append("\n");
                    sb.append("Total Sources: ").append(result.totalSources).append("\n\n");
                    if (result.results != null) {
                        sb.append("Source Details:\n");
                        for (SourceVerification s : result.results) {
                            sb.append("  ").append(s.url != null ? s.url : "?").append("\n");
                            sb.append("    Status: ").append(s.status != null ? s.status : "?").append("\n");
                        }
                    }
                    resultText.setText(sb.toString());
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    verifyBtn.setEnabled(true);
                    resultText.setText("Error: " + error);
                });
            }
        });
    }

    private void globalStatus() {
        progressBar.setVisibility(View.VISIBLE);
        statusBtn.setEnabled(false);

        apiClient.getSourceVerificationStatus(new ApiClient.ApiCallback<SourceVerificationStatus>() {
            @Override
            public void onSuccess(SourceVerificationStatus result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    statusBtn.setEnabled(true);
                    StringBuilder sb = new StringBuilder();
                    sb.append("Global Source Health:\n\n");
                    sb.append("Total Records: ").append(result.totalRecords).append("\n");
                    sb.append("Records with Sources: ").append(result.recordsWithSources).append("\n");
                    sb.append("Total Source Refs: ").append(result.totalSourceRefs).append("\n");
                    sb.append("Unique URLs Checked: ").append(result.uniqueUrlsChecked).append("\n");
                    sb.append("Live URLs: ").append(result.liveUrls).append("\n");
                    sb.append("Dead URLs: ").append(result.deadUrls).append("\n");
                    sb.append("Source Health Score: ").append(result.sourceHealthScore).append("/100\n");
                    sb.append("Status: ").append(result.getStatusLine());
                    resultText.setText(sb.toString());
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    statusBtn.setEnabled(true);
                    resultText.setText("Error: " + error);
                });
            }
        });
    }
}
