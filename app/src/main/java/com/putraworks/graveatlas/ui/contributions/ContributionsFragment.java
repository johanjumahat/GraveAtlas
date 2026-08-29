package com.putraworks.graveatlas.ui.contributions;

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

import org.json.JSONObject;

/**
 * Contributions & Drafts — wire 12 backend endpoints for user contributions and draft management.
 */
public class ContributionsFragment extends Fragment {
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

        idField = addField(layout, "ID (contribution or draft)");
        jsonField = addField(layout, "JSON body (for create/update actions)");

        // ---- Contributions ----
        addTitle(layout, "Contributions");
        addButton(layout, "List Contributions", v -> { setBusy(true); apiClient.listContributions(cb()); });
        addButton(layout, "Create Contribution", v -> { setBusy(true); apiClient.createContribution(parseJson(), cb()); });
        addButton(layout, "Get Contribution", v -> { setBusy(true); apiClient.getContribution(idField.getText().toString().trim(), cb()); });
        addButton(layout, "Cancel Contribution", v -> { setBusy(true); apiClient.cancelContribution(idField.getText().toString().trim(), cb()); });
        addButton(layout, "Check Duplicate", v -> { setBusy(true); apiClient.checkContributionDuplicate(parseJson(), cb()); });

        // ---- Drafts ----
        addTitle(layout, "Drafts");
        addButton(layout, "List Drafts", v -> { setBusy(true); apiClient.listDrafts(cb()); });
        addButton(layout, "Create Draft", v -> { setBusy(true); apiClient.createDraft(parseJson(), cb()); });
        addButton(layout, "Get Draft", v -> { setBusy(true); apiClient.getDraft(idField.getText().toString().trim(), cb()); });
        addButton(layout, "Update Draft", v -> { setBusy(true); apiClient.updateDraft(idField.getText().toString().trim(), parseJson(), cb()); });
        addButton(layout, "Delete Draft", v -> { setBusy(true); apiClient.deleteDraft(idField.getText().toString().trim(), cb()); });
        addButton(layout, "Submit Draft for Review", v -> { setBusy(true); apiClient.submitDraft(idField.getText().toString().trim(), cb()); });

        // ---- Result ----
        resultText = new TextView(getContext());
        resultText.setPadding(0, pad, 0, pad);
        resultText.setTextSize(13);
        resultText.setText("Use the buttons above. Enter an ID for parameterized actions.");
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
        tv.setText(title); tv.setTextSize(16);
        tv.setTypeface(tv.getTypeface(), android.graphics.Typeface.BOLD);
        int pad = (int) (8 * getResources().getDisplayMetrics().density);
        tv.setPadding(0, pad, 0, pad);
        layout.addView(tv);
    }

    private EditText addField(LinearLayout layout, String hint) {
        EditText et = new EditText(getContext()); et.setHint(hint);
        layout.addView(et); return et;
    }

    private void addButton(LinearLayout layout, String label, View.OnClickListener listener) {
        Button btn = new Button(getContext()); btn.setText(label);
        btn.setOnClickListener(listener); layout.addView(btn);
    }

    private void showJson(JSONObject result) {
        if (result == null) { resultText.setText("No data"); return; }
        try { resultText.setText(result.toString(2)); } catch (Exception e) { resultText.setText(result.toString()); }
    }

    private void setBusy(boolean busy) {
        if (progressBar != null) progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
    }
}
