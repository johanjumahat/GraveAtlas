package com.putraworks.graveatlas.utils;

import android.content.Context;
import android.graphics.drawable.GradientDrawable;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import com.putraworks.graveatlas.R;

/**
 * Shared UI helpers for programmatically-built screens (Dark Gold theme).
 *
 * Fixes: result cards across the app were using the system
 * android.R.drawable.editbox_background_normal (a light/white box) with no
 * explicit text color, so text inherited the theme's near-white
 * android:textColorPrimary and became invisible against the light card —
 * i.e. blank white boxes. This helper builds a theme-correct dark card
 * background and applies the correct text colors instead.
 */
public final class UiUtils {

    private UiUtils() {}

    /**
     * A rounded, dark card background matching the app's Dark Gold theme
     * (card_background_dark) — use in place of
     * android.R.drawable.editbox_background_normal for result/list cards.
     */
    public static GradientDrawable createCardBackground(Context context) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setShape(GradientDrawable.RECTANGLE);
        drawable.setColor(ContextCompat.getColor(context, R.color.card_background_dark));
        drawable.setCornerRadius(16f);
        drawable.setStroke(1, ContextCompat.getColor(context, R.color.divider_dark));
        return drawable;
    }

    /** Applies the theme's primary (title/body) text color to a TextView. */
    public static void applyPrimaryTextColor(Context context, TextView textView) {
        textView.setTextColor(ContextCompat.getColor(context, R.color.text_primary_dark));
    }

    /** Applies the theme's secondary (subtitle/muted) text color to a TextView. */
    public static void applySecondaryTextColor(Context context, TextView textView) {
        textView.setTextColor(ContextCompat.getColor(context, R.color.text_secondary_dark));
    }
}
