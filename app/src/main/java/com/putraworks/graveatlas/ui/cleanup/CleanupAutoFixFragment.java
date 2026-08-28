package com.putraworks.graveatlas.ui.cleanup;

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
import com.putraworks.graveatlas.data.model.CemeteryAutoFixResult;
import com.putraworks.graveatlas.data.model.CleanupResult;
import com.putraworks.graveatlas.data.model.GlobalCleanupResult;
import com.putraworks.graveatlas.data.model.RecordAutoFixResult;

import org.json.JSONObject;

public class CleanupAutoFixFragment extends Fragment {
    private ApiClient apiClient;
    private EditText cemeteryIdField, recordIdField;
    private Button autoFixPreviewBtn, autoFixCemeteryBtn, autoFixRecordBtn, autoFixApplyBtn;
    private Button cleanupPreviewBtn, cleanupBtn, globalCleanupBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Cleanup & AutoFix");
        title.setTextSize(20); title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); title.setPadding(0, 0, 0, 8);
        layout.addView(title);
        TextView desc = new TextView(getContext());
        desc.setText("Auto-fix data quality issues, preview and run cleanups.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16); layout.addView(desc);

        cemeteryIdField = new EditText(getContext()); cemeteryIdField.setHint("Cemetery ID"); layout.addView(cemeteryIdField);
        recordIdField = new EditText(getContext()); recordIdField.setHint("Record ID"); layout.addView(recordIdField);

        TextView al = new TextView(getContext()); al.setText("AutoFix"); al.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); al.setPadding(0, 16, 0, 8); layout.addView(al);
        autoFixPreviewBtn = mkBtn("Preview Cemetery AutoFix"); layout.addView(autoFixPreviewBtn);
        autoFixCemeteryBtn = mkBtn("Apply Cemetery AutoFix"); layout.addView(autoFixCemeteryBtn);
        autoFixRecordBtn = mkBtn("Record AutoFix Proposals"); layout.addView(autoFixRecordBtn);
        autoFixApplyBtn = mkBtn("Apply Record AutoFix"); layout.addView(autoFixApplyBtn);

        TextView cl = new TextView(getContext()); cl.setText("Cleanup"); cl.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); cl.setPadding(0, 16, 0, 8); layout.addView(cl);
        cleanupPreviewBtn = mkBtn("Preview Cleanup"); layout.addView(cleanupPreviewBtn);
        cleanupBtn = mkBtn("Run Cemetery Cleanup"); layout.addView(cleanupBtn);
        globalCleanupBtn = mkBtn("Global Cleanup"); layout.addView(globalCleanupBtn);

        progressBar = new ProgressBar(getContext()); progressBar.setVisibility(View.GONE); layout.addView(progressBar);
        resultText = new TextView(getContext()); resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0); layout.addView(resultText);

        autoFixPreviewBtn.setOnClickListener(v -> doAction("autofix-preview"));
        autoFixCemeteryBtn.setOnClickListener(v -> doAction("autofix-cemetery"));
        autoFixRecordBtn.setOnClickListener(v -> doAction("autofix-record"));
        autoFixApplyBtn.setOnClickListener(v -> doAction("autofix-apply"));
        cleanupPreviewBtn.setOnClickListener(v -> doAction("cleanup-preview"));
        cleanupBtn.setOnClickListener(v -> doAction("cleanup"));
        globalCleanupBtn.setOnClickListener(v -> doAction("global-cleanup"));

        return layout;
    }

    private Button mkBtn(String text) { Button b = new Button(getContext()); b.setText(text); b.setAllCaps(false); return b; }

    private void doAction(String action) {
        setBusy(true);
        String cid = cemeteryIdField.getText().toString().trim();
        String rid = recordIdField.getText().toString().trim();
        switch (action) {
            case "autofix-preview":
                if (cid.isEmpty()) { setBusy(false); resultText.setText("Enter a Cemetery ID"); return; }
                apiClient.previewCemeteryAutoFix(cid, jcb());
                break;
            case "autofix-cemetery":
                if (cid.isEmpty()) { setBusy(false); resultText.setText("Enter a Cemetery ID"); return; }
                apiClient.applyCemeteryAutoFix(cid, false, null, new ApiClient.ApiCallback<CemeteryAutoFixResult>() {
                    @Override public void onSuccess(CemeteryAutoFixResult result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No result"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "autofix-record":
                if (rid.isEmpty()) { setBusy(false); resultText.setText("Enter a Record ID"); return; }
                apiClient.getRecordAutoFixProposals(rid, jcb());
                break;
            case "autofix-apply":
                if (rid.isEmpty()) { setBusy(false); resultText.setText("Enter a Record ID"); return; }
                apiClient.applyRecordAutoFix(rid, null, new ApiClient.ApiCallback<RecordAutoFixResult>() {
                    @Override public void onSuccess(RecordAutoFixResult result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No result"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "cleanup-preview":
                if (cid.isEmpty()) { setBusy(false); resultText.setText("Enter a Cemetery ID"); return; }
                apiClient.previewCemeteryCleanup(cid, jcb());
                break;
            case "cleanup":
                if (cid.isEmpty()) { setBusy(false); resultText.setText("Enter a Cemetery ID"); return; }
                apiClient.runCemeteryCleanup(cid, false, null, new ApiClient.ApiCallback<CleanupResult>() {
                    @Override public void onSuccess(CleanupResult result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No result"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "global-cleanup":
                apiClient.runGlobalCleanup(new ApiClient.ApiCallback<GlobalCleanupResult>() {
                    @Override public void onSuccess(GlobalCleanupResult result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No result"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
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
        for (Button b : new Button[]{autoFixPreviewBtn, autoFixCemeteryBtn, autoFixRecordBtn, autoFixApplyBtn, cleanupPreviewBtn, cleanupBtn, globalCleanupBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Working...");
    }
}
