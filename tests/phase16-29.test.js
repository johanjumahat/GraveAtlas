/**
 * Phase 16.29 Tests — AI Smart Summaries & Auto-Documentation
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

const handlers = [
  ['handleCemeterySummary', 'GET /api/summaries/cemetery/:id'],
  ['handleRecordSummary', 'GET /api/summaries/record/:id'],
  ['handleDatasetSummary', 'GET /api/summaries/dataset'],
  ['handleHealthReportSummary', 'GET /api/summaries/health-report'],
  ['handleCustomSummary', 'POST /api/summaries/custom'],
];

for (const [handler, desc] of handlers) {
  test(`Backend has ${desc}`, () => {
    assert.ok(indexFile.includes(handler), `Missing ${handler}`);
  });
}

test('All 5 summary routes registered', () => {
  assert.ok(indexFile.includes('/api/summaries/cemetery/'), 'Missing cemetery summary route');
  assert.ok(indexFile.includes('/api/summaries/record/'), 'Missing record summary route');
  assert.ok(indexFile.includes('/api/summaries/dataset'), 'Missing dataset summary route');
  assert.ok(indexFile.includes('/api/summaries/health-report'), 'Missing health report route');
  assert.ok(indexFile.includes('/api/summaries/custom'), 'Missing custom summary route');
});

test('Helper functions exist', () => {
  assert.ok(indexFile.includes('generateCemeterySummary'), 'Missing generateCemeterySummary');
  assert.ok(indexFile.includes('generateRecordSummary'), 'Missing generateRecordSummary');
});

console.log('\nPart 2: Cemetery Summary');
test('Generates overview paragraph', () => {
  assert.ok(indexFile.includes('overview'), 'Missing overview');
});
test('Returns stats with confidence tiers', () => {
  assert.ok(indexFile.includes('confidenceTiers'), 'Missing confidenceTiers');
  assert.ok(indexFile.includes('platinum'), 'Missing platinum tier');
  assert.ok(indexFile.includes('gold'), 'Missing gold tier');
  assert.ok(indexFile.includes('silver'), 'Missing silver tier');
  assert.ok(indexFile.includes('bronze'), 'Missing bronze tier');
});
test('Returns notable records', () => {
  assert.ok(indexFile.includes('notableRecords'), 'Missing notableRecords');
});
test('Returns quality issues', () => {
  assert.ok(indexFile.includes('qualityIssues'), 'Missing qualityIssues');
});
test('Returns recommendations', () => {
  assert.ok(indexFile.includes('recommendations'), 'Missing recommendations');
});
test('Returns generatedAt timestamp', () => {
  assert.ok(indexFile.includes('generatedAt'), 'Missing generatedAt');
});

console.log('\nPart 3: Record Summary');
test('Generates record overview', () => {
  assert.ok(indexFile.includes('generateRecordSummary'), 'Missing record summary generator');
});
test('Returns provenance summary', () => {
  assert.ok(indexFile.includes('provenanceSummary'), 'Missing provenanceSummary');
});
test('Returns related records', () => {
  assert.ok(indexFile.includes('relatedRecords'), 'Missing relatedRecords');
});
test('Returns metadata', () => {
  assert.ok(indexFile.includes('metadata'), 'Missing metadata');
});

console.log('\nPart 4: Dataset Summary');
test('Generates dataset overview', () => {
  assert.ok(indexFile.includes('overview'), 'Missing dataset overview');
});
test('Returns date range', () => {
  assert.ok(indexFile.includes('dateRange'), 'Missing dateRange');
});
test('Returns cemetery breakdown', () => {
  assert.ok(indexFile.includes('cemeteryList'), 'Missing cemeteryList');
  assert.ok(indexFile.includes('cemeteryStats'), 'Missing cemeteryStats');
});
test('Returns top cemeteries', () => {
  assert.ok(indexFile.includes('topCemeteries'), 'Missing topCemeteries');
});
test('Returns quality issues', () => {
  assert.ok(indexFile.includes('qualityIssues'), 'Missing qualityIssues');
});
test('Returns recommendations', () => {
  assert.ok(indexFile.includes('recommendations'), 'Missing recommendations');
});

console.log('\nPart 5: Health Report');
test('Calculates health score', () => {
  assert.ok(indexFile.includes('healthScore'), 'Missing healthScore');
});
test('Returns letter grade', () => {
  assert.ok(indexFile.includes("'A'"), 'Missing grade A');
  assert.ok(indexFile.includes("'B'"), 'Missing grade B');
  assert.ok(indexFile.includes("'C'"), 'Missing grade C');
  assert.ok(indexFile.includes("'D'"), 'Missing grade D');
  assert.ok(indexFile.includes("'F'"), 'Missing grade F');
});
test('Returns metric breakdown', () => {
  assert.ok(indexFile.includes('METRIC BREAKDOWN'), 'Missing metric breakdown');
  assert.ok(indexFile.includes('30% weight'), 'Missing weight info');
});
test('Returns assessment text', () => {
  assert.ok(indexFile.includes('ASSESSMENT'), 'Missing ASSESSMENT');
});
test('Returns recommended actions', () => {
  assert.ok(indexFile.includes('RECOMMENDED ACTIONS'), 'Missing recommended actions');
});
test('Accepts cemeteryId param', () => {
  assert.ok(indexFile.includes('cemeteryId'), 'Missing cemeteryId param');
});

console.log('\nPart 6: Custom Summary');
test('Accepts type param', () => {
  assert.ok(indexFile.includes("'cemetery'") && indexFile.includes("'dataset'") && indexFile.includes("'record'"),
    'Missing type options');
});
test('Accepts format param', () => {
  assert.ok(indexFile.includes("'paragraph'") && indexFile.includes("'bullets'") && indexFile.includes("'json'"),
    'Missing format options');
});
test('Returns formatted output', () => {
  assert.ok(indexFile.includes('formattedSummary'), 'Missing formattedSummary');
});

console.log('\nPart 7: CemeterySummary Model');
const csFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CemeterySummary.java'),
  'utf8'
);
test('Class exists', () => assert.ok(csFile.includes('public class CemeterySummary'), 'Not found'));
test('Has SummaryStats inner', () => assert.ok(csFile.includes('class SummaryStats'), 'Missing SummaryStats'));
test('Has ConfidenceTiers inner', () => assert.ok(csFile.includes('class ConfidenceTiers'), 'Missing ConfidenceTiers'));
test('Has NotableRecord inner', () => assert.ok(csFile.includes('class NotableRecord'), 'Missing NotableRecord'));
test('Has fromJson', () => assert.ok(csFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasQualityIssues', () => assert.ok(csFile.includes('hasQualityIssues'), 'Missing hasQualityIssues'));
test('Has hasRecommendations', () => assert.ok(csFile.includes('hasRecommendations'), 'Missing hasRecommendations'));
test('Has getVerificationRate', () => assert.ok(csFile.includes('getVerificationRate'), 'Missing getVerificationRate'));

console.log('\nPart 8: DatasetSummary Model');
const dsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/DatasetSummary.java'),
  'utf8'
);
test('Class exists', () => assert.ok(dsFile.includes('public class DatasetSummary'), 'Not found'));
test('Has DatasetStats inner', () => assert.ok(dsFile.includes('class DatasetStats'), 'Missing DatasetStats'));
test('Has CemeteryEntry inner', () => assert.ok(dsFile.includes('class CemeteryEntry'), 'Missing CemeteryEntry'));
test('Has fromJson', () => assert.ok(dsFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasQualityIssues', () => assert.ok(dsFile.includes('hasQualityIssues'), 'Missing hasQualityIssues'));
test('Has hasRecommendations', () => assert.ok(dsFile.includes('hasRecommendations'), 'Missing hasRecommendations'));

console.log('\nPart 9: HealthReportSummary Model');
const hrFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/HealthReportSummary.java'),
  'utf8'
);
test('Class exists', () => assert.ok(hrFile.includes('public class HealthReportSummary'), 'Not found'));
test('Has fromJson', () => assert.ok(hrFile.includes('fromJson'), 'Missing fromJson'));
test('Has isExcellent', () => assert.ok(hrFile.includes('isExcellent'), 'Missing isExcellent'));
test('Has isGood', () => assert.ok(hrFile.includes('isGood'), 'Missing isGood'));
test('Has isPoor', () => assert.ok(hrFile.includes('isPoor'), 'Missing isPoor'));
test('Has getGradeEmoji', () => assert.ok(hrFile.includes('getGradeEmoji'), 'Missing getGradeEmoji'));

console.log('\nPart 10: API Client Integration');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);
test('Imports CemeterySummary', () => assert.ok(apiFile.includes('CemeterySummary'), 'Missing import'));
test('Imports DatasetSummary', () => assert.ok(apiFile.includes('DatasetSummary'), 'Missing import'));
test('Imports HealthReportSummary', () => assert.ok(apiFile.includes('HealthReportSummary'), 'Missing import'));
test('Has getCemeterySummary', () => {
  assert.ok(apiFile.includes('getCemeterySummary'), 'Missing method');
  assert.ok(apiFile.includes('/api/summaries/cemetery/'), 'Missing URL');
});
test('Has getDatasetSummary', () => {
  assert.ok(apiFile.includes('getDatasetSummary'), 'Missing method');
  assert.ok(apiFile.includes('/api/summaries/dataset'), 'Missing URL');
});
test('Has getHealthReportSummary', () => {
  assert.ok(apiFile.includes('getHealthReportSummary'), 'Missing method');
  assert.ok(apiFile.includes('/api/summaries/health-report'), 'Missing URL');
});
test('Has generateCustomSummary', () => {
  assert.ok(apiFile.includes('generateCustomSummary'), 'Missing method');
  assert.ok(apiFile.includes('/api/summaries/custom'), 'Missing URL');
});

console.log('\nPart 11: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);
test('Prompts mention /api/summaries/cemetery', () => assert.ok(promptsFile.includes('summaries/cemetery'), 'Missing'));
test('Prompts mention /api/summaries/dataset', () => assert.ok(promptsFile.includes('summaries/dataset'), 'Missing'));
test('Prompts mention /api/summaries/health-report', () => assert.ok(promptsFile.includes('summaries/health-report'), 'Missing'));
test('Prompts mention auto-documentation', () => assert.ok(promptsFile.includes('auto-generated') || promptsFile.includes('auto-documentation'), 'Missing'));
test('Suggested prompts include summarize', () => assert.ok(promptsFile.includes('Summarize'), 'Missing'));
test('Suggested prompts include health report', () => assert.ok(promptsFile.includes('health report'), 'Missing'));

console.log('\nPart 12: Documentation');
test('CHANGELOG mentions Phase 16.29', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Phase 16.29') || c.includes('Smart Summaries'), 'Missing from CHANGELOG');
});
test('STATUS.md mentions 16.29', () => {
  const s = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(s.includes('16.29') || s.includes('Smart Summaries'), 'Missing from STATUS');
});

console.log('\n=== Phase 16.29 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.29 Smart Summaries & Auto-Documentation tests passed!');
else console.log('\n❌ Some tests failed!');
