package com.putraworks.graveatlas.ui.addgrave;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

/**
 * Add grave screen — form for submitting new grave records.
 * Phase 1: placeholder. Will include form fields, GPS capture, photo upload.
 */
public class AddGraveFragment extends Fragment {

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        TextView tv = new TextView(getContext());
        tv.setText("Add Grave\n\nPhase 1 Placeholder\n\nFuture: form with name, dates, cemetery, GPS, photo, notes\nSubmissions enter pending state for moderation");
        tv.setTextSize(16);
        tv.setPadding(48, 48, 48, 48);
        tv.setGravity(android.view.Gravity.CENTER);
        return tv;
    }
}
