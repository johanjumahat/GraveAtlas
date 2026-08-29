package com.putraworks.graveatlas.ui.alerts;

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
import com.putraworks.graveatlas.data.model.AlertDigest;
import com.putraworks.graveatlas.data.model.AlertRule;

import org.json.JSONObject;

import java.util.List;
import com.putraworks.graveatlas.data.model.Notification;

public class AlertsFragment extends Fragment {
    private ApiClient apiClient;
    private EditText ruleNameField, ruleMetricField, ruleThresholdField;
    private Button createBtn, listBtn, checkBtn, digestBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Alerts");
        title.setTextSize(20); title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); title.setPadding(0, 0, 0, 8);
        layout.addView(title);
        TextView desc = new TextView(getContext());
        desc.setText("Create alert rules, check triggered alerts, view digest.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16); layout.addView(desc);

        ruleNameField = new EditText(getContext()); ruleNameField.setHint("Rule name"); layout.addView(ruleNameField);
        ruleMetricField = new EditText(getContext()); ruleMetricField.setHint("Metric (anomaly_count_above, confidence_below...)"); layout.addView(ruleMetricField);
        ruleThresholdField = new EditText(getContext()); ruleThresholdField.setHint("Threshold value"); ruleThresholdField.setInputType(android.text.InputType.TYPE_CLASS_NUMBER); layout.addView(ruleThresholdField);

        createBtn = mkBtn("Create Alert Rule"); layout.addView(createBtn);
        listBtn = mkBtn("List Rules"); layout.addView(listBtn);
        checkBtn = mkBtn("Check Alerts"); layout.addView(checkBtn);
        digestBtn = mkBtn("Alert Digest"); layout.addView(digestBtn);

        Button deleteAlertRuleBtn = new Button(getContext());
        deleteAlertRuleBtn.setText("Delete Alert Rule");
        deleteAlertRuleBtn.setAllCaps(false);
        layout.addView(deleteAlertRuleBtn);
        Button createNotifBtn = new Button(getContext());
        createNotifBtn.setText("Create Notification");
        createNotifBtn.setAllCaps(false);
        layout.addView(createNotifBtn);
        progressBar = new ProgressBar(getContext()); progressBar.setVisibility(View.GONE); layout.addView(progressBar);
        resultText = new TextView(getContext()); resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0); layout.addView(resultText);

        createBtn.setOnClickListener(v -> createRule());
        listBtn.setOnClickListener(v -> listRules());
        checkBtn.setOnClickListener(v -> checkAlerts());
        digestBtn.setOnClickListener(v -> getDigest());

        deleteAlertRuleBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.deleteAlertRule("", new ApiClient.ApiCallback<JSONObject>() {
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

        createNotifBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.createNotification("info", "low", "Test", "Test notification", null, null, new ApiClient.ApiCallback<Notification>() {
                @Override public void onSuccess(Notification result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result.toString()); });
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

    private void createRule() {
        String name = ruleNameField.getText().toString().trim();
        String metric = ruleMetricField.getText().toString().trim();
        String threshold = ruleThresholdField.getText().toString().trim();
        if (name.isEmpty() || metric.isEmpty()) { resultText.setText("Enter name and metric"); return; }
        setBusy(true);
        double t = threshold.isEmpty() ? 0 : Double.parseDouble(threshold);
        apiClient.createAlertRule(name, metric, t, null, "quality", "warning", "Alert triggered", new ApiClient.ApiCallback<AlertRule>() {
            @Override public void onSuccess(AlertRule result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "Created"); });
            }
            @Override public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void listRules() {
        setBusy(true);
        apiClient.listAlertRules(new ApiClient.ApiCallback<List<AlertRule>>() {
            @Override public void onSuccess(List<AlertRule> result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    setBusy(false);
                    if (result == null || result.isEmpty()) { resultText.setText("No alert rules"); return; }
                    StringBuilder sb = new StringBuilder();
                    for (AlertRule r : result) sb.append(r.toString()).append("\n");
                    resultText.setText(sb.toString());
                });
            }
            @Override public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void checkAlerts() { setBusy(true); apiClient.checkAlerts(jcb()); }

    private void getDigest() {
        setBusy(true);
        apiClient.getAlertDigest(24, new ApiClient.ApiCallback<AlertDigest>() {
            @Override public void onSuccess(AlertDigest result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No alerts"); });
            }
            @Override public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
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
        for (Button b : new Button[]{createBtn, listBtn, checkBtn, digestBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Working...");
    }
}
