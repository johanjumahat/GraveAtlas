package com.putraworks.graveatlas.chat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Makes HTTP calls to AI provider APIs.
 * Supports Gemini format and OpenAI-compatible format (Groq, OpenRouter, etc.).
 */
public class AIClient {

    public interface Callback {
        void onSuccess(String response);
        void onError(String error);
    }

    private final AIProvider provider;
    private final String apiKey;
    private final String model;

    public AIClient(AIProvider provider, String apiKey, String model) {
        this.provider = provider;
        this.apiKey = apiKey;
        this.model = model;
    }

    public void chat(List<ChatMessage> messages, Callback callback) {
        new Thread(() -> {
            try {
                String response;
                if (provider.getApiFormat() == AIProvider.ApiFormat.GEMINI) {
                    response = callGemini(messages);
                } else {
                    response = callOpenAICompatible(messages);
                }
                callback.onSuccess(response);
            } catch (Exception e) {
                callback.onError(parseError(e));
            }
        }).start();
    }

    private String callGemini(List<ChatMessage> messages) throws Exception {
        String urlStr = provider.getEndpoint() + "/" + model + ":generateContent?key=" + apiKey;

        JSONObject body = new JSONObject();
        JSONArray contents = new JSONArray();

        for (ChatMessage msg : messages) {
            if (msg.isError()) continue;
            JSONObject content = new JSONObject();
            content.put("role", msg.isUser() ? "user" : "model");
            JSONArray parts = new JSONArray();
            JSONObject text = new JSONObject();
            text.put("text", msg.getContent());
            parts.put(text);
            content.put("parts", parts);
            contents.put(content);
        }
        body.put("contents", contents);

        // System instruction (Gemini format)
        JSONObject systemInstruction = new JSONObject();
        JSONArray sysParts = new JSONArray();
        JSONObject sysText = new JSONObject();
        sysText.put("text", AISystemPrompts.RESEARCH_ASSISTANT);
        sysParts.put(sysText);
        systemInstruction.put("parts", sysParts);
        body.put("systemInstruction", systemInstruction);

        JSONObject generationConfig = new JSONObject();
        generationConfig.put("temperature", 0.7);
        generationConfig.put("maxOutputTokens", 2048);
        body.put("generationConfig", generationConfig);

        String response = doRequest(urlStr, body.toString(), null);
        JSONObject json = new JSONObject(response);

        if (json.has("error")) {
            JSONObject error = json.getJSONObject("error");
            throw new Exception(error.optString("message", "Unknown Gemini API error"));
        }

        JSONArray candidates = json.getJSONArray("candidates");
        JSONObject firstCandidate = candidates.getJSONObject(0);
        JSONObject content = firstCandidate.getJSONObject("content");
        JSONArray parts = content.getJSONArray("parts");
        return parts.getJSONObject(0).getString("text");
    }

    private String callOpenAICompatible(List<ChatMessage> messages) throws Exception {
        JSONArray msgArray = new JSONArray();

        JSONObject systemMsg = new JSONObject();
        systemMsg.put("role", "system");
        systemMsg.put("content", AISystemPrompts.RESEARCH_ASSISTANT);
        msgArray.put(systemMsg);

        for (ChatMessage msg : messages) {
            if (msg.isError()) continue;
            JSONObject m = new JSONObject();
            m.put("role", msg.isUser() ? "user" : "assistant");
            m.put("content", msg.getContent());
            msgArray.put(m);
        }

        JSONObject body = new JSONObject();
        body.put("model", model);
        body.put("messages", msgArray);
        body.put("temperature", 0.7);
        body.put("max_tokens", 2048);

        String authHeader = (apiKey != null && !apiKey.isEmpty()) ? "Bearer " + apiKey : null;
        String response = doRequest(provider.getEndpoint(), body.toString(), authHeader);
        JSONObject json = new JSONObject(response);

        if (json.has("error")) {
            Object errObj = json.get("error");
            if (errObj instanceof JSONObject) {
                throw new Exception(((JSONObject) errObj).optString("message", "Unknown API error"));
            } else {
                throw new Exception(errObj.toString());
            }
        }

        JSONArray choices = json.getJSONArray("choices");
        JSONObject firstChoice = choices.getJSONObject(0);
        return firstChoice.getJSONObject("message").getString("content");
    }

    private String doRequest(String urlStr, String body, String authHeader) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        try {
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json");
            if (authHeader != null) {
                conn.setRequestProperty("Authorization", authHeader);
            }
            if (provider.getId().equals("openrouter")) {
                conn.setRequestProperty("HTTP-Referer", "https://github.com/putraworks2026/GraveAtlas");
                conn.setRequestProperty("X-Title", "GraveAtlas");
            }
            conn.setDoOutput(true);
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(60000);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }

            int code = conn.getResponseCode();
            BufferedReader reader;
            if (code >= 200 && code < 300) {
                reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
            } else {
                reader = new BufferedReader(new InputStreamReader(conn.getErrorStream(), StandardCharsets.UTF_8));
            }

            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            reader.close();

            if (code >= 400) {
                try {
                    JSONObject errJson = new JSONObject(sb.toString());
                    if (errJson.has("error")) {
                        Object err = errJson.get("error");
                        if (err instanceof JSONObject) {
                            throw new Exception(((JSONObject) err).optString("message", "HTTP " + code));
                        }
                        throw new Exception(err.toString());
                    }
                } catch (Exception pe) {
                    if (sb.length() > 0) {
                        throw new Exception("HTTP " + code + ": " + sb.substring(0, Math.min(sb.length(), 200)));
                    }
                    throw new Exception("HTTP " + code);
                }
                throw new Exception("HTTP " + code);
            }

            return sb.toString();
        } finally {
            conn.disconnect();
        }
    }

    private String parseError(Exception e) {
        String msg = e.getMessage();
        if (msg == null || msg.isEmpty()) msg = e.getClass().getSimpleName();

        if (msg.contains("Unable to resolve host") || msg.contains("UnknownHost")) {
            return "Network error — check your internet connection";
        }
        if (msg.contains("timeout") || msg.contains("Timeout")) {
            return "Request timed out — try again";
        }
        if (msg.contains("429") || msg.toLowerCase().contains("quota") || msg.toLowerCase().contains("rate limit")) {
            return "Rate limit / quota exceeded for this model";
        }
        if (msg.contains("402") || msg.toLowerCase().contains("payment")) {
            return "This model requires payment (free quota used up)";
        }
        if (msg.contains("404") || msg.toLowerCase().contains("not found") || msg.toLowerCase().contains("unavailable")) {
            return "This model is no longer available for free";
        }
        if (msg.contains("401") || msg.contains("403") || msg.toLowerCase().contains("invalid") && msg.toLowerCase().contains("key")) {
            return "Invalid or expired API key";
        }
        return msg;
    }

    public static boolean isRetryable(String humanReadableError) {
        if (humanReadableError == null) return true;
        String m = humanReadableError.toLowerCase();
        return m.contains("rate limit") || m.contains("quota") || m.contains("payment")
            || m.contains("no longer available") || m.contains("invalid or expired")
            || m.contains("network error") || m.contains("timed out")
            || m.contains("http 5") || m.contains("http 429") || m.contains("http 404");
    }
}
