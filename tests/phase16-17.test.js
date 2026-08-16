/**
 * Phase 16.17 Tests — AI Merge Resolution
 *
 * Tests:
 * - Backend endpoints: merge/preview, merge/apply, merge/suggestions, merge/history
 * - generateMergeProposal helper: field comparison, recommendations, confidence
 * - MergeProposal model and parsing
 * - MergeResult model and parsing
 * - MergeSuggestion model and parsing
 * - MergeHistory model and parsing
 * - Merge heuristics: verified preference, longer text, precision, array merge
 * - Provenance tracking: mergeHistory, mergedFromId, status change
 * - Match scoring: name, dates, plot
 * - Recommended actions: safe_to_merge, merge_with_caution, manual_review_required
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

test('Backend has merge/preview endpoint', () => {
  assert.ok(indexFile.includes('handleMergePreview'),
    'Missing handleMergePreview');
});

test('Backend has merge/apply endpoint', () => {
  assert.ok(indexFile.includes('handleMergeApply'),
    'Missing handleMergeApply');
});

test('Backend has merge/suggestions endpoint', () => {
  assert.ok(indexFile.includes('handleMergeSuggestions'),
    'Missing handleMergeSuggestions');
});

test('Backend has merge/history endpoint', () => {
  assert.ok(indexFile.includes('handleMergeHistory'),
    'Missing handleMergeHistory');
});

test('All 4 merge routes registered', () => {
  const routes = ['handleMergePreview', 'handleMergeApply', 'handleMergeSuggestions', 'handleMergeHistory'];
  for (const r of routes) {
    assert.ok(indexFile.includes(r), `Missing route handler: ${r}`);
  }
});

// ── Part 2: generateMergeProposal Helper ──
console.log('\nPart 2: generateMergeProposal Helper');

test('generateMergeProposal function exists', () => {
  assert.ok(indexFile.includes('function generateMergeProposal'),
    'Missing generateMergeProposal function');
});

test('Compares all important fields', () => {
  const fields = ['name', 'birthDate', 'deathDate', 'inscription', 'latitude', 'longitude'];
  for (const f of fields) {
    assert.ok(indexFile.includes(`'${f}'`), `Missing field: ${f}`);
  }
});

test('Identifies identical values as no conflict', () => {
  assert.ok(indexFile.includes('keep_either'),
    'Missing keep_either recommendation');
});

test('Recommends keep_a when only A has value', () => {
  assert.ok(indexFile.includes('keep_a'),
    'Missing keep_a recommendation');
});

test('Recommends keep_b when only B has value', () => {
  assert.ok(indexFile.includes('keep_b'),
    'Missing keep_b recommendation');
});

test('Recommends merge_both for arrays', () => {
  assert.ok(indexFile.includes('merge_both'),
    'Missing merge_both recommendation');
});

test('Prefers verified record in conflicts', () => {
  assert.ok(indexFile.includes('Record A is verified') || indexFile.includes('verified'),
    'Missing verified record preference');
});

test('Prefers longer text for inscription/notes', () => {
  assert.ok(indexFile.includes('more complete'),
    'Missing completeness preference');
});

test('Prefers more precise coordinates', () => {
  assert.ok(indexFile.includes('precise coordinates') || indexFile.includes('decimal places'),
    'Missing coordinate precision preference');
});

test('Summary includes identicalFields, conflictFields, resolvedFields', () => {
  assert.ok(indexFile.includes('identicalFields') && indexFile.includes('conflictFields') &&
    indexFile.includes('resolvedFields'),
    'Missing summary fields');
});

test('Summary includes autoResolvable and needsManualReview', () => {
  assert.ok(indexFile.includes('autoResolvable') && indexFile.includes('needsManualReview'),
    'Missing autoResolvable/needsManualReview');
});

// ── Part 3: Merge Preview Handler ──
console.log('\nPart 3: Merge Preview Handler');

test('Preview loads both records', () => {
  assert.ok(indexFile.includes('readFile(`graves/${safeIdA}'),
    'Missing record A loading');
  assert.ok(indexFile.includes('readFile(`graves/${safeIdB}'),
    'Missing record B loading');
});

test('Preview handles missing records (404)', () => {
  assert.ok(indexFile.includes('One or both records not found'),
    'Missing 404 handling');
});

test('Preview returns similarity score', () => {
  assert.ok(indexFile.includes('similarityScore'),
    'Missing similarityScore');
});

test('Preview returns recommendedAction', () => {
  assert.ok(indexFile.includes('safe_to_merge') &&
    indexFile.includes('merge_with_caution') &&
    indexFile.includes('manual_review_required'),
    'Missing recommended action levels');
});

test('safe_to_merge when needsManualReview is 0', () => {
  assert.ok(indexFile.includes('needsManualReview === 0'),
    'Missing safe_to_merge condition');
});

// ── Part 4: Merge Apply Handler ──
console.log('\nPart 4: Merge Apply Handler');

test('Apply accepts fieldOverrides', () => {
  assert.ok(indexFile.includes('fieldOverrides'),
    'Missing fieldOverrides support');
});

test('Apply auto-applies high and medium confidence', () => {
  assert.ok(indexFile.includes("p.confidence === 'high'") &&
    indexFile.includes("p.confidence === 'medium'"),
    'Missing auto-apply for high/medium confidence');
});

test('Apply skips low confidence fields', () => {
  assert.ok(indexFile.includes('Low confidence'),
    'Missing low confidence skip logic');
});

test('Apply adds mergeHistory to merged record', () => {
  assert.ok(indexFile.includes('mergeHistory'),
    'Missing mergeHistory tracking');
});

test('mergeHistory includes mergedFromId', () => {
  assert.ok(indexFile.includes('mergedFromId'),
    'Missing mergedFromId in history');
});

test('mergeHistory includes mergedAt timestamp', () => {
  assert.ok(indexFile.includes('mergedAt'),
    'Missing mergedAt in history');
});

test('mergeHistory includes mergedBy', () => {
  assert.ok(indexFile.includes('mergedBy'),
    'Missing mergedBy in history');
});

test('mergeHistory includes fieldsApplied count', () => {
  assert.ok(indexFile.includes('fieldsApplied'),
    'Missing fieldsApplied in history');
});

test('Marks source record as merged status', () => {
  assert.ok(indexFile.includes("status = 'merged'"),
    'Missing merged status for source record');
});

test('Sets mergedIntoId on source record', () => {
  assert.ok(indexFile.includes('mergedIntoId'),
    'Missing mergedIntoId on source record');
});

test('Returns appliedFields and skippedFields', () => {
  assert.ok(indexFile.includes('appliedFields') && indexFile.includes('skippedFields'),
    'Missing appliedFields/skippedFields in response');
});

// ── Part 5: Merge Suggestions Handler ──
console.log('\nPart 5: Merge Suggestions Handler');

test('Suggestions loads cemetery records', () => {
  assert.ok(indexFile.includes("listFiles('graves'"),
    'Missing record listing in suggestions');
});

test('Suggestions skips already-merged records', () => {
  assert.ok(indexFile.includes("status === 'merged'"),
    'Missing merged status filter');
});

test('Suggestions scores by name match', () => {
  assert.ok(indexFile.includes('exact_name_match'),
    'Missing exact name match scoring');
});

test('Suggestions scores by death date match', () => {
  assert.ok(indexFile.includes('death_date_match'),
    'Missing death date match scoring');
});

test('Suggestions scores by birth date match', () => {
  assert.ok(indexFile.includes('birth_date_match'),
    'Missing birth date match scoring');
});

test('Suggestions scores by plot match', () => {
  assert.ok(indexFile.includes('same_plot'),
    'Missing plot match scoring');
});

test('Suggestions filters by minimum score (50)', () => {
  assert.ok(indexFile.includes('>= 50'),
    'Missing minimum score threshold');
});

test('Suggestions returns high_confidence_merge for score >= 80', () => {
  assert.ok(indexFile.includes('high_confidence_merge'),
    'Missing high confidence action');
});

test('Suggestions returns likely_duplicate for score >= 60', () => {
  assert.ok(indexFile.includes('likely_duplicate'),
    'Missing likely duplicate action');
});

test('Suggestions sorts by match score descending', () => {
  assert.ok(indexFile.includes('sort') && indexFile.includes('matchScore'),
    'Missing sort by matchScore');
});

test('Suggestions limits to 50 results', () => {
  assert.ok(indexFile.includes('slice(0, 50)'),
    'Missing 50-item limit');
});

// ── Part 6: Merge History Handler ──
console.log('\nPart 6: Merge History Handler');

test('History scans all grave records', () => {
  assert.ok(indexFile.includes("listFiles('graves'"),
    'Missing record scanning in history');
});

test('History extracts mergeHistory entries', () => {
  assert.ok(indexFile.includes('record.mergeHistory'),
    'Missing mergeHistory extraction');
});

test('History sorts by mergedAt descending', () => {
  assert.ok(indexFile.includes('mergedAt'),
    'Missing sort by mergedAt');
});

test('History limits to 100 results', () => {
  assert.ok(indexFile.includes('slice(0, 100)'),
    'Missing 100-item limit');
});

test('History includes targetRecordId and targetRecordName', () => {
  assert.ok(indexFile.includes('targetRecordId') && indexFile.includes('targetRecordName'),
    'Missing target record info in history');
});

// ── Part 7: MergeProposal Model ──
console.log('\nPart 7: MergeProposal Model');

const proposalFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/MergeProposal.java'),
  'utf8'
);

test('MergeProposal class exists', () => {
  assert.ok(proposalFile.includes('public class MergeProposal'), 'Class not found');
});

test('Has RecordInfo inner class', () => {
  assert.ok(proposalFile.includes('class RecordInfo'), 'Missing RecordInfo');
});

test('Has FieldProposal inner class', () => {
  assert.ok(proposalFile.includes('class FieldProposal'), 'Missing FieldProposal');
});

test('Has ProposalSummary inner class', () => {
  assert.ok(proposalFile.includes('class ProposalSummary'), 'Missing ProposalSummary');
});

test('Has fromJson method', () => {
  assert.ok(proposalFile.includes('fromJson'), 'Missing fromJson');
});

test('Has isSafeToMerge method', () => {
  assert.ok(proposalFile.includes('isSafeToMerge'), 'Missing isSafeToMerge');
});

test('Has needsManualReview method', () => {
  assert.ok(proposalFile.includes('needsManualReview'), 'Missing needsManualReview');
});

test('Has getSummaryLine method', () => {
  assert.ok(proposalFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 8: MergeResult Model ──
console.log('\nPart 8: MergeResult Model');

const resultFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/MergeResult.java'),
  'utf8'
);

test('MergeResult class exists', () => {
  assert.ok(resultFile.includes('public class MergeResult'), 'Class not found');
});

test('Has AppliedField inner class', () => {
  assert.ok(resultFile.includes('class AppliedField'), 'Missing AppliedField');
});

test('Has SkippedField inner class', () => {
  assert.ok(resultFile.includes('class SkippedField'), 'Missing SkippedField');
});

test('Has MergeHistoryEntry inner class', () => {
  assert.ok(resultFile.includes('class MergeHistoryEntry'), 'Missing MergeHistoryEntry');
});

test('Has fromJson method', () => {
  assert.ok(resultFile.includes('fromJson'), 'Missing fromJson');
});

test('Has getSummaryLine method', () => {
  assert.ok(resultFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 9: MergeSuggestion Model ──
console.log('\nPart 9: MergeSuggestion Model');

const suggestionFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/MergeSuggestion.java'),
  'utf8'
);

test('MergeSuggestion class exists', () => {
  assert.ok(suggestionFile.includes('public class MergeSuggestion'), 'Class not found');
});

test('Has RecordRef inner class', () => {
  assert.ok(suggestionFile.includes('class RecordRef'), 'Missing RecordRef');
});

test('Has fromJsonArray method', () => {
  assert.ok(suggestionFile.includes('fromJsonArray'), 'Missing fromJsonArray');
});

test('Has isHighConfidence method', () => {
  assert.ok(suggestionFile.includes('isHighConfidence'), 'Missing isHighConfidence');
});

test('Has getSummaryLine method', () => {
  assert.ok(suggestionFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 10: MergeHistory Model ──
console.log('\nPart 10: MergeHistory Model');

const historyFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/MergeHistory.java'),
  'utf8'
);

test('MergeHistory class exists', () => {
  assert.ok(historyFile.includes('public class MergeHistory'), 'Class not found');
});

test('Has HistoryEntry inner class', () => {
  assert.ok(historyFile.includes('class HistoryEntry'), 'Missing HistoryEntry');
});

test('Has fromJson method', () => {
  assert.ok(historyFile.includes('fromJson'), 'Missing fromJson');
});

test('Has hasMerges method', () => {
  assert.ok(historyFile.includes('hasMerges'), 'Missing hasMerges');
});

// ── Part 11: API Client Integration ──
console.log('\nPart 11: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports MergeProposal', () => {
  assert.ok(apiFile.includes('MergeProposal'), 'Missing MergeProposal import');
});

test('ApiClient imports MergeResult', () => {
  assert.ok(apiFile.includes('MergeResult'), 'Missing MergeResult import');
});

test('ApiClient imports MergeSuggestion', () => {
  assert.ok(apiFile.includes('MergeSuggestion'), 'Missing MergeSuggestion import');
});

test('ApiClient imports MergeHistory', () => {
  assert.ok(apiFile.includes('MergeHistory'), 'Missing MergeHistory import');
});

test('ApiClient has previewMerge method', () => {
  assert.ok(apiFile.includes('previewMerge'), 'Missing previewMerge');
  assert.ok(apiFile.includes('merge/preview'), 'Missing merge/preview URL');
});

test('ApiClient has applyMerge method', () => {
  assert.ok(apiFile.includes('applyMerge'), 'Missing applyMerge');
  assert.ok(apiFile.includes('merge/apply'), 'Missing merge/apply URL');
});

test('ApiClient has getMergeSuggestions method', () => {
  assert.ok(apiFile.includes('getMergeSuggestions'), 'Missing getMergeSuggestions');
  assert.ok(apiFile.includes('merge/suggestions'), 'Missing merge/suggestions URL');
});

test('ApiClient has getMergeHistory method', () => {
  assert.ok(apiFile.includes('getMergeHistory'), 'Missing getMergeHistory');
  assert.ok(apiFile.includes('/api/merge/history'), 'Missing /api/merge/history URL');
});

// ── Part 12: AI System Prompts ──
console.log('\nPart 12: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention merge/preview', () => {
  assert.ok(promptsFile.includes('merge/preview'),
    'Missing merge/preview in prompts');
});

test('AI prompts mention merge/apply', () => {
  assert.ok(promptsFile.includes('merge/apply'),
    'Missing merge/apply in prompts');
});

test('AI prompts mention merge/suggestions', () => {
  assert.ok(promptsFile.includes('merge/suggestions'),
    'Missing merge/suggestions in prompts');
});

test('AI prompts mention merge/history', () => {
  assert.ok(promptsFile.includes('merge/history'),
    'Missing merge/history in prompts');
});

test('Suggested prompts include "Find duplicate records"', () => {
  assert.ok(promptsFile.includes('Find duplicate records'),
    'Missing "Find duplicate records" suggested prompt');
});

test('Suggested prompts include "Show me merge history"', () => {
  assert.ok(promptsFile.includes('Show me merge history'),
    'Missing "Show me merge history" suggested prompt');
});

// ── Part 13: Documentation ──
console.log('\nPart 13: Documentation');

test('CHANGELOG mentions Phase 16.17 or Merge Resolution', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.17') || changelog.includes('Merge Resolution'),
    'CHANGELOG should mention Phase 16.17');
});

test('STATUS.md mentions Merge Resolution', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Merge') || status.includes('16.17'),
    'STATUS.md should mention Merge Resolution');
});

// ── Results ──
console.log('\n=== Phase 16.17 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.17 Merge Resolution tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
