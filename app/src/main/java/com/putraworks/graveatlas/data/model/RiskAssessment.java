package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Comprehensive risk assessment combining all predictive models.
 * Returned by GET /api/predictions/risk-assessment
 */
public class RiskAssessment {
    public String overallRisk; // low, medium, high, critical
    public int totalRiskScore;
    public int totalCemeteries;
    public int criticalCount;
    public int highCount;
    public int mediumCount;
    public int lowCount;
    public List<CemeteryRisk> cemeteries;
    public List<PriorityAction> priorityActions;
    public String generatedAt;

    public static class CemeteryRisk {
        public String cemeteryId;
        public String cemeteryName;
        public int totalRecords;
        public String riskLevel;
        public int riskScore;
        public List<RiskItem> risks;
        public String topRisk;

        public static class RiskItem {
            public String type;
            public String severity;
            public String metric;
            public String description;
            public String impact;
            public String mitigation;

            public static RiskItem fromJson(JSONObject json) {
                RiskItem ri = new RiskItem();
                ri.type = json.optString("type", "");
                ri.severity = json.optString("severity", "low");
                ri.metric = json.optString("metric", "");
                ri.description = json.optString("description", "");
                ri.impact = json.optString("impact", "");
                ri.mitigation = json.optString("mitigation", "");
                return ri;
            }
        }

        public static CemeteryRisk fromJson(JSONObject json) {
            CemeteryRisk cr = new CemeteryRisk();
            cr.cemeteryId = json.optString("cemeteryId", "");
            cr.cemeteryName = json.optString("cemeteryName", cr.cemeteryId);
            cr.totalRecords = json.optInt("totalRecords", 0);
            cr.riskLevel = json.optString("riskLevel", "low");
            cr.riskScore = json.optInt("riskScore", 0);
            cr.topRisk = json.optString("topRisk", null);

            cr.risks = new ArrayList<>();
            JSONArray r = json.optJSONArray("risks");
            if (r != null) {
                for (int i = 0; i < r.length(); i++) {
                    JSONObject ri = r.optJSONObject(i);
                    if (ri != null) cr.risks.add(RiskItem.fromJson(ri));
                }
            }

            return cr;
        }

        public boolean isCritical() { return "critical".equals(riskLevel); }

        public String getRiskEmoji() {
            switch (riskLevel) {
                case "critical": return "🔴";
                case "high": return "🟠";
                case "medium": return "🟡";
                default: return "🟢";
            }
        }

        public String getSummaryLine() {
            return String.format("%s %s — Risk: %d (%s), %d risks, top: %s",
                getRiskEmoji(), cemeteryName, riskScore, riskLevel, risks.size(), topRisk);
        }
    }

    public static class PriorityAction {
        public int priority;
        public String action;
        public List<String> cemeteries;

        public static PriorityAction fromJson(JSONObject json) {
            PriorityAction pa = new PriorityAction();
            pa.priority = json.optInt("priority", 0);
            pa.action = json.optString("action", "");
            pa.cemeteries = new ArrayList<>();
            JSONArray c = json.optJSONArray("cemeteries");
            if (c != null) {
                for (int i = 0; i < c.length(); i++) {
                    pa.cemeteries.add(c.optString(i));
                }
            }
            return pa;
        }
    }

    public static RiskAssessment fromJson(JSONObject json) {
        RiskAssessment ra = new RiskAssessment();
        ra.overallRisk = json.optString("overallRisk", "low");
        ra.totalRiskScore = json.optInt("totalRiskScore", 0);
        ra.totalCemeteries = json.optInt("totalCemeteries", 0);
        ra.criticalCount = json.optInt("criticalCount", 0);
        ra.highCount = json.optInt("highCount", 0);
        ra.mediumCount = json.optInt("mediumCount", 0);
        ra.lowCount = json.optInt("lowCount", 0);
        ra.generatedAt = json.optString("generatedAt", "");

        ra.cemeteries = new ArrayList<>();
        JSONArray cems = json.optJSONArray("cemeteries");
        if (cems != null) {
            for (int i = 0; i < cems.length(); i++) {
                JSONObject c = cems.optJSONObject(i);
                if (c != null) ra.cemeteries.add(CemeteryRisk.fromJson(c));
            }
        }

        ra.priorityActions = new ArrayList<>();
        JSONArray pa = json.optJSONArray("priorityActions");
        if (pa != null) {
            for (int i = 0; i < pa.length(); i++) {
                JSONObject a = pa.optJSONObject(i);
                if (a != null) ra.priorityActions.add(PriorityAction.fromJson(a));
            }
        }

        return ra;
    }

    public boolean hasCriticalIssues() { return criticalCount > 0; }

    public String getOverallRiskEmoji() {
        switch (overallRisk) {
            case "critical": return "🔴";
            case "high": return "🟠";
            case "medium": return "🟡";
            default: return "🟢";
        }
    }

    public String getSummaryLine() {
        return String.format("%s Overall Risk: %s (score: %d) — %d critical, %d high, %d medium, %d low",
            getOverallRiskEmoji(), overallRisk, totalRiskScore, criticalCount, highCount, mediumCount, lowCount);
    }

    public int getActionCount() { return priorityActions != null ? priorityActions.size() : 0; }
}
