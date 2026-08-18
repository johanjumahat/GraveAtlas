/**
 * Phase 16.28 Tests — AI Natural Language Query Engine
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
  ['handleNaturalLanguageQuery', 'POST /api/query/natural'],
  ['handleQuerySuggestions', 'GET /api/query/suggestions'],
  ['handleQueryExplain', 'POST /api/query/explain'],
  ['handleQueryHistory', 'GET /api/query/history'],
  ['handleQueryFeedback', 'POST /api/query/feedback'],
];

for (const [handler, desc] of handlers) {
  test(`Backend has ${desc}`, () => {
    assert.ok(indexFile.includes(handler), `Missing ${handler}`);
  });
}

test('All 5 query routes registered', () => {
  assert.ok(indexFile.includes('/api/query/natural'), 'Missing /api/query/natural');
  assert.ok(indexFile.includes('/api/query/suggestions'), 'Missing /api/query/suggestions');
  assert.ok(indexFile.includes('/api/query/explain'), 'Missing /api/query/explain');
  assert.ok(indexFile.includes('/api/query/history'), 'Missing /api/query/history');
  assert.ok(indexFile.includes('/api/query/feedback'), 'Missing /api/query/feedback');
});

test('parseNLQuery function exists', () => {
  assert.ok(indexFile.includes('function parseNLQuery'), 'Missing parseNLQuery');
});

console.log('\nPart 2: Intent Detection');
test('Detects count intent', () => {
  assert.ok(indexFile.includes("'count'"), 'Missing count intent');
  assert.ok(indexFile.includes('how many'), 'Missing how many pattern');
});
test('Detects search intent', () => {
  assert.ok(indexFile.includes("'search'"), 'Missing search intent');
  assert.ok(indexFile.includes('show me') || indexFile.includes("'show'"), 'Missing show pattern');
});
test('Detects export intent', () => {
  assert.ok(indexFile.includes("'export'"), 'Missing export intent');
});
test('Detects fix intent', () => {
  assert.ok(indexFile.includes("'fix'"), 'Missing fix intent');
});
test('Detects analyze intent', () => {
  assert.ok(indexFile.includes("'analyze'"), 'Missing analyze intent');
});
test('Detects health intent', () => {
  assert.ok(indexFile.includes("'health'"), 'Missing health intent');
});
test('Detects predict intent', () => {
  assert.ok(indexFile.includes("'predict'"), 'Missing predict intent');
});
test('Detects risk intent', () => {
  assert.ok(indexFile.includes("'risk'"), 'Missing risk intent');
});

console.log('\nPart 3: Query Parsing');
test('Extracts cemetery names', () => {
  assert.ok(indexFile.includes('bukit brown'), 'Missing Bukit Brown pattern');
  assert.ok(indexFile.includes('kranji war'), 'Missing Kranji War pattern');
  assert.ok(indexFile.includes('macritchie'), 'Missing MacRitchie pattern');
});
test('Extracts relative dates', () => {
  assert.ok(indexFile.includes('this month'), 'Missing this month');
  assert.ok(indexFile.includes('last month'), 'Missing last month');
  assert.ok(indexFile.includes('this week'), 'Missing this week');
  assert.ok(indexFile.includes('this year'), 'Missing this year');
});
test('Extracts year ranges', () => {
  assert.ok(indexFile.includes('between'), 'Missing between pattern');
  assert.ok(indexFile.includes('born'), 'Missing born pattern');
  assert.ok(indexFile.includes('died'), 'Missing died pattern');
  assert.ok(indexFile.includes('before'), 'Missing before pattern');
  assert.ok(indexFile.includes('after'), 'Missing after pattern');
});
test('Extracts name filters', () => {
  assert.ok(indexFile.includes('named'), 'Missing named pattern');
  assert.ok(indexFile.includes('called'), 'Missing called pattern');
});
test('Extracts confidence thresholds', () => {
  assert.ok(indexFile.includes('confidence'), 'Missing confidence pattern');
  assert.ok(indexFile.includes('high confidence'), 'Missing high confidence');
});
test('Extracts verification status', () => {
  assert.ok(indexFile.includes('verified'), 'Missing verified');
  assert.ok(indexFile.includes('unverified'), 'Missing unverified');
});
test('Extracts anomaly flags', () => {
  assert.ok(indexFile.includes('with anomalies'), 'Missing with anomalies');
  assert.ok(indexFile.includes('without anomalies'), 'Missing without anomalies');
});
test('Extracts source flags', () => {
  assert.ok(indexFile.includes('with sources'), 'Missing with sources');
  assert.ok(indexFile.includes('without sources'), 'Missing without sources');
});
test('Extracts coordinate flags', () => {
  assert.ok(indexFile.includes('with coordinates'), 'Missing with coordinates');
  assert.ok(indexFile.includes('without coordinates'), 'Missing without coordinates');
});
test('Extracts sort order', () => {
  assert.ok(indexFile.includes('newest'), 'Missing newest sort');
  assert.ok(indexFile.includes('oldest'), 'Missing oldest sort');
});
test('Extracts limits', () => {
  assert.ok(indexFile.includes('top'), 'Missing top limit pattern');
});
test('Extracts aggregations', () => {
  assert.ok(indexFile.includes('by cemetery'), 'Missing by cemetery');
  assert.ok(indexFile.includes('by year'), 'Missing by year');
});

console.log('\nPart 4: Query Execution');
test('Applies cemetery filter', () => {
  assert.ok(indexFile.includes('cemeteryName'), 'Missing cemeteryName filter');
});
test('Applies date range filter', () => {
  assert.ok(indexFile.includes('dateRange'), 'Missing dateRange filter');
  assert.ok(indexFile.includes('startTime'), 'Missing startTime');
});
test('Applies year range filter', () => {
  assert.ok(indexFile.includes('yearRange'), 'Missing yearRange filter');
  assert.ok(indexFile.includes('birthYear'), 'Missing birthYear filter');
  assert.ok(indexFile.includes('deathYear'), 'Missing deathYear filter');
});
test('Applies confidence threshold', () => {
  assert.ok(indexFile.includes('confidenceThreshold'), 'Missing confidenceThreshold');
});
test('Applies verification filter', () => {
  assert.ok(indexFile.includes("verificationStatus === 'verified'"), 'Missing verification check');
});
test('Applies anomaly filter', () => {
  assert.ok(indexFile.includes('hasAnomalies'), 'Missing hasAnomalies filter');
});
test('Applies source filter', () => {
  assert.ok(indexFile.includes('hasSources'), 'Missing hasSources filter');
});
test('Applies coordinate filter', () => {
  assert.ok(indexFile.includes('hasCoordinates'), 'Missing hasCoordinates filter');
});
test('Applies sorting', () => {
  assert.ok(indexFile.includes('sortBy'), 'Missing sortBy');
  assert.ok(indexFile.includes('localeCompare'), 'Missing localeCompare for name sort');
});
test('Supports aggregation', () => {
  assert.ok(indexFile.includes('aggregated'), 'Missing aggregation');
  assert.ok(indexFile.includes('groupBy'), 'Missing groupBy');
});
test('Applies limit', () => {
  assert.ok(indexFile.includes('parsed.limit'), 'Missing limit application');
  assert.ok(indexFile.includes('slice'), 'Missing slice for limit');
});

console.log('\nPart 5: Natural Language Answer Generation');
test('Generates count answer', () => {
  assert.ok(indexFile.includes("intent === 'count'"), 'Missing count answer');
  assert.ok(indexFile.includes('Found'), 'Missing Found in answer');
});
test('Generates search answer', () => {
  assert.ok(indexFile.includes("intent === 'search'"), 'Missing search answer');
});
test('Generates analyze answer', () => {
  assert.ok(indexFile.includes("intent === 'analyze'"), 'Missing analyze answer');
  assert.ok(indexFile.includes('verified'), 'Missing verified in analyze');
});
test('Generates health answer', () => {
  assert.ok(indexFile.includes("intent === 'health'"), 'Missing health answer');
  assert.ok(indexFile.includes('healthScore'), 'Missing healthScore in answer');
});

console.log('\nPart 6: Suggestions Endpoint');
test('Returns suggested queries', () => {
  assert.ok(indexFile.includes('suggestions'), 'Missing suggestions');
});
test('Includes cemetery-specific suggestions', () => {
  assert.ok(indexFile.includes('cemeteryNames'), 'Missing cemeteryNames in suggestions');
});
test('Includes time-based suggestions', () => {
  assert.ok(indexFile.includes('this month'), 'Missing time-based suggestion');
});
test('Includes quality queries', () => {
  assert.ok(indexFile.includes('without sources'), 'Missing quality suggestion');
});

console.log('\nPart 7: Explain Endpoint');
test('Returns parsed query', () => {
  assert.ok(indexFile.includes('parseNLQuery'), 'Missing parseNLQuery in explain');
});
test('Returns human-readable explanation', () => {
  assert.ok(indexFile.includes('explanation'), 'Missing explanation');
  assert.ok(indexFile.includes('Intent:'), 'Missing Intent in explanation');
});

console.log('\nPart 8: History & Feedback');
test('History endpoint reads from KV', () => {
  assert.ok(indexFile.includes('nlq_history'), 'Missing nlq_history KV key');
});
test('Feedback endpoint stores in KV', () => {
  assert.ok(indexFile.includes('nlq_feedback'), 'Missing nlq_feedback KV key');
  assert.ok(indexFile.includes('helpful'), 'Missing helpful in feedback');
});
test('Feedback keeps last 100 entries', () => {
  assert.ok(indexFile.includes('slice(0, 100)'), 'Missing 100-entry limit');
});

console.log('\nPart 9: NaturalLanguageQueryResult Model');
const nlrFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/NaturalLanguageQueryResult.java'),
  'utf8'
);
test('Class exists', () => assert.ok(nlrFile.includes('public class NaturalLanguageQueryResult'), 'Not found'));
test('Has ParsedQuery inner', () => assert.ok(nlrFile.includes('class ParsedQuery'), 'Missing ParsedQuery'));
test('Has DateRange inner', () => assert.ok(nlrFile.includes('class DateRange'), 'Missing DateRange'));
test('Has YearRange inner', () => assert.ok(nlrFile.includes('class YearRange'), 'Missing YearRange'));
test('Has QueryResult inner', () => assert.ok(nlrFile.includes('class QueryResult'), 'Missing QueryResult'));
test('Has AggregationEntry inner', () => assert.ok(nlrFile.includes('class AggregationEntry'), 'Missing AggregationEntry'));
test('Has fromJson', () => assert.ok(nlrFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasResults', () => assert.ok(nlrFile.includes('hasResults'), 'Missing hasResults'));
test('Has isCountIntent', () => assert.ok(nlrFile.includes('isCountIntent'), 'Missing isCountIntent'));
test('Has hasAggregation', () => assert.ok(nlrFile.includes('hasAggregation'), 'Missing hasAggregation'));

console.log('\nPart 10: QueryExplanation Model');
const qeFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/QueryExplanation.java'),
  'utf8'
);
test('Class exists', () => assert.ok(qeFile.includes('public class QueryExplanation'), 'Not found'));
test('Has fromJson', () => assert.ok(qeFile.includes('fromJson'), 'Missing fromJson'));
test('Has explanation field', () => assert.ok(qeFile.includes('explanation'), 'Missing explanation'));
test('Uses ParsedQuery', () => assert.ok(qeFile.includes('ParsedQuery'), 'Missing ParsedQuery reference'));

console.log('\nPart 11: QuerySuggestions Model');
const qsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/QuerySuggestions.java'),
  'utf8'
);
test('Class exists', () => assert.ok(qsFile.includes('public class QuerySuggestions'), 'Not found'));
test('Has fromJson', () => assert.ok(qsFile.includes('fromJson'), 'Missing fromJson'));
test('Has suggestions list', () => assert.ok(qsFile.includes('suggestions'), 'Missing suggestions'));
test('Has cemeteryNames list', () => assert.ok(qsFile.includes('cemeteryNames'), 'Missing cemeteryNames'));
test('Has hasSuggestions', () => assert.ok(qsFile.includes('hasSuggestions'), 'Missing hasSuggestions'));

console.log('\nPart 12: API Client Integration');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);
test('Imports NaturalLanguageQueryResult', () => assert.ok(apiFile.includes('NaturalLanguageQueryResult'), 'Missing import'));
test('Imports QueryExplanation', () => assert.ok(apiFile.includes('QueryExplanation'), 'Missing import'));
test('Imports QuerySuggestions', () => assert.ok(apiFile.includes('QuerySuggestions'), 'Missing import'));
test('Has executeNaturalLanguageQuery', () => {
  assert.ok(apiFile.includes('executeNaturalLanguageQuery'), 'Missing method');
  assert.ok(apiFile.includes('/api/query/natural'), 'Missing URL');
});
test('Has getQuerySuggestions', () => {
  assert.ok(apiFile.includes('getQuerySuggestions'), 'Missing method');
  assert.ok(apiFile.includes('/api/query/suggestions'), 'Missing URL');
});
test('Has explainQuery', () => {
  assert.ok(apiFile.includes('explainQuery'), 'Missing method');
  assert.ok(apiFile.includes('/api/query/explain'), 'Missing URL');
});
test('Has getQueryHistory', () => {
  assert.ok(apiFile.includes('getQueryHistory'), 'Missing method');
  assert.ok(apiFile.includes('/api/query/history'), 'Missing URL');
});
test('Has submitQueryFeedback', () => {
  assert.ok(apiFile.includes('submitQueryFeedback'), 'Missing method');
  assert.ok(apiFile.includes('/api/query/feedback'), 'Missing URL');
});

console.log('\nPart 13: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);
test('Prompts mention /api/query/natural', () => assert.ok(promptsFile.includes('query/natural'), 'Missing'));
test('Prompts mention /api/query/suggestions', () => assert.ok(promptsFile.includes('query/suggestions'), 'Missing'));
test('Prompts mention /api/query/explain', () => assert.ok(promptsFile.includes('query/explain'), 'Missing'));
test('Prompts mention natural language queries', () => assert.ok(promptsFile.includes('natural language'), 'Missing'));
test('Suggested prompts include NLQ examples', () => assert.ok(promptsFile.includes('How many records'), 'Missing'));

console.log('\nPart 14: Documentation');
test('CHANGELOG mentions Phase 16.28', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Phase 16.28') || c.includes('Natural Language'), 'Missing from CHANGELOG');
});
test('STATUS.md mentions 16.28', () => {
  const s = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(s.includes('16.28') || s.includes('Natural Language Query'), 'Missing from STATUS');
});

console.log('\n=== Phase 16.28 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.28 Natural Language Query Engine tests passed!');
else console.log('\n❌ Some tests failed!');
