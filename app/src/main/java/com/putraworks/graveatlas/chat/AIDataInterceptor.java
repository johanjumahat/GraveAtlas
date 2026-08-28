package com.putraworks.graveatlas.chat;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.model.CemeteryRecord;
import com.putraworks.graveatlas.data.model.GraveRecord;
import com.putraworks.graveatlas.data.model.SearchResult;
import com.putraworks.graveatlas.data.api.ExternalSourceClient;
import com.putraworks.graveatlas.data.model.ExternalRecord;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * RAG (Retrieval-Augmented Generation) interceptor for GraveAtlas AI chat.
 *
 * Before sending a user message to the AI provider, this class:
 * 1. Detects whether the message is a search/research query about graves/cemeteries
 * 2. If so, queries BOTH the GraveAtlas internal database AND all configured
 *    external official sources (OpenStreetMap, Wikidata, Singapore government
 *    data, etc.) IN PARALLEL, and compiles both result sets into a single
 *    combined context.
 * 3. Formats the combined results as context to inject into the AI conversation.
 *
 * IMPORTANT: A search query must never answer from GraveAtlas's own database
 * alone. Every search intent triggers both the internal DB lookup and the
 * external sources gateway, and both results (even "no records found") are
 * compiled together before being handed to the AI. This ensures a query like
 * "Find graves of people born before 1850" is answered using GraveAtlas
 * records AND live official-API data, not GitHub-sourced data only.
 *
 * This bridges the gap between the AI (which has no database access) and the
 * GraveAtlas backend (which has the actual records), while also pulling in
 * live official-source coverage the internal database doesn't have yet.
 */
public class AIDataInterceptor {

    private final ApiClient apiClient;
    private final ExternalSourceClient externalClient;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // Keywords that indicate the user is asking about records in the database
    private static final String[] SEARCH_TRIGGERS = {
        "find", "search", "show me", "show", "where is", "where are", "tell me about",
        "look up", "lookup", "who is", "who was", "information about", "info about",
        "records for", "records of", "graves in", "graves at", "cemeteries in",
        "cemeteries at", "buried in", "buried at", "grave of", "memorial for",
        "list cemeteries", "list graves", "what cemeteries", "what graves"
    };

    // Keywords that indicate the user explicitly called out external sources.
    // NOTE: these no longer gate whether external sources are queried — every
    // search query now always queries external sources too. This list is kept
    // only to detect explicit external-only intent phrasing for search term
    // extraction purposes.
    private static final String[] EXTERNAL_SEARCH_TRIGGERS = {
        "external sources", "external cemetery", "external records",
        "search external", "compare graveatlas", "compare records",
        "other sources", "government cemetery", "openstreetmap", "osm",
        "wikidata", "find burial records from external"
    };

    // Keywords that indicate a non-search message (conversational, meta)
    private static final String[] NON_SEARCH_TRIGGERS = {
        "what is graveatlas", "how do i", "how to", "what does verification",
        "what is provenance", "what are evidence", "help me understand",
        "what research questions", "explain evidence", "what is the difference",
        "can you help", "thank", "hello", "hi "
    };

    public AIDataInterceptor() {
        this.apiClient = new ApiClient();
        this.externalClient = new ExternalSourceClient();
    }

    public AIDataInterceptor(ApiClient client) {
        this.apiClient = client;
        this.externalClient = new ExternalSourceClient();
    }

    /**
     * Callback for intercepted search results.
     */
    public interface InterceptorCallback {
        void onReady(List<ChatMessage> augmentedMessages, String searchContext);
        void onSkipped(List<ChatMessage> originalMessages);
    }

    /**
     * Intercept a user message, detect search intent, and augment with data
     * compiled from BOTH the internal GraveAtlas database AND all external
     * official sources.
     *
     * @param userMessage  The user's raw input text
     * @param history      Existing chat history (for context)
     * @param callback     Called with augmented messages (if search detected) or original messages (if not)
     */
    public void intercept(String userMessage, List<ChatMessage> history, InterceptorCallback callback) {
        boolean wantsSearch = isSearchQuery(userMessage) || isExternalSearchQuery(userMessage);
        if (!wantsSearch) {
            callback.onSkipped(history);
            return;
        }

        String searchTerms = extractSearchTerms(userMessage);
        if (searchTerms == null || searchTerms.trim().isEmpty()) {
            searchTerms = userMessage.trim();
        }
        final String finalSearchTerms = searchTerms;

        // Compile data from BOTH sources in parallel: internal DB + all
        // external official APIs (OSM, Wikidata, Singapore gov, etc.).
        // Neither source answers alone — both are always queried together.
        final CombinedResultCollector collector = new CombinedResultCollector(history, finalSearchTerms, callback);

        // 1) Internal GraveAtlas database
        apiClient.search(finalSearchTerms, null, 0, 10, new ApiClient.ApiCallback<List<SearchResult>>() {
            @Override
            public void onSuccess(List<SearchResult> results) {
                collector.setDatabaseContext(formatSearchContext(results, finalSearchTerms));
            }

            @Override
            public void onError(String error) {
                // On API error, still proceed — external results (or lack
                // thereof) will be compiled and returned.
                collector.setDatabaseContext("");
            }
        });

        // 2) All external official sources (OSM, Wikidata, Singapore gov, ...)
        try {
            JSONObject query = new JSONObject();
            query.put("search", finalSearchTerms);

            externalClient.queryAllSources(query, new ApiClient.ApiCallback<ExternalSourceClient.ExternalSearchResult>() {
                @Override
                public void onSuccess(ExternalSourceClient.ExternalSearchResult result) {
                    collector.setExternalContext(formatExternalContext(result));
                }

                @Override
                public void onError(String error) {
                    collector.setExternalContext("");
                }
            });
        } catch (Exception e) {
            collector.setExternalContext("");
        }
    }

    /**
     * Collects results from the internal DB call and the external sources
     * call (both async, in parallel) and fires the callback once when both
     * have completed, with a single COMPILED context combining both.
     */
    private class CombinedResultCollector {
        private final List<ChatMessage> history;
        private final String searchTerms;
        private final InterceptorCallback callback;
        private final AtomicInteger pending = new AtomicInteger(2);
        private volatile String databaseContext;
        private volatile String externalContext;

        CombinedResultCollector(List<ChatMessage> history, String searchTerms, InterceptorCallback callback) {
            this.history = history;
            this.searchTerms = searchTerms;
            this.callback = callback;
        }

        void setDatabaseContext(String ctx) {
            this.databaseContext = ctx;
            maybeFinish();
        }

        void setExternalContext(String ctx) {
            this.externalContext = ctx;
            maybeFinish();
        }

        private void maybeFinish() {
            if (pending.decrementAndGet() == 0) {
                mainHandler.post(this::finish);
            }
        }

        private void finish() {
            String combined = compileCombinedContext(databaseContext, externalContext, searchTerms);
            List<ChatMessage> augmented = new ArrayList<>(history);

            if (!combined.isEmpty() && !augmented.isEmpty()) {
                ChatMessage lastMsg = augmented.get(augmented.size() - 1);
                if (lastMsg.isUser()) {
                    String augmentedContent = "[COMPILED CONTEXT]\n" + combined + "\n[/COMPILED CONTEXT]\n\n" + lastMsg.getContent();
                    augmented.set(augmented.size() - 1, new ChatMessage(augmentedContent, true));
                }
                callback.onReady(augmented, combined);
            } else {
                callback.onReady(history, "");
            }
        }
    }

    /**
     * Compile the internal DB context and external sources context into a
     * single block. Always labels which part came from GraveAtlas's own
     * (community/GitHub-backed) database vs. live official external APIs, so
     * the AI — and the user — can see both were checked, not just one.
     */
    private String compileCombinedContext(String databaseContext, String externalContext, String searchTerms) {
        boolean hasDb = databaseContext != null && !databaseContext.trim().isEmpty();
        boolean hasExternal = externalContext != null && !externalContext.trim().isEmpty();

        if (!hasDb && !hasExternal) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        if (hasDb) {
            sb.append("=== GRAVEATLAS DATABASE ===\n").append(databaseContext).append("\n\n");
        }
        if (hasExternal) {
            sb.append("=== EXTERNAL OFFICIAL SOURCES ===\n").append(externalContext);
        }
        return sb.toString();
    }

    /**
     * Determine if the user wants to search external sources.
     * (Retained for search-term extraction; no longer gates whether external
     * sources are queried — that now always happens for any search intent.)
     */
    private boolean isExternalSearchQuery(String message) {
        String lower = message.toLowerCase();
        for (String trigger : EXTERNAL_SEARCH_TRIGGERS) {
            if (lower.contains(trigger)) return true;
        }
        return false;
    }

    /**
     * Format external source search results as context for the AI.
     */
    private String formatExternalContext(ExternalSourceClient.ExternalSearchResult result) {
        if (result == null || result.results.isEmpty()) return "";

        StringBuilder sb = new StringBuilder();
        int totalRecords = result.getTotalRecordCount();

        if (totalRecords == 0) {
            sb.append("External search found 0 records from ").append(result.results.size()).append(" sources.\n");
            for (ExternalSourceClient.ExternalSourceResult r : result.results) {
                sb.append("- ").append(r.sourceName).append(": ").append(r.reason != null ? r.reason : "no records").append("\n");
            }
            return sb.toString();
        }

        sb.append("External search found ").append(totalRecords).append(" record(s) from ").append(result.results.size()).append(" source(s):\n\n");

        for (ExternalSourceClient.ExternalSourceResult srcResult : result.results) {
            sb.append("SOURCE: ").append(srcResult.sourceName).append("\n");
            sb.append("  Status: ").append(srcResult.status).append(srcResult.fromCache ? " (cached)" : "").append("\n");
            if (srcResult.records.isEmpty()) {
                sb.append("  Records: none").append(srcResult.reason != null ? " — " + srcResult.reason : "").append("\n");
            } else {
                sb.append("  Records (").append(srcResult.records.size()).append("):\n");
                for (ExternalRecord record : srcResult.records) {
                    sb.append("    - ").append(record.getDisplayName());
                    if (record.cemetery != null) sb.append(" | Cemetery: ").append(record.cemetery);
                    if (record.deathDate != null) sb.append(" | d. ").append(record.deathDate);
                    if (record.license != null) sb.append(" | License: ").append(record.license);
                    sb.append("\n");
                }
            }
            sb.append("\n");
        }

        return sb.toString();
    }

    /**
     * Determine if the user's message is a search/research query about records.
     */
    private boolean isSearchQuery(String message) {
        if (message == null || message.isEmpty()) return false;
        String lower = message.toLowerCase().trim();

        // Check non-search triggers first (these are meta/conversational questions)
        for (String nonSearch : NON_SEARCH_TRIGGERS) {
            if (lower.contains(nonSearch)) return false;
        }

        // Check search triggers
        for (String trigger : SEARCH_TRIGGERS) {
            if (lower.startsWith(trigger) || lower.contains(" " + trigger + " ")) {
                return true;
            }
        }

        // Check for proper nouns or specific names (capitalized words that aren't at sentence start)
        // This catches "Tell me about John Smith buried in Oakland Cemetery"
        if (lower.contains("cemetery") || lower.contains("grave") || lower.contains("buried") || lower.contains("memorial")) {
            return true;
        }

        return false;
    }

    /**
     * Extract search terms from the user's message.
     * Strips query words and keeps the meaningful search content.
     */
    private String extractSearchTerms(String message) {
        if (message == null || message.trim().isEmpty()) return null;

        String lower = message.toLowerCase().trim();

        // Remove common prefix phrases
        String[] prefixes = {
            "find ", "search for ", "search ", "show me ", "show ",
            "where is ", "where are ", "tell me about ", "tell me ",
            "look up ", "lookup ", "who is ", "who was ",
            "information about ", "info about ",
            "records for ", "records of ",
            "graves in ", "graves at ", "grave of ",
            "cemeteries in ", "cemeteries at ", "cemetery ",
            "buried in ", "buried at ",
            "memorial for ", "list cemeteries ", "list graves ",
            "what cemeteries ", "what graves "
        };

        for (String prefix : prefixes) {
            if (lower.startsWith(prefix)) {
                return message.substring(prefix.length()).trim();
            }
        }

        // If no prefix matched but we detected it's a search, use the whole message
        return message.trim();
    }

    /**
     * Format search results as context for the AI.
     * Only includes fields the AI needs to answer the question.
     */
    private String formatSearchContext(List<SearchResult> results, String searchTerms) {
        if (results == null || results.isEmpty()) {
            return "No records found in the GraveAtlas database for \"" + searchTerms + "\". " +
                   "This does NOT mean no data exists — check the external official sources section too.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("GraveAtlas database returned ").append(results.size());
        sb.append(" result(s) for \"").append(searchTerms).append("\":\n\n");

        int count = 0;
        for (SearchResult sr : results) {
            if (count >= 10) {
                sb.append("... and ").append(results.size() - 10).append(" more results.\n");
                break;
            }
            count++;

            sb.append(count).append(". [").append(sr.type != null ? sr.type.toUpperCase() : "UNKNOWN").append("] ");
            if (sr.name != null) sb.append(sr.name);
            sb.append("\n");

            if (sr.id != null) sb.append("   ID: ").append(sr.id).append("\n");
            if (sr.country != null) sb.append("   Country: ").append(sr.country).append("\n");
            if (sr.region != null) sb.append("   Region: ").append(sr.region).append("\n");
            if (sr.city != null) sb.append("   City: ").append(sr.city).append("\n");
            if (sr.cemetery != null) sb.append("   Cemetery: ").append(sr.cemetery).append("\n");
            if (sr.section != null) sb.append("   Block/Section: ").append(sr.section).append("\n");
            if (sr.plot != null) sb.append("   Plot: ").append(sr.plot).append("\n");
            if (sr.birthDate != null) sb.append("   Born: ").append(sr.birthDate).append("\n");
            if (sr.deathDate != null) sb.append("   Died: ").append(sr.deathDate).append("\n");
            if (sr.latitude != null && sr.longitude != null) {
                sb.append("   Coordinates: ").append(sr.latitude).append(", ").append(sr.longitude).append("\n");
                sb.append("   Map link: https://www.google.com/maps?q=").append(sr.latitude).append(",").append(sr.longitude).append("\n");
            }
            if (sr.verificationStatus != null && !"verified".equalsIgnoreCase(sr.verificationStatus)) {
                sb.append("   Verification: ").append(sr.verificationStatus).append(" (needs verification)\n");
            }

            sb.append("\n");
        }


        return sb.toString();
    }
}
