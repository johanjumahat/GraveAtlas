package com.putraworks.graveatlas.ui.about;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

/**
 * About screen — app info, data sources, privacy, credits.
 * Phase 1: placeholder.
 */
public class AboutFragment extends Fragment {

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        TextView tv = new TextView(getContext());
        tv.setText("GraveAtlas\n\nA community-driven project for discovering and recording public cemetery information.\n\nPhase 1 — Architecture Foundation\n\nAll data is community-submitted and moderated before publication.");
        tv.setTextSize(16);
        tv.setPadding(48, 48, 48, 48);
        tv.setGravity(android.view.Gravity.CENTER);
        return tv;
    }
}
