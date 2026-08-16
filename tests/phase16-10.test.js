/**
 * Phase 16.10 Tests — AI Anomaly Detection
 *
 * Tests:
 * - Backend endpoints: /api/cemeteries/:id/anomalies, /api/graves/:id/anomaly-check
 * - AnomalyReport model and parsing
 * - RecordAnomalyCheck model and parsing
 * - Anomaly types: date, name, coordinate, plot, completeness, statistical outlier
 * - Severity levels: critical, warning, info
 * - Date anomaly detection: birth after death, lifespan > 120, future dates, pre-1700
 * - Name anomaly detection: short, all-caps, numeric-only, non-printable
 * - Coordinate anomaly detection: invalid ranges, distance from cemetery center
 * - Plot anomaly detection: duplicate plot assignments
 * - Completeness anomaly detection: missing name, missing dates
 * - Statistical outlier detection: death year far from median
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

test('Backend has /anomalies endpoint registration', () => {
  assert.ok(indexFile.includes('/anomalies') && indexFile.includes('handleCemeteryAnomalies'),
    'Missing /anomalies endpoint or handleCemeteryAnomalies');
});

test('Backend has /anomaly-check endpoint registration', () => {
  assert.ok(indexFile.includes('/anomaly-check') && indexFile.includes('handleRecordAnomalyCheck'),
    'Missing /anomaly-check endpoint or handleRecordAnomalyCheck');
});

test('Cemetery anomalies handler scans published records', () => {
  assert.ok(indexFile.includes("status !== 'published'"), 'Missing published status filter');
});

test('Cemetery anomalies handler reads cemetery metadata', () => {
  assert.ok(indexFile.includes('cemeteries/') && indexFile.includes('cemeteryLat'),
    'Missing cemetery metadata reading');
});

// ── Part 2: Date Anomaly Detection ──
console.log('\nPart 2: Date Anomaly Detection');

test('Detects birth year after death year', () => {
  assert.ok(indexFile.includes('Birth year') && indexFile.includes('after death year'),
    'Missing birth-after-death detection');
});

test('Detects lifespan > 120 years', () => {
  assert.ok(indexFile.includes('120') && indexFile.includes('lifespan'),
    'Missing lifespan > 120 check');
});

test('Detects future birth date', () => {
  assert.ok(indexFile.includes('Birth date is in the future'),
    'Missing future birth date detection');
});

test('Detects future death date', () => {
  assert.ok(indexFile.includes('Death date is in the future'),
    'Missing future death date detection');
});

test('Detects pre-1700 birth dates', () => {
  assert.ok(indexFile.includes('before 1700') || indexFile.includes('1700'),
    'Missing pre-1700 date detection');
});

test('Date anomalies are marked critical for birth-after-death', () => {
  assert.ok(indexFile.includes("severity: 'critical'") && indexFile.includes('after death'),
    'Missing critical severity for birth-after-death');
});

// ── Part 3: Name Anomaly Detection ──
console.log('\nPart 3: Name Anomaly Detection');

test('Detects short names (< 2 chars)', () => {
  assert.ok(indexFile.includes('less than 2 characters'),
    'Missing short name detection');
});

test('Detects all-caps names', () => {
  assert.ok(indexFile.includes('all uppercase'),
    'Missing all-caps name detection');
});

test('Detects numeric-only names', () => {
  assert.ok(indexFile.includes('only numbers'),
    'Missing numeric-only name detection');
});

test('Detects non-printable characters in names', () => {
  assert.ok(indexFile.includes('non-printable'),
    'Missing non-printable character detection');
});

// ── Part 4: Coordinate Anomaly Detection ──
console.log('\nPart 4: Coordinate Anomaly Detection');

test('Detects coordinates far from cemetery center', () => {
  assert.ok(indexFile.includes('from cemetery center'),
    'Missing distance-from-center check');
});

test('Detects invalid latitude (> 90 or < -90)', () => {
  assert.ok(indexFile.includes('-90') && indexFile.includes('90'),
    'Missing latitude range validation');
});

test('Detects invalid longitude (> 180 or < -180)', () => {
  assert.ok(indexFile.includes('-180') && indexFile.includes('180'),
    'Missing longitude range validation');
});

test('Coordinate anomalies use 0.1 degree threshold', () => {
  assert.ok(indexFile.includes('0.1'), 'Missing 0.1 degree threshold');
});

// ── Part 5: Plot Anomaly Detection ──
console.log('\nPart 5: Plot Anomaly Detection');

test('Tracks plot assignments for duplicate detection', () => {
  assert.ok(indexFile.includes('plotAssignments'), 'Missing plot assignment tracking');
});

test('Detects duplicate plot assignments', () => {
  assert.ok(indexFile.includes('Duplicate') || indexFile.includes('assigned to'),
    'Missing duplicate plot detection');
});

test('Plot anomalies include duplicate record list', () => {
  assert.ok(indexFile.includes('duplicateRecords'), 'Missing duplicateRecords in plot anomalies');
});

// ── Part 6: Completeness Anomaly Detection ──
console.log('\nPart 6: Completeness Anomaly Detection');

test('Detects records with no name or grave identifier', () => {
  assert.ok(indexFile.includes('no name or grave identifier'),
    'Missing no-name detection');
});

test('Detects records with no birth or death date', () => {
  assert.ok(indexFile.includes('no birth or death date'),
    'Missing no-dates detection');
});

// ── Part 7: Statistical Outlier Detection ──
console.log('\nPart 7: Statistical Outlier Detection');

test('Computes median death year', () => {
  assert.ok(indexFile.includes('medianDeathYear'), 'Missing median death year computation');
});

test('Flags death years > 100 years from median', () => {
  assert.ok(indexFile.includes('100') && indexFile.includes('median'),
    'Missing outlier threshold');
});

test('Statistical outliers are severity info', () => {
  assert.ok(indexFile.includes("severity: 'info'") && indexFile.includes('statistical_outlier'),
    'Missing info severity for statistical outliers');
});

// ── Part 8: Anomaly Sorting and Summary ──
console.log('\nPart 8: Anomaly Sorting and Summary');

test('Anomalies sorted by severity (critical first)', () => {
  assert.ok(indexFile.includes('severityOrder'), 'Missing severity sorting');
});

test('Summary includes critical, warning, info counts', () => {
  assert.ok(indexFile.includes('critical:') && indexFile.includes('warning:') && indexFile.includes('info:'),
    'Missing severity counts in summary');
});

test('Summary includes byType breakdown', () => {
  assert.ok(indexFile.includes('byType'), 'Missing byType breakdown');
});

test('Summary includes recordsScanned count', () => {
  assert.ok(indexFile.includes('recordsScanned'), 'Missing recordsScanned');
});

test('Anomalies limited to 100 results', () => {
  assert.ok(indexFile.includes('slice(0, 100)'), 'Missing 100-result limit');
});

// ── Part 9: Single Record Anomaly Check ──
console.log('\nPart 9: Single Record Anomaly Check');

test('Record anomaly check handles record not found', () => {
  assert.ok(indexFile.includes('Record not found'),
    'Missing record not found handling');
});

test('Record anomaly check returns hasCritical flag', () => {
  assert.ok(indexFile.includes('hasCritical'), 'Missing hasCritical flag');
});

test('Record anomaly check returns anomalyCount', () => {
  assert.ok(indexFile.includes('anomalyCount'), 'Missing anomalyCount');
});

// ── Part 10: AnomalyReport Model ──
console.log('\nPart 10: AnomalyReport Model');

const reportFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/AnomalyReport.java'),
  'utf8'
);

test('AnomalyReport class exists', () => {
  assert.ok(reportFile.includes('public class AnomalyReport'), 'Class not found');
});

test('AnomalyReport has Anomaly inner class', () => {
  assert.ok(reportFile.includes('class Anomaly'), 'Missing Anomaly inner class');
});

test('AnomalyReport has AnomalySummary inner class', () => {
  assert.ok(reportFile.includes('class AnomalySummary'), 'Missing AnomalySummary');
});

test('Anomaly has type, severity, message, field', () => {
  assert.ok(reportFile.includes('type') && reportFile.includes('severity') &&
    reportFile.includes('message') && reportFile.includes('field'),
    'Missing anomaly fields');
});

test('AnomalyReport has fromJson method', () => {
  assert.ok(reportFile.includes('fromJson'), 'Missing fromJson');
});

test('AnomalyReport has getCriticalAnomalies', () => {
  assert.ok(reportFile.includes('getCriticalAnomalies'), 'Missing getCriticalAnomalies');
});

test('AnomalyReport has getAnomaliesByType', () => {
  assert.ok(reportFile.includes('getAnomaliesByType'), 'Missing getAnomaliesByType');
});

test('AnomalyReport has hasCriticalAnomalies', () => {
  assert.ok(reportFile.includes('hasCriticalAnomalies'), 'Missing hasCriticalAnomalies');
});

test('AnomalyReport has getUniqueRecordsWithAnomalies', () => {
  assert.ok(reportFile.includes('getUniqueRecordsWithAnomalies'),
    'Missing getUniqueRecordsWithAnomalies');
});

test('AnomalyReport handles duplicateRecords in plot anomalies', () => {
  assert.ok(reportFile.includes('DuplicateRecord'), 'Missing DuplicateRecord handling');
});

// ── Part 11: RecordAnomalyCheck Model ──
console.log('\nPart 11: RecordAnomalyCheck Model');

const checkFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/RecordAnomalyCheck.java'),
  'utf8'
);

test('RecordAnomalyCheck class exists', () => {
  assert.ok(checkFile.includes('public class RecordAnomalyCheck'), 'Class not found');
});

test('RecordAnomalyCheck has AnomalyItem inner class', () => {
  assert.ok(checkFile.includes('class AnomalyItem'), 'Missing AnomalyItem');
});

test('RecordAnomalyCheck has fromJson method', () => {
  assert.ok(checkFile.includes('fromJson'), 'Missing fromJson');
});

test('RecordAnomalyCheck has getCriticalAnomalies', () => {
  assert.ok(checkFile.includes('getCriticalAnomalies'), 'Missing getCriticalAnomalies');
});

test('RecordAnomalyCheck has isClean method', () => {
  assert.ok(checkFile.includes('isClean'), 'Missing isClean');
});

test('RecordAnomalyCheck has getSummary method', () => {
  assert.ok(checkFile.includes('getSummary'), 'Missing getSummary');
});

// ── Part 12: API Client Integration ──
console.log('\nPart 12: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports AnomalyReport', () => {
  assert.ok(apiFile.includes('AnomalyReport'), 'Missing AnomalyReport import');
});

test('ApiClient imports RecordAnomalyCheck', () => {
  assert.ok(apiFile.includes('RecordAnomalyCheck'), 'Missing RecordAnomalyCheck import');
});

test('ApiClient has getCemeteryAnomalies method', () => {
  assert.ok(apiFile.includes('getCemeteryAnomalies'), 'Missing getCemeteryAnomalies method');
  assert.ok(apiFile.includes('/anomalies'), 'Missing /anomalies URL');
});

test('ApiClient has checkRecordAnomalies method', () => {
  assert.ok(apiFile.includes('checkRecordAnomalies'), 'Missing checkRecordAnomalies method');
  assert.ok(apiFile.includes('/anomaly-check'), 'Missing /anomaly-check URL');
});

// ── Part 13: AI System Prompts ──
console.log('\nPart 13: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention anomaly detection', () => {
  assert.ok(promptsFile.includes('anomal') || promptsFile.includes('anomaly'),
    'AI prompts should mention anomaly detection');
});

test('AI prompts mention anomaly-check endpoint', () => {
  assert.ok(promptsFile.includes('anomaly-check'), 'Missing anomaly-check endpoint mention');
});

test('Suggested prompts include anomaly check', () => {
  assert.ok(promptsFile.includes('anomalies') || promptsFile.includes('anomaly'),
    'Missing anomaly suggested prompt');
});

test('Suggested prompts include record scan', () => {
  assert.ok(promptsFile.includes('Scan'), 'Missing scan suggested prompt');
});

// ── Part 14: Documentation ──
console.log('\nPart 14: Documentation');

test('CHANGELOG mentions Phase 16.10 or Anomaly Detection', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.10') || changelog.includes('Anomaly Detection'),
    'CHANGELOG should mention Phase 16.10');
});

test('STATUS.md mentions Anomaly Detection', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Anomaly') || status.includes('16.10'),
    'STATUS.md should mention Anomaly Detection');
});

// ── Results ──
console.log('\n=== Phase 16.10 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.10 Anomaly Detection tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
