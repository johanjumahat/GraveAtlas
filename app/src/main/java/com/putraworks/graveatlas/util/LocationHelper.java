package com.putraworks.graveatlas.util;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;

import androidx.core.content.ContextCompat;

import java.util.List;
import java.util.Locale;

/**
 * GPS location detection with reverse geocoding.
 * Detects country, state/province, and city from GPS coordinates.
 * Uses Android's built-in Geocoder — no API key needed, zero credits.
 */
public class LocationHelper {

    public interface LocationCallback {
        /**
         * @param country full country name, never null (falls back to "Unknown")
         * @param state   state/province name, may be empty string if not applicable
         *                (e.g. city-states like Singapore) or not resolvable
         * @param city    city/town/locality name, may be empty string if not resolvable
         */
        void onLocationDetected(String country, String state, String city, double lat, double lon);
        void onError(String message);
    }

    private final Context context;
    private final LocationManager lm;
    private boolean gpsFixHandled = false;

    public LocationHelper(Context context) {
        this.context = context;
        this.lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
    }

    public boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED ||
               ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
    }

    @SuppressLint("MissingPermission")
    public void detectLocation(LocationCallback callback) {
        if (!hasLocationPermission()) {
            callback.onError("Location permission not granted");
            return;
        }

        if (lm == null) {
            callback.onError("Location service unavailable");
            return;
        }

        boolean gpsEnabled, netEnabled;
        try {
            gpsEnabled = lm.isProviderEnabled(LocationManager.GPS_PROVIDER);
            netEnabled = lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception e) {
            callback.onError("Cannot access location services");
            return;
        }

        if (!gpsEnabled && !netEnabled) {
            callback.onError("GPS is off — enable location services for detection");
            return;
        }

        gpsFixHandled = false;

        LocationListener listener = new LocationListener() {
            @Override
            public void onLocationChanged(Location loc) {
                if (gpsFixHandled) return;
                gpsFixHandled = true;
                try { lm.removeUpdates(this); } catch (Exception ignored) {}
                reverseGeocode(loc, callback);
            }
            @Override public void onStatusChanged(String p, int s, Bundle b) {}
            @Override public void onProviderEnabled(String p) {}
            @Override public void onProviderDisabled(String p) {}
        };

        boolean gpsRequested = false, netRequested = false;
        if (gpsEnabled) {
            try {
                lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0, 0, listener, Looper.getMainLooper());
                gpsRequested = true;
            } catch (SecurityException ignored) {}
        }
        if (netEnabled) {
            try {
                lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 0, 0, listener, Looper.getMainLooper());
                netRequested = true;
            } catch (SecurityException ignored) {}
        }

        if (!gpsRequested && !netRequested) {
            callback.onError("Location permission denied");
            return;
        }

        final boolean fGps = gpsRequested, fNet = netRequested;
        // Timeout: if no live fix arrives in 12s, fall back to last-known (better than nothing)
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (gpsFixHandled) return;
            gpsFixHandled = true;
            try { lm.removeUpdates(listener); } catch (Exception ignored) {}

            Location lastKnown = null;
            try {
                if (fGps) lastKnown = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                if (lastKnown == null && fNet) lastKnown = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            } catch (SecurityException ignored) {}

            if (lastKnown != null) {
                Toast.makeText(context, "Using last known location", Toast.LENGTH_SHORT).show();
                reverseGeocode(lastKnown, callback);
            } else {
                callback.onError("No GPS fix — could not detect location");
            }
        }, 12000);
    }

    /**
     * Reverse geocode GPS coordinates to get country, state, city.
     * Uses Android's built-in Geocoder — no API key needed.
     *
     * IMPORTANT: always calls back with a definitive value (possibly empty string)
     * for state/city — never silently omits a field, so callers can safely
     * overwrite stale UI state instead of leaving old values displayed.
     */
    private void reverseGeocode(Location loc, LocationCallback callback) {
        double lat = loc.getLatitude();
        double lon = loc.getLongitude();

        new Thread(() -> {
            try {
                Geocoder geocoder = new Geocoder(context, Locale.getDefault());
                List<Address> addresses = geocoder.getFromLocation(lat, lon, 1);

                if (addresses == null || addresses.isEmpty()) {
                    // Fallback: try English locale
                    geocoder = new Geocoder(context, Locale.ENGLISH);
                    addresses = geocoder.getFromLocation(lat, lon, 1);
                }

                if (addresses != null && !addresses.isEmpty()) {
                    Address addr = addresses.get(0);
                    String country = addr.getCountryName();
                    String state = addr.getAdminArea();   // state/province

                    // City fallback chain: locality -> subLocality -> subAdminArea -> featureName
                    String city = addr.getLocality();
                    if (isBlank(city)) city = addr.getSubLocality();
                    if (isBlank(city)) city = addr.getSubAdminArea();
                    if (isBlank(city)) city = addr.getFeatureName();

                    final String fCountry = !isBlank(country) ? country : "Unknown";
                    final String fState = !isBlank(state) ? state : "";
                    final String fCity = !isBlank(city) ? city : "";

                    new Handler(Looper.getMainLooper()).post(() ->
                        callback.onLocationDetected(fCountry, fState, fCity, lat, lon));
                } else {
                    new Handler(Looper.getMainLooper()).post(() ->
                        callback.onError("Could not determine address from GPS coordinates"));
                }
            } catch (Exception e) {
                new Handler(Looper.getMainLooper()).post(() ->
                    callback.onError("Geocoder error: " + e.getMessage()));
            }
        }).start();
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
