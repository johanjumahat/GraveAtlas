package com.putraworks.graveatlas.ui.saved;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.MainNavActivity;
import com.putraworks.graveatlas.data.local.SavedItemsManager;
import com.putraworks.graveatlas.ui.cemetery.CemeteryFragment;
import com.putraworks.graveatlas.ui.gravedetail.GraveDetailFragment;

import java.util.List;

/**
 * Saved items screen (Phase 7B, Parts 122-123).
 *
 * Shows bookmarked cemeteries, people, and memorials.
 * All data is local — never uploaded (Part 122).
 *
 * Actions:
 * - Open: navigate to the record detail
 * - Remove: remove from saved
 * - Clear: clear all saved items
 */
public class SavedFragment extends Fragment {

    private LinearLayout contentLayout;
    private TextView statusText;
    private Button clearAllBtn;
    private SavedItemsManager savedManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        savedManager = new SavedItemsManager(getContext());

        // Title
        TextView title = new TextView(getContext());
        title.setText("Saved");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 8);
        title.setContentDescription("Saved items heading");
        layout.addView(title);

        // Subtitle
        TextView subtitle = new TextView(getContext());
        subtitle.setText("Your bookmarked cemeteries, people, and memorials.");
        subtitle.setTextSize(12);
        subtitle.setContentDescription("Saved items description");
        subtitle.setPadding(0, 0, 0, 16);
        layout.addView(subtitle);

        // Clear all button
        clearAllBtn = new Button(getContext());
        clearAllBtn.setText("Clear All");
        clearAllBtn.setAllCaps(false);
        clearAllBtn.setContentDescription("Clear all saved items button");
        clearAllBtn.setVisibility(View.GONE);
        clearAllBtn.setOnClickListener(v -> {
            savedManager.clearAllSaved();
            refreshView();
        });
        layout.addView(clearAllBtn);

        // Status
        statusText = new TextView(getContext());
        statusText.setPadding(0, 16, 0, 16);
        statusText.setTextSize(13);
        statusText.setContentDescription("Saved items status");
        layout.addView(statusText);

        // Content
        contentLayout = new LinearLayout(getContext());
        contentLayout.setOrientation(LinearLayout.VERTICAL);
        layout.addView(contentLayout);

        return layout;
    }

    @Override
    public void onResume() {
        super.onResume();
        refreshView();
    }

    private void refreshView() {
        contentLayout.removeAllViews();
        List<SavedItemsManager.SavedItem> items = savedManager.getSavedItems();

        if (items.isEmpty()) {
            statusText.setText("No saved items yet. Tap the bookmark icon on any cemetery, person, or memorial to save it here.");
            clearAllBtn.setVisibility(View.GONE);
            return;
        }

        statusText.setText(items.size() + " saved items");
        clearAllBtn.setVisibility(View.VISIBLE);

        for (SavedItemsManager.SavedItem item : items) {
            LinearLayout card = new LinearLayout(getContext());
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(32, 32, 32, 32);
            card.setBackground(ContextCompat.getDrawable(getContext(), android.R.drawable.editbox_background_normal));

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 12);
            card.setLayoutParams(lp);

            // Type label
            TextView typeLabel = new TextView(getContext());
            typeLabel.setText(item.type.substring(0, 1).toUpperCase() + item.type.substring(1));
            typeLabel.setTextSize(11);
            typeLabel.setContentDescription("Saved item type: " + item.type);
            card.addView(typeLabel);

            // Name
            TextView nameText = new TextView(getContext());
            nameText.setText(item.name);
            nameText.setTextSize(15);
            nameText.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            nameText.setContentDescription("Saved item name: " + item.name);
            card.addView(nameText);

            // Subtitle (optional)
            if (item.subtitle != null && !item.subtitle.isEmpty()) {
                TextView subText = new TextView(getContext());
                subText.setText(item.subtitle);
                subText.setTextSize(12);
                subText.setContentDescription("Saved item subtitle: " + item.subtitle);
                card.addView(subText);
            }

            // Actions row
            LinearLayout actionsRow = new LinearLayout(getContext());
            actionsRow.setOrientation(LinearLayout.HORIZONTAL);
            actionsRow.setPadding(0, 8, 0, 0);

            // Open button
            Button openBtn = new Button(getContext());
            openBtn.setText("Open");
            openBtn.setAllCaps(false);
            openBtn.setContentDescription("Open " + item.name);
            openBtn.setOnClickListener(v -> navigateToDetail(item));
            actionsRow.addView(openBtn);

            // Remove button
            Button removeBtn = new Button(getContext());
            removeBtn.setText("Remove");
            removeBtn.setAllCaps(false);
            removeBtn.setContentDescription("Remove " + item.name + " from saved");
            removeBtn.setOnClickListener(v -> {
                savedManager.removeSaved(item.type, item.id);
                refreshView();
            });
            actionsRow.addView(removeBtn);

            // Share button
            Button shareBtn = new Button(getContext());
            shareBtn.setText("Share");
            shareBtn.setAllCaps(false);
            shareBtn.setContentDescription("Share " + item.name);
            shareBtn.setOnClickListener(v -> {
                com.putraworks.graveatlas.utils.ShareUtils.shareRecord(getContext(), item.type, item.id, item.name);
            });
            actionsRow.addView(shareBtn);

            card.addView(actionsRow);
            contentLayout.addView(card);
        }
    }

    private void navigateToDetail(SavedItemsManager.SavedItem item) {
        if ("cemetery".equals(item.type)) {
            CemeteryFragment fragment = CemeteryFragment.newInstance(item.id);
            if (getActivity() instanceof MainNavActivity) {
                ((MainNavActivity) getActivity()).loadFragment(fragment);
            }
        } else if ("person".equals(item.type) || "grave".equals(item.type) || "memorial".equals(item.type)) {
            GraveDetailFragment fragment = GraveDetailFragment.newInstance(item.id);
            if (getActivity() instanceof MainNavActivity) {
                ((MainNavActivity) getActivity()).loadFragment(fragment);
            }
        }
    }
}
