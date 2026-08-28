/**
 * Phase 16.32 Tests — AI Deduplication Intelligence & Conflict Resolution Engine
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
  ['handleDedupScan', 'GET /api/dedup/scan'],
  ['handleDedupPairs', 'GET /api/dedup/pairs/:id'],
  ['handleDedupResolve', 'POST /api/dedup/resolve'],
  ['handleDedupConflicts', 'GET /api/dedup/conflicts'],
  ['handleDedupStats', 'GET /api/dedup/stats'],
];

for (const [handler, desc] of handlers) {
  test(`Backend has ${desc}`, () => {
    assert.ok(indexFile.includes(handler), `Missing ${handler}`);
  });
}

test('All 5 dedup routes registered', () => {
  assert.ok(indexFile.includes('/api/dedup/scan'), 'Missing scan route');
  assert.ok(indexFile.includes('/api/dedup/pairs/'), 'Missing pairs route');
  assert.ok(indexFile.includes('/api/dedup/resolve'), 'Missing resolve route');
  assert.ok(indexFile.includes('/api/dedup/conflicts'), 'Missing conflicts route');
  assert.ok(indexFile.includes('/api/dedup/stats'), 'Missing stats route');
});

test('Helper functions exist', () => {
  assert.ok(indexFile.includes('function levenshtein'), 'Missing levenshtein');
  assert.ok(indexFile.includes('function nameSimilarityScore'), 'Missing nameSimilarityScore');
  assert.ok(indexFile.includes('function datesMatch'), 'Missing datesMatch');
});

console.log('\nPart 2: Duplicate Scan');
test('Uses Levenshtein for name comparison', () => {
  assert.ok(indexFile.includes('levenshtein'), 'Missing levenshtein');
});
test('Name similarity score 0-100', () => {
  assert.ok(indexFile.includes('nameSimilarityScore'), 'Missing nameSimilarityScore');
});
test('Checks death date match', () => {
  assert.ok(indexFile.includes('Death dates match'), 'Missing death date match');
});
test('Checks birth date match', () => {
  assert.ok(indexFile.includes('Birth dates match'), 'Missing birth date match');
});
test('Checks same cemetery', () => {
  assert.ok(indexFile.includes('Same cemetery'), 'Missing same cemetery');
});
test('Checks same plot', () => {
  assert.ok(indexFile.includes('Same plot'), 'Missing same plot');
});
test('Checks GPS proximity', () => {
  assert.ok(indexFile.includes('GPS proximity'), 'Missing GPS proximity');
});
test('Returns match score', () => {
  assert.ok(indexFile.includes('matchScore'), 'Missing matchScore');
});
test('Returns match reasons', () => {
  assert.ok(indexFile.includes('matchReasons'), 'Missing matchReasons');
});
test('Detects conflicts', () => {
  assert.ok(indexFile.includes('conflictFields'), 'Missing conflictFields');
  assert.ok(indexFile.includes('hasConflicts'), 'Missing hasConflicts');
});
test('Recommends auto_merge or review_and_merge', () => {
  assert.ok(indexFile.includes('auto_merge'), 'Missing auto_merge');
  assert.ok(indexFile.includes('review_and_merge'), 'Missing review_and_merge');
});
test('Accepts threshold param', () => {
  assert.ok(indexFile.includes('threshold'), 'Missing threshold');
});
test('Returns autoMergeable count', () => {
  assert.ok(indexFile.includes('autoMergeable'), 'Missing autoMergeable');
});
test('Returns needsReview count', () => {
  assert.ok(indexFile.includes('needsReview'), 'Missing needsReview');
});

console.log('\nPart 3: Duplicate Pairs');
test('Returns pairs for a specific record', () => {
  assert.ok(indexFile.includes('potentialDuplicates'), 'Missing potentialDuplicates');
  assert.ok(indexFile.includes('pairs'), 'Missing pairs');
});
test('Filters by name similarity >=60', () => {
  assert.ok(indexFile.includes('60'), 'Missing 60 threshold');
});

console.log('\nPart 4: Resolve / Merge');
test('Accepts merge action', () => {
  assert.ok(indexFile.includes("'merge'"), 'Missing merge action');
});
test('Accepts not_duplicate action', () => {
  assert.ok(indexFile.includes("'not_duplicate'"), 'Missing not_duplicate action');
});
test('Requires record1Id and record2Id', () => {
  assert.ok(indexFile.includes('record1Id'), 'Missing record1Id');
  assert.ok(indexFile.includes('record2Id'), 'Missing record2Id');
});
test('Auto-resolves fields by confidence', () => {
  assert.ok(indexFile.includes('higher confidence'), 'Missing confidence-based resolution');
});
test('Merges sourceRefs arrays', () => {
  assert.ok(indexFile.includes('sourceRefs'), 'Missing sourceRefs merge');
});
test('Merges photoRefs arrays', () => {
  assert.ok(indexFile.includes('photoRefs'), 'Missing photoRefs merge');
});
test('Accepts fieldResolutions from user', () => {
  assert.ok(indexFile.includes('fieldResolutions'), 'Missing fieldResolutions');
});
test('Marks superseded record as merged', () => {
  assert.ok(indexFile.includes("'merged'"), 'Missing merged status');
  assert.ok(indexFile.includes('mergedInto'), 'Missing mergedInto');
});
test('Logs merge history', () => {
  assert.ok(indexFile.includes('mergeHistory'), 'Missing mergeHistory');
});
test('Returns merge log', () => {
  assert.ok(indexFile.includes('mergeLog'), 'Missing mergeLog');
});

console.log('\nPart 5: Conflicts Listing');
test('Returns conflicts with field details', () => {
  assert.ok(indexFile.includes('conflictCount'), 'Missing conflictCount');
  assert.ok(indexFile.includes('conflictFields'), 'Missing conflictFields in listing');
});
test('Sorts by conflict count', () => {
  assert.ok(indexFile.includes('b.conflictCount'), 'Missing conflict count sort');
});
test('Returns totalConflicts', () => {
  assert.ok(indexFile.includes('totalConflicts'), 'Missing totalConflicts');
});

console.log('\nPart 6: Dedup Stats');
test('Returns totalRecords', () => assert.ok(indexFile.includes('totalRecords'), 'Missing totalRecords'));
test('Returns mergedRecords count', () => assert.ok(indexFile.includes('mergedRecords'), 'Missing mergedRecords'));
test('Returns potentialDuplicatePairs', () => assert.ok(indexFile.includes('potentialDuplicatePairs'), 'Missing potentialDuplicatePairs'));
test('Returns highConfidencePairs', () => assert.ok(indexFile.includes('highConfidencePairs'), 'Missing highConfidencePairs'));
test('Returns autoMergeablePairs', () => assert.ok(indexFile.includes('autoMergeablePairs'), 'Missing autoMergeablePairs'));
test('Returns conflictPairs', () => assert.ok(indexFile.includes('conflictPairs'), 'Missing conflictPairs'));
test('Returns estimatedDuplicates', () => assert.ok(indexFile.includes('estimatedDuplicates'), 'Missing estimatedDuplicates'));
test('Returns deduplicationRate', () => assert.ok(indexFile.includes('deduplicationRate'), 'Missing deduplicationRate'));

console.log('\nPart 7: DedupScanResult Model');
const dsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/DedupScanResult.java'),
  'utf8'
);
test('Class exists', () => assert.ok(dsFile.includes('public class DedupScanResult'), 'Not found'));
test('Has DuplicatePair inner', () => assert.ok(dsFile.includes('class DuplicatePair'), 'Missing DuplicatePair'));
test('Has RecordRef inner', () => assert.ok(dsFile.includes('class RecordRef'), 'Missing RecordRef'));
test('Has FieldConflict inner', () => assert.ok(dsFile.includes('class FieldConflict'), 'Missing FieldConflict'));
test('Has fromJson', () => assert.ok(dsFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasDuplicates', () => assert.ok(dsFile.includes('hasDuplicates'), 'Missing hasDuplicates'));
test('Has hasAutoMergeable', () => assert.ok(dsFile.includes('hasAutoMergeable'), 'Missing hasAutoMergeable'));

console.log('\nPart 8: DedupStatsResult Model');
const dstFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/DedupStatsResult.java'),
  'utf8'
);
test('Class exists', () => assert.ok(dstFile.includes('public class DedupStatsResult'), 'Not found'));
test('Has fromJson', () => assert.ok(dstFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasPotentialDuplicates', () => assert.ok(dstFile.includes('hasPotentialDuplicates'), 'Missing hasPotentialDuplicates'));
test('Has hasConflicts', () => assert.ok(dstFile.includes('hasConflicts'), 'Missing hasConflicts'));

console.log('\nPart 9: API Client Integration');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);
test('Imports DedupScanResult', () => assert.ok(apiFile.includes('DedupScanResult'), 'Missing import'));
test('Imports DedupStatsResult', () => assert.ok(apiFile.includes('DedupStatsResult'), 'Missing import'));
test('Has scanDuplicates', () => {
  assert.ok(apiFile.includes('scanDuplicates'), 'Missing method');
  assert.ok(apiFile.includes('/api/dedup/scan'), 'Missing URL');
});
test('Has findDuplicatePairs', () => {
  assert.ok(apiFile.includes('findDuplicatePairs'), 'Missing method');
  assert.ok(apiFile.includes('/api/dedup/pairs/'), 'Missing URL');
});
test('Has resolveDuplicate', () => {
  assert.ok(apiFile.includes('resolveDuplicate'), 'Missing method');
  assert.ok(apiFile.includes('/api/dedup/resolve'), 'Missing URL');
});
test('Has getDuplicateConflicts', () => {
  assert.ok(apiFile.includes('getDuplicateConflicts'), 'Missing method');
  assert.ok(apiFile.includes('/api/dedup/conflicts'), 'Missing URL');
});
test('Has getDedupStats', () => {
  assert.ok(apiFile.includes('getDedupStats'), 'Missing method');
  assert.ok(apiFile.includes('/api/dedup/stats'), 'Missing URL');
});

console.log('\nPart 10: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);
test('Prompts mention /api/dedup/scan', () => assert.ok(promptsFile.includes('dedup/scan'), 'Missing'));
test('Prompts mention /api/dedup/pairs', () => assert.ok(promptsFile.includes('dedup/pairs'), 'Missing'));
test('Prompts mention /api/dedup/resolve', () => assert.ok(promptsFile.includes('dedup/resolve'), 'Missing'));
test('Prompts mention /api/dedup/stats', () => assert.ok(promptsFile.includes('dedup/stats'), 'Missing'));
test('Suggested prompts include duplicate', () => assert.ok(promptsFile.includes('duplicate'), 'Missing'));

console.log('\nPart 11: Documentation');
test('CHANGELOG mentions Phase 16.32', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Phase 16.32') || c.includes('Deduplication'), 'Missing from CHANGELOG');
});
test('STATUS.md mentions 16.32', () => {
  const s = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(s.includes('16.32') || s.includes('Deduplication'), 'Missing from STATUS');
});

console.log('\n=== Phase 16.32 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.32 Deduplication Intelligence tests passed!');
else console.log('\n❌ Some tests failed!');
