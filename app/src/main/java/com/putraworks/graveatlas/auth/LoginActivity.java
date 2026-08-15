package com.putraworks.graveatlas.auth;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import com.putraworks.graveatlas.R;

import org.json.JSONObject;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Google Sign-In screen. REQUIRED before submitting records.
 *
 * Flow:
 * 1. User taps "Sign in with Google"
 * 2. Google returns an ID token (verified server-side)
 * 3. App sends ID token to POST /api/auth/google/verify
 * 4. Backend verifies with Google, creates user, returns session token
 * 5. App stores session token in encrypted storage
 * 6. All subsequent submission requests include Bearer session token
 *
 * The app can browse/search without logging in, but adding records
 * requires authentication for abuse prevention.
 */
public class LoginActivity extends AppCompatActivity {

    private static final int RC_SIGN_IN = 9001;

    private GoogleSignInClient signInClient;
    private Button btnSignIn;
    private ProgressBar progressBar;
    private TextView tvError;

    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    private static final String AUTH_VERIFY_URL = "https://graveatlas.putraworks-2026.workers.dev/api/auth/google/verify";

    /**
     * Check if the user can submit records. Call from any fragment/activity
     * before showing the add/submit UI. If false, launch LoginActivity.
     *
     * @param context Activity context
     * @return true if user has valid session, false if login needed
     */
    public static boolean requireLogin(Context context) {
        SecureStorage.init(context);
        return SecureStorage.canSubmit(context);
    }

    /**
     * Launch the login activity from any fragment/activity.
     */
    public static void launch(Context context) {
        Intent intent = new Intent(context, LoginActivity.class);
        if (context instanceof androidx.appcompat.app.AppCompatActivity) {
            ((androidx.appcompat.app.AppCompatActivity) context).startActivityForResult(intent, 9001);
        } else {
            context.startActivity(intent);
        }
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        SecureStorage.init(this);

        // If already logged in with valid session, just close
        if (SecureStorage.canSubmit(this)) {
            Toast.makeText(this, "Already signed in as " + SecureStorage.getCurrentUserName(this), Toast.LENGTH_SHORT).show();
            setResult(RESULT_OK);
            finish();
            return;
        }

        // Configure Google Sign-In — request ID token for server-side verification
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestId()
                .requestProfile()
                .requestIdToken("CLIENT_ID_PLACEHOLDER") // Replace with actual Web Client ID
                .build();
        signInClient = GoogleSignIn.getClient(this, gso);

        btnSignIn = findViewById(R.id.btnGoogleSignIn);
        progressBar = findViewById(R.id.loginProgress);
        tvError = findViewById(R.id.tvLoginError);

        Button btnSkip = findViewById(R.id.btnSkipLogin);
        btnSkip.setOnClickListener(v -> {
            setResult(RESULT_CANCELED);
            finish();
        });

        btnSignIn.setOnClickListener(v -> {
            tvError.setVisibility(View.GONE);
            progressBar.setVisibility(View.VISIBLE);
            btnSignIn.setEnabled(false);
            Intent signInIntent = signInClient.getSignInIntent();
            startActivityForResult(signInIntent, RC_SIGN_IN);
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == RC_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                if (account != null) {
                    // Get the ID token for server-side verification
                    String idToken = account.getIdToken();
                    if (idToken != null) {
                        verifyWithBackend(idToken, account);
                    } else {
                        // No ID token — can't verify with backend
                        onError("Sign-in failed: No ID token received. Please try again.");
                    }
                }
            } catch (ApiException e) {
                onError("Sign-in failed: " + e.getStatusCode());
            }
        }
    }

    /**
     * Send the Google ID token to the backend for verification.
     * The backend verifies with Google's servers and returns a session token.
     */
    private void verifyWithBackend(String idToken, GoogleSignInAccount account) {
        OkHttpClient client = new OkHttpClient();
        try {
            JSONObject json = new JSONObject();
            json.put("idToken", idToken);

            RequestBody body = RequestBody.create(json.toString(), JSON);
            Request request = new Request.Builder()
                    .url(AUTH_VERIFY_URL)
                    .post(body)
                    .build();

            client.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    runOnUiThread(() -> onError("Network error: " + e.getMessage()));
                }

                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    String responseBody = response.body() != null ? response.body().string() : "{}";
                    runOnUiThread(() -> handleVerifyResponse(responseBody, response.code(), account));
                }
            });
        } catch (Exception e) {
            runOnUiThread(() -> onError("Failed to send verification request."));
        }
    }

    private void handleVerifyResponse(String responseBody, int httpCode, GoogleSignInAccount account) {
        try {
            JSONObject json = new JSONObject(responseBody);
            boolean success = json.optBoolean("success", false);

            if (success) {
                String sessionToken = json.optString("sessionToken", null);
                String userId = json.optString("userId", null);
                String displayName = json.optString("displayName", account.getDisplayName() != null ? account.getDisplayName() : "User");

                if (sessionToken != null && userId != null) {
                    // Store session token and user info
                    SecureStorage.saveCurrentUser(this, userId,
                            account.getEmail() != null ? account.getEmail() : "",
                            displayName);

                    // Extract google sub from userId (format: user_g<sub>)
                    String googleSub = userId.startsWith("user_g") ? userId.substring(7) : account.getId();
                    SecureStorage.saveSessionToken(this, sessionToken, googleSub);

                    Toast.makeText(this, "Signed in as " + displayName, Toast.LENGTH_SHORT).show();
                    setResult(RESULT_OK);
                    finish();
                } else {
                    onError("Server did not return session token. Please try again.");
                }
            } else {
                String error = json.optString("error", "Verification failed");
                String banReason = json.optString("banReason", null);
                if (banReason != null) {
                    onError(error + ": " + banReason);
                } else {
                    onError(error);
                }
            }
        } catch (Exception e) {
            onError("Failed to parse server response (HTTP " + httpCode + ")");
        }
    }

    private void onError(String message) {
        progressBar.setVisibility(View.GONE);
        btnSignIn.setEnabled(true);
        tvError.setText(message);
        tvError.setVisibility(View.VISIBLE);
    }
}
