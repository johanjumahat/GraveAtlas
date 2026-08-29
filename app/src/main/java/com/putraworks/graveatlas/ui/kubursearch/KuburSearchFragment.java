package com.putraworks.graveatlas.ui.kubursearch;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.R;
import com.putraworks.graveatlas.data.api.ApiClient;

import org.json.JSONObject;

/**
 * Kubur Search connector — deep-link search results from kubursearch.com.
 * Wires 8 ApiClient methods: getKuburSearchInfo, listKuburSearchCemeteries,
 * listKuburSearchSources, searchKuburSearch, getKuburSearchCoverage,
 * searchKuburSG, getKuburSGCemeteries, getKuburSGSources.
 */
public class KuburSearchFragment extends Fragment {
    private ApiClient apiClient;
    private ProgressBar progressBar;
    private TextView resultText;
    private EditText queryField, cemeteryField, blockField, plotField, regionField, typeField;
    private EditText limitField, offsetField;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        apiClient = new ApiClient();

        ScrollView scroll = new ScrollView(getContext());
        ViewGroup layout = createLayout();
        scroll.addView(layout);
        return scroll;
    }

    private ViewGroup createLayout() {
        android.widget.LinearLayout layout = new android.widget.LinearLayout(getContext());
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        layout.setPadding(pad, pad, pad, pad);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        // Kubur Search section
        addSectionTitle(layout, "Kubur Search (kubursearch.com)");
        queryField = addField(layout, "Query");
        cemeteryField = addField(layout, "Cemetery (optional)");
        blockField = addField(layout, "Block (optional)");
        plotField = addField(layout, "Plot (optional)");
        addButton(layout, "Search Kubur Search", v -> {
            setBusy(true);
            apiClient.searchKuburSearch(
                queryField.getText().toString().trim(),
                cemeteryField.getText().toString().trim(),
                blockField.getText().toString().trim(),
                plotField.getText().toString().trim(),
                new ApiClient.ApiCallback<JSONObject>() {
                    @Override public void onSuccess(JSONObject result) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); showJson(result); });
                    }
                    @Override public void onError(String error) {
                        if (getActivity() == null) return;
                        getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                    }
                });
        });
        addButton(layout, "Kubur Search Info", v -> {
            setBusy(true);
            apiClient.getKuburSearchInfo(new ApiClient.ApiCallback<JSONObject>() {
                @Override public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); showJson(result); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });
        addButton(layout, "List Kubur Search Cemeteries", v -> {
            setBusy(true);
            apiClient.listKuburSearchCemeteries(new ApiClient.ApiCallback<JSONObject>() {
                @Override public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); showJson(result); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });
        addButton(layout, "List Kubur Search Sources", v -> {
            setBusy(true);
            apiClient.listKuburSearchSources(new ApiClient.ApiCallback<JSONObject>() {
                @Override public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); showJson(result); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });
        addButton(layout, "Kubur Search Coverage", v -> {
            setBusy(true);
            apiClient.getKuburSearchCoverage(new ApiClient.ApiCallback<JSONObject>() {
                @Override public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); showJson(result); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });

        // KuburSG section
        addSectionTitle(layout, "KuburSG (Singapore Muslim Cemeteries)");
        regionField = addField(layout, "Region (optional)");
        typeField = addField(layout, "Type (optional)");
        limitField = addField(layout, "Limit (default 20)");
        offsetField = addField(layout, "Offset (default 0)");
        addButton(layout, "Search KuburSG", v -> {
            setBusy(true);
            String q = queryField.getText().toString().trim();
            String cem = cemeteryField.getText().toString().trim();
            String reg = regionField.getText().toString().trim();
            String typ = typeField.getText().toString().trim();
            int lim = 20, off = 0;
            try { lim = Integer.parseInt(limitField.getText().toString().trim()); } catch (Exception e) {}
            try { off = Integer.parseInt(offsetField.getText().toString().trim()); } catch (Exception e) {}
            apiClient.searchKuburSG(q, cem, reg, typ, lim, off, new ApiClient.ApiCallback<JSONObject>() {
                @Override public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); showJson(result); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });
        addButton(layout, "KuburSG Cemeteries", v -> {
            setBusy(true);
            apiClient.getKuburSGCemeteries(new ApiClient.ApiCallback<JSONObject>() {
                @Override public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); showJson(result); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });
        addButton(layout, "KuburSG Sources", v -> {
            setBusy(true);
            apiClient.getKuburSGSources(new ApiClient.ApiCallback<JSONObject>() {
                @Override public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); showJson(result); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); resultText.setText("Error: " + error); });
                }
            });
        });

        // Result display
        resultText = new TextView(getContext());
        resultText.setPadding(0, pad, 0, pad);
        resultText.setTextSize(13);
        resultText.setText("Use the buttons above to query Kubur Search and KuburSG.");
        layout.addView(resultText);

        return layout;
    }

    private void addSectionTitle(ViewGroup layout, String title) {
        TextView tv = new TextView(getContext());
        tv.setText(title);
        tv.setTextSize(16);
        tv.setTypeface(tv.getTypeface(), android.graphics.Typeface.BOLD);
        int pad = (int) (8 * getResources().getDisplayMetrics().density);
        tv.setPadding(0, pad, 0, pad);
        layout.addView(tv);
    }

    private EditText addField(ViewGroup layout, String hint) {
        EditText et = new EditText(getContext());
        et.setHint(hint);
        layout.addView(et);
        return et;
    }

    private void addButton(ViewGroup layout, String label, View.OnClickListener listener) {
        Button btn = new Button(getContext());
        btn.setText(label);
        btn.setOnClickListener(listener);
        layout.addView(btn);
    }

    private void showJson(JSONObject result) {
        if (result == null) { resultText.setText("No data"); return; }
        try { resultText.setText(result.toString(2)); }
        catch (Exception e) { resultText.setText(result.toString()); }
    }

    private void setBusy(boolean busy) {
        if (progressBar != null) progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
    }
}
