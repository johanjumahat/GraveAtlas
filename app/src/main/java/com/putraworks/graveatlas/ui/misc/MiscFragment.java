package com.putraworks.graveatlas.ui.misc;

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
 * Misc Panel — wire 18 remaining endpoints: browsing, map, auth, user, governance, summaries.
 */
public class MiscFragment extends Fragment {
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

        idField = addField(layout, "ID (record, etc.)");
        jsonField = addField(layout, "JSON body (for POST/PUT actions)");

        // ---- Browsing ----
        addTitle(layout, "Browse & Explore");
        addButton(layout, "Browse by Location", v -> { setBusy(true); apiClient.browseByLocation(cb()); });
        addButton(layout, "List Cities", v -> { setBusy(true); apiClient.getCities(cb()); });
        addButton(layout, "List Regions", v -> { setBusy(true); apiClient.getRegions(cb()); });
        addButton(layout, "Nearby Search", v -> { setBusy(true); apiClient.nearbySearch(cb()); });
        addButton(layout, "Timeline", v -> { setBusy(true); apiClient.getGlobalTimeline(cb()); });

        // ---- Map ----
        addTitle(layout, "Map");
        addButton(layout, "Map Query", v -> { setBusy(true); apiClient.mapQuery(cb()); });
        addButton(layout, "Viewport Search", v -> { setBusy(true); apiClient.mapViewport(cb()); });

        // ---- Auth ----
        addTitle(layout, "Authentication");
        addButton(layout, "Verify Google Auth", v -> { setBusy(true); apiClient.verifyGoogleAuth(parseJson(), cb()); });
        addButton(layout, "Check Session", v -> { setBusy(true); apiClient.checkAuthSession(cb()); });
        addButton(layout, "Logout", v -> { setBusy(true); apiClient.logout(cb()); });

        // ---- User Profile ----
        addTitle(layout, "User Profile");
        addButton(layout, "Register User", v -> { setBusy(true); apiClient.registerUser(parseJson(), cb()); });
        addButton(layout, "Create Session", v -> { setBusy(true); apiClient.createUserSession(parseJson(), cb()); });
        addButton(layout, "Revoke Session", v -> { setBusy(true); apiClient.revokeUserSession(cb()); });
        addButton(layout, "Get Profile", v -> { setBusy(true); apiClient.getUserProfile(cb()); });
        addButton(layout, "Update Profile", v -> { setBusy(true); apiClient.updateUserProfile(parseJson(), cb()); });

        // ---- Governance Extras ----
        addTitle(layout, "Governance");
        addButton(layout, "Audit Log", v -> { setBusy(true); apiClient.getGovernanceAudit(cb()); });
        addButton(layout, "Log Audit Event", v -> { setBusy(true); apiClient.logGovernanceAudit(parseJson(), cb()); });
        addButton(layout, "Get Consent", v -> { setBusy(true); apiClient.getGovernanceConsent(cb()); });
        addButton(layout, "Record Consent", v -> { setBusy(true); apiClient.recordGovernanceConsent(parseJson(), cb()); });
        addButton(layout, "Apply Retention", v -> { setBusy(true); apiClient.applyGovernanceRetention(parseJson(), cb()); });

        // ---- Summaries ----
        addTitle(layout, "Summaries");
        addButton(layout, "Record Summary", v -> { setBusy(true); apiClient.getRecordSummary(idField.getText().toString().trim(), cb()); });

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
