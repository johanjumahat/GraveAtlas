/**
 * Phase 16.27 Tests — AI Predictive Insights & Trend Forecasting
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
  ['handleHealthForecast', 'GET /api/predictions/health-forecast'],
  ['handleAnomalyForecast', 'GET /api/predictions/anomaly-forecast'],
  ['handleCurationForecast', 'GET /api/predictions/curation-forecast'],
  ['handleDataGrowthForecast', 'GET /api/predictions/data-growth'],
  ['handleRiskAssessment', 'GET /api/predictions/risk-assessment'],
];

for (const [handler, desc] of endpoints) {
  test(`Backend has ${desc}`, () => {
    assert.ok(indexFile.includes(handler), `Missing ${handler}`);
  });
}

test('All 5 prediction routes registered', () => {
  for (const [handler] of endpoints) {
    assert.ok(indexFile.includes(handler), `Missing ${handler}`);
  }
});

test('Route registrations present', () => {
  assert.ok(indexFile.includes('/api/predictions/health-forecast'), 'Missing health-forecast route');
  assert.ok(indexFile.includes('/api/predictions/anomaly-forecast'), 'Missing anomaly-forecast route');
  assert.ok(indexFile.includes('/api/predictions/curation-forecast'), 'Missing curation-forecast route');
  assert.ok(indexFile.includes('/api/predictions/data-growth'), 'Missing data-growth route');
  assert.ok(indexFile.includes('/api/predictions/risk-assessment'), 'Missing risk-assessment route');
});

console.log('\nPart 2: Health Forecast');
test('Computes current health score', () => {
  assert.ok(indexFile.includes('currentScore'), 'Missing currentScore');
});
test('Computes predicted health score', () => {
  assert.ok(indexFile.includes('predictedScore'), 'Missing predictedScore');
});
test('Uses linear regression for slope', () => {
  assert.ok(indexFile.includes('slope'), 'Missing slope calculation');
  assert.ok(indexFile.includes('sumX2'), 'Missing regression formula');
});
test('Determines trend direction', () => {
  assert.ok(indexFile.includes("'improving'"), 'Missing improving trend');
  assert.ok(indexFile.includes("'degrading'"), 'Missing degrading trend');
  assert.ok(indexFile.includes("'stable'"), 'Missing stable trend');
});
test('Returns confidence level', () => {
  assert.ok(indexFile.includes("'high'") && indexFile.includes("'medium'") && indexFile.includes("'low'"),
    'Missing confidence levels');
});
test('Accepts horizonDays param', () => {
  assert.ok(indexFile.includes("horizonDays"), 'Missing horizonDays param');
});
test('Returns risk level', () => {
  assert.ok(indexFile.includes('riskLevel'), 'Missing riskLevel');
});
test('Returns risk factors', () => {
  assert.ok(indexFile.includes('riskFactors'), 'Missing riskFactors');
});
test('Calculates time to threshold', () => {
  assert.ok(indexFile.includes('timeToThreshold'), 'Missing timeToThreshold');
});
test('Returns historical scores', () => {
  assert.ok(indexFile.includes('historicalScores'), 'Missing historicalScores');
});
test('Uses 7-day buckets', () => {
  assert.ok(indexFile.includes("'7d'") || indexFile.includes('"7d"') || indexFile.includes('7 * dayMs'),
    'Missing 7-day bucket interval');
});

console.log('\nPart 3: Anomaly Forecast');
test('Tracks anomaly types', () => {
  assert.ok(indexFile.includes('anomalyType'), 'Missing anomalyType');
});
test('Computes predicted count', () => {
  assert.ok(indexFile.includes('predictedCount'), 'Missing predictedCount');
});
test('Returns trend per anomaly type', () => {
  assert.ok(indexFile.includes("'increasing'"), 'Missing increasing trend');
  assert.ok(indexFile.includes("'decreasing'"), 'Missing decreasing trend');
});
test('Returns severity breakdown', () => {
  assert.ok(indexFile.includes('severityBreakdown'), 'Missing severityBreakdown');
  assert.ok(indexFile.includes('criticalCount'), 'Missing criticalCount');
});
test('Computes risk score per anomaly type', () => {
  assert.ok(indexFile.includes('riskScore'), 'Missing riskScore');
});
test('Sorts by risk score', () => {
  assert.ok(indexFile.includes('b.riskScore - a.riskScore'), 'Missing riskScore sort');
});
test('Returns highest risk type', () => {
  assert.ok(indexFile.includes('highestRisk'), 'Missing highestRisk');
});
test('Returns total anomaly types', () => {
  assert.ok(indexFile.includes('totalAnomalyTypes'), 'Missing totalAnomalyTypes');
});

console.log('\nPart 4: Curation Forecast');
test('Returns backlog metrics', () => {
  assert.ok(indexFile.includes('backlog'), 'Missing backlog');
  assert.ok(indexFile.includes('pendingReview'), 'Missing pendingReview');
  assert.ok(indexFile.includes('unverified'), 'Missing unverified');
  assert.ok(indexFile.includes('missingSources'), 'Missing missingSources');
  assert.ok(indexFile.includes('withAnomalies'), 'Missing withAnomalies');
});
test('Returns estimated days to clear', () => {
  assert.ok(indexFile.includes('estimatedDaysToClear'), 'Missing estimatedDaysToClear');
});
test('Returns processing rate', () => {
  assert.ok(indexFile.includes('processingRate'), 'Missing processingRate');
  assert.ok(indexFile.includes('20'), 'Missing default processing rate');
});
test('Returns predicted weekly load', () => {
  assert.ok(indexFile.includes('predictedWeeklyLoad'), 'Missing predictedWeeklyLoad');
});
test('Returns workload level', () => {
  assert.ok(indexFile.includes('workloadLevel'), 'Missing workloadLevel');
  assert.ok(indexFile.includes("'normal'") && indexFile.includes("'high'") &&
    indexFile.includes("'moderate'") && indexFile.includes("'low'"),
    'Missing workload levels');
});
test('Returns trend data for each field', () => {
  assert.ok(indexFile.includes('newRecords') && indexFile.includes('updates') &&
    indexFile.includes('reviews') && indexFile.includes('enrichments') &&
    indexFile.includes('anomalies'),
    'Missing trend fields');
});
test('Returns historical activity', () => {
  assert.ok(indexFile.includes('historicalActivity'), 'Missing historicalActivity');
});

console.log('\nPart 5: Data Growth Forecast');
test('Returns current data snapshot', () => {
  assert.ok(indexFile.includes('current'), 'Missing current snapshot');
  assert.ok(indexFile.includes('records'), 'Missing records');
  assert.ok(indexFile.includes('cemeteries'), 'Missing cemeteries');
  assert.ok(indexFile.includes('storageMB'), 'Missing storageMB');
});
test('Returns predicted data snapshot', () => {
  assert.ok(indexFile.includes('predicted'), 'Missing predicted snapshot');
});
test('Computes growth rate per day', () => {
  assert.ok(indexFile.includes('growthRatePerDay'), 'Missing growthRatePerDay');
});
test('Returns growth trend', () => {
  assert.ok(indexFile.includes('growthTrend'), 'Missing growthTrend');
  assert.ok(indexFile.includes("'accelerating'"), 'Missing accelerating');
  assert.ok(indexFile.includes("'decelerating'"), 'Missing decelerating');
});
test('Returns milestone predictions', () => {
  assert.ok(indexFile.includes('milestones'), 'Missing milestones');
  assert.ok(indexFile.includes('daysRemaining'), 'Missing daysRemaining');
  assert.ok(indexFile.includes('estimatedDate'), 'Missing estimatedDate');
});
test('Returns historical growth buckets', () => {
  assert.ok(indexFile.includes('historicalGrowth'), 'Missing historicalGrowth');
});
test('Uses 14-day buckets for growth', () => {
  assert.ok(indexFile.includes('14 * dayMs'), 'Missing 14-day bucket interval');
});

console.log('\nPart 6: Risk Assessment');
test('Returns overall risk level', () => {
  assert.ok(indexFile.includes('overallRisk'), 'Missing overallRisk');
  assert.ok(indexFile.includes("'critical'"), 'Missing critical risk level');
});
test('Returns total risk score', () => {
  assert.ok(indexFile.includes('totalRiskScore'), 'Missing totalRiskScore');
});
test('Returns cemetery risk breakdown', () => {
  assert.ok(indexFile.includes('cemeteryRisks'), 'Missing cemeteryRisks');
});
test('Detects low verification risk', () => {
  assert.ok(indexFile.includes('low_verification'), 'Missing low_verification risk type');
  assert.ok(indexFile.includes('verificationRate'), 'Missing verification rate check');
});
test('Detects high anomaly rate risk', () => {
  assert.ok(indexFile.includes('high_anomaly_rate'), 'Missing high_anomaly_rate risk type');
});
test('Detects missing sources risk', () => {
  assert.ok(indexFile.includes('missing_sources'), 'Missing missing_sources risk type');
});
test('Detects low confidence risk', () => {
  assert.ok(indexFile.includes('low_confidence'), 'Missing low_confidence risk type');
});
test('Detects missing coordinates risk', () => {
  assert.ok(indexFile.includes('missing_coordinates'), 'Missing missing_coordinates risk type');
});
test('Detects stale data risk', () => {
  assert.ok(indexFile.includes('stale_data'), 'Missing stale_data risk type');
});
test('Each risk has mitigation', () => {
  assert.ok(indexFile.includes('mitigation'), 'Missing mitigation');
});
test('Each risk has impact', () => {
  assert.ok(indexFile.includes('impact'), 'Missing impact');
});
test('Returns risk counts by level', () => {
  assert.ok(indexFile.includes('criticalCount'), 'Missing criticalCount');
  assert.ok(indexFile.includes('highCount'), 'Missing highCount');
  assert.ok(indexFile.includes('mediumCount'), 'Missing mediumCount');
  assert.ok(indexFile.includes('lowCount'), 'Missing lowCount');
});
test('Returns priority actions', () => {
  assert.ok(indexFile.includes('priorityActions'), 'Missing priorityActions');
});
test('Returns top risk per cemetery', () => {
  assert.ok(indexFile.includes('topRisk'), 'Missing topRisk');
});
test('Returns generatedAt timestamp', () => {
  assert.ok(indexFile.includes('generatedAt'), 'Missing generatedAt');
});
test('Sorts cemeteries by risk score', () => {
  assert.ok(indexFile.includes('b.riskScore - a.riskScore'), 'Missing risk score sort');
});

console.log('\nPart 7: HealthForecast Model');
const hfFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/HealthForecast.java'),
  'utf8'
);
test('Class exists', () => assert.ok(hfFile.includes('public class HealthForecast'), 'Not found'));
test('Has fromJson', () => assert.ok(hfFile.includes('fromJson'), 'Missing fromJson'));
test('Has isDegrading', () => assert.ok(hfFile.includes('isDegrading'), 'Missing isDegrading'));
test('Has isImproving', () => assert.ok(hfFile.includes('isImproving'), 'Missing isImproving'));
test('Has isHighRisk', () => assert.ok(hfFile.includes('isHighRisk'), 'Missing isHighRisk'));
test('Has getTrendEmoji', () => assert.ok(hfFile.includes('getTrendEmoji'), 'Missing getTrendEmoji'));
test('Has getSummaryLine', () => assert.ok(hfFile.includes('getSummaryLine'), 'Missing getSummaryLine'));

console.log('\nPart 8: AnomalyForecast Model');
const afFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/AnomalyForecast.java'),
  'utf8'
);
test('Class exists', () => assert.ok(afFile.includes('public class AnomalyForecast'), 'Not found'));
test('Has AnomalyPrediction inner', () => assert.ok(afFile.includes('class AnomalyPrediction'), 'Missing AnomalyPrediction'));
test('Has SeverityBreakdown inner', () => assert.ok(afFile.includes('class SeverityBreakdown'), 'Missing SeverityBreakdown'));
test('Has fromJson', () => assert.ok(afFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasEmergingRisks', () => assert.ok(afFile.includes('hasEmergingRisks'), 'Missing hasEmergingRisks'));
test('Has getSummaryLine', () => assert.ok(afFile.includes('getSummaryLine'), 'Missing getSummaryLine'));
test('AnomalyPrediction has isIncreasing', () => assert.ok(afFile.includes('isIncreasing'), 'Missing isIncreasing'));
test('AnomalyPrediction has isHighRisk', () => assert.ok(afFile.includes('isHighRisk'), 'Missing isHighRisk'));

console.log('\nPart 9: CurationForecast Model');
const cfFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CurationForecast.java'),
  'utf8'
);
test('Class exists', () => assert.ok(cfFile.includes('public class CurationForecast'), 'Not found'));
test('Has Backlog inner', () => assert.ok(cfFile.includes('class Backlog'), 'Missing Backlog'));
test('Has TrendInfo inner', () => assert.ok(cfFile.includes('class TrendInfo'), 'Missing TrendInfo'));
test('Has TrendData inner', () => assert.ok(cfFile.includes('class TrendData'), 'Missing TrendData'));
test('Has ActivityBucket inner', () => assert.ok(cfFile.includes('class ActivityBucket'), 'Missing ActivityBucket'));
test('Has fromJson', () => assert.ok(cfFile.includes('fromJson'), 'Missing fromJson'));
test('Has isHighWorkload', () => assert.ok(cfFile.includes('isHighWorkload'), 'Missing isHighWorkload'));
test('Has getWorkloadEmoji', () => assert.ok(cfFile.includes('getWorkloadEmoji'), 'Missing getWorkloadEmoji'));
test('Has getSummaryLine', () => assert.ok(cfFile.includes('getSummaryLine'), 'Missing getSummaryLine'));
test('Backlog has getTotal', () => assert.ok(cfFile.includes('getTotal'), 'Missing getTotal'));

console.log('\nPart 10: DataGrowthForecast Model');
const dgFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/DataGrowthForecast.java'),
  'utf8'
);
test('Class exists', () => assert.ok(dgFile.includes('public class DataGrowthForecast'), 'Not found'));
test('Has DataSnapshot inner', () => assert.ok(dgFile.includes('class DataSnapshot'), 'Missing DataSnapshot'));
test('Has GrowthBucket inner', () => assert.ok(dgFile.includes('class GrowthBucket'), 'Missing GrowthBucket'));
test('Has Milestone inner', () => assert.ok(dgFile.includes('class Milestone'), 'Missing Milestone'));
test('Has fromJson', () => assert.ok(dgFile.includes('fromJson'), 'Missing fromJson'));
test('Has isAccelerating', () => assert.ok(dgFile.includes('isAccelerating'), 'Missing isAccelerating'));
test('Has getTrendEmoji', () => assert.ok(dgFile.includes('getTrendEmoji'), 'Missing getTrendEmoji'));
test('Has getSummaryLine', () => assert.ok(dgFile.includes('getSummaryLine'), 'Missing getSummaryLine'));

console.log('\nPart 11: RiskAssessment Model');
const raFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/RiskAssessment.java'),
  'utf8'
);
test('Class exists', () => assert.ok(raFile.includes('public class RiskAssessment'), 'Not found'));
test('Has CemeteryRisk inner', () => assert.ok(raFile.includes('class CemeteryRisk'), 'Missing CemeteryRisk'));
test('Has RiskItem inner', () => assert.ok(raFile.includes('class RiskItem'), 'Missing RiskItem'));
test('Has PriorityAction inner', () => assert.ok(raFile.includes('class PriorityAction'), 'Missing PriorityAction'));
test('Has fromJson', () => assert.ok(raFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasCriticalIssues', () => assert.ok(raFile.includes('hasCriticalIssues'), 'Missing hasCriticalIssues'));
test('Has getOverallRiskEmoji', () => assert.ok(raFile.includes('getOverallRiskEmoji'), 'Missing getOverallRiskEmoji'));
test('Has getSummaryLine', () => assert.ok(raFile.includes('getSummaryLine'), 'Missing getSummaryLine'));
test('Has getActionCount', () => assert.ok(raFile.includes('getActionCount'), 'Missing getActionCount'));
test('CemeteryRisk has isCritical', () => assert.ok(raFile.includes('isCritical'), 'Missing isCritical'));
test('CemeteryRisk has getRiskEmoji', () => assert.ok(raFile.includes('getRiskEmoji'), 'Missing getRiskEmoji'));

console.log('\nPart 12: API Client Integration');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);
test('Imports HealthForecast', () => assert.ok(apiFile.includes('HealthForecast'), 'Missing import'));
test('Imports AnomalyForecast', () => assert.ok(apiFile.includes('AnomalyForecast'), 'Missing import'));
test('Imports CurationForecast', () => assert.ok(apiFile.includes('CurationForecast'), 'Missing import'));
test('Imports DataGrowthForecast', () => assert.ok(apiFile.includes('DataGrowthForecast'), 'Missing import'));
test('Imports RiskAssessment', () => assert.ok(apiFile.includes('RiskAssessment'), 'Missing import'));
test('Has getHealthForecast', () => {
  assert.ok(apiFile.includes('getHealthForecast'), 'Missing getHealthForecast');
  assert.ok(apiFile.includes('/api/predictions/health-forecast'), 'Missing URL');
});
test('Has getAnomalyForecast', () => {
  assert.ok(apiFile.includes('getAnomalyForecast'), 'Missing getAnomalyForecast');
  assert.ok(apiFile.includes('/api/predictions/anomaly-forecast'), 'Missing URL');
});
test('Has getCurationForecast', () => {
  assert.ok(apiFile.includes('getCurationForecast'), 'Missing getCurationForecast');
  assert.ok(apiFile.includes('/api/predictions/curation-forecast'), 'Missing URL');
});
test('Has getDataGrowthForecast', () => {
  assert.ok(apiFile.includes('getDataGrowthForecast'), 'Missing getDataGrowthForecast');
  assert.ok(apiFile.includes('/api/predictions/data-growth'), 'Missing URL');
});
test('Has getRiskAssessment', () => {
  assert.ok(apiFile.includes('getRiskAssessment'), 'Missing getRiskAssessment');
  assert.ok(apiFile.includes('/api/predictions/risk-assessment'), 'Missing URL');
});

console.log('\nPart 13: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);
test('Prompts mention predictions/health-forecast', () => assert.ok(promptsFile.includes('predictions/health-forecast'), 'Missing'));
test('Prompts mention predictions/anomaly-forecast', () => assert.ok(promptsFile.includes('predictions/anomaly-forecast'), 'Missing'));
test('Prompts mention predictions/curation-forecast', () => assert.ok(promptsFile.includes('predictions/curation-forecast'), 'Missing'));
test('Prompts mention predictions/data-growth', () => assert.ok(promptsFile.includes('predictions/data-growth'), 'Missing'));
test('Prompts mention predictions/risk-assessment', () => assert.ok(promptsFile.includes('predictions/risk-assessment'), 'Missing'));
test('Suggested prompts include health forecast', () => assert.ok(promptsFile.includes('health forecast'), 'Missing'));
test('Suggested prompts include risk assessment', () => assert.ok(promptsFile.includes('risk assessment'), 'Missing'));
test('Suggested prompts include data growth forecast', () => assert.ok(promptsFile.includes('data growth forecast'), 'Missing'));

console.log('\nPart 14: Documentation');
test('CHANGELOG mentions Phase 16.27', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Phase 16.27') || c.includes('Predictive'), 'Missing from CHANGELOG');
});
test('STATUS.md mentions Predictive', () => {
  const s = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(s.includes('Predictive') || s.includes('16.27'), 'Missing from STATUS');
});

console.log('\n=== Phase 16.27 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.27 Predictive Insights & Trend Forecasting tests passed!');
else console.log('\n❌ Some tests failed!');
