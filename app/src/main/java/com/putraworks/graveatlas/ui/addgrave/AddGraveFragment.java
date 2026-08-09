package com.putraworks.graveatlas.ui.addgrave;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.api.ApiErrorHandler;
import com.putraworks.graveatlas.data.api.OfflineSubmissionManager;
import com.putraworks.graveatlas.data.model.GraveSubmission;
import com.putraworks.graveatlas.data.model.SubmissionResponse;

/**
 * Add grave screen — form for submitting new grave records.
 * Includes a review step before submission and offline support.
 * Submissions enter "pending" state for moderator review.
 */
public class AddGraveFragment extends Fragment {

    private EditText nameField, birthDateField, deathDateField, cemeteryField,
            sectionField, plotField, latField, lonField, notesField;
    private Button submitBtn, reviewBtn, confirmBtn, cancelBtn;
    private ProgressBar progressBar;
    private TextView statusLabel;
    private LinearLayout formLayout, reviewLayout;
    private ApiClient apiClient;
    private OfflineSubmissionManager offlineManager;
    private GraveSubmission pendingSubmission;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        apiClient = new ApiClient();
        offlineManager = new OfflineSubmissionManager(getContext(), apiClient);

        TextView title = new TextView(getContext());
        title.setText("Add a Grave");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 16);
        layout.addView(title);

        // Form layout
        formLayout = new LinearLayout(getContext());
        formLayout.setOrientation(LinearLayout.VERTICAL);

        nameField = createField(formLayout, "Name *", "");
        birthDateField = createField(formLayout, "Birth Date (YYYY-MM-DD)", "1950-01-01");
        deathDateField = createField(formLayout, "Death Date (YYYY-MM-DD)", "2020-01-01");
        cemeteryField = createField(formLayout, "Cemetery", "");
        sectionField = createField(formLayout, "Section", "");
        plotField = createField(formLayout, "Plot", "");
        latField = createField(formLayout, "Latitude (-90 to 90)", "1.3521");
        lonField = createField(formLayout, "Longitude (-180 to 180)", "103.8198");
        notesField = createField(formLayout, "Notes", "");

        TextView note = new TextView(getContext());
        note.setText("\n* Required field. Submissions are reviewed by moderators before publishing.\nYour submission will enter a pending state.");
        note.setTextSize(12);
        note.setPadding(0, 16, 0, 16);
        formLayout.addView(note);

        reviewBtn = new Button(getContext());
        reviewBtn.setText("Review Submission");
        reviewBtn.setAllCaps(false);
        reviewBtn.setOnClickListener(v -> showReview());
        formLayout.addView(reviewBtn);
        layout.addView(formLayout);

        // Review layout (hidden initially)
        reviewLayout = new LinearLayout(getContext());
        reviewLayout.setOrientation(LinearLayout.VERTICAL);
        reviewLayout.setVisibility(View.GONE);

        TextView reviewTitle = new TextView(getContext());
        reviewTitle.setText("Review Your Submission");
        reviewTitle.setTextSize(18);
        reviewTitle.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        reviewTitle.setPadding(0, 0, 0, 16);
        reviewLayout.addView(reviewTitle);

        TextView reviewContent = new TextView(getContext());
        reviewContent.setId(android.R.id.text1);
        reviewContent.setTextSize(14);
        reviewContent.setPadding(24, 24, 24, 24);
        reviewLayout.addView(reviewContent);

        LinearLayout btnRow = new LinearLayout(getContext());
        btnRow.setOrientation(LinearLayout.HORIZONTAL);
        confirmBtn = new Button(getContext());
        confirmBtn.setText("Confirm & Submit");
        confirmBtn.setAllCaps(false);
        confirmBtn.setOnClickListener(v -> submitForm());
        btnRow.addView(confirmBtn);

        cancelBtn = new Button(getContext());
        cancelBtn.setText("Edit");
        cancelBtn.setAllCaps(false);
        cancelBtn.setOnClickListener(v -> {
            formLayout.setVisibility(View.VISIBLE);
            reviewLayout.setVisibility(View.GONE);
        });
        btnRow.addView(cancelBtn);
        reviewLayout.addView(btnRow);
        layout.addView(reviewLayout);

        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        statusLabel = new TextView(getContext());
        statusLabel.setPadding(0, 16, 0, 0);
        layout.addView(statusLabel);

        return layout;
    }

    private EditText createField(LinearLayout parent, String hint, String defaultValue) {
        TextView label = new TextView(getContext());
        label.setText(hint);
        label.setTextSize(13);
        label.setPadding(0, 8, 0, 4);
        parent.addView(label);

        EditText field = new EditText(getContext());
        field.setHint(hint);
        if (!defaultValue.isEmpty()) field.setHint(defaultValue);
        field.setPadding(16, 16, 16, 16);
        field.setContentDescription(hint);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, 8);
        field.setLayoutParams(lp);
        parent.addView(field);
        return field;
    }

    private void showReview() {
        GraveSubmission submission = collectFormData();
        if (submission == null) return; // validation failed

        pendingSubmission = submission;
        StringBuilder review = new StringBuilder();
        review.append("Name: ").append(submission.name != null ? submission.name : "—").append("\n");
        review.append("Birth Date: ").append(submission.birthDate != null ? submission.birthDate : "—").append("\n");
        review.append("Death Date: ").append(submission.deathDate != null ? submission.deathDate : "—").append("\n");
        review.append("Cemetery: ").append(submission.cemetery != null ? submission.cemetery : "—").append("\n");
        review.append("Section: ").append(submission.section != null ? submission.section : "—").append("\n");
        review.append("Plot: ").append(submission.plot != null ? submission.plot : "—").append("\n");
        if (submission.hasValidCoordinates() && (submission.latitude != 0 || submission.longitude != 0)) {
            review.append("Coordinates: ").append(submission.latitude).append(", ").append(submission.longitude).append("\n");
        }
        review.append("Notes: ").append(submission.notes != null ? submission.notes : "—");

        TextView reviewContent = reviewLayout.findViewById(android.R.id.text1);
        reviewContent.setText(review.toString());

        formLayout.setVisibility(View.GONE);
        reviewLayout.setVisibility(View.VISIBLE);
    }

    private GraveSubmission collectFormData() {
        GraveSubmission submission = new GraveSubmission();
        submission.name = nameField.getText().toString().trim();
        submission.birthDate = birthDateField.getText().toString().trim();
        submission.deathDate = deathDateField.getText().toString().trim();
        submission.cemetery = cemeteryField.getText().toString().trim();
        submission.section = sectionField.getText().toString().trim();
        submission.plot = plotField.getText().toString().trim();
        submission.notes = notesField.getText().toString().trim();

        try { submission.latitude = Double.parseDouble(latField.getText().toString().trim()); }
        catch (NumberFormatException e) { submission.latitude = 0; }
        try { submission.longitude = Double.parseDouble(lonField.getText().toString().trim()); }
        catch (NumberFormatException e) { submission.longitude = 0; }

        // Local validation
        if (submission.name.isEmpty()) {
            Toast.makeText(getContext(), "Name is required", Toast.LENGTH_SHORT).show();
            return null;
        }
        if (submission.name.length() > 500) {
            Toast.makeText(getContext(), "Name is too long (max 500 characters)", Toast.LENGTH_SHORT).show();
            return null;
        }
        if (!submission.hasValidCoordinates()) {
            Toast.makeText(getContext(), "Invalid coordinates (lat: -90 to 90, lon: -180 to 180)", Toast.LENGTH_SHORT).show();
            return null;
        }
        if (!submission.birthDate.isEmpty() && !submission.birthDate.matches("\\d{4}-\\d{2}-\\d{2}")) {
            Toast.makeText(getContext(), "Birth date must be YYYY-MM-DD", Toast.LENGTH_SHORT).show();
            return null;
        }
        if (!submission.deathDate.isEmpty() && !submission.deathDate.matches("\\d{4}-\\d{2}-\\d{2}")) {
            Toast.makeText(getContext(), "Death date must be YYYY-MM-DD", Toast.LENGTH_SHORT).show();
            return null;
        }

        // Clear optional empty fields
        if (submission.birthDate.isEmpty()) submission.birthDate = null;
        if (submission.deathDate.isEmpty()) submission.deathDate = null;
        if (submission.cemetery.isEmpty()) submission.cemetery = null;
        if (submission.section.isEmpty()) submission.section = null;
        if (submission.plot.isEmpty()) submission.plot = null;
        if (submission.notes.isEmpty()) submission.notes = null;

        return submission;
    }

    private void submitForm() {
        if (pendingSubmission == null) return;

        progressBar.setVisibility(View.VISIBLE);
        confirmBtn.setEnabled(false);
        cancelBtn.setEnabled(false);
        statusLabel.setText("");

        apiClient.submitGrave(pendingSubmission, new ApiClient.ApiCallback<SubmissionResponse>() {
            @Override
            public void onSuccess(SubmissionResponse result) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        confirmBtn.setEnabled(true);
                        cancelBtn.setEnabled(true);
                        statusLabel.setText("✓ Submitted! ID: " + result.submissionId + "\nStatus: pending review");
                        reviewLayout.setVisibility(View.GONE);
                        formLayout.setVisibility(View.VISIBLE);
                        clearForm();
                        pendingSubmission = null;
                    });
                }
            }

            @Override
            public void onError(String error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        confirmBtn.setEnabled(true);
                        cancelBtn.setEnabled(true);

                        if (ApiErrorHandler.isOfflineError(error)) {
                            // Save for offline retry
                            String localId = offlineManager.savePending(pendingSubmission);
                            statusLabel.setText("You're offline. Your submission has been saved and will be sent when you're connected.\n\nLocal ID: " + localId);
                            reviewLayout.setVisibility(View.GONE);
                            formLayout.setVisibility(View.VISIBLE);
                            clearForm();
                        } else {
                            statusLabel.setText(error);
                        }
                    });
                }
            }
        });
    }

    private void clearForm() {
        nameField.setText("");
        birthDateField.setText("");
        deathDateField.setText("");
        cemeteryField.setText("");
        sectionField.setText("");
        plotField.setText("");
        latField.setText("");
        lonField.setText("");
        notesField.setText("");
    }
}
