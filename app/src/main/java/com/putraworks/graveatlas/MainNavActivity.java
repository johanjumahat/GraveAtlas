package com.putraworks.graveatlas;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentTransaction;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.ui.about.AboutFragment;
import com.putraworks.graveatlas.ui.addgrave.AddGraveFragment;
import com.putraworks.graveatlas.ui.contribute.ContributeFragment;
import com.putraworks.graveatlas.ui.home.HomeFragment;
import com.putraworks.graveatlas.ui.map.MapFragment;
import com.putraworks.graveatlas.ui.search.SearchFragment;
import com.putraworks.graveatlas.ui.settings.SettingsFragment;

/**
 * GraveAtlas — Main Activity with bottom navigation.
 *
 * Tab 1: Home       — overview and quick actions
 * Tab 2: Search    — search graves
 * Tab 3: Map       — map view
 * Tab 4: Add       — submit a new grave
 * Tab 5: Mine      — user contributions
 *
 * Settings, About, Cemeteries, and Grave Details accessible from Home.
 * Chat and Compass accessible from Home action buttons.
 */
public class MainNavActivity extends AppCompatActivity {

    private BottomNavigationView bottomNav;

    private static final String PREFS_NAME = "graveatlas_settings";
    private static final String KEY_API_URL = "api_url";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main_nav);

        // Load saved API URL before any API calls
        loadSavedApiUrl();

        bottomNav = findViewById(R.id.bottom_navigation);

        if (savedInstanceState == null) {
            loadFragment(new HomeFragment());
        }

        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home) {
                loadFragment(new HomeFragment());
                return true;
            } else if (id == R.id.nav_search) {
                loadFragment(new SearchFragment());
                return true;
            } else if (id == R.id.nav_map) {
                loadFragment(new MapFragment());
                return true;
            } else if (id == R.id.nav_add) {
                loadFragment(new AddGraveFragment());
                return true;
            } else if (id == R.id.nav_mine) {
                loadFragment(new ContributeFragment());
                return true;
            }
            return false;
        });
    }

    private void loadSavedApiUrl() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String savedUrl = prefs.getString(KEY_API_URL, "");
        if (!savedUrl.isEmpty()) {
            ApiClient.setBaseUrl(savedUrl);
        }
    }

    public void loadFragment(Fragment fragment) {
        FragmentManager fm = getSupportFragmentManager();
        FragmentTransaction tx = fm.beginTransaction();
        tx.replace(R.id.fragment_container, fragment);
        tx.commit();
    }

    public void navigateToSettings() {
        loadFragment(new SettingsFragment());
        bottomNav.setSelectedItemId(R.id.nav_home);
    }

    public void navigateToAbout() {
        loadFragment(new AboutFragment());
        bottomNav.setSelectedItemId(R.id.nav_home);
    }
}
