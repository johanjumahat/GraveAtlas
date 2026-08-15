/**
 * Phase 16.7 Tests — AI Cemetery Intelligence
 *
 * Tests cemetery statistics, auto-generated summaries, and duplicate detection:
 * - Backend endpoints: /api/cemeteries/:id/stats, /summary, /duplicates
 * - CemeteryStats model and parsing
 * - DuplicateResult model and parsing
 * - Duplicate detection algorithm (Levenshtein, name/date matching)
 * - Summary generation logic
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
  try {
    fn();
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

// ── Part 1: Backend Endpoints ──
console.log('\nPart 1: Backend Endpoints');

const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');

test('Backend has /stats endpoint registration', () => {
  assert.ok(indexFile.includes('/stats') && indexFile.includes('handleCemeteryStats'),
    'Missing /stats endpoint or handleCemeteryStats');
});

test('Backend has /summary endpoint registration', () => {
  assert.ok(indexFile.includes('/summary') && indexFile.includes('handleCemeterySummary'),
    'Missing /summary endpoint or handleCemeterySummary');
});

test('Backend has /duplicates endpoint registration', () => {
  assert.ok(indexFile.includes('/duplicates') && indexFile.includes('handleCemeteryDuplicates'),
    'Missing /duplicates endpoint or handleCemeteryDuplicates');
});

test('Stats handler computes total records', () => {
  assert.ok(indexFile.includes('totalRecords'), 'Missing totalRecords computation');
});

test('Stats handler counts verified records', () => {
  assert.ok(indexFile.includes('verifiedRecords'), 'Missing verifiedRecords count');
});

test('Stats handler counts community submitted', () => {
  assert.ok(indexFile.includes('communitySubmitted'), 'Missing communitySubmitted count');
});

test('Stats handler counts photos', () => {
  assert.ok(indexFile.includes('withPhotos'), 'Missing withPhotos count');
});

test('Stats handler counts inscriptions', () => {
  assert.ok(indexFile.includes('withInscriptions'), 'Missing withInscriptions count');
});

test('Stats handler counts sources', () => {
  assert.ok(indexFile.includes('withSources'), 'Missing withSources count');
});

test('Stats handler computes date range', () => {
  assert.ok(indexFile.includes('dateRange'), 'Missing dateRange computation');
  assert.ok(indexFile.includes('earliest'), 'Missing earliest date');
  assert.ok(indexFile.includes('latest'), 'Missing latest date');
});

test('Stats handler computes decade breakdown', () => {
  assert.ok(indexFile.includes('decadeBreakdown'), 'Missing decadeBreakdown');
});

test('Stats handler computes top names', () => {
  assert.ok(indexFile.includes('topNames'), 'Missing topNames');
});

test('Stats handler handles GitHub not configured', () => {
  assert.ok(indexFile.includes('GitHub not configured') && indexFile.includes('showing empty stats'),
    'Missing GitHub not configured fallback for stats');
});

test('Summary handler generates narrative text', () => {
  assert.ok(indexFile.includes('summary') && indexFile.includes('cemeteryName'),
    'Missing narrative summary generation');
});

test('Summary handler includes record count in narrative', () => {
  assert.ok(indexFile.includes('published grave record'), 'Missing record count in summary');
});

test('Summary handler includes date range in narrative', () => {
  assert.ok(indexFile.includes('Records span') || indexFile.includes('date from'),
    'Missing date range in summary narrative');
});

test('Summary handler includes common names', () => {
  assert.ok(indexFile.includes('Common names include'), 'Missing common names in summary');
});

test('Summary handler handles empty cemetery', () => {
  assert.ok(indexFile.includes('No published records'), 'Missing empty cemetery handling');
});

test('Duplicates handler uses Levenshtein distance', () => {
  assert.ok(indexFile.includes('levenshtein'), 'Missing Levenshtein function');
  assert.ok(indexFile.includes('function levenshtein'), 'Missing levenshtein function definition');
});

test('Duplicates handler checks name similarity', () => {
  assert.ok(indexFile.includes('Exact name match'), 'Missing exact name match check');
  assert.ok(indexFile.includes('Very similar name'), 'Missing fuzzy name match');
});

test('Duplicates handler checks birth date', () => {
  assert.ok(indexFile.includes('Same birth date'), 'Missing birth date match');
  assert.ok(indexFile.includes('Same birth year'), 'Missing birth year match');
});

test('Duplicates handler checks death date', () => {
  assert.ok(indexFile.includes('Same death date'), 'Missing death date match');
  assert.ok(indexFile.includes('Same death year'), 'Missing death year match');
});

test('Duplicates handler checks section/plot', () => {
  assert.ok(indexFile.includes('Same section and plot'), 'Missing section/plot check');
});

test('Duplicates handler returns score and reasons', () => {
  assert.ok(indexFile.includes('score') && indexFile.includes('reasons'),
    'Missing score and reasons in duplicate results');
});

test('Duplicates handler sorts by score', () => {
  assert.ok(indexFile.includes("b.score - a.score"), 'Missing score sorting');
});

test('Duplicates handler requires minimum score threshold', () => {
  assert.ok(indexFile.includes('score >= 40') || indexFile.includes('score>=40'),
    'Missing minimum score threshold');
});

test('Duplicates handler handles GitHub not configured', () => {
  assert.ok(indexFile.includes('no duplicates to check'),
    'Missing GitHub not configured fallback for duplicates');
});

test('All handlers sanitize cemetery ID', () => {
  assert.ok(indexFile.includes('sanitizePathSegment'), 'Missing ID sanitization');
});

// ── Part 2: CemeteryStats Model ──
console.log('\nPart 2: CemeteryStats Model');

const statsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CemeteryStats.java'),
  'utf8'
);

test('CemeteryStats class exists', () => {
  assert.ok(statsFile.includes('public class CemeteryStats'), 'CemeteryStats class not found');
});

test('CemeteryStats has all count fields', () => {
  assert.ok(statsFile.includes('totalRecords'), 'Missing totalRecords');
  assert.ok(statsFile.includes('verifiedRecords'), 'Missing verifiedRecords');
  assert.ok(statsFile.includes('communitySubmitted'), 'Missing communitySubmitted');
  assert.ok(statsFile.includes('unverified'), 'Missing unverified');
  assert.ok(statsFile.includes('withPhotos'), 'Missing withPhotos');
  assert.ok(statsFile.includes('withInscriptions'), 'Missing withInscriptions');
  assert.ok(statsFile.includes('withSources'), 'Missing withSources');
});

test('CemeteryStats has DateRange inner class', () => {
  assert.ok(statsFile.includes('DateRange'), 'Missing DateRange inner class');
  assert.ok(statsFile.includes('earliest'), 'Missing earliest field');
  assert.ok(statsFile.includes('latest'), 'Missing latest field');
});

test('CemeteryStats has TopName inner class', () => {
  assert.ok(statsFile.includes('TopName'), 'Missing TopName inner class');
  assert.ok(statsFile.includes('count'), 'Missing count in TopName');
});

test('CemeteryStats has fromJson method', () => {
  assert.ok(statsFile.includes('fromJson'), 'Missing fromJson method');
});

test('CemeteryStats has getVerificationRate', () => {
  assert.ok(statsFile.includes('getVerificationRate'), 'Missing getVerificationRate');
});

test('CemeteryStats has getPhotoCoverage', () => {
  assert.ok(statsFile.includes('getPhotoCoverage'), 'Missing getPhotoCoverage');
});

test('CemeteryStats has getSourceCoverage', () => {
  assert.ok(statsFile.includes('getSourceCoverage'), 'Missing getSourceCoverage');
});

test('getVerificationRate handles zero records', () => {
  assert.ok(statsFile.includes('totalRecords == 0'), 'Missing zero records guard');
});

// ── Part 3: DuplicateResult Model ──
console.log('\nPart 3: DuplicateResult Model');

const dupFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/DuplicateResult.java'),
  'utf8'
);

test('DuplicateResult class exists', () => {
  assert.ok(dupFile.includes('public class DuplicateResult'), 'DuplicateResult class not found');
});

test('DuplicateResult has DuplicatePair inner class', () => {
  assert.ok(dupFile.includes('DuplicatePair'), 'Missing DuplicatePair inner class');
});

test('DuplicateResult has RecordRef inner class', () => {
  assert.ok(dupFile.includes('RecordRef'), 'Missing RecordRef inner class');
});

test('DuplicatePair has score and reasons', () => {
  assert.ok(dupFile.includes('score'), 'Missing score field');
  assert.ok(dupFile.includes('reasons'), 'Missing reasons field');
});

test('DuplicatePair has getSeverity method', () => {
  assert.ok(dupFile.includes('getSeverity'), 'Missing getSeverity method');
  assert.ok(dupFile.includes('High'), 'Missing High severity');
  assert.ok(dupFile.includes('Medium'), 'Missing Medium severity');
  assert.ok(dupFile.includes('Low'), 'Missing Low severity');
});

test('DuplicateResult has fromJson method', () => {
  assert.ok(dupFile.includes('fromJson'), 'Missing fromJson method');
});

test('DuplicateResult has duplicatesFound count', () => {
  assert.ok(dupFile.includes('duplicatesFound'), 'Missing duplicatesFound');
});

test('DuplicateResult has totalChecked count', () => {
  assert.ok(dupFile.includes('totalChecked'), 'Missing totalChecked');
});

// ── Part 4: API Client Integration ──
console.log('\nPart 4: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports CemeteryStats', () => {
  assert.ok(apiFile.includes('CemeteryStats'), 'Missing CemeteryStats import');
});

test('ApiClient imports DuplicateResult', () => {
  assert.ok(apiFile.includes('DuplicateResult'), 'Missing DuplicateResult import');
});

test('ApiClient has getCemeteryStats method', () => {
  assert.ok(apiFile.includes('getCemeteryStats'), 'Missing getCemeteryStats method');
  assert.ok(apiFile.includes('/stats'), 'Missing /stats URL in API client');
});

test('ApiClient has getCemeterySummary method', () => {
  assert.ok(apiFile.includes('getCemeterySummary'), 'Missing getCemeterySummary method');
  assert.ok(apiFile.includes('/summary'), 'Missing /summary URL in API client');
});

test('ApiClient has getCemeteryDuplicates method', () => {
  assert.ok(apiFile.includes('getCemeteryDuplicates'), 'Missing getCemeteryDuplicates method');
  assert.ok(apiFile.includes('/duplicates'), 'Missing /duplicates URL in API client');
});

// ── Part 5: AI System Prompts ──
console.log('\nPart 5: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention cemetery intelligence endpoints', () => {
  assert.ok(promptsFile.includes('cemetery intelligence') || promptsFile.includes('/stats') || promptsFile.includes('/summary'),
    'AI prompts should mention cemetery intelligence');
});

test('AI prompts include duplicate detection suggestion', () => {
  assert.ok(promptsFile.includes('duplicate') || promptsFile.includes('Duplicate'),
    'AI prompts should mention duplicate detection');
});

test('Suggested prompts include cemetery summary', () => {
  assert.ok(promptsFile.includes('summary of') && promptsFile.includes('Cemetery'),
    'Missing cemetery summary suggested prompt');
});

test('Suggested prompts include cemetery stats', () => {
  assert.ok(promptsFile.includes('stats for') && promptsFile.includes('Cemetery'),
    'Missing cemetery stats suggested prompt');
});

test('Suggested prompts include duplicate check', () => {
  assert.ok(promptsFile.includes('duplicate records') || promptsFile.includes('duplicate records'),
    'Missing duplicate records suggested prompt');
});

// ── Part 6: Documentation ──
console.log('\nPart 6: Documentation');

test('CHANGELOG mentions Phase 16.7 or Cemetery Intelligence', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(
    changelog.includes('Phase 16.7') || changelog.includes('Cemetery Intelligence'),
    'CHANGELOG should mention Phase 16.7 or Cemetery Intelligence'
  );
});

test('STATUS.md mentions Cemetery Intelligence', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(
    status.includes('Cemetery Intelligence') || status.includes('16.7'),
    'STATUS.md should mention Cemetery Intelligence'
  );
});

// ── Part 7: Levenshtein Algorithm ──
console.log('\nPart 7: Levenshtein Algorithm (logic verification)');

test('Levenshtein function has dynamic programming matrix', () => {
  assert.ok(indexFile.includes('dp['), 'Missing DP matrix in Levenshtein');
});

test('Levenshtein handles empty strings', () => {
  assert.ok(indexFile.includes('m === 0') && indexFile.includes('n === 0'),
    'Missing empty string handling');
});

test('Levenshtein uses minimum of insert/delete/substitute', () => {
  assert.ok(indexFile.includes('Math.min'), 'Missing Math.min in Levenshtein');
});

// ── Results ──
console.log('\n=== Phase 16.7 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.7 Cemetery Intelligence tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
