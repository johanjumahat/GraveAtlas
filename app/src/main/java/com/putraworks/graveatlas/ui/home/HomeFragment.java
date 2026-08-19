package com.putraworks.graveatlas.ui.home;

import android.Manifest;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.InputType;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.LinearLayout;
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
import com.putraworks.graveatlas.chat.AISystemPrompts;
import com.putraworks.graveatlas.ui.addgrave.AddGraveFragment;
import com.putraworks.graveatlas.ui.map.MapFragment;
import com.putraworks.graveatlas.ui.search.SearchFragment;
import com.putraworks.graveatlas.util.LocationData;
import com.putraworks.graveatlas.util.LocationHelper;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Home screen — card-based layout with quick actions and location detection.
 *
 * GPS icon detects user's country, state/province, and city using reverse geocoding.
 * Max 3 dropdowns: Country, State/Province, City.
 * City-states (e.g. Singapore) hide the State dropdown — only 2 dropdowns shown.
 *
 * City options come from a local static dataset (LocationData) keyed by
 * state/country, plus a "Type manually..." fallback so the dropdown is
 * never left empty for uncovered states.
 */
public class HomeFragment extends Fragment {

    private static final String PREFS_NAME = "graveatlas_location";
    private static final String K_COUNTRY = "country";
    private static final String K_STATE = "state";
    private static final String K_CITY = "city";

    private static final String PLACEHOLDER_COUNTRY = "Select country...";
    private static final String PLACEHOLDER_STATE = "Select state/province...";
    private static final String PLACEHOLDER_CITY = "Select city...";
    private static final String OPTION_TYPE_MANUALLY = "Type manually...";

    // Countries with no meaningful state/province level — hide the State dropdown for these.
    private static final Set<String> CITY_STATES = new HashSet<>(Arrays.asList(
            "Singapore", "Monaco", "Vatican City", "Hong Kong", "Macau", "Gibraltar"
    ));

    private TextView locationDisplay;
    private ProgressBar gpsProgress;
    private ImageButton gpsIconBtn;
    private Spinner spinnerCountry, spinnerState, spinnerCity;
    private View stateGroup;

    private LocationHelper locationHelper;
    private SharedPreferences locPrefs;
    private boolean suppressSpinnerListeners = false;

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
        setupAiCommandBar(view);

        return view;
    }

    private void initViews(View view) {
        locationDisplay = view.findViewById(R.id.locationDisplay);
        gpsProgress = view.findViewById(R.id.gpsProgress);
        gpsIconBtn = view.findViewById(R.id.gpsIconBtn);
        spinnerCountry = view.findViewById(R.id.spinnerCountry);
        spinnerState = view.findViewById(R.id.spinnerState);
        spinnerCity = view.findViewById(R.id.spinnerCity);
        stateGroup = view.findViewById(R.id.stateGroup);

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
            public void onLocationDetected(String country, String state, String city, double lat, double lon) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    gpsProgress.setVisibility(View.GONE);
                    gpsIconBtn.setAlpha(1f);
                    applyDetectedLocation(country, state, city);
                    Toast.makeText(getContext(), "Location detected!", Toast.LENGTH_SHORT).show();
                });
            }

            @Override
            public void onError(String message) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    gpsProgress.setVisibility(View.GONE);
                    gpsIconBtn.setAlpha(1f);
                    Toast.makeText(getContext(), message, Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    /**
     * Applies a GPS-detected location to all 3 dropdowns.
     * Always overwrites every field (even to placeholder/empty) — never leaves
     * a stale value from a previous detection or manual selection.
     */
    private void applyDetectedLocation(String country, String state, String city) {
        suppressSpinnerListeners = true;

        selectOrAddSpinnerValue(spinnerCountry, country, PLACEHOLDER_COUNTRY);
        updateStateVisibilityAndOptions(country);

        boolean isCityState = CITY_STATES.contains(country);
        String effectiveState = "";
        if (!isCityState) {
            if (!state.isEmpty()) {
                selectOrAddSpinnerValue(spinnerState, state, PLACEHOLDER_STATE);
                effectiveState = state;
            } else {
                resetSpinnerToPlaceholder(spinnerState);
            }
        }

        populateCityOptions(country, effectiveState);
        if (!city.isEmpty()) {
            selectOrAddSpinnerValue(spinnerCity, city, PLACEHOLDER_CITY);
        }

        suppressSpinnerListeners = false;

        saveLocationFromSpinners();
    }

    private void setupSpinners() {
        // Country spinner
        List<String> countries = new ArrayList<>();
        countries.add(PLACEHOLDER_COUNTRY);
        countries.addAll(Arrays.asList(commonCountries));
        spinnerCountry.setAdapter(buildAdapter(countries));

        setupSimpleSpinner(spinnerState, PLACEHOLDER_STATE);
        setupSimpleSpinner(spinnerCity, PLACEHOLDER_CITY);

        spinnerCountry.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View v, int position, long id) {
                if (suppressSpinnerListeners) return;
                if (position == 0) return; // placeholder
                String country = spinnerCountry.getSelectedItem().toString();
                updateStateVisibilityAndOptions(country);
                resetSpinnerToPlaceholder(spinnerState);
                boolean isCityState = CITY_STATES.contains(country);
                populateCityOptions(country, isCityState ? "" : "");
                saveLocationFromSpinners();
            }
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        });

        spinnerState.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View v, int position, long id) {
                if (suppressSpinnerListeners) return;
                if (position == 0) return;
                String country = selectedOrEmpty(spinnerCountry);
                String state = spinnerState.getSelectedItem().toString();
                populateCityOptions(country, state);
                saveLocationFromSpinners();
            }
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        });

        spinnerCity.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View v, int position, long id) {
                if (suppressSpinnerListeners) return;
                if (position == 0) return;
                String selected = spinnerCity.getSelectedItem().toString();
                if (OPTION_TYPE_MANUALLY.equals(selected)) {
                    promptManualCity();
                    return;
                }
                saveLocationFromSpinners();
            }
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        });
    }

    /** Shows a text-entry dialog for a custom city, then adds+selects it in the spinner. */
    private void promptManualCity() {
        EditText input = new EditText(requireContext());
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        input.setHint("City / town name");

        new AlertDialog.Builder(requireContext())
                .setTitle("Enter your city")
                .setView(input)
                .setPositiveButton("Save", (dialog, which) -> {
                    String value = input.getText().toString().trim();
                    if (!value.isEmpty()) {
                        // Insert before the "Type manually..." entry so it stays last
                        @SuppressWarnings("unchecked")
                        ArrayAdapter<String> adapter = (ArrayAdapter<String>) spinnerCity.getAdapter();
                        int insertPos = adapter.getCount() - 1; // just before "Type manually..."
                        adapter.insert(value, Math.max(insertPos, 1));
                        suppressSpinnerListeners = true;
                        spinnerCity.setSelection(Math.max(insertPos, 1));
                        suppressSpinnerListeners = false;
                        saveLocationFromSpinners();
                    } else {
                        resetSpinnerToPlaceholder(spinnerCity);
                    }
                })
                .setNegativeButton("Cancel", (dialog, which) -> resetSpinnerToPlaceholder(spinnerCity))
                .setOnCancelListener(dialog -> resetSpinnerToPlaceholder(spinnerCity))
                .show();
    }

    private void setupSimpleSpinner(Spinner spinner, String placeholder) {
        List<String> items = new ArrayList<>();
        items.add(placeholder);
        spinner.setAdapter(buildAdapter(items));
    }

    private ArrayAdapter<String> buildAdapter(List<String> items) {
        ArrayAdapter<String> adapter = new ArrayAdapter<String>(requireContext(),
                android.R.layout.simple_spinner_item, items) {
            @Override
            public View getView(int position, View convertView, ViewGroup parent) {
                View v = super.getView(position, convertView, parent);
                if (v instanceof TextView) {
                    ((TextView) v).setTextColor(getResources().getColor(R.color.text_primary_dark));
                    ((TextView) v).setTextSize(13f);
                }
                return v;
            }
            @Override
            public View getDropDownView(int position, View convertView, ViewGroup parent) {
                View v = super.getDropDownView(position, convertView, parent);
                if (v instanceof TextView) {
                    ((TextView) v).setTextColor(getResources().getColor(R.color.text_primary_dark));
                }
                return v;
            }
        };
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        return adapter;
    }

    /** Shows/hides the State dropdown based on whether the country is a city-state, and repopulates its options. */
    private void updateStateVisibilityAndOptions(String country) {
        boolean isCityState = CITY_STATES.contains(country);
        stateGroup.setVisibility(isCityState ? View.GONE : View.VISIBLE);

        if (isCityState) return;

        String[] states = getStatesForCountry(country);
        List<String> items = new ArrayList<>();
        items.add(PLACEHOLDER_STATE);
        if (states != null) items.addAll(Arrays.asList(states));
        spinnerState.setAdapter(buildAdapter(items));
    }

    private void resetSpinnerToPlaceholder(Spinner spinner) {
        spinner.setSelection(0);
    }

    /**
     * Populates the City dropdown from the local dataset for the given state
     * (or country, for city-states), always ending with "Type manually..."
     * so the dropdown is never empty even for uncovered regions.
     */
    private void populateCityOptions(String country, String state) {
        List<String> items = new ArrayList<>();
        items.add(PLACEHOLDER_CITY);

        String[] cities = null;
        boolean isCityState = CITY_STATES.contains(country);
        if (isCityState) {
            cities = LocationData.getCitiesForCountry(country);
        } else if (state != null && !state.isEmpty()) {
            cities = LocationData.getCitiesForState(state);
        }

        if (cities != null) items.addAll(Arrays.asList(cities));
        items.add(OPTION_TYPE_MANUALLY);

        spinnerCity.setAdapter(buildAdapter(items));
    }

    private String[] getStatesForCountry(String country) {
        switch (country) {
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
                return null; // GPS-detected value gets added dynamically instead
        }
    }

    /** Selects value in spinner if present, otherwise adds it and selects it. */
    private void selectOrAddSpinnerValue(Spinner spinner, String value, String placeholder) {
        if (value == null || value.isEmpty()) {
            resetSpinnerToPlaceholder(spinner);
            return;
        }
        @SuppressWarnings("unchecked")
        ArrayAdapter<String> adapter = (ArrayAdapter<String>) spinner.getAdapter();
        if (adapter == null) return;

        int pos = -1;
        for (int i = 0; i < adapter.getCount(); i++) {
            String item = adapter.getItem(i);
            if (item != null && item.equalsIgnoreCase(value)) {
                pos = i;
                break;
            }
        }

        if (pos >= 0) {
            spinner.setSelection(pos);
        } else {
            // Insert before any trailing "Type manually..." entry so it stays last
            int insertPos = adapter.getCount();
            if (insertPos > 0 && OPTION_TYPE_MANUALLY.equals(adapter.getItem(insertPos - 1))) {
                adapter.insert(value, insertPos - 1);
                spinner.setSelection(insertPos - 1);
            } else {
                adapter.add(value);
                spinner.setSelection(adapter.getCount() - 1);
            }
        }
    }

    private String buildLocationDisplay(String country, String state, String city) {
        List<String> parts = new ArrayList<>();
        if (city != null && !city.isEmpty()) parts.add(city);
        if (state != null && !state.isEmpty() && !state.equals(city)) parts.add(state);
        if (country != null && !country.isEmpty()) parts.add(country);
        return parts.isEmpty() ? "Location not set" : String.join(", ", parts);
    }

    private void saveLocationFromSpinners() {
        String country = selectedOrEmpty(spinnerCountry);
        String state = stateGroup.getVisibility() == View.VISIBLE ? selectedOrEmpty(spinnerState) : "";
        String city = selectedOrEmpty(spinnerCity);
        if (OPTION_TYPE_MANUALLY.equals(city)) city = ""; // placeholder-like, not a real value

        locPrefs.edit()
                .putString(K_COUNTRY, country)
                .putString(K_STATE, state)
                .putString(K_CITY, city)
                .apply();

        locationDisplay.setText(buildLocationDisplay(country, state, city));
    }

    private String selectedOrEmpty(Spinner spinner) {
        return spinner.getSelectedItemPosition() > 0 ? spinner.getSelectedItem().toString() : "";
    }

    private void loadSavedLocation() {
        String country = locPrefs.getString(K_COUNTRY, "");
        String state = locPrefs.getString(K_STATE, "");
        String city = locPrefs.getString(K_CITY, "");

        if (!country.isEmpty()) {
            suppressSpinnerListeners = true;
            selectOrAddSpinnerValue(spinnerCountry, country, PLACEHOLDER_COUNTRY);
            updateStateVisibilityAndOptions(country);
            if (!state.isEmpty() && stateGroup.getVisibility() == View.VISIBLE) {
                selectOrAddSpinnerValue(spinnerState, state, PLACEHOLDER_STATE);
            }
            populateCityOptions(country, state);
            if (!city.isEmpty()) {
                selectOrAddSpinnerValue(spinnerCity, city, PLACEHOLDER_CITY);
            }
            suppressSpinnerListeners = false;
            locationDisplay.setText(buildLocationDisplay(country, state, city));
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

    /**
     * Phase 16 - AI-native home screen: research topic dropdown + start button.
     */
    private void setupAiCommandBar(View view) {
        Spinner spinnerResearch = view.findViewById(R.id.spinnerResearch);
        String[] topics = AISystemPrompts.SUGGESTED_PROMPTS;
        
        // Build dropdown items: "All topics" + individual research prompts
        List<String> items = new ArrayList<>();
        items.add("All topics");
        for (String t : topics) items.add(t);
        
        ArrayAdapter<String> adapter = new ArrayAdapter<>(
            getContext(), android.R.layout.simple_spinner_item, items);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerResearch.setAdapter(adapter);
        
        // Style spinner text
        spinnerResearch.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View v, int position, long id) {
                if (v instanceof TextView) {
                    ((TextView) v).setTextColor(getResources().getColor(R.color.text_primary_dark));
                    ((TextView) v).setTextSize(13);
                }
            }
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        // Start Research button → opens AI chat with selected topic
        view.findViewById(R.id.btnAiAsk).setOnClickListener(v -> {
            int selected = spinnerResearch.getSelectedItemPosition();
            Intent intent = new Intent(getActivity(), MainActivity.class);
            if (selected == 0) {
                // "All topics" — open chat with a general prompt
                intent.putExtra("prefill_question", "Show me an overview of all available research topics.");
            } else if (selected > 0 && selected <= topics.length) {
                intent.putExtra("prefill_question", topics[selected - 1]);
            }
            startActivity(intent);
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
