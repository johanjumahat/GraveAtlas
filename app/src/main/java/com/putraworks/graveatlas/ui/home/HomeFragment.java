package com.putraworks.graveatlas.ui.home;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.MainActivity;
import com.putraworks.graveatlas.MainNavActivity;
import com.putraworks.graveatlas.R;
import com.putraworks.graveatlas.compass.CompassActivity;
import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.api.LocalCache;
import com.putraworks.graveatlas.data.model.GraveRecord;
import com.putraworks.graveatlas.ui.addgrave.AddGraveFragment;
import com.putraworks.graveatlas.ui.map.MapFragment;
import com.putraworks.graveatlas.ui.search.SearchFragment;

import java.util.List;

/**
 * Home screen — NurOne-style card-based layout with quick action icon grid.
 * Shows data summary from API (grave count) if available.
 */
public class HomeFragment extends Fragment {

    private TextView summaryText;
    private TextView summaryLabel;
    private ProgressBar summaryProgress;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_home, container, false);

        summaryText = view.findViewById(R.id.summaryText);
        summaryLabel = view.findViewById(R.id.summaryLabel);
        summaryProgress = view.findViewById(R.id.summaryProgress);

        // Quick action buttons
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

        loadDataSummary();

        return view;
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
