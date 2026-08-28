package com.putraworks.graveatlas.ui.nlquery;

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
import com.putraworks.graveatlas.data.model.QueryExplanation;
import com.putraworks.graveatlas.data.model.QuerySuggestions;

import org.json.JSONObject;

public class NLQueryFragment extends Fragment {
    private ApiClient apiClient;
    private EditText queryField;
    private Button askBtn, explainBtn, historyBtn, suggestBtn, clearBtn;
    private ProgressBar progressBar;
    private TextView resultText;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);
        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Natural Language Query");
        title.setTextSize(20); title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); title.setPadding(0, 0, 0, 8);
        layout.addView(title);
        TextView desc = new TextView(getContext());
        desc.setText("Ask questions in plain English — the system translates them into structured queries.");
        desc.setTextSize(12); desc.setPadding(0, 0, 0, 16); layout.addView(desc);

        queryField = new EditText(getContext()); queryField.setHint("e.g. Show all graves from Bukit Brown buried before 1950"); layout.addView(queryField);

        askBtn = mkBtn("Ask"); layout.addView(askBtn);
        explainBtn = mkBtn("Explain Query"); layout.addView(explainBtn);
        historyBtn = mkBtn("Query History"); layout.addView(historyBtn);
        suggestBtn = mkBtn("Suggestions"); layout.addView(suggestBtn);
        clearBtn = mkBtn("Clear History"); layout.addView(clearBtn);

        progressBar = new ProgressBar(getContext()); progressBar.setVisibility(View.GONE); layout.addView(progressBar);
        resultText = new TextView(getContext()); resultText.setTextSize(13); resultText.setPadding(0, 16, 0, 0); layout.addView(resultText);

        askBtn.setOnClickListener(v -> execute());
        explainBtn.setOnClickListener(v -> explain());
        historyBtn.setOnClickListener(v -> history());
        suggestBtn.setOnClickListener(v -> suggest());
        clearBtn.setOnClickListener(v -> clearHistory());

        return layout;
    }

    private Button mkBtn(String text) { Button b = new Button(getContext()); b.setText(text); b.setAllCaps(false); return b; }

    private void execute() {
        String q = queryField.getText().toString().trim();
        if (q.isEmpty()) { resultText.setText("Enter a question"); return; }
        setBusy(true);
        apiClient.executeNaturalLanguageQuery(q, jcb());
    }

    private void explain() {
        String q = queryField.getText().toString().trim();
        if (q.isEmpty()) { resultText.setText("Enter a question"); return; }
        setBusy(true);
        apiClient.explainQuery(q, new ApiClient.ApiCallback<QueryExplanation>() {
            @Override public void onSuccess(QueryExplanation result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No explanation"); });
            }
            @Override public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void history() {
        setBusy(true);
        apiClient.getQueryHistory(50, jcb());
    }

    private void suggest() {
        setBusy(true);
        apiClient.getQuerySuggestions(new ApiClient.ApiCallback<QuerySuggestions>() {
            @Override public void onSuccess(QuerySuggestions result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText(result != null ? result.toString() : "No suggestions"); });
            }
            @Override public void onError(String error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
            }
        });
    }

    private void clearHistory() {
        setBusy(true);
        apiClient.clearSearchHistory(jcb());
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
        for (Button b : new Button[]{askBtn, explainBtn, historyBtn, suggestBtn, clearBtn}) b.setEnabled(!busy);
        if (busy) resultText.setText("Working...");
    }
}
