package com.putraworks.graveatlas.ui.dedupmerg;

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
import com.putraworks.graveatlas.data.model.DedupScanResult;
import com.putraworks.graveatlas.data.model.MergeHistory;
import com.putraworks.graveatlas.data.model.MergeProposal;
import com.putraworks.graveatlas.data.model.MergeResult;

import com.putraworks.graveatlas.data.model.DedupStatsResult;
import com.putraworks.graveatlas.data.model.MergeSuggestion;
import org.json.JSONObject;
import java.util.List;

public class DedupMergeFragment extends Fragment {
    private ApiClient apiClient;
    private EditText cemeteryIdField, recordIdAField, recordIdBField;
    private Button scanBtn, pairsBtn, conflictsBtn, statsBtn, mergePreviewBtn, mergeApplyBtn, mergeSuggestBtn, mergeHistoryBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Dedup & Merge");
        title.setTextSize(20); title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); title.setPadding(0, 0, 0, 8);
        layout.addView(title);
        TextView desc = new TextView(getContext());
        desc.setText("Scan duplicates, resolve conflicts, preview/apply merges.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16); layout.addView(desc);

        cemeteryIdField = new EditText(getContext()); cemeteryIdField.setHint("Cemetery ID"); layout.addView(cemeteryIdField);
        recordIdAField = new EditText(getContext()); recordIdAField.setHint("Record ID A (merge)"); layout.addView(recordIdAField);
        recordIdBField = new EditText(getContext()); recordIdBField.setHint("Record ID B (merge)"); layout.addView(recordIdBField);

        TextView dl = new TextView(getContext()); dl.setText("Dedup"); dl.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); dl.setPadding(0, 16, 0, 8); layout.addView(dl);
        scanBtn = mkBtn("Scan Duplicates"); layout.addView(scanBtn);
        pairsBtn = mkBtn("Find Pairs"); layout.addView(pairsBtn);
        conflictsBtn = mkBtn("Conflicts"); layout.addView(conflictsBtn);
        statsBtn = mkBtn("Stats"); layout.addView(statsBtn);

        TextView ml = new TextView(getContext()); ml.setText("Merge"); ml.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); ml.setPadding(0, 16, 0, 8); layout.addView(ml);
        mergePreviewBtn = mkBtn("Preview Merge"); layout.addView(mergePreviewBtn);
        mergeApplyBtn = mkBtn("Apply Merge"); layout.addView(mergeApplyBtn);
        mergeSuggestBtn = mkBtn("Merge Suggestions"); layout.addView(mergeSuggestBtn);
        mergeHistoryBtn = mkBtn("Merge History"); layout.addView(mergeHistoryBtn);

        progressBar = new ProgressBar(getContext()); progressBar.setVisibility(View.GONE); layout.addView(progressBar);
        resultText = new TextView(getContext()); resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0); layout.addView(resultText);

        scanBtn.setOnClickListener(v -> dedup("scan"));
        pairsBtn.setOnClickListener(v -> dedup("pairs"));
        conflictsBtn.setOnClickListener(v -> dedup("conflicts"));
        statsBtn.setOnClickListener(v -> dedup("stats"));
        mergePreviewBtn.setOnClickListener(v -> merge("preview"));
        mergeApplyBtn.setOnClickListener(v -> merge("apply"));
        mergeSuggestBtn.setOnClickListener(v -> merge("suggestions"));
        mergeHistoryBtn.setOnClickListener(v -> merge("history"));

        return layout;
    }

    private Button mkBtn(String text) { Button b = new Button(getContext()); b.setText(text); b.setAllCaps(false); return b; }

    private void dedup(String action) {
        setBusy(true);
        String cid = cemeteryIdField.getText().toString().trim();
        String rid = recordIdAField.getText().toString().trim();
        switch (action) {
            case "scan":
                apiClient.scanDuplicates(cid.isEmpty() ? null : cid, 80, 50, new ApiClient.ApiCallback<DedupScanResult>() {
                    @Override public void onSuccess(DedupScanResult result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No results"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "pairs":
                if (rid.isEmpty()) { setBusy(false); resultText.setText("Enter Record ID A"); return; }
                apiClient.findDuplicatePairs(rid, jcb());
                break;
            case "conflicts":
                apiClient.getDuplicateConflicts(cid.isEmpty() ? null : cid, 50, jcb());
                break;
            case "stats":
                apiClient.getDedupStats(cid.isEmpty() ? null : cid, new ApiClient.ApiCallback<DedupStatsResult>() {
                    @Override public void onSuccess(DedupStatsResult result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No stats"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
        }
    }

    private void merge(String action) {
        setBusy(true);
        String cid = cemeteryIdField.getText().toString().trim();
        String ridA = recordIdAField.getText().toString().trim();
        String ridB = recordIdBField.getText().toString().trim();
        switch (action) {
            case "preview":
                if (ridA.isEmpty() || ridB.isEmpty()) { setBusy(false); resultText.setText("Enter both Record IDs"); return; }
                apiClient.previewMerge(ridA, ridB, new ApiClient.ApiCallback<MergeProposal>() {
                    @Override public void onSuccess(MergeProposal result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No proposal"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "apply":
                if (ridA.isEmpty() || ridB.isEmpty()) { setBusy(false); resultText.setText("Enter both Record IDs"); return; }
                apiClient.applyMerge(ridA, ridB, null, "admin", new ApiClient.ApiCallback<MergeResult>() {
                    @Override public void onSuccess(MergeResult result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No result"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "suggestions":
                if (cid.isEmpty()) { setBusy(false); resultText.setText("Enter a Cemetery ID"); return; }
                apiClient.getMergeSuggestions(cid, new ApiClient.ApiCallback<List<MergeSuggestion>>() {
                    @Override public void onSuccess(List<MergeSuggestion> result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> {
                            setBusy(false);
                            if (result == null || result.isEmpty()) { resultText.setText("No suggestions"); return; }
                            StringBuilder sb = new StringBuilder();
                            for (MergeSuggestion s : result) sb.append(s.toString()).append("\n");
                            resultText.setText(sb.toString());
                        });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "history":
                apiClient.getMergeHistory(new ApiClient.ApiCallback<MergeHistory>() {
                    @Override public void onSuccess(MergeHistory result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No history"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
        }
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
        for (Button b : new Button[]{scanBtn, pairsBtn, conflictsBtn, statsBtn, mergePreviewBtn, mergeApplyBtn, mergeSuggestBtn, mergeHistoryBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Working...");
    }
}
