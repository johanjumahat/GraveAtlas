package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

/**
 * Phase 26: Cemetery Analytics Result
 */
public class CemeteryAnalyticsResult {
    public int totalRecords;
    public int totalInsights;
    public List<Insight> insights;
    public String attribution;

    public static CemeteryAnalyticsResult fromJson(JSONObject json) {
        CemeteryAnalyticsResult r = new CemeteryAnalyticsResult();
        r.totalRecords = json.optInt("totalRecords", 0);
        r.totalInsights = json.optInt("totalInsights", 0);
        r.attribution = json.optString("attribution", "GraveAtlas — AI Cemetery Analytics");
        r.insights = new ArrayList<>();
        JSONArray arr = json.optJSONArray("insights");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.optJSONObject(i);
                if (obj != null) {
                    Insight ins = new Insight();
                    ins.category = obj.optString("category", "");
                    ins.title = obj.optString("title", "");
                    ins.value = obj.optString("value", "");
                    ins.detail = obj.optString("detail", "");
                    r.insights.add(ins);
                }
            }
        }
        return r;
    }

    public static class Insight {
        public String category;
        public String title;
        public String value;
        public String detail;
    }
}
