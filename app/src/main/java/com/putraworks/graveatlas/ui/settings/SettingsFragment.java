package com.putraworks.graveatlas.ui.settings;

import android.content.Context;
import android.content.SharedPreferences;
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
import com.putraworks.graveatlas.data.api.LocalCache;
import com.putraworks.graveatlas.auth.SecureStorage;
import com.putraworks.graveatlas.auth.LoginActivity;
import android.content.Intent;
import com.putraworks.graveatlas.R;

/**
 * Settings screen — API health check, API URL config, clear cache, about.
 */
public class SettingsFragment extends Fragment {

    private static final String PREFS_NAME = "graveatlas_settings";
    private static final String KEY_API_URL = "api_url";

    private ApiClient apiClient;
    private ProgressBar progressBar;
    private TextView healthResult;
    private EditText apiUrlField;
    private TextView currentUrlText;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        apiClient = new ApiClient();

        TextView title = new TextView(getContext());
        title.setText("Settings");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 24);
        layout.addView(title);

        // ── API Health Check ──
        TextView healthTitle = new TextView(getContext());
        healthTitle.setText("API Connection");
        healthTitle.setTextSize(15);
        healthTitle.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        healthTitle.setPadding(0, 0, 0, 8);
        layout.addView(healthTitle);

        Button healthBtn = new Button(getContext());
        healthBtn.setText("Test Connection");
        healthBtn.setAllCaps(false);
        layout.addView(healthBtn);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        healthResult = new TextView(getContext());
        healthResult.setPadding(0, 12, 0, 12);
        healthResult.setTextSize(13);
        layout.addView(healthResult);

        healthBtn.setOnClickListener(v -> checkHealth());

        // ── API URL Config ──
        TextView urlTitle = new TextView(getContext());
        urlTitle.setText("API URL");
        urlTitle.setTextSize(15);
        urlTitle.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        urlTitle.setPadding(0, 16, 0, 8);
        layout.addView(urlTitle);

        currentUrlText = new TextView(getContext());
        currentUrlText.setText("Current: " + apiClient.getBaseUrl());
        currentUrlText.setTextSize(12);
        currentUrlText.setTextColor(0xFF5F6368);
        currentUrlText.setPadding(0, 0, 0, 8);
        layout.addView(currentUrlText);

        apiUrlField = new EditText(getContext());
        apiUrlField.setHint("API URL (https://...)");
        apiUrlField.setSingleLine(true);
        apiUrlField.setPadding(16, 16, 16, 16);
        apiUrlField.setContentDescription("API URL input");
        // Load saved URL
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String savedUrl = prefs.getString(KEY_API_URL, "");
        if (!savedUrl.isEmpty()) apiUrlField.setText(savedUrl);
        layout.addView(apiUrlField);

        Button saveUrlBtn = new Button(getContext());
        saveUrlBtn.setText("Save URL");
        saveUrlBtn.setAllCaps(false);
        saveUrlBtn.setOnClickListener(v -> saveApiUrl());
        layout.addView(saveUrlBtn);

        Button resetUrlBtn = new Button(getContext());
        resetUrlBtn.setText("Reset to Default");
        resetUrlBtn.setAllCaps(false);
        resetUrlBtn.setOnClickListener(v -> {
            SharedPreferences p = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            p.edit().remove(KEY_API_URL).apply();
            ApiClient.setBaseUrl(null);
            apiUrlField.setText("");
            currentUrlText.setText("Current: " + new ApiClient().getBaseUrl());
        });
        layout.addView(resetUrlBtn);

        // ── Clear Cache ──
        TextView cacheTitle = new TextView(getContext());
        cacheTitle.setText("Data Cache");
        cacheTitle.setTextSize(15);
        cacheTitle.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        cacheTitle.setPadding(0, 16, 0, 8);
        layout.addView(cacheTitle);

        Button clearCacheBtn = new Button(getContext());
        clearCacheBtn.setText("Clear Cached Data");
        clearCacheBtn.setAllCaps(false);
        clearCacheBtn.setOnClickListener(v -> {
            LocalCache cache = new LocalCache(getContext());
            cache.clear();
            android.widget.Toast.makeText(getContext(), "Cache cleared", android.widget.Toast.LENGTH_SHORT).show();
        });
        layout.addView(clearCacheBtn);


        // ── Account ──
        TextView accountTitle = new TextView(getContext());
        accountTitle.setText("Account");
        accountTitle.setTextSize(15);
        accountTitle.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        accountTitle.setPadding(0, 16, 0, 8);
        layout.addView(accountTitle);

        TextView userInfo = new TextView(getContext());
        String userName = SecureStorage.getCurrentUserName(getContext());
        String userEmail = SecureStorage.getCurrentUserEmail(getContext());
        if (userName != null) {
            userInfo.setText("Signed in as: " + userName + "\n" + (userEmail != null ? userEmail : ""));
        } else {
            userInfo.setText("Not signed in");
        }
        userInfo.setTextSize(13);
        userInfo.setPadding(0, 0, 0, 12);
        layout.addView(userInfo);

        Button accountBtn = new Button(getContext());
        if (userName != null) {
            accountBtn.setText("Sign Out");
            accountBtn.setAllCaps(false);
            accountBtn.setOnClickListener(v -> {
                SecureStorage.clearCurrentUser(getContext());
                android.widget.Toast.makeText(getContext(), "Signed out", android.widget.Toast.LENGTH_SHORT).show();
                // Refresh the fragment to update UI
                if (getActivity() != null) {
                    getActivity().getSupportFragmentManager().beginTransaction()
                            .replace(R.id.fragment_container, new SettingsFragment())
                            .commit();
                }
            });
        } else {
            accountBtn.setText("Sign In with Google");
            accountBtn.setAllCaps(false);
            accountBtn.setOnClickListener(v -> {
                Intent intent = new Intent(getContext(), LoginActivity.class);
                startActivity(intent);
            });
        }
        layout.addView(accountBtn);

        return layout;
    }

    private void checkHealth() {
        progressBar.setVisibility(View.VISIBLE);
        healthResult.setText("Checking...");

        apiClient.checkHealth(new ApiClient.ApiCallback<ApiClient.HealthResult>() {
            @Override
            public void onSuccess(ApiClient.HealthResult result) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        StringBuilder sb = new StringBuilder();
                        sb.append("✓ API reachable\n");
                        sb.append("Status: ").append(result.status != null ? result.status : "unknown").append("\n");
                        sb.append("Service: ").append(result.service != null ? result.service : "unknown").append("\n");
                        sb.append("Data: ").append(result.githubConfigured ? "Available" : "Not configured");
                        if (!result.githubConfigured) {
                            sb.append("\n\nThe server is reachable and submissions still work, ")
                              .append("but the moderator's GitHub App credentials haven't been added ")
                              .append("to the Cloudflare Worker yet — so published grave/cemetery data ")
                              .append("can't be read back until that's configured on the backend.");
                        }
                        healthResult.setText(sb.toString());
                    });
                }
            }

            @Override
            public void onError(String error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        healthResult.setText("✗ " + error);
                    });
                }
            }
        });
    }

    private void saveApiUrl() {
        String url = apiUrlField.getText().toString().trim();
        if (url.isEmpty()) {
            android.widget.Toast.makeText(getContext(), "Please enter a URL", android.widget.Toast.LENGTH_SHORT).show();
            return;
        }
        if (!url.startsWith("https://")) {
            android.widget.Toast.makeText(getContext(), "URL must start with https://", android.widget.Toast.LENGTH_SHORT).show();
            return;
        }
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_API_URL, url).apply();
        ApiClient.setBaseUrl(url);
        currentUrlText.setText("Current: " + url);
        apiClient = new ApiClient();
        android.widget.Toast.makeText(getContext(), "API URL saved", android.widget.Toast.LENGTH_SHORT).show();
    }
}
