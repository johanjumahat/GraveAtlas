package com.putraworks.graveatlas.ui.aiheadstone;

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

import org.json.JSONObject;

public class AIHeadstoneFragment extends Fragment {

    private ApiClient apiClient;
    private EditText photoUrlField, analysisIdField, textField;
    private Button analyzeBtn, parseBtn, confirmBtn, listBtn;
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
        title.setText("AI Headstone Analysis"); title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView desc = new TextView(getContext());
        desc.setText("Analyze headstone photos to extract inscriptions, parse text, and confirm transcriptions.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16);
        layout.addView(desc);

        photoUrlField = new EditText(getContext());
        photoUrlField.setHint("Photo URL (from photo upload)");
        layout.addView(photoUrlField);

        textField = new EditText(getContext());
        textField.setHint("Raw headstone text (for parsing)");
        textField.setMinLines(2);
        layout.addView(textField);

        analysisIdField = new EditText(getContext());
        analysisIdField.setHint("Analysis ID (for confirm)");
        layout.addView(analysisIdField);

        LinearLayout btnRow1 = new LinearLayout(getContext());
        btnRow1.setOrientation(LinearLayout.HORIZONTAL);

        analyzeBtn = new Button(getContext());
        analyzeBtn.setText("Analyze Photo"); analyzeBtn.setAllCaps(false);
        analyzeBtn.setOnClickListener(v -> analyzeHeadstone());
        btnRow1.addView(analyzeBtn);

        parseBtn = new Button(getContext());
        parseBtn.setText("Parse Text"); parseBtn.setAllCaps(false);
        parseBtn.setOnClickListener(v -> parseHeadstone());
        btnRow1.addView(parseBtn);
        layout.addView(btnRow1);

        LinearLayout btnRow2 = new LinearLayout(getContext());
        btnRow2.setOrientation(LinearLayout.HORIZONTAL);

        confirmBtn = new Button(getContext());
        confirmBtn.setText("Confirm"); confirmBtn.setAllCaps(false);
        confirmBtn.setOnClickListener(v -> confirmAnalysis());
        btnRow2.addView(confirmBtn);

        listBtn = new Button(getContext());
        listBtn.setText("List Analyses"); listBtn.setAllCaps(false);
        listBtn.setOnClickListener(v -> listAnalyses());
        btnRow2.addView(listBtn);
        layout.addView(btnRow2);

        Button getAnalysisBtn = new Button(getContext());
        getAnalysisBtn.setText("Get Analysis by ID");
        getAnalysisBtn.setAllCaps(false);
        layout.addView(getAnalysisBtn);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        resultText = new TextView(getContext());
        resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0);
        layout.addView(resultText);

        getAnalysisBtn.setOnClickListener(v -> {
            String aid = analysisIdField.getText().toString().trim();
            if (aid.isEmpty()) { resultText.setText("Enter analysis ID"); return; }
            setBusy(true);
            apiClient.getHeadstoneAnalysis(aid, new ApiClient.ApiCallback<JSONObject>() {
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

    private void setBusy(boolean busy) {
        progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
        analyzeBtn.setEnabled(!busy); parseBtn.setEnabled(!busy);
        confirmBtn.setEnabled(!busy); listBtn.setEnabled(!busy);
    }

    private void analyzeHeadstone() {
        String url = photoUrlField.getText().toString().trim();
        if (url.isEmpty()) { resultText.setText("Enter a photo URL"); return; }

        setBusy(true);
        resultText.setText("Analyzing headstone photo...");

        apiClient.analyzeHeadstone(url, null, null, null, null, null, new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); try { resultText.setText(result.toString(2)); } catch (Exception ex) { resultText.setText(result.toString()); }; });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void parseHeadstone() {
        String text = textField.getText().toString().trim();
        if (text.isEmpty()) { resultText.setText("Enter headstone text to parse"); return; }

        setBusy(true);
        resultText.setText("Parsing headstone text...");

        apiClient.parseHeadstoneText(text, null, null, new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); try { resultText.setText(result.toString(2)); } catch (Exception ex) { resultText.setText(result.toString()); }; });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void confirmAnalysis() {
        String id = analysisIdField.getText().toString().trim();
        if (id.isEmpty()) { resultText.setText("Enter an analysis ID"); return; }

        setBusy(true);
        apiClient.confirmHeadstoneAnalysis(id, new JSONObject(), new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); try { resultText.setText(result.toString(2)); } catch (Exception ex) { resultText.setText(result.toString()); }; });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void listAnalyses() {
        setBusy(true);
        apiClient.listHeadstoneAnalyses(20, 0, new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); try { resultText.setText(result.toString(2)); } catch (Exception ex) { resultText.setText(result.toString()); }; });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }
}
