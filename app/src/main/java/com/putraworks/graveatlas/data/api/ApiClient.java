package com.putraworks.graveatlas.data.api;

import com.putraworks.graveatlas.data.model.CemeteryRecord;
import com.putraworks.graveatlas.data.model.CemeteryStats;
import com.putraworks.graveatlas.data.model.DuplicateResult;
import com.putraworks.graveatlas.data.model.EnrichmentResult;
import com.putraworks.graveatlas.data.model.ConnectionNetwork;
import com.putraworks.graveatlas.data.model.ImportQualityScore;
import com.putraworks.graveatlas.data.model.ImportBatchReport;
import com.putraworks.graveatlas.data.model.AnomalyReport;
import com.putraworks.graveatlas.data.model.RecordAnomalyCheck;
import com.putraworks.graveatlas.data.model.CemeteryHealth;
import com.putraworks.graveatlas.data.model.GlobalHealthOverview;
import com.putraworks.graveatlas.data.model.CemeteryRecommendations;
import com.putraworks.graveatlas.data.model.GlobalRecommendations;
import com.putraworks.graveatlas.data.model.CemeteryAutoFixPreview;
import com.putraworks.graveatlas.data.model.CemeteryAutoFixResult;
import com.putraworks.graveatlas.data.model.RecordAutoFixResult;
import com.putraworks.graveatlas.data.model.CleanupResult;
import com.putraworks.graveatlas.data.model.GlobalCleanupResult;
import com.putraworks.graveatlas.data.model.CemeteryReport;
import com.putraworks.graveatlas.data.model.CemeteryReportSummary;
import com.putraworks.graveatlas.data.model.GlobalReport;
import com.putraworks.graveatlas.data.model.WatchlistItem;
import com.putraworks.graveatlas.data.model.WatchlistCheckResult;
import com.putraworks.graveatlas.data.model.WatchlistStatus;
import com.putraworks.graveatlas.data.model.MergeProposal;
import com.putraworks.graveatlas.data.model.MergeResult;
import com.putraworks.graveatlas.data.model.MergeSuggestion;
import com.putraworks.graveatlas.data.model.MergeHistory;
import com.putraworks.graveatlas.data.model.SourceVerification;
import com.putraworks.graveatlas.data.model.RecordSourceVerification;
import com.putraworks.graveatlas.data.model.CemeterySourceVerification;
import com.putraworks.graveatlas.data.model.SourceVerificationStatus;
import com.putraworks.graveatlas.data.model.ConfidenceScore;
import com.putraworks.graveatlas.data.model.CemeteryConfidence;
import com.putraworks.graveatlas.data.model.ConfidenceLeaderboard;
import com.putraworks.graveatlas.data.model.ProvenanceChain;
import com.putraworks.graveatlas.data.model.ProvenanceSearch;
import com.putraworks.graveatlas.data.model.ProvenanceTimeline;
import com.putraworks.graveatlas.data.model.DatasetExport;
import com.putraworks.graveatlas.data.model.GeoJSONExport;
import com.putraworks.graveatlas.data.model.JSONLDExport;
import com.putraworks.graveatlas.data.model.ExportManifest;
import com.putraworks.graveatlas.data.model.CurationTask;
import com.putraworks.graveatlas.data.model.CurationQueue;
import com.putraworks.graveatlas.data.model.RecordLock;
import com.putraworks.graveatlas.data.model.CurationStats;
import com.putraworks.graveatlas.data.model.Notification;
import com.putraworks.graveatlas.data.model.AlertRule;
import com.putraworks.graveatlas.data.model.AlertDigest;
import com.putraworks.graveatlas.data.model.GraveRecord;
import com.putraworks.graveatlas.data.model.GraveSubmission;
import com.putraworks.graveatlas.data.model.SubmissionResponse;
import com.putraworks.graveatlas.data.model.PersonRecord;
import com.putraworks.graveatlas.data.model.SearchResult;
import com.putraworks.graveatlas.data.model.GlobalSearchResponse;
import com.putraworks.graveatlas.data.model.CountryInfo;
import com.putraworks.graveatlas.data.model.RegionInfo;
import com.putraworks.graveatlas.data.model.CityInfo;
import com.putraworks.graveatlas.data.model.RelatedRecords;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import android.content.Context;
import com.putraworks.graveatlas.auth.SecureStorage;
import java.util.concurrent.TimeUnit;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.HttpUrl;
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
    private static Context sessionContext = null;

    /**
     * Set the application context for retrieving the session token.
     * Call this from Application.onCreate() or MainActivity.
     */
    public static void setSessionContext(Context context) {
        sessionContext = context.getApplicationContext();
        SecureStorage.init(context);
    }

    /**
     * Get the Authorization header value for authenticated requests.
     * Returns "Bearer <sessionToken>" or null if not logged in.
     */
    private String getAuthHeader() {
        if (sessionContext == null) return null;
        String token = SecureStorage.getSessionToken(sessionContext);
        if (token == null) return null;
        return "Bearer " + token;
    }

    /**
     * Check if the user is authenticated and can submit records.
     */
    public boolean isAuthenticated() {
        return getAuthHeader() != null;
    }

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
        getGraves(0, 100, callback);
    }

    public void getGraves(int offset, int limit, final ApiCallback<List<GraveRecord>> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves?offset=" + offset + "&limit=" + limit)
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
        getCemeteries(0, 100, callback);
    }

    public void getCemeteries(int offset, int limit, final ApiCallback<List<CemeteryRecord>> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries?offset=" + offset + "&limit=" + limit)
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
        submitGraveWithKey(submission, UUID.randomUUID().toString(), callback);
    }

    public void submitGraveWithKey(GraveSubmission submission, String idempotencyKey, final ApiCallback<SubmissionResponse> callback) {
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
            Request.Builder reqBuilder = new Request.Builder()
                    .url(baseUrl + "/api/graves")
                    .header("Idempotency-Key", idempotencyKey);
            String auth = getAuthHeader();
            if (auth != null) reqBuilder.header("Authorization", auth);
            Request request = reqBuilder.post(body).build();

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

    // ── Phase 4: Search ──

    public void search(String query, final ApiCallback<List<SearchResult>> callback) {
        search(query, "all", 0, 50, callback);
    }

    public void search(String query, String type, int offset, int limit, final ApiCallback<List<SearchResult>> callback) {
        HttpUrl.Builder urlBuilder = HttpUrl.parse(baseUrl + "/api/search").newBuilder();
        urlBuilder.addQueryParameter("q", query);
        if (type != null && !type.equals("all")) urlBuilder.addQueryParameter("type", type);
        urlBuilder.addQueryParameter("offset", String.valueOf(offset));
        urlBuilder.addQueryParameter("limit", String.valueOf(limit));

        Request request = new Request.Builder()
                .url(urlBuilder.build())
                .get()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(ApiErrorHandler.getMessageForException(e));
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                String body = response.body() != null ? response.body().string() : "{}";
                if (response.isSuccessful()) {
                    try {
                        JSONObject json = new JSONObject(body);
                        JSONArray resultsArray = json.optJSONArray("results");
                        List<SearchResult> results = SearchResult.fromJsonArray(resultsArray != null ? resultsArray : new JSONArray());
                        callback.onSuccess(results);
                    } catch (JSONException e) {
                        callback.onError("Failed to parse search results");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getMessageForCode(response.code()));
                }
            }
        });
    }

    // ── Phase 4: Person ──

    public void getPerson(String id, final ApiCallback<PersonRecord> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/people/" + id)
                .get()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(ApiErrorHandler.getMessageForException(e));
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                String body = response.body() != null ? response.body().string() : "{}";
                if (response.isSuccessful()) {
                    try {
                        JSONObject json = new JSONObject(body);
                        callback.onSuccess(PersonRecord.fromJson(json));
                    } catch (JSONException e) {
                        callback.onError("Failed to parse person record");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getMessageForCode(response.code()));
                }
            }
        });
    }


    // ── Phase 7A: Advanced Search & Global Discovery ──

    /**
     * Global search with categories, filters, sorting, and pagination.
     * Returns a GlobalSearchResponse with categorized results.
     */
    public void globalSearch(String query, String type, int page, int pageSize,
                             String sort, String country, String region, String city,
                             String birthYear, String deathYear,
                             final ApiCallback<GlobalSearchResponse> callback) {
        HttpUrl.Builder urlBuilder = HttpUrl.parse(baseUrl + "/api/search/global").newBuilder();
        if (query != null && !query.isEmpty()) urlBuilder.addQueryParameter("q", query);
        if (type != null && !type.equals("all")) urlBuilder.addQueryParameter("type", type);
        urlBuilder.addQueryParameter("page", String.valueOf(page));
        urlBuilder.addQueryParameter("pageSize", String.valueOf(pageSize));
        if (sort != null) urlBuilder.addQueryParameter("sort", sort);
        if (country != null && !country.isEmpty()) urlBuilder.addQueryParameter("country", country);
        if (region != null && !region.isEmpty()) urlBuilder.addQueryParameter("region", region);
        if (city != null && !city.isEmpty()) urlBuilder.addQueryParameter("city", city);
        if (birthYear != null && !birthYear.isEmpty()) urlBuilder.addQueryParameter("birthYear", birthYear);
        if (deathYear != null && !deathYear.isEmpty()) urlBuilder.addQueryParameter("deathYear", deathYear);

        Request request = new Request.Builder().url(urlBuilder.build()).get().build();
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
                        GlobalSearchResponse result = GlobalSearchResponse.fromJson(json);
                        callback.onSuccess(result);
                    } catch (JSONException e) {
                        callback.onError("Failed to parse search results");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getMessageForCode(response.code()));
                }
            }
        });
    }

    /**
     * Get country directory with cemetery and memorial counts.
     */
    public void getCountries(final ApiCallback<java.util.List<CountryInfo>> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/countries")
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
                        JSONArray arr = json.optJSONArray("countries");
                        java.util.List<CountryInfo> countries = new java.util.ArrayList<>();
                        if (arr != null) {
                            for (int i = 0; i < arr.length(); i++) {
                                countries.add(CountryInfo.fromJson(arr.getJSONObject(i)));
                            }
                        }
                        callback.onSuccess(countries);
                    } catch (JSONException e) {
                        callback.onError("Failed to parse country directory");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getMessageForCode(response.code()));
                }
            }
        });
    }

    /**
     * Get regions for a country.
     */
    public void getRegions(String country, final ApiCallback<java.util.List<RegionInfo>> callback) {
        HttpUrl.Builder urlBuilder = HttpUrl.parse(baseUrl + "/api/countries/" + safeEncode(country) + "/regions").newBuilder();
        Request request = new Request.Builder().url(urlBuilder.build()).get().build();
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
                        JSONArray arr = json.optJSONArray("regions");
                        java.util.List<RegionInfo> regions = new java.util.ArrayList<>();
                        if (arr != null) {
                            for (int i = 0; i < arr.length(); i++) {
                                regions.add(RegionInfo.fromJson(arr.getJSONObject(i)));
                            }
                        }
                        callback.onSuccess(regions);
                    } catch (Exception e) {
                        callback.onError("Failed to parse region directory");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getMessageForCode(response.code()));
                }
            }
        });
    }

    /**
     * Get cities for a country + region.
     */
    public void getCities(String country, String region, final ApiCallback<java.util.List<CityInfo>> callback) {
        String encodedCountry = safeEncode(country);
        String encodedRegion = safeEncode(region);
        Request request = new Request.Builder()
                .url(baseUrl + "/api/countries/" + encodedCountry + "/regions/" + encodedRegion + "/cities")
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
                        JSONArray arr = json.optJSONArray("cities");
                        java.util.List<CityInfo> cities = new java.util.ArrayList<>();
                        if (arr != null) {
                            for (int i = 0; i < arr.length(); i++) {
                                cities.add(CityInfo.fromJson(arr.getJSONObject(i)));
                            }
                        }
                        callback.onSuccess(cities);
                    } catch (Exception e) {
                        callback.onError("Failed to parse city directory");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getMessageForCode(response.code()));
                }
            }
        });
    }

    /**
     * Get related records for a cemetery or grave.
     */
    public void getRelatedRecords(String recordId, String recordType, final ApiCallback<RelatedRecords> callback) {
        HttpUrl.Builder urlBuilder = HttpUrl.parse(baseUrl + "/api/related/" + recordId).newBuilder();
        if (recordType != null) urlBuilder.addQueryParameter("type", recordType);
        Request request = new Request.Builder().url(urlBuilder.build()).get().build();
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
                        callback.onSuccess(RelatedRecords.fromJson(json));
                    } catch (Exception e) {
                        callback.onError("Failed to parse related records");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getMessageForCode(response.code()));
                }
            }
        });
    }

    // ── Phase 4: Cemetery Submission ──

    public void submitCemetery(CemeteryRecord cemetery, final ApiCallback<SubmissionResponse> callback) {
        String idempotencyKey = UUID.randomUUID().toString();
        try {
            JSONObject json = new JSONObject();
            if (cemetery.name != null) json.put("name", cemetery.name);
            if (cemetery.altNames != null) json.put("altNames", new JSONArray(cemetery.altNames));
            if (cemetery.localName != null) json.put("localName", cemetery.localName);
            if (cemetery.transliteration != null) json.put("transliteration", cemetery.transliteration);
            if (cemetery.countryCode != null) json.put("countryCode", cemetery.countryCode);
            if (cemetery.country != null) json.put("country", cemetery.country);
            if (cemetery.region != null) json.put("region", cemetery.region);
            if (cemetery.city != null) json.put("city", cemetery.city);
            if (cemetery.locality != null) json.put("locality", cemetery.locality);
            if (cemetery.address != null) json.put("address", cemetery.address);
            json.put("latitude", cemetery.latitude);
            json.put("longitude", cemetery.longitude);
            if (cemetery.timezone != null) json.put("timezone", cemetery.timezone);
            if (cemetery.cemeteryType != null) json.put("cemeteryType", cemetery.cemeteryType);
            if (cemetery.religiousAffiliation != null) json.put("religiousAffiliation", cemetery.religiousAffiliation);
            if (cemetery.operatingStatus != null) json.put("operatingStatus", cemetery.operatingStatus);
            if (cemetery.description != null) json.put("description", cemetery.description);
            if (cemetery.website != null) json.put("website", cemetery.website);

            RequestBody body = RequestBody.create(json.toString(), JSON);
            Request.Builder reqBuilder = new Request.Builder()
                    .url(baseUrl + "/api/cemeteries")
                    .header("Idempotency-Key", idempotencyKey);
            String auth = getAuthHeader();
            if (auth != null) reqBuilder.header("Authorization", auth);
            Request request = reqBuilder.post(body).build();

            client.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    callback.onError(ApiErrorHandler.getMessageForException(e));
                }

                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    String responseBody = response.body() != null ? response.body().string() : "{}";
                    try {
                        JSONObject json = new JSONObject(responseBody);
                        if (response.isSuccessful()) {
                            SubmissionResponse resp = new SubmissionResponse();
                            resp.success = json.optBoolean("success", false);
                            resp.submissionId = json.optString("submissionId", null);
                            resp.status = json.optString("status", "error");
                            callback.onSuccess(resp);
                        } else {
                            callback.onError(json.optString("error", "Submission failed"));
                        }
                    } catch (JSONException e) {
                        callback.onError("Failed to parse response");
                    }
                }
            });
        } catch (JSONException e) {
            callback.onError("Failed to build request");
        }
    }

    // ── Phase 4: Correction Submission ──

    public void submitCorrection(String targetId, String targetType,
                                 java.util.Map<String, String> corrections,
                                 String reason, final ApiCallback<SubmissionResponse> callback) {
        String idempotencyKey = UUID.randomUUID().toString();
        try {
            JSONObject json = new JSONObject();
            json.put("targetId", targetId);
            json.put("targetType", targetType);
            JSONObject correctionsJson = new JSONObject();
            for (java.util.Map.Entry<String, String> entry : corrections.entrySet()) {
                correctionsJson.put(entry.getKey(), entry.getValue());
            }
            json.put("corrections", correctionsJson);
            if (reason != null) json.put("reason", reason);

            RequestBody body = RequestBody.create(json.toString(), JSON);
            Request.Builder reqBuilder = new Request.Builder()
                    .url(baseUrl + "/api/corrections")
                    .header("Idempotency-Key", idempotencyKey);
            String auth = getAuthHeader();
            if (auth != null) reqBuilder.header("Authorization", auth);
            Request request = reqBuilder.post(body).build();

            client.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    callback.onError(ApiErrorHandler.getMessageForException(e));
                }

                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    String responseBody = response.body() != null ? response.body().string() : "{}";
                    try {
                        JSONObject json = new JSONObject(responseBody);
                        if (response.isSuccessful()) {
                            SubmissionResponse resp = new SubmissionResponse();
                            resp.success = json.optBoolean("success", false);
                            resp.submissionId = json.optString("correctionId", null);
                            resp.status = json.optString("status", "error");
                            callback.onSuccess(resp);
                        } else {
                            callback.onError(json.optString("error", "Correction failed"));
                        }
                    } catch (JSONException e) {
                        callback.onError("Failed to parse response");
                    }
                }
            });
        } catch (JSONException e) {
            callback.onError("Failed to build request");
        }
    }

    // ── Phase 4: Correction Status ──

    public void getCorrectionStatus(String correctionId, final ApiCallback<SubmissionStatus> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/corrections/" + correctionId)
                .get()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(ApiErrorHandler.getMessageForException(e));
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                String body = response.body() != null ? response.body().string() : "{}";
                try {
                    JSONObject json = new JSONObject(body);
                    if (response.isSuccessful() && json.optBoolean("success", false)) {
                        SubmissionStatus status = new SubmissionStatus();
                        status.success = true;
                        status.id = json.optString("id", null);
                        status.status = json.optString("status", "pending");
                        status.submittedAt = json.optString("submittedAt", null);
                        status.updatedAt = json.optString("updatedAt", null);
                        callback.onSuccess(status);
                    } else {
                        SubmissionStatus status = new SubmissionStatus();
                        status.success = false;
                        status.status = "not_found";
                        callback.onSuccess(status);
                    }
                } catch (JSONException e) {
                    callback.onError("Failed to parse response");
                }
            }
        });
    }

    private GraveRecord parseGrave(JSONObject obj) {
        return GraveRecord.fromJson(obj);
    }

    private CemeteryRecord parseCemetery(JSONObject obj) {
        return CemeteryRecord.fromJson(obj);
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

    private static String safeEncode(String value) {
        try {
            return java.net.URLEncoder.encode(value, "UTF-8");
        } catch (java.io.UnsupportedEncodingException e) {
            return value; // UTF-8 is always available on Android
        }
    }

    // ── Phase 16.23: AI Notification & Alert System ──

    /**
     * Create a notification.
     * POST /api/notifications
     */
    public void createNotification(String type, String severity, String title,
            String message, String recordId, String cemeteryId,
            final ApiCallback<Notification> callback) {
        JSONObject body = new JSONObject();
        try {
            body.put("type", type);
            if (severity != null) body.put("severity", severity);
            body.put("title", title);
            if (message != null) body.put("message", message);
            if (recordId != null) body.put("recordId", recordId);
            if (cemeteryId != null) body.put("cemeteryId", cemeteryId);
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/notifications")
                .post(rb)
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
                        JSONObject notif = obj.optJSONObject("notification");
                        if (notif != null) callback.onSuccess(Notification.fromJson(notif));
                        else callback.onError("Notification not found in response.");
                    } catch (Exception e) {
                        callback.onError("Failed to parse notification.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * List notifications with filters.
     * GET /api/notifications?type=&severity=&read=&recipient=&since=&limit=
     */
    public void listNotifications(String type, String severity, String read,
            int limit, final ApiCallback<java.util.List<Notification>> callback) {
        java.util.List<String> params = new java.util.ArrayList<>();
        if (type != null) params.add("type=" + type);
        if (severity != null) params.add("severity=" + severity);
        if (read != null) params.add("read=" + read);
        params.add("limit=" + limit);

        String url = baseUrl + "/api/notifications?" + String.join("&", params);
        Request request = new Request.Builder().url(url).get().build();

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
                        java.util.List<Notification> notifs = new java.util.ArrayList<>();
                        JSONArray arr = obj.optJSONArray("notifications");
                        if (arr != null) {
                            for (int i = 0; i < arr.length(); i++) {
                                JSONObject n = arr.optJSONObject(i);
                                if (n != null) notifs.add(Notification.fromJson(n));
                            }
                        }
                        callback.onSuccess(notifs);
                    } catch (Exception e) {
                        callback.onError("Failed to parse notifications.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get unread notifications.
     * GET /api/notifications/unread
     */
    public void getUnreadNotifications(final ApiCallback<java.util.List<Notification>> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/notifications/unread")
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
                        java.util.List<Notification> notifs = new java.util.ArrayList<>();
                        JSONArray arr = obj.optJSONArray("notifications");
                        if (arr != null) {
                            for (int i = 0; i < arr.length(); i++) {
                                JSONObject n = arr.optJSONObject(i);
                                if (n != null) notifs.add(Notification.fromJson(n));
                            }
                        }
                        callback.onSuccess(notifs);
                    } catch (Exception e) {
                        callback.onError("Failed to parse unread notifications.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Mark a notification as read.
     * POST /api/notifications/{id}/read
     */
    public void markNotificationRead(String notifId, final ApiCallback<JSONObject> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/notifications/" + notifId + "/read")
                .post(RequestBody.create("", null))
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
                        callback.onSuccess(new JSONObject(body));
                    } catch (Exception e) {
                        callback.onError("Failed to parse response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Mark all notifications as read.
     * POST /api/notifications/read-all
     */
    public void markAllNotificationsRead(final ApiCallback<JSONObject> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/notifications/read-all")
                .post(RequestBody.create("", null))
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
                        callback.onSuccess(new JSONObject(body));
                    } catch (Exception e) {
                        callback.onError("Failed to parse response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Dismiss a notification.
     * DELETE /api/notifications/dismiss?id=
     */
    public void dismissNotification(String notifId, final ApiCallback<JSONObject> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/notifications/dismiss?id=" + notifId)
                .delete()
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
                        callback.onSuccess(new JSONObject(body));
                    } catch (Exception e) {
                        callback.onError("Failed to parse response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Create an alert rule.
     * POST /api/alerts/rules
     */
    public void createAlertRule(String name, String condition, double threshold,
            String cemeteryId, String type, String severity, String message,
            final ApiCallback<AlertRule> callback) {
        JSONObject body = new JSONObject();
        try {
            body.put("name", name);
            body.put("condition", condition);
            body.put("threshold", threshold);
            if (cemeteryId != null) body.put("cemeteryId", cemeteryId);
            if (type != null) body.put("type", type);
            if (severity != null) body.put("severity", severity);
            if (message != null) body.put("message", message);
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/alerts/rules")
                .post(rb)
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
                        JSONObject rule = obj.optJSONObject("rule");
                        if (rule != null) callback.onSuccess(AlertRule.fromJson(rule));
                        else callback.onError("Rule not found in response.");
                    } catch (Exception e) {
                        callback.onError("Failed to parse alert rule.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * List alert rules.
     * GET /api/alerts/rules?enabled=&condition=&cemeteryId=
     */
    public void listAlertRules(final ApiCallback<java.util.List<AlertRule>> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/alerts/rules")
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
                        java.util.List<AlertRule> rules = new java.util.ArrayList<>();
                        JSONArray arr = obj.optJSONArray("rules");
                        if (arr != null) {
                            for (int i = 0; i < arr.length(); i++) {
                                JSONObject r = arr.optJSONObject(i);
                                if (r != null) rules.add(AlertRule.fromJson(r));
                            }
                        }
                        callback.onSuccess(rules);
                    } catch (Exception e) {
                        callback.onError("Failed to parse alert rules.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Delete an alert rule.
     * DELETE /api/alerts/rules/{id}
     */
    public void deleteAlertRule(String ruleId, final ApiCallback<JSONObject> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/alerts/rules/" + ruleId)
                .delete()
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
                        callback.onSuccess(new JSONObject(body));
                    } catch (Exception e) {
                        callback.onError("Failed to parse response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Check all alert rules and fire notifications.
     * POST /api/alerts/check
     */
    public void checkAlerts(final ApiCallback<JSONObject> callback) {
        JSONObject body = new JSONObject();
        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/alerts/check")
                .post(rb)
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
                        callback.onSuccess(new JSONObject(body));
                    } catch (Exception e) {
                        callback.onError("Failed to parse alert check result.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get alert digest for recent period.
     * GET /api/alerts/digest?hours=
     */
    public void getAlertDigest(int hours, final ApiCallback<AlertDigest> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/alerts/digest?hours=" + hours)
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
                        callback.onSuccess(AlertDigest.fromJson(new JSONObject(body)));
                    } catch (Exception e) {
                        callback.onError("Failed to parse alert digest.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.22: AI Collaborative Curation ──

    /**
     * Create a curation task.
     * POST /api/curation/tasks
     */
    public void createCurationTask(String type, String recordId, String cemeteryId,
            String title, String description, String priority, String assignedTo,
            String deadline, String createdBy, final ApiCallback<CurationTask> callback) {
        JSONObject body = new JSONObject();
        try {
            body.put("type", type);
            if (recordId != null) body.put("recordId", recordId);
            if (cemeteryId != null) body.put("cemeteryId", cemeteryId);
            body.put("title", title);
            if (description != null) body.put("description", description);
            if (priority != null) body.put("priority", priority);
            if (assignedTo != null) body.put("assignedTo", assignedTo);
            if (deadline != null) body.put("deadline", deadline);
            if (createdBy != null) body.put("createdBy", createdBy);
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/curation/tasks")
                .post(rb)
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
                        JSONObject task = obj.optJSONObject("task");
                        if (task != null) {
                            callback.onSuccess(CurationTask.fromJson(task));
                        } else {
                            callback.onError("Task not found in response.");
                        }
                    } catch (Exception e) {
                        callback.onError("Failed to parse curation task.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * List curation tasks with filters.
     * GET /api/curation/tasks?status=&type=&priority=&assignedTo=&cemeteryId=&limit=
     */
    public void listCurationTasks(String status, String type, String priority,
            String assignedTo, String cemeteryId, int limit,
            final ApiCallback<java.util.List<CurationTask>> callback) {
        java.util.List<String> params = new java.util.ArrayList<>();
        if (status != null) params.add("status=" + status);
        if (type != null) params.add("type=" + type);
        if (priority != null) params.add("priority=" + priority);
        if (assignedTo != null) params.add("assignedTo=" + assignedTo);
        if (cemeteryId != null) params.add("cemeteryId=" + cemeteryId);
        params.add("limit=" + limit);

        String url = baseUrl + "/api/curation/tasks?" + String.join("&", params);
        Request request = new Request.Builder().url(url).get().build();

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
                        java.util.List<CurationTask> tasks = new java.util.ArrayList<>();
                        JSONArray arr = obj.optJSONArray("tasks");
                        if (arr != null) {
                            for (int i = 0; i < arr.length(); i++) {
                                JSONObject t = arr.optJSONObject(i);
                                if (t != null) tasks.add(CurationTask.fromJson(t));
                            }
                        }
                        callback.onSuccess(tasks);
                    } catch (Exception e) {
                        callback.onError("Failed to parse curation tasks.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get a single curation task.
     * GET /api/curation/tasks/{id}
     */
    public void getCurationTask(String taskId, final ApiCallback<CurationTask> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/curation/tasks/" + taskId)
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
                        JSONObject task = obj.optJSONObject("task");
                        if (task != null) callback.onSuccess(CurationTask.fromJson(task));
                        else callback.onError("Task not found.");
                    } catch (Exception e) {
                        callback.onError("Failed to parse task.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Assign a task to an archivist.
     * POST /api/curation/tasks/{id}/assign
     */
    public void assignTask(String taskId, String assignedTo, String assignedBy,
                              final ApiCallback<JSONObject> callback) {
        JSONObject body = new JSONObject();
        try {
            body.put("assignedTo", assignedTo);
            if (assignedBy != null) body.put("assignedBy", assignedBy);
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/curation/tasks/" + taskId + "/assign")
                .post(rb)
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
                        callback.onSuccess(new JSONObject(body));
                    } catch (Exception e) {
                        callback.onError("Failed to parse response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Complete (submit) a task for review.
     * POST /api/curation/tasks/{id}/complete
     */
    public void completeTask(String taskId, String submittedBy, String completionNotes,
                                final ApiCallback<JSONObject> callback) {
        JSONObject body = new JSONObject();
        try {
            if (submittedBy != null) body.put("submittedBy", submittedBy);
            if (completionNotes != null) body.put("completionNotes", completionNotes);
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/curation/tasks/" + taskId + "/complete")
                .post(rb)
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
                        callback.onSuccess(new JSONObject(body));
                    } catch (Exception e) {
                        callback.onError("Failed to parse response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Review (approve/reject) a submitted task.
     * POST /api/curation/tasks/{id}/review
     */
    public void reviewTask(String taskId, String reviewedBy, boolean approved, String reviewNotes,
                              final ApiCallback<JSONObject> callback) {
        JSONObject body = new JSONObject();
        try {
            if (reviewedBy != null) body.put("reviewedBy", reviewedBy);
            body.put("approved", approved);
            if (reviewNotes != null) body.put("reviewNotes", reviewNotes);
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/curation/tasks/" + taskId + "/review")
                .post(rb)
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
                        callback.onSuccess(new JSONObject(body));
                    } catch (Exception e) {
                        callback.onError("Failed to parse response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get the curation review queue.
     * GET /api/curation/queue?limit=
     */
    public void getCurationQueue(int limit, final ApiCallback<CurationQueue> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/curation/queue?limit=" + limit)
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
                        callback.onSuccess(CurationQueue.fromJson(new JSONObject(body)));
                    } catch (Exception e) {
                        callback.onError("Failed to parse queue.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Lock a record for exclusive editing.
     * POST /api/curation/lock
     */
    public void lockRecord(String recordId, String lockedBy, int durationMinutes,
                              final ApiCallback<RecordLock> callback) {
        JSONObject body = new JSONObject();
        try {
            body.put("recordId", recordId);
            body.put("lockedBy", lockedBy);
            if (durationMinutes > 0) body.put("durationMinutes", durationMinutes);
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/curation/lock")
                .post(rb)
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
                        JSONObject lock = obj.optJSONObject("lock");
                        if (lock != null) callback.onSuccess(RecordLock.fromJson(lock));
                        else callback.onError("Lock not found in response.");
                    } catch (Exception e) {
                        callback.onError("Failed to parse lock.");
                    }
                } else if (response.code() == 409) {
                    callback.onError("Record is already locked by another user.");
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Unlock a record.
     * DELETE /api/curation/lock?recordId=&lockedBy=
     */
    public void unlockRecord(String recordId, String lockedBy,
                                final ApiCallback<JSONObject> callback) {
        String url = baseUrl + "/api/curation/lock?recordId=" + recordId + "&lockedBy=" + lockedBy;
        Request request = new Request.Builder()
                .url(url)
                .delete()
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
                        callback.onSuccess(new JSONObject(body));
                    } catch (Exception e) {
                        callback.onError("Failed to parse response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get curation statistics.
     * GET /api/curation/stats
     */
    public void getCurationStats(final ApiCallback<CurationStats> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/curation/stats")
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
                        JSONObject stats = obj.optJSONObject("stats");
                        if (stats != null) callback.onSuccess(CurationStats.fromJson(stats));
                        else callback.onSuccess(new CurationStats());
                    } catch (Exception e) {
                        callback.onError("Failed to parse curation stats.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.21: AI Data Export & Archival ──

    /**
     * Export records as CSV-ready JSON dataset.
     * GET /api/export/dataset?cemeteryId=&includeProvenance=&includeConfidence=&includeSources=&limit=
     */
    public void exportDataset(String cemeteryId, boolean includeProvenance,
                                  boolean includeConfidence, boolean includeSources, int limit,
                                  final ApiCallback<DatasetExport> callback) {
        String url = baseUrl + "/api/export/dataset?limit=" + limit;
        if (cemeteryId != null) url += "&cemeteryId=" + cemeteryId;
        if (includeProvenance) url += "&includeProvenance=true";
        if (includeConfidence) url += "&includeConfidence=true";
        if (includeSources) url += "&includeSources=true";

        Request request = new Request.Builder()
                .url(url)
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
                        callback.onSuccess(DatasetExport.fromJson(new JSONObject(body)));
                    } catch (Exception e) {
                        callback.onError("Failed to parse dataset export.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Export records as GeoJSON FeatureCollection.
     * GET /api/export/geojson?cemeteryId=&limit=
     */
    public void exportGeoJSON(String cemeteryId, int limit,
                                 final ApiCallback<GeoJSONExport> callback) {
        String url = baseUrl + "/api/export/geojson?limit=" + limit;
        if (cemeteryId != null) url += "&cemeteryId=" + cemeteryId;

        Request request = new Request.Builder()
                .url(url)
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
                        callback.onSuccess(GeoJSONExport.fromJson(new JSONObject(body)));
                    } catch (Exception e) {
                        callback.onError("Failed to parse GeoJSON export.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Export records as JSON-LD with provenance and confidence context.
     * GET /api/export/jsonld?cemeteryId=&recordId=&limit=
     */
    public void exportJSONLD(String cemeteryId, String recordId, int limit,
                                final ApiCallback<JSONLDExport> callback) {
        String url = baseUrl + "/api/export/jsonld?limit=" + limit;
        if (cemeteryId != null) url += "&cemeteryId=" + cemeteryId;
        if (recordId != null) url += "&recordId=" + recordId;

        Request request = new Request.Builder()
                .url(url)
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
                        callback.onSuccess(JSONLDExport.fromJson(new JSONObject(body)));
                    } catch (Exception e) {
                        callback.onError("Failed to parse JSON-LD export.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get export manifest describing all available data and formats.
     * GET /api/export/manifest
     */
    public void getExportManifest(final ApiCallback<ExportManifest> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/export/manifest")
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
                        callback.onSuccess(ExportManifest.fromJson(new JSONObject(body)));
                    } catch (Exception e) {
                        callback.onError("Failed to parse export manifest.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Batch generate multiple exports.
     * POST /api/export/batch
     */
    public void exportBatch(JSONArray exports, final ApiCallback<JSONObject> callback) {
        JSONObject body = new JSONObject();
        try { body.put("exports", exports); } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/export/batch")
                .post(rb)
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
                        callback.onSuccess(new JSONObject(body));
                    } catch (Exception e) {
                        callback.onError("Failed to parse batch export.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.20: AI Data Provenance Chain ──

    /**
     * Get the complete provenance chain for a record.
     * GET /api/graves/{id}/provenance
     */
    public void getRecordProvenance(String recordId,
                                       final ApiCallback<ProvenanceChain> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves/" + recordId + "/provenance")
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
                        JSONObject prov = obj.optJSONObject("provenance");
                        if (prov != null) {
                            callback.onSuccess(ProvenanceChain.fromJson(prov));
                        } else {
                            callback.onError("Provenance not found in response.");
                        }
                    } catch (Exception e) {
                        callback.onError("Failed to parse provenance chain.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Add a manual provenance entry to a record.
     * POST /api/graves/{id}/provenance/add
     */
    public void addProvenanceEntry(String recordId, String action, String actor,
                                      String actorRole, String description,
                                      java.util.List<String> fields,
                                      final ApiCallback<JSONObject> callback) {
        JSONObject body = new JSONObject();
        try {
            body.put("action", action);
            body.put("actor", actor);
            body.put("actorRole", actorRole);
            body.put("description", description);
            if (fields != null) {
                JSONArray arr = new JSONArray();
                for (String f : fields) arr.put(f);
                body.put("fields", arr);
            }
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves/" + recordId + "/provenance/add")
                .post(rb)
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
                        callback.onSuccess(new JSONObject(body));
                    } catch (Exception e) {
                        callback.onError("Failed to parse response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Search provenance entries across all records.
     * GET /api/provenance/search?actor=&action=&actorRole=&recordId=&startDate=&endDate=&limit=
     */
    public void searchProvenance(String actor, String action, String actorRole,
                                    String recordId, String startDate, String endDate, int limit,
                                    final ApiCallback<ProvenanceSearch> callback) {
        java.util.List<String> params = new java.util.ArrayList<>();
        if (actor != null) params.add("actor=" + actor);
        if (action != null) params.add("action=" + action);
        if (actorRole != null) params.add("actorRole=" + actorRole);
        if (recordId != null) params.add("recordId=" + recordId);
        if (startDate != null) params.add("startDate=" + startDate);
        if (endDate != null) params.add("endDate=" + endDate);
        params.add("limit=" + limit);

        String url = baseUrl + "/api/provenance/search?" + String.join("&", params);

        Request request = new Request.Builder()
                .url(url)
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
                        callback.onSuccess(ProvenanceSearch.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse provenance search results.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get global provenance timeline.
     * GET /api/provenance/timeline?startDate=&endDate=&limit=
     */
    public void getProvenanceTimeline(String startDate, String endDate, int limit,
                                         final ApiCallback<ProvenanceTimeline> callback) {
        String url = baseUrl + "/api/provenance/timeline?limit=" + limit;
        if (startDate != null) url += "&startDate=" + startDate;
        if (endDate != null) url += "&endDate=" + endDate;

        Request request = new Request.Builder()
                .url(url)
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
                        callback.onSuccess(ProvenanceTimeline.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse provenance timeline.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Export provenance data (CSV-ready JSON).
     * GET /api/provenance/export?recordId=
     */
    public void exportProvenance(String recordId,
                                   final ApiCallback<JSONObject> callback) {
        String url = baseUrl + "/api/provenance/export";
        if (recordId != null) url += "?recordId=" + recordId;

        Request request = new Request.Builder()
                .url(url)
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
                        callback.onSuccess(new JSONObject(body));
                    } catch (Exception e) {
                        callback.onError("Failed to parse export.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.19: AI Confidence Scoring ──

    /**
     * Get confidence score for a single record.
     * GET /api/graves/{id}/confidence
     */
    public void getRecordConfidence(String recordId,
                                       final ApiCallback<ConfidenceScore> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves/" + recordId + "/confidence")
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
                        JSONObject conf = obj.optJSONObject("confidence");
                        if (conf != null) {
                            callback.onSuccess(ConfidenceScore.fromJson(conf));
                        } else {
                            callback.onError("Confidence not found in response.");
                        }
                    } catch (Exception e) {
                        callback.onError("Failed to parse confidence score.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get confidence scores for all records in a cemetery.
     * GET /api/cemeteries/{id}/confidence
     */
    public void getCemeteryConfidence(String cemeteryId,
                                         final ApiCallback<CemeteryConfidence> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/confidence")
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
                        callback.onSuccess(CemeteryConfidence.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse cemetery confidence.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Batch compute confidence scores for up to 50 records.
     * POST /api/confidence/batch
     */
    public void batchConfidence(java.util.List<String> recordIds,
                                   final ApiCallback<java.util.List<ConfidenceScore>> callback) {
        JSONObject body = new JSONObject();
        try {
            JSONArray arr = new JSONArray();
            for (String id : recordIds) arr.put(id);
            body.put("recordIds", arr);
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/confidence/batch")
                .post(rb)
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
                        java.util.List<ConfidenceScore> results = new java.util.ArrayList<>();
                        JSONArray arr = obj.optJSONArray("results");
                        if (arr != null) {
                            for (int i = 0; i < arr.length(); i++) {
                                JSONObject r = arr.optJSONObject(i);
                                if (r != null && r.has("score")) {
                                    // Wrap in confidence object for parsing
                                    JSONObject confObj = new JSONObject();
                                    confObj.put("score", r.optInt("score"));
                                    confObj.put("tier", r.optString("tier", "unverified"));
                                    results.add(ConfidenceScore.fromJson(confObj));
                                }
                            }
                        }
                        callback.onSuccess(results);
                    } catch (Exception e) {
                        callback.onError("Failed to parse batch confidence results.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get global confidence leaderboard.
     * GET /api/confidence/leaderboard?limit=50&tier=platinum
     */
    public void getConfidenceLeaderboard(int limit, String tierFilter,
                                            final ApiCallback<ConfidenceLeaderboard> callback) {
        String url = baseUrl + "/api/confidence/leaderboard?limit=" + limit;
        if (tierFilter != null && !tierFilter.isEmpty()) {
            url += "&tier=" + tierFilter;
        }

        Request request = new Request.Builder()
                .url(url)
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
                        callback.onSuccess(ConfidenceLeaderboard.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse confidence leaderboard.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.18: AI Source Verification ──

    /**
     * Verify all source references for a single record.
     * POST /api/graves/{id}/sources/verify
     */
    public void verifyRecordSources(String recordId,
                                       final ApiCallback<RecordSourceVerification> callback) {
        RequestBody rb = RequestBody.create("{}", MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves/" + recordId + "/sources/verify")
                .post(rb)
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
                        JSONObject ver = obj.optJSONObject("verification");
                        if (ver != null) {
                            callback.onSuccess(RecordSourceVerification.fromJson(ver));
                        } else {
                            callback.onError("Verification not found in response.");
                        }
                    } catch (Exception e) {
                        callback.onError("Failed to parse source verification.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Verify source references for all records in a cemetery.
     * POST /api/cemeteries/{id}/sources/verify
     */
    public void verifyCemeterySources(String cemeteryId,
                                         final ApiCallback<CemeterySourceVerification> callback) {
        RequestBody rb = RequestBody.create("{}", MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/sources/verify")
                .post(rb)
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
                        callback.onSuccess(CemeterySourceVerification.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse cemetery source verification.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Batch verify sources across multiple records.
     * POST /api/sources/verify/batch
     */
    public void batchVerifySources(java.util.List<String> recordIds,
                                      final ApiCallback<java.util.List<RecordSourceVerification>> callback) {
        JSONObject body = new JSONObject();
        try {
            JSONArray arr = new JSONArray();
            for (String id : recordIds) arr.put(id);
            body.put("recordIds", arr);
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/sources/verify/batch")
                .post(rb)
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
                        java.util.List<RecordSourceVerification> results = new java.util.ArrayList<>();
                        JSONArray arr = obj.optJSONArray("results");
                        if (arr != null) {
                            for (int i = 0; i < arr.length(); i++) {
                                JSONObject r = arr.optJSONObject(i);
                                if (r != null && r.has("summary")) {
                                    results.add(RecordSourceVerification.fromJson(r));
                                }
                            }
                        }
                        callback.onSuccess(results);
                    } catch (Exception e) {
                        callback.onError("Failed to parse batch verification results.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get global source verification status.
     * GET /api/sources/verify/status
     */
    public void getSourceVerificationStatus(final ApiCallback<SourceVerificationStatus> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/sources/verify/status")
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
                        callback.onSuccess(SourceVerificationStatus.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse verification status.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.17: AI Merge Resolution ──

    /**
     * Preview a merge between two records.
     * POST /api/graves/{idA}/merge/preview/{idB}
     */
    public void previewMerge(String recordIdA, String recordIdB,
                               final ApiCallback<MergeProposal> callback) {
        RequestBody rb = RequestBody.create("{}", MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves/" + recordIdA + "/merge/preview/" + recordIdB)
                .post(rb)
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
                        callback.onSuccess(MergeProposal.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse merge proposal.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Apply a merge between two records.
     * POST /api/graves/{idA}/merge/apply/{idB}
     * Body: { fieldOverrides: { fieldName: value }, mergedBy: string }
     */
    public void applyMerge(String recordIdA, String recordIdB,
                             java.util.Map<String, Object> fieldOverrides, String mergedBy,
                             final ApiCallback<MergeResult> callback) {
        JSONObject body = new JSONObject();
        try {
            if (fieldOverrides != null && !fieldOverrides.isEmpty()) {
                JSONObject overrides = new JSONObject();
                for (java.util.Map.Entry<String, Object> entry : fieldOverrides.entrySet()) {
                    overrides.put(entry.getKey(), entry.getValue());
                }
                body.put("fieldOverrides", overrides);
            }
            if (mergedBy != null) body.put("mergedBy", mergedBy);
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves/" + recordIdA + "/merge/apply/" + recordIdB)
                .post(rb)
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
                        callback.onSuccess(MergeResult.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse merge result.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get merge suggestions for a cemetery.
     * GET /api/cemeteries/{id}/merge/suggestions
     */
    public void getMergeSuggestions(String cemeteryId,
                                       final ApiCallback<java.util.List<MergeSuggestion>> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/merge/suggestions")
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
                        callback.onSuccess(MergeSuggestion.fromJsonArray(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse merge suggestions.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get global merge history.
     * GET /api/merge/history
     */
    public void getMergeHistory(final ApiCallback<MergeHistory> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/merge/history")
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
                        callback.onSuccess(MergeHistory.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse merge history.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.16: AI Watchlist & Monitoring ──

    /**
     * Get all watchlist items.
     * GET /api/watchlist
     */
    public void getWatchlist(final ApiCallback<java.util.List<WatchlistItem>> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/watchlist")
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
                        java.util.List<WatchlistItem> items = new java.util.ArrayList<>();
                        JSONArray arr = obj.optJSONArray("items");
                        if (arr != null) {
                            for (int i = 0; i < arr.length(); i++) {
                                JSONObject item = arr.optJSONObject(i);
                                if (item != null) items.add(WatchlistItem.fromJson(item));
                            }
                        }
                        callback.onSuccess(items);
                    } catch (Exception e) {
                        callback.onError("Failed to parse watchlist.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Add a cemetery or record to the watchlist.
     * POST /api/watchlist
     */
    public void addToWatchlist(String targetType, String targetId,
                                 String[] watchFor, String label,
                                 final ApiCallback<WatchlistItem> callback) {
        JSONObject body = new JSONObject();
        try {
            body.put("targetType", targetType);
            body.put("targetId", targetId);
            if (label != null) body.put("label", label);
            if (watchFor != null) {
                JSONArray arr = new JSONArray();
                for (String w : watchFor) arr.put(w);
                body.put("watchFor", arr);
            }
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/watchlist")
                .post(rb)
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
                        JSONObject item = obj.optJSONObject("item");
                        if (item != null) {
                            callback.onSuccess(WatchlistItem.fromJson(item));
                        } else {
                            callback.onError("Item not found in response.");
                        }
                    } catch (Exception e) {
                        callback.onError("Failed to parse watchlist item.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Remove an item from the watchlist.
     * DELETE /api/watchlist/{itemId}
     */
    public void removeFromWatchlist(String itemId,
                                      final ApiCallback<Boolean> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/watchlist/" + itemId)
                .delete()
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(ApiErrorHandler.getNetworkMessage(e.getMessage()));
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                callback.onSuccess(response.isSuccessful());
            }
        });
    }

    /**
     * Check all watchlist items for changes and get alerts.
     * POST /api/watchlist/check
     */
    public void checkWatchlist(final ApiCallback<WatchlistCheckResult> callback) {
        RequestBody rb = RequestBody.create("{}", MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/watchlist/check")
                .post(rb)
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
                        callback.onSuccess(WatchlistCheckResult.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse watchlist check result.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get watchlist status summary.
     * GET /api/watchlist/status
     */
    public void getWatchlistStatus(final ApiCallback<WatchlistStatus> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/watchlist/status")
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
                        callback.onSuccess(WatchlistStatus.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse watchlist status.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.15: AI Export & Reporting ──

    /**
     * Get comprehensive quality report for a cemetery.
     * GET /api/cemeteries/{id}/report
     */
    public void getCemeteryReport(String cemeteryId,
                                    final ApiCallback<CemeteryReport> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/report")
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
                        JSONObject reportObj = obj.optJSONObject("report");
                        if (reportObj != null) {
                            callback.onSuccess(CemeteryReport.fromJson(reportObj));
                        } else {
                            callback.onError("Report not found in response.");
                        }
                    } catch (Exception e) {
                        callback.onError("Failed to parse cemetery report.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get lightweight report summary for a cemetery.
     * GET /api/cemeteries/{id}/report/summary
     */
    public void getCemeteryReportSummary(String cemeteryId,
                                          final ApiCallback<CemeteryReportSummary> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/report/summary")
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
                        callback.onSuccess(CemeteryReportSummary.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse report summary.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get global quality report across all cemeteries.
     * GET /api/reports/global
     */
    public void getGlobalReport(final ApiCallback<GlobalReport> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/reports/global")
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
                        JSONObject reportObj = obj.optJSONObject("report");
                        if (reportObj != null) {
                            callback.onSuccess(GlobalReport.fromJson(reportObj));
                        } else {
                            callback.onError("Report not found in response.");
                        }
                    } catch (Exception e) {
                        callback.onError("Failed to parse global report.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.14: AI Batch Operations ──

    /**
     * Preview a full cleanup pass for a cemetery (no changes applied).
     * GET /api/cemeteries/{id}/cleanup/preview
     */
    public void previewCemeteryCleanup(String cemeteryId,
                                          final ApiCallback<CleanupResult> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/cleanup/preview")
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
                        callback.onSuccess(CleanupResult.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse cleanup preview.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Run a full cleanup pass for a cemetery.
     * POST /api/cemeteries/{id}/cleanup
     * Body: { dryRun: boolean, fixTypes: string[] }
     */
    public void runCemeteryCleanup(String cemeteryId, boolean dryRun,
                                     String[] fixTypes,
                                     final ApiCallback<CleanupResult> callback) {
        JSONObject body = new JSONObject();
        try {
            body.put("dryRun", dryRun);
            if (fixTypes != null) {
                JSONArray arr = new JSONArray();
                for (String t : fixTypes) arr.put(t);
                body.put("fixTypes", arr);
            }
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/cleanup")
                .post(rb)
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
                        String respBody = response.body() != null ? response.body().string() : "{}";
                        JSONObject obj = new JSONObject(respBody);
                        callback.onSuccess(CleanupResult.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse cleanup result.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Run global cleanup preview across all cemeteries.
     * POST /api/cleanup/global
     */
    public void runGlobalCleanup(final ApiCallback<GlobalCleanupResult> callback) {
        RequestBody rb = RequestBody.create("{}", MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cleanup/global")
                .post(rb)
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
                        callback.onSuccess(GlobalCleanupResult.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse global cleanup result.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.13: AI Data Quality Auto-Fix ──

    /**
     * Preview auto-fixes for a cemetery (no changes applied).
     * GET /api/cemeteries/{id}/autofix/preview
     */
    public void previewCemeteryAutoFix(String cemeteryId,
                                        final ApiCallback<CemeteryAutoFixPreview> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/autofix/preview")
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
                        callback.onSuccess(CemeteryAutoFixPreview.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse auto-fix preview.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Apply auto-fixes to a cemetery.
     * POST /api/cemeteries/{id}/autofix
     * Body: { dryRun: boolean, fixTypes: string[] }
     */
    public void applyCemeteryAutoFix(String cemeteryId, boolean dryRun,
                                      String[] fixTypes,
                                      final ApiCallback<CemeteryAutoFixResult> callback) {
        JSONObject body = new JSONObject();
        try {
            body.put("dryRun", dryRun);
            if (fixTypes != null) {
                JSONArray arr = new JSONArray();
                for (String t : fixTypes) arr.put(t);
                body.put("fixTypes", arr);
            }
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/autofix")
                .post(rb)
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
                        String respBody = response.body() != null ? response.body().string() : "{}";
                        JSONObject obj = new JSONObject(respBody);
                        callback.onSuccess(CemeteryAutoFixResult.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse auto-fix result.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get auto-fix proposals for a single record.
     * POST /api/graves/{id}/autofix
     */
    public void getRecordAutoFixProposals(String recordId,
                                            final ApiCallback<RecordAutoFixResult> callback) {
        RequestBody rb = RequestBody.create("{}", MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves/" + recordId + "/autofix")
                .post(rb)
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
                        callback.onSuccess(RecordAutoFixResult.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse record auto-fix proposals.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Apply auto-fixes to a single record.
     * POST /api/graves/{id}/autofix/apply
     * Body: { fixTypes: string[] } — optional filter
     */
    public void applyRecordAutoFix(String recordId, String[] fixTypes,
                                     final ApiCallback<RecordAutoFixResult> callback) {
        JSONObject body = new JSONObject();
        try {
            if (fixTypes != null) {
                JSONArray arr = new JSONArray();
                for (String t : fixTypes) arr.put(t);
                body.put("fixTypes", arr);
            }
        } catch (Exception e) { /* ignore */ }

        RequestBody rb = RequestBody.create(body.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves/" + recordId + "/autofix/apply")
                .post(rb)
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
                        String respBody = response.body() != null ? response.body().string() : "{}";
                        JSONObject obj = new JSONObject(respBody);
                        callback.onSuccess(RecordAutoFixResult.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse auto-fix apply result.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.12: AI Smart Recommendations ──

    /**
     * Get smart recommendations for a cemetery.
     * GET /api/cemeteries/{id}/recommendations
     */
    public void getCemeteryRecommendations(String cemeteryId,
                                            final ApiCallback<CemeteryRecommendations> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/recommendations")
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
                        callback.onSuccess(CemeteryRecommendations.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse recommendations response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get global recommendations across all cemeteries.
     * GET /api/recommendations/global
     */
    public void getGlobalRecommendations(final ApiCallback<GlobalRecommendations> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/recommendations/global")
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
                        callback.onSuccess(GlobalRecommendations.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse global recommendations response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.11: AI Cemetery Health Dashboard ──

    /**
     * Get composite health score for a cemetery.
     * GET /api/cemeteries/{id}/health
     */
    public void getCemeteryHealth(String cemeteryId, final ApiCallback<CemeteryHealth> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/health")
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
                        callback.onSuccess(CemeteryHealth.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse cemetery health response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get global health overview across all cemeteries.
     * GET /api/health/overview
     */
    public void getGlobalHealthOverview(final ApiCallback<GlobalHealthOverview> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/health/overview")
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
                        callback.onSuccess(GlobalHealthOverview.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse global health overview.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.10: AI Anomaly Detection ──

    /**
     * Get anomaly report for an entire cemetery.
     * GET /api/cemeteries/{id}/anomalies
     */
    public void getCemeteryAnomalies(String cemeteryId, final ApiCallback<AnomalyReport> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/anomalies")
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
                        callback.onSuccess(AnomalyReport.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse anomaly report.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Check a single record for anomalies.
     * GET /api/graves/{id}/anomaly-check
     */
    public void checkRecordAnomalies(String recordId, final ApiCallback<RecordAnomalyCheck> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves/" + recordId + "/anomaly-check")
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
                        callback.onSuccess(RecordAnomalyCheck.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse anomaly check result.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.9: AI Import Quality Scoring ──

    /**
     * Score a batch of import records for quality.
     * POST /api/import/score
     */
    public void scoreImportBatch(org.json.JSONArray records, String sourceName,
                                  final ApiCallback<ImportQualityScore> callback) {
        org.json.JSONObject body = new org.json.JSONObject();
        try {
            body.put("records", records);
            body.put("sourceName", sourceName != null ? sourceName : "Unknown source");
        } catch (Exception e) {
            callback.onError("Failed to build request body");
            return;
        }

        RequestBody requestBody = RequestBody.create(body.toString(), JSON);
        Request request = new Request.Builder()
                .url(baseUrl + "/api/import/score")
                .post(requestBody)
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
                        String respBody = response.body() != null ? response.body().string() : "{}";
                        JSONObject obj = new JSONObject(respBody);
                        callback.onSuccess(ImportQualityScore.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse quality score response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Generate a full batch report for import records.
     * POST /api/import/batch-report
     */
    public void getImportBatchReport(org.json.JSONArray records, String sourceName, String license,
                                     final ApiCallback<ImportBatchReport> callback) {
        org.json.JSONObject body = new org.json.JSONObject();
        try {
            body.put("records", records);
            body.put("sourceName", sourceName != null ? sourceName : "Unknown source");
            body.put("license", license != null ? license : "Not specified");
        } catch (Exception e) {
            callback.onError("Failed to build request body");
            return;
        }

        RequestBody requestBody = RequestBody.create(body.toString(), JSON);
        Request request = new Request.Builder()
                .url(baseUrl + "/api/import/batch-report")
                .post(requestBody)
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
                        String respBody = response.body() != null ? response.body().string() : "{}";
                        JSONObject obj = new JSONObject(respBody);
                        callback.onSuccess(ImportBatchReport.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse batch report response.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.8: AI Record Enrichment ──

    /**
     * Get AI enrichment suggestions for a grave record.
     * GET /api/graves/{id}/enrich
     */
    public void getRecordEnrichment(String recordId, final ApiCallback<EnrichmentResult> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/graves/" + recordId + "/enrich")
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
                        callback.onSuccess(EnrichmentResult.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse enrichment suggestions.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get family connection network for a cemetery.
     * GET /api/cemeteries/{id}/connections
     */
    public void getCemeteryConnections(String cemeteryId, final ApiCallback<ConnectionNetwork> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/connections")
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
                        callback.onSuccess(ConnectionNetwork.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse connection network.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    // ── Phase 16.7: Cemetery Intelligence ──

    /**
     * Get cemetery statistics.
     * GET /api/cemeteries/{id}/stats
     */
    public void getCemeteryStats(String cemeteryId, final ApiCallback<CemeteryStats> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/stats")
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
                        callback.onSuccess(CemeteryStats.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse cemetery stats.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Get auto-generated cemetery summary.
     * GET /api/cemeteries/{id}/summary
     */
    public void getCemeterySummary(String cemeteryId, final ApiCallback<String> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/summary")
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
                        String summary = obj.optString("summary", "No summary available.");
                        callback.onSuccess(summary);
                    } catch (Exception e) {
                        callback.onError("Failed to parse cemetery summary.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    /**
     * Detect potential duplicate records in a cemetery.
     * GET /api/cemeteries/{id}/duplicates
     */
    public void getCemeteryDuplicates(String cemeteryId, final ApiCallback<DuplicateResult> callback) {
        Request request = new Request.Builder()
                .url(baseUrl + "/api/cemeteries/" + cemeteryId + "/duplicates")
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
                        callback.onSuccess(DuplicateResult.fromJson(obj));
                    } catch (Exception e) {
                        callback.onError("Failed to parse duplicate results.");
                    }
                } else {
                    callback.onError(ApiErrorHandler.getHttpMessage(response.code()));
                }
            }
        });
    }

    public interface ApiCallback<T> {
        void onSuccess(T result);
        void onError(String error);
    }
}
