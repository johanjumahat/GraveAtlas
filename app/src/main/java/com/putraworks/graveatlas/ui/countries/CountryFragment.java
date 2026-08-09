package com.putraworks.graveatlas.ui.countries;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.MainNavActivity;
import com.putraworks.graveatlas.R;
import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.api.LocalCache;
import com.putraworks.graveatlas.data.model.CemeteryRecord;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Country discovery screen — browse countries, search, see cemetery counts.
 *
 * Users navigate: WORLD → COUNTRY → REGION → CITY → CEMETERY → GRAVE
 * This screen shows the country list and lets users drill into regions/cities.
 *
 * Distinguishes "No GraveAtlas data" from "No cemeteries known".
 */
public class CountryFragment extends Fragment implements ApiClient.ApiCallback<List<CemeteryRecord>> {

    private static final int DEBOUNCE_MS = 300;

    private EditText searchInput;
    private LinearLayout resultsContainer;
    private ProgressBar progressBar;
    private TextView statusText;
    private ApiClient apiClient;
    private Handler debounceHandler = new Handler(Looper.getMainLooper());
    private Runnable debounceRunnable;
    private List<CountryInfo> allCountries = new ArrayList<>();

    /**
     * Country info for the directory display.
     */
    public static class CountryInfo {
        public String code;
        public String name;
        public String localName;
        public int cemeteryCount;
        public boolean hasData;

        public CountryInfo(String code, String name, String localName, int cemeteryCount, boolean hasData) {
            this.code = code;
            this.name = name;
            this.localName = localName;
            this.cemeteryCount = cemeteryCount;
            this.hasData = hasData;
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        apiClient = new ApiClient();

        // Title
        TextView title = new TextView(getContext());
        title.setText("Countries");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        layout.addView(title);

        TextView subtitle = new TextView(getContext());
        subtitle.setText("Browse cemeteries worldwide. Tap a country to see its regions.");
        subtitle.setTextSize(12);
        subtitle.setTextColor(0xFF5F6368);
        subtitle.setPadding(0, 0, 0, 16);
        layout.addView(subtitle);

        // Search bar
        searchInput = new EditText(getContext());
        searchInput.setHint("Search countries...");
        searchInput.setPadding(24, 24, 24, 24);
        searchInput.setSingleLine(true);
        layout.addView(searchInput);

        // Status
        statusText = new TextView(getContext());
        statusText.setPadding(0, 16, 0, 16);
        statusText.setTextSize(13);
        layout.addView(statusText);

        // Progress
        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        // Results
        resultsContainer = new LinearLayout(getContext());
        resultsContainer.setOrientation(LinearLayout.VERTICAL);
        layout.addView(resultsContainer);

        // Load country list
        loadCountries();

        // Search with debounce
        searchInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (debounceRunnable != null) {
                    debounceHandler.removeCallbacks(debounceRunnable);
                }
                debounceRunnable = () -> filterCountries(s.toString());
                debounceHandler.postDelayed(debounceRunnable, DEBOUNCE_MS);
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });

        return layout;
    }

    private void loadCountries() {
        progressBar.setVisibility(View.VISIBLE);
        statusText.setText("Loading countries...");

        // Load cemeteries to count per country
        apiClient.getCemeteries(new ApiClient.ApiCallback<List<CemeteryRecord>>() {
            @Override
            public void onSuccess(List<CemeteryRecord> result) {
                buildCountryDirectory(result);
            }

            @Override
            public void onError(String error) {
                // Still show country directory without cemetery counts
                buildCountryDirectory(new ArrayList<>());
            }
        });
    }

    private void buildCountryDirectory(List<CemeteryRecord> cemeteries) {
        // Count cemeteries per country
        java.util.Map<String, Integer> countByCountry = new java.util.HashMap<>();
        java.util.Set<String> countriesWithData = new java.util.HashSet<>();
        for (CemeteryRecord c : cemeteries) {
            if (c.country != null && !c.country.isEmpty() && "published".equals(c.status)) {
                countByCountry.merge(c.country, 1, Integer::sum);
                if (c.countryCode != null) countriesWithData.add(c.countryCode);
            }
        }

        // Build the country directory from a static list of major countries
        // In production, this would come from the /api/countries endpoint
        allCountries = createCountryDirectory(countByCountry, countriesWithData);

        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                progressBar.setVisibility(View.GONE);
                statusText.setText(allCountries.size() + " countries available");
                displayCountries(allCountries);
            });
        }
    }

    private List<CountryInfo> createCountryDirectory(java.util.Map<String, Integer> countByCountry, java.util.Set<String> countriesWithData) {
        List<CountryInfo> countries = new ArrayList<>();
        // Major countries with local names
        String[][] base = {
            {"AF", "Afghanistan", "افغانستان"},
            {"AR", "Argentina", "Argentina"},
            {"AU", "Australia", "Australia"},
            {"AT", "Austria", "Österreich"},
            {"BE", "Belgium", "België"},
            {"BR", "Brazil", "Brasil"},
            {"BG", "Bulgaria", "България"},
            {"CA", "Canada", "Canada"},
            {"CN", "China", "中国"},
            {"HR", "Croatia", "Hrvatska"},
            {"CZ", "Czech Republic", "Česko"},
            {"DK", "Denmark", "Danmark"},
            {"EG", "Egypt", "مصر"},
            {"FI", "Finland", "Suomi"},
            {"FR", "France", "France"},
            {"DE", "Germany", "Deutschland"},
            {"GR", "Greece", "Ελλάδα"},
            {"HU", "Hungary", "Magyarország"},
            {"IS", "Iceland", "Ísland"},
            {"IN", "India", "भारत"},
            {"ID", "Indonesia", "Indonesia"},
            {"IR", "Iran", "ایران"},
            {"IQ", "Iraq", "العراق"},
            {"IE", "Ireland", "Éire"},
            {"IL", "Israel", "ישראל"},
            {"IT", "Italy", "Italia"},
            {"JP", "Japan", "日本"},
            {"JO", "Jordan", "الأردن"},
            {"KZ", "Kazakhstan", "Қазақстан"},
            {"MY", "Malaysia", "Malaysia"},
            {"MX", "Mexico", "México"},
            {"MA", "Morocco", "المغرب"},
            {"NL", "Netherlands", "Nederland"},
            {"NZ", "New Zealand", "New Zealand"},
            {"NG", "Nigeria", "Nigeria"},
            {"NO", "Norway", "Norge"},
            {"PK", "Pakistan", "پاکستان"},
            {"PE", "Peru", "Perú"},
            {"PH", "Philippines", "Pilipinas"},
            {"PL", "Poland", "Polska"},
            {"PT", "Portugal", "Portugal"},
            {"RO", "Romania", "România"},
            {"RU", "Russia", "Россия"},
            {"SA", "Saudi Arabia", "المملكة العربية السعودية"},
            {"RS", "Serbia", "Србија"},
            {"SG", "Singapore", "新加坡"},
            {"ZA", "South Africa", "South Africa"},
            {"KR", "South Korea", "한국"},
            {"ES", "Spain", "España"},
            {"SE", "Sweden", "Sverige"},
            {"CH", "Switzerland", "Schweiz"},
            {"TH", "Thailand", "ประเทศไทย"},
            {"TR", "Turkey", "Türkiye"},
            {"UA", "Ukraine", "Україна"},
            {"AE", "United Arab Emirates", "الإمارات العربية المتحدة"},
            {"GB", "United Kingdom", "United Kingdom"},
            {"US", "United States", "United States"},
            {"VN", "Vietnam", "Việt Nam"},
        };

        for (String[] c : base) {
            String code = c[0];
            String name = c[1];
            String localName = c[2];
            int count = 0;
            // Match by country name or code
            if (countByCountry.containsKey(name)) count = countByCountry.get(name);
            boolean hasData = countriesWithData.contains(code) || count > 0;
            countries.add(new CountryInfo(code, name, localName, count, hasData));
        }

        return countries;
    }

    private void filterCountries(String query) {
        resultsContainer.removeAllViews();
        if (query.isEmpty()) {
            displayCountries(allCountries);
            statusText.setText(allCountries.size() + " countries available");
            return;
        }
        String q = query.toLowerCase();
        List<CountryInfo> filtered = new ArrayList<>();
        for (CountryInfo c : allCountries) {
            if (c.name.toLowerCase().contains(q) ||
                (c.localName != null && c.localName.toLowerCase().contains(q)) ||
                c.code.toLowerCase().equals(q)) {
                filtered.add(c);
            }
        }
        statusText.setText(filtered.size() + " results");
        displayCountries(filtered);
    }

    private void displayCountries(List<CountryInfo> countries) {
        resultsContainer.removeAllViews();
        if (countries.isEmpty()) {
            TextView empty = new TextView(getContext());
            empty.setText("No countries found");
            empty.setPadding(0, 24, 0, 24);
            resultsContainer.addView(empty);
            return;
        }

        for (CountryInfo c : countries) {
            TextView card = new TextView(getContext());
            StringBuilder sb = new StringBuilder();
            sb.append(c.name);
            if (c.localName != null && !c.localName.equals(c.name)) {
                sb.append("  (").append(c.localName).append(")");
            }
            sb.append("\n");
            if (c.hasData) {
                sb.append("📍 ").append(c.cemeteryCount).append(c.cemeteryCount == 1 ? " cemetery" : " cemeteries");
                sb.append("  •  GraveAtlas data available");
            } else {
                sb.append("No GraveAtlas data yet — not \"no cemeteries exist\"");
            }
            card.setText(sb.toString());
            card.setPadding(24, 24, 24, 24);
            card.setTextSize(14);
            card.setContentDescription("Country: " + c.name);

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 12);
            card.setLayoutParams(lp);

            card.setOnClickListener(v -> {
                // Navigate to regions for this country
                if (getActivity() instanceof MainNavActivity) {
                    // Could open a RegionFragment showing regions in this country
                    // For now, show a toast-like text
                    statusText.setText("Tapping " + c.name + " — regions would show here");
                }
            });

            resultsContainer.addView(card);
        }
    }

    // Unused but required by interface
    @Override
    public void onSuccess(List<CemeteryRecord> result) {}
    @Override
    public void onError(String error) {}
}
