package com.putraworks.graveatlas;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentTransaction;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.ui.about.AboutFragment;
import com.putraworks.graveatlas.compass.CompassActivity;
import com.putraworks.graveatlas.ui.addgrave.AddGraveFragment;
import com.putraworks.graveatlas.ui.cemetery.CemeteryFragment;
import com.putraworks.graveatlas.ui.contribute.ContributeFragment;
import com.putraworks.graveatlas.auth.SecureStorage;
import com.putraworks.graveatlas.ui.ai.AICommandBar;
import com.putraworks.graveatlas.ui.ai.ResearchSessionManager;
import com.putraworks.graveatlas.ui.home.HomeFragment;
import com.putraworks.graveatlas.ui.map.MapFragment;
import com.putraworks.graveatlas.ui.search.SearchFragment;
import com.putraworks.graveatlas.ui.search.GlobalSearchFragment;
import com.putraworks.graveatlas.ui.nearby.NearbyFragment;
import com.putraworks.graveatlas.ui.saved.SavedFragment;
import com.putraworks.graveatlas.ui.timeline.TimelineFragment;
import com.putraworks.graveatlas.ui.settings.SettingsFragment;
import com.putraworks.graveatlas.ui.gravedetail.GraveDetailFragment;
import com.putraworks.graveatlas.utils.ShareUtils;

/**
 * GraveAtlas — Main Activity with bottom navigation (NurOne-style).
 *
 * Tab 1: Home       — overview and quick actions
 * Tab 2: Search     — search graves
 * Tab 3: Map        — map view
 * Tab 4: More       — bottom sheet with: Add Grave, Mine, Cemeteries, Compass,
 *                     AI Chat, Settings, About
 */
public class MainNavActivity extends AppCompatActivity {

    private BottomNavigationView bottomNav;
    private AICommandBar aiCommandBar;
    private ResearchSessionManager researchSessionManager;
    private boolean suppressNavListener = false;
    private Fragment currentFragment;

    private static final String PREFS_NAME = "graveatlas_settings";
    private static final String KEY_API_URL = "api_url";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main_nav);

        // Login is optional — app works without it.
        // Login unlocks per-user encrypted storage (chat history, API keys).
        SecureStorage.init(this);
        ApiClient.setSessionContext(this);

        loadSavedApiUrl();

        // Phase 16.2: Initialize research session manager
        researchSessionManager = new ResearchSessionManager(this);

        // Handle deep link if launched from a share URL (Part 126)
        handleDeepLink(getIntent());

        bottomNav = findViewById(R.id.bottom_navigation);

        if (savedInstanceState == null) {
            loadFragment(new HomeFragment());
        }

        // Phase 16.2: Persistent AI command bar
        aiCommandBar = findViewById(R.id.aiCommandBar);

        bottomNav.setOnItemSelectedListener(item -> {
            if (suppressNavListener) return true;
            int id = item.getItemId();
            if (id == R.id.nav_home) {
                loadFragment(new HomeFragment());
                return true;
            } else if (id == R.id.nav_search) {
                loadFragment(new GlobalSearchFragment());
                return true;
            } else if (id == R.id.nav_map) {
                loadFragment(new MapFragment());
                return true;
            } else if (id == R.id.nav_more) {
                showMoreSheet();
                return false; // don't select "More" as active tab
            }
            return false;
        });
    }

    private void showMoreSheet() {
        View sheetView = LayoutInflater.from(this).inflate(R.layout.sheet_more, null);
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        dialog.setContentView(sheetView);

        sheetView.findViewById(R.id.moreAdd).setOnClickListener(v -> {
            dialog.dismiss();
            loadFragment(new AddGraveFragment());
            selectHomeTabSilently();
        });

        sheetView.findViewById(R.id.moreMine).setOnClickListener(v -> {
            dialog.dismiss();
            loadFragment(new ContributeFragment());
            selectHomeTabSilently();
        });

        sheetView.findViewById(R.id.moreCemetery).setOnClickListener(v -> {
            dialog.dismiss();
            loadFragment(new CemeteryFragment());
            selectHomeTabSilently();
        });

        sheetView.findViewById(R.id.moreCompass).setOnClickListener(v -> {
            dialog.dismiss();
            startActivity(new Intent(this, CompassActivity.class));
        });

        // Phase 7B: Nearby and Saved
        try {
            sheetView.findViewById(R.id.moreNearby).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new NearbyFragment());
                selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreSaved).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new SavedFragment());
                selectHomeTabSilently();
            });
        } catch (Exception e) { /* IDs not in layout yet — skip */ }

        // Phase 16.3: Timeline
        try {
            sheetView.findViewById(R.id.moreTimeline).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new TimelineFragment());
                selectHomeTabSilently();
            });
        } catch (Exception e) { /* ID not in layout yet — skip */ }

        sheetView.findViewById(R.id.moreChat).setOnClickListener(v -> {
            dialog.dismiss();
            startActivity(new Intent(this, MainActivity.class));
        });

        sheetView.findViewById(R.id.moreSettings).setOnClickListener(v -> {
            dialog.dismiss();
            loadFragment(new SettingsFragment());
            selectHomeTabSilently();
        });

        sheetView.findViewById(R.id.moreAbout).setOnClickListener(v -> {
            dialog.dismiss();
            loadFragment(new AboutFragment());
            selectHomeTabSilently();
        });

        dialog.show();
    }

    /**
     * Selects the Home tab in the bottom nav without triggering the
     * OnItemSelectedListener (which would overwrite the fragment we
     * just loaded with a fresh HomeFragment).
     */
    private void selectHomeTabSilently() {
        suppressNavListener = true;
        bottomNav.setSelectedItemId(R.id.nav_home);
        suppressNavListener = false;
    }

    private void loadSavedApiUrl() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String savedUrl = prefs.getString(KEY_API_URL, "");
        if (!savedUrl.isEmpty()) {
            ApiClient.setBaseUrl(savedUrl);
        }
    }

    public void loadFragment(Fragment fragment) {
        currentFragment = fragment;
        FragmentManager fm = getSupportFragmentManager();
        FragmentTransaction tx = fm.beginTransaction();
        tx.replace(R.id.fragment_container, fragment);
        tx.commit();
    }

    public void navigateToSettings() {
        loadFragment(new SettingsFragment());
        selectHomeTabSilently();
    }

    public void navigateToAbout() {
        loadFragment(new AboutFragment());
        selectHomeTabSilently();
    }

    /**
     * Back button: if not on Home, go to Home. If on Home, exit app.
     * This prevents the app from closing immediately when on a sub-page.
     */
    @Override
    public void onBackPressed() {
        if (currentFragment instanceof HomeFragment) {
            super.onBackPressed();
        } else {
            loadFragment(new HomeFragment());
            selectHomeTabSilently();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleDeepLink(intent);
    }

    /**
     * Parse incoming deep links or share URLs and navigate to the record (Part 126).
     * Format: graveatlas://record/{type}/{id}
     *      or https://graveatlas.../record/{type}/{id}
     */
    private void handleDeepLink(Intent intent) {
        if (intent == null) return;
        android.net.Uri data = intent.getData();
        if (data == null) return;

        ShareUtils.ParsedDeepLink link = ShareUtils.parseDeepLink(data);
        if (link == null) {
            link = ShareUtils.parseShareUrl(data);
        }
        if (link == null) return;

        // Navigate to the appropriate detail fragment
        if ("cemetery".equals(link.type)) {
            loadFragment(CemeteryFragment.newInstance(link.id));
        } else if ("person".equals(link.type) || "grave".equals(link.type) || "memorial".equals(link.type)) {
            loadFragment(GraveDetailFragment.newInstance(link.id));
        }
        selectHomeTabSilently();
    }
}
