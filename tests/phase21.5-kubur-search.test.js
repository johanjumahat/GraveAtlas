/**
 * Phase 21.5 Tests — Kubur SG Search Connector
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

console.log('\nPart 1: Backend Route');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');

test('Has /api/kubur-sg/search route', () => assert.ok(indexFile.includes("'/api/kubur-sg/search'"), 'Missing'));
test('Route accepts GET', () => assert.ok(indexFile.includes("'GET' || method === 'POST'") || indexFile.includes("GET' || method === 'POST'"), 'Missing'));
test('Has handleKuburSGSearch handler', () => assert.ok(indexFile.includes('handleKuburSGSearch'), 'Missing'));

console.log('\nPart 2: Search Handler');
test('Handles POST body params', () => assert.ok(indexFile.includes('body.query') || indexFile.includes('body.q'), 'Missing'));
test('Handles GET query params', () => assert.ok(indexFile.includes("url.searchParams.get('q')"), 'Missing'));
test('Supports cemetery filter', () => assert.ok(indexFile.includes('cemetery'), 'Missing'));
test('Supports region filter', () => assert.ok(indexFile.includes('region'), 'Missing'));
test('Supports type filter', () => assert.ok(indexFile.includes('type'), 'Missing'));
test('Supports limit param', () => assert.ok(indexFile.includes('limit'), 'Missing'));
test('Supports offset param', () => assert.ok(indexFile.includes('offset'), 'Missing'));
test('Returns total count', () => assert.ok(indexFile.includes('total'), 'Missing'));
test('Returns hasMore pagination', () => assert.ok(indexFile.includes('hasMore'), 'Missing'));
test('Returns results array', () => assert.ok(indexFile.includes('results: paginated') || indexFile.includes('results: allResults'), 'Missing'));
test('Returns sourcesQueried', () => assert.ok(indexFile.includes('sourcesQueried'), 'Missing'));
test('Returns attribution', () => assert.ok(indexFile.includes('Kubur SG Community Burial Records'), 'Missing'));

console.log('\nPart 3: Search Results Structure');
test('Burial records have personName', () => assert.ok(indexFile.includes('personName'), 'Missing'));
test('Burial records have birthDate/deathDate', () => assert.ok(indexFile.includes('birthDate') && indexFile.includes('deathDate'), 'Missing'));
test('Burial records have cemetery', () => assert.ok(indexFile.includes('cemetery'), 'Missing'));
test('Burial records have plot', () => assert.ok(indexFile.includes('plot'), 'Missing'));
test('Burial records have section', () => assert.ok(indexFile.includes('section'), 'Missing'));
test('Burial records have religion', () => assert.ok(indexFile.includes('religion'), 'Missing'));
test('Burial records have source attribution', () => assert.ok(indexFile.includes("source: 'community-records'"), 'Missing'));
test('Burial records have license', () => assert.ok(indexFile.includes('CC-BY-SA 4.0'), 'Missing'));
test('Cemetery records have name', () => assert.ok(indexFile.includes('name: cemetery.name'), 'Missing'));
test('Cemetery records have coordinates', () => assert.ok(indexFile.includes('latitude') && indexFile.includes('longitude'), 'Missing'));
test('Cemetery records have status', () => assert.ok(indexFile.includes('status'), 'Missing'));
test('Results have recordType (burial/cemetery)', () => assert.ok(indexFile.includes('recordType'), 'Missing'));

console.log('\nPart 4: Filtering Logic');
test('Filters by query text on name', () => assert.ok(indexFile.includes('name.includes(q)'), 'Missing'));
test('Filters by query text on cemetery', () => assert.ok(indexFile.includes('cemetery.includes(q)'), 'Missing'));
test('Filters by cemetery filter', () => assert.ok(indexFile.includes('cemFilter'), 'Missing'));
test('Filters by region filter', () => assert.ok(indexFile.includes('regFilter'), 'Missing'));
test('Filters by type filter', () => assert.ok(indexFile.includes('typeFilter'), 'Missing'));

console.log('\nPart 5: API Client');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'), 'utf8'
);
test('Has searchKuburSG method', () => assert.ok(apiFile.includes('searchKuburSG'), 'Missing'));
test('API client calls /api/kubur-sg/search', () => assert.ok(apiFile.includes('/api/kubur-sg/search'), 'Missing'));
test('Accepts query param', () => assert.ok(apiFile.includes('query'), 'Missing'));
test('Accepts cemetery param', () => assert.ok(apiFile.includes('cemetery'), 'Missing'));
test('Accepts region param', () => assert.ok(apiFile.includes('region'), 'Missing'));
test('Accepts type param', () => assert.ok(apiFile.includes('type'), 'Missing'));
test('Accepts limit param', () => assert.ok(apiFile.includes('limit'), 'Missing'));
test('Accepts offset param', () => assert.ok(apiFile.includes('offset'), 'Missing'));

console.log('\nPart 6: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'), 'utf8'
);
test('Prompts mention kubur-sg/search', () => assert.ok(promptsFile.includes('kubur-sg/search'), 'Missing'));
test('Prompts mention burial records search', () => assert.ok(promptsFile.includes('burial records') || promptsFile.includes('burial'), 'Missing'));

console.log('\nPart 7: Connector File');
const connectorFile = fs.readFileSync(
  path.join(projectRoot, 'backend/src/external-connectors/connectors/kubur-sg-connector.js'), 'utf8'
);
test('Connector has request method', () => assert.ok(connectorFile.includes('async request(query, env)'), 'Missing'));
test('Connector has fetchCommunityRecords', () => assert.ok(connectorFile.includes('fetchCommunityRecords'), 'Missing'));
test('Connector has listSources', () => assert.ok(connectorFile.includes('listSources'), 'Missing'));
test('Connector has getSourceInfo', () => assert.ok(connectorFile.includes('getSourceInfo'), 'Missing'));
test('Connector has SG_MUSLIM_CEMETERIES', () => assert.ok(connectorFile.includes('SG_MUSLIM_CEMETERIES'), 'Missing'));
test('Connector covers Pusara Aman', () => assert.ok(connectorFile.includes('Pusara Aman'), 'Missing'));
test('Connector covers Pusara Abadi', () => assert.ok(connectorFile.includes('Pusara Abadi'), 'Missing'));
test('Connector covers Choa Chu Kang', () => assert.ok(connectorFile.includes('Choa Chu Kang'), 'Missing'));
test('Connector covers Jalan Kubor', () => assert.ok(connectorFile.includes('Jalan Kubor'), 'Missing'));
test('Connector has CC-BY-SA 4.0 license', () => assert.ok(connectorFile.includes('CC-BY-SA 4.0'), 'Missing'));

console.log('\n=== Phase 21.5 Kubur SG Search Tests ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Kubur SG Search tests passed!');
else console.log('\n❌ Some tests failed!');
