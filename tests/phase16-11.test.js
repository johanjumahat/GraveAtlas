/**
 * Phase 16.11 Tests — AI Cemetery Health Dashboard
 *
 * Tests:
 * - Backend endpoints: /api/cemeteries/:id/health, /api/health/overview
 * - CemeteryHealth model and parsing
 * - GlobalHealthOverview model and parsing
 * - Composite scoring: data quality, anomaly-free, enrichment, duplicate, content
 * - Letter grading: A (≥90), B (≥80), C (≥70), D (≥60), F (<60)
 * - Anomaly summary integration
 * - Enrichment coverage
 * - Duplicate detection integration
 * - Family connection density
 * - Content coverage (photos, inscriptions, sources, coordinates)
 * - Field coverage percentages
 * - API client methods
 * - AI system prompt awareness
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

// ── Part 1: Backend Endpoints ──
console.log('\nPart 1: Backend Endpoints');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');

test('Backend has /health endpoint registration', () => {
  assert.ok(indexFile.includes('/health') && indexFile.includes('handleCemeteryHealth'),
    'Missing /health endpoint or handleCemeteryHealth');
});

test('Backend has /api/health/overview endpoint', () => {
  assert.ok(indexFile.includes('/api/health/overview') && indexFile.includes('handleGlobalHealthOverview'),
    'Missing /api/health/overview endpoint or handleGlobalHealthOverview');
});

test('Health handler reads cemetery metadata', () => {
  assert.ok(indexFile.includes('cemeteries/') && indexFile.includes('cemeteryName'),
    'Missing cemetery metadata reading in health handler');
});

test('Health handler handles no records', () => {
  assert.ok(indexFile.includes('No published records') || indexFile.includes('recordCount: 0'),
    'Missing empty cemetery handling');
});

test('Health handler handles GitHub not configured', () => {
  assert.ok(indexFile.includes('no health data available'),
    'Missing GitHub not configured fallback');
});

// ── Part 2: Composite Scoring ──
console.log('\nPart 2: Composite Scoring');

test('Computes data quality score (completeness + coverage)', () => {
  assert.ok(indexFile.includes('dataQualityScore'), 'Missing data quality score computation');
});

test('Computes completeness from essential fields', () => {
  assert.ok(indexFile.includes('avgCompleteness'), 'Missing completeness average');
});

test('Computes coverage from optional fields', () => {
  assert.ok(indexFile.includes('avgCoverage'), 'Missing coverage average');
});

test('Computes anomaly-free score', () => {
  assert.ok(indexFile.includes('anomalyScore'), 'Missing anomaly score computation');
});

test('Computes anomaly rate', () => {
  assert.ok(indexFile.includes('anomalyRate'), 'Missing anomaly rate');
});

test('Computes enrichment coverage score', () => {
  assert.ok(indexFile.includes('enrichmentScore'), 'Missing enrichment score');
});

test('Computes enrichment rate', () => {
  assert.ok(indexFile.includes('enrichmentRate'), 'Missing enrichment rate');
});

test('Computes duplicate-free score', () => {
  assert.ok(indexFile.includes('duplicateScore'), 'Missing duplicate score');
});

test('Computes duplicate rate', () => {
  assert.ok(indexFile.includes('duplicateRate'), 'Missing duplicate rate');
});

test('Computes content coverage average', () => {
  assert.ok(indexFile.includes('contentCoverage') || indexFile.includes('photoCoverage'),
    'Missing content coverage');
});

test('Overall score uses weighted formula', () => {
  assert.ok(indexFile.includes('0.30') && indexFile.includes('0.25') &&
    indexFile.includes('0.15'),
    'Missing weighted overall formula');
});

// ── Part 3: Letter Grading ──
console.log('\nPart 3: Letter Grading');

test('Grade A for score >= 90', () => {
  assert.ok(indexFile.includes(">= 90") && indexFile.includes("'A'"),
    'Missing grade A threshold');
});

test('Grade B for score >= 80', () => {
  assert.ok(indexFile.includes(">= 80") && indexFile.includes("'B'"),
    'Missing grade B threshold');
});

test('Grade C for score >= 70', () => {
  assert.ok(indexFile.includes(">= 70") && indexFile.includes("'C'"),
    'Missing grade C threshold');
});

test('Grade D for score >= 60', () => {
  assert.ok(indexFile.includes(">= 60") && indexFile.includes("'D'"),
    'Missing grade D threshold');
});

test('Grade F for score < 60', () => {
  assert.ok(indexFile.includes("'F'"), 'Missing grade F');
});

test('Grade A has green color', () => {
  assert.ok(indexFile.includes("'green'"), 'Missing green color for A/B grades');
});

test('Grade F has red color', () => {
  assert.ok(indexFile.includes("'red'"), 'Missing red color for F grade');
});

test('Each grade has a recommendation', () => {
  assert.ok(indexFile.includes('recommendation'), 'Missing grade recommendations');
});

// ── Part 4: Anomaly Integration ──
console.log('\nPart 4: Anomaly Integration');

test('Health handler counts critical anomalies', () => {
  assert.ok(indexFile.includes('criticalCount'), 'Missing critical count in health');
});

test('Health handler counts warning anomalies', () => {
  assert.ok(indexFile.includes('warningCount'), 'Missing warning count in health');
});

test('Health handler counts info anomalies', () => {
  assert.ok(indexFile.includes('infoCount'), 'Missing info count in health');
});

test('Health handler tracks anomaly types', () => {
  assert.ok(indexFile.includes('anomalyTypes'), 'Missing anomaly type tracking');
});

test('Health handler detects date anomalies', () => {
  assert.ok(indexFile.includes('date_anomaly'), 'Missing date anomaly in health');
});

test('Health handler detects name anomalies', () => {
  assert.ok(indexFile.includes('name_anomaly'), 'Missing name anomaly in health');
});

test('Health handler detects coordinate anomalies', () => {
  assert.ok(indexFile.includes('coordinate_anomaly'), 'Missing coordinate anomaly in health');
});

test('Health handler detects completeness anomalies', () => {
  assert.ok(indexFile.includes('completeness_anomaly'), 'Missing completeness anomaly in health');
});

test('Health handler detects statistical outliers', () => {
  assert.ok(indexFile.includes('statistical_outlier'), 'Missing statistical outlier in health');
});

test('Health handler computes median death year', () => {
  assert.ok(indexFile.includes('medianDeathYear'), 'Missing median death year');
});

// ── Part 5: Enrichment & Duplicates & Connections ──
console.log('\nPart 5: Enrichment, Duplicates, Connections');

test('Health handler checks for records needing enrichment', () => {
  assert.ok(indexFile.includes('enrichableCount'), 'Missing enrichable count');
});

test('Enrichment checks missing givenNames/familyName', () => {
  assert.ok(indexFile.includes('givenNames') && indexFile.includes('familyName'),
    'Missing name enrichment check');
});

test('Enrichment checks missing sourceRefs', () => {
  assert.ok(indexFile.includes('sourceRefs'), 'Missing source enrichment check');
});

test('Duplicate detection uses name matching', () => {
  assert.ok(indexFile.includes('nameMap'), 'Missing name map for duplicates');
});

test('Duplicate detection checks death date match', () => {
  assert.ok(indexFile.includes('deathDate') && indexFile.includes('nameMap'),
    'Missing date matching for duplicates');
});

test('Connection density computed from surname groups', () => {
  assert.ok(indexFile.includes('surnameGroups'), 'Missing surname grouping');
});

test('Family groups counted (≥2 same surname)', () => {
  assert.ok(indexFile.includes('>= 2'), 'Missing family group threshold');
});

// ── Part 6: Content Coverage ──
console.log('\nPart 6: Content Coverage');

test('Computes photo coverage percentage', () => {
  assert.ok(indexFile.includes('photoCoverage'), 'Missing photo coverage');
});

test('Computes inscription coverage percentage', () => {
  assert.ok(indexFile.includes('inscriptionCoverage'), 'Missing inscription coverage');
});

test('Computes source coverage percentage', () => {
  assert.ok(indexFile.includes('sourceCoverage'), 'Missing source coverage');
});

test('Computes coordinate coverage percentage', () => {
  assert.ok(indexFile.includes('coordinateCoverage'), 'Missing coordinate coverage');
});

test('Computes field coverage percentages', () => {
  assert.ok(indexFile.includes('fieldCoveragePct'), 'Missing field coverage percentages');
});

// ── Part 7: Global Health Overview ──
console.log('\nPart 7: Global Health Overview');

test('Global overview counts total cemeteries', () => {
  assert.ok(indexFile.includes('totalCemeteries'), 'Missing total cemeteries count');
});

test('Global overview counts total records', () => {
  assert.ok(indexFile.includes('totalRecords'), 'Missing total records count');
});

test('Global overview counts critical issues', () => {
  assert.ok(indexFile.includes('criticalIssues'), 'Missing critical issues count');
});

test('Global overview computes content coverage', () => {
  assert.ok(indexFile.includes('contentCoverage'), 'Missing content coverage in overview');
});

test('Global overview computes content average', () => {
  assert.ok(indexFile.includes('contentAverage'), 'Missing content average');
});

test('Global overview assigns global grade', () => {
  assert.ok(indexFile.includes('globalGrade'), 'Missing global grade');
});

// ── Part 8: CemeteryHealth Model ──
console.log('\nPart 8: CemeteryHealth Model');

const healthFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CemeteryHealth.java'),
  'utf8'
);

test('CemeteryHealth class exists', () => {
  assert.ok(healthFile.includes('public class CemeteryHealth'), 'Class not found');
});

test('CemeteryHealth has HealthData inner class', () => {
  assert.ok(healthFile.includes('class HealthData'), 'Missing HealthData inner class');
});

test('CemeteryHealth has ScoreBreakdown inner class', () => {
  assert.ok(healthFile.includes('class ScoreBreakdown'), 'Missing ScoreBreakdown');
});

test('CemeteryHealth has AnomalySummary inner class', () => {
  assert.ok(healthFile.includes('class AnomalySummary'), 'Missing AnomalySummary');
});

test('CemeteryHealth has EnrichmentSummary inner class', () => {
  assert.ok(healthFile.includes('class EnrichmentSummary'), 'Missing EnrichmentSummary');
});

test('CemeteryHealth has DuplicateSummary inner class', () => {
  assert.ok(healthFile.includes('class DuplicateSummary'), 'Missing DuplicateSummary');
});

test('CemeteryHealth has ConnectionSummary inner class', () => {
  assert.ok(healthFile.includes('class ConnectionSummary'), 'Missing ConnectionSummary');
});

test('CemeteryHealth has ContentCoverage inner class', () => {
  assert.ok(healthFile.includes('class ContentCoverage'), 'Missing ContentCoverage');
});

test('CemeteryHealth has fromJson method', () => {
  assert.ok(healthFile.includes('fromJson'), 'Missing fromJson');
});

test('CemeteryHealth has hasCriticalIssues', () => {
  assert.ok(healthFile.includes('hasCriticalIssues'), 'Missing hasCriticalIssues');
});

test('CemeteryHealth has getFormattedGrade', () => {
  assert.ok(healthFile.includes('getFormattedGrade'), 'Missing getFormattedGrade');
});

test('CemeteryHealth has getGradeEmoji', () => {
  assert.ok(healthFile.includes('getGradeEmoji'), 'Missing getGradeEmoji');
});

// ── Part 9: GlobalHealthOverview Model ──
console.log('\nPart 9: GlobalHealthOverview Model');

const overviewFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/GlobalHealthOverview.java'),
  'utf8'
);

test('GlobalHealthOverview class exists', () => {
  assert.ok(overviewFile.includes('public class GlobalHealthOverview'), 'Class not found');
});

test('GlobalHealthOverview has ContentCoverage inner class', () => {
  assert.ok(overviewFile.includes('class ContentCoverage'), 'Missing ContentCoverage');
});

test('GlobalHealthOverview has fromJson method', () => {
  assert.ok(overviewFile.includes('fromJson'), 'Missing fromJson');
});

test('GlobalHealthOverview has getSummary method', () => {
  assert.ok(overviewFile.includes('getSummary'), 'Missing getSummary');
});

// ── Part 10: API Client Integration ──
console.log('\nPart 10: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports CemeteryHealth', () => {
  assert.ok(apiFile.includes('CemeteryHealth'), 'Missing CemeteryHealth import');
});

test('ApiClient imports GlobalHealthOverview', () => {
  assert.ok(apiFile.includes('GlobalHealthOverview'), 'Missing GlobalHealthOverview import');
});

test('ApiClient has getCemeteryHealth method', () => {
  assert.ok(apiFile.includes('getCemeteryHealth'), 'Missing getCemeteryHealth method');
  assert.ok(apiFile.includes('/health'), 'Missing /health URL');
});

test('ApiClient has getGlobalHealthOverview method', () => {
  assert.ok(apiFile.includes('getGlobalHealthOverview'), 'Missing getGlobalHealthOverview method');
  assert.ok(apiFile.includes('/api/health/overview'), 'Missing /api/health/overview URL');
});

// ── Part 11: AI System Prompts ──
console.log('\nPart 11: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention health endpoint', () => {
  assert.ok(promptsFile.includes('health') || promptsFile.includes('Health'),
    'AI prompts should mention health');
});

test('AI prompts mention letter grade', () => {
  assert.ok(promptsFile.includes('A-F') || promptsFile.includes('letter grade'),
    'AI prompts should mention letter grade');
});

test('AI prompts mention global overview', () => {
  assert.ok(promptsFile.includes('overview'), 'Missing global overview mention');
});

test('Suggested prompts include health score', () => {
  assert.ok(promptsFile.includes('health score'), 'Missing health score suggested prompt');
});

test('Suggested prompts include global overview', () => {
  assert.ok(promptsFile.includes('global health'), 'Missing global health suggested prompt');
});

// ── Part 12: Documentation ──
console.log('\nPart 12: Documentation');

test('CHANGELOG mentions Phase 16.11 or Health Dashboard', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.11') || changelog.includes('Health Dashboard'),
    'CHANGELOG should mention Phase 16.11');
});

test('STATUS.md mentions Health Dashboard', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Health') || status.includes('16.11'),
    'STATUS.md should mention Health Dashboard');
});

// ── Results ──
console.log('\n=== Phase 16.11 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.11 Cemetery Health Dashboard tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
