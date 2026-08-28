package com.putraworks.graveatlas.ui.genealogy;

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
import com.putraworks.graveatlas.data.model.PersonRecord;
import org.json.JSONArray;

/**
 * Genealogy — build family trees, detect relationships, surname analysis.
 * POST /api/genealogy/build-tree, POST /api/genealogy/relationships,
 * POST /api/genealogy/surname-analysis, POST /api/genealogy/confirm
 */
public class GenealogyFragment extends Fragment {

    private ApiClient apiClient;
    private EditText recordIdsField;
    private Button buildTreeBtn, surnameBtn;
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
        title.setText("Genealogy");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView desc = new TextView(getContext());
        desc.setText("Build family trees and detect relationships from grave records.\nEnter record IDs (comma-separated).");
        desc.setTextSize(12);
        desc.setPadding(0, 0, 0, 16);
        layout.addView(desc);

        recordIdsField = new EditText(getContext());
        recordIdsField.setHint("Record IDs (e.g. grave_abc123, grave_def456)");
        layout.addView(recordIdsField);

        buildTreeBtn = new Button(getContext());
        buildTreeBtn.setText("Build Family Tree");
        buildTreeBtn.setAllCaps(false);
        buildTreeBtn.setOnClickListener(v -> buildTree());
        layout.addView(buildTreeBtn);

        surnameBtn = new Button(getContext());
        surnameBtn.setText("Analyze Surnames");
        surnameBtn.setAllCaps(false);
        surnameBtn.setOnClickListener(v -> analyzeSurnames());
        layout.addView(surnameBtn);

        Button personBtn = new Button(getContext());
        personBtn.setText("Get Person");
        personBtn.setAllCaps(false);
        layout.addView(personBtn);

        Button infoBtn = new Button(getContext());
        infoBtn.setText("Genealogy Info");
        infoBtn.setAllCaps(false);
        layout.addView(infoBtn);

        Button confirmRelBtn = new Button(getContext());
        confirmRelBtn.setText("Confirm Relationship");
        confirmRelBtn.setAllCaps(false);
        layout.addView(confirmRelBtn);
        Button detectRelBtn = new Button(getContext());
        detectRelBtn.setText("Detect Relationships");
        detectRelBtn.setAllCaps(false);
        layout.addView(detectRelBtn);
        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        resultText = new TextView(getContext());
        resultText.setTextSize(13);
        resultText.setPadding(0, 16, 0, 0);
        layout.addView(resultText);

        personBtn.setOnClickListener(v -> {
            String id = recordIdsField.getText().toString().trim();
            if (id.isEmpty()) { resultText.setText("Enter a Person ID"); return; }
            setBusy(true);
            apiClient.getPerson(id, new ApiClient.ApiCallback<PersonRecord>() {
                @Override public void onSuccess(PersonRecord result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No person found"); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });

        infoBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getGenealogyInfo(new ApiClient.ApiCallback<JSONObject>() {
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

        confirmRelBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.confirmRelationship(new JSONObject(), new ApiClient.ApiCallback<JSONObject>() {
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

        detectRelBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.detectRelationships(new JSONObject(), new JSONArray(), 50, new ApiClient.ApiCallback<JSONObject>() {
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

        return layout;
    }

    private void buildTree() {
        String ids = recordIdsField.getText().toString().trim();
        if (ids.isEmpty()) { resultText.setText("Enter at least one record ID"); return; }

        progressBar.setVisibility(View.VISIBLE);
        buildTreeBtn.setEnabled(false);
        resultText.setText("Building family tree...");

        try {
            JSONArray records = new JSONArray();
            for (String id : ids.split(",")) {
                records.put(id.trim());
            }

            apiClient.buildFamilyTree(records, new JSONObject(), new ApiClient.ApiCallback<JSONObject>() {
                @Override
                public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        buildTreeBtn.setEnabled(true);

                        StringBuilder sb = new StringBuilder();
                        sb.append("Family Tree:\n\n");

                        JSONObject tree = result.optJSONObject("tree");
                        JSONArray families = result.optJSONArray("families");
                        JSONArray relationships = result.optJSONArray("relationships");

                        if (relationships != null && relationships.length() > 0) {
                            sb.append("Relationships found:\n");
                            for (int i = 0; i < relationships.length(); i++) {
                                JSONObject r = relationships.optJSONObject(i);
                                if (r != null) {
                                    sb.append("  ").append(r.optString("personA", "?"));
                                    sb.append(" — ").append(r.optString("relationshipType", "related to"));
                                    sb.append(" — ").append(r.optString("personB", "?"));
                                    sb.append(" (").append(r.optDouble("confidence", 0) * 100).append("%)\n");
                                }
                            }
                        }

                        if (families != null && families.length() > 0) {
                            sb.append("\nFamily Groups:\n");
                            for (int i = 0; i < families.length(); i++) {
                                JSONObject f = families.optJSONObject(i);
                                if (f != null) {
                                    sb.append("  Group ").append(i + 1).append(": ");
                                    sb.append(f.optString("surname", "Unknown")).append("\n");
                                    JSONArray members = f.optJSONArray("members");
                                    if (members != null) {
                                        for (int j = 0; j < members.length(); j++) {
                                            sb.append("    - ").append(members.optString(j, "?")).append("\n");
                                        }
                                    }
                                }
                            }
                        }

                        if (sb.length() < 20) sb.append("No family connections found among these records.");
                        resultText.setText(sb.toString());
                    });
                }
                @Override
                public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        buildTreeBtn.setEnabled(true);
                        resultText.setText("Error: " + error);
                    });
                }
            });
        } catch (Exception e) {
            progressBar.setVisibility(View.GONE);
            buildTreeBtn.setEnabled(true);
            resultText.setText("Error: " + e.getMessage());
        }
    }

    private void analyzeSurnames() {
        String ids = recordIdsField.getText().toString().trim();
        if (ids.isEmpty()) { resultText.setText("Enter at least one record ID"); return; }

        progressBar.setVisibility(View.VISIBLE);
        surnameBtn.setEnabled(false);
        resultText.setText("Analyzing surnames...");

        try {
            JSONArray records = new JSONArray();
            for (String id : ids.split(",")) {
                records.put(id.trim());
            }

            apiClient.analyzeSurnames(records, new ApiClient.ApiCallback<JSONObject>() {
                @Override
                public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        surnameBtn.setEnabled(true);
                        resultText.setText(result.toString().replace(",", ",\n").replace("{", "{\n").replace("}", "\n}"));
                    });
                }
                @Override
                public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        surnameBtn.setEnabled(true);
                        resultText.setText("Error: " + error);
                    });
                }
            });
        } catch (Exception e) {
            progressBar.setVisibility(View.GONE);
            surnameBtn.setEnabled(true);
            resultText.setText("Error: " + e.getMessage());
        }
    }

    private void setBusy(boolean busy) {
        if (progressBar != null) progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
    }

}
