package com.putraworks.graveatlas.ui.photoassess;

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
 * AI Photo Assessment — assess photo quality, batch assess, list assessments, enhancement suggestions.
 * POST /api/ai/photo/assess, /enhance-suggest, GET /api/ai/photo/assessments, POST /api/ai/photo/batch-assess
 */
public class PhotoAssessmentsFragment extends Fragment {

    private ApiClient apiClient;
    private EditText photoUrlField, recordIdField;
    private Button assessBtn, enhanceBtn, listBtn;
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
        title.setText("AI Photo Assessment");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView desc = new TextView(getContext());
        desc.setText("Assess grave photo quality (brightness, contrast, sharpness, noise, resolution) and get enhancement suggestions.");
        desc.setTextSize(12);
        desc.setPadding(0, 0, 0, 16);
        layout.addView(desc);

        photoUrlField = new EditText(getContext());
        photoUrlField.setHint("Photo URL");
        layout.addView(photoUrlField);

        recordIdField = new EditText(getContext());
        recordIdField.setHint("Record ID (optional)");
        layout.addView(recordIdField);

        assessBtn = createButton("Assess Photo", v -> assess());
        layout.addView(assessBtn);

        enhanceBtn = createButton("Enhancement Suggestions", v -> enhance());
        layout.addView(enhanceBtn);

        listBtn = createButton("List Assessments", v -> listAssessments());
        layout.addView(listBtn);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        resultText = new TextView(getContext());
        resultText.setTextSize(13);
        resultText.setPadding(0, 16, 0, 0);
        layout.addView(resultText);

        return layout;
    }

    private Button createButton(String text, View.OnClickListener listener) {
        Button btn = new Button(getContext());
        btn.setText(text);
        btn.setAllCaps(false);
        btn.setOnClickListener(listener);
        return btn;
    }

    private void assess() {
        String url = photoUrlField.getText().toString().trim();
        if (url.isEmpty()) { resultText.setText("Enter a photo URL"); return; }
        setBusy(true);
        String recordId = recordIdField.getText().toString().trim();
        apiClient.assessPhoto(url, recordId, new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); showJson(result); });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void enhance() {
        String url = photoUrlField.getText().toString().trim();
        if (url.isEmpty()) { resultText.setText("Enter a photo URL"); return; }
        setBusy(true);
        apiClient.enhanceSuggest(url, new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); showJson(result); });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void listAssessments() {
        setBusy(true);
        apiClient.listPhotoAssessments(new ApiClient.ApiCallback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); showJson(result); });
            }
            @Override
            public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void showJson(JSONObject result) {
        try { resultText.setText(result.toString(2)); } catch (Exception e) { resultText.setText(result.toString()); }
    }

    private void setBusy(boolean busy) {
        progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
        for (Button b : new Button[]{assessBtn, enhanceBtn, listBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Working...");
    }
}
