package com.putraworks.graveatlas.ui.contribute;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

/**
 * User contributions screen — shows user's submitted graves and their status.
 * Phase 1: placeholder.
 */
public class ContributeFragment extends Fragment {

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        TextView tv = new TextView(getContext());
        tv.setText("My Contributions\n\nPhase 1 Placeholder\n\nFuture: list of user's submissions with status (pending/approved/rejected)");
        tv.setTextSize(16);
        tv.setPadding(48, 48, 48, 48);
        tv.setGravity(android.view.Gravity.CENTER);
        return tv;
    }
}
