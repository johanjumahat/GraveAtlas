package com.putraworks.graveatlas.utils;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import com.putraworks.graveatlas.data.api.ApiClient;

/**
 * Utility class for sharing records and deep linking (Phase 7B, Parts 125-126).
 *
 * Sharing: generates shareable HTTPS URLs for public records.
 * Deep linking: opens GraveAtlas records from shared links.
 *
 * No private information is included in share links.
 */
public class ShareUtils {

    // Deep link scheme: graveatlas://record/{type}/{id}
    public static final String DEEP_LINK_SCHEME = "graveatlas";
    public static final String DEEP_LINK_HOST = "record";

    // Web URL pattern: https://graveatlas.../record/{type}/{id}
    public static final String WEB_RECORD_PATH = "/record";

    /**
     * Generate a shareable web URL for a public record (Part 125).
     */
    public static String getShareUrl(Context context, String type, String id, String name) {
        ApiClient client = new ApiClient();
        String baseUrl = client.getBaseUrl();
        return baseUrl + WEB_RECORD_PATH + "/" + type + "/" + id;
    }

    /**
     * Generate a deep link for opening a record in the app (Part 126).
     */
    public static String getDeepLink(String type, String id) {
        return DEEP_LINK_SCHEME + "://" + DEEP_LINK_HOST + "/" + type + "/" + id;
    }

    /**
     * Open the system share sheet for a record (Part 125).
     */
    public static void shareRecord(Context context, String type, String id, String name) {
        String shareUrl = getShareUrl(context, type, id, name);
        String shareText = "Check out " + (name != null ? name : "this record") + " on GraveAtlas:\n" + shareUrl;

        Intent shareIntent = new Intent(Intent.ACTION_SEND);
        shareIntent.setType("text/plain");
        shareIntent.putExtra(Intent.EXTRA_TEXT, shareText);
        shareIntent.putExtra(Intent.EXTRA_SUBJECT, "GraveAtlas: " + (name != null ? name : "Record"));
        context.startActivity(Intent.createChooser(shareIntent, "Share"));
    }

    /**
     * Open a cemetery/location in the device's map/navigation app (Part 119).
     * Uses standard Android geo: intents — no custom navigation engine.
     */
    public static void openInMapsApp(Context context, double lat, double lon, String label) {
        String safeLabel = label != null ? label.replace("(", "").replace(")", "") : "Location";
        String geoUri = String.format("geo:%f,%f?q=%f,%f(%s)", lat, lon, lat, lon, safeLabel);
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(geoUri));
        context.startActivity(intent);
    }

    /**
     * Parse a deep link URI to extract record type and ID (Part 126).
     * Returns null if the URI is not a valid GraveAtlas deep link.
     */
    public static ParsedDeepLink parseDeepLink(Uri uri) {
        if (uri == null) return null;
        if (!DEEP_LINK_SCHEME.equals(uri.getScheme())) return null;
        if (!DEEP_LINK_HOST.equals(uri.getHost())) return null;

        // Path: /{type}/{id}
        String path = uri.getPath();
        if (path == null || path.isEmpty()) return null;

        String[] parts = path.substring(1).split("/");
        if (parts.length < 2) return null;

        String type = parts[0];
        String id = parts[1];

        // Validate
        if (type == null || type.isEmpty() || id == null || id.isEmpty()) return null;
        if (id.contains("..") || id.contains("/") || id.contains("\\")) return null;

        ParsedDeepLink result = new ParsedDeepLink();
        result.type = type;
        result.id = id;
        return result;
    }

    /**
     * Parse a web share URL to extract record type and ID (Part 126).
     */
    public static ParsedDeepLink parseShareUrl(Uri uri) {
        if (uri == null) return null;

        String path = uri.getPath();
        if (path == null || !path.startsWith(WEB_RECORD_PATH)) return null;

        // Path: /record/{type}/{id}
        String[] parts = path.substring(1).split("/");
        if (parts.length < 3) return null;
        if (!"record".equals(parts[0])) return null;

        String type = parts[1];
        String id = parts[2];

        if (type == null || type.isEmpty() || id == null || id.isEmpty()) return null;
        if (id.contains("..") || id.contains("/") || id.contains("\\")) return null;

        ParsedDeepLink result = new ParsedDeepLink();
        result.type = type;
        result.id = id;
        return result;
    }

    public static class ParsedDeepLink {
        public String type;
        public String id;
    }
}
