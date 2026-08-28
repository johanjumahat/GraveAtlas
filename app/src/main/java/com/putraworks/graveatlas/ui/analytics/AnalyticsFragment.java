package com.putraworks.graveatlas.ui.analytics;

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

import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.model.AnalyticsDashboard;
import com.putraworks.graveatlas.data.model.CemeteryHealthAnalytics;
import com.putraworks.graveatlas.data.model.GlobalHealthOverview;

import org.json.JSONObject;

import java.util.List;

public class AnalyticsFragment extends Fragment {

    private ApiClient apiClient;
    private ProgressBar progressBar;
    private TextView dashboardText, healthText;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Analytics Dashboard");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 16);
        layout.addView(title);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.VISIBLE);
        layout.addView(progressBar);

        TextView dashTitle = new TextView(getContext());
        dashTitle.setText("Overview"); dashTitle.setTextSize(16);
        dashTitle.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        dashTitle.setPadding(0, 16, 0, 8);
        layout.addView(dashTitle);

        dashboardText = new TextView(getContext());
        dashboardText.setTextSize(13); dashboardText.setPadding(0, 8, 0, 16);
        layout.addView(dashboardText);

        TextView healthTitle = new TextView(getContext());
        healthTitle.setText("Cemetery Health Overview"); healthTitle.setTextSize(16);
        healthTitle.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        healthTitle.setPadding(0, 16, 0, 8);
        layout.addView(healthTitle);

        healthText = new TextView(getContext());
        healthText.setTextSize(13); healthText.setPadding(0, 8, 0, 16);
        layout.addView(healthText);

        TextView chTitle = new TextView(getContext());
        chTitle.setText("Per-Cemetery Health"); chTitle.setTextSize(16);
        chTitle.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        chTitle.setPadding(0, 16, 0, 8);
        layout.addView(chTitle);

        LinearLayout cemeteryHealthList = new LinearLayout(getContext());
        cemeteryHealthList.setOrientation(LinearLayout.VERTICAL);
        layout.addView(cemeteryHealthList);

        loadDashboard(cemeteryHealthList);
        return layout;
    }

    private void loadDashboard(LinearLayout cemeteryList) {
        apiClient.getAnalyticsDashboard(null, "30d", new ApiClient.ApiCallback<AnalyticsDashboard>() {
            @Override
            public void onSuccess(AnalyticsDashboard result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    StringBuilder sb = new StringBuilder();
                    if (result.summary != null) {
                        sb.append("Total Records: ").append(result.summary.totalRecords).append("\n");
                        sb.append("Verified: ").append(result.summary.verifiedRecords).append("\n");
                        sb.append("Verification Rate: ").append(result.summary.verificationRate).append("%\n");
                        sb.append("Source Coverage: ").append(result.summary.sourceCoverage).append("%\n");
                        sb.append("Coordinate Coverage: ").append(result.summary.coordinateCoverage).append("%\n");
                        sb.append("Anomaly Rate: ").append(result.summary.anomalyRate).append("%");
                    }
                    dashboardText.setText(sb.toString());
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    dashboardText.setText("Error: " + error);
                });
            }
        });

        apiClient.getGlobalHealthOverview(new ApiClient.ApiCallback<GlobalHealthOverview>() {
            @Override
            public void onSuccess(GlobalHealthOverview result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    StringBuilder sb = new StringBuilder();
                    sb.append("Global Grade: ").append(result.globalGrade != null ? result.globalGrade : "N/A").append("\n");
                    sb.append("Total Cemeteries: ").append(result.totalCemeteries).append("\n");
                    sb.append("Total Records: ").append(result.totalRecords).append("\n");
                    sb.append("Critical Issues: ").append(result.criticalIssues).append("\n");
                    sb.append("Content Average: ").append(result.contentAverage);
                    if (result.contentCoverage != null) {
                        sb.append("\n\nCoverage:\n");
                        sb.append("  Photo: ").append(result.contentCoverage.photoCoverage).append("%\n");
                        sb.append("  Inscription: ").append(result.contentCoverage.inscriptionCoverage).append("%\n");
                        sb.append("  Source: ").append(result.contentCoverage.sourceCoverage).append("%\n");
                        sb.append("  Coordinate: ").append(result.contentCoverage.coordinateCoverage).append("%");
                    }
                    healthText.setText(sb.toString());
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> healthText.setText("Error: " + error));
            }
        });

        apiClient.getCemeteryHealth(20, new ApiClient.ApiCallback<List<CemeteryHealthAnalytics>>() {
            @Override
            public void onSuccess(List<CemeteryHealthAnalytics> result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    for (CemeteryHealthAnalytics ch : result) {
                        TextView tv = new TextView(getContext());
                        tv.setText((ch.cemeteryId != null ? ch.cemeteryId : "?") + ": " + ch.grade + " (" + ch.healthScore + ")");
                        tv.setTextSize(13); tv.setPadding(16, 8, 16, 8);
                        cemeteryList.addView(tv);
                    }
                });
            }
            @Override
            public void onError(String error) {}
        });
    }
}
