package com.putraworks.graveatlas.ui.addgrave;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.model.GraveSubmission;
import com.putraworks.graveatlas.data.model.SubmissionResponse;

/**
 * Add grave screen — form for submitting new grave records.
 * Submissions enter "pending" state for moderation.
 */
public class AddGraveFragment extends Fragment {

    private EditText nameField, birthDateField, deathDateField, cemeteryField,
            sectionField, plotField, latField, lonField, notesField;
    private Button submitBtn;
    private ProgressBar progressBar;
    private TextView statusLabel;
    private ApiClient apiClient;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        apiClient = new ApiClient();

        // Title
        TextView title = new TextView(getContext());
        title.setText("Add a Grave");
        title.setTextSize(20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, 24);
        layout.addView(title);

        // Form fields
        nameField = createField(layout, "Name *", "");
        birthDateField = createField(layout, "Birth Date (YYYY-MM-DD)", "1950-01-01");
        deathDateField = createField(layout, "Death Date (YYYY-MM-DD)", "2020-01-01");
        cemeteryField = createField(layout, "Cemetery", "");
        sectionField = createField(layout, "Section", "");
        plotField = createField(layout, "Plot", "");
        latField = createField(layout, "Latitude (-90 to 90)", "1.3521");
        lonField = createField(layout, "Longitude (-180 to 180)", "103.8198");
        notesField = createField(layout, "Notes", "");

        // Info note
        TextView note = new TextView(getContext());
        note.setText("\nSubmissions are reviewed by moderators before publishing.\nYour submission will enter a pending state.");
        note.setTextSize(12);
        note.setPadding(0, 16, 0, 24);
        layout.addView(note);

        // Submit button
        submitBtn = new Button(getContext());
        submitBtn.setText("Submit for Review");
        submitBtn.setAllCaps(false);
        submitBtn.setOnClickListener(v -> submitForm());
        layout.addView(submitBtn);

        // Progress
        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.GONE);
        layout.addView(progressBar);

        // Status
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
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, 8);
        field.setLayoutParams(lp);
        parent.addView(field);
        return field;
    }

    private void submitForm() {
        GraveSubmission submission = new GraveSubmission();
        submission.name = nameField.getText().toString().trim();
        submission.birthDate = birthDateField.getText().toString().trim();
        submission.deathDate = deathDateField.getText().toString().trim();
        submission.cemetery = cemeteryField.getText().toString().trim();
        submission.section = sectionField.getText().toString().trim();
        submission.plot = plotField.getText().toString().trim();
        submission.notes = notesField.getText().toString().trim();

        // Parse coordinates
        try { submission.latitude = Double.parseDouble(latField.getText().toString().trim()); }
        catch (NumberFormatException e) { submission.latitude = 0; }
        try { submission.longitude = Double.parseDouble(lonField.getText().toString().trim()); }
        catch (NumberFormatException e) { submission.longitude = 0; }

        // Validate
        if (submission.name.isEmpty()) {
            Toast.makeText(getContext(), "Name is required", Toast.LENGTH_SHORT).show();
            return;
        }
        if (!submission.hasValidCoordinates()) {
            Toast.makeText(getContext(), "Invalid coordinates (lat: -90 to 90, lon: -180 to 180)", Toast.LENGTH_SHORT).show();
            return;
        }

        // Clear optional empty fields
        if (submission.birthDate.isEmpty()) submission.birthDate = null;
        if (submission.deathDate.isEmpty()) submission.deathDate = null;
        if (submission.cemetery.isEmpty()) submission.cemetery = null;
        if (submission.section.isEmpty()) submission.section = null;
        if (submission.plot.isEmpty()) submission.plot = null;
        if (submission.notes.isEmpty()) submission.notes = null;

        // Submit
        progressBar.setVisibility(View.VISIBLE);
        submitBtn.setEnabled(false);
        statusLabel.setText("");

        apiClient.submitGrave(submission, new ApiClient.ApiCallback<SubmissionResponse>() {
            @Override
            public void onSuccess(SubmissionResponse result) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        submitBtn.setEnabled(true);
                        statusLabel.setText("✓ Submitted! ID: " + result.submissionId + "\nStatus: pending review");
                        clearForm();
                    });
                }
            }

            @Override
            public void onError(String error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        submitBtn.setEnabled(true);
                        statusLabel.setText("Error: " + error + "\n\nThe backend must be deployed before submissions can be received.");
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
