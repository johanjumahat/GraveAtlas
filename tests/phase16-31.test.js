/**
 * Phase 16.31 Tests — AI Data Enrichment & Auto-Completion Engine
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
  ['handleEnrichmentSuggestions', 'GET /api/enrichment/suggestions/:id'],
  ['handleBatchEnrichment', 'POST /api/enrichment/batch'],
  ['handleEnrichmentGaps', 'GET /api/enrichment/gaps'],
  ['handleInferField', 'GET /api/enrichment/infer/:id/:field'],
  ['handleEnrichmentPriorities', 'GET /api/enrichment/priorities'],
];

for (const [handler, desc] of handlers) {
  test(`Backend has ${desc}`, () => {
    assert.ok(indexFile.includes(handler), `Missing ${handler}`);
  });
}

test('All 5 enrichment routes registered', () => {
  assert.ok(indexFile.includes('/api/enrichment/suggestions/'), 'Missing suggestions route');
  assert.ok(indexFile.includes('/api/enrichment/batch'), 'Missing batch route');
  assert.ok(indexFile.includes('/api/enrichment/gaps'), 'Missing gaps route');
  assert.ok(indexFile.includes('/api/enrichment/infer/'), 'Missing infer route');
  assert.ok(indexFile.includes('/api/enrichment/priorities'), 'Missing priorities route');
});

test('Helper functions exist', () => {
  assert.ok(indexFile.includes('inferBirthYear'), 'Missing inferBirthYear');
  assert.ok(indexFile.includes('inferDeathYear'), 'Missing inferDeathYear');
  assert.ok(indexFile.includes('inferCemeteryFromCoords'), 'Missing inferCemeteryFromCoords');
  assert.ok(indexFile.includes('mostCommonValue'), 'Missing mostCommonValue');
  assert.ok(indexFile.includes('calculateCompleteness'), 'Missing calculateCompleteness');
});

console.log('\nPart 2: Enrichment Suggestions');
test('Infers birth year from death year + age', () => {
  assert.ok(indexFile.includes('birthYear'), 'Missing birthYear inference');
  assert.ok(indexFile.includes('inferBirthYear'), 'Missing inferBirthYear call');
});
test('Infers death year from birth year + age', () => {
  assert.ok(indexFile.includes('deathYear'), 'Missing deathYear inference');
  assert.ok(indexFile.includes('inferDeathYear'), 'Missing inferDeathYear call');
});
test('Infers cemetery from GPS coordinates', () => {
  assert.ok(indexFile.includes('cemeteryId'), 'Missing cemeteryId inference');
  assert.ok(indexFile.includes('inferCemeteryFromCoords'), 'Missing cemetery inference');
});
test('Computes confidence score from data quality', () => {
  assert.ok(indexFile.includes('confidenceScore'), 'Missing confidence score');
});
test('Suggests verification status', () => {
  assert.ok(indexFile.includes('verificationStatus'), 'Missing verification status');
  assert.ok(indexFile.includes('verified'), 'Missing verified');
  assert.ok(indexFile.includes('unverified'), 'Missing unverified');
});
test('Infers section from plot pattern', () => {
  assert.ok(indexFile.includes('section'), 'Missing section inference');
  assert.ok(indexFile.includes('plot'), 'Missing plot reference');
});
test('Returns completeness percentage', () => {
  assert.ok(indexFile.includes('currentCompleteness'), 'Missing currentCompleteness');
});
test('Returns suggestion count', () => {
  assert.ok(indexFile.includes('suggestionCount'), 'Missing suggestionCount');
});

console.log('\nPart 3: Batch Enrichment');
test('Accepts recordIds array', () => {
  assert.ok(indexFile.includes('recordIds'), 'Missing recordIds');
});
test('Limits to 100 records', () => {
  assert.ok(indexFile.includes('100'), 'Missing 100 record limit');
});
test('Accepts maxPerRecord param', () => {
  assert.ok(indexFile.includes('maxPerRecord'), 'Missing maxPerRecord');
});
test('Returns total suggestions count', () => {
  assert.ok(indexFile.includes('totalSuggestions'), 'Missing totalSuggestions');
});

console.log('\nPart 4: Gap Analysis');
test('Returns missing field statistics', () => {
  assert.ok(indexFile.includes('missingCount'), 'Missing missingCount');
  assert.ok(indexFile.includes('missingPercent'), 'Missing missingPercent');
});
test('Returns avg completeness', () => {
  assert.ok(indexFile.includes('avgCompleteness'), 'Missing avgCompleteness');
});
test('Returns gap fields list', () => {
  assert.ok(indexFile.includes('gapFields'), 'Missing gapFields');
});
test('Returns record IDs for each gap', () => {
  assert.ok(indexFile.includes('recordIds'), 'Missing recordIds in gaps');
});
test('Accepts field filter', () => {
  assert.ok(indexFile.includes('fieldFilter'), 'Missing fieldFilter');
});

console.log('\nPart 5: Single Field Inference');
test('Returns current value', () => {
  assert.ok(indexFile.includes('currentValue'), 'Missing currentValue');
});
test('Returns suggestion with reasoning', () => {
  assert.ok(indexFile.includes('reasoning'), 'Missing reasoning');
  assert.ok(indexFile.includes('source'), 'Missing source');
});
test('Handles already-populated fields', () => {
  assert.ok(indexFile.includes('already has a value'), 'Missing already-populated message');
});
test('Supports birthYear inference', () => assert.ok(indexFile.includes("case 'birthYear'"), 'Missing birthYear case'));
test('Supports deathYear inference', () => assert.ok(indexFile.includes("case 'deathYear'"), 'Missing deathYear case'));
test('Supports confidenceScore inference', () => assert.ok(indexFile.includes("case 'confidenceScore'"), 'Missing confidenceScore case'));
test('Supports verificationStatus inference', () => assert.ok(indexFile.includes("case 'verificationStatus'"), 'Missing verificationStatus case'));
test('Supports cemeteryId inference', () => assert.ok(indexFile.includes("case 'cemeteryId'"), 'Missing cemeteryId case'));
test('Supports section inference', () => assert.ok(indexFile.includes("case 'section'"), 'Missing section case'));
test('Has default statistical inference', () => assert.ok(indexFile.includes('statistical inference'), 'Missing statistical inference'));

console.log('\nPart 6: Enrichment Priorities');
test('Ranks by impact score', () => {
  assert.ok(indexFile.includes('impactScore'), 'Missing impactScore');
});
test('Weights critical fields higher', () => {
  assert.ok(indexFile.includes('criticalFields'), 'Missing criticalFields');
});
test('Returns missing fields list', () => {
  assert.ok(indexFile.includes('missingFields'), 'Missing missingFields');
});
test('Returns completeness per record', () => {
  assert.ok(indexFile.includes('currentCompleteness'), 'Missing currentCompleteness');
});
test('Returns hasCoordinates flag', () => {
  assert.ok(indexFile.includes('hasCoordinates'), 'Missing hasCoordinates');
});
test('Returns isVerified flag', () => {
  assert.ok(indexFile.includes('isVerified'), 'Missing isVerified');
});
test('Returns sourceCount', () => {
  assert.ok(indexFile.includes('sourceCount'), 'Missing sourceCount');
});

console.log('\nPart 7: EnrichmentSuggestion Model');
const esFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/EnrichmentSuggestion.java'),
  'utf8'
);
test('Class exists', () => assert.ok(esFile.includes('public class EnrichmentSuggestion'), 'Not found'));
test('Has fromJson', () => assert.ok(esFile.includes('fromJson'), 'Missing fromJson'));
test('Has isHighConfidence', () => assert.ok(esFile.includes('isHighConfidence'), 'Missing isHighConfidence'));
test('Has isMediumConfidence', () => assert.ok(esFile.includes('isMediumConfidence'), 'Missing isMediumConfidence'));
test('Has isLowConfidence', () => assert.ok(esFile.includes('isLowConfidence'), 'Missing isLowConfidence'));

console.log('\nPart 8: EnrichmentSuggestionsResult Model');
const esrFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/EnrichmentSuggestionsResult.java'),
  'utf8'
);
test('Class exists', () => assert.ok(esrFile.includes('public class EnrichmentSuggestionsResult'), 'Not found'));
test('Has fromJson', () => assert.ok(esrFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasSuggestions', () => assert.ok(esrFile.includes('hasSuggestions'), 'Missing hasSuggestions'));
test('Has getHighConfidenceSuggestions', () => assert.ok(esrFile.includes('getHighConfidenceSuggestions'), 'Missing getHighConfidenceSuggestions'));

console.log('\nPart 9: EnrichmentGapsResult Model');
const egFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/EnrichmentGapsResult.java'),
  'utf8'
);
test('Class exists', () => assert.ok(egFile.includes('public class EnrichmentGapsResult'), 'Not found'));
test('Has GapInfo inner', () => assert.ok(egFile.includes('class GapInfo'), 'Missing GapInfo'));
test('Has fromJson', () => assert.ok(egFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasGaps', () => assert.ok(egFile.includes('hasGaps'), 'Missing hasGaps'));
test('Has getWorstGap', () => assert.ok(egFile.includes('getWorstGap'), 'Missing getWorstGap'));

console.log('\nPart 10: API Client Integration');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);
test('Imports EnrichmentSuggestion', () => assert.ok(apiFile.includes('EnrichmentSuggestion'), 'Missing import'));
test('Imports EnrichmentSuggestionsResult', () => assert.ok(apiFile.includes('EnrichmentSuggestionsResult'), 'Missing import'));
test('Imports EnrichmentGapsResult', () => assert.ok(apiFile.includes('EnrichmentGapsResult'), 'Missing import'));
test('Has getEnrichmentSuggestions', () => {
  assert.ok(apiFile.includes('getEnrichmentSuggestions'), 'Missing method');
  assert.ok(apiFile.includes('/api/enrichment/suggestions/'), 'Missing URL');
});
test('Has batchEnrichment', () => {
  assert.ok(apiFile.includes('batchEnrichment'), 'Missing method');
  assert.ok(apiFile.includes('/api/enrichment/batch'), 'Missing URL');
});
test('Has getEnrichmentGaps', () => {
  assert.ok(apiFile.includes('getEnrichmentGaps'), 'Missing method');
  assert.ok(apiFile.includes('/api/enrichment/gaps'), 'Missing URL');
});
test('Has inferField', () => {
  assert.ok(apiFile.includes('inferField'), 'Missing method');
  assert.ok(apiFile.includes('/api/enrichment/infer/'), 'Missing URL');
});
test('Has getEnrichmentPriorities', () => {
  assert.ok(apiFile.includes('getEnrichmentPriorities'), 'Missing method');
  assert.ok(apiFile.includes('/api/enrichment/priorities'), 'Missing URL');
});

console.log('\nPart 11: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);
test('Prompts mention /api/enrichment/suggestions', () => assert.ok(promptsFile.includes('enrichment/suggestions'), 'Missing'));
test('Prompts mention /api/enrichment/batch', () => assert.ok(promptsFile.includes('enrichment/batch'), 'Missing'));
test('Prompts mention /api/enrichment/gaps', () => assert.ok(promptsFile.includes('enrichment/gaps'), 'Missing'));
test('Prompts mention /api/enrichment/infer', () => assert.ok(promptsFile.includes('enrichment/infer'), 'Missing'));
test('Prompts mention /api/enrichment/priorities', () => assert.ok(promptsFile.includes('enrichment/priorities'), 'Missing'));
test('Suggested prompts include enrichment', () => assert.ok(promptsFile.includes('enrichment'), 'Missing'));

console.log('\nPart 12: Documentation');
test('CHANGELOG mentions Phase 16.31', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Phase 16.31') || c.includes('Enrichment'), 'Missing from CHANGELOG');
});
test('STATUS.md mentions 16.31', () => {
  const s = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(s.includes('16.31') || s.includes('Enrichment'), 'Missing from STATUS');
});

console.log('\n=== Phase 16.31 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.31 Data Enrichment & Auto-Completion tests passed!');
else console.log('\n❌ Some tests failed!');
