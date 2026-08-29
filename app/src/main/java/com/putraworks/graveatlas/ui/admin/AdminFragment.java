package com.putraworks.graveatlas.ui.admin;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.R;

import org.json.JSONObject;

/**
 * Admin Panel — wire 34 admin backend endpoints.
 * Dashboard, submissions, corrections, reports, audit, users, imports, abuse, publications.
 */
public class AdminFragment extends Fragment {
    private ApiClient apiClient;
    private ProgressBar progressBar;
    private TextView resultText;
    private EditText idField, jsonField;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        apiClient = new ApiClient();

        ScrollView scroll = new ScrollView(getContext());
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        layout.setPadding(pad, pad, pad, pad);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        // Shared ID + JSON input fields
        idField = addField(layout, "ID (submission / correction / report / user / import / record)");
        jsonField = addField(layout, "JSON body (optional — for POST actions)");

        // ---- Dashboard & Status ----
        addTitle(layout, "Dashboard & Status");
        addButton(layout, "Admin Dashboard", v -> { setBusy(true); apiClient.getAdminDashboard(cb()); });
        addButton(layout, "System Status", v -> { setBusy(true); apiClient.getAdminStatus(cb()); });
        addButton(layout, "Data Quality", v -> { setBusy(true); apiClient.getAdminDataQuality(cb()); });
        addButton(layout, "Contributors", v -> { setBusy(true); apiClient.getAdminContributors(cb()); });

        // ---- Submissions ----
        addTitle(layout, "Submissions");
        addButton(layout, "List Submissions", v -> { setBusy(true); apiClient.getAdminSubmissions(cb()); });
        addButton(layout, "Approve Submission", v -> { setBusy(true); apiClient.approveSubmission(idField.getText().toString().trim(), cb()); });
        addButton(layout, "Reject Submission", v -> { setBusy(true); apiClient.rejectSubmission(idField.getText().toString().trim(), parseJson(), cb()); });

        // ---- Corrections ----
        addTitle(layout, "Corrections");
        addButton(layout, "List Corrections", v -> { setBusy(true); apiClient.getAdminCorrections(cb()); });
        addButton(layout, "Approve Correction", v -> { setBusy(true); apiClient.approveCorrection(idField.getText().toString().trim(), cb()); });
        addButton(layout, "Reject Correction", v -> { setBusy(true); apiClient.rejectCorrection(idField.getText().toString().trim(), parseJson(), cb()); });

        // ---- Reports ----
        addTitle(layout, "Reports");
        addButton(layout, "List Reports", v -> { setBusy(true); apiClient.getAdminReports(cb()); });
        addButton(layout, "Resolve Report", v -> { setBusy(true); apiClient.resolveReport(idField.getText().toString().trim(), parseJson(), cb()); });
        addButton(layout, "Reject Report", v -> { setBusy(true); apiClient.rejectReport(idField.getText().toString().trim(), parseJson(), cb()); });

        // ---- Audit ----
        addTitle(layout, "Audit");
        addButton(layout, "Audit Log", v -> { setBusy(true); apiClient.getAdminAudit(cb()); });
        addButton(layout, "Entity Audit Trail", v -> { setBusy(true); apiClient.getAdminAuditTrail(idField.getText().toString().trim(), cb()); });

        // ---- Users ----
        addTitle(layout, "Users");
        addButton(layout, "List Users", v -> { setBusy(true); apiClient.getAdminUsers(cb()); });
        addButton(layout, "Set User Role", v -> { setBusy(true); apiClient.setUserRole(idField.getText().toString().trim(), parseJson(), cb()); });

        // ---- Contributions ----
        addTitle(layout, "Contributions");
        addButton(layout, "List Contributions", v -> { setBusy(true); apiClient.getAdminContributions(cb()); });
        addButton(layout, "Get Moderation Notes", v -> { setBusy(true); apiClient.getModerationNotes(idField.getText().toString().trim(), cb()); });
        addButton(layout, "Add Moderation Note", v -> { setBusy(true); apiClient.addModerationNote(idField.getText().toString().trim(), parseJson(), cb()); });

        // ---- Abuse ----
        addTitle(layout, "Abuse Management");
        addButton(layout, "Abuse Log", v -> { setBusy(true); apiClient.getAdminAbuseLog(cb()); });
        addButton(layout, "Abuse Stats", v -> { setBusy(true); apiClient.getAdminAbuseStats(cb()); });
        addButton(layout, "Ban Account", v -> { setBusy(true); apiClient.banAccount(idField.getText().toString().trim(), cb()); });

        // ---- Cemetery Management ----
        addTitle(layout, "Cemetery Management");
        addButton(layout, "Create Cemetery (Admin)", v -> { setBusy(true); apiClient.adminCreateCemetery(parseJson(), cb()); });
        addButton(layout, "Restore Record", v -> { setBusy(true); apiClient.restoreRecord(idField.getText().toString().trim(), cb()); });

        // ---- Publications ----
        addTitle(layout, "Publications");
        addButton(layout, "Publication Status", v -> { setBusy(true); apiClient.getPublicationStatus(idField.getText().toString().trim(), cb()); });
        addButton(layout, "Retry Publication", v -> { setBusy(true); apiClient.retryPublication(idField.getText().toString().trim(), cb()); });

        // ---- Imports ----
        addTitle(layout, "Import Management");
        addButton(layout, "List Imports", v -> { setBusy(true); apiClient.getAdminImports(cb()); });
        addButton(layout, "Get Import", v -> { setBusy(true); apiClient.getAdminImport(idField.getText().toString().trim(), cb()); });
        addButton(layout, "Import Sources", v -> { setBusy(true); apiClient.getAdminImportSources(cb()); });
        addButton(layout, "Moderation Config", v -> { setBusy(true); apiClient.getAdminImportModerationConfig(cb()); });
        addButton(layout, "Trigger Import", v -> { setBusy(true); apiClient.triggerAdminImport(parseJson(), cb()); });
        addButton(layout, "Approve Import", v -> { setBusy(true); apiClient.approveImport(idField.getText().toString().trim(), cb()); });
        addButton(layout, "Reject Import", v -> { setBusy(true); apiClient.rejectImport(idField.getText().toString().trim(), parseJson(), cb()); });

        // ---- Result Display ----
        resultText = new TextView(getContext());
        resultText.setPadding(0, pad, 0, pad);
        resultText.setTextSize(13);
        resultText.setText("Use the buttons above. Enter an ID in the field at top for parameterized actions.");
        layout.addView(resultText);

        scroll.addView(layout);
        return scroll;
    }

    private JSONObject parseJson() {
        try { return new JSONObject(jsonField.getText().toString().trim()); } catch (Exception e) { return new JSONObject(); }
    }

    private ApiClient.ApiCallback<JSONObject> cb() {
        return new ApiClient.ApiCallback<JSONObject>() {
            @Override public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); showJson(result); });
            }
            @Override public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        };
    }

    private void addTitle(LinearLayout layout, String title) {
        TextView tv = new TextView(getContext());
        tv.setText(title);
        tv.setTextSize(16);
        tv.setTypeface(tv.getTypeface(), android.graphics.Typeface.BOLD);
        int pad = (int) (8 * getResources().getDisplayMetrics().density);
        tv.setPadding(0, pad, 0, pad);
        layout.addView(tv);
    }

    private EditText addField(LinearLayout layout, String hint) {
        EditText et = new EditText(getContext());
        et.setHint(hint);
        layout.addView(et);
        return et;
    }

    private void addButton(LinearLayout layout, String label, View.OnClickListener listener) {
        Button btn = new Button(getContext());
        btn.setText(label);
        btn.setOnClickListener(listener);
        layout.addView(btn);
    }

    private void showJson(JSONObject result) {
        if (result == null) { resultText.setText("No data"); return; }
        try { resultText.setText(result.toString(2)); }
        catch (Exception e) { resultText.setText(result.toString()); }
    }

    private void setBusy(boolean busy) {
        if (progressBar != null) progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
    }
}
