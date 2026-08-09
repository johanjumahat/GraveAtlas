package com.putraworks.graveatlas.auth;

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

/**
 * Optional Google Sign-In screen. Launched from Settings.
 * On success, stores user info in encrypted storage and returns to caller.
 * The app works fully without signing in — login just enables per-user
 * encrypted storage for chat history and API keys.
 */
public class LoginActivity extends AppCompatActivity {

    private static final int RC_SIGN_IN = 9001;

    private GoogleSignInClient signInClient;
    private Button btnSignIn;
    private ProgressBar progressBar;
    private TextView tvError;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        SecureStorage.init(this);

        // If already logged in, just close
        if (SecureStorage.isLoggedIn(this)) {
            Toast.makeText(this, "Already signed in as " + SecureStorage.getCurrentUserName(this), Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        // Configure Google Sign-In
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestId()
                .requestProfile()
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
                    String userId = account.getId() != null ? account.getId() : account.getEmail();
                    SecureStorage.saveCurrentUser(this, userId, account.getEmail(),
                            account.getDisplayName() != null ? account.getDisplayName() : "User");

                    Toast.makeText(this, "Signed in as " + SecureStorage.getCurrentUserName(this), Toast.LENGTH_SHORT).show();
                    setResult(RESULT_OK);
                    finish();
                }
            } catch (ApiException e) {
                progressBar.setVisibility(View.GONE);
                btnSignIn.setEnabled(true);
                tvError.setText("Sign-in failed: " + e.getStatusCode());
                tvError.setVisibility(View.VISIBLE);
            }
        }
    }
}
