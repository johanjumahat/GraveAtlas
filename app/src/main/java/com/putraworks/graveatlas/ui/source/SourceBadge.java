package com.putraworks.graveatlas.ui.source;

import android.content.Context;
import android.graphics.Typeface;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.content.ContextCompat;
import com.putraworks.graveatlas.R;
import com.putraworks.graveatlas.data.model.ExternalRecord;

/**
 * Source Badge (Part 9)
 *
 * In the GUI, clearly identifies external data:
 *   SOURCE — Government Cemetery API
 *   STATUS — External / Source-backed
 *   Retrieved — 2026-XX-XX
 *
 * External records never appear as native GraveAtlas records.
 */
public class SourceBadge {

    public static LinearLayout createBadge(Context context, ExternalRecord record) {
        return createBadge(context, record, false);
    }

    public static LinearLayout createBadge(Context context, ExternalRecord record, boolean compact) {
        LinearLayout container = new LinearLayout(context);
        container.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(context, 12);
        container.setPadding(pad, dp(context, 8), pad, dp(context, 8));
        container.setBackgroundResource(R.drawable.bg_more_item);
        LinearLayout.LayoutParams containerParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        containerParams.setMargins(0, dp(context, 4), 0, dp(context, 4));
        container.setLayoutParams(containerParams);

        // Source name
        TextView sourceLabel = new TextView(context);
        sourceLabel.setText("SOURCE");
        sourceLabel.setTextSize(10);
        sourceLabel.setTextColor(ContextCompat.getColor(context, R.color.text_muted_dark));
        sourceLabel.setTypeface(null, Typeface.BOLD);
        container.addView(sourceLabel);

        TextView sourceName = new TextView(context);
        sourceName.setText(record.provenanceSourceName != null ? record.provenanceSourceName
            : record.sourceOrganization != null ? record.sourceOrganization
            : "Unknown Source");
        sourceName.setTextSize(13);
        sourceName.setTextColor(ContextCompat.getColor(context, R.color.text_primary_dark));
        sourceName.setTypeface(null, Typeface.BOLD);
        container.addView(sourceName);

        if (!compact) {
            // Status row
            TextView statusLabel = new TextView(context);
            statusLabel.setText("STATUS");
            statusLabel.setTextSize(10);
            statusLabel.setTextColor(ContextCompat.getColor(context, R.color.text_muted_dark));
            statusLabel.setTypeface(null, Typeface.BOLD);
            statusLabel.setPadding(0, dp(context, 6), 0, 0);
            container.addView(statusLabel);

            TextView statusValue = new TextView(context);
            String statusText = "External / Source-backed";
            if (record.confidence != null) {
                statusText += " (" + record.confidence + " confidence)";
            }
            statusValue.setText(statusText);
            statusValue.setTextSize(12);
            statusValue.setTextColor(ContextCompat.getColor(context, R.color.gold));
            container.addView(statusValue);

            // Retrieved row
            if (record.provenanceRetrievalTime != null) {
                TextView retrievedLabel = new TextView(context);
                retrievedLabel.setText("RETRIEVED");
                retrievedLabel.setTextSize(10);
                retrievedLabel.setTextColor(ContextCompat.getColor(context, R.color.text_muted_dark));
                retrievedLabel.setTypeface(null, Typeface.BOLD);
                retrievedLabel.setPadding(0, dp(context, 6), 0, 0);
                container.addView(retrievedLabel);

                TextView retrievedValue = new TextView(context);
                String date = record.provenanceRetrievalTime;
                if (date.length() > 10) date = date.substring(0, 10);
                retrievedValue.setText(date);
                retrievedValue.setTextSize(12);
                retrievedValue.setTextColor(ContextCompat.getColor(context, R.color.text_secondary_dark));
                container.addView(retrievedValue);
            }

            // License row
            if (record.license != null) {
                TextView licenseLabel = new TextView(context);
                licenseLabel.setText("LICENSE");
                licenseLabel.setTextSize(10);
                licenseLabel.setTextColor(ContextCompat.getColor(context, R.color.text_muted_dark));
                licenseLabel.setTypeface(null, Typeface.BOLD);
                licenseLabel.setPadding(0, dp(context, 6), 0, 0);
                container.addView(licenseLabel);

                TextView licenseValue = new TextView(context);
                licenseValue.setText(record.license);
                licenseValue.setTextSize(12);
                licenseValue.setTextColor(ContextCompat.getColor(context, R.color.text_secondary_dark));
                container.addView(licenseValue);
            }
        }

        return container;
    }

    private static int dp(Context context, int value) {
        return (int) (value * context.getResources().getDisplayMetrics().density);
    }
}
