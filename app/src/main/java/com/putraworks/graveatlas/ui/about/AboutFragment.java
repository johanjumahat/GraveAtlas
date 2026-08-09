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

/**
 * About screen — app info, data sources, privacy, credits.
 */
public class AboutFragment extends Fragment {

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        TextView tv = new TextView(getContext());
        tv.setText("GraveAtlas\n\n" +
                "Version: " + getVersionInfo() + "\n\n" +
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
                "Source: github.com/putraworks2026/GraveAtlas");
        tv.setTextSize(14);
        tv.setPadding(48, 48, 48, 48);
        return tv;
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
