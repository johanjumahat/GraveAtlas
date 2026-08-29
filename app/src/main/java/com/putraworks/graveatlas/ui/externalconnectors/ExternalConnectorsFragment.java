package com.putraworks.graveatlas.ui.externalconnectors;

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

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * External Connectors — wire 13 backend endpoints for external data source management.
 * Sources, SG datasets, community, registry, query, query-all, health,
 * cemetery matching, record matching, validation, AI search, privacy review.
 */
public class ExternalConnectorsFragment extends Fragment {
    private ApiClient apiClient;
    private ProgressBar progressBar;
    private TextView resultText;
    private EditText queryField, sourceIdField, aiSearchField, recordField;
    private EditText extCemeteryField, gaCemeteriesField, extRecordsField, gaRecordsField, validateField;

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

        // ---- Source Discovery ----
        addTitle(layout, "Source Discovery");
        addButton(layout, "List External Sources", v -> {
            setBusy(true);
            apiClient.getExternalSources(cb());
        });
        addButton(layout, "SG Government Datasets", v -> {
            setBusy(true);
            apiClient.getExternalSGDatasets(cb());
        });
        addButton(layout, "Source Registry (All)", v -> {
            setBusy(true);
            apiClient.getExternalRegistry(cb());
        });
        addButton(layout, "External API Health", v -> {
            setBusy(true);
            apiClient.getExternalHealth(cb());
        });

        // ---- Community Data ----
        addTitle(layout, "Community Data (GitHub)");
        addButton(layout, "List Community Files", v -> {
            setBusy(true);
            apiClient.getExternalCommunity(cb());
        });
        queryField = addField(layout, "Community query (JSON, optional)");
        addButton(layout, "Query Community Data", v -> {
            setBusy(true);
            JSONObject q = new JSONObject();
            try { q = new JSONObject(queryField.getText().toString().trim()); } catch (Exception e) {}
            apiClient.queryExternalCommunity(q, cb());
        });

        // ---- Source Querying ----
        addTitle(layout, "Source Querying");
        sourceIdField = addField(layout, "Source ID (e.g. findagrave, cwgc, osm)");
        queryField = addField(layout, "Query (JSON, optional)");
        addButton(layout, "Query Specific Source", v -> {
            setBusy(true);
            String sid = sourceIdField.getText().toString().trim();
            JSONObject q = new JSONObject();
            try { q = new JSONObject(queryField.getText().toString().trim()); } catch (Exception e) {}
            apiClient.queryExternalSource(sid, q, cb());
        });
        addButton(layout, "Query All Sources", v -> {
            setBusy(true);
            JSONObject q = new JSONObject();
            try { q = new JSONObject(queryField.getText().toString().trim()); } catch (Exception e) {}
            apiClient.queryAllExternalSources(q, cb());
        });

        // ---- AI Search ----
        addTitle(layout, "AI External Search");
        aiSearchField = addField(layout, "Search query");
        addButton(layout, "AI External Search", v -> {
            setBusy(true);
            apiClient.externalAISearch(aiSearchField.getText().toString().trim(), cb());
        });

        // ---- Cemetery Matching ----
        addTitle(layout, "Cemetery Matching");
        extCemeteryField = addField(layout, "External cemetery (JSON)");
        gaCemeteriesField = addField(layout, "GraveAtlas cemeteries (JSON array, optional)");
        addButton(layout, "Match Cemetery", v -> {
            setBusy(true);
            JSONObject extCem = new JSONObject();
            try { extCem = new JSONObject(extCemeteryField.getText().toString().trim()); } catch (Exception e) {}
            JSONArray gaCems = new JSONArray();
            try { gaCems = new JSONArray(gaCemeteriesField.getText().toString().trim()); } catch (Exception e) {}
            apiClient.matchExternalCemetery(extCem, gaCems, cb());
        });

        // ---- Record Matching ----
        addTitle(layout, "Record Matching");
        extRecordsField = addField(layout, "External records (JSON array)");
        gaRecordsField = addField(layout, "GraveAtlas records (JSON array, optional)");
        addButton(layout, "Match Records", v -> {
            setBusy(true);
            JSONArray extRecs = new JSONArray();
            try { extRecs = new JSONArray(extRecordsField.getText().toString().trim()); } catch (Exception e) {}
            JSONArray gaRecs = new JSONArray();
            try { gaRecs = new JSONArray(gaRecordsField.getText().toString().trim()); } catch (Exception e) {}
            apiClient.matchExternalRecords(extRecs, gaRecs, cb());
        });

        // ---- Validation ----
        addTitle(layout, "Record Validation");
        validateField = addField(layout, "Records to validate (JSON array)");
        addButton(layout, "Validate Records", v -> {
            setBusy(true);
            JSONArray recs = new JSONArray();
            try { recs = new JSONArray(validateField.getText().toString().trim()); } catch (Exception e) {}
            apiClient.validateExternalRecords(recs, cb());
        });

        // ---- Privacy Review ----
        addTitle(layout, "Privacy Review");
        recordField = addField(layout, "Record to review (JSON)");
        addButton(layout, "Privacy Review", v -> {
            setBusy(true);
            JSONObject rec = new JSONObject();
            try { rec = new JSONObject(recordField.getText().toString().trim()); } catch (Exception e) {}
            apiClient.externalPrivacyReview(rec, cb());
        });

        // ---- Result Display ----
        resultText = new TextView(getContext());
        resultText.setPadding(0, pad, 0, pad);
        resultText.setTextSize(13);
        resultText.setText("Use the buttons above to interact with external connectors.");
        layout.addView(resultText);

        scroll.addView(layout);
        return scroll;
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
