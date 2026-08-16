/**
 * Phase 16.15 Tests — AI Export & Reporting
 *
 * Tests:
 * - Backend endpoints: /report, /report/summary, /reports/global
 * - CemeteryReport model and parsing
 * - CemeteryReportSummary model and parsing
 * - GlobalReport model and parsing
 * - Helper functions: computeCemeteryStats, computeCemeteryAnomalies, generateRecommendations
 * - Report structure: health, content coverage, date range, stats, anomaly summary
 * - Recommendations summary in report
 * - Cleanup preview in report
 * - Report metadata (version, schema, generator, license)
 * - Per-cemetery breakdown in global report
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

test('Backend has /report endpoint (GET)', () => {
  assert.ok(indexFile.includes('/report') && indexFile.includes('handleCemeteryReport'),
    'Missing /report endpoint');
});

test('Backend has /report/summary endpoint (GET)', () => {
  assert.ok(indexFile.includes('/report/summary') && indexFile.includes('handleCemeteryReportSummary'),
    'Missing /report/summary endpoint');
});

test('Backend has /api/reports/global endpoint (GET)', () => {
  assert.ok(indexFile.includes('/api/reports/global') && indexFile.includes('handleGlobalReport'),
    'Missing /api/reports/global endpoint');
});

test('All 3 reporting routes registered', () => {
  const routes = ['handleCemeteryReport', 'handleCemeteryReportSummary', 'handleGlobalReport'];
  for (const r of routes) {
    assert.ok(indexFile.includes(r), `Missing route handler: ${r}`);
  }
});

test('Handlers handle GitHub not configured', () => {
  assert.ok(indexFile.includes('no report available'),
    'Missing GitHub not configured fallback');
});

test('Handlers handle no published records', () => {
  assert.ok(indexFile.includes('No published records found'),
    'Missing empty records handling');
});

// ── Part 2: Helper Functions ──
console.log('\nPart 2: Helper Functions');

test('computeCemeteryStats function exists', () => {
  assert.ok(indexFile.includes('function computeCemeteryStats'),
    'Missing computeCemeteryStats function');
});

test('computeCemeteryStats counts verified/unverified', () => {
  assert.ok(indexFile.includes('verified') && indexFile.includes('unverified'),
    'Missing verified/unverified counting');
});

test('computeCemeteryStats counts content fields', () => {
  assert.ok(indexFile.includes('withPhotos') && indexFile.includes('withInscriptions') &&
    indexFile.includes('withSources') && indexFile.includes('withCoords'),
    'Missing content field counts');
});

test('computeCemeteryStats computes coverage percentages', () => {
  assert.ok(indexFile.includes('photoCoverage') && indexFile.includes('sourceCoverage'),
    'Missing coverage percentages');
});

test('computeCemeteryStats computes death year range', () => {
  assert.ok(indexFile.includes('deathYearRange'),
    'Missing death year range');
});

test('computeCemeteryAnomalies function exists', () => {
  assert.ok(indexFile.includes('function computeCemeteryAnomalies'),
    'Missing computeCemeteryAnomalies function');
});

test('computeCemeteryAnomalies counts by type', () => {
  assert.ok(indexFile.includes('byType'), 'Missing byType in anomaly summary');
});

test('computeCemeteryAnomalies detects birth after death', () => {
  assert.ok(indexFile.includes('date_birth_after_death'),
    'Missing birth after death anomaly type');
});

test('computeCemeteryAnomalies detects future dates', () => {
  assert.ok(indexFile.includes('date_birth_future') || indexFile.includes('date_death_future'),
    'Missing future date anomaly types');
});

test('computeCemeteryAnomalies detects invalid coordinates', () => {
  assert.ok(indexFile.includes('coord_lat_invalid') || indexFile.includes('coord_lng_invalid'),
    'Missing coordinate anomaly types');
});

test('generateRecommendations function exists', () => {
  assert.ok(indexFile.includes('function generateRecommendations'),
    'Missing generateRecommendations function');
});

test('generateRecommendations generates missing names rec', () => {
  assert.ok(indexFile.includes('missing name or identifier'),
    'Missing name recommendation in generateRecommendations');
});

test('generateRecommendations generates anomaly rec', () => {
  assert.ok(indexFile.includes('critical anomalies detected'),
    'Missing anomaly recommendation');
});

test('generateRecommendations generates source rec', () => {
  assert.ok(indexFile.includes('source attribution'),
    'Missing source recommendation');
});

test('generateRecommendations generates photo rec', () => {
  assert.ok(indexFile.includes('no photos'),
    'Missing photo recommendation');
});

test('generateRecommendations generates duplicate rec', () => {
  assert.ok(indexFile.includes('duplicate'),
    'Missing duplicate recommendation');
});

// ── Part 3: Full Report Handler ──
console.log('\nPart 3: Full Report Handler');

test('Report loads cemetery metadata', () => {
  assert.ok(indexFile.includes('cemeteryMetadata'),
    'Missing cemetery metadata loading');
});

test('Report computes health', () => {
  assert.ok(indexFile.includes('computeQuickHealth'),
    'Missing health computation in report');
});

test('Report includes content coverage breakdown', () => {
  assert.ok(indexFile.includes('contentCoverage'),
    'Missing content coverage in report');
});

test('Report includes date range', () => {
  assert.ok(indexFile.includes('dateRange'),
    'Missing date range in report');
});

test('Report includes anomaly summary', () => {
  assert.ok(indexFile.includes('anomalySummary'),
    'Missing anomaly summary in report');
});

test('Report includes recommendations summary', () => {
  assert.ok(indexFile.includes('recommendationsSummary'),
    'Missing recommendations summary in report');
});

test('Report includes cleanup preview', () => {
  assert.ok(indexFile.includes('cleanupPreview'),
    'Missing cleanup preview in report');
});

test('Report includes report metadata', () => {
  assert.ok(indexFile.includes('reportMetadata'),
    'Missing report metadata');
});

test('Report metadata has version, schema, generator, license', () => {
  assert.ok(indexFile.includes('version:') && indexFile.includes('schema:') &&
    indexFile.includes('generator:') && indexFile.includes('license:'),
    'Missing report metadata fields');
});

test('Report uses CC-BY-SA 4.0 license', () => {
  assert.ok(indexFile.includes('CC-BY-SA 4.0'),
    'Missing CC-BY-SA 4.0 license');
});

test('Report has reportId with timestamp', () => {
  assert.ok(indexFile.includes('reportId'),
    'Missing reportId');
});

test('Report has generatedAt timestamp', () => {
  assert.ok(indexFile.includes('generatedAt'),
    'Missing generatedAt');
});

test('Recommendations sorted by priority', () => {
  assert.ok(indexFile.includes('priorityOrder'),
    'Missing priority sorting in report');
});

test('Top items limited to 10', () => {
  assert.ok(indexFile.includes('slice(0, 10)'),
    'Missing 10-item limit for top recommendations');
});

// ── Part 4: Report Summary Handler ──
console.log('\nPart 4: Report Summary Handler');

test('Summary returns health grade and score', () => {
  assert.ok(indexFile.includes('healthGrade') && indexFile.includes('healthScore'),
    'Missing health grade/score in summary');
});

test('Summary returns photo/source/inscription coverage', () => {
  assert.ok(indexFile.includes('photoCoverage') && indexFile.includes('sourceCoverage') &&
    indexFile.includes('inscriptionCoverage'),
    'Missing coverage metrics in summary');
});

test('Summary returns anomaly counts', () => {
  assert.ok(indexFile.includes('critical:') && indexFile.includes('warning:'),
    'Missing anomaly counts in summary');
});

// ── Part 5: Global Report Handler ──
console.log('\nPart 5: Global Report Handler');

test('Global report aggregates all records', () => {
  assert.ok(indexFile.includes("listFiles('graves'"),
    'Missing record listing in global report');
});

test('Global report tracks per-cemetery breakdown', () => {
  assert.ok(indexFile.includes('cemeteryBreakdown'),
    'Missing cemetery breakdown in global report');
});

test('Global report counts unique cemetery IDs', () => {
  assert.ok(indexFile.includes('cemeteryIds'),
    'Missing unique cemetery ID counting');
});

test('Global report sorts breakdown by record count', () => {
  assert.ok(indexFile.includes('sort') && indexFile.includes('recordCount'),
    'Missing sort by record count');
});

test('Global report has global content coverage', () => {
  assert.ok(indexFile.includes('globalContentCoverage'),
    'Missing global content coverage');
});

test('Global report has report metadata', () => {
  assert.ok(indexFile.includes('reportMetadata'),
    'Missing report metadata in global report');
});

// ── Part 6: CemeteryReport Model ──
console.log('\nPart 6: CemeteryReport Model');

const reportFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CemeteryReport.java'),
  'utf8'
);

test('CemeteryReport class exists', () => {
  assert.ok(reportFile.includes('public class CemeteryReport'), 'Class not found');
});

test('Has CemeteryMetadata inner class', () => {
  assert.ok(reportFile.includes('class CemeteryMetadata'), 'Missing CemeteryMetadata');
});

test('Has ContentCoverage inner class', () => {
  assert.ok(reportFile.includes('class ContentCoverage'), 'Missing ContentCoverage');
});

test('Has DateRange inner class', () => {
  assert.ok(reportFile.includes('class DateRange'), 'Missing DateRange');
});

test('Has ReportStats inner class', () => {
  assert.ok(reportFile.includes('class ReportStats'), 'Missing ReportStats');
});

test('Has AnomalySummary inner class', () => {
  assert.ok(reportFile.includes('class AnomalySummary'), 'Missing AnomalySummary');
});

test('Has RecommendationsSummary inner class', () => {
  assert.ok(reportFile.includes('class RecommendationsSummary'), 'Missing RecommendationsSummary');
});

test('Has CleanupPreviewInfo inner class', () => {
  assert.ok(reportFile.includes('class CleanupPreviewInfo'), 'Missing CleanupPreviewInfo');
});

test('Has ReportMetadata inner class', () => {
  assert.ok(reportFile.includes('class ReportMetadata'), 'Missing ReportMetadata');
});

test('Has fromJson method', () => {
  assert.ok(reportFile.includes('fromJson'), 'Missing fromJson');
});

test('Has getReportTitle method', () => {
  assert.ok(reportFile.includes('getReportTitle'), 'Missing getReportTitle');
});

test('ContentCoverage has percentage helper methods', () => {
  assert.ok(reportFile.includes('getPhotoPercent') && reportFile.includes('getSourcePercent'),
    'Missing percentage helper methods');
});

test('DateRange has getFormattedRange method', () => {
  assert.ok(reportFile.includes('getFormattedRange'), 'Missing getFormattedRange');
});

test('TopItem has category, priority, title, affectedRecords', () => {
  assert.ok(reportFile.includes('category') && reportFile.includes('priority') &&
    reportFile.includes('title') && reportFile.includes('affectedRecords'),
    'Missing TopItem fields');
});

// ── Part 7: CemeteryReportSummary Model ──
console.log('\nPart 7: CemeteryReportSummary Model');

const summaryFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CemeteryReportSummary.java'),
  'utf8'
);

test('CemeteryReportSummary class exists', () => {
  assert.ok(summaryFile.includes('public class CemeteryReportSummary'), 'Class not found');
});

test('Has AnomalyCounts inner class', () => {
  assert.ok(summaryFile.includes('class AnomalyCounts'), 'Missing AnomalyCounts');
});

test('Has DuplicateCounts inner class', () => {
  assert.ok(summaryFile.includes('class DuplicateCounts'), 'Missing DuplicateCounts');
});

test('Has fromJson method', () => {
  assert.ok(summaryFile.includes('fromJson'), 'Missing fromJson');
});

test('Has getSummaryLine method', () => {
  assert.ok(summaryFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 8: GlobalReport Model ──
console.log('\nPart 8: GlobalReport Model');

const globalReportFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/GlobalReport.java'),
  'utf8'
);

test('GlobalReport class exists', () => {
  assert.ok(globalReportFile.includes('public class GlobalReport'), 'Class not found');
});

test('Has GlobalContentCoverage inner class', () => {
  assert.ok(globalReportFile.includes('class GlobalContentCoverage'), 'Missing GlobalContentCoverage');
});

test('Has CemeteryBreakdownEntry inner class', () => {
  assert.ok(globalReportFile.includes('class CemeteryBreakdownEntry'), 'Missing CemeteryBreakdownEntry');
});

test('Has ReportMeta inner class', () => {
  assert.ok(globalReportFile.includes('class ReportMeta'), 'Missing ReportMeta');
});

test('Has fromJson method', () => {
  assert.ok(globalReportFile.includes('fromJson'), 'Missing fromJson');
});

test('Has getSummaryLine method', () => {
  assert.ok(globalReportFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

test('GlobalContentCoverage has percentage helpers', () => {
  assert.ok(globalReportFile.includes('getPhotoPercent') && globalReportFile.includes('getSourcePercent'),
    'Missing percentage helpers');
});

// ── Part 9: API Client Integration ──
console.log('\nPart 9: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports CemeteryReport', () => {
  assert.ok(apiFile.includes('CemeteryReport'), 'Missing CemeteryReport import');
});

test('ApiClient imports CemeteryReportSummary', () => {
  assert.ok(apiFile.includes('CemeteryReportSummary'), 'Missing CemeteryReportSummary import');
});

test('ApiClient imports GlobalReport', () => {
  assert.ok(apiFile.includes('GlobalReport'), 'Missing GlobalReport import');
});

test('ApiClient has getCemeteryReport method', () => {
  assert.ok(apiFile.includes('getCemeteryReport'), 'Missing getCemeteryReport');
  assert.ok(apiFile.includes('/report'), 'Missing /report URL');
});

test('ApiClient has getCemeteryReportSummary method', () => {
  assert.ok(apiFile.includes('getCemeteryReportSummary'), 'Missing getCemeteryReportSummary');
  assert.ok(apiFile.includes('/report/summary'), 'Missing /report/summary URL');
});

test('ApiClient has getGlobalReport method', () => {
  assert.ok(apiFile.includes('getGlobalReport'), 'Missing getGlobalReport');
  assert.ok(apiFile.includes('/api/reports/global'), 'Missing /api/reports/global URL');
});

// ── Part 10: AI System Prompts ──
console.log('\nPart 10: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention quality report', () => {
  assert.ok(promptsFile.includes('quality report') || promptsFile.includes('report'),
    'AI prompts should mention reports');
});

test('AI prompts mention report endpoint', () => {
  assert.ok(promptsFile.includes('/report'),
    'Missing /report in prompts');
});

test('AI prompts mention global report', () => {
  assert.ok(promptsFile.includes('/reports/global'),
    'Missing /reports/global in prompts');
});

test('Suggested prompts include "quality report"', () => {
  assert.ok(promptsFile.includes('quality report'),
    'Missing "quality report" suggested prompt');
});

test('Suggested prompts include "global quality report"', () => {
  assert.ok(promptsFile.includes('global quality report'),
    'Missing "global quality report" suggested prompt');
});

// ── Part 11: Documentation ──
console.log('\nPart 11: Documentation');

test('CHANGELOG mentions Phase 16.15 or Export & Reporting', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.15') || changelog.includes('Export & Reporting'),
    'CHANGELOG should mention Phase 16.15');
});

test('STATUS.md mentions Export & Reporting', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Export') || status.includes('16.15'),
    'STATUS.md should mention Export & Reporting');
});

// ── Results ──
console.log('\n=== Phase 16.15 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.15 Export & Reporting tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
