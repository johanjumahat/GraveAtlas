package com.putraworks.graveatlas.ui.reports;

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
import com.putraworks.graveatlas.data.model.CemeteryReport;
import com.putraworks.graveatlas.data.model.GlobalReport;
import com.putraworks.graveatlas.data.model.StakeholderReport;
import com.putraworks.graveatlas.data.model.CemeteryReportSummary;
import com.putraworks.graveatlas.data.model.AnomalyReport;

public class ReportsFragment extends Fragment {

    private ApiClient apiClient;
    private EditText cemeteryIdField;
    private Button cemeteryReportBtn, globalReportBtn;
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
        title.setText("Quality Reports"); title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        cemeteryIdField = new EditText(getContext());
        cemeteryIdField.setHint("Cemetery ID (leave empty for global)");
        layout.addView(cemeteryIdField);

        LinearLayout btnRow = new LinearLayout(getContext());
        btnRow.setOrientation(LinearLayout.HORIZONTAL);

        cemeteryReportBtn = new Button(getContext());
        cemeteryReportBtn.setText("Cemetery Report"); cemeteryReportBtn.setAllCaps(false);
        cemeteryReportBtn.setOnClickListener(v -> loadCemeteryReport());
        btnRow.addView(cemeteryReportBtn);

        globalReportBtn = new Button(getContext());
        globalReportBtn.setText("Global Report"); globalReportBtn.setAllCaps(false);
        globalReportBtn.setOnClickListener(v -> loadGlobalReport());
        btnRow.addView(globalReportBtn);
        layout.addView(btnRow);

        Button stakeholderBtn = new Button(getContext());
        stakeholderBtn.setText("Stakeholder Report");
        stakeholderBtn.setAllCaps(false);
        layout.addView(stakeholderBtn);

        Button summaryBtn = new Button(getContext());
        summaryBtn.setText("Report Summary");
        summaryBtn.setAllCaps(false);
        layout.addView(summaryBtn);

        Button anomaliesBtn = new Button(getContext());
        anomaliesBtn.setText("Cemetery Anomalies");
        anomaliesBtn.setAllCaps(false);
        layout.addView(anomaliesBtn);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        resultText = new TextView(getContext());
        resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0);
        layout.addView(resultText);

        loadGlobalReport();
        stakeholderBtn.setOnClickListener(v -> {
            setBusy(true);
            String cid = cemeteryIdField.getText().toString().trim();
            apiClient.getStakeholderReport(cid.isEmpty() ? null : cid, "30d", new ApiClient.ApiCallback<StakeholderReport>() {
                @Override public void onSuccess(StakeholderReport result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No report"); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });

        summaryBtn.setOnClickListener(v -> {
            setBusy(true);
            String cid = cemeteryIdField.getText().toString().trim();
            if (cid.isEmpty()) { setBusy(false); resultText.setText("Enter a Cemetery ID"); return; }
            apiClient.getCemeteryReportSummary(cid, new ApiClient.ApiCallback<CemeteryReportSummary>() {
                @Override public void onSuccess(CemeteryReportSummary result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No summary"); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });

        anomaliesBtn.setOnClickListener(v -> {
            setBusy(true);
            String cid = cemeteryIdField.getText().toString().trim();
            if (cid.isEmpty()) { setBusy(false); resultText.setText("Enter a Cemetery ID"); return; }
            apiClient.getCemeteryAnomalies(cid, new ApiClient.ApiCallback<AnomalyReport>() {
                @Override public void onSuccess(AnomalyReport result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No anomalies"); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });

        return layout;
    }

    private void loadCemeteryReport() {
        String id = cemeteryIdField.getText().toString().trim();
        if (id.isEmpty()) { resultText.setText("Enter a cemetery ID"); return; }

        progressBar.setVisibility(View.VISIBLE);
        cemeteryReportBtn.setEnabled(false);
        resultText.setText("Loading cemetery report...");

        apiClient.getCemeteryReport(id, new ApiClient.ApiCallback<CemeteryReport>() {
            @Override
            public void onSuccess(CemeteryReport result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    cemeteryReportBtn.setEnabled(true);
                    StringBuilder sb = new StringBuilder();
                    sb.append("Cemetery: ").append(result.cemeteryName != null ? result.cemeteryName : id).append("\n");
                    sb.append("Records: ").append(result.recordCount).append("\n");
                    if (result.contentCoverage != null) {
                        sb.append("\nContent Coverage:\n");
                        sb.append("  Photos: ").append(result.contentCoverage.withPhotos).append("\n");
                        sb.append("  Inscriptions: ").append(result.contentCoverage.withInscriptions).append("\n");
                        sb.append("  Sources: ").append(result.contentCoverage.withSources).append("\n");
                        sb.append("  Coordinates: ").append(result.contentCoverage.withCoordinates).append("\n");
                        sb.append("  Sections: ").append(result.contentCoverage.withSection).append("\n");
                        sb.append("  Plots: ").append(result.contentCoverage.withPlot);
                    }
                    resultText.setText(sb.toString());
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    cemeteryReportBtn.setEnabled(true);
                    resultText.setText("Error: " + error);
                });
            }
        });
    }

    private void loadGlobalReport() {
        progressBar.setVisibility(View.VISIBLE);
        globalReportBtn.setEnabled(false);
        resultText.setText("Loading global report...");

        apiClient.getGlobalReport(new ApiClient.ApiCallback<GlobalReport>() {
            @Override
            public void onSuccess(GlobalReport result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    globalReportBtn.setEnabled(true);
                    StringBuilder sb = new StringBuilder();
                    sb.append("Global Quality Report\n\n");
                    sb.append("Total Cemeteries: ").append(result.totalCemeteries).append("\n");
                    sb.append("Total Records: ").append(result.totalRecords).append("\n");
                    if (result.globalContentCoverage != null) {
                        sb.append("\nCoverage:\n");
                        sb.append("  With Photos: ").append(result.globalContentCoverage.totalWithPhotos).append("\n");
                        sb.append("  With Sources: ").append(result.globalContentCoverage.totalWithSources).append("\n");
                        sb.append("  With Inscriptions: ").append(result.globalContentCoverage.totalWithInscriptions).append("\n");
                        sb.append("  With Coordinates: ").append(result.globalContentCoverage.totalWithCoordinates).append("\n");
                        sb.append("  With Birth Date: ").append(result.globalContentCoverage.totalWithBirthDate);
                    }
                    resultText.setText(sb.toString());
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    globalReportBtn.setEnabled(true);
                    resultText.setText("Error: " + error);
                });
            }
        });
    }

    private void setBusy(boolean busy) {
        if (progressBar != null) progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
    }

}
