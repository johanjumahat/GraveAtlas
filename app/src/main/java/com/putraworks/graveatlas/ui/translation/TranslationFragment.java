package com.putraworks.graveatlas.ui.translation;

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

/**
 * Inscription Translation — analyze, translate, detect script, transliterate.
 * POST /api/translation/analyze, POST /api/translation/translate,
 * POST /api/translation/detect, POST /api/translation/transliterate
 */
public class TranslationFragment extends Fragment {

    private ApiClient apiClient;
    private EditText inscriptionField, targetLangField;
    private Button analyzeBtn, translateBtn, detectBtn, transliterateBtn;
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
        title.setText("Inscription Tools");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView desc = new TextView(getContext());
        desc.setText("Analyze, translate, and transliterate headstone inscriptions.\nUseful for multilingual headstones (Chinese, Arabic, Tamil, etc.).");
        desc.setTextSize(12);
        desc.setPadding(0, 0, 0, 16);
        layout.addView(desc);

        inscriptionField = new EditText(getContext());
        inscriptionField.setHint("Enter inscription text...");
        inscriptionField.setMinLines(3);
        layout.addView(inscriptionField);

        targetLangField = new EditText(getContext());
        targetLangField.setHint("Target language (e.g. en, zh, ar)");
        layout.addView(targetLangField);

        // Buttons
        LinearLayout btnRow1 = new LinearLayout(getContext());
        btnRow1.setOrientation(LinearLayout.HORIZONTAL);

        analyzeBtn = new Button(getContext());
        analyzeBtn.setText("Analyze");
        analyzeBtn.setAllCaps(false);
        analyzeBtn.setOnClickListener(v -> analyze());
        btnRow1.addView(analyzeBtn);

        translateBtn = new Button(getContext());
        translateBtn.setText("Translate");
        translateBtn.setAllCaps(false);
        translateBtn.setOnClickListener(v -> translate());
        btnRow1.addView(translateBtn);

        layout.addView(btnRow1);

        LinearLayout btnRow2 = new LinearLayout(getContext());
        btnRow2.setOrientation(LinearLayout.HORIZONTAL);

        detectBtn = new Button(getContext());
        detectBtn.setText("Detect Script");
        detectBtn.setAllCaps(false);
        detectBtn.setOnClickListener(v -> detect());
        btnRow2.addView(detectBtn);

        transliterateBtn = new Button(getContext());
        transliterateBtn.setText("Transliterate");
        transliterateBtn.setAllCaps(false);
        transliterateBtn.setOnClickListener(v -> transliterate());
        btnRow2.addView(transliterateBtn);

        layout.addView(btnRow2);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        resultText = new TextView(getContext());
        resultText.setTextSize(13);
        resultText.setPadding(0, 16, 0, 0);
        layout.addView(resultText);

        return layout;
    }

    private void setBusy(boolean busy) {
        progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
        analyzeBtn.setEnabled(!busy);
        translateBtn.setEnabled(!busy);
        detectBtn.setEnabled(!busy);
        transliterateBtn.setEnabled(!busy);
    }

    private void analyze() {
        String text = inscriptionField.getText().toString().trim();
        if (text.isEmpty()) return;
        setBusy(true);
        apiClient.analyzeInscription(text, targetLangField.getText().toString().trim(), new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(formatJSON(result)); });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void translate() {
        String text = inscriptionField.getText().toString().trim();
        if (text.isEmpty()) return;
        setBusy(true);
        apiClient.translateInscription(text, null, targetLangField.getText().toString().trim(), new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(formatJSON(result)); });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void detect() {
        String text = inscriptionField.getText().toString().trim();
        if (text.isEmpty()) return;
        setBusy(true);
        apiClient.detectScript(text, new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(formatJSON(result)); });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void transliterate() {
        String text = inscriptionField.getText().toString().trim();
        if (text.isEmpty()) return;
        setBusy(true);
        apiClient.transliterateText(text, targetLangField.getText().toString().trim(), new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(formatJSON(result)); });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private String formatJSON(JSONObject obj) {
        try { return obj.toString(2); } catch (Exception ex) { return obj.toString(); }
    }
}
