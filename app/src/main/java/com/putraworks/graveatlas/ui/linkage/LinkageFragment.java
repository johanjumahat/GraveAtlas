package com.putraworks.graveatlas.ui.linkage;

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
import com.putraworks.graveatlas.data.model.EventClusteringResult;
import com.putraworks.graveatlas.data.model.FamilyLinkageResult;
import com.putraworks.graveatlas.data.model.LinkageGraph;

import org.json.JSONObject;

public class LinkageFragment extends Fragment {
    private ApiClient apiClient;
    private EditText recordIdField;
    private Button familyBtn, crossBtn, proximityBtn, eventsBtn, graphBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Record Linkage");
        title.setTextSize(20); title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); title.setPadding(0, 0, 0, 8);
        layout.addView(title);
        TextView desc = new TextView(getContext());
        desc.setText("Family connections, cross-cemetery links, proximity clusters, events, relationship graphs.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16); layout.addView(desc);

        recordIdField = new EditText(getContext()); recordIdField.setHint("Record or Cemetery ID"); layout.addView(recordIdField);

        familyBtn = mkBtn("Family Linkage"); layout.addView(familyBtn);
        crossBtn = mkBtn("Cross-Cemetery"); layout.addView(crossBtn);
        proximityBtn = mkBtn("Proximity"); layout.addView(proximityBtn);
        eventsBtn = mkBtn("Event Clustering"); layout.addView(eventsBtn);
        graphBtn = mkBtn("Linkage Graph"); layout.addView(graphBtn);

        progressBar = new ProgressBar(getContext()); progressBar.setVisibility(View.GONE); layout.addView(progressBar);
        resultText = new TextView(getContext()); resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0); layout.addView(resultText);

        familyBtn.setOnClickListener(v -> linkage("family"));
        crossBtn.setOnClickListener(v -> linkage("cross"));
        proximityBtn.setOnClickListener(v -> linkage("proximity"));
        eventsBtn.setOnClickListener(v -> linkage("events"));
        graphBtn.setOnClickListener(v -> linkage("graph"));

        return layout;
    }

    private Button mkBtn(String text) { Button b = new Button(getContext()); b.setText(text); b.setAllCaps(false); return b; }

    private void linkage(String type) {
        setBusy(true);
        String id = recordIdField.getText().toString().trim();

        switch (type) {
            case "family":
                if (id.isEmpty()) { setBusy(false); resultText.setText("Enter a cemetery ID"); return; }
                apiClient.getFamilyLinkage(id, new ApiClient.ApiCallback<FamilyLinkageResult>() {
                    @Override public void onSuccess(FamilyLinkageResult result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No results"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "cross":
                apiClient.getCrossCemeteryLinkage(jcb());
                break;
            case "proximity":
                if (id.isEmpty()) { setBusy(false); resultText.setText("Enter a record ID"); return; }
                apiClient.getProximityLinkage(id, 500, jcb());
                break;
            case "events":
                apiClient.getEventClustering(id.isEmpty() ? null : id, 5, new ApiClient.ApiCallback<EventClusteringResult>() {
                    @Override public void onSuccess(EventClusteringResult result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No results"); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
                break;
            case "graph":
                if (id.isEmpty()) { setBusy(false); resultText.setText("Enter a record ID"); return; }
                apiClient.getLinkageGraph(id, 2, new ApiClient.ApiCallback<LinkageGraph>() {
                    @Override public void onSuccess(LinkageGraph result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No results"); });
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
        for (Button b : new Button[]{familyBtn, crossBtn, proximityBtn, eventsBtn, graphBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Analyzing...");
    }
}
