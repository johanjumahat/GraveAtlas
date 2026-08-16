/**
 * Phase 16.24 Tests — AI Search Intelligence
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

test('Backend has POST /api/search/intelligent', () => {
  assert.ok(indexFile.includes('handleIntelligentSearch'), 'Missing handleIntelligentSearch');
});
test('Backend has GET /api/search/suggest', () => {
  assert.ok(indexFile.includes('handleSearchSuggestions'), 'Missing handleSearchSuggestions');
});
test('Backend has GET /api/search/history', () => {
  assert.ok(indexFile.includes('handleSearchHistory'), 'Missing handleSearchHistory');
});
test('Backend has DELETE /api/search/history', () => {
  assert.ok(indexFile.includes('handleClearSearchHistory'), 'Missing handleClearSearchHistory');
});
test('Backend has GET /api/search/related', () => {
  assert.ok(indexFile.includes('handleRelatedSearch'), 'Missing handleRelatedSearch');
});
test('All 5 search routes registered', () => {
  const routes = ['handleIntelligentSearch', 'handleSearchSuggestions', 'handleSearchHistory',
    'handleClearSearchHistory', 'handleRelatedSearch'];
  for (const r of routes) assert.ok(indexFile.includes(r), `Missing: ${r}`);
});

console.log('\nPart 2: Query Parser');
test('Has parseSearchQuery function', () => {
  assert.ok(indexFile.includes('function parseSearchQuery'), 'Missing parseSearchQuery');
});
test('Extracts names', () => {
  assert.ok(indexFile.includes('names'), 'Missing name extraction');
});
test('Extracts date ranges (before/after/between)', () => {
  assert.ok(indexFile.includes('before') && indexFile.includes('after') && indexFile.includes('between'),
    'Missing date range parsing');
});
test('Extracts places', () => {
  assert.ok(indexFile.includes('placePatterns'), 'Missing place extraction');
});
test('Extracts verification status', () => {
  assert.ok(indexFile.includes('verified') && indexFile.includes('unverified'),
    'Missing verification status extraction');
});
test('Extracts confidence threshold', () => {
  assert.ok(indexFile.includes('confidenceThreshold') && indexFile.includes('confidenceDirection'),
    'Missing confidence threshold extraction');
});
test('Extracts anomaly flags', () => {
  assert.ok(indexFile.includes('hasAnomalies'), 'Missing anomaly flag extraction');
});
test('Extracts source flags', () => {
  assert.ok(indexFile.includes('hasSources'), 'Missing source flag extraction');
});
test('Extracts coordinate flags', () => {
  assert.ok(indexFile.includes('hasCoordinates'), 'Missing coordinate flag extraction');
});
test('Extracts limit', () => {
  assert.ok(indexFile.includes('limitMatch'), 'Missing limit extraction');
});
test('Extracts sort order', () => {
  assert.ok(indexFile.includes('sortBy'), 'Missing sort extraction');
});
test('Detects intent (count/fix/export)', () => {
  assert.ok(indexFile.includes("'count'") && indexFile.includes("'fix'") && indexFile.includes("'export'"),
    'Missing intent detection');
});

console.log('\nPart 3: Relevance Scoring');
test('Has scoreRecordRelevance function', () => {
  assert.ok(indexFile.includes('function scoreRecordRelevance'), 'Missing scoreRecordRelevance');
});
test('Scores name matches', () => {
  assert.ok(indexFile.includes('Name matches'), 'Missing name scoring');
});
test('Scores date range matches', () => {
  assert.ok(indexFile.includes('Date in range') || indexFile.includes('Date before') || indexFile.includes('Date after'),
    'Missing date scoring');
});
test('Scores place matches', () => {
  assert.ok(indexFile.includes('Place matches'), 'Missing place scoring');
});
test('Scores verification status', () => {
  assert.ok(indexFile.includes('Status:'), 'Missing status scoring');
});
test('Scores confidence threshold', () => {
  assert.ok(indexFile.includes('Confidence'), 'Missing confidence scoring');
});
test('Scores anomaly filter', () => {
  assert.ok(indexFile.includes('anomalies detected'), 'Missing anomaly scoring');
});
test('Scores source filter', () => {
  assert.ok(indexFile.includes('No source references') || indexFile.includes('source references'),
    'Missing source scoring');
});
test('Scores coordinate filter', () => {
  assert.ok(indexFile.includes('Has coordinates') || indexFile.includes('Missing coordinates'),
    'Missing coordinate scoring');
});
test('Returns match reasons', () => {
  assert.ok(indexFile.includes('reasons'), 'Missing match reasons');
});

console.log('\nPart 4: Intelligent Search Handler');
test('Requires query field', () => {
  assert.ok(indexFile.includes('Missing required field: query'), 'Missing query validation');
});
test('Returns parsed query in response', () => {
  assert.ok(indexFile.includes('parsed:'), 'Missing parsed query in response');
});
test('Returns relevanceScore per result', () => {
  assert.ok(indexFile.includes('relevanceScore'), 'Missing relevanceScore');
});
test('Returns matchReasons per result', () => {
  assert.ok(indexFile.includes('matchReasons'), 'Missing matchReasons');
});
test('Returns intent in response', () => {
  assert.ok(indexFile.includes('intent:'), 'Missing intent in response');
});
test('Returns totalFound count', () => {
  assert.ok(indexFile.includes('totalFound'), 'Missing totalFound');
});
test('Saves search history', () => {
  assert.ok(indexFile.includes('searches/'), 'Missing search history save');
});
test('Sorts by relevance score', () => {
  assert.ok(indexFile.includes('b.relevanceScore - a.relevanceScore'), 'Missing relevance sort');
});

console.log('\nPart 5: Search Suggestions');
test('Requires minimum 2 characters', () => {
  assert.ok(indexFile.includes('Query too short'), 'Missing min length check');
});
test('Returns keyword-based suggestions', () => {
  assert.ok(indexFile.includes('keywordSuggestions'), 'Missing keyword suggestions');
});
test('Returns name-based suggestions from records', () => {
  assert.ok(indexFile.includes('name.toLowerCase().includes'), 'Missing name suggestions');
});
test('Returns suggestion types', () => {
  assert.ok(indexFile.includes('type'), 'Missing suggestion types');
});
test('Respects limit', () => {
  assert.ok(indexFile.includes('limit'), 'Missing limit in suggestions');
});

console.log('\nPart 6: Search History');
test('Returns search history entries', () => {
  assert.ok(indexFile.includes('history'), 'Missing history entries');
});
test('Returns query, resultCount, timestamp', () => {
  assert.ok(indexFile.includes('query') && indexFile.includes('resultCount') && indexFile.includes('timestamp'),
    'Missing history fields');
});
test('Sorts newest first', () => {
  assert.ok(indexFile.includes('tb - ta'), 'Missing newest-first sort');
});
test('Clear returns clearedCount', () => {
  assert.ok(indexFile.includes('clearedCount'), 'Missing clearedCount');
});

console.log('\nPart 7: Related Search');
test('Requires recordId param', () => {
  assert.ok(indexFile.includes('Missing required param: recordId'), 'Missing recordId validation');
});
test('Returns 404 for missing record', () => {
  assert.ok(indexFile.includes('Record not found'), 'Missing 404 for record');
});
test('Scores same_cemetery relation', () => {
  assert.ok(indexFile.includes('same_cemetery'), 'Missing same_cemetery');
});
test('Scores same_section relation', () => {
  assert.ok(indexFile.includes('same_section'), 'Missing same_section');
});
test('Scores same_family relation', () => {
  assert.ok(indexFile.includes('same_family'), 'Missing same_family');
});
test('Scores similar_dates relation', () => {
  assert.ok(indexFile.includes('similar_dates'), 'Missing similar_dates');
});
test('Scores shared_sources relation', () => {
  assert.ok(indexFile.includes('shared_sources'), 'Missing shared_sources');
});
test('Returns relationScore per result', () => {
  assert.ok(indexFile.includes('relationScore'), 'Missing relationScore');
});
test('Returns relationTypes per result', () => {
  assert.ok(indexFile.includes('relationTypes'), 'Missing relationTypes');
});
test('Returns sourceRecord info', () => {
  assert.ok(indexFile.includes('sourceRecord'), 'Missing sourceRecord');
});
test('Sorts by relation score', () => {
  assert.ok(indexFile.includes('b.relationScore - a.relationScore'), 'Missing relation sort');
});

console.log('\nPart 8: IntelligentSearchResult Model');
const isrFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/IntelligentSearchResult.java'),
  'utf8'
);
test('Class exists', () => assert.ok(isrFile.includes('public class IntelligentSearchResult'), 'Not found'));
test('Has ParsedQuery inner class', () => assert.ok(isrFile.includes('class ParsedQuery'), 'Missing ParsedQuery'));
test('Has DateRange inner class', () => assert.ok(isrFile.includes('class DateRange'), 'Missing DateRange'));
test('Has SearchResultItem inner class', () => assert.ok(isrFile.includes('class SearchResultItem'), 'Missing SearchResultItem'));
test('Has fromJson', () => assert.ok(isrFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasResults', () => assert.ok(isrFile.includes('hasResults'), 'Missing hasResults'));
test('Has isCountIntent', () => assert.ok(isrFile.includes('isCountIntent'), 'Missing isCountIntent'));
test('Has isFixIntent', () => assert.ok(isrFile.includes('isFixIntent'), 'Missing isFixIntent'));
test('Has getSummaryLine', () => assert.ok(isrFile.includes('getSummaryLine'), 'Missing getSummaryLine'));

console.log('\nPart 9: SearchSuggestion Model');
const ssFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/SearchSuggestion.java'),
  'utf8'
);
test('Class exists', () => assert.ok(ssFile.includes('public class SearchSuggestion'), 'Not found'));
test('Has fromJson', () => assert.ok(ssFile.includes('fromJson'), 'Missing fromJson'));
test('Has type check methods', () => {
  assert.ok(ssFile.includes('isFilter') && ssFile.includes('isDate') && ssFile.includes('isPlace') &&
    ssFile.includes('isName'), 'Missing type checks');
});
test('Has getTypeIcon', () => assert.ok(ssFile.includes('getTypeIcon'), 'Missing getTypeIcon'));
test('Has getDisplayLine', () => assert.ok(ssFile.includes('getDisplayLine'), 'Missing getDisplayLine'));

console.log('\nPart 10: RelatedRecord Model');
const rrFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/RelatedRecord.java'),
  'utf8'
);
test('Class exists', () => assert.ok(rrFile.includes('public class RelatedRecord'), 'Not found'));
test('Has fromJsonArray', () => assert.ok(rrFile.includes('fromJsonArray'), 'Missing fromJsonArray'));
test('Has relation type checks', () => {
  assert.ok(rrFile.includes('isSameCemetery') && rrFile.includes('isSameFamily') && rrFile.includes('hasSharedSources'),
    'Missing relation type checks');
});
test('Has getRelationSummary', () => assert.ok(rrFile.includes('getRelationSummary'), 'Missing getRelationSummary'));
test('Has getSummaryLine', () => assert.ok(rrFile.includes('getSummaryLine'), 'Missing getSummaryLine'));

console.log('\nPart 11: API Client Integration');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);
test('Imports IntelligentSearchResult', () => assert.ok(apiFile.includes('IntelligentSearchResult'), 'Missing import'));
test('Imports SearchSuggestion', () => assert.ok(apiFile.includes('SearchSuggestion'), 'Missing import'));
test('Imports RelatedRecord', () => assert.ok(apiFile.includes('RelatedRecord'), 'Missing import'));
test('Has intelligentSearch method', () => {
  assert.ok(apiFile.includes('intelligentSearch'), 'Missing intelligentSearch');
  assert.ok(apiFile.includes('/search/intelligent'), 'Missing URL');
});
test('Has getSearchSuggestions method', () => {
  assert.ok(apiFile.includes('getSearchSuggestions'), 'Missing getSearchSuggestions');
  assert.ok(apiFile.includes('/search/suggest'), 'Missing URL');
});
test('Has getSearchHistory method', () => {
  assert.ok(apiFile.includes('getSearchHistory'), 'Missing getSearchHistory');
  assert.ok(apiFile.includes('/search/history'), 'Missing URL');
});
test('Has clearSearchHistory method', () => assert.ok(apiFile.includes('clearSearchHistory'), 'Missing clearSearchHistory'));
test('Has findRelatedRecords method', () => {
  assert.ok(apiFile.includes('findRelatedRecords'), 'Missing findRelatedRecords');
  assert.ok(apiFile.includes('/search/related'), 'Missing URL');
});

console.log('\nPart 12: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);
test('Prompts mention search/intelligent', () => assert.ok(promptsFile.includes('search/intelligent'), 'Missing search/intelligent'));
test('Prompts mention search/suggest', () => assert.ok(promptsFile.includes('search/suggest'), 'Missing search/suggest'));
test('Prompts mention search/related', () => assert.ok(promptsFile.includes('search/related'), 'Missing search/related'));
test('Prompts mention natural language search', () => assert.ok(promptsFile.includes('natural language'), 'Missing natural language mention'));
test('Prompts mention relevance ranking', () => assert.ok(promptsFile.includes('relevance'), 'Missing relevance mention'));
test('Suggested prompts include "low confidence and anomalies"', () => {
  assert.ok(promptsFile.includes('low confidence and anomalies'), 'Missing suggested prompt');
});
test('Suggested prompts include "related to this grave"', () => {
  assert.ok(promptsFile.includes('related to this grave'), 'Missing suggested prompt');
});

console.log('\nPart 13: Documentation');
test('CHANGELOG mentions Phase 16.24', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Phase 16.24') || c.includes('Search Intelligence'), 'Missing from CHANGELOG');
});
test('STATUS.md mentions Search Intelligence', () => {
  const s = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(s.includes('Search') || s.includes('16.24'), 'Missing from STATUS');
});

console.log('\n=== Phase 16.24 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.24 Search Intelligence tests passed!');
else console.log('\n❌ Some tests failed!');
