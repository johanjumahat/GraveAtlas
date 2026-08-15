package com.putraworks.graveatlas.data.api;

import android.content.Context;
import com.putraworks.graveatlas.data.model.ExternalRecord;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * External Source Client (Part 27 — GUI Integration)
 *
 * Android-side API client for querying external cemetery/burial sources
 * through the GraveAtlas API gateway.
 */
public class ExternalSourceClient {

    private final ApiClient apiClient;
    private final OkHttpClient httpClient;

    public ExternalSourceClient() {
        this.apiClient = new ApiClient();
        this.httpClient = new OkHttpClient();
    }

    public ExternalSourceClient(Context context) {
        this.apiClient = new ApiClient();
        this.httpClient = new OkHttpClient();
    }

    /**
     * Get the list of implemented external sources.
     */
    public void getSources(final ApiClient.ApiCallback<List<SourceInfo>> callback) {
        Request request = new Request.Builder()
            .url(apiClient.getBaseUrl() + "/api/external/sources")
            .get()
            .build();

        httpClient.newCall(request).enqueue(new okhttp3.Callback() {
            @Override
            public void onFailure(Call call, java.io.IOException e) {
                callback.onError("Network error: " + e.getMessage());
            }

            @Override
            public void onResponse(Call call, Response response) throws java.io.IOException {
                if (!response.isSuccessful()) {
                    callback.onError("HTTP " + response.code());
                    return;
                }
                try {
                    JSONObject json = new JSONObject(response.body().string());
                    JSONArray sourcesArr = json.optJSONArray("sources");
                    List<SourceInfo> sources = new ArrayList<>();
                    if (sourcesArr != null) {
                        for (int i = 0; i < sourcesArr.length(); i++) {
                            JSONObject s = sourcesArr.getJSONObject(i);
                            SourceInfo info = new SourceInfo();
                            info.sourceId = s.optString("sourceId");
                            info.sourceName = s.optString("sourceName");
                            info.integrationStatus = s.optString("integrationStatus");
                            info.licensing = s.optString("licensing");
                            sources.add(info);
                        }
                    }
                    callback.onSuccess(sources);
                } catch (Exception e) {
                    callback.onError("Parse error: " + e.getMessage());
                }
            }
        });
    }

    /**
     * Query a specific external source.
     */
    public void querySource(String sourceId, JSONObject query, final ApiClient.ApiCallback<List<ExternalRecord>> callback) {
        try {
            JSONObject body = new JSONObject();
            body.put("sourceId", sourceId);
            body.put("query", query != null ? query : new JSONObject());

            Request request = new Request.Builder()
                .url(apiClient.getBaseUrl() + "/api/external/query")
                .post(RequestBody.create(body.toString(), MediaType.parse("application/json")))
                .build();

            httpClient.newCall(request).enqueue(new okhttp3.Callback() {
                @Override
                public void onFailure(Call call, java.io.IOException e) {
                    callback.onError("Network error: " + e.getMessage());
                }

                @Override
                public void onResponse(Call call, Response response) throws java.io.IOException {
                    if (!response.isSuccessful()) {
                        callback.onError("HTTP " + response.code());
                        return;
                    }
                    try {
                        JSONObject json = new JSONObject(response.body().string());
                        JSONArray recordsArr = json.optJSONArray("records");
                        List<ExternalRecord> records = new ArrayList<>();
                        if (recordsArr != null) {
                            for (int i = 0; i < recordsArr.length(); i++) {
                                records.add(ExternalRecord.fromJson(recordsArr.getJSONObject(i)));
                            }
                        }
                        callback.onSuccess(records);
                    } catch (Exception e) {
                        callback.onError("Parse error: " + e.getMessage());
                    }
                }
            });
        } catch (Exception e) {
            callback.onError("Request error: " + e.getMessage());
        }
    }

    /**
     * Query all implemented external sources.
     */
    public void queryAllSources(JSONObject query, final ApiClient.ApiCallback<ExternalSearchResult> callback) {
        try {
            JSONObject body = new JSONObject();
            body.put("query", query != null ? query : new JSONObject());

            Request request = new Request.Builder()
                .url(apiClient.getBaseUrl() + "/api/external/query-all")
                .post(RequestBody.create(body.toString(), MediaType.parse("application/json")))
                .build();

            httpClient.newCall(request).enqueue(new okhttp3.Callback() {
                @Override
                public void onFailure(Call call, java.io.IOException e) {
                    callback.onError("Network error: " + e.getMessage());
                }

                @Override
                public void onResponse(Call call, Response response) throws java.io.IOException {
                    if (!response.isSuccessful()) {
                        callback.onError("HTTP " + response.code());
                        return;
                    }
                    try {
                        JSONObject json = new JSONObject(response.body().string());
                        JSONArray resultsArr = json.optJSONArray("results");
                        ExternalSearchResult result = new ExternalSearchResult();
                        if (resultsArr != null) {
                            for (int i = 0; i < resultsArr.length(); i++) {
                                JSONObject srcResult = resultsArr.getJSONObject(i);
                                ExternalSourceResult esr = new ExternalSourceResult();
                                esr.sourceId = srcResult.optString("sourceId");
                                esr.sourceName = srcResult.optString("sourceName");
                                esr.status = srcResult.optString("status", "ok");
                                esr.fromCache = srcResult.optBoolean("fromCache", false);
                                esr.reason = srcResult.optString("reason", null);
                                JSONArray recordsArr = srcResult.optJSONArray("records");
                                if (recordsArr != null) {
                                    for (int j = 0; j < recordsArr.length(); j++) {
                                        esr.records.add(ExternalRecord.fromJson(recordsArr.getJSONObject(j)));
                                    }
                                }
                                result.results.add(esr);
                            }
                        }
                        callback.onSuccess(result);
                    } catch (Exception e) {
                        callback.onError("Parse error: " + e.getMessage());
                    }
                }
            });
        } catch (Exception e) {
            callback.onError("Request error: " + e.getMessage());
        }
    }

    /**
     * Get the API health dashboard.
     */
    public void getHealthDashboard(final ApiClient.ApiCallback<JSONObject> callback) {
        Request request = new Request.Builder()
            .url(apiClient.getBaseUrl() + "/api/external/health")
            .get()
            .build();

        httpClient.newCall(request).enqueue(new okhttp3.Callback() {
            @Override
            public void onFailure(Call call, java.io.IOException e) {
                callback.onError("Network error: " + e.getMessage());
            }

            @Override
            public void onResponse(Call call, Response response) throws java.io.IOException {
                if (!response.isSuccessful()) {
                    callback.onError("HTTP " + response.code());
                    return;
                }
                try {
                    JSONObject json = new JSONObject(response.body().string());
                    callback.onSuccess(json);
                } catch (Exception e) {
                    callback.onError("Parse error: " + e.getMessage());
                }
            }
        });
    }

    // ── Data classes ──

    public static class SourceInfo {
        public String sourceId;
        public String sourceName;
        public String integrationStatus;
        public String licensing;
    }

    public static class ExternalSourceResult {
        public String sourceId;
        public String sourceName;
        public String status;
        public boolean fromCache;
        public String reason;
        public List<ExternalRecord> records = new ArrayList<>();
    }

    public static class ExternalSearchResult {
        public List<ExternalSourceResult> results = new ArrayList<>();
        public int getTotalRecordCount() {
            int count = 0;
            for (ExternalSourceResult r : results) {
                count += r.records.size();
            }
            return count;
        }
    }
}
