package com.putraworks.graveatlas.data.api;

/**
 * Maps HTTP status codes and network errors to user-friendly messages.
 * Never exposes internal server details, GitHub errors, or stack traces.
 */
public class ApiErrorHandler {

    public static String getMessage(int httpCode, String networkError) {
        if (networkError != null && !networkError.isEmpty()) {
            return getNetworkMessage(networkError);
        }
        return getHttpMessage(httpCode);
    }

    public static String getHttpMessage(int code) {
        switch (code) {
            case 400: return "Your submission contains invalid information. Please check the fields and try again.";
            case 401: return "Authentication required.";
            case 403: return "Access denied.";
            case 404: return "The requested record was not found.";
            case 409: return "A record with this information may already exist.";
            case 413: return "The submission is too large. Please reduce the content and try again.";
            case 429: return "Too many requests. Please wait a moment and try again.";
            case 500: return "The server is temporarily unavailable. Please try again later.";
            case 502: return "The server is temporarily unavailable. Please try again later.";
            case 503: return "The service is temporarily unavailable. Please try again later.";
            default:
                if (code >= 500) return "The server is temporarily unavailable. Please try again later.";
                if (code >= 400) return "The request could not be completed. Please try again.";
                return "Unexpected response from server.";
        }
    }

    public static String getNetworkMessage(String error) {
        if (error == null) return "Network error. Please check your connection.";
        String lower = error.toLowerCase();
        if (lower.contains("unable to resolve host") || lower.contains("unknown host")) {
            return "Unable to reach the server. You may be offline.";
        }
        if (lower.contains("timeout") || lower.contains("timed out")) {
            return "The request timed out. Please try again.";
        }
        if (lower.contains("connection refused") || lower.contains("connection reset")) {
            return "Unable to connect to the server. Please try again later.";
        }
        if (lower.contains("ssl") || lower.contains("certificate")) {
            return "Secure connection failed. Please try again.";
        }
        if (lower.contains("offline") || lower.contains("no connection")) {
            return "You appear to be offline. Your data has been saved and will sync when you're connected.";
        }
        return "Network error. Please check your connection and try again.";
    }

    /**
     * Returns true if the error indicates the device is likely offline.
     */
    public static boolean isOfflineError(String error) {
        if (error == null) return false;
        String lower = error.toLowerCase();
        return lower.contains("unable to resolve host") ||
               lower.contains("unknown host") ||
               lower.contains("offline") ||
               lower.contains("no connection") ||
               lower.contains("connection refused") ||
               lower.contains("timeout");
    }

    /**
     * Returns true if the HTTP code indicates a retry might succeed.
     */
    public static boolean isRetryable(int httpCode) {
        return httpCode == 429 || httpCode >= 500;
    }
}
