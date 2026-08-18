package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Natural language query result.
 * Returned by POST /api/query/natural
 */
public class NaturalLanguageQueryResult {
    public String query;
    public ParsedQuery parsed;
    public String answer;
    public List<QueryResult> results;
    public int totalCount;
    public int shownCount;
    public List<AggregationEntry> aggregation;

    public static class ParsedQuery {
        public String intent;
        public String cemeteryId;
        public String cemeteryName;
        public String nameFilter;
        public DateRange dateRange;
        public YearRange yearRange;
        public Integer confidenceThreshold;
        public String verificationStatus;
        public Boolean hasAnomalies;
        public Boolean hasSources;
        public Boolean hasCoordinates;
        public String sortBy;
        public String sortOrder;
        public Integer limit;
        public String aggregation;
        public String groupBy;
        public String rawQuery;

        public static class DateRange {
            public String start;
            public String end;

            public static DateRange fromJson(JSONObject json) {
                DateRange dr = new DateRange();
                dr.start = json.optString("start", null);
                dr.end = json.optString("end", null);
                return dr;
            }
        }

        public static class YearRange {
            public Integer start;
            public Integer end;

            public static YearRange fromJson(JSONObject json) {
                YearRange yr = new YearRange();
                yr.start = json.has("start") && !json.isNull("start") ? json.optInt("start") : null;
                yr.end = json.has("end") && !json.isNull("end") ? json.optInt("end") : null;
                return yr;
            }
        }

        public static ParsedQuery fromJson(JSONObject json) {
            ParsedQuery pq = new ParsedQuery();
            pq.intent = json.optString("intent", "search");
            pq.cemeteryId = json.optString("cemeteryId", null);
            pq.cemeteryName = json.optString("cemeteryName", null);
            pq.nameFilter = json.optString("nameFilter", null);
            pq.confidenceThreshold = json.has("confidenceThreshold") && !json.isNull("confidenceThreshold") ? json.optInt("confidenceThreshold") : null;
            pq.verificationStatus = json.optString("verificationStatus", null);
            pq.sortBy = json.optString("sortBy", null);
            pq.sortOrder = json.optString("sortOrder", "desc");
            pq.limit = json.has("limit") && !json.isNull("limit") ? json.optInt("limit") : null;
            pq.aggregation = json.optString("aggregation", null);
            pq.groupBy = json.optString("groupBy", null);
            pq.rawQuery = json.optString("rawQuery", "");

            pq.hasAnomalies = json.has("hasAnomalies") && !json.isNull("hasAnomalies") ? json.optBoolean("hasAnomalies") : null;
            pq.hasSources = json.has("hasSources") && !json.isNull("hasSources") ? json.optBoolean("hasSources") : null;
            pq.hasCoordinates = json.has("hasCoordinates") && !json.isNull("hasCoordinates") ? json.optBoolean("hasCoordinates") : null;

            JSONObject dr = json.optJSONObject("dateRange");
            if (dr != null) pq.dateRange = DateRange.fromJson(dr);

            JSONObject yr = json.optJSONObject("yearRange");
            if (yr != null) pq.yearRange = YearRange.fromJson(yr);

            return pq;
        }
    }

    public static class QueryResult {
        public String id;
        public String name;
        public String cemetery;
        public Integer birthYear;
        public Integer deathYear;
        public int confidence;
        public String verificationStatus;
        public boolean hasAnomalies;
        public boolean hasCoordinates;
        public boolean hasSources;

        public static QueryResult fromJson(JSONObject json) {
            QueryResult qr = new QueryResult();
            qr.id = json.optString("id", "");
            qr.name = json.optString("name", "Unknown");
            qr.cemetery = json.optString("cemetery", "Unknown");
            qr.birthYear = json.has("birthYear") && !json.isNull("birthYear") ? json.optInt("birthYear") : null;
            qr.deathYear = json.has("deathYear") && !json.isNull("deathYear") ? json.optInt("deathYear") : null;
            qr.confidence = json.optInt("confidence", 0);
            qr.verificationStatus = json.optString("verificationStatus", "unverified");
            qr.hasAnomalies = json.optBoolean("hasAnomalies", false);
            qr.hasCoordinates = json.optBoolean("hasCoordinates", false);
            qr.hasSources = json.optBoolean("hasSources", false);
            return qr;
        }
    }

    public static class AggregationEntry {
        public String key;
        public int count;

        public static AggregationEntry fromJson(JSONObject json) {
            AggregationEntry ae = new AggregationEntry();
            ae.key = json.optString("key", "");
            ae.count = json.optInt("count", 0);
            return ae;
        }
    }

    public static NaturalLanguageQueryResult fromJson(JSONObject json) {
        NaturalLanguageQueryResult r = new NaturalLanguageQueryResult();
        r.query = json.optString("query", "");
        r.answer = json.optString("answer", "");
        r.totalCount = json.optInt("totalCount", 0);
        r.shownCount = json.optInt("shownCount", 0);

        JSONObject parsed = json.optJSONObject("parsed");
        if (parsed != null) r.parsed = ParsedQuery.fromJson(parsed);

        r.results = new ArrayList<>();
        JSONArray results = json.optJSONArray("results");
        if (results != null) {
            for (int i = 0; i < results.length(); i++) {
                JSONObject res = results.optJSONObject(i);
                if (res != null) r.results.add(QueryResult.fromJson(res));
            }
        }

        r.aggregation = new ArrayList<>();
        JSONArray agg = json.optJSONArray("aggregation");
        if (agg != null) {
            for (int i = 0; i < agg.length(); i++) {
                JSONObject a = agg.optJSONObject(i);
                if (a != null) r.aggregation.add(AggregationEntry.fromJson(a));
            }
        }

        return r;
    }

    public boolean hasResults() { return results != null && !results.isEmpty(); }
    public boolean isCountIntent() { return parsed != null && "count".equals(parsed.intent); }
    public boolean hasAggregation() { return aggregation != null && !aggregation.isEmpty(); }
}
