package com.putraworks.graveatlas.data.api;

import com.putraworks.graveatlas.data.model.GraveRecord;
import com.putraworks.graveatlas.data.model.GraveSubmission;
import com.putraworks.graveatlas.data.model.SubmissionResponse;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * API client for communicating with the Cloudflare Worker backend.
 * No secrets are stored here — the backend handles GitHub authentication.
 */
public class ApiClient {
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    private static final int TIMEOUT_SECONDS = 30;

    private final OkHttpClient client;
    private final String baseUrl;

    // Default URL — configurable from Settings
    private static String configuredUrl = null;

    public ApiClient() {
        this.client = new OkHttpClient.Builder()
                .connectTimeout(TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS)
                .build();
        this.baseUrl = configuredUrl != null ? configuredUrl : "https://graveatlas.putraworks-2026.workers.dev";
    }

    public static void setBaseUrl(String url) {
        configuredUrl = url;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    /**
     * Health check — GET /api/health
     */
    public void checkHealth(final ApiCallback<String> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/health")
                .get()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError("Network error: " + e.getMessage());
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    callback.onSuccess(response.body() != null ? response.body().string() : "OK");
                } else {
                    callback.onError("Health check failed: " + response.code());
                }
            }
        });
    }

    /**
     * Submit a new grave — POST /api/graves
     */
    public void submitGrave(GraveSubmission submission, final ApiCallback<SubmissionResponse> callback) {
        try {
            JSONObject json = new JSONObject();
            if (submission.name != null) json.put("name", submission.name);
            if (submission.birthDate != null) json.put("birthDate", submission.birthDate);
            if (submission.deathDate != null) json.put("deathDate", submission.deathDate);
            if (submission.cemetery != null) json.put("cemetery", submission.cemetery);
            if (submission.section != null) json.put("section", submission.section);
            if (submission.plot != null) json.put("plot", submission.plot);
            if (submission.hasValidCoordinates()) {
                json.put("latitude", submission.latitude);
                json.put("longitude", submission.longitude);
            }
            if (submission.notes != null) json.put("notes", submission.notes);

            RequestBody body = RequestBody.create(json.toString(), JSON);
            Request request = new Request.Builder()
                    .url(baseUrl + "/api/graves")
                    .post(body)
                    .build();

            client.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    SubmissionResponse resp = new SubmissionResponse();
                    resp.success = false;
                    resp.error = "Network error: " + e.getMessage();
                    callback.onError(resp.error);
                }

                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    String responseBody = response.body() != null ? response.body().string() : "{}";
                    try {
                        JSONObject json = new JSONObject(responseBody);
                        SubmissionResponse resp = new SubmissionResponse();
                        resp.success = json.optBoolean("success", false);
                        resp.submissionId = json.optString("submissionId", null);
                        resp.status = json.optString("status", "error");
                        resp.error = json.optString("error", null);

                        if (response.isSuccessful() && resp.success) {
                            callback.onSuccess(resp);
                        } else {
                            callback.onError(resp.error != null ? resp.error : "Submission failed (" + response.code() + ")");
                        }
                    } catch (Exception e) {
                        callback.onError("Invalid response from server");
                    }
                }
            });
        } catch (Exception e) {
            callback.onError("Failed to build request: " + e.getMessage());
        }
    }

    /**
     * Get all graves — GET /api/graves
     */
    public void getGraves(final ApiCallback<List<GraveRecord>> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves")
                .get()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError("Network error: " + e.getMessage());
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    try {
                        String body = response.body() != null ? response.body().string() : "[]";
                        JSONArray arr = new JSONArray(body);
                        List<GraveRecord> graves = new ArrayList<>();
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject obj = arr.getJSONObject(i);
                            graves.add(parseGrave(obj));
                        }
                        callback.onSuccess(graves);
                    } catch (Exception e) {
                        callback.onError("Failed to parse response");
                    }
                } else {
                    callback.onError("Failed to fetch graves: " + response.code());
                }
            }
        });
    }

    /**
     * Get a single grave — GET /api/graves/:id
     */
    public void getGrave(String id, final ApiCallback<GraveRecord> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves/" + id)
                .get()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError("Network error: " + e.getMessage());
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    try {
                        String body = response.body() != null ? response.body().string() : "{}";
                        JSONObject obj = new JSONObject(body);
                        callback.onSuccess(parseGrave(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse response");
                    }
                } else {
                    callback.onError("Grave not found: " + response.code());
                }
            }
        });
    }

    /**
     * Report a correction — POST /api/graves/:id/report
     */
    public void reportGrave(String id, String reportText, final ApiCallback<String> callback) {
        try {
            JSONObject json = new JSONObject();
            json.put("report", reportText);

            RequestBody body = RequestBody.create(json.toString(), JSON);
            Request request = new Request.Builder()
                    .url(baseUrl + "/api/graves/" + id + "/report")
                    .post(body)
                    .build();

            client.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    callback.onError("Network error: " + e.getMessage());
                }

                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    if (response.isSuccessful()) {
                        callback.onSuccess("Report submitted. Thank you.");
                    } else {
                        callback.onError("Report failed: " + response.code());
                    }
                }
            });
        } catch (Exception e) {
            callback.onError("Failed to build request: " + e.getMessage());
        }
    }

    private GraveRecord parseGrave(JSONObject obj) {
        GraveRecord grave = new GraveRecord();
        grave.id = obj.optString("id", null);
        grave.name = obj.optString("name", null);
        grave.birthDate = obj.optString("birthDate", null);
        grave.deathDate = obj.optString("deathDate", null);
        grave.cemetery = obj.optString("cemetery", null);
        grave.section = obj.optString("section", null);
        grave.plot = obj.optString("plot", null);
        grave.latitude = obj.optDouble("latitude", 0);
        grave.longitude = obj.optDouble("longitude", 0);
        grave.notes = obj.optString("notes", null);
        grave.source = obj.optString("source", null);
        grave.status = obj.optString("status", null);
        grave.submittedAt = obj.optString("submittedAt", null);
        grave.updatedAt = obj.optString("updatedAt", null);

        JSONArray photos = obj.optJSONArray("photoRefs");
        if (photos != null) {
            grave.photoRefs = new String[photos.length()];
            for (int i = 0; i < photos.length(); i++) {
                grave.photoRefs[i] = photos.optString(i);
            }
        }
        return grave;
    }

    public interface ApiCallback<T> {
        void onSuccess(T result);
        void onError(String error);
    }
}
