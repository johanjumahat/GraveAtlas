package com.putraworks.graveatlas.compass;

import android.Manifest;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.GeomagneticField;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

/**
 * Compass activity with GPS location support.
 * Adapted from NurOne-v4 QiblaActivity — Qibla direction calculation removed.
 * Provides a standard compass with magnetic/true heading and optional GPS
 * for accurate magnetic declination correction.
 */
public class CompassActivity extends AppCompatActivity implements SensorEventListener {

    private CompassView compassView;
    private TextView headingText, locationText, infoText, helpText;
    private TextView declinationText, accuracyText;
    private View accuracyDot;
    private Button gpsBtn;
    private SensorManager sensorManager;
    private Sensor accel, magnet;
    private float[] gravity, geomagnetic;
    private boolean sensorsActive = false;

    // Low-pass filter for sensor smoothing
    private static final float FILTER_ALPHA = 0.25f;
    private float[] filteredGravity;
    private float[] filteredGeomagnetic;

    private double lat = 0.0, lon = 0.0;
    private boolean hasLocation = false;
    private boolean useGps = false;

    private float magneticDeclination = 0f;

    private LocationManager locationManager;
    private LocationListener locationListener;
    private boolean isRequestingLocation = false;

    private SharedPreferences prefs;

    private final ActivityResultLauncher<String[]> locLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), result -> {
                if (Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_FINE_LOCATION)) ||
                    Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_COARSE_LOCATION))) {
                    useGps = true;
                    requestGpsFix();
                }
                else Toast.makeText(this, "Location permission denied", Toast.LENGTH_SHORT).show();
            });

    @Override
    protected void onCreate(Bundle s) {
        super.onCreate(s);
        setContentView(R.layout.activity_compass);
        prefs = getSharedPreferences("graveatlas_prefs", MODE_PRIVATE);

        compassView = findViewById(R.id.compassView);
        headingText = findViewById(R.id.compassHeadingText);
        locationText = findViewById(R.id.compassLocationText);
        infoText = findViewById(R.id.compassInfoText);
        helpText = findViewById(R.id.compassHelpText);
        declinationText = findViewById(R.id.compassDeclinationText);
        accuracyText = findViewById(R.id.accuracyText);
        accuracyDot = findViewById(R.id.accuracyDot);
        gpsBtn = findViewById(R.id.compassGetGpsBtn);

        ImageButton backBtn = findViewById(R.id.compassBackBtn);
        backBtn.setOnClickListener(v -> finish());

        androidx.appcompat.widget.SwitchCompat gpsToggle = findViewById(R.id.gpsToggle);
        gpsToggle.setChecked(false);
        gpsToggle.setOnCheckedChangeListener((button, checked) -> {
            useGps = checked;
            if (checked) {
                boolean hasPerm = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                                  ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
                if (hasPerm) requestGpsFix();
                else locLauncher.launch(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION});
            } else {
                stopLocationUpdates();
                if (prefs.contains("gps_lat")) {
                    lat = prefs.getFloat("gps_lat", (float) lat);
                    lon = prefs.getFloat("gps_lon", (float) lon);
                    hasLocation = true;
                }
                updateMagneticDeclination();
                updateDisplay();
            }
        });

        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
        accel = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        magnet = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);

        if (prefs.contains("gps_lat")) {
            lat = prefs.getFloat("gps_lat", (float) lat);
            lon = prefs.getFloat("gps_lon", (float) lon);
            hasLocation = true;
        }
        updateMagneticDeclination();

        gpsBtn.setOnClickListener(v -> {
            boolean fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            boolean coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            if (fine || coarse) requestGpsFix();
            else locLauncher.launch(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION});
        });

        boolean hasPerm = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                          ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (hasPerm) {
            useGps = true;
            gpsToggle.setChecked(true);
            requestGpsFix();
        } else {
            updateDisplay();
        }
    }

    private void requestGpsFix() {
        try {
            locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);

            Location lastLoc = null;
            try {
                if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                    lastLoc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                }
            } catch (Exception ignored) {}
            try {
                if (lastLoc == null && locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                    lastLoc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                }
            } catch (Exception ignored) {}

            if (lastLoc != null) {
                lat = lastLoc.getLatitude();
                lon = lastLoc.getLongitude();
                hasLocation = true;
                prefs.edit().putFloat("gps_lat", (float) lat).putFloat("gps_lon", (float) lon).apply();
            }

            stopLocationUpdates();

            locationListener = new LocationListener() {
                @Override
                public void onLocationChanged(Location location) {
                    lat = location.getLatitude();
                    lon = location.getLongitude();
                    hasLocation = true;
                    prefs.edit().putFloat("gps_lat", (float) lat).putFloat("gps_lon", (float) lon).apply();
                    updateMagneticDeclination();
                    updateDisplay();
                    Toast.makeText(CompassActivity.this, "GPS locked: " + String.format("%.4f, %.4f", lat, lon), Toast.LENGTH_SHORT).show();
                    stopLocationUpdates();
                }
                @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
                @Override public void onProviderEnabled(String provider) {}
                @Override public void onProviderDisabled(String provider) {}
            };

            boolean gpsEnabled = false, netEnabled = false;
            try { gpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER); } catch (Exception ignored) {}
            try { netEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER); } catch (Exception ignored) {}

            if (gpsEnabled) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0, 0, locationListener);
                isRequestingLocation = true;
            }
            if (netEnabled) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 0, 0, locationListener);
                isRequestingLocation = true;
            }

            if (lastLoc == null) {
                Toast.makeText(this, "Getting GPS fix... Please wait", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "Using last known location, updating...", Toast.LENGTH_SHORT).show();
            }

            updateMagneticDeclination();
            updateDisplay();

        } catch (SecurityException e) {
            Toast.makeText(this, "Location permission denied", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "GPS error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void stopLocationUpdates() {
        if (isRequestingLocation && locationManager != null && locationListener != null) {
            try {
                locationManager.removeUpdates(locationListener);
            } catch (Exception ignored) {}
            isRequestingLocation = false;
        }
    }

    private void updateMagneticDeclination() {
        if (!hasLocation) return;
        GeomagneticField field = new GeomagneticField(
            (float) lat, (float) lon, 0f, System.currentTimeMillis()
        );
        magneticDeclination = field.getDeclination();
        if (declinationText != null) {
            declinationText.setText(String.format("Declination: %.1f°", magneticDeclination));
        }
    }

    private void updateDisplay() {
        locationText.setText(String.format("Location: %.4f, %.4f %s", lat, lon, hasLocation ? "(GPS)" : "(default)"));
        infoText.setText("Compass mode");
        helpText.setText("Keep your phone flat. The red needle points North. Enable GPS for true-north correction.");
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (accel != null && magnet != null) {
            sensorManager.registerListener(this, accel, SensorManager.SENSOR_DELAY_GAME);
            sensorManager.registerListener(this, magnet, SensorManager.SENSOR_DELAY_GAME);
            sensorsActive = true;
        } else {
            Toast.makeText(this, "Compass sensors not available", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (sensorsActive) {
            sensorManager.unregisterListener(this);
            sensorsActive = false;
        }
        stopLocationUpdates();
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            if (filteredGravity == null) {
                filteredGravity = event.values.clone();
            } else {
                for (int i = 0; i < 3; i++) {
                    filteredGravity[i] = FILTER_ALPHA * event.values[i] + (1 - FILTER_ALPHA) * filteredGravity[i];
                }
            }
            gravity = filteredGravity;
        }
        if (event.sensor.getType() == Sensor.TYPE_MAGNETIC_FIELD) {
            if (filteredGeomagnetic == null) {
                filteredGeomagnetic = event.values.clone();
            } else {
                for (int i = 0; i < 3; i++) {
                    filteredGeomagnetic[i] = FILTER_ALPHA * event.values[i] + (1 - FILTER_ALPHA) * filteredGeomagnetic[i];
                }
            }
            geomagnetic = filteredGeomagnetic;
        }
        if (gravity != null && geomagnetic != null) {
            float[] R = new float[9], I = new float[9];
            if (SensorManager.getRotationMatrix(R, I, gravity, geomagnetic)) {
                float[] orientation = new float[3];
                SensorManager.getOrientation(R, orientation);
                float azimuth = (float) Math.toDegrees(orientation[0]);
                if (azimuth < 0) azimuth += 360;

                // Convert magnetic azimuth to true heading using declination
                float trueAzimuth = (azimuth + magneticDeclination + 360) % 360;
                compassView.setHeading(trueAzimuth);

                headingText.setText(String.format("%.0f°", trueAzimuth));
                String[] dirs = {"N", "NE", "E", "SE", "S", "SW", "W", "NW"};
                int dirIdx = (int) Math.round(trueAzimuth / 45.0) % 8;
                infoText.setText("Facing " + dirs[dirIdx]);
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        compassView.setSensorAccuracy(accuracy);
        runOnUiThread(() -> updateAccuracyBadge(accuracy));
    }

    private void updateAccuracyBadge(int accuracy) {
        int color;
        String text;
        int dotRes;
        switch (accuracy) {
            case 3:
                color = 0xFF4CAF50; text = "Sensor: High Accuracy"; dotRes = R.drawable.dot_green; break;
            case 2:
                color = 0xFFFF9800; text = "Sensor: Medium Accuracy"; dotRes = R.drawable.dot_orange; break;
            case 1:
                color = 0xFFFF5722; text = "Sensor: Low — Calibrate"; dotRes = R.drawable.dot_red;
                Toast.makeText(this, "Wave your phone in a figure-8 motion to calibrate the compass", Toast.LENGTH_LONG).show();
                break;
            default:
                color = 0xFFB71C1C; text = "Sensor: Unreliable"; dotRes = R.drawable.dot_red;
                Toast.makeText(this, "Compass unreliable. Wave phone in figure-8 to calibrate.", Toast.LENGTH_LONG).show();
                break;
        }
        accuracyText.setText(text);
        accuracyText.setTextColor(color);
        accuracyDot.setBackgroundResource(dotRes);
    }
}
