package com.putraworks.graveatlas.ui.spatial;

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

import org.json.JSONArray;
import org.json.JSONObject;

public class SpatialFragment extends Fragment {
    private ApiClient apiClient;
    private EditText latField, lonField, radiusField, recordsField;
    private Button clusterBtn, heatmapBtn, searchBtn, nearestBtn, densityBtn, familyBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Spatial Intelligence");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView desc = new TextView(getContext());
        desc.setText("GPS clustering, heatmaps, spatial search, nearest neighbors, density, family proximity.");
        desc.setTextSize(12);
        desc.setPadding(0, 0, 0, 16);
        layout.addView(desc);

        latField = new EditText(getContext()); latField.setHint("Latitude"); layout.addView(latField);
        lonField = new EditText(getContext()); lonField.setHint("Longitude"); layout.addView(lonField);
        radiusField = new EditText(getContext()); radiusField.setHint("Radius (meters)"); radiusField.setInputType(android.text.InputType.TYPE_CLASS_NUMBER); layout.addView(radiusField);
        recordsField = new EditText(getContext()); recordsField.setHint("Record IDs (comma-separated)"); layout.addView(recordsField);

        clusterBtn = mkBtn("Cluster Graves"); layout.addView(clusterBtn);
        heatmapBtn = mkBtn("Generate Heatmap"); layout.addView(heatmapBtn);
        searchBtn = mkBtn("Spatial Search"); layout.addView(searchBtn);
        nearestBtn = mkBtn("Find Nearest"); layout.addView(nearestBtn);
        densityBtn = mkBtn("Calculate Density"); layout.addView(densityBtn);
        familyBtn = mkBtn("Family Proximity"); layout.addView(familyBtn);

        progressBar = new ProgressBar(getContext()); progressBar.setVisibility(View.GONE); layout.addView(progressBar);
        resultText = new TextView(getContext()); resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0); layout.addView(resultText);

        clusterBtn.setOnClickListener(v -> doSpatial("cluster"));
        heatmapBtn.setOnClickListener(v -> doSpatial("heatmap"));
        searchBtn.setOnClickListener(v -> doSpatial("search"));
        nearestBtn.setOnClickListener(v -> doSpatial("nearest"));
        densityBtn.setOnClickListener(v -> doSpatial("density"));
        familyBtn.setOnClickListener(v -> doSpatial("family"));

        return layout;
    }

    private Button mkBtn(String text) {
        Button b = new Button(getContext());
        b.setText(text); b.setAllCaps(false); return b;
    }

    private JSONArray parseIds() {
        JSONArray arr = new JSONArray();
        for (String id : recordsField.getText().toString().trim().split(",")) {
            String t = id.trim(); if (!t.isEmpty()) arr.put(t);
        }
        return arr;
    }

    private void doSpatial(String action) {
        setBusy(true);
        double lat = latField.getText().toString().trim().isEmpty() ? 0 : Double.parseDouble(latField.getText().toString().trim());
        double lon = lonField.getText().toString().trim().isEmpty() ? 0 : Double.parseDouble(lonField.getText().toString().trim());
        int r = radiusField.getText().toString().trim().isEmpty() ? 500 : Integer.parseInt(radiusField.getText().toString().trim());
        JSONArray records = parseIds();
        ApiClient.ApiCallback<JSONObject> cb = cb();
        try {
            JSONObject opts = new JSONObject();
            switch (action) {
                case "cluster": apiClient.clusterGraves(records, opts, cb); break;
                case "heatmap": apiClient.generateHeatmap(records, opts, cb); break;
                case "search": apiClient.spatialSearch(lat, lon, records, r, cb); break;
                case "nearest":
                    JSONObject rec = new JSONObject(); rec.put("lat", lat); rec.put("lon", lon);
                    apiClient.findNearestNeighbors(rec, records, 5, cb); break;
                case "density": apiClient.calculateDensity(records, cb); break;
                case "family": apiClient.analyzeFamilyProximity(records, new JSONObject(), cb); break;
            }
        } catch (Exception e) { setBusy(false); resultText.setText("Error: " + e.getMessage()); }
    }

    private ApiClient.ApiCallback<JSONObject> cb() {
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
        for (Button b : new Button[]{clusterBtn, heatmapBtn, searchBtn, nearestBtn, densityBtn, familyBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Working...");
    }
}
