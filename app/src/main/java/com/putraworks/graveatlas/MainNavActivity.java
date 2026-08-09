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
import com.putraworks.graveatlas.auth.LoginActivity;
import com.putraworks.graveatlas.ui.home.HomeFragment;
import com.putraworks.graveatlas.ui.map.MapFragment;
import com.putraworks.graveatlas.ui.search.SearchFragment;
import com.putraworks.graveatlas.ui.settings.SettingsFragment;

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

    private static final String PREFS_NAME = "graveatlas_settings";
    private static final String KEY_API_URL = "api_url";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main_nav);

        // Require Google login
        SecureStorage.init(this);
        if (!SecureStorage.isLoggedIn(this)) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }

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
            loadFragment(new AddGraveFragment());
            bottomNav.setSelectedItemId(R.id.nav_home);
            dialog.dismiss();
        });

        sheetView.findViewById(R.id.moreMine).setOnClickListener(v -> {
            loadFragment(new ContributeFragment());
            bottomNav.setSelectedItemId(R.id.nav_home);
            dialog.dismiss();
        });

        sheetView.findViewById(R.id.moreCemetery).setOnClickListener(v -> {
            loadFragment(new CemeteryFragment());
            bottomNav.setSelectedItemId(R.id.nav_home);
            dialog.dismiss();
        });

        sheetView.findViewById(R.id.moreCompass).setOnClickListener(v -> {
            startActivity(new Intent(this, CompassActivity.class));
            dialog.dismiss();
        });

        sheetView.findViewById(R.id.moreChat).setOnClickListener(v -> {
            startActivity(new Intent(this, MainActivity.class));
            dialog.dismiss();
        });

        sheetView.findViewById(R.id.moreSettings).setOnClickListener(v -> {
            loadFragment(new SettingsFragment());
            bottomNav.setSelectedItemId(R.id.nav_home);
            dialog.dismiss();
        });

        sheetView.findViewById(R.id.moreAbout).setOnClickListener(v -> {
            loadFragment(new AboutFragment());
            bottomNav.setSelectedItemId(R.id.nav_home);
            dialog.dismiss();
        });

        dialog.show();
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
