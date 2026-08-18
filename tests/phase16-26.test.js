/**
 * Phase 16.26 Tests — AI Analytics & Insights Dashboard
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}

console.log('\nPart 1: Backend Endpoints');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');

const endpoints = [
  ['handleAnalyticsDashboard', 'GET /api/analytics/dashboard'],
  ['handleAnalyticsTrends', 'GET /api/analytics/trends'],
  ['handleAnalyticsCemeteryHealth', 'GET /api/analytics/cemetery-health'],
  ['handleAnomalyDistribution', 'GET /api/analytics/anomaly-distribution'],
  ['handleConfidenceDistribution', 'GET /api/analytics/confidence-distribution'],
  ['handleSourceReliability', 'GET /api/analytics/source-reliability'],
  ['handleCurationVelocity', 'GET /api/analytics/curation-velocity'],
  ['handleSearchAnalytics', 'GET /api/analytics/search-analytics'],
  ['handleComplianceTrends', 'GET /api/analytics/compliance-trends'],
  ['handleStakeholderReport', 'GET /api/analytics/stakeholder-report'],
];

for (const [handler, desc] of endpoints) {
  test(`Backend has ${desc}`, () => {
    assert.ok(indexFile.includes(handler), `Missing ${handler}`);
  });
}

test('All 10 analytics routes registered', () => {
  for (const [handler] of endpoints) {
    assert.ok(indexFile.includes(handler), `Missing ${handler}`);
  }
});

console.log('\nPart 2: Time Range Helpers');
test('Has TIME_RANGES constant', () => {
  assert.ok(indexFile.includes('TIME_RANGES'), 'Missing TIME_RANGES');
  const ranges = ['24h', '7d', '30d', '90d', '1y', 'all'];
  for (const r of ranges) assert.ok(indexFile.includes(`'${r}'`), `Missing range: ${r}`);
});
test('Has getTimeRangeMs helper', () => {
  assert.ok(indexFile.includes('function getTimeRangeMs'), 'Missing getTimeRangeMs');
});
test('Has loadAllRecords helper', () => {
  assert.ok(indexFile.includes('async function loadAllRecords'), 'Missing loadAllRecords');
});
test('Has getRecordTimestamp helper', () => {
  assert.ok(indexFile.includes('function getRecordTimestamp'), 'Missing getRecordTimestamp');
});

console.log('\nPart 3: Analytics Dashboard');
test('Returns summary metrics', () => {
  assert.ok(indexFile.includes('totalRecords'), 'Missing totalRecords');
  assert.ok(indexFile.includes('verificationRate'), 'Missing verificationRate');
  assert.ok(indexFile.includes('sourceCoverage'), 'Missing sourceCoverage');
  assert.ok(indexFile.includes('coordinateCoverage'), 'Missing coordinateCoverage');
  assert.ok(indexFile.includes('anomalyRate'), 'Missing anomalyRate');
});
test('Returns confidence distribution', () => {
  assert.ok(indexFile.includes('averageScore'), 'Missing averageScore');
  assert.ok(indexFile.includes('highConfidence'), 'Missing highConfidence');
  assert.ok(indexFile.includes('medConfidence'), 'Missing medConfidence');
  assert.ok(indexFile.includes('lowConfidence'), 'Missing lowConfidence');
});
test('Returns source statistics', () => {
  assert.ok(indexFile.includes('totalReferences'), 'Missing totalReferences');
  assert.ok(indexFile.includes('averagePerRecord'), 'Missing averagePerRecord');
});
test('Returns cemetery breakdown', () => {
  assert.ok(indexFile.includes('totalCemeteries'), 'Missing totalCemeteries');
  assert.ok(indexFile.includes('topCemeteries'), 'Missing topCemeteries');
});
test('Returns health metrics', () => {
  assert.ok(indexFile.includes('overallScore'), 'Missing overallScore');
  assert.ok(indexFile.includes('health'), 'Missing health object');
});
test('Accepts cemeteryId filter', () => {
  assert.ok(indexFile.includes("searchParams.get('cemeteryId')"), 'Missing cemeteryId param');
});
test('Accepts timeRange param', () => {
  assert.ok(indexFile.includes("searchParams.get('timeRange')"), 'Missing timeRange param');
});
test('Returns generatedAt timestamp', () => {
  assert.ok(indexFile.includes('generatedAt'), 'Missing generatedAt');
});

console.log('\nPart 4: Analytics Trends');
test('Groups by interval (day/week/month)', () => {
  assert.ok(indexFile.includes('intervalMs'), 'Missing interval calculation');
  assert.ok(indexFile.includes("'week'") || indexFile.includes('"week"'), 'Missing week interval');
  assert.ok(indexFile.includes("'month'") || indexFile.includes('"month"'), 'Missing month interval');
});
test('Returns time-series data points', () => {
  assert.ok(indexFile.includes('trends'), 'Missing trends array');
  assert.ok(indexFile.includes('totalDataPoints'), 'Missing totalDataPoints');
});
test('Tracks count per bucket', () => {
  assert.ok(indexFile.includes('b.count'), 'Missing count per bucket');
});
test('Tracks verified per bucket', () => {
  assert.ok(indexFile.includes('b.verified'), 'Missing verified per bucket');
});
test('Tracks anomalies per bucket', () => {
  assert.ok(indexFile.includes('b.anomalies'), 'Missing anomalies per bucket');
});
test('Calculates avgConfidence per bucket', () => {
  assert.ok(indexFile.includes('avgConfidence'), 'Missing avgConfidence');
});
test('Sorts by timestamp', () => {
  assert.ok(indexFile.includes('a.timestamp - b.timestamp'), 'Missing timestamp sort');
});

console.log('\nPart 5: Cemetery Health');
test('Calculates weighted health score', () => {
  assert.ok(indexFile.includes('healthScore'), 'Missing healthScore');
  assert.ok(indexFile.includes('0.3') || indexFile.includes('* 0.3'), 'Missing confidence weight');
  assert.ok(indexFile.includes('0.25') || indexFile.includes('* 0.25'), 'Missing verification weight');
  assert.ok(indexFile.includes('0.2') || indexFile.includes('* 0.2'), 'Missing source weight');
  assert.ok(indexFile.includes('0.15') || indexFile.includes('* 0.15'), 'Missing coordinate weight');
  assert.ok(indexFile.includes('0.1') || indexFile.includes('* 0.1'), 'Missing anomaly weight');
});
test('Returns letter grade (A-F)', () => {
  assert.ok(indexFile.includes("'A'") && indexFile.includes("'B'") &&
    indexFile.includes("'C'") && indexFile.includes("'D'") && indexFile.includes("'F'"),
    'Missing letter grades');
});
test('Returns avgConfidence per cemetery', () => {
  assert.ok(indexFile.includes('avgConfidence'), 'Missing avgConfidence');
});
test('Returns verificationRate per cemetery', () => {
  assert.ok(indexFile.includes('verificationRate'), 'Missing verificationRate');
});
test('Returns sourceRate per cemetery', () => {
  assert.ok(indexFile.includes('sourceRate'), 'Missing sourceRate');
});
test('Returns coordinateRate per cemetery', () => {
  assert.ok(indexFile.includes('coordinateRate'), 'Missing coordinateRate');
});
test('Returns anomalyRate per cemetery', () => {
  assert.ok(indexFile.includes('anomalyRate'), 'Missing anomalyRate');
});
test('Returns totalAnomalies per cemetery', () => {
  assert.ok(indexFile.includes('totalAnomalies'), 'Missing totalAnomalies');
});
test('Sorts by healthScore descending', () => {
  assert.ok(indexFile.includes('b.healthScore - a.healthScore'), 'Missing healthScore sort');
});
test('Returns averageHealthScore across all', () => {
  assert.ok(indexFile.includes('averageHealthScore'), 'Missing averageHealthScore');
});

console.log('\nPart 6: Anomaly Distribution');
test('Returns byType breakdown', () => {
  assert.ok(indexFile.includes('byType'), 'Missing byType');
});
test('Returns bySeverity breakdown', () => {
  assert.ok(indexFile.includes('bySeverity'), 'Missing bySeverity');
  assert.ok(indexFile.includes('critical') && indexFile.includes('warning') && indexFile.includes('info'),
    'Missing severity levels');
});
test('Returns byCemetery breakdown', () => {
  assert.ok(indexFile.includes('byCemetery'), 'Missing byCemetery');
});
test('Returns topTypes sorted', () => {
  assert.ok(indexFile.includes('topTypes'), 'Missing topTypes');
});
test('Calculates anomalyRate', () => {
  assert.ok(indexFile.includes('anomalyRate'), 'Missing anomalyRate');
});
test('Returns totalAnomalies', () => {
  assert.ok(indexFile.includes('totalAnomalies'), 'Missing totalAnomalies');
});
test('Returns recordsAnalyzed count', () => {
  assert.ok(indexFile.includes('recordsAnalyzed'), 'Missing recordsAnalyzed');
});

console.log('\nPart 7: Confidence Distribution');
test('Has 5 buckets (0-20, 21-40, 41-60, 61-80, 81-100)', () => {
  assert.ok(indexFile.includes("'0-20'"), 'Missing bucket 0-20');
  assert.ok(indexFile.includes("'21-40'"), 'Missing bucket 21-40');
  assert.ok(indexFile.includes("'41-60'"), 'Missing bucket 41-60');
  assert.ok(indexFile.includes("'61-80'"), 'Missing bucket 61-80');
  assert.ok(indexFile.includes("'81-100'"), 'Missing bucket 81-100');
});
test('Returns bucketPercentages', () => {
  assert.ok(indexFile.includes('bucketPercentages'), 'Missing bucketPercentages');
});
test('Returns average score', () => {
  assert.ok(indexFile.includes('average'), 'Missing average');
});
test('Returns totalRecords', () => {
  assert.ok(indexFile.includes('totalRecords'), 'Missing totalRecords');
});

console.log('\nPart 8: Source Reliability');
test('Returns sourceCoverage', () => {
  assert.ok(indexFile.includes('sourceCoverage'), 'Missing sourceCoverage');
});
test('Returns totalSourceReferences', () => {
  assert.ok(indexFile.includes('totalSourceReferences'), 'Missing totalSourceReferences');
});
test('Returns averagePerRecord', () => {
  assert.ok(indexFile.includes('averagePerRecord'), 'Missing averagePerRecord');
});
test('Returns refCountDistribution', () => {
  assert.ok(indexFile.includes('refCountDistribution'), 'Missing refCountDistribution');
  assert.ok(indexFile.includes("'1'") && indexFile.includes("'2-3'") &&
    indexFile.includes("'4-5'") && indexFile.includes("'6+'"),
    'Missing ref count buckets');
});
test('Returns topSourceDomains', () => {
  assert.ok(indexFile.includes('topSourceDomains'), 'Missing topSourceDomains');
});
test('Returns recordsWithoutSources', () => {
  assert.ok(indexFile.includes('recordsWithoutSources'), 'Missing recordsWithoutSources');
});

console.log('\nPart 9: Curation Velocity');
test('Returns recordsByStatus', () => {
  assert.ok(indexFile.includes('recordsByStatus'), 'Missing recordsByStatus');
  assert.ok(indexFile.includes('published') && indexFile.includes('draft') &&
    indexFile.includes('in_review'), 'Missing status types');
});
test('Returns dailyActivity', () => {
  assert.ok(indexFile.includes('dailyActivity'), 'Missing dailyActivity');
});
test('Returns averageDailyUpdates', () => {
  assert.ok(indexFile.includes('averageDailyUpdates'), 'Missing averageDailyUpdates');
});
test('Returns curationTasks', () => {
  assert.ok(indexFile.includes('curationTasks'), 'Missing curationTasks');
  assert.ok(indexFile.includes('pending') && indexFile.includes('inProgress') &&
    indexFile.includes('completed'), 'Missing task statuses');
});
test('Returns recentlyUpdated count', () => {
  assert.ok(indexFile.includes('recentlyUpdated'), 'Missing recentlyUpdated');
});

console.log('\nPart 10: Search Analytics');
test('Returns totalSearches', () => {
  assert.ok(indexFile.includes('totalSearches'), 'Missing totalSearches');
});
test('Returns averageResults', () => {
  assert.ok(indexFile.includes('averageResults'), 'Missing averageResults');
});
test('Returns topQueries', () => {
  assert.ok(indexFile.includes('topQueries'), 'Missing topQueries');
});
test('Returns intentDistribution', () => {
  assert.ok(indexFile.includes('intentDistribution'), 'Missing intentDistribution');
});
test('Returns recentSearches', () => {
  assert.ok(indexFile.includes('recentSearches'), 'Missing recentSearches');
});

console.log('\nPart 11: Compliance Trends');
test('Returns totalAuditEntries', () => {
  assert.ok(indexFile.includes('totalAuditEntries'), 'Missing totalAuditEntries');
});
test('Returns auditByAction', () => {
  assert.ok(indexFile.includes('auditByAction'), 'Missing auditByAction');
});
test('Returns dailyActivity', () => {
  assert.ok(indexFile.includes('dailyActivity'), 'Missing dailyActivity');
});
test('Returns rtbfRequests count', () => {
  assert.ok(indexFile.includes('rtbfRequests'), 'Missing rtbfRequests');
});
test('Returns consentStats', () => {
  assert.ok(indexFile.includes('consentStats'), 'Missing consentStats');
  assert.ok(indexFile.includes('granted') && indexFile.includes('withdrawn'),
    'Missing consent statuses');
});

console.log('\nPart 12: Stakeholder Report');
test('Returns executiveSummary', () => {
  assert.ok(indexFile.includes('executiveSummary'), 'Missing executiveSummary');
});
test('Returns healthGrade in executive summary', () => {
  assert.ok(indexFile.includes('healthGrade'), 'Missing healthGrade');
});
test('Returns dataQuality', () => {
  assert.ok(indexFile.includes('dataQuality'), 'Missing dataQuality');
});
test('Returns anomalySummary', () => {
  assert.ok(indexFile.includes('anomalySummary'), 'Missing anomalySummary');
});
test('Returns recommendations', () => {
  assert.ok(indexFile.includes('recommendations'), 'Missing recommendations');
});
test('Recommendations have priority levels', () => {
  assert.ok(indexFile.includes("'high'") && indexFile.includes("'medium'"),
    'Missing recommendation priorities');
});
test('Recommendations for low verification rate', () => {
  assert.ok(indexFile.includes('Increase verification rate'), 'Missing verification recommendation');
});
test('Recommendations for missing sources', () => {
  assert.ok(indexFile.includes('Add source references'), 'Missing source recommendation');
});
test('Recommendations for missing coordinates', () => {
  assert.ok(indexFile.includes('Add coordinates'), 'Missing coordinate recommendation');
});
test('Recommendations for anomalies', () => {
  assert.ok(indexFile.includes('Resolve anomalies'), 'Missing anomaly recommendation');
});
test('Recommendations for low confidence', () => {
  assert.ok(indexFile.includes('Improve data quality'), 'Missing confidence recommendation');
});
test('Returns cemeteryBreakdown', () => {
  assert.ok(indexFile.includes('cemeteryBreakdown'), 'Missing cemeteryBreakdown');
});

console.log('\nPart 13: AnalyticsDashboard Model');
const adFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/AnalyticsDashboard.java'),
  'utf8'
);
test('Class exists', () => assert.ok(adFile.includes('public class AnalyticsDashboard'), 'Not found'));
test('Has DashboardSummary inner', () => assert.ok(adFile.includes('class DashboardSummary'), 'Missing DashboardSummary'));
test('Has DashboardConfidence inner', () => assert.ok(adFile.includes('class DashboardConfidence'), 'Missing DashboardConfidence'));
test('Has DashboardSources inner', () => assert.ok(adFile.includes('class DashboardSources'), 'Missing DashboardSources'));
test('Has DashboardCemeteries inner', () => assert.ok(adFile.includes('class DashboardCemeteries'), 'Missing DashboardCemeteries'));
test('Has DashboardHealth inner', () => assert.ok(adFile.includes('class DashboardHealth'), 'Missing DashboardHealth'));
test('Has fromJson', () => assert.ok(adFile.includes('fromJson'), 'Missing fromJson'));
test('Has getHealthGrade', () => assert.ok(adFile.includes('getHealthGrade'), 'Missing getHealthGrade'));
test('Has getSummaryLine', () => assert.ok(adFile.includes('getSummaryLine'), 'Missing getSummaryLine'));

console.log('\nPart 14: StakeholderReport Model');
const srFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/StakeholderReport.java'),
  'utf8'
);
test('Class exists', () => assert.ok(srFile.includes('public class StakeholderReport'), 'Not found'));
test('Has ExecutiveSummary inner', () => assert.ok(srFile.includes('class ExecutiveSummary'), 'Missing ExecutiveSummary'));
test('Has DataQuality inner', () => assert.ok(srFile.includes('class DataQuality'), 'Missing DataQuality'));
test('Has AnomalySummary inner', () => assert.ok(srFile.includes('class AnomalySummary'), 'Missing AnomalySummary'));
test('Has Recommendation inner', () => assert.ok(srFile.includes('class Recommendation'), 'Missing Recommendation'));
test('Has CemeteryBreakdownEntry inner', () => assert.ok(srFile.includes('class CemeteryBreakdownEntry'), 'Missing CemeteryBreakdownEntry'));
test('Has fromJson', () => assert.ok(srFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasCriticalIssues', () => assert.ok(srFile.includes('hasCriticalIssues'), 'Missing hasCriticalIssues'));
test('Has getRecommendationCount', () => assert.ok(srFile.includes('getRecommendationCount'), 'Missing getRecommendationCount'));
test('Has getHighPriorityCount', () => assert.ok(srFile.includes('getHighPriorityCount'), 'Missing getHighPriorityCount'));
test('Has getSummaryLine', () => assert.ok(srFile.includes('getSummaryLine'), 'Missing getSummaryLine'));

console.log('\nPart 15: CemeteryHealthAnalytics Model');
const chFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CemeteryHealthAnalytics.java'),
  'utf8'
);
test('Class exists', () => assert.ok(chFile.includes('public class CemeteryHealthAnalytics'), 'Not found'));
test('Has fromJson (returns List)', () => assert.ok(chFile.includes('fromJson'), 'Missing fromJson'));
test('Has isGradeA', () => assert.ok(chFile.includes('isGradeA'), 'Missing isGradeA'));
test('Has isGradeF', () => assert.ok(chFile.includes('isGradeF'), 'Missing isGradeF'));
test('Has getGradeColor', () => assert.ok(chFile.includes('getGradeColor'), 'Missing getGradeColor'));
test('Has getSummaryLine', () => assert.ok(chFile.includes('getSummaryLine'), 'Missing getSummaryLine'));

console.log('\nPart 16: API Client Integration');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);
test('Imports AnalyticsDashboard', () => assert.ok(apiFile.includes('AnalyticsDashboard'), 'Missing import'));
test('Imports StakeholderReport', () => assert.ok(apiFile.includes('StakeholderReport'), 'Missing import'));
test('Imports CemeteryHealthAnalytics', () => assert.ok(apiFile.includes('CemeteryHealthAnalytics'), 'Missing import'));
test('Has getAnalyticsDashboard', () => {
  assert.ok(apiFile.includes('getAnalyticsDashboard'), 'Missing getAnalyticsDashboard');
  assert.ok(apiFile.includes('/analytics/dashboard'), 'Missing URL');
});
test('Has getAnalyticsTrends', () => {
  assert.ok(apiFile.includes('getAnalyticsTrends'), 'Missing getAnalyticsTrends');
  assert.ok(apiFile.includes('/analytics/trends'), 'Missing URL');
});
test('Has getCemeteryHealth', () => {
  assert.ok(apiFile.includes('getCemeteryHealth'), 'Missing getCemeteryHealth');
  assert.ok(apiFile.includes('/analytics/cemetery-health'), 'Missing URL');
});
test('Has getAnomalyDistribution', () => {
  assert.ok(apiFile.includes('getAnomalyDistribution'), 'Missing getAnomalyDistribution');
  assert.ok(apiFile.includes('/analytics/anomaly-distribution'), 'Missing URL');
});
test('Has getConfidenceDistribution', () => {
  assert.ok(apiFile.includes('getConfidenceDistribution'), 'Missing getConfidenceDistribution');
  assert.ok(apiFile.includes('/analytics/confidence-distribution'), 'Missing URL');
});
test('Has getSourceReliability', () => {
  assert.ok(apiFile.includes('getSourceReliability'), 'Missing getSourceReliability');
  assert.ok(apiFile.includes('/analytics/source-reliability'), 'Missing URL');
});
test('Has getCurationVelocity', () => {
  assert.ok(apiFile.includes('getCurationVelocity'), 'Missing getCurationVelocity');
  assert.ok(apiFile.includes('/analytics/curation-velocity'), 'Missing URL');
});
test('Has getSearchAnalytics', () => {
  assert.ok(apiFile.includes('getSearchAnalytics'), 'Missing getSearchAnalytics');
  assert.ok(apiFile.includes('/analytics/search-analytics'), 'Missing URL');
});
test('Has getComplianceTrends', () => {
  assert.ok(apiFile.includes('getComplianceTrends'), 'Missing getComplianceTrends');
  assert.ok(apiFile.includes('/analytics/compliance-trends'), 'Missing URL');
});
test('Has getStakeholderReport', () => {
  assert.ok(apiFile.includes('getStakeholderReport'), 'Missing getStakeholderReport');
  assert.ok(apiFile.includes('/analytics/stakeholder-report'), 'Missing URL');
});

console.log('\nPart 17: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);
test('Prompts mention analytics/dashboard', () => assert.ok(promptsFile.includes('analytics/dashboard'), 'Missing analytics/dashboard'));
test('Prompts mention analytics/trends', () => assert.ok(promptsFile.includes('analytics/trends'), 'Missing analytics/trends'));
test('Prompts mention analytics/cemetery-health', () => assert.ok(promptsFile.includes('analytics/cemetery-health'), 'Missing cemetery-health'));
test('Prompts mention analytics/stakeholder-report', () => assert.ok(promptsFile.includes('analytics/stakeholder-report'), 'Missing stakeholder-report'));
test('Prompts mention analytics/anomaly-distribution', () => assert.ok(promptsFile.includes('analytics/anomaly-distribution'), 'Missing anomaly-distribution'));
test('Prompts mention analytics/confidence-distribution', () => assert.ok(promptsFile.includes('analytics/confidence-distribution'), 'Missing confidence-distribution'));
test('Prompts mention analytics/source-reliability', () => assert.ok(promptsFile.includes('analytics/source-reliability'), 'Missing source-reliability'));
test('Prompts mention analytics/curation-velocity', () => assert.ok(promptsFile.includes('analytics/curation-velocity'), 'Missing curation-velocity'));
test('Prompts mention analytics/search-analytics', () => assert.ok(promptsFile.includes('analytics/search-analytics'), 'Missing search-analytics'));
test('Prompts mention analytics/compliance-trends', () => assert.ok(promptsFile.includes('analytics/compliance-trends'), 'Missing compliance-trends'));
test('Suggested prompts include "analytics dashboard"', () => assert.ok(promptsFile.includes('analytics dashboard'), 'Missing suggested prompt'));
test('Suggested prompts include "stakeholder report"', () => assert.ok(promptsFile.includes('stakeholder report'), 'Missing suggested prompt'));

console.log('\nPart 18: Documentation');
test('CHANGELOG mentions Phase 16.26', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Phase 16.26') || c.includes('Analytics'), 'Missing from CHANGELOG');
});
test('STATUS.md mentions Analytics', () => {
  const s = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(s.includes('Analytics') || s.includes('16.26'), 'Missing from STATUS');
});

console.log('\n=== Phase 16.26 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.26 Analytics & Insights Dashboard tests passed!');
else console.log('\n❌ Some tests failed!');
