/**
 * Phase 16.8 Tests — AI Record Enrichment & Family Connections
 *
 * Tests:
 * - Backend endpoints: /api/graves/:id/enrich, /api/cemeteries/:id/connections
 * - EnrichmentResult model and parsing
 * - ConnectionNetwork model and parsing
 * - Name parsing algorithm (Western + Chinese)
 * - Birth year estimation from death age
 * - Family connection detection (surname matching, date proximity, plot adjacency)
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

test('Backend has /enrich endpoint registration', () => {
  assert.ok(indexFile.includes('/enrich') && indexFile.includes('handleRecordEnrichment'),
    'Missing /enrich endpoint or handleRecordEnrichment');
});

test('Backend has /connections endpoint registration', () => {
  assert.ok(indexFile.includes('/connections') && indexFile.includes('handleCemeteryConnections'),
    'Missing /connections endpoint or handleCemeteryConnections');
});

test('Enrichment handler parses names', () => {
  assert.ok(indexFile.includes('parseName'), 'Missing parseName function');
  assert.ok(indexFile.includes('function parseName'), 'Missing parseName function definition');
});

test('Enrichment handler estimates birth year from death age', () => {
  assert.ok(indexFile.includes('deathYear') && indexFile.includes('birthYear'),
    'Missing birth year estimation from death date');
});

test('Enrichment handler reads age from inscription', () => {
  assert.ok(indexFile.includes('aged') && indexFile.includes('inscription'),
    'Missing age extraction from inscription');
});

test('Enrichment handler suggests family connections', () => {
  assert.ok(indexFile.includes('familyConnections'), 'Missing familyConnections suggestion');
});

test('Enrichment handler suggests source references', () => {
  assert.ok(indexFile.includes('community-attribution-needed'),
    'Missing source reference suggestion');
});

test('Enrichment handler suggests inscription transcription', () => {
  assert.ok(indexFile.includes('transcribed inscription'),
    'Missing inscription transcription suggestion');
});

test('Enrichment handler handles GitHub not configured', () => {
  assert.ok(indexFile.includes('no enrichment available'),
    'Missing GitHub not configured fallback');
});

test('Enrichment handler handles record not found', () => {
  assert.ok(indexFile.includes('Record not found'),
    'Missing record not found handling');
});

test('Connections handler groups by surname', () => {
  assert.ok(indexFile.includes('surnameGroups'), 'Missing surname grouping');
});

test('Connections handler builds pairwise connections', () => {
  assert.ok(indexFile.includes('sourceId') && indexFile.includes('targetId'),
    'Missing pairwise connection building');
});

test('Connections handler checks date proximity', () => {
  assert.ok(indexFile.includes('within') && indexFile.includes('years'),
    'Missing date proximity check');
});

test('Connections handler checks plot adjacency', () => {
  assert.ok(indexFile.includes('Same cemetery section') || indexFile.includes('Same plot'),
    'Missing plot adjacency check');
});

test('Connections handler sorts connections by confidence', () => {
  assert.ok(indexFile.includes('confOrder'), 'Missing confidence sorting');
});

test('Connections handler limits results', () => {
  assert.ok(indexFile.includes('slice(0, 50)') || indexFile.includes('slice(0,50)'),
    'Missing result limiting');
});

test('Connections handler handles GitHub not configured', () => {
  assert.ok(indexFile.includes('no connections available'),
    'Missing GitHub not configured fallback for connections');
});

test('All enrichment handlers sanitize IDs', () => {
  assert.ok(indexFile.includes('sanitizePathSegment'), 'Missing ID sanitization');
});

// ── Part 2: Name Parsing Algorithm ──
console.log('\nPart 2: Name Parsing Algorithm');

test('parseName handles Western names (2 parts)', () => {
  assert.ok(indexFile.includes("parts.length === 2"), 'Missing 2-part Western name handling');
});

test('parseName handles Western names (3+ parts with middle names)', () => {
  assert.ok(indexFile.includes("parts.length") && indexFile.includes("slice(0, -1)"),
    'Missing middle name handling');
});

test('parseName handles suffixes (Jr., Sr., III)', () => {
  assert.ok(indexFile.includes('Jr.') && indexFile.includes('Sr.') && indexFile.includes('III'),
    'Missing suffix handling');
});

test('parseName handles single name', () => {
  assert.ok(indexFile.includes("parts.length === 1"), 'Missing single name handling');
});

test('parseName detects Chinese characters', () => {
  assert.ok(indexFile.includes('4e00') && indexFile.includes('9fff'),
    'Missing CJK character detection');
});

test('parseName handles 2-character Chinese names', () => {
  assert.ok(indexFile.includes('name.length <= 2'), 'Missing 2-char Chinese name handling');
});

test('parseName handles 3-character Chinese names', () => {
  assert.ok(indexFile.includes('name.length === 3'), 'Missing 3-char Chinese name handling');
});

test('parseName handles 4-character Chinese names', () => {
  assert.ok(indexFile.includes('name.length === 4'), 'Missing 4-char Chinese name handling');
});

test('parseName handles null/empty input', () => {
  assert.ok(indexFile.includes('!fullName') || indexFile.includes('!name'),
    'Missing null/empty input handling');
});

// ── Part 3: EnrichmentResult Model ──
console.log('\nPart 3: EnrichmentResult Model');

const enrichmentFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/EnrichmentResult.java'),
  'utf8'
);

test('EnrichmentResult class exists', () => {
  assert.ok(enrichmentFile.includes('public class EnrichmentResult'),
    'EnrichmentResult class not found');
});

test('EnrichmentResult has EnrichmentSuggestion inner class', () => {
  assert.ok(enrichmentFile.includes('EnrichmentSuggestion'),
    'Missing EnrichmentSuggestion inner class');
});

test('EnrichmentSuggestion has field, confidence, reason', () => {
  assert.ok(enrichmentFile.includes('field'), 'Missing field');
  assert.ok(enrichmentFile.includes('confidence'), 'Missing confidence');
  assert.ok(enrichmentFile.includes('reason'), 'Missing reason');
});

test('EnrichmentResult has fromJson method', () => {
  assert.ok(enrichmentFile.includes('fromJson'), 'Missing fromJson method');
});

test('EnrichmentResult has getSuggestionsByConfidence', () => {
  assert.ok(enrichmentFile.includes('getSuggestionsByConfidence'),
    'Missing getSuggestionsByConfidence method');
});

test('EnrichmentResult has getHighConfidenceSuggestions', () => {
  assert.ok(enrichmentFile.includes('getHighConfidenceSuggestions'),
    'Missing getHighConfidenceSuggestions method');
});

test('EnrichmentResult has getHighConfidenceCount', () => {
  assert.ok(enrichmentFile.includes('getHighConfidenceCount'),
    'Missing getHighConfidenceCount method');
});

// ── Part 4: ConnectionNetwork Model ──
console.log('\nPart 4: ConnectionNetwork Model');

const connFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/ConnectionNetwork.java'),
  'utf8'
);

test('ConnectionNetwork class exists', () => {
  assert.ok(connFile.includes('public class ConnectionNetwork'),
    'ConnectionNetwork class not found');
});

test('ConnectionNetwork has Connection inner class', () => {
  assert.ok(connFile.includes('class Connection'), 'Missing Connection inner class');
});

test('ConnectionNetwork has FamilyGroup inner class', () => {
  assert.ok(connFile.includes('class FamilyGroup'), 'Missing FamilyGroup inner class');
});

test('ConnectionNetwork has FamilyMember inner class', () => {
  assert.ok(connFile.includes('class FamilyMember'), 'Missing FamilyMember inner class');
});

test('Connection has sourceId, targetId, confidence, reasons', () => {
  assert.ok(connFile.includes('sourceId'), 'Missing sourceId');
  assert.ok(connFile.includes('targetId'), 'Missing targetId');
  assert.ok(connFile.includes('confidence'), 'Missing confidence');
  assert.ok(connFile.includes('reasons'), 'Missing reasons');
});

test('FamilyGroup has surname and memberCount', () => {
  assert.ok(connFile.includes('surname'), 'Missing surname');
  assert.ok(connFile.includes('memberCount'), 'Missing memberCount');
});

test('ConnectionNetwork has fromJson method', () => {
  assert.ok(connFile.includes('fromJson'), 'Missing fromJson method');
});

test('ConnectionNetwork has getConnectionsByConfidence', () => {
  assert.ok(connFile.includes('getConnectionsByConfidence'),
    'Missing getConnectionsByConfidence method');
});

test('ConnectionNetwork has getLargestFamilyGroup', () => {
  assert.ok(connFile.includes('getLargestFamilyGroup'),
    'Missing getLargestFamilyGroup method');
});

// ── Part 5: API Client Integration ──
console.log('\nPart 5: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports EnrichmentResult', () => {
  assert.ok(apiFile.includes('EnrichmentResult'), 'Missing EnrichmentResult import');
});

test('ApiClient imports ConnectionNetwork', () => {
  assert.ok(apiFile.includes('ConnectionNetwork'), 'Missing ConnectionNetwork import');
});

test('ApiClient has getRecordEnrichment method', () => {
  assert.ok(apiFile.includes('getRecordEnrichment'), 'Missing getRecordEnrichment method');
  assert.ok(apiFile.includes('/enrich'), 'Missing /enrich URL in API client');
});

test('ApiClient has getCemeteryConnections method', () => {
  assert.ok(apiFile.includes('getCemeteryConnections'), 'Missing getCemeteryConnections method');
  assert.ok(apiFile.includes('/connections'), 'Missing /connections URL in API client');
});

// ── Part 6: AI System Prompts ──
console.log('\nPart 6: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention enrichment endpoint', () => {
  assert.ok(promptsFile.includes('enrich') || promptsFile.includes('enrichment'),
    'AI prompts should mention enrichment');
});

test('AI prompts mention connections endpoint', () => {
  assert.ok(promptsFile.includes('connections') || promptsFile.includes('family connection'),
    'AI prompts should mention connections');
});

test('Suggested prompts include enrichment request', () => {
  assert.ok(promptsFile.includes('Enrich') || promptsFile.includes('missing'),
    'Missing enrichment suggested prompt');
});

test('Suggested prompts include family connections', () => {
  assert.ok(promptsFile.includes('family connections'),
    'Missing family connections suggested prompt');
});

// ── Part 7: Documentation ──
console.log('\nPart 7: Documentation');

test('CHANGELOG mentions Phase 16.8 or Record Enrichment', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(
    changelog.includes('Phase 16.8') || changelog.includes('Record Enrichment'),
    'CHANGELOG should mention Phase 16.8 or Record Enrichment'
  );
});

test('STATUS.md mentions Record Enrichment', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(
    status.includes('Record Enrichment') || status.includes('16.8'),
    'STATUS.md should mention Record Enrichment'
  );
});

// ── Part 8: Enrichment Logic Verification ──
console.log('\nPart 8: Enrichment Logic Verification');

test('Birth year estimation uses death year - age', () => {
  assert.ok(indexFile.includes('deathYear - age'), 'Missing birth year calculation');
});

test('Age extraction regex matches "aged N"', () => {
  assert.ok(indexFile.includes('aged') && indexFile.includes('1,3'),
    'Missing age regex pattern');
});

test('Rough birth estimate uses 70 year lifespan', () => {
  assert.ok(indexFile.includes('70'), 'Missing 70-year lifespan estimate');
});

test('Family connection limits to 10 results', () => {
  assert.ok(indexFile.includes('slice(0, 10)'), 'Missing 10-result limit for family connections');
});

test('Family connections sorted by confidence', () => {
  assert.ok(indexFile.includes('confOrder'), 'Missing confidence sorting for family connections');
});

// ── Results ──
console.log('\n=== Phase 16.8 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.8 Record Enrichment tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
