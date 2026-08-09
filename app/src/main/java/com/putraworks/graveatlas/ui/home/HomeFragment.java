package com.putraworks.graveatlas.ui.home;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.MainActivity;
import com.putraworks.graveatlas.MainNavActivity;
import com.putraworks.graveatlas.compass.CompassActivity;
import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.api.LocalCache;
import com.putraworks.graveatlas.data.model.GraveRecord;
import com.putraworks.graveatlas.ui.about.AboutFragment;
import com.putraworks.graveatlas.ui.addgrave.AddGraveFragment;
import com.putraworks.graveatlas.ui.cemetery.CemeteryFragment;
import com.putraworks.graveatlas.ui.contribute.ContributeFragment;
import com.putraworks.graveatlas.ui.map.MapFragment;
import com.putraworks.graveatlas.ui.search.SearchFragment;
import com.putraworks.graveatlas.ui.settings.SettingsFragment;

import java.util.List;

/**
 * Home screen — landing page with overview and quick action buttons.
 * Shows data summary from API (grave count) if available.
 */
public class HomeFragment extends Fragment {

    private TextView summaryText;
    private ProgressBar summaryProgress;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(48, 64, 48, 48);
        layout.setGravity(android.view.Gravity.CENTER_HORIZONTAL);

        // Title
        TextView title = new TextView(getContext());
        title.setText("GraveAtlas");
        title.setTextSize(28);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        // Subtitle
        TextView subtitle = new TextView(getContext());
        subtitle.setText("Discover, record, and search public cemetery information");
        subtitle.setTextSize(14);
        subtitle.setPadding(0, 0, 0, 16);
        subtitle.setMaxLines(2);
        subtitle.setGravity(android.view.Gravity.CENTER);
        layout.addView(subtitle);

        // Data summary
        summaryProgress = new ProgressBar(getContext());
        summaryProgress.setVisibility(View.GONE);
        layout.addView(summaryProgress);

        summaryText = new TextView(getContext());
        summaryText.setTextSize(13);
        summaryText.setTextColor(0xFF5F6368);
        summaryText.setPadding(0, 0, 0, 16);
        summaryText.setGravity(android.view.Gravity.CENTER);
        layout.addView(summaryText);

        // Quick action buttons
        String[] actions = {"Search Graves", "Browse Cemeteries", "Add a Grave", "Browse Map", "My Contributions", "Compass + GPS"};
        String[] targets = {"search", "cemetery", "add", "map", "mine", "compass"};

        for (int i = 0; i < actions.length; i++) {
            Button btn = new Button(getContext());
            btn.setText(actions[i]);
            btn.setAllCaps(false);
            btn.setContentDescription(actions[i]);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 8, 0, 8);
            btn.setLayoutParams(lp);
            final String target = targets[i];
            btn.setOnClickListener(v -> handleAction(target));
            layout.addView(btn);
        }

        // Settings and About
        Button settingsBtn = new Button(getContext());
        settingsBtn.setText("Settings");
        settingsBtn.setAllCaps(false);
        settingsBtn.setOnClickListener(v -> loadFragment(new SettingsFragment()));
        layout.addView(settingsBtn);

        Button aboutBtn = new Button(getContext());
        aboutBtn.setText("About");
        aboutBtn.setAllCaps(false);
        aboutBtn.setOnClickListener(v -> loadFragment(new AboutFragment()));
        layout.addView(aboutBtn);

        // Chat button
        Button chatBtn = new Button(getContext());
        chatBtn.setText("AI Chat");
        chatBtn.setAllCaps(false);
        chatBtn.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), MainActivity.class);
            startActivity(intent);
        });
        layout.addView(chatBtn);

        // Load data summary
        loadDataSummary();

        return layout;
    }

    private void loadDataSummary() {
        LocalCache cache = new LocalCache(getContext());
        List<GraveRecord> cached = cache.getCachedGraves();
        if (!cached.isEmpty()) {
            summaryText.setText(cached.size() + " graves in database");
        }

        ApiClient apiClient = new ApiClient();
        apiClient.getGraves(new ApiClient.ApiCallback<List<GraveRecord>>() {
            @Override
            public void onSuccess(List<GraveRecord> result) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        summaryText.setText(result.size() + " graves in database");
                    });
                }
            }

            @Override
            public void onError(String error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        if (cached.isEmpty()) {
                            summaryText.setText("Connect to see available graves");
                        }
                    });
                }
            }
        });
    }

    private void handleAction(String target) {
        Fragment frag = null;
        switch (target) {
            case "search": frag = new SearchFragment(); break;
            case "cemetery": frag = new CemeteryFragment(); break;
            case "add": frag = new AddGraveFragment(); break;
            case "map": frag = new MapFragment(); break;
            case "mine": frag = new ContributeFragment(); break;
            case "compass":
                startActivity(new Intent(getActivity(), CompassActivity.class));
                return;
        }
        if (frag != null) loadFragment(frag);
    }

    private void loadFragment(Fragment fragment) {
        if (getActivity() instanceof MainNavActivity) {
            ((MainNavActivity) getActivity()).loadFragment(fragment);
        } else {
            getParentFragmentManager().beginTransaction()
                    .replace(android.R.id.content, fragment)
                    .addToBackStack(null)
                    .commit();
        }
    }
}
