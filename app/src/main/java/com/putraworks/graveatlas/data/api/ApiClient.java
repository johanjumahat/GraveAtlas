package com.putraworks.graveatlas.data.api;

import com.putraworks.graveatlas.data.model.CemeteryRecord;
import com.putraworks.graveatlas.data.model.GraveRecord;
import com.putraworks.graveatlas.data.model.GraveSubmission;
import com.putraworks.graveatlas.data.model.SubmissionResponse;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

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
 *
 * Production URL: https://graveatlas.putraworks-2026.workers.dev
 * Configurable via Settings (SharedPreferences).
 */
public class ApiClient {
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    private static final int TIMEOUT_SECONDS = 30;
    private static final String DEFAULT_URL = "https://graveatlas.putraworks-2026.workers.dev";

    private final OkHttpClient client;
    private final String baseUrl;

    private static String configuredUrl = null;

    public ApiClient() {
        this.client = new OkHttpClient.Builder()
                .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .build();
        this.baseUrl = configuredUrl != null ? configuredUrl : DEFAULT_URL;
    }

    public static void setBaseUrl(String url) {
        configuredUrl = url;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    // ── Health Check ──

    public void checkHealth(final ApiCallback<HealthResult> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/health")
                .get()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(ApiErrorHandler.getNetworkMessage(e.getMessage()));
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                String body = response.body() != null ? response.body().string() : "{}";
                if (response.isSuccessful()) {
                    try {
                        JSONObject json = new JSONObject(body);
                        HealthResult result = new HealthResult();
                        result.reachable = true;
                        result.httpCode = response.code();
                        result.status = json.optString("status", "unknown");
                        result.service = json.optString("service", "unknown");
                        result.githubConfigured = json.optBoolean("githubConfigured", false);
                        callback.onSuccess(result);
                    } catch (Exception e) {
                        HealthResult result = new HealthResult();
                        result.reachable = true;
                        result.httpCode = response.code();
                        callback.onSuccess(result);
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Graves ──

    public void getGraves(final ApiCallback<List<GraveRecord>> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves")
                .get()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(ApiErrorHandler.getNetworkMessage(e.getMessage()));
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    try {
                        String body = response.body() != null ? response.body().string() : "[]";
                        JSONObject json = new JSONObject(body);
                        JSONArray arr = json.optJSONArray("graves");
                        if (arr == null) {
                            // Fallback: body might be a raw array
                            arr = new JSONArray(body);
                        }
                        List<GraveRecord> graves = new ArrayList<>();
                        for (int i = 0; i < arr.length(); i++) {
                            graves.add(parseGrave(arr.getJSONObject(i)));
                        }
                        callback.onSuccess(graves);
                    } catch (Exception e) {
                        callback.onError("Failed to parse server response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    public void getGrave(String id, final ApiCallback<GraveRecord> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves/" + id)
                .get()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(ApiErrorHandler.getNetworkMessage(e.getMessage()));
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    try {
                        String body = response.body() != null ? response.body().string() : "{}";
                        JSONObject obj = new JSONObject(body);
                        callback.onSuccess(parseGrave(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse server response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Cemeteries ──

    public void getCemeteries(final ApiCallback<List<CemeteryRecord>> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries")
                .get()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(ApiErrorHandler.getNetworkMessage(e.getMessage()));
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    try {
                        String body = response.body() != null ? response.body().string() : "[]";
                        JSONObject json = new JSONObject(body);
                        JSONArray arr = json.optJSONArray("cemeteries");
                        if (arr == null) {
                            arr = new JSONArray(body);
                        }
                        List<CemeteryRecord> cemeteries = new ArrayList<>();
                        for (int i = 0; i < arr.length(); i++) {
                            cemeteries.add(parseCemetery(arr.getJSONObject(i)));
                        }
                        callback.onSuccess(cemeteries);
                    } catch (Exception e) {
                        callback.onError("Failed to parse server response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    public void getCemetery(String id, final ApiCallback<CemeteryRecord> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + id)
                .get()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(ApiErrorHandler.getNetworkMessage(e.getMessage()));
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    try {
                        String body = response.body() != null ? response.body().string() : "{}";
                        JSONObject obj = new JSONObject(body);
                        callback.onSuccess(parseCemetery(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse server response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Submission ──

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
                    callback.onError(ApiErrorHandler.getNetworkMessage(e.getMessage()));
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
                            String msg = resp.error != null ? resp.error : ApiErrorHandler.getHttpMessage(response.code());
                            callback.onError(msg);
                        }
                    } catch (Exception e) {
                        callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                    }
                }
            });
        } catch (Exception e) {
            callback.onError("Failed to build request.");
        }
    }

    // ── Submission Status ──

    public void getSubmissionStatus(String submissionId, final ApiCallback<SubmissionStatus> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/submissions/" + submissionId)
                .get()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(ApiErrorHandler.getNetworkMessage(e.getMessage()));
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    try {
                        String body = response.body() != null ? response.body().string() : "{}";
                        JSONObject json = new JSONObject(body);
                        SubmissionStatus status = new SubmissionStatus();
                        status.success = json.optBoolean("success", false);
                        status.id = json.optString("id", null);
                        status.status = json.optString("status", "unknown");
                        status.name = json.optString("name", null);
                        status.submittedAt = json.optString("submittedAt", null);
                        status.updatedAt = json.optString("updatedAt", null);
                        callback.onSuccess(status);
                    } catch (Exception e) {
                        callback.onError("Failed to parse server response.");
                    }
                } else if (response.code() == 404) {
                    callback.onError("Submission not found. It may have been removed.");
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Report ──

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
                    callback.onError(ApiErrorHandler.getNetworkMessage(e.getMessage()));
                }

                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    if (response.isSuccessful()) {
                        callback.onSuccess("Report submitted. Thank you.");
                    } else {
                        callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                    }
                }
            });
        } catch (Exception e) {
            callback.onError("Failed to build request.");
        }
    }

    // ── Parsers ──

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

    private CemeteryRecord parseCemetery(JSONObject obj) {
        CemeteryRecord cemetery = new CemeteryRecord();
        cemetery.id = obj.optString("id", null);
        cemetery.name = obj.optString("name", null);
        cemetery.address = obj.optString("address", null);
        cemetery.latitude = obj.optDouble("latitude", 0);
        cemetery.longitude = obj.optDouble("longitude", 0);
        cemetery.description = obj.optString("description", null);
        cemetery.status = obj.optString("status", null);
        cemetery.submittedAt = obj.optString("submittedAt", null);
        cemetery.updatedAt = obj.optString("updatedAt", null);
        return cemetery;
    }

    // ── Result types ──

    public static class HealthResult {
        public boolean reachable;
        public int httpCode;
        public String status;
        public String service;
        public boolean githubConfigured;
    }

    public static class SubmissionStatus {
        public boolean success;
        public String id;
        public String status;
        public String name;
        public String submittedAt;
        public String updatedAt;
    }

    // ── Callback interface ──

    public interface ApiCallback<T> {
        void onSuccess(T result);
        void onError(String error);
    }
}
