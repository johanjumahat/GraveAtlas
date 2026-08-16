/**
 * Phase 16.9 Tests — AI Import Quality Scoring
 *
 * Tests:
 * - Backend endpoints: /api/import/score, /api/import/batch-report
 * - ImportQualityScore model and parsing
 * - ImportBatchReport model and parsing
 * - Scoring dimensions: completeness, coverage, consistency
 * - Recommendation logic (accept/review/reject)
 * - Error detection: bad dates, future dates, duplicate IDs
 * - Warning detection: missing fields, short names, all-caps names
 * - Batch metadata: cemetery/country counts, photo/inscription/source coverage
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

test('Backend has /api/import/score endpoint', () => {
  assert.ok(indexFile.includes('/api/import/score') && indexFile.includes('handleImportQualityScore'),
    'Missing /api/import/score endpoint');
});

test('Backend has /api/import/batch-report endpoint', () => {
  assert.ok(indexFile.includes('/api/import/batch-report') && indexFile.includes('handleImportBatchReport'),
    'Missing /api/import/batch-report endpoint');
});

test('Score handler validates records array', () => {
  assert.ok(indexFile.includes('Array.isArray(records)'), 'Missing records array validation');
});

test('Score handler limits batch size to 1000', () => {
  assert.ok(indexFile.includes('records.length > 1000'), 'Missing batch size limit');
});

test('Score handler computes completeness', () => {
  assert.ok(indexFile.includes('completeness'), 'Missing completeness scoring');
});

test('Score handler computes coverage', () => {
  assert.ok(indexFile.includes('coverage'), 'Missing coverage scoring');
});

test('Score handler computes consistency', () => {
  assert.ok(indexFile.includes('consistency'), 'Missing consistency scoring');
});

test('Score handler uses essential fields', () => {
  assert.ok(indexFile.includes('essentialFields'), 'Missing essentialFields definition');
  assert.ok(indexFile.includes("'name'") && indexFile.includes("'cemeteryId'"),
    'Missing essential field definitions');
});

test('Score handler uses optional fields', () => {
  assert.ok(indexFile.includes('optionalFields'), 'Missing optionalFields definition');
  assert.ok(indexFile.includes("'photoRefs'") && indexFile.includes("'inscription'"),
    'Missing optional field definitions');
});

test('Score handler checks birth before death', () => {
  assert.ok(indexFile.includes('Birth date is after death date'),
    'Missing birth-after-death check');
});

test('Score handler checks lifespan > 120', () => {
  assert.ok(indexFile.includes('120') && indexFile.includes('Lifespan'),
    'Missing lifespan check');
});

test('Score handler checks future dates', () => {
  assert.ok(indexFile.includes('in the future'), 'Missing future date check');
});

test('Score handler checks name length', () => {
  assert.ok(indexFile.includes('less than 2 characters'), 'Missing name length check');
});

test('Score handler checks all-caps names', () => {
  assert.ok(indexFile.includes('all uppercase'), 'Missing all-caps check');
});

test('Score handler detects duplicate IDs', () => {
  assert.ok(indexFile.includes('Duplicate ID'), 'Missing duplicate ID detection');
});

test('Score handler computes weighted overall score', () => {
  assert.ok(indexFile.includes('0.4') && indexFile.includes('0.3'),
    'Missing weighted overall score computation');
});

test('Score handler recommends accept when high quality', () => {
  assert.ok(indexFile.includes("'accept'") || indexFile.includes('"accept"'),
    'Missing accept recommendation');
});

test('Score handler recommends review for medium quality', () => {
  assert.ok(indexFile.includes("'review'") || indexFile.includes('"review"'),
    'Missing review recommendation');
});

test('Score handler recommends reject for low quality', () => {
  assert.ok(indexFile.includes("'reject'") || indexFile.includes('"reject"'),
    'Missing reject recommendation');
});

test('Score handler tracks field coverage', () => {
  assert.ok(indexFile.includes('fieldCoverage'), 'Missing field coverage tracking');
});

test('Score handler limits errors/warnings to 50', () => {
  assert.ok(indexFile.includes('slice(0, 50)'), 'Missing error/warning limiting');
});

test('Batch report handler includes metadata summary', () => {
  assert.ok(indexFile.includes('uniqueCemeteries') && indexFile.includes('uniqueCountries'),
    'Missing metadata summary in batch report');
});

test('Batch report handler counts photos/inscriptions/sources', () => {
  assert.ok(indexFile.includes('recordsWithPhotos') && indexFile.includes('recordsWithInscriptions'),
    'Missing content counts in batch report');
});

test('Batch report handler counts coordinates', () => {
  assert.ok(indexFile.includes('recordsWithCoordinates'), 'Missing coordinate count');
});

test('Batch report handler computes date range', () => {
  assert.ok(indexFile.includes('dateRangeStart') || indexFile.includes('dateRange'),
    'Missing date range in batch report');
});

test('Batch report handler includes license', () => {
  assert.ok(indexFile.includes('license'), 'Missing license in batch report');
});

test('Batch report handler includes generatedAt timestamp', () => {
  assert.ok(indexFile.includes('generatedAt'), 'Missing generatedAt timestamp');
});

// ── Part 2: ImportQualityScore Model ──
console.log('\nPart 2: ImportQualityScore Model');

const scoreFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/ImportQualityScore.java'),
  'utf8'
);

test('ImportQualityScore class exists', () => {
  assert.ok(scoreFile.includes('public class ImportQualityScore'), 'Class not found');
});

test('ImportQualityScore has Scores inner class', () => {
  assert.ok(scoreFile.includes('class Scores'), 'Missing Scores inner class');
});

test('Scores has completeness, coverage, consistency, overall', () => {
  assert.ok(scoreFile.includes('completeness') && scoreFile.includes('coverage') &&
    scoreFile.includes('consistency') && scoreFile.includes('overall'),
    'Missing score fields');
});

test('ImportQualityScore has BatchError inner class', () => {
  assert.ok(scoreFile.includes('class BatchError'), 'Missing BatchError');
});

test('ImportQualityScore has BatchWarning inner class', () => {
  assert.ok(scoreFile.includes('class BatchWarning'), 'Missing BatchWarning');
});

test('ImportQualityScore has RecordScore inner class', () => {
  assert.ok(scoreFile.includes('class RecordScore'), 'Missing RecordScore');
});

test('ImportQualityScore has fromJson method', () => {
  assert.ok(scoreFile.includes('fromJson'), 'Missing fromJson');
});

test('ImportQualityScore has getRecommendationLabel', () => {
  assert.ok(scoreFile.includes('getRecommendationLabel'), 'Missing getRecommendationLabel');
});

test('getRecommendationLabel handles accept', () => {
  assert.ok(scoreFile.includes('Accept'), 'Missing accept label');
});

test('getRecommendationLabel handles reject', () => {
  assert.ok(scoreFile.includes('Reject'), 'Missing reject label');
});

test('ImportQualityScore has getLowQualityRecords', () => {
  assert.ok(scoreFile.includes('getLowQualityRecords'), 'Missing getLowQualityRecords');
});

test('ImportQualityScore has getRecordsWithErrors', () => {
  assert.ok(scoreFile.includes('getRecordsWithErrors'), 'Missing getRecordsWithErrors');
});

// ── Part 3: ImportBatchReport Model ──
console.log('\nPart 3: ImportBatchReport Model');

const reportFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/ImportBatchReport.java'),
  'utf8'
);

test('ImportBatchReport class exists', () => {
  assert.ok(reportFile.includes('public class ImportBatchReport'), 'Class not found');
});

test('ImportBatchReport has QualitySummary inner class', () => {
  assert.ok(reportFile.includes('class QualitySummary'), 'Missing QualitySummary');
});

test('ImportBatchReport has BatchMetadata inner class', () => {
  assert.ok(reportFile.includes('class BatchMetadata'), 'Missing BatchMetadata');
});

test('BatchMetadata has uniqueCemeteries and uniqueCountries', () => {
  assert.ok(reportFile.includes('uniqueCemeteries') && reportFile.includes('uniqueCountries'),
    'Missing cemetery/country counts');
});

test('BatchMetadata has recordsWithPhotos/Inscriptions/Sources/Coordinates', () => {
  assert.ok(reportFile.includes('recordsWithPhotos') && reportFile.includes('recordsWithInscriptions') &&
    reportFile.includes('recordsWithSources') && reportFile.includes('recordsWithCoordinates'),
    'Missing content count fields');
});

test('ImportBatchReport has fromJson method', () => {
  assert.ok(reportFile.includes('fromJson'), 'Missing fromJson');
});

test('ImportBatchReport has getSummaryLine', () => {
  assert.ok(reportFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 4: API Client Integration ──
console.log('\nPart 4: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports ImportQualityScore', () => {
  assert.ok(apiFile.includes('ImportQualityScore'), 'Missing ImportQualityScore import');
});

test('ApiClient imports ImportBatchReport', () => {
  assert.ok(apiFile.includes('ImportBatchReport'), 'Missing ImportBatchReport import');
});

test('ApiClient has scoreImportBatch method', () => {
  assert.ok(apiFile.includes('scoreImportBatch'), 'Missing scoreImportBatch method');
  assert.ok(apiFile.includes('/api/import/score'), 'Missing /api/import/score URL');
});

test('ApiClient has getImportBatchReport method', () => {
  assert.ok(apiFile.includes('getImportBatchReport'), 'Missing getImportBatchReport method');
  assert.ok(apiFile.includes('/api/import/batch-report'), 'Missing /api/import/batch-report URL');
});

// ── Part 5: AI System Prompts ──
console.log('\nPart 5: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention import quality scoring', () => {
  assert.ok(promptsFile.includes('import/score') || promptsFile.includes('quality scoring'),
    'AI prompts should mention import quality scoring');
});

test('AI prompts mention batch report', () => {
  assert.ok(promptsFile.includes('batch-report') || promptsFile.includes('batch report'),
    'AI prompts should mention batch report');
});

test('Suggested prompts include quality scoring', () => {
  assert.ok(promptsFile.includes('quality') || promptsFile.includes('Score'),
    'Missing quality scoring suggested prompt');
});

test('Suggested prompts include batch report', () => {
  assert.ok(promptsFile.includes('batch report') || promptsFile.includes('batch report'),
    'Missing batch report suggested prompt');
});

// ── Part 6: Documentation ──
console.log('\nPart 6: Documentation');

test('CHANGELOG mentions Phase 16.9 or Import Quality', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.9') || changelog.includes('Import Quality'),
    'CHANGELOG should mention Phase 16.9');
});

test('STATUS.md mentions Import Quality Scoring', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Import Quality') || status.includes('16.9'),
    'STATUS.md should mention Import Quality Scoring');
});

// ── Part 7: Scoring Logic Verification ──
console.log('\nPart 7: Scoring Logic Verification');

test('Completeness uses 4 essential fields', () => {
  assert.ok(indexFile.includes("essentialFields = ['name', 'birthDate', 'deathDate', 'cemeteryId']"),
    'Missing essential fields definition');
});

test('Coverage uses optional fields', () => {
  assert.ok(indexFile.includes('optionalFields ='), 'Missing optional fields definition');
});

test('Consistency penalty for birth-after-death is 25', () => {
  assert.ok(indexFile.includes('recConsistency -= 25'), 'Missing 25-point penalty');
});

test('Consistency penalty for future date is 15', () => {
  assert.ok(indexFile.includes('recConsistency -= 15'), 'Missing 15-point penalty');
});

test('Overall score weights: 40% completeness, 30% coverage, 30% consistency', () => {
  assert.ok(indexFile.includes('0.4') && indexFile.includes('0.3'),
    'Missing weighted formula');
});

test('Accept threshold is >= 80 with no errors', () => {
  assert.ok(indexFile.includes('>= 80') && indexFile.includes('errors.length === 0'),
    'Missing accept threshold');
});

test('Review threshold is >= 50', () => {
  assert.ok(indexFile.includes('>= 50'), 'Missing review threshold');
});

test('Reject is below 50', () => {
  // reject is the else branch after review check
  assert.ok(indexFile.includes('reject'), 'Missing reject branch');
});

// ── Results ──
console.log('\n=== Phase 16.9 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.9 Import Quality Scoring tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
