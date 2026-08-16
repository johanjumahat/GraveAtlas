package com.putraworks.graveatlas.data.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Compliance check result — evaluates all governance policies against current data.
 * Returned by POST /api/governance/check
 */
public class ComplianceReport {
    public String checkedAt;
    public String checkedBy;
    public ComplianceSummary summary;
    public List<ComplianceIssue> issues;
    public List<PolicySummary> policies;
    public int score;

    public static class ComplianceSummary {
        public int totalRecords;
        public int classifiedRecords;
        public int unclassifiedRecords;
        public int totalPolicies;
        public int activePolicies;
        public int consentRecords;
        public int withdrawnConsents;
        public int rtbfRequests;
        public int auditEntries;
        public int issuesFound;
        public int criticalIssues;
    }

    public static class ComplianceIssue {
        public String severity;  // warning, critical
        public String type;
        public int count;
        public String message;
        public String policyId;
        public String policyName;
    }

    public static class PolicySummary {
        public String id;
        public String name;
        public String type;
        public boolean enabled;
        public String classification;
        public Integer retentionDays;
    }

    public static ComplianceReport fromJson(JSONObject json) {
        ComplianceReport result = new ComplianceReport();
        JSONObject c = json.optJSONObject("compliance");
        if (c == null) c = json;

        result.checkedAt = c.optString("checkedAt", null);
        result.checkedBy = c.optString("checkedBy", "system");
        result.score = c.optInt("score", 0);

        JSONObject s = c.optJSONObject("summary");
        if (s != null) {
            result.summary = new ComplianceSummary();
            result.summary.totalRecords = s.optInt("totalRecords", 0);
            result.summary.classifiedRecords = s.optInt("classifiedRecords", 0);
            result.summary.unclassifiedRecords = s.optInt("unclassifiedRecords", 0);
            result.summary.totalPolicies = s.optInt("totalPolicies", 0);
            result.summary.activePolicies = s.optInt("activePolicies", 0);
            result.summary.consentRecords = s.optInt("consentRecords", 0);
            result.summary.withdrawnConsents = s.optInt("withdrawnConsents", 0);
            result.summary.rtbfRequests = s.optInt("rtbfRequests", 0);
            result.summary.auditEntries = s.optInt("auditEntries", 0);
            result.summary.issuesFound = s.optInt("issuesFound", 0);
            result.summary.criticalIssues = s.optInt("criticalIssues", 0);
        }

        result.issues = new ArrayList<>();
        JSONArray issues = c.optJSONArray("issues");
        if (issues != null) {
            for (int i = 0; i < issues.length(); i++) {
                JSONObject iss = issues.optJSONObject(i);
                if (iss == null) continue;
                ComplianceIssue issue = new ComplianceIssue();
                issue.severity = iss.optString("severity", "warning");
                issue.type = iss.optString("type", "");
                issue.count = iss.optInt("count", 0);
                issue.message = iss.optString("message", "");
                issue.policyId = iss.optString("policyId", null);
                issue.policyName = iss.optString("policyName", null);
                result.issues.add(issue);
            }
        }

        result.policies = new ArrayList<>();
        JSONArray pols = c.optJSONArray("policies");
        if (pols != null) {
            for (int i = 0; i < pols.length(); i++) {
                JSONObject p = pols.optJSONObject(i);
                if (p == null) continue;
                PolicySummary ps = new PolicySummary();
                ps.id = p.optString("id", "");
                ps.name = p.optString("name", "");
                ps.type = p.optString("type", "");
                ps.enabled = p.optBoolean("enabled", true);
                ps.classification = p.optString("classification", "internal");
                ps.retentionDays = p.has("retentionDays") && !p.isNull("retentionDays")
                    ? p.optInt("retentionDays") : null;
                result.policies.add(ps);
            }
        }

        return result;
    }

    public boolean isCompliant() { return score >= 80 && summary != null && summary.criticalIssues == 0; }
    public boolean hasCriticalIssues() { return summary != null && summary.criticalIssues > 0; }

    public String getScoreColor() {
        if (score >= 90) return "🟢";
        if (score >= 70) return "🟡";
        if (score >= 50) return "🟠";
        return "🔴";
    }

    public String getSummaryLine() {
        if (summary == null) return "No compliance data";
        return String.format("%s Score: %d/100 — %d issues (%d critical)",
            getScoreColor(), score, summary.issuesFound, summary != null ? summary.criticalIssues : 0);
    }
}
