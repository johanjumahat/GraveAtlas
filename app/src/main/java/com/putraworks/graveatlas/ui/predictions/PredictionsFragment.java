package com.putraworks.graveatlas.ui.predictions;

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

import org.json.JSONObject;

public class PredictionsFragment extends Fragment {
    private ApiClient apiClient;
    private EditText cemeteryIdField, horizonField;
    private Button healthBtn, anomalyBtn, curationBtn, growthBtn, riskBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Predictions & Forecasting");
        title.setTextSize(20); title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); title.setPadding(0, 0, 0, 8);
        layout.addView(title);
        TextView desc = new TextView(getContext());
        desc.setText("Health, anomaly, curation forecasts; data growth projections; risk assessments.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16); layout.addView(desc);

        cemeteryIdField = new EditText(getContext()); cemeteryIdField.setHint("Cemetery ID (empty = global)"); layout.addView(cemeteryIdField);
        horizonField = new EditText(getContext()); horizonField.setHint("Horizon days (default 30)"); horizonField.setInputType(android.text.InputType.TYPE_CLASS_NUMBER); layout.addView(horizonField);

        healthBtn = mkBtn("Health Forecast"); layout.addView(healthBtn);
        anomalyBtn = mkBtn("Anomaly Forecast"); layout.addView(anomalyBtn);
        curationBtn = mkBtn("Curation Forecast"); layout.addView(curationBtn);
        growthBtn = mkBtn("Data Growth"); layout.addView(growthBtn);
        riskBtn = mkBtn("Risk Assessment"); layout.addView(riskBtn);

        progressBar = new ProgressBar(getContext()); progressBar.setVisibility(View.GONE); layout.addView(progressBar);
        resultText = new TextView(getContext()); resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0); layout.addView(resultText);

        healthBtn.setOnClickListener(v -> predict("health"));
        anomalyBtn.setOnClickListener(v -> predict("anomaly"));
        curationBtn.setOnClickListener(v -> predict("curation"));
        growthBtn.setOnClickListener(v -> predict("growth"));
        riskBtn.setOnClickListener(v -> predict("risk"));

        return layout;
    }

    private Button mkBtn(String text) { Button b = new Button(getContext()); b.setText(text); b.setAllCaps(false); return b; }

    private void predict(String type) {
        setBusy(true);
        String cid = cemeteryIdField.getText().toString().trim();
        String h = horizonField.getText().toString().trim();
        int horizon = h.isEmpty() ? 30 : Integer.parseInt(h);
        String c = cid.isEmpty() ? null : cid;
        ApiClient.ApiCallback<JSONObject> cb = new ApiClient.ApiCallback<JSONObject>() {
            @Override public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); try { resultText.setText(result.toString(2)); } catch (Exception e) { resultText.setText(result.toString()); } });
            }
            @Override public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        };
        switch (type) {
            case "health": apiClient.getHealthForecast(c, horizon, cb); break;
            case "anomaly": apiClient.getAnomalyForecast(c, horizon, cb); break;
            case "curation": apiClient.getCurationForecast(c, horizon, cb); break;
            case "growth": apiClient.getDataGrowthForecast(horizon, cb); break;
            case "risk": apiClient.getRiskAssessment(c, cb); break;
        }
    }

    private void setBusy(boolean busy) {
        progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
        for (Button b : new Button[]{healthBtn, anomalyBtn, curationBtn, growthBtn, riskBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Forecasting...");
    }
}
