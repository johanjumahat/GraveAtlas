/**
 * Phase 21.6 Tests — Kubur Search Connector (kubursearch.com)
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

console.log('\nPart 1: Connector File');
const connectorFile = fs.readFileSync(
  path.join(projectRoot, 'backend/src/external-connectors/connectors/kubur-search-connector.js'), 'utf8'
);

test('Connector class exists', () => assert.ok(connectorFile.includes('class KuburSearchConnector'), 'Missing'));
test('Extends BaseConnector', () => assert.ok(connectorFile.includes('extends BaseConnector'), 'Missing'));
test('Connector ID is kubur-search', () => assert.ok(connectorFile.includes("'kubur-search'"), 'Missing'));
test('Has request method', () => assert.ok(connectorFile.includes('async request(query, env)'), 'Missing'));
test('Has validate method', () => assert.ok(connectorFile.includes('validate(data)'), 'Missing'));
test('Has normalize method', () => assert.ok(connectorFile.includes('normalize(data)'), 'Missing'));
test('Has listSources method', () => assert.ok(connectorFile.includes('listSources()'), 'Missing'));
test('Has getSourceInfo method', () => assert.ok(connectorFile.includes('getSourceInfo()'), 'Missing'));
test('Has buildSearchUrl method', () => assert.ok(connectorFile.includes('buildSearchUrl'), 'Missing'));
test('Has getCemeteryCoverage method', () => assert.ok(connectorFile.includes('getCemeteryCoverage'), 'Missing'));

console.log('\nPart 2: Data Sources');
test('Has kubur-search-web source', () => assert.ok(connectorFile.includes('kubur-search-web'), 'Missing'));
test('Has kubur-search-exhumed source', () => assert.ok(connectorFile.includes('kubur-search-exhumed'), 'Missing'));
test('Has kubur-search-makam source', () => assert.ok(connectorFile.includes('kubur-search-makam'), 'Missing'));
test('Has kubur-search-stories source', () => assert.ok(connectorFile.includes('kubur-search-stories'), 'Missing'));
test('Records 80000+ count', () => assert.ok(connectorFile.includes('80000'), 'Missing'));
test('Has kubursearch.com URL', () => assert.ok(connectorFile.includes('kubursearch.com'), 'Missing'));
test('Has search URL', () => assert.ok(connectorFile.includes('/search'), 'Missing'));
test('Mentions founder Ramzul Ihsan', () => assert.ok(connectorFile.includes('Ramzul Ihsan'), 'Missing'));
test('Has attribution', () => assert.ok(connectorFile.includes('Kubur Search — kubursearch.com'), 'Missing'));
test('Has CC/attribution note', () => assert.ok(connectorFile.includes('© Kubur Search'), 'Missing'));

console.log('\nPart 3: Cemetery Coverage');
test('Pusara Aman covered', () => assert.ok(connectorFile.includes('Pusara Aman'), 'Missing'));
test('Pusara Abadi covered', () => assert.ok(connectorFile.includes('Pusara Abadi'), 'Missing'));
test('Choa Chu Kang Muslim covered', () => assert.ok(connectorFile.includes('Choa Chu Kang Muslim'), 'Missing'));
test('Jalan Kubor covered', () => assert.ok(connectorFile.includes('Jalan Kubor'), 'Missing'));
test('Has coordinates', () => assert.ok(connectorFile.includes('latitude') && connectorFile.includes('longitude'), 'Missing'));
test('Has coverage status', () => assert.ok(connectorFile.includes('coverageStatus'), 'Missing'));
test('Has record counts', () => assert.ok(connectorFile.includes('recordCount'), 'Missing'));
test('Has kuburSearchUrl per cemetery', () => assert.ok(connectorFile.includes('kuburSearchUrl'), 'Missing'));

console.log('\nPart 4: Search Features');
test('Builds search deep links', () => assert.ok(connectorFile.includes('searchLinks'), 'Missing'));
test('Supports query filter', () => assert.ok(connectorFile.includes("searchParams.set('q'"), 'Missing'));
test('Supports cemetery filter', () => assert.ok(connectorFile.includes("searchParams.set('cemetery'"), 'Missing'));
test('Supports block filter', () => assert.ok(connectorFile.includes("searchParams.set('block'"), 'Missing'));
test('Supports plot filter', () => assert.ok(connectorFile.includes("searchParams.set('plot'"), 'Missing'));
test('Has exhumed blocks link', () => assert.ok(connectorFile.includes('exhumed-blocks'), 'Missing'));
test('Has makam link', () => assert.ok(connectorFile.includes('/makam'), 'Missing'));
test('Has cemetery stories link', () => assert.ok(connectorFile.includes('cemetery-stories'), 'Missing'));
test('Has coverage map link', () => assert.ok(connectorFile.includes('/coverage'), 'Missing'));
test('Has report grave link', () => assert.ok(connectorFile.includes('/report'), 'Missing'));

console.log('\nPart 5: Backend Routes');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');
test('Import KuburSearchConnector', () => assert.ok(indexFile.includes('KuburSearchConnector'), 'Missing'));
test('GET /api/kubur-search/info', () => assert.ok(indexFile.includes("'/api/kubur-search/info'"), 'Missing'));
test('GET /api/kubur-search/cemeteries', () => assert.ok(indexFile.includes("'/api/kubur-search/cemeteries'"), 'Missing'));
test('GET /api/kubur-search/sources', () => assert.ok(indexFile.includes("'/api/kubur-search/sources'"), 'Missing'));
test('GET/POST /api/kubur-search/search', () => assert.ok(indexFile.includes("'/api/kubur-search/search'"), 'Missing'));
test('GET /api/kubur-search/coverage', () => assert.ok(indexFile.includes("'/api/kubur-search/coverage'"), 'Missing'));

console.log('\nPart 6: Backend Handlers');
test('Has handleKuburSearchInfo', () => assert.ok(indexFile.includes('handleKuburSearchInfo'), 'Missing'));
test('Has handleKuburSearchCemeteries', () => assert.ok(indexFile.includes('handleKuburSearchCemeteries'), 'Missing'));
test('Has handleKuburSearchSources', () => assert.ok(indexFile.includes('handleKuburSearchSources'), 'Missing'));
test('Has handleKuburSearchSearch', () => assert.ok(indexFile.includes('handleKuburSearchSearch'), 'Missing'));
test('Has handleKuburSearchCoverage', () => assert.ok(indexFile.includes('handleKuburSearchCoverage'), 'Missing'));

console.log('\nPart 7: Search Handler');
test('Handles POST body', () => assert.ok(indexFile.includes('body.query') || indexFile.includes('body.q'), 'Missing'));
test('Handles GET params', () => assert.ok(indexFile.includes("url.searchParams.get('q')"), 'Missing'));
test('Returns searchLinks', () => assert.ok(indexFile.includes('searchLinks'), 'Missing'));
test('Returns cemeteries', () => assert.ok(indexFile.includes('cemeteries: results.cemeteryRecords'), 'Missing'));
test('Returns attribution', () => assert.ok(indexFile.includes('attribution: results.attribution'), 'Missing'));
test('Returns note about no API', () => assert.ok(indexFile.includes('note: results.note'), 'Missing'));
test('Returns website URL', () => assert.ok(indexFile.includes("website: 'https://kubursearch.com'"), 'Missing'));

console.log('\nPart 8: Coverage Handler');
test('Returns coverage array', () => assert.ok(indexFile.includes('coverage,'), 'Missing'));
test('Returns coverageMapUrl', () => assert.ok(indexFile.includes('coverageMapUrl'), 'Missing'));
test('Checks known cemeteries', () => assert.ok(indexFile.includes('Pusara Aman'), 'Missing'));

console.log('\nPart 9: Info Handler');
test('Returns getSourceInfo', () => assert.ok(indexFile.includes('getSourceInfo()'), 'Missing'));
test('Returns sources', () => assert.ok(indexFile.includes('listSources()'), 'Missing'));

console.log('\nPart 10: Android Model');
const modelFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/KuburSearchResult.java'), 'utf8'
);
test('KuburSearchResult class exists', () => assert.ok(modelFile.includes('public class KuburSearchResult'), 'Missing'));
test('Has SearchLink inner class', () => assert.ok(modelFile.includes('class SearchLink'), 'Missing'));
test('Has CemeteryCoverage inner class', () => assert.ok(modelFile.includes('class CemeteryCoverage'), 'Missing'));
test('Has fromJson', () => assert.ok(modelFile.includes('fromJson'), 'Missing'));
test('Has hasResults', () => assert.ok(modelFile.includes('hasResults'), 'Missing'));
test('Has hasCemeteryCoverage', () => assert.ok(modelFile.includes('hasCemeteryCoverage'), 'Missing'));
test('SearchLink has url/description/type', () => assert.ok(modelFile.includes('url') && modelFile.includes('description') && modelFile.includes('type'), 'Missing'));
test('CemeteryCoverage has coordinates', () => assert.ok(modelFile.includes('latitude') && modelFile.includes('longitude'), 'Missing'));
test('CemeteryCoverage has kuburSearchUrl', () => assert.ok(modelFile.includes('kuburSearchUrl'), 'Missing'));

console.log('\nPart 11: API Client');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'), 'utf8'
);
test('Imports KuburSearchResult', () => assert.ok(apiFile.includes('KuburSearchResult'), 'Missing'));
test('Has getKuburSearchInfo', () => assert.ok(apiFile.includes('getKuburSearchInfo') && apiFile.includes('/api/kubur-search/info'), 'Missing'));
test('Has listKuburSearchCemeteries', () => assert.ok(apiFile.includes('listKuburSearchCemeteries') && apiFile.includes('/api/kubur-search/cemeteries'), 'Missing'));
test('Has listKuburSearchSources', () => assert.ok(apiFile.includes('listKuburSearchSources') && apiFile.includes('/api/kubur-search/sources'), 'Missing'));
test('Has searchKuburSearch', () => assert.ok(apiFile.includes('searchKuburSearch') && apiFile.includes('/api/kubur-search/search'), 'Missing'));
test('Has getKuburSearchCoverage', () => assert.ok(apiFile.includes('getKuburSearchCoverage') && apiFile.includes('/api/kubur-search/coverage'), 'Missing'));

console.log('\nPart 12: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'), 'utf8'
);
test('Prompts mention kubur-search', () => assert.ok(promptsFile.includes('kubur-search'), 'Missing'));
test('Prompts mention kubursearch.com', () => assert.ok(promptsFile.includes('kubursearch.com'), 'Missing'));
test('Prompts mention 80000 records', () => assert.ok(promptsFile.includes('80,000'), 'Missing'));
test('Suggested prompt: Search Kubur Search', () => assert.ok(promptsFile.includes('Search Kubur Search'), 'Missing'));
test('Suggested prompt: cemetery coverage', () => assert.ok(promptsFile.includes('cemetery coverage'), 'Missing'));

console.log('\n=== Phase 21.6 Kubur Search Connector Tests ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Kubur Search Connector tests passed!');
else console.log('\n❌ Some tests failed!');
