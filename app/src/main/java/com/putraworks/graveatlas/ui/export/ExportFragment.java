package com.putraworks.graveatlas.ui.export;

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
import com.putraworks.graveatlas.data.model.DatasetExport;
import com.putraworks.graveatlas.data.model.ExportManifest;
import com.putraworks.graveatlas.data.model.GeoJSONExport;
import com.putraworks.graveatlas.data.model.JSONLDExport;

import org.json.JSONObject;

public class ExportFragment extends Fragment {

    private ApiClient apiClient;
    private EditText cemeteryIdField;
    private Button datasetBtn, geojsonBtn, jsonldBtn, manifestBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Data Export"); title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView desc = new TextView(getContext());
        desc.setText("Export data as CSV-ready JSON, GeoJSON (RFC 7946), or JSON-LD (schema.org).\nLicense: CC-BY-SA 4.0");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16);
        layout.addView(desc);

        cemeteryIdField = new EditText(getContext());
        cemeteryIdField.setHint("Cemetery ID (optional, leave empty for all)");
        layout.addView(cemeteryIdField);

        LinearLayout btnRow1 = new LinearLayout(getContext());
        btnRow1.setOrientation(LinearLayout.HORIZONTAL);

        datasetBtn = new Button(getContext());
        datasetBtn.setText("Dataset"); datasetBtn.setAllCaps(false);
        datasetBtn.setOnClickListener(v -> exportDataset());
        btnRow1.addView(datasetBtn);

        geojsonBtn = new Button(getContext());
        geojsonBtn.setText("GeoJSON"); geojsonBtn.setAllCaps(false);
        geojsonBtn.setOnClickListener(v -> exportGeoJSON());
        btnRow1.addView(geojsonBtn);
        layout.addView(btnRow1);

        LinearLayout btnRow2 = new LinearLayout(getContext());
        btnRow2.setOrientation(LinearLayout.HORIZONTAL);

        jsonldBtn = new Button(getContext());
        jsonldBtn.setText("JSON-LD"); jsonldBtn.setAllCaps(false);
        jsonldBtn.setOnClickListener(v -> exportJSONLD());
        btnRow2.addView(jsonldBtn);

        manifestBtn = new Button(getContext());
        manifestBtn.setText("Manifest"); manifestBtn.setAllCaps(false);
        manifestBtn.setOnClickListener(v -> loadManifest());
        btnRow2.addView(manifestBtn);
        layout.addView(btnRow2);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        resultText = new TextView(getContext());
        resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0);
        layout.addView(resultText);

        loadManifest();
        return layout;
    }

    private void exportDataset() {
        progressBar.setVisibility(View.VISIBLE);
        resultText.setText("Exporting dataset...");
        String cemeteryId = cemeteryIdField.getText().toString().trim();
        if (cemeteryId.isEmpty()) cemeteryId = null;

        apiClient.exportDataset(cemeteryId, true, true, true, 10000, new ApiClient.ApiCallback<DatasetExport>() {
            @Override
            public void onSuccess(DatasetExport result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    StringBuilder sb = new StringBuilder();
                    sb.append("Dataset Export:\n");
                    sb.append("Total Records: ").append(result.records != null ? result.records.size() : 0).append("\n");
                    if (result.meta != null) {
                        sb.append("Format: ").append(result.meta.format).append("\n");
                        sb.append("Exported: ").append(result.meta.exportedAt);
                    }
                    resultText.setText(sb.toString());
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    resultText.setText("Error: " + error);
                });
            }
        });
    }

    private void exportGeoJSON() {
        progressBar.setVisibility(View.VISIBLE);
        resultText.setText("Exporting GeoJSON...");
        String cemeteryId = cemeteryIdField.getText().toString().trim();
        if (cemeteryId.isEmpty()) cemeteryId = null;

        apiClient.exportGeoJSON(cemeteryId, 10000, new ApiClient.ApiCallback<GeoJSONExport>() {
            @Override
            public void onSuccess(GeoJSONExport result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    resultText.setText("GeoJSON Export:\nFeatures: " + (result.features != null ? result.features.size() : 0) + "\nType: " + result.type);
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    resultText.setText("Error: " + error);
                });
            }
        });
    }

    private void exportJSONLD() {
        progressBar.setVisibility(View.VISIBLE);
        resultText.setText("Exporting JSON-LD...");
        String cemeteryId = cemeteryIdField.getText().toString().trim();
        if (cemeteryId.isEmpty()) cemeteryId = null;

        apiClient.exportJSONLD(cemeteryId, null, 10000, new ApiClient.ApiCallback<JSONLDExport>() {
            @Override
            public void onSuccess(JSONLDExport result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    resultText.setText("JSON-LD Export:\nEntities: " + result.getEntityCount() + "\n" + result.getSummaryLine());
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    resultText.setText("Error: " + error);
                });
            }
        });
    }

    private void loadManifest() {
        progressBar.setVisibility(View.VISIBLE);
        apiClient.getExportManifest(new ApiClient.ApiCallback<ExportManifest>() {
            @Override
            public void onSuccess(ExportManifest result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    StringBuilder sb = new StringBuilder();
                    sb.append("Export Manifest:\n\n");
                    sb.append("License: ").append(result.license != null ? result.license : "CC-BY-SA 4.0").append("\n");
                    sb.append("Generated: ").append(result.generatedAt != null ? result.generatedAt : "").append("\n");
                    if (result.availableFormats != null) {
                        sb.append("\nAvailable Formats:\n");
                        for (ExportManifest.AvailableFormat f : result.availableFormats) {
                            sb.append("  ").append(f.format != null ? f.format : "?").append("\n");
                        }
                    }
                    resultText.setText(sb.toString());
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    resultText.setText("Error: " + error);
                });
            }
        });
    }
}
