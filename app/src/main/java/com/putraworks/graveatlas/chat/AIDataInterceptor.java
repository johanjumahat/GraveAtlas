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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * RAG (Retrieval-Augmented Generation) interceptor for GraveAtlas AI chat.
 *
 * Before sending a user message to the AI provider, this class:
 * 1. Detects whether the message is a search/research query about graves/cemeteries
 * 2. If so, queries the GraveAtlas API for relevant records
 * 3. Formats the results as context to inject into the AI conversation
 *
 * This bridges the gap between the AI (which has no database access) and the
 * GraveAtlas backend (which has the actual records).
 *
 * The AI then receives both the user's question AND the real data, enabling
 * evidence-grounded responses instead of generic "search the app" suggestions.
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

    // Keywords that indicate the user wants to search external sources
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
     * Intercept a user message, detect search intent, and augment with data.
     *
     * @param userMessage  The user's raw input text
     * @param history      Existing chat history (for context)
     * @param callback     Called with augmented messages (if search detected) or original messages (if not)
     */
    public void intercept(String userMessage, List<ChatMessage> history, InterceptorCallback callback) {
        // Check if user wants external source search (Part 16-17)
        if (isExternalSearchQuery(userMessage)) {
            handleExternalSearch(userMessage, history, callback);
            return;
        }
        
        if (!isSearchQuery(userMessage)) {
            callback.onSkipped(history);
            return;
        }

        String searchTerms = extractSearchTerms(userMessage);
        if (searchTerms == null || searchTerms.trim().isEmpty()) {
            callback.onSkipped(history);
            return;
        }

        // Query the GraveAtlas API
        apiClient.search(searchTerms, null, 0, 10, new ApiClient.ApiCallback<List<SearchResult>>() {
            @Override
            public void onSuccess(List<SearchResult> results) {
                String context = formatSearchContext(results, searchTerms);
                List<ChatMessage> augmented = new ArrayList<>(history);

                // Add a system-context message that provides the real data
                // This goes right before the latest user message
                if (!context.isEmpty()) {
                    // Insert data context as a system-level note before the user's last message
                    // We'll prepend the context to the last user message instead
                    // to avoid confusing the AI with a fake assistant message
                    if (!augmented.isEmpty()) {
                        ChatMessage lastMsg = augmented.get(augmented.size() - 1);
                        if (lastMsg.isUser()) {
                            String augmentedContent = "[DATABASE CONTEXT]\n" + context + "\n[/DATABASE CONTEXT]\n\n" + lastMsg.getContent();
                            augmented.set(augmented.size() - 1, new ChatMessage(augmentedContent, true));
                        }
                    }
                    callback.onReady(augmented, context);
                } else {
                    callback.onReady(history, "");
                }
            }

            @Override
            public void onError(String error) {
                // On API error, proceed without data — AI will still try to help
                callback.onReady(history, "");
            }
        });
    }

    /**
     * Determine if the user wants to search external sources.
     */
    private boolean isExternalSearchQuery(String message) {
        String lower = message.toLowerCase();
        for (String trigger : EXTERNAL_SEARCH_TRIGGERS) {
            if (lower.contains(trigger)) return true;
        }
        return false;
    }
    
    /**
     * Handle an external source search query (Part 16-17).
     * Queries external sources and injects results as [EXTERNAL CONTEXT].
     */
    private void handleExternalSearch(String userMessage, List<ChatMessage> history, InterceptorCallback callback) {
        try {
            JSONObject query = new JSONObject();
            query.put("search", userMessage);
            
            externalClient.queryAllSources(query, new ApiClient.ApiCallback<ExternalSourceClient.ExternalSearchResult>() {
                @Override
                public void onSuccess(ExternalSourceClient.ExternalSearchResult result) {
                    String context = formatExternalContext(result);
                    List<ChatMessage> augmented = new ArrayList<>(history);
                    
                    if (!context.isEmpty() && !augmented.isEmpty()) {
                        ChatMessage lastMsg = augmented.get(augmented.size() - 1);
                        if (lastMsg.isUser()) {
                            String augmentedContent = "[EXTERNAL SOURCE CONTEXT]\n" + context + "\n[/EXTERNAL SOURCE CONTEXT]\n\n" + lastMsg.getContent();
                            augmented.set(augmented.size() - 1, new ChatMessage(augmentedContent, true));
                        }
                    }
                    callback.onReady(augmented, context);
                }
                
                @Override
                public void onError(String error) {
                    // On external search error, proceed without external data
                    callback.onReady(history, "");
                }
            });
        } catch (Exception e) {
            callback.onReady(history, "");
        }
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
        
        sb.append("IMPORTANT: These are EXTERNAL records with source provenance.\n");
        sb.append("They are NOT GraveAtlas native records. Always cite the source.\n");
        
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
            return "No records found in GraveAtlas for \"" + searchTerms + "\". " +
                   "The database may not contain records matching this query yet. " +
                   "Let the user know and suggest they try the Search tab with different terms or contribute new records.";
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
            if (sr.birthDate != null) sb.append("   Born: ").append(sr.birthDate).append("\n");
            if (sr.deathDate != null) sb.append("   Died: ").append(sr.deathDate).append("\n");

            // Verification status if available

            sb.append("\n");
        }

        sb.append("INSTRUCTIONS FOR AI: Use these real database results to answer the user's question. ");
        sb.append("Cite the record type and ID when referencing specific records. ");
        sb.append("If verification status is not 'verified', note that the record needs verification. ");
        sb.append("Do NOT fabricate additional records beyond what is shown here.");

        return sb.toString();
    }
}
