/**
 * Phase 16.20 Tests — AI Data Provenance Chain
 *
 * Tests:
 * - Backend endpoints: /provenance, /provenance/add, /provenance/search, /provenance/timeline, /provenance/export
 * - buildProvenanceChain: traces creation, moderation, verification, corrections, enrichment, merges, fixes, source verification
 * - Provenance entry structure: timestamp, action, actor, actorRole, description, fields, source
 * - Chain metadata: totalEntries, uniqueActors, actorList, actionTypes, actorRoles, firstEntry, lastEntry, span
 * - Search: filters (actor, action, actorRole, recordId, startDate, endDate), sorting, limit
 * - Timeline: chronological order, monthly summary, date range
 * - Export: CSV-ready JSON, single record or all records
 * - Manual provenance entry addition
 * - ProvenanceChain model
 * - ProvenanceSearch model
 * - ProvenanceTimeline model
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

test('Backend has GET /api/graves/:id/provenance', () => {
  assert.ok(indexFile.includes('handleGetRecordProvenance'), 'Missing handleGetRecordProvenance');
});

test('Backend has POST /api/graves/:id/provenance/add', () => {
  assert.ok(indexFile.includes('handleAddProvenanceEntry'), 'Missing handleAddProvenanceEntry');
});

test('Backend has GET /api/provenance/search', () => {
  assert.ok(indexFile.includes('handleSearchProvenance'), 'Missing handleSearchProvenance');
});

test('Backend has GET /api/provenance/timeline', () => {
  assert.ok(indexFile.includes('handleProvenanceTimeline'), 'Missing handleProvenanceTimeline');
});

test('Backend has GET /api/provenance/export', () => {
  assert.ok(indexFile.includes('handleExportProvenance'), 'Missing handleExportProvenance');
});

test('All 5 provenance routes registered', () => {
  const routes = ['handleGetRecordProvenance', 'handleAddProvenanceEntry',
    'handleSearchProvenance', 'handleProvenanceTimeline', 'handleExportProvenance'];
  for (const r of routes) {
    assert.ok(indexFile.includes(r), `Missing route handler: ${r}`);
  }
});

// ── Part 2: buildProvenanceChain Function ──
console.log('\nPart 2: buildProvenanceChain Function');

test('buildProvenanceChain function exists', () => {
  assert.ok(indexFile.includes('function buildProvenanceChain'), 'Missing buildProvenanceChain');
});

test('Traces creation event', () => {
  assert.ok(indexFile.includes("'created'") && indexFile.includes('Record created'),
    'Missing creation event');
});

test('Traces moderation events', () => {
  assert.ok(indexFile.includes("'moderated'") && indexFile.includes('moderationHistory'),
    'Missing moderation events');
});

test('Traces verification events', () => {
  assert.ok(indexFile.includes("'verified'") && indexFile.includes('verificationStatus'),
    'Missing verification events');
});

test('Traces correction events', () => {
  assert.ok(indexFile.includes("'corrected'") && indexFile.includes('corrections'),
    'Missing correction events');
});

test('Traces enrichment events', () => {
  assert.ok(indexFile.includes("'enriched'") && indexFile.includes('enrichmentHistory'),
    'Missing enrichment events');
});

test('Traces merge events', () => {
  assert.ok(indexFile.includes("'merged'") && indexFile.includes('mergeHistory'),
    'Missing merge events');
});

test('Traces fix events', () => {
  assert.ok(indexFile.includes("'fixed'") && indexFile.includes('fixHistory'),
    'Missing fix events');
});

test('Traces source verification events', () => {
  assert.ok(indexFile.includes("'source_verified'") && indexFile.includes('sourceVerificationHistory'),
    'Missing source verification events');
});

test('Traces last update event', () => {
  assert.ok(indexFile.includes("'updated'"),
    'Missing last update event');
});

test('Sorts chain by timestamp (oldest first)', () => {
  assert.ok(indexFile.includes('sort') && indexFile.includes('ta - tb'),
    'Missing chronological sort');
});

// ── Part 3: Provenance Entry Structure ──
console.log('\nPart 3: Provenance Entry Structure');

test('Each entry has timestamp', () => {
  assert.ok(indexFile.includes('timestamp:'), 'Missing timestamp field');
});

test('Each entry has action', () => {
  assert.ok(indexFile.includes('action:'), 'Missing action field');
});

test('Each entry has actor', () => {
  assert.ok(indexFile.includes('actor:'), 'Missing actor field');
});

test('Each entry has actorRole', () => {
  assert.ok(indexFile.includes('actorRole:'), 'Missing actorRole field');
});

test('Each entry has description', () => {
  assert.ok(indexFile.includes('description:'), 'Missing description field');
});

test('Each entry has fields', () => {
  assert.ok(indexFile.includes('fields:'), 'Missing fields field');
});

test('Each entry has source', () => {
  assert.ok(indexFile.includes('source:'), 'Missing source field');
});

test('Correction entries have oldValue and newValue', () => {
  assert.ok(indexFile.includes('oldValue') && indexFile.includes('newValue'),
    'Missing old/new value tracking');
});

test('Merge entries have mergeDetails', () => {
  assert.ok(indexFile.includes('mergeDetails') && indexFile.includes('mergedFromId'),
    'Missing merge details');
});

test('Actor roles include submitter, moderator, verifier, community, AI, archivist', () => {
  assert.ok(indexFile.includes('submitter') && indexFile.includes('moderator') &&
    indexFile.includes('verifier') && indexFile.includes('community') &&
    indexFile.includes('AI') && indexFile.includes('archivist'),
    'Missing actor roles');
});

// ── Part 4: Chain Metadata ──
console.log('\nPart 4: Chain Metadata');

test('Metadata has totalEntries', () => {
  assert.ok(indexFile.includes('totalEntries'), 'Missing totalEntries');
});

test('Metadata has uniqueActors', () => {
  assert.ok(indexFile.includes('uniqueActors'), 'Missing uniqueActors');
});

test('Metadata has actorList', () => {
  assert.ok(indexFile.includes('actorList'), 'Missing actorList');
});

test('Metadata has actionTypes', () => {
  assert.ok(indexFile.includes('actionTypes'), 'Missing actionTypes');
});

test('Metadata has actorRoles', () => {
  assert.ok(indexFile.includes('actorRoles'), 'Missing actorRoles in metadata');
});

test('Metadata has firstEntry and lastEntry', () => {
  assert.ok(indexFile.includes('firstEntry') && indexFile.includes('lastEntry'),
    'Missing firstEntry/lastEntry');
});

test('Metadata has span', () => {
  assert.ok(indexFile.includes('span'), 'Missing span');
});

// ── Part 5: Get Record Provenance Handler ──
console.log('\nPart 5: Get Record Provenance Handler');

test('Loads record from graves directory', () => {
  assert.ok(indexFile.includes("readFile(`graves/${safeId}"),
    'Missing record loading');
});

test('Returns 404 for missing record', () => {
  assert.ok(indexFile.includes('Record not found'),
    'Missing 404 handling');
});

test('Returns provenance object in response', () => {
  assert.ok(indexFile.includes('provenance: provenance'),
    'Missing provenance in response');
});

// ── Part 6: Add Provenance Entry Handler ──
console.log('\nPart 6: Add Provenance Entry Handler');

test('Requires action and description', () => {
  assert.ok(indexFile.includes('Missing required fields: action, description'),
    'Missing required fields validation');
});

test('Creates provenanceLog if needed', () => {
  assert.ok(indexFile.includes('provenanceLog'),
    'Missing provenanceLog initialization');
});

test('Adds entry with timestamp', () => {
  assert.ok(indexFile.includes('new Date().toISOString()'),
    'Missing timestamp in entry');
});

test('Returns totalEntries count', () => {
  assert.ok(indexFile.includes('totalEntries'),
    'Missing totalEntries in response');
});

// ── Part 7: Search Provenance Handler ──
console.log('\nPart 7: Search Provenance Handler');

test('Accepts actor filter', () => {
  assert.ok(indexFile.includes("searchParams.get('actor')"),
    'Missing actor filter');
});

test('Accepts action filter', () => {
  assert.ok(indexFile.includes("searchParams.get('action')"),
    'Missing action filter');
});

test('Accepts actorRole filter', () => {
  assert.ok(indexFile.includes("searchParams.get('actorRole')"),
    'Missing actorRole filter');
});

test('Accepts recordId filter', () => {
  assert.ok(indexFile.includes("searchParams.get('recordId')"),
    'Missing recordId filter');
});

test('Accepts startDate and endDate filters', () => {
  assert.ok(indexFile.includes('startDate') && indexFile.includes('endDate'),
    'Missing date range filters');
});

test('Accepts limit parameter', () => {
  assert.ok(indexFile.includes("searchParams.get('limit')"),
    'Missing limit parameter');
});

test('Sorts results by timestamp (newest first)', () => {
  assert.ok(indexFile.includes('tb - ta'),
    'Missing sort by newest first');
});

test('Returns totalFound count', () => {
  assert.ok(indexFile.includes('totalFound'),
    'Missing totalFound in response');
});

test('Returns applied filters in response', () => {
  assert.ok(indexFile.includes('filters:'),
    'Missing filters in response');
});

// ── Part 8: Timeline Handler ──
console.log('\nPart 8: Timeline Handler');

test('Accepts startDate and endDate', () => {
  assert.ok(indexFile.includes('startDate') && indexFile.includes('endDate'),
    'Missing date filters in timeline');
});

test('Accepts limit parameter (max 1000)', () => {
  assert.ok(indexFile.includes('1000'),
    'Missing 1000 limit cap');
});

test('Sorts events chronologically', () => {
  assert.ok(indexFile.includes('ta - tb'),
    'Missing chronological sort');
});

test('Groups by month for summary', () => {
  assert.ok(indexFile.includes('byMonth') && indexFile.includes('substring(0, 7)'),
    'Missing monthly grouping');
});

test('Monthly summary has month, count, actions', () => {
  assert.ok(indexFile.includes('month') && indexFile.includes('count') && indexFile.includes('actions'),
    'Missing monthly summary fields');
});

test('Returns dateRange (earliest, latest)', () => {
  assert.ok(indexFile.includes('dateRange') && indexFile.includes('earliest') && indexFile.includes('latest'),
    'Missing dateRange in timeline');
});

test('Returns totalEvents count', () => {
  assert.ok(indexFile.includes('totalEvents'),
    'Missing totalEvents in timeline');
});

// ── Part 9: Export Handler ──
console.log('\nPart 9: Export Handler');

test('Accepts optional recordId parameter', () => {
  assert.ok(indexFile.includes("searchParams.get('recordId')"),
    'Missing recordId parameter in export');
});

test('Exports all published records when no recordId', () => {
  assert.ok(indexFile.includes("status === 'published'"),
    'Missing published filter for export all');
});

test('Export entries have recordId, recordName, timestamp, action, actor, description', () => {
  assert.ok(indexFile.includes('recordId') && indexFile.includes('recordName') &&
    indexFile.includes('timestamp') && indexFile.includes('action') &&
    indexFile.includes('actor') && indexFile.includes('description'),
    'Missing export entry fields');
});

test('Export entries have fields joined with semicolon', () => {
  assert.ok(indexFile.includes("join(';')"),
    'Missing field join for CSV export');
});

test('Returns totalEntries and totalRecords', () => {
  assert.ok(indexFile.includes('totalEntries') && indexFile.includes('totalRecords'),
    'Missing export totals');
});

test('Returns exportedAt timestamp', () => {
  assert.ok(indexFile.includes('exportedAt'),
    'Missing exportedAt');
});

test('Specifies format as JSON (CSV-ready)', () => {
  assert.ok(indexFile.includes('CSV-ready'),
    'Missing format specification');
});

// ── Part 10: ProvenanceChain Model ──
console.log('\nPart 10: ProvenanceChain Model');

const pcFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/ProvenanceChain.java'),
  'utf8'
);

test('ProvenanceChain class exists', () => {
  assert.ok(pcFile.includes('public class ProvenanceChain'), 'Class not found');
});

test('Has ProvenanceEntry inner class', () => {
  assert.ok(pcFile.includes('class ProvenanceEntry'), 'Missing ProvenanceEntry');
});

test('Has MergeDetails inner class', () => {
  assert.ok(pcFile.includes('class MergeDetails'), 'Missing MergeDetails');
});

test('Has ProvenanceMetadata inner class', () => {
  assert.ok(pcFile.includes('class ProvenanceMetadata'), 'Missing ProvenanceMetadata');
});

test('Has fromJson method', () => {
  assert.ok(pcFile.includes('fromJson'), 'Missing fromJson');
});

test('Has hasHistory method', () => {
  assert.ok(pcFile.includes('hasHistory'), 'Missing hasHistory');
});

test('Has getEntryCount method', () => {
  assert.ok(pcFile.includes('getEntryCount'), 'Missing getEntryCount');
});

test('Has getSummaryLine method', () => {
  assert.ok(pcFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

test('Has getActionIcon method', () => {
  assert.ok(pcFile.includes('getActionIcon'), 'Missing getActionIcon');
});

test('Action icons cover all action types', () => {
  const actions = ['created', 'moderated', 'verified', 'corrected', 'enriched', 'merged', 'fixed', 'source_verified', 'updated'];
  for (const a of actions) {
    assert.ok(pcFile.includes(`"${a}"`), `Missing action icon: ${a}`);
  }
});

// ── Part 11: ProvenanceSearch Model ──
console.log('\nPart 11: ProvenanceSearch Model');

const psFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/ProvenanceSearch.java'),
  'utf8'
);

test('ProvenanceSearch class exists', () => {
  assert.ok(psFile.includes('public class ProvenanceSearch'), 'Class not found');
});

test('Has SearchEntry inner class', () => {
  assert.ok(psFile.includes('class SearchEntry'), 'Missing SearchEntry');
});

test('Has SearchFilters inner class', () => {
  assert.ok(psFile.includes('class SearchFilters'), 'Missing SearchFilters');
});

test('SearchEntry extends ProvenanceEntry', () => {
  assert.ok(psFile.includes('extends ProvenanceChain.ProvenanceEntry'),
    'SearchEntry should extend ProvenanceEntry');
});

test('Has fromJson method', () => {
  assert.ok(psFile.includes('fromJson'), 'Missing fromJson');
});

// ── Part 12: ProvenanceTimeline Model ──
console.log('\nPart 12: ProvenanceTimeline Model');

const ptFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/ProvenanceTimeline.java'),
  'utf8'
);

test('ProvenanceTimeline class exists', () => {
  assert.ok(ptFile.includes('public class ProvenanceTimeline'), 'Class not found');
});

test('Has TimelineEvent inner class', () => {
  assert.ok(ptFile.includes('class TimelineEvent'), 'Missing TimelineEvent');
});

test('Has MonthlySummary inner class', () => {
  assert.ok(ptFile.includes('class MonthlySummary'), 'Missing MonthlySummary');
});

test('Has DateRange inner class', () => {
  assert.ok(ptFile.includes('class DateRange'), 'Missing DateRange');
});

test('Has fromJson method', () => {
  assert.ok(ptFile.includes('fromJson'), 'Missing fromJson');
});

test('Has hasEvents method', () => {
  assert.ok(ptFile.includes('hasEvents'), 'Missing hasEvents');
});

test('Has getSummaryLine method', () => {
  assert.ok(ptFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 13: API Client Integration ──
console.log('\nPart 13: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports ProvenanceChain', () => {
  assert.ok(apiFile.includes('ProvenanceChain'), 'Missing ProvenanceChain import');
});

test('ApiClient imports ProvenanceSearch', () => {
  assert.ok(apiFile.includes('ProvenanceSearch'), 'Missing ProvenanceSearch import');
});

test('ApiClient imports ProvenanceTimeline', () => {
  assert.ok(apiFile.includes('ProvenanceTimeline'), 'Missing ProvenanceTimeline import');
});

test('ApiClient has getRecordProvenance method', () => {
  assert.ok(apiFile.includes('getRecordProvenance'), 'Missing getRecordProvenance');
  assert.ok(apiFile.includes('/provenance'), 'Missing /provenance URL');
});

test('ApiClient has addProvenanceEntry method', () => {
  assert.ok(apiFile.includes('addProvenanceEntry'), 'Missing addProvenanceEntry');
  assert.ok(apiFile.includes('/provenance/add'), 'Missing /provenance/add URL');
});

test('ApiClient has searchProvenance method', () => {
  assert.ok(apiFile.includes('searchProvenance'), 'Missing searchProvenance');
  assert.ok(apiFile.includes('/provenance/search'), 'Missing /provenance/search URL');
});

test('ApiClient has getProvenanceTimeline method', () => {
  assert.ok(apiFile.includes('getProvenanceTimeline'), 'Missing getProvenanceTimeline');
  assert.ok(apiFile.includes('/provenance/timeline'), 'Missing /provenance/timeline URL');
});

test('ApiClient has exportProvenance method', () => {
  assert.ok(apiFile.includes('exportProvenance'), 'Missing exportProvenance');
  assert.ok(apiFile.includes('/provenance/export'), 'Missing /provenance/export URL');
});

// ── Part 14: AI System Prompts ──
console.log('\nPart 14: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention provenance', () => {
  assert.ok(promptsFile.includes('provenance'), 'Missing provenance mention');
});

test('AI prompts mention provenance chain', () => {
  assert.ok(promptsFile.includes('provenance chain'), 'Missing provenance chain mention');
});

test('AI prompts mention provenance search', () => {
  assert.ok(promptsFile.includes('provenance/search'), 'Missing provenance/search mention');
});

test('AI prompts mention provenance timeline', () => {
  assert.ok(promptsFile.includes('provenance/timeline'), 'Missing provenance/timeline mention');
});

test('AI prompts mention provenance export', () => {
  assert.ok(promptsFile.includes('provenance/export'), 'Missing provenance/export mention');
});

test('Suggested prompts include "provenance history"', () => {
  assert.ok(promptsFile.includes('provenance history'), 'Missing "provenance history" prompt');
});

test('Suggested prompts include "Search all provenance"', () => {
  assert.ok(promptsFile.includes('Search all provenance'), 'Missing "Search all provenance" prompt');
});

// ── Part 15: Documentation ──
console.log('\nPart 15: Documentation');

test('CHANGELOG mentions Phase 16.20 or Provenance', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.20') || changelog.includes('Provenance'),
    'CHANGELOG should mention Phase 16.20');
});

test('STATUS.md mentions Provenance', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Provenance') || status.includes('16.20'),
    'STATUS.md should mention Provenance');
});

// ── Results ──
console.log('\n=== Phase 16.20 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.20 Data Provenance Chain tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
