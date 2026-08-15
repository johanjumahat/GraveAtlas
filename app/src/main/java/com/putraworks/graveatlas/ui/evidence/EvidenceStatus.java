package com.putraworks.graveatlas.ui.evidence;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.content.ContextCompat;
import com.putraworks.graveatlas.R;

/**
 * Evidence-first status system for GraveAtlas records.
 *
 * Every piece of information in a record carries an evidence category:
 * - KNOWN: established, well-documented facts
 * - SOURCE-BACKED: supported by a specific cited source
 * - INFERRED: reasoned from available evidence but not directly stated
 * - UNCERTAIN: evidence is weak, incomplete, or ambiguous
 * - CONFLICTING: sources disagree
 * - NEEDS_VERIFICATION: unverified community contribution
 *
 * Part of Phase 16 - AI-Native Experience.
 */
public final class EvidenceStatus {

    public enum Category {
        KNOWN("KNOWN", R.color.evidence_known, "Established, well-documented fact"),
        SOURCE_BACKED("SOURCE-BACKED", R.color.evidence_source_backed, "Supported by a cited source"),
        INFERRED("INFERRED", R.color.evidence_inferred, "Reasoned from evidence, not directly stated"),
        UNCERTAIN("UNCERTAIN", R.color.evidence_uncertain, "Evidence is weak or incomplete"),
        CONFLICTING("CONFLICTING", R.color.evidence_conflicting, "Sources disagree"),
        NEEDS_VERIFICATION("NEEDS VERIFICATION", R.color.evidence_needs_verification, "Unverified community contribution");

        private final String label;
        private final int colorRes;
        private final String description;

        Category(String label, int colorRes, String description) {
            this.label = label;
            this.colorRes = colorRes;
            this.description = description;
        }

        public String getLabel() { return label; }
        public int getColorRes() { return colorRes; }
        public String getDescription() { return description; }
    }

    private EvidenceStatus() {}

    /**
     * Determine evidence category from a record's verification status field.
     */
    public static Category fromVerificationStatus(String status) {
        if (status == null || status.isEmpty() || "pending".equalsIgnoreCase(status)) {
            return Category.NEEDS_VERIFICATION;
        }
        if ("verified".equalsIgnoreCase(status) || "official".equalsIgnoreCase(status)) {
            return Category.KNOWN;
        }
        if ("community_submitted".equalsIgnoreCase(status) || "community".equalsIgnoreCase(status)) {
            return Category.SOURCE_BACKED;
        }
        if ("inferred".equalsIgnoreCase(status)) {
            return Category.INFERRED;
        }
        if ("conflicting".equalsIgnoreCase(status) || "disputed".equalsIgnoreCase(status)) {
            return Category.CONFLICTING;
        }
        if ("uncertain".equalsIgnoreCase(status) || "unverified".equalsIgnoreCase(status)) {
            return Category.UNCERTAIN;
        }
        return Category.NEEDS_VERIFICATION;
    }

    /**
     * Create a badge view for the given evidence category.
     * Returns a small pill-shaped TextView suitable for placement in record cards.
     */
    public static TextView createBadge(Context context, Category category) {
        TextView badge = new TextView(context);
        badge.setText(category.getLabel());
        badge.setTextColor(Color.WHITE);
        badge.setTextSize(10);
        badge.setTypeface(null, Typeface.BOLD);
        badge.setGravity(Gravity.CENTER);
        badge.setPadding(24, 8, 24, 8);

        int color = ContextCompat.getColor(context, category.getColorRes());
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, 0, 8, 0);
        badge.setLayoutParams(params);

        badge.setBackgroundResource(R.drawable.evidence_badge_bg);
        badge.getBackground().setTint(color);

        return badge;
    }
}
