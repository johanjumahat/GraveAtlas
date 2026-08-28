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
import org.json.JSONArray;

public class PhotoAssessmentsFragment extends Fragment {
    private ApiClient apiClient;
    private EditText photoUrlField, recordIdField;
    private Button assessBtn, enhanceBtn, listBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("AI Photo Assessment");
        title.setTextSize(20); title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView desc = new TextView(getContext());
        desc.setText("Assess photo quality (brightness, contrast, sharpness, noise) and get enhancement suggestions.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16); layout.addView(desc);

        photoUrlField = new EditText(getContext()); photoUrlField.setHint("Photo URL"); layout.addView(photoUrlField);
        recordIdField = new EditText(getContext()); recordIdField.setHint("Record ID (optional)"); layout.addView(recordIdField);

        assessBtn = mkBtn("Assess Photo"); layout.addView(assessBtn);
        enhanceBtn = mkBtn("Enhancement Suggestions"); layout.addView(enhanceBtn);
        listBtn = mkBtn("List Assessments"); layout.addView(listBtn);

        Button batchAssessBtn = new Button(getContext());
        batchAssessBtn.setText("Batch Assess Photos");
        batchAssessBtn.setAllCaps(false);
        layout.addView(batchAssessBtn);
        progressBar = new ProgressBar(getContext()); progressBar.setVisibility(View.GONE); layout.addView(progressBar);
        resultText = new TextView(getContext()); resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0); layout.addView(resultText);

        assessBtn.setOnClickListener(v -> assess());
        enhanceBtn.setOnClickListener(v -> enhance());
        listBtn.setOnClickListener(v -> listAll());

        batchAssessBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.batchAssessPhotos(new JSONArray(), new ApiClient.ApiCallback<JSONObject>() {
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

    private Button mkBtn(String text) { Button b = new Button(getContext()); b.setText(text); b.setAllCaps(false); return b; }

    private void assess() {
        String url = photoUrlField.getText().toString().trim();
        if (url.isEmpty()) { resultText.setText("Enter a photo URL"); return; }
        setBusy(true);
        try {
            JSONObject meta = new JSONObject();
            String rid = recordIdField.getText().toString().trim();
            if (!rid.isEmpty()) meta.put("recordId", rid);
            apiClient.assessPhoto(url, "grave", meta, jcb());
        } catch (Exception e) { setBusy(false); resultText.setText("Error: " + e.getMessage()); }
    }

    private void enhance() {
        String url = photoUrlField.getText().toString().trim();
        if (url.isEmpty()) { resultText.setText("Enter a photo URL"); return; }
        setBusy(true);
        apiClient.getEnhancementSuggestions(url, null, "grave", jcb());
    }

    private void listAll() {
        setBusy(true);
        apiClient.listPhotoAssessments(50, 0, jcb());
    }

    private ApiClient.ApiCallback<JSONObject> jcb() {
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
        for (Button b : new Button[]{assessBtn, enhanceBtn, listBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Working...");
    }
}
