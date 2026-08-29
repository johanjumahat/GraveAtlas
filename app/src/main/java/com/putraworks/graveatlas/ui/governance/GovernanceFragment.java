package com.putraworks.graveatlas.ui.governance;

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
import com.putraworks.graveatlas.data.model.ComplianceReport;
import com.putraworks.graveatlas.data.model.DataClassification;
import com.putraworks.graveatlas.data.model.GovernancePolicy;

import org.json.JSONObject;

import java.util.List;
import com.putraworks.graveatlas.data.model.GovernancePolicy;

public class GovernanceFragment extends Fragment {
    private ApiClient apiClient;
    private EditText recordIdField;
    private Button policyBtn, classifyBtn, complianceBtn, auditBtn, rtbfBtn, exportBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Data Governance");
        title.setTextSize(20); title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); title.setPadding(0, 0, 0, 8);
        layout.addView(title);
        TextView desc = new TextView(getContext());
        desc.setText("Policies, classification, compliance, RTBF, personal data export.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16); layout.addView(desc);

        recordIdField = new EditText(getContext()); recordIdField.setHint("Record ID"); layout.addView(recordIdField);

        policyBtn = mkBtn("List Policies"); layout.addView(policyBtn);
        classifyBtn = mkBtn("Classify Record"); layout.addView(classifyBtn);
        complianceBtn = mkBtn("Compliance Check"); layout.addView(complianceBtn);
        auditBtn = mkBtn("Audit Trail"); layout.addView(auditBtn);
        rtbfBtn = mkBtn("Right to be Forgotten"); layout.addView(rtbfBtn);
        exportBtn = mkBtn("Export Personal Data"); layout.addView(exportBtn);

        Button createPolicyBtn = new Button(getContext());
        createPolicyBtn.setText("Create Governance Policy");
        createPolicyBtn.setAllCaps(false);
        layout.addView(createPolicyBtn);
        progressBar = new ProgressBar(getContext()); progressBar.setVisibility(View.GONE); layout.addView(progressBar);
        resultText = new TextView(getContext()); resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0); layout.addView(resultText);

        policyBtn.setOnClickListener(v -> doAction("policies"));
        classifyBtn.setOnClickListener(v -> doAction("classify"));
        complianceBtn.setOnClickListener(v -> doAction("compliance"));
        auditBtn.setOnClickListener(v -> doAction("audit"));
        rtbfBtn.setOnClickListener(v -> doAction("rtbf"));
        exportBtn.setOnClickListener(v -> doAction("export"));

        createPolicyBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.createGovernancePolicy("retention", "Test Policy", "Test description", 365, "public", new ApiClient.ApiCallback<GovernancePolicy>() {
                @Override public void onSuccess(GovernancePolicy result) {
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
        String rid = recordIdField.getText().toString().trim();
        switch (action) {
            case "policies":
                apiClient.listGovernancePolicies(new ApiClient.ApiCallback<List<GovernancePolicy>>() {
                    @Override public void onSuccess(List<GovernancePolicy> result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> {
                            setBusy(false);
                            if (result == null || result.isEmpty()) { resultText.setText("No policies"); return; }
                            StringBuilder sb = new StringBuilder();
                            for (GovernancePolicy p : result) sb.append(p.toString()).append("\n");
                            resultText.setText(sb.toString());
                        });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "classify":
                if (rid.isEmpty()) { setBusy(false); resultText.setText("Enter a Record ID"); return; }
                apiClient.classifyRecord(rid, "standard", "admin", "Routine check", new ApiClient.ApiCallback<DataClassification>() {
                    @Override public void onSuccess(DataClassification result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No result"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "compliance":
                apiClient.runComplianceCheck(new ApiClient.ApiCallback<ComplianceReport>() {
                    @Override public void onSuccess(ComplianceReport result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No report"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "audit":
                apiClient.getComplianceTrends("30d", jcb());
                break;
            case "rtbf":
                if (rid.isEmpty()) { setBusy(false); resultText.setText("Enter a Record ID"); return; }
                apiClient.rightToBeForgotten(rid, "", "delete", "admin", "User request", jcb());
                break;
            case "export":
                if (rid.isEmpty()) { setBusy(false); resultText.setText("Enter a Record ID"); return; }
                apiClient.exportPersonalData("", rid, "admin", jcb());
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
        for (Button b : new Button[]{policyBtn, classifyBtn, complianceBtn, auditBtn, rtbfBtn, exportBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Working...");
    }
}
