/**
 * Phase 16.14 Tests — AI Batch Operations
 *
 * Tests:
 * - Backend endpoints: /cleanup/preview, /cleanup, /cleanup/global
 * - HealthSnapshot model
 * - CleanupResult model
 * - GlobalCleanupResult model
 * - computeQuickHealth scoring function
 * - Before/after health comparison
 * - Improvement metrics: scoreDelta, gradeChange, anomalyReduction, contentGain
 * - Dry run support
 * - Fix type filtering
 * - Global aggregation across cemeteries
 * - Top cemeteries by fix count
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

test('Backend has /cleanup/preview endpoint (GET)', () => {
  assert.ok(indexFile.includes('/cleanup/preview') && indexFile.includes('handleCemeteryCleanupPreview'),
    'Missing /cleanup/preview endpoint');
});

test('Backend has /cleanup endpoint (POST)', () => {
  assert.ok(indexFile.includes('/cleanup') && indexFile.includes('handleCemeteryCleanup'),
    'Missing cemetery /cleanup endpoint');
});

test('Backend has /api/cleanup/global endpoint (POST)', () => {
  assert.ok(indexFile.includes('/api/cleanup/global') && indexFile.includes('handleGlobalCleanup'),
    'Missing /api/cleanup/global endpoint');
});

test('All 3 batch operation routes registered', () => {
  const routes = ['handleCemeteryCleanupPreview', 'handleCemeteryCleanup', 'handleGlobalCleanup'];
  for (const r of routes) {
    assert.ok(indexFile.includes(r), `Missing route handler: ${r}`);
  }
});

test('Handlers handle GitHub not configured', () => {
  assert.ok(indexFile.includes('no cleanup available') || indexFile.includes('no cleanup preview available'),
    'Missing GitHub not configured fallback');
});

test('Handlers handle no published records', () => {
  assert.ok(indexFile.includes('No published records found'),
    'Missing empty cemetery handling');
});

// ── Part 2: computeQuickHealth ──
console.log('\nPart 2: computeQuickHealth');

test('computeQuickHealth function exists', () => {
  assert.ok(indexFile.includes('function computeQuickHealth'), 'Missing computeQuickHealth');
});

test('Computes completeness from essential fields', () => {
  assert.ok(indexFile.includes('totalCompleteness'), 'Missing completeness computation');
});

test('Computes coverage from optional fields', () => {
  assert.ok(indexFile.includes('totalCoverage'), 'Missing coverage computation');
});

test('Counts critical anomalies', () => {
  assert.ok(indexFile.includes('criticalCount'), 'Missing critical anomaly count');
});

test('Counts content coverage (photos, inscriptions, sources, coords)', () => {
  assert.ok(indexFile.includes('withPhotos') && indexFile.includes('withInscriptions') &&
    indexFile.includes('withSources') && indexFile.includes('withCoords'),
    'Missing content coverage counts');
});

test('Detects duplicates', () => {
  assert.ok(indexFile.includes('nameDateMap'), 'Missing duplicate detection');
});

test('Computes weighted overall score', () => {
  assert.ok(indexFile.includes('0.30') && indexFile.includes('0.25') && indexFile.includes('0.15'),
    'Missing weighted score formula');
});

test('Assigns letter grade', () => {
  assert.ok(indexFile.includes(">= 90") && indexFile.includes("'A'") && indexFile.includes("'F'"),
    'Missing grade assignment');
});

test('Returns null-like for empty records', () => {
  assert.ok(indexFile.includes("grade: 'N/A'"),
    'Missing empty records handling');
});

// ── Part 3: Cleanup Preview ──
console.log('\nPart 3: Cleanup Preview');

test('Preview computes before-health', () => {
  assert.ok(indexFile.includes('beforeHealth'), 'Missing before-health computation');
});

test('Preview simulates fixes with generateAutoFixes', () => {
  assert.ok(indexFile.includes('generateAutoFixes'),
    'Missing generateAutoFixes call in preview');
});

test('Preview computes simulated after-health', () => {
  assert.ok(indexFile.includes('afterHealth'), 'Missing after-health computation');
});

test('Preview computes scoreDelta', () => {
  assert.ok(indexFile.includes('scoreDelta'), 'Missing scoreDelta');
});

test('Preview computes gradeChange', () => {
  assert.ok(indexFile.includes('gradeDelta') || indexFile.includes('gradeChange'),
    'Missing gradeChange');
});

test('Preview computes anomalyReduction', () => {
  assert.ok(indexFile.includes('anomalyDelta') || indexFile.includes('anomalyReduction'),
    'Missing anomalyReduction');
});

test('Preview computes contentCoverageGain', () => {
  assert.ok(indexFile.includes('contentDelta') || indexFile.includes('contentCoverageGain'),
    'Missing contentCoverageGain');
});

test('Preview counts safe vs risky fixes', () => {
  assert.ok(indexFile.includes('safeProposed') && indexFile.includes('riskyProposed'),
    'Missing safe/risky counts');
});

test('Preview counts fixes by type', () => {
  assert.ok(indexFile.includes('fixTypeCounts'), 'Missing fix type counts');
});

// ── Part 4: Cleanup Apply ──
console.log('\nPart 4: Cleanup Apply');

test('Apply supports dry run', () => {
  assert.ok(indexFile.includes('dryRun'), 'Missing dry run support in cleanup');
});

test('Apply supports fix type filtering', () => {
  assert.ok(indexFile.includes('allowedTypes'), 'Missing fix type filtering');
});

test('Apply only applies high-confidence fixes', () => {
  assert.ok(indexFile.includes("confidence === 'high'"),
    'Missing high-confidence filter in cleanup');
});

test('Apply writes updated records', () => {
  assert.ok(indexFile.includes('writeFile'), 'Missing record writing in cleanup');
});

test('Apply sets updated_date', () => {
  assert.ok(indexFile.includes('updated_date'), 'Missing updated_date in cleanup');
});

test('Apply returns recordsFixed count', () => {
  assert.ok(indexFile.includes('recordsFixed'), 'Missing recordsFixed count');
});

test('Apply returns appliedDetails', () => {
  assert.ok(indexFile.includes('appliedSummary') || indexFile.includes('appliedDetails'),
    'Missing applied details');
});

test('Apply limited to 100 applied details', () => {
  assert.ok(indexFile.includes('slice(0, 100)'), 'Missing 100-detail limit');
});

// ── Part 5: Global Cleanup ──
console.log('\nPart 5: Global Cleanup');

test('Global cleanup gathers all published records', () => {
  assert.ok(indexFile.includes("listFiles('graves'"),
    'Missing grave file listing in global cleanup');
});

test('Global cleanup computes before/after health', () => {
  assert.ok(indexFile.includes('beforeHealth') && indexFile.includes('afterHealth'),
    'Missing before/after in global cleanup');
});

test('Global cleanup tracks per-cemetery stats', () => {
  assert.ok(indexFile.includes('cemeteryStats'), 'Missing per-cemetery stats');
});

test('Global cleanup returns top cemeteries by fix count', () => {
  assert.ok(indexFile.includes('topCemeteries'), 'Missing top cemeteries');
});

test('Global cleanup sorts top cemeteries by fix count descending', () => {
  assert.ok(indexFile.includes('sort'), 'Missing sort for top cemeteries');
});

test('Global cleanup limits top cemeteries to 10', () => {
  assert.ok(indexFile.includes('slice(0, 10)'), 'Missing 10-cemetery limit');
});

test('Global cleanup returns totalCemeteries', () => {
  assert.ok(indexFile.includes('totalCemeteries'), 'Missing totalCemeteries');
});

test('Global cleanup returns totalRecords', () => {
  assert.ok(indexFile.includes('totalRecords'), 'Missing totalRecords');
});

// ── Part 6: HealthSnapshot Model ──
console.log('\nPart 6: HealthSnapshot Model');

const healthFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/HealthSnapshot.java'),
  'utf8'
);

test('HealthSnapshot class exists', () => {
  assert.ok(healthFile.includes('public class HealthSnapshot'), 'Class not found');
});

test('Has AnomalyStats inner class', () => {
  assert.ok(healthFile.includes('class AnomalyStats'), 'Missing AnomalyStats');
});

test('Has ContentStats inner class', () => {
  assert.ok(healthFile.includes('class ContentStats'), 'Missing ContentStats');
});

test('Has DuplicateStats inner class', () => {
  assert.ok(healthFile.includes('class DuplicateStats'), 'Missing DuplicateStats');
});

test('Has fromJson method', () => {
  assert.ok(healthFile.includes('fromJson'), 'Missing fromJson');
});

test('Has getFormattedGrade method', () => {
  assert.ok(healthFile.includes('getFormattedGrade'), 'Missing getFormattedGrade');
});

// ── Part 7: CleanupResult Model ──
console.log('\nPart 7: CleanupResult Model');

const cleanupFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CleanupResult.java'),
  'utf8'
);

test('CleanupResult class exists', () => {
  assert.ok(cleanupFile.includes('public class CleanupResult'), 'Class not found');
});

test('Has CleanupImprovement inner class', () => {
  assert.ok(cleanupFile.includes('class CleanupImprovement'), 'Missing CleanupImprovement');
});

test('Has CleanupFixes inner class', () => {
  assert.ok(cleanupFile.includes('class CleanupFixes'), 'Missing CleanupFixes');
});

test('Has AppliedDetail inner class', () => {
  assert.ok(cleanupFile.includes('class AppliedDetail'), 'Missing AppliedDetail');
});

test('CleanupResult has before and after HealthSnapshot', () => {
  assert.ok(cleanupFile.includes('before') && cleanupFile.includes('after') &&
    cleanupFile.includes('HealthSnapshot'),
    'Missing before/after HealthSnapshot');
});

test('Improvement has scoreDelta and gradeChange', () => {
  assert.ok(cleanupFile.includes('scoreDelta') && cleanupFile.includes('gradeChange'),
    'Missing scoreDelta/gradeChange');
});

test('Improvement has anomalyReduction and contentCoverageGain', () => {
  assert.ok(cleanupFile.includes('anomalyReduction') && cleanupFile.includes('contentCoverageGain'),
    'Missing anomalyReduction/contentCoverageGain');
});

test('Improvement has safeFixes and riskyFixes', () => {
  assert.ok(cleanupFile.includes('safeFixes') && cleanupFile.includes('riskyFixes'),
    'Missing safeFixes/riskyFixes');
});

test('Improvement has fixTypeCounts map', () => {
  assert.ok(cleanupFile.includes('fixTypeCounts'), 'Missing fixTypeCounts');
});

test('Has hasImprovement method', () => {
  assert.ok(cleanupFile.includes('hasImprovement'), 'Missing hasImprovement');
});

test('Has getBeforeAfterSummary method', () => {
  assert.ok(cleanupFile.includes('getBeforeAfterSummary'), 'Missing getBeforeAfterSummary');
});

test('Handles null gradeChange', () => {
  assert.ok(cleanupFile.includes('"null"'), 'Missing null gradeChange handling');
});

// ── Part 8: GlobalCleanupResult Model ──
console.log('\nPart 8: GlobalCleanupResult Model');

const globalCleanupFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/GlobalCleanupResult.java'),
  'utf8'
);

test('GlobalCleanupResult class exists', () => {
  assert.ok(globalCleanupFile.includes('public class GlobalCleanupResult'), 'Class not found');
});

test('Has GlobalImprovement inner class', () => {
  assert.ok(globalCleanupFile.includes('class GlobalImprovement'), 'Missing GlobalImprovement');
});

test('Has GlobalFixes inner class', () => {
  assert.ok(globalCleanupFile.includes('class GlobalFixes'), 'Missing GlobalFixes');
});

test('Has CemeteryFixStat inner class', () => {
  assert.ok(globalCleanupFile.includes('class CemeteryFixStat'), 'Missing CemeteryFixStat');
});

test('Has before and after HealthSnapshot', () => {
  assert.ok(globalCleanupFile.includes('HealthSnapshot'),
    'Missing HealthSnapshot in global cleanup');
});

test('Has topCemeteries list', () => {
  assert.ok(globalCleanupFile.includes('topCemeteries'), 'Missing topCemeteries');
});

test('Has fromJson method', () => {
  assert.ok(globalCleanupFile.includes('fromJson'), 'Missing fromJson');
});

test('Has getSummaryLine method', () => {
  assert.ok(globalCleanupFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 9: API Client Integration ──
console.log('\nPart 9: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports CleanupResult', () => {
  assert.ok(apiFile.includes('CleanupResult'), 'Missing CleanupResult import');
});

test('ApiClient imports GlobalCleanupResult', () => {
  assert.ok(apiFile.includes('GlobalCleanupResult'), 'Missing GlobalCleanupResult import');
});

test('ApiClient has previewCemeteryCleanup method', () => {
  assert.ok(apiFile.includes('previewCemeteryCleanup'), 'Missing previewCemeteryCleanup');
  assert.ok(apiFile.includes('/cleanup/preview'), 'Missing /cleanup/preview URL');
});

test('ApiClient has runCemeteryCleanup method', () => {
  assert.ok(apiFile.includes('runCemeteryCleanup'), 'Missing runCemeteryCleanup');
  assert.ok(apiFile.includes('/cleanup'), 'Missing /cleanup URL');
});

test('ApiClient has runGlobalCleanup method', () => {
  assert.ok(apiFile.includes('runGlobalCleanup'), 'Missing runGlobalCleanup');
  assert.ok(apiFile.includes('/api/cleanup/global'), 'Missing /api/cleanup/global URL');
});

// ── Part 10: AI System Prompts ──
console.log('\nPart 10: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention cleanup', () => {
  assert.ok(promptsFile.includes('cleanup'), 'AI prompts should mention cleanup');
});

test('AI prompts mention cleanup preview', () => {
  assert.ok(promptsFile.includes('cleanup/preview'),
    'Missing cleanup/preview in prompts');
});

test('AI prompts mention global cleanup', () => {
  assert.ok(promptsFile.includes('cleanup/global'),
    'Missing cleanup/global in prompts');
});

test('Suggested prompts include "Run a cleanup pass"', () => {
  assert.ok(promptsFile.includes('Run a cleanup pass'),
    'Missing "Run a cleanup pass" suggested prompt');
});

test('Suggested prompts include "global cleanup preview"', () => {
  assert.ok(promptsFile.includes('global cleanup preview'),
    'Missing "global cleanup preview" suggested prompt');
});

// ── Part 11: Documentation ──
console.log('\nPart 11: Documentation');

test('CHANGELOG mentions Phase 16.14 or Batch Operations', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.14') || changelog.includes('Batch Operations'),
    'CHANGELOG should mention Phase 16.14');
});

test('STATUS.md mentions Batch Operations', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Batch') || status.includes('16.14'),
    'STATUS.md should mention Batch Operations');
});

// ── Results ──
console.log('\n=== Phase 16.14 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.14 Batch Operations tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
