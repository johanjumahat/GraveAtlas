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
import com.putraworks.graveatlas.ui.navigation.InterfaceMode;
import com.putraworks.graveatlas.ui.navigation.InterfaceModeManager;
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
import com.putraworks.graveatlas.ui.tributes.TributesFragment;
import com.putraworks.graveatlas.ui.community.CommunityFragment;
import com.putraworks.graveatlas.ui.notifications.NotificationsFragment;
import com.putraworks.graveatlas.ui.analytics.AnalyticsFragment;
import com.putraworks.graveatlas.ui.intelligent.IntelligentSearchFragment;
import com.putraworks.graveatlas.ui.genealogy.GenealogyFragment;
import com.putraworks.graveatlas.ui.translation.TranslationFragment;
import com.putraworks.graveatlas.ui.memorial.MemorialFragment;
import com.putraworks.graveatlas.ui.reports.ReportsFragment;
import com.putraworks.graveatlas.ui.watchlist.WatchlistFragment;
import com.putraworks.graveatlas.ui.export.ExportFragment;
import com.putraworks.graveatlas.ui.provenance.ProvenanceFragment;
import com.putraworks.graveatlas.ui.enrichment.EnrichmentFragment;
import com.putraworks.graveatlas.ui.aiheadstone.AIHeadstoneFragment;
import com.putraworks.graveatlas.ui.sources.SourceVerificationFragment;
import com.putraworks.graveatlas.ui.spatial.SpatialFragment;
import com.putraworks.graveatlas.ui.photoassess.PhotoAssessmentsFragment;
import com.putraworks.graveatlas.ui.predictions.PredictionsFragment;
import com.putraworks.graveatlas.ui.nlquery.NLQueryFragment;
import com.putraworks.graveatlas.ui.summaries.SummariesFragment;
import com.putraworks.graveatlas.ui.linkage.LinkageFragment;
import com.putraworks.graveatlas.ui.dedupmerg.DedupMergeFragment;
import com.putraworks.graveatlas.ui.cleanup.CleanupAutoFixFragment;
import com.putraworks.graveatlas.ui.alerts.AlertsFragment;
import com.putraworks.graveatlas.ui.governance.GovernanceFragment;
import com.putraworks.graveatlas.ui.curation.CurationFragment;
import com.putraworks.graveatlas.ui.confidence.ConfidenceFragment;
import com.putraworks.graveatlas.ui.importbatch.ImportBatchFragment;
import com.putraworks.graveatlas.ui.kubursearch.KuburSearchFragment;
import com.putraworks.graveatlas.ui.externalconnectors.ExternalConnectorsFragment;
import com.putraworks.graveatlas.ui.admin.AdminFragment;

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

        // Phase 16.6: Initialize adaptive interface mode
        InterfaceModeManager.init(this);

        loadSavedApiUrl();

        // Phase 16.2: Initialize research session manager
        researchSessionManager = new ResearchSessionManager(this);

        // Handle deep link if launched from a share URL (Part 126)
        handleDeepLink(getIntent());

        bottomNav = findViewById(R.id.bottom_navigation);

        if (savedInstanceState == null) {
            loadFragment(getDefaultFragmentForMode());
        }

        // Phase 16.2: Persistent AI command bar (hidden in PUBLIC mode)
        aiCommandBar = findViewById(R.id.aiCommandBar);
        if (!InterfaceModeManager.showAICommandBar()) {
            aiCommandBar.setVisibility(View.GONE);
        }

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

        // Phase 16.6: Interface Mode selector
        try {
            sheetView.findViewById(R.id.moreInterfaceMode).setOnClickListener(v -> {
                dialog.dismiss();
                showInterfaceModeSelector();
            });
        } catch (Exception e) { /* ID not in layout yet — skip */ }

        // Phase 16.6: Admin/Import tools (INSTITUTION mode only)
        if (InterfaceModeManager.showAdminTools()) {
            try {
                sheetView.findViewById(R.id.moreAdmin).setVisibility(View.VISIBLE);
                sheetView.findViewById(R.id.moreAdmin).setOnClickListener(v -> {
                    dialog.dismiss();
                    loadFragment(new com.putraworks.graveatlas.ui.external.ExternalSearchFragment());
                    selectHomeTabSilently();
                });
            } catch (Exception e) { /* ID not in layout yet — skip */ }
        }


        // === Phase 17: Feature Parity — 15 new feature fragments ===

        // Community section
        try {
            sheetView.findViewById(R.id.moreTributes).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new TributesFragment());
                selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreCommunity).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new CommunityFragment());
                selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreNotifications).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new NotificationsFragment());
                selectHomeTabSilently();
            });
        } catch (Exception e) { /* IDs not in layout yet */ }

        // Research section
        try {
            sheetView.findViewById(R.id.moreIntelligentSearch).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new IntelligentSearchFragment());
                selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreGenealogy).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new GenealogyFragment());
                selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreTranslation).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new TranslationFragment());
                selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreMemorial).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new MemorialFragment());
                selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreEnrichment).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new EnrichmentFragment());
                selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreAIHeadstone).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new AIHeadstoneFragment());
                selectHomeTabSilently();
            });
        } catch (Exception e) { /* IDs not in layout yet */ }

        // Data & Quality section
        try {
            sheetView.findViewById(R.id.moreAnalytics).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new AnalyticsFragment());
                selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreReports).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new ReportsFragment());
                selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreWatchlist).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new WatchlistFragment());
                selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreExport).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new ExportFragment());
                selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreProvenance).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new ProvenanceFragment());
                selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreSourceVerify).setOnClickListener(v -> {
                dialog.dismiss();
                loadFragment(new SourceVerificationFragment());
                selectHomeTabSilently();
            });
        } catch (Exception e) { /* IDs not in layout yet */ }

        // === Phase 18: Advanced Tools — 13 new feature fragments ===
        try {
            sheetView.findViewById(R.id.moreSpatial).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new SpatialFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.morePredictions).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new PredictionsFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreNLQuery).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new NLQueryFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreSummaries).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new SummariesFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreLinkage).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new LinkageFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreDedup).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new DedupMergeFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreCleanup).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new CleanupAutoFixFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreAlerts).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new AlertsFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreGovernance).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new GovernanceFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreCuration).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new CurationFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreConfidence).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new ConfidenceFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreImport).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new ImportBatchFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.morePhotoAssess).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new PhotoAssessmentsFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreKuburSearch).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new KuburSearchFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreExtConnectors).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new ExternalConnectorsFragment()); selectHomeTabSilently();
            });
            sheetView.findViewById(R.id.moreAdmin).setOnClickListener(v -> {
                dialog.dismiss(); loadFragment(new AdminFragment()); selectHomeTabSilently();
            });
        } catch (Exception e) { /* IDs not in layout yet */ }


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
     * Phase 16.6: Get the default fragment for the current interface mode.
     */
    private Fragment getDefaultFragmentForMode() {
        InterfaceMode mode = InterfaceModeManager.getCurrentMode();
        switch (mode) {
            case MAP:
                return new MapFragment();
            case ARCHIVE:
                return new GlobalSearchFragment();
            case INSTITUTION:
            case PUBLIC:
            case RESEARCH:
            default:
                return new HomeFragment();
        }
    }

    /**
     * Phase 16.6: Show the interface mode selector dialog.
     */
    private void showInterfaceModeSelector() {
        String[] labels = new String[InterfaceMode.values().length];
        String[] descriptions = new String[InterfaceMode.values().length];
        for (int i = 0; i < InterfaceMode.values().length; i++) {
            labels[i] = InterfaceMode.values()[i].getLabel();
            descriptions[i] = InterfaceMode.values()[i].getDescription();
        }

        // Build display strings: "Label — description"
        String[] displayItems = new String[labels.length];
        for (int i = 0; i < labels.length; i++) {
            displayItems[i] = labels[i] + " — " + descriptions[i];
        }

        int currentIdx = InterfaceModeManager.getCurrentMode().ordinal();

        new androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Interface Mode")
            .setSingleChoiceItems(displayItems, currentIdx, (dlg, which) -> {
                InterfaceMode selected = InterfaceMode.values()[which];
                InterfaceModeManager.setMode(this, selected);
                InterfaceModeManager.markModeSelected(this);
                dlg.dismiss();
                // Recreate activity to apply mode changes
                recreate();
            })
            .setNegativeButton("Cancel", null)
            .show();
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
