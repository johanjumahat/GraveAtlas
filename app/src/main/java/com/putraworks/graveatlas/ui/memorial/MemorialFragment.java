package com.putraworks.graveatlas.ui.memorial;

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
 * Memorial Stories — generate AI memorial narratives, historical context.
 * POST /api/memorial/generate, POST /api/memorial/history
 */
public class MemorialFragment extends Fragment {

    private ApiClient apiClient;
    private EditText recordIdField, birthYearField, deathYearField;
    private Button generateBtn, historyBtn;
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
        title.setText("Memorial Stories");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView desc = new TextView(getContext());
        desc.setText("Generate AI memorial narratives and historical context from grave records.");
        desc.setTextSize(12);
        desc.setPadding(0, 0, 0, 16);
        layout.addView(desc);

        recordIdField = new EditText(getContext());
        recordIdField.setHint("Record ID (for memorial story)");
        layout.addView(recordIdField);

        LinearLayout yearRow = new LinearLayout(getContext());
        yearRow.setOrientation(LinearLayout.HORIZONTAL);

        birthYearField = new EditText(getContext());
        birthYearField.setHint("Birth year");
        birthYearField.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        yearRow.addView(birthYearField);

        deathYearField = new EditText(getContext());
        deathYearField.setHint("Death year");
        deathYearField.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        yearRow.addView(deathYearField);

        layout.addView(yearRow);

        generateBtn = new Button(getContext());
        generateBtn.setText("Generate Memorial");
        generateBtn.setAllCaps(false);
        generateBtn.setOnClickListener(v -> generateStory());
        layout.addView(generateBtn);

        historyBtn = new Button(getContext());
        historyBtn.setText("Historical Context");
        historyBtn.setAllCaps(false);
        historyBtn.setOnClickListener(v -> getHistory());
        layout.addView(historyBtn);

        Button infoBtn = new Button(getContext());
        infoBtn.setText("Memorial Info");
        infoBtn.setAllCaps(false);
        layout.addView(infoBtn);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        resultText = new TextView(getContext());
        resultText.setTextSize(13);
        resultText.setPadding(0, 16, 0, 0);
        layout.addView(resultText);

        infoBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getMemorialStoryInfo(new ApiClient.ApiCallback<JSONObject>() {
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

    private void generateStory() {
        String recordId = recordIdField.getText().toString().trim();
        if (recordId.isEmpty()) { resultText.setText("Enter a record ID"); return; }
        progressBar.setVisibility(View.VISIBLE);
        generateBtn.setEnabled(false);
        resultText.setText("Generating memorial story...");

        JSONObject record = new JSONObject();
        try { record.put("id", recordId); } catch (Exception e) {}

        apiClient.generateMemorialStory(record, new JSONObject(), new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    generateBtn.setEnabled(true);
                    String story = result.optString("story", result.optString("narrative", ""));
                    if (story.isEmpty()) { try { story = result.toString(2); } catch (Exception ex) { story = result.toString(); } }
                    resultText.setText(story);
                });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    generateBtn.setEnabled(true);
                    resultText.setText("Error: " + error);
                });
            }
        });
    }

    private void getHistory() {
        String birthStr = birthYearField.getText().toString().trim();
        String deathStr = deathYearField.getText().toString().trim();
        if (birthStr.isEmpty() || deathStr.isEmpty()) { resultText.setText("Enter birth and death years"); return; }

        progressBar.setVisibility(View.VISIBLE);
        historyBtn.setEnabled(false);
        resultText.setText("Fetching historical context...");

        try {
            apiClient.getHistoricalContext(Integer.parseInt(birthStr), Integer.parseInt(deathStr), new ApiClient.ApiCallback<JSONObject>() {
                @Override
                public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        historyBtn.setEnabled(true);
                        try { resultText.setText(result.toString(2)); } catch (Exception ex) { resultText.setText(result.toString()); }
                    });
                }
                @Override
                public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        historyBtn.setEnabled(true);
                        resultText.setText("Error: " + error);
                    });
                }
            });
        } catch (NumberFormatException e) {
            progressBar.setVisibility(View.GONE);
            historyBtn.setEnabled(true);
            resultText.setText("Invalid year format");
        }
    }

    private void setBusy(boolean busy) {
        if (progressBar != null) progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
    }

}
