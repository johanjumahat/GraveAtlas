package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Query explanation result.
 * Returned by POST /api/query/explain
 */
public class QueryExplanation {
    public String query;
    public NaturalLanguageQueryResult.ParsedQuery parsed;
    public String explanation;

    public static QueryExplanation fromJson(JSONObject json) {
        QueryExplanation qe = new QueryExplanation();
        qe.query = json.optString("query", "");
        qe.explanation = json.optString("explanation", "");

        JSONObject parsed = json.optJSONObject("parsed");
        if (parsed != null) {
            qe.parsed = NaturalLanguageQueryResult.ParsedQuery.fromJson(parsed);
        }

        return qe;
    }
}
