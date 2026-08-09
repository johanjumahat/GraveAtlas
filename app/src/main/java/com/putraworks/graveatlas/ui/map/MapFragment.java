package com.putraworks.graveatlas.ui.map;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

/**
 * Map screen — display graves on a map.
 * Phase 1: placeholder. Will use a map SDK (OSM or Google Maps) in future phases.
 */
public class MapFragment extends Fragment {

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        TextView tv = new TextView(getContext());
        tv.setText("Map\n\nPhase 1 Placeholder\n\nFuture: interactive map with grave markers, clustering, tap-to-view details");
        tv.setTextSize(16);
        tv.setPadding(48, 48, 48, 48);
        tv.setGravity(android.view.Gravity.CENTER);
        return tv;
    }
}
