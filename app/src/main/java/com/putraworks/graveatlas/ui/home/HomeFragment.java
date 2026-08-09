package com.putraworks.graveatlas.ui.home;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.MainActivity;
import com.putraworks.graveatlas.MainNavActivity;
import com.putraworks.graveatlas.R;
import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.api.LocalCache;
import com.putraworks.graveatlas.data.model.GraveRecord;
import com.putraworks.graveatlas.ui.addgrave.AddGraveFragment;
import com.putraworks.graveatlas.ui.map.MapFragment;
import com.putraworks.graveatlas.ui.search.SearchFragment;
import com.putraworks.graveatlas.util.LocationHelper;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Home screen — card-based layout with quick actions and location detection.
 *
 * GPS icon detects user's country, state/county, and city using reverse geocoding.
 * User can also manually select from dropdowns.
 */
public class HomeFragment extends Fragment {

    private static final String PREFS_NAME = "graveatlas_location";
    private static final String K_COUNTRY = "country";
    private static final String K_STATE = "state";
    private static final String K_COUNTY = "county";
    private static final String K_CITY = "city";

    private TextView summaryText, summaryLabel, locationDisplay;
    private ProgressBar summaryProgress, gpsProgress;
    private ImageButton gpsIconBtn;
    private Spinner spinnerCountry, spinnerState, spinnerCounty, spinnerCity;

    private LocationHelper locationHelper;
    private SharedPreferences locPrefs;

    // Common countries list (can be expanded)
    private final String[] commonCountries = {
        "Singapore", "Malaysia", "Indonesia", "Thailand", "Philippines",
        "Vietnam", "Brunei", "Myanmar", "Cambodia", "Laos",
        "India", "China", "Japan", "South Korea", "Australia",
        "United States", "United Kingdom", "Canada", "Germany", "France",
        "Saudi Arabia", "United Arab Emirates", "Egypt", "Turkey"
    };

    private final ActivityResultLauncher<String[]> locationPermissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(),
                    result -> {
                        boolean granted = Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_FINE_LOCATION))
                                || Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_COARSE_LOCATION));
                        if (granted) {
                            startGpsDetection();
                        } else {
                            Toast.makeText(getContext(), "Location permission needed to detect your area", Toast.LENGTH_SHORT).show();
                        }
                    });

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_home, container, false);

        locationHelper = new LocationHelper(getContext());
        locPrefs = requireContext().getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE);

        initViews(view);
        setupSpinners();
        loadSavedLocation();
        setupQuickActions(view);
        loadDataSummary();

        return view;
    }

    private void initViews(View view) {
        summaryText = view.findViewById(R.id.summaryText);
        summaryLabel = view.findViewById(R.id.summaryLabel);
        summaryProgress = view.findViewById(R.id.summaryProgress);
        locationDisplay = view.findViewById(R.id.locationDisplay);
        gpsProgress = view.findViewById(R.id.gpsProgress);
        gpsIconBtn = view.findViewById(R.id.gpsIconBtn);
        spinnerCountry = view.findViewById(R.id.spinnerCountry);
        spinnerState = view.findViewById(R.id.spinnerState);
        spinnerCounty = view.findViewById(R.id.spinnerCounty);
        spinnerCity = view.findViewById(R.id.spinnerCity);

        gpsIconBtn.setOnClickListener(v -> {
            if (locationHelper.hasLocationPermission()) {
                startGpsDetection();
            } else {
                locationPermissionLauncher.launch(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                });
            }
        });
    }

    private void startGpsDetection() {
        gpsProgress.setVisibility(View.VISIBLE);
        locationDisplay.setText("Detecting your location...");
        gpsIconBtn.setAlpha(0.5f);

        locationHelper.detectLocation(new LocationHelper.LocationCallback() {
            @Override
            public void onLocationDetected(String country, String state, String county, String city, double lat, double lon) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    gpsProgress.setVisibility(View.GONE);
                    gpsIconBtn.setAlpha(1f);

                    // Save to prefs
                    locPrefs.edit()
                            .putString(K_COUNTRY, country)
                            .putString(K_STATE, state)
                            .putString(K_COUNTY, county)
                            .putString(K_CITY, city)
                            .apply();

                    // Update dropdowns
                    selectSpinnerValue(spinnerCountry, country);
                    selectSpinnerValue(spinnerState, state);
                    selectSpinnerValue(spinnerCounty, county);
                    selectSpinnerValue(spinnerCity, city);

                    // Update display
                    String display = buildLocationDisplay(country, state, county, city);
                    locationDisplay.setText(display);

                    Toast.makeText(getContext(), "Location detected!", Toast.LENGTH_SHORT).show();
                });
            }

            @Override
            public void onError(String message) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    gpsProgress.setVisibility(View.GONE);
                    gpsIconBtn.setAlpha(1f);
                    locationDisplay.setText("Could not detect location");
                    Toast.makeText(getContext(), message, Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private String buildLocationDisplay(String country, String state, String county, String city) {
        List<String> parts = new ArrayList<>();
        if (city != null && !city.isEmpty()) parts.add(city);
        if (county != null && !county.isEmpty() && !county.equals(city)) parts.add(county);
        if (state != null && !state.isEmpty() && !state.equals(county)) parts.add(state);
        if (country != null && !country.isEmpty()) parts.add(country);
        return parts.isEmpty() ? "Location not set" : String.join(", ", parts);
    }

    private void setupSpinners() {
        // Country spinner
        List<String> countries = new ArrayList<>(Arrays.asList(commonCountries));
        ArrayAdapter<String> countryAdapter = new ArrayAdapter<>(requireContext(),
                android.R.layout.simple_spinner_item, countries) {
            @Override
            public View getView(int position, View convertView, ViewGroup parent) {
                View v = super.getView(position, convertView, parent);
                if (v instanceof android.widget.TextView) {
                    ((android.widget.TextView) v).setTextColor(getResources().getColor(R.color.text_primary_dark));
                    ((android.widget.TextView) v).setTextSize(13f);
                }
                return v;
            }
            @Override
            public View getDropDownView(int position, View convertView, ViewGroup parent) {
                View v = super.getDropDownView(position, convertView, parent);
                if (v instanceof android.widget.TextView) {
                    ((android.widget.TextView) v).setTextColor(getResources().getColor(R.color.text_primary_dark));
                }
                return v;
            }
        };
        countryAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        countryAdapter.insert("Select country...", 0);
        spinnerCountry.setAdapter(countryAdapter);

        // State, County, City start with just "Select..." options
        setupSimpleSpinner(spinnerState, "Select state/province...");
        setupSimpleSpinner(spinnerCounty, "Select county/district...");
        setupSimpleSpinner(spinnerCity, "Select city...");

        // When country changes, update state options (basic state lists for common countries)
        spinnerCountry.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View v, int position, long id) {
                if (position == 0) return; // "Select country..."
                String country = spinnerCountry.getSelectedItem().toString();
                updateStateOptions(country);
                saveLocationFromSpinners();
            }
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        spinnerState.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View v, int position, long id) {
                if (position == 0) return;
                saveLocationFromSpinners();
            }
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        spinnerCounty.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View v, int position, long id) {
                if (position == 0) return;
                saveLocationFromSpinners();
            }
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        spinnerCity.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View v, int position, long id) {
                if (position == 0) return;
                saveLocationFromSpinners();
            }
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });
    }

    private void setupSimpleSpinner(Spinner spinner, String placeholder) {
        List<String> items = new ArrayList<>();
        items.add(placeholder);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(requireContext(),
                android.R.layout.simple_spinner_item, items) {
            @Override
            public View getView(int position, View convertView, ViewGroup parent) {
                View v = super.getView(position, convertView, parent);
                if (v instanceof android.widget.TextView) {
                    ((android.widget.TextView) v).setTextColor(getResources().getColor(R.color.text_primary_dark));
                    ((android.widget.TextView) v).setTextSize(13f);
                }
                return v;
            }
            @Override
            public View getDropDownView(int position, View convertView, ViewGroup parent) {
                View v = super.getDropDownView(position, convertView, parent);
                if (v instanceof android.widget.TextView) {
                    ((android.widget.TextView) v).setTextColor(getResources().getColor(R.color.text_primary_dark));
                }
                return v;
            }
        };
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
    }

    private void updateStateOptions(String country) {
        // Provide state options for known countries
        String[] states = getStatesForCountry(country);
        List<String> items = new ArrayList<>();
        items.add("Select state/province...");
        if (states != null) {
            items.addAll(Arrays.asList(states));
        }
        ArrayAdapter<String> adapter = new ArrayAdapter<>(requireContext(),
                android.R.layout.simple_spinner_item, items) {
            @Override
            public View getView(int position, View convertView, ViewGroup parent) {
                View v = super.getView(position, convertView, parent);
                if (v instanceof android.widget.TextView) {
                    ((android.widget.TextView) v).setTextColor(getResources().getColor(R.color.text_primary_dark));
                    ((android.widget.TextView) v).setTextSize(13f);
                }
                return v;
            }
            @Override
            public View getDropDownView(int position, View convertView, ViewGroup parent) {
                View v = super.getDropDownView(position, convertView, parent);
                if (v instanceof android.widget.TextView) {
                    ((android.widget.TextView) v).setTextColor(getResources().getColor(R.color.text_primary_dark));
                }
                return v;
            }
        };
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerState.setAdapter(adapter);
    }

    private String[] getStatesForCountry(String country) {
        switch (country) {
            case "Singapore":
                return new String[]{"Central Region", "East Region", "North Region", "North-East Region", "West Region"};
            case "Malaysia":
                return new String[]{"Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Labuan", "Melaka",
                        "Negeri Sembilan", "Pahang", "Penang", "Perak", "Perlis", "Putrajaya",
                        "Sabah", "Sarawak", "Selangor", "Terengganu"};
            case "Indonesia":
                return new String[]{"Aceh", "Bali", "Banten", "DKI Jakarta", "Jawa Barat", "Jawa Tengah",
                        "Jawa Timur", "Kalimantan Barat", "Kalimantan Timur", "Sumatera Utara",
                        "Sumatera Barat", "Riau", "Sulawesi Selatan", "Papua"};
            case "United States":
                return new String[]{"Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
                        "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
                        "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
                        "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
                        "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
                        "New Hampshire", "New Jersey", "New Mexico", "New York",
                        "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
                        "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
                        "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
                        "West Virginia", "Wisconsin", "Wyoming"};
            case "Thailand":
                return new String[]{"Bangkok", "Chiang Mai", "Chonburi", "Phuket", "Songkhla", "Nakhon Ratchasima"};
            case "Philippines":
                return new String[]{"Metro Manila", "Cebu", "Davao", "Iloilo", "Bulacan", "Cavite", "Laguna"};
            case "Australia":
                return new String[]{"New South Wales", "Victoria", "Queensland", "Western Australia",
                        "South Australia", "Tasmania", "Australian Capital Territory", "Northern Territory"};
            case "United Kingdom":
                return new String[]{"England", "Scotland", "Wales", "Northern Ireland"};
            case "India":
                return new String[]{"Andhra Pradesh", "Delhi", "Goa", "Gujarat", "Karnataka", "Kerala",
                        "Maharashtra", "Tamil Nadu", "Telangana", "West Bengal", "Uttar Pradesh"};
            default:
                return null; // User types state manually (or from GPS)
        }
    }

    private void selectSpinnerValue(Spinner spinner, String value) {
        if (value == null || value.isEmpty()) return;
        ArrayAdapter<String> adapter = (ArrayAdapter<String>) spinner.getAdapter();
        if (adapter == null) return;

        // Check if value exists in adapter
        int pos = -1;
        for (int i = 0; i < adapter.getCount(); i++) {
            if (adapter.getItem(i) != null && adapter.getItem(i).equalsIgnoreCase(value)) {
                pos = i;
                break;
            }
        }

        if (pos >= 0) {
            spinner.setSelection(pos);
        } else {
            // Add the value to the adapter
            adapter.add(value);
            spinner.setSelection(adapter.getCount() - 1);
        }
    }

    private void saveLocationFromSpinners() {
        String country = spinnerCountry.getSelectedItemPosition() > 0
                ? spinnerCountry.getSelectedItem().toString() : "";
        String state = spinnerState.getSelectedItemPosition() > 0
                ? spinnerState.getSelectedItem().toString() : "";
        String county = spinnerCounty.getSelectedItemPosition() > 0
                ? spinnerCounty.getSelectedItem().toString() : "";
        String city = spinnerCity.getSelectedItemPosition() > 0
                ? spinnerCity.getSelectedItem().toString() : "";

        locPrefs.edit()
                .putString(K_COUNTRY, country)
                .putString(K_STATE, state)
                .putString(K_COUNTY, county)
                .putString(K_CITY, city)
                .apply();

        String display = buildLocationDisplay(country, state, county, city);
        if (!display.equals("Location not set")) {
            locationDisplay.setText(display);
        }
    }

    private void loadSavedLocation() {
        String country = locPrefs.getString(K_COUNTRY, "");
        String state = locPrefs.getString(K_STATE, "");
        String county = locPrefs.getString(K_COUNTY, "");
        String city = locPrefs.getString(K_CITY, "");

        if (!country.isEmpty()) {
            selectSpinnerValue(spinnerCountry, country);
            updateStateOptions(country);
            if (!state.isEmpty()) selectSpinnerValue(spinnerState, state);
            if (!county.isEmpty()) selectSpinnerValue(spinnerCounty, county);
            if (!city.isEmpty()) selectSpinnerValue(spinnerCity, city);
            locationDisplay.setText(buildLocationDisplay(country, state, county, city));
        }
    }

    private void setupQuickActions(View view) {
        view.findViewById(R.id.quickSearch).setOnClickListener(v ->
                loadFragment(new SearchFragment()));

        view.findViewById(R.id.quickMap).setOnClickListener(v ->
                loadFragment(new MapFragment()));

        view.findViewById(R.id.quickAdd).setOnClickListener(v ->
                loadFragment(new AddGraveFragment()));

        view.findViewById(R.id.quickChat).setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), MainActivity.class);
            startActivity(intent);
        });
    }

    private void loadDataSummary() {
        LocalCache cache = new LocalCache(getContext());
        List<GraveRecord> cached = cache.getCachedGraves();
        if (!cached.isEmpty()) {
            summaryText.setText(String.valueOf(cached.size()));
        }

        summaryProgress.setVisibility(View.VISIBLE);

        ApiClient apiClient = new ApiClient();
        apiClient.getGraves(new ApiClient.ApiCallback<List<GraveRecord>>() {
            @Override
            public void onSuccess(List<GraveRecord> result) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        summaryProgress.setVisibility(View.GONE);
                        summaryText.setText(String.valueOf(result.size()));
                    });
                }
            }

            @Override
            public void onError(String error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        summaryProgress.setVisibility(View.GONE);
                        if (cached.isEmpty()) {
                            summaryText.setText("—");
                            summaryLabel.setText("Connect to see available graves");
                        }
                    });
                }
            }
        });
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
