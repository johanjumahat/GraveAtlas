package com.putraworks.graveatlas.ui.ai;

import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.util.AttributeSet;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.widget.AppCompatEditText;

import com.putraworks.graveatlas.MainActivity;
import com.putraworks.graveatlas.chat.AISystemPrompts;

/**
 * Persistent AI command bar — appears above the bottom navigation on every screen.
 *
 * Phase 16.2: Makes the AI command bar persistent across all screens in MainNavActivity.
 * Users can type a research question from any screen and it opens AI chat pre-filled.
 *
 * The bar is collapsible — tap to expand, auto-collapses after sending.
 */
public class AICommandBar extends LinearLayout {

    private EditText etCommand;
    private ImageButton btnSend;
    private boolean isExpanded = false;

    public AICommandBar(Context context) {
        super(context);
        init(context);
    }

    public AICommandBar(Context context, AttributeSet attrs) {
        super(context, attrs);
        init(context);
    }

    public AICommandBar(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init(context);
    }

    private void init(Context context) {
        setOrientation(HORIZONTAL);
        setPadding(32, 12, 32, 12);
        setGravity(android.view.Gravity.CENTER_VERTICAL);

        // AI label / hint
        TextView aiLabel = new TextView(context);
        aiLabel.setText("🔍 Ask GraveAtlas");
        aiLabel.setTextSize(12);
        aiLabel.setTypeface(Typeface.DEFAULT_BOLD);
        aiLabel.setPadding(0, 0, 16, 0);
        addView(aiLabel);

        // Command input
        etCommand = new EditText(context);
        etCommand.setHint("Ask any question...");
        etCommand.setSingleLine(true);
        etCommand.setImeOptions(EditorInfo.IME_ACTION_SEND);
        etCommand.setBackground(null);
        etCommand.setTextSize(13);
        etCommand.setPadding(16, 8, 16, 8);
        LayoutParams etParams = new LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f);
        etCommand.setLayoutParams(etParams);
        addView(etCommand);

        // Send button
        btnSend = new ImageButton(context);
        btnSend.setImageResource(android.R.drawable.ic_menu_send);
        btnSend.setBackground(null);
        btnSend.setPadding(8, 8, 8, 8);
        btnSend.setContentDescription("Send question to AI");
        addView(btnSend);

        // Send action
        btnSend.setOnClickListener(v -> sendCommand());

        // Enter key sends
        etCommand.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEND) {
                sendCommand();
                return true;
            }
            return false;
        });
    }

    /**
     * Send the current command to AI chat.
     * Opens MainActivity (AI chat) with the question pre-filled.
     */
    private void sendCommand() {
        String question = etCommand.getText() != null ? etCommand.getText().toString().trim() : "";
        if (question.isEmpty()) return;

        Intent intent = new Intent(getContext(), MainActivity.class);
        intent.putExtra("prefill_question", question);
        intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        getContext().startActivity(intent);

        // Clear the input after sending
        etCommand.setText("");
    }

    /**
     * Pre-fill the command bar with a prompt (e.g. from suggested prompts).
     */
    public void preFill(String text) {
        if (text != null && !text.isEmpty()) {
            etCommand.setText(text);
            etCommand.requestFocus();
            etCommand.setSelection(text.length());
        }
    }

    /**
     * Clear the command bar input.
     */
    public void clear() {
        etCommand.setText("");
    }

    /**
     * Check if the command bar has text.
     */
    public boolean hasText() {
        return etCommand.getText() != null && !etCommand.getText().toString().trim().isEmpty();
    }
}
