package com.putraworks.graveatlas.ui.about;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.api.LocalCache;
import com.putraworks.graveatlas.data.model.GraveRecord;

import java.util.List;

/**
 * About screen — app info, data sources, privacy, credits, and live grave count.
 */
public class AboutFragment extends Fragment {

    private TextView tv;
    private String baseText;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        tv = new TextView(getContext());
        baseText = "GraveAtlas\n\n" +
                "Version: " + getVersionInfo() + "\n\n" +
                "Graves in database: " + getCachedCountLabel() + "\n\n" +
                "A community-driven project for discovering and recording public cemetery information.\n\n" +
                "Phase 3 — Android API Integration\n\n" +
                "Architecture:\n" +
                "Android → Cloudflare Worker → GitHub App → Data Repository\n\n" +
                "All data is community-submitted and moderated before publication.\n" +
                "No server credentials are stored in the app.\n\n" +
                "Privacy:\n" +
                "• Location is only used when adding a grave\n" +
                "• No background location tracking\n" +
                "• No personal data collection\n" +
                "• Submissions are anonymous\n\n" +
                "Data: github.com/putraworks2026/graveatlas-data\n" +
                "Source: github.com/putraworks2026/GraveAtlas";
        tv.setText(baseText);
        tv.setTextSize(14);
        tv.setPadding(48, 48, 48, 48);

        refreshLiveCount();

        return tv;
    }

    private String getCachedCountLabel() {
        List<GraveRecord> cached = new LocalCache(getContext()).getCachedGraves();
        return cached.isEmpty() ? "—" : String.valueOf(cached.size());
    }

    /** Fetches the live count from the API and updates the text once it arrives. */
    private void refreshLiveCount() {
        ApiClient apiClient = new ApiClient();
        apiClient.getGraves(new ApiClient.ApiCallback<List<GraveRecord>>() {
            @Override
            public void onSuccess(List<GraveRecord> result) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    String updated = "GraveAtlas\n\n" +
                            "Version: " + getVersionInfo() + "\n\n" +
                            "Graves in database: " + result.size() + "\n\n" +
                            baseText.substring(baseText.indexOf("A community-driven"));
                    tv.setText(updated);
                });
            }

            @Override
            public void onError(String error) {
                // Keep cached/placeholder count — no need to disturb the UI on failure
            }
        });
    }

    /**
     * Reads the live version name + build number from the installed package,
     * so this always reflects the actual APK — no manual edits needed on release.
     */
    private String getVersionInfo() {
        try {
            PackageManager pm = requireContext().getPackageManager();
            PackageInfo info = pm.getPackageInfo(requireContext().getPackageName(), 0);
            long versionCode = getVersionCodeCompat(info);
            return info.versionName + " (Build " + versionCode + ")";
        } catch (Exception e) {
            return "unknown";
        }
    }

    @SuppressWarnings("deprecation")
    private long getVersionCodeCompat(PackageInfo info) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            return info.getLongVersionCode();
        }
        return info.versionCode;
    }
}
