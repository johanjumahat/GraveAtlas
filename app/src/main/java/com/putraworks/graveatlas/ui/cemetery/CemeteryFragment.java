package com.putraworks.graveatlas.ui.cemetery;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
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
import com.putraworks.graveatlas.data.api.ApiErrorHandler;
import com.putraworks.graveatlas.data.api.LocalCache;
import com.putraworks.graveatlas.data.model.CemeteryRecord;

import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;
import com.putraworks.graveatlas.data.model.CemeteryRecord;
import com.putraworks.graveatlas.data.model.ConnectionNetwork;
import com.putraworks.graveatlas.data.model.DuplicateResult;
import com.putraworks.graveatlas.data.model.CityInfo;
import com.putraworks.graveatlas.data.model.CountryInfo;
import com.putraworks.graveatlas.data.model.RegionInfo;
import com.putraworks.graveatlas.data.model.SearchResult;
import java.util.List;
import org.json.JSONObject;

/**
 * Cemetery discovery screen — browse and search cemeteries.
 * Shows cemetery name, address, coordinates, and allows opening in maps.
 */
public class CemeteryFragment extends Fragment implements ApiClient.ApiCallback<List<CemeteryRecord>> {

    private static final String ARG_CEMETERY_ID = "cemetery_id";

    public static CemeteryFragment newInstance(String cemeteryId) {
        CemeteryFragment fragment = new CemeteryFragment();
        Bundle args = new Bundle();
        args.putString(ARG_CEMETERY_ID, cemeteryId);
        fragment.setArguments(args);
        return fragment;
    }

    private static final int DEBOUNCE_MS = 400;

    private EditText searchInput;
    private LinearLayout resultsContainer;
    private ProgressBar progressBar;
    private TextView statusText;
    private Button retryBtn;
    private ApiClient apiClient;
    private LocalCache cache;
    private List<CemeteryRecord> allCemeteries = new ArrayList<>();
    private Handler debounceHandler = new Handler(Looper.getMainLooper());
    private Runnable debounceRunnable;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        apiClient = new ApiClient();
        cache = new LocalCache(getContext());

        TextView title = new TextView(getContext());
        title.setText("Cemeteries");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 16);
        layout.addView(title);

        searchInput = new EditText(getContext());
        searchInput.setHint("Search cemetery name...");
        searchInput.setPadding(24, 24, 24, 24);
        searchInput.setSingleLine(true);
        searchInput.setContentDescription("Cemetery search field");
        layout.addView(searchInput);

        statusText = new TextView(getContext());
        statusText.setPadding(0, 16, 0, 16);
        statusText.setTextSize(13);
        layout.addView(statusText);

        Button getCemeteryBtn = new Button(getContext());
        getCemeteryBtn.setText("Get Cemetery");
        getCemeteryBtn.setAllCaps(false);
        layout.addView(getCemeteryBtn);
        Button connectionsBtn = new Button(getContext());
        connectionsBtn.setText("Cemetery Connections");
        connectionsBtn.setAllCaps(false);
        layout.addView(connectionsBtn);
        Button dupBtn = new Button(getContext());
        dupBtn.setText("Cemetery Duplicates");
        dupBtn.setAllCaps(false);
        layout.addView(dupBtn);
        Button citiesBtn = new Button(getContext());
        citiesBtn.setText("Get Cities");
        citiesBtn.setAllCaps(false);
        layout.addView(citiesBtn);
        Button countriesBtn = new Button(getContext());
        countriesBtn.setText("Get Countries");
        countriesBtn.setAllCaps(false);
        layout.addView(countriesBtn);
        Button regionsBtn = new Button(getContext());
        regionsBtn.setText("Get Regions");
        regionsBtn.setAllCaps(false);
        layout.addView(regionsBtn);
        Button spatialInfoBtn = new Button(getContext());
        spatialInfoBtn.setText("Spatial Info");
        spatialInfoBtn.setAllCaps(false);
        layout.addView(spatialInfoBtn);
        Button searchBtn2 = new Button(getContext());
        searchBtn2.setText("Search");
        searchBtn2.setAllCaps(false);
        layout.addView(searchBtn2);
        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        progressBar.setContentDescription("Loading");
        layout.addView(progressBar);

        retryBtn = new Button(getContext());
        retryBtn.setText("Retry");
        retryBtn.setAllCaps(false);
        retryBtn.setVisibility(View.GONE);
        retryBtn.setOnClickListener(v -> loadCemeteries());
        layout.addView(retryBtn);

        resultsContainer = new LinearLayout(getContext());
        resultsContainer.setOrientation(LinearLayout.VERTICAL);
        layout.addView(resultsContainer);

        // Load from cache first
        List<CemeteryRecord> cached = cache.getCachedCemeteries();
        if (!cached.isEmpty()) {
            allCemeteries = cached;
            statusText.setText(cached.size() + " cemeteries (cached)");
            displayResults(cached);
        }

        loadCemeteries();

        searchInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (debounceRunnable != null) debounceHandler.removeCallbacks(debounceRunnable);
                debounceRunnable = () -> filterResults(s.toString());
                debounceHandler.postDelayed(debounceRunnable, DEBOUNCE_MS);
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });

        getCemeteryBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getCemetery("", new ApiClient.ApiCallback<CemeteryRecord>() {
                @Override public void onSuccess(CemeteryRecord result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText(result != null ? result.toString() : "No data"); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        connectionsBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getCemeteryConnections("", new ApiClient.ApiCallback<ConnectionNetwork>() {
                @Override public void onSuccess(ConnectionNetwork result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText(result != null ? result.toString() : "No data"); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        dupBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getCemeteryDuplicates("", new ApiClient.ApiCallback<DuplicateResult>() {
                @Override public void onSuccess(DuplicateResult result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText(result != null ? result.toString() : "No data"); });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        citiesBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getCities("", "", new ApiClient.ApiCallback<java.util.List<CityInfo>>() {
                @Override public void onSuccess(java.util.List<CityInfo> result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        setBusy(false);
                        if (result == null || result.isEmpty()) { statusText.setText("No results"); return; }
                        StringBuilder sb = new StringBuilder();
                        for (CityInfo item : result) sb.append(item.toString()).append("\n");
                        statusText.setText(sb.toString());
                    });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        countriesBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getCountries( new ApiClient.ApiCallback<java.util.List<CountryInfo>>() {
                @Override public void onSuccess(java.util.List<CountryInfo> result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        setBusy(false);
                        if (result == null || result.isEmpty()) { statusText.setText("No results"); return; }
                        StringBuilder sb = new StringBuilder();
                        for (CountryInfo item : result) sb.append(item.toString()).append("\n");
                        statusText.setText(sb.toString());
                    });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        regionsBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getRegions("", new ApiClient.ApiCallback<java.util.List<RegionInfo>>() {
                @Override public void onSuccess(java.util.List<RegionInfo> result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        setBusy(false);
                        if (result == null || result.isEmpty()) { statusText.setText("No results"); return; }
                        StringBuilder sb = new StringBuilder();
                        for (RegionInfo item : result) sb.append(item.toString()).append("\n");
                        statusText.setText(sb.toString());
                    });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        spatialInfoBtn.setOnClickListener(v -> {
            setBusy(true);
            apiClient.getSpatialInfo( new ApiClient.ApiCallback<JSONObject>() {
                @Override public void onSuccess(JSONObject result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); try { statusText.setText(result.toString(2)); } catch (Exception e) { statusText.setText(result.toString()); } });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        searchBtn2.setOnClickListener(v -> {
            setBusy(true);
            apiClient.search("", new ApiClient.ApiCallback<java.util.List<SearchResult>>() {
                @Override public void onSuccess(java.util.List<SearchResult> result) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> {
                        setBusy(false);
                        if (result == null || result.isEmpty()) { statusText.setText("No results"); return; }
                        StringBuilder sb = new StringBuilder();
                        for (SearchResult item : result) sb.append(item.toString()).append("\n");
                        statusText.setText(sb.toString());
                    });
                }
                @Override public void onError(String error) {
                    if (getActivity() == null) return;
                    getActivity().runOnUiThread(() -> { setBusy(false); statusText.setText("Error: " + error); });
                }
            });
        });

        return layout;
    }

    private void loadCemeteries() {
        progressBar.setVisibility(View.VISIBLE);
        statusText.setText("Loading cemeteries...");
        retryBtn.setVisibility(View.GONE);
        resultsContainer.removeAllViews();
        apiClient.getCemeteries(this);
    }

    private void filterResults(String query) {
        resultsContainer.removeAllViews();
        if (query.isEmpty()) {
            displayResults(allCemeteries);
            statusText.setText(allCemeteries.size() + " cemeteries");
            return;
        }
        String q = query.toLowerCase();
        List<CemeteryRecord> filtered = new ArrayList<>();
        for (CemeteryRecord c : allCemeteries) {
            if (c.name != null && c.name.toLowerCase().contains(q)) filtered.add(c);
            else if (c.address != null && c.address.toLowerCase().contains(q)) filtered.add(c);
        }
        statusText.setText(filtered.size() + " results for \"" + query + "\"");
        displayResults(filtered);
    }

    private void displayResults(List<CemeteryRecord> cemeteries) {
        if (cemeteries.isEmpty()) {
            TextView empty = new TextView(getContext());
            empty.setText(allCemeteries.isEmpty() ? "No cemeteries available yet." : "No cemeteries found");
            empty.setPadding(0, 24, 0, 24);
            resultsContainer.addView(empty);
            return;
        }
        for (CemeteryRecord c : cemeteries) {
            TextView card = new TextView(getContext());
            StringBuilder sb = new StringBuilder();
            sb.append(c.name != null ? c.name : "Unknown Cemetery");
            if (c.address != null) sb.append("\n📍 ").append(c.address);
            if (c.hasCoordinates()) {
                sb.append(String.format("\n%s, %s",
                        String.format("%.4f", c.latitude),
                        String.format("%.4f", c.longitude)));
            }
            if (c.description != null) sb.append("\n").append(c.description);
            card.setText(sb.toString());
            card.setPadding(24, 24, 24, 24);
            card.setTextSize(14);
            card.setContentDescription("Cemetery: " + (c.name != null ? c.name : "Unknown"));

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 12);
            card.setLayoutParams(lp);

            if (c.hasCoordinates()) {
                card.setOnClickListener(v -> {
                    String geoUri = String.format("geo:%f,%f?q=%f,%f(%s)",
                            c.latitude, c.longitude,
                            c.latitude, c.longitude,
                            c.name != null ? c.name : "Cemetery");
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(geoUri));
                    startActivity(intent);
                });
            }
            resultsContainer.addView(card);
        }
    }

    @Override
    public void onSuccess(List<CemeteryRecord> result) {
        allCemeteries = result;
        cache.cacheCemeteries(result);
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                progressBar.setVisibility(View.GONE);
                statusText.setText(result.size() + " cemeteries");
                String query = searchInput.getText().toString();
                if (query.isEmpty()) displayResults(result);
                else filterResults(query);
            });
        }
    }

    @Override
    public void onError(String error) {
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                progressBar.setVisibility(View.GONE);
                if (!allCemeteries.isEmpty()) {
                    statusText.setText("Showing cached data (" + allCemeteries.size() + " cemeteries)");
                    displayResults(allCemeteries);
                } else {
                    statusText.setText(error);
                    retryBtn.setVisibility(View.VISIBLE);
                }
            });
        }
    }

    private void setBusy(boolean busy) {
        if (progressBar != null) progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
    }

}
