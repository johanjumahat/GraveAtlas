/**
 * Phase 18 Tests — Multi-Country Open Data Connectors
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

console.log('\nPart 1: New Connectors');
const cwgcFile = fs.readFileSync(path.join(projectRoot, 'backend/src/external-connectors/connectors/cwgc-connector.js'), 'utf8');
const fagFile = fs.readFileSync(path.join(projectRoot, 'backend/src/external-connectors/connectors/findagrave-connector.js'), 'utf8');
const doFile = fs.readFileSync(path.join(projectRoot, 'backend/src/external-connectors/connectors/deceased-online-connector.js'), 'utf8');

test('CWGC connector exists', () => {
  assert.ok(cwgcFile.includes('class CWGCConnector'), 'Missing CWGCConnector class');
});
test('CWGC extends BaseConnector', () => {
  assert.ok(cwgcFile.includes('extends BaseConnector'), 'Missing BaseConnector');
});
test('CWGC has request method', () => assert.ok(cwgcFile.includes('async request'), 'Missing request'));
test('CWGC has normalize method', () => assert.ok(cwgcFile.includes('normalize('), 'Missing normalize'));
test('CWGC has validate method', () => assert.ok(cwgcFile.includes('validate('), 'Missing validate'));
test('CWGC targets cwgc.org', () => assert.ok(cwgcFile.includes('cwgc.org'), 'Missing CWGC URL'));
test('CWGC has getSourceInfo', () => assert.ok(cwgcFile.includes('getSourceInfo'), 'Missing getSourceInfo'));
test('CWGC handles 429 rate limit', () => assert.ok(cwgcFile.includes('429'), 'Missing rate limit handling'));

test('FindAGrave connector exists', () => {
  assert.ok(fagFile.includes('class FindAGraveConnector'), 'Missing FindAGraveConnector');
});
test('FindAGrave extends BaseConnector', () => {
  assert.ok(fagFile.includes('extends BaseConnector'), 'Missing BaseConnector');
});
test('FindAGrave has HTML parser', () => assert.ok(fagFile.includes('parseSearchHTML'), 'Missing HTML parser'));
test('FindAGrave targets findagrave.com', () => assert.ok(fagFile.includes('findagrave.com'), 'Missing FAG URL'));
test('FindAGrave has normalize', () => assert.ok(fagFile.includes('normalize('), 'Missing normalize'));
test('FindAGrave has getSourceInfo', () => assert.ok(fagFile.includes('getSourceInfo'), 'Missing getSourceInfo'));

test('DeceasedOnline connector exists', () => {
  assert.ok(doFile.includes('class DeceasedOnlineConnector'), 'Missing DeceasedOnlineConnector');
});
test('DeceasedOnline extends BaseConnector', () => {
  assert.ok(doFile.includes('extends BaseConnector'), 'Missing BaseConnector');
});
test('DeceasedOnline has HTML parser', () => assert.ok(doFile.includes('parseSearchHTML'), 'Missing HTML parser'));
test('DeceasedOnline targets deceasedonline.com', () => assert.ok(doFile.includes('deceasedonline.com'), 'Missing DO URL'));
test('DeceasedOnline has normalize', () => assert.ok(doFile.includes('normalize('), 'Missing normalize'));
test('DeceasedOnline has getSourceInfo', () => assert.ok(doFile.includes('getSourceInfo'), 'Missing getSourceInfo'));

console.log('\nPart 2: Gateway Integration');
const gwFile = fs.readFileSync(path.join(projectRoot, 'backend/src/external-connectors/gateway.js'), 'utf8');
test('Gateway imports CWGCConnector', () => assert.ok(gwFile.includes('CWGCConnector'), 'Missing import'));
test('Gateway imports FindAGraveConnector', () => assert.ok(gwFile.includes('FindAGraveConnector'), 'Missing import'));
test('Gateway imports DeceasedOnlineConnector', () => assert.ok(gwFile.includes('DeceasedOnlineConnector'), 'Missing import'));
test('Gateway has CWGC case', () => assert.ok(gwFile.includes("case 'cwgc'"), 'Missing CWGC case'));
test('Gateway has findagrave case', () => assert.ok(gwFile.includes("case 'findagrave'"), 'Missing findagrave case'));
test('Gateway has uk-deceased-online case', () => assert.ok(gwFile.includes("case 'uk-deceased-online'"), 'Missing deceased-online case'));

console.log('\nPart 3: Registry Updates');
const regFile = fs.readFileSync(path.join(projectRoot, 'backend/src/external-connectors/registry.js'), 'utf8');
test('CWGC marked implemented', () => {
  assert.ok(regFile.includes("sourceId: 'cwgc'"), 'Missing CWGC entry');
  // Verify it's now 'implemented' not 'not_implemented'
  const cwgcSection = regFile.match(/sourceId: 'cwgc'[\s\S]*?integrationStatus: '(\w+)'/);
  assert.ok(cwgcSection && cwgcSection[1] === 'implemented', 'CWGC not marked implemented');
});
test('FindAGrave marked implemented', () => {
  const fagSection = regFile.match(/sourceId: 'findagrave'[\s\S]*?integrationStatus: '(\w+)'/);
  assert.ok(fagSection && fagSection[1] === 'implemented', 'FindAGrave not marked implemented');
});
test('Wikidata marked implemented', () => {
  const wdSection = regFile.match(/sourceId: 'wikidata-sparql'[\s\S]*?integrationStatus: '(\w+)'/);
  assert.ok(wdSection && wdSection[1] === 'implemented', 'Wikidata not marked implemented');
});
test('UK Deceased Online registered', () => {
  assert.ok(regFile.includes("sourceId: 'uk-deceased-online'"), 'Missing uk-deceased-online entry');
});
test('UK Deceased Online marked implemented', () => {
  const doSection = regFile.match(/sourceId: 'uk-deceased-online'[\s\S]*?integrationStatus: '(\w+)'/);
  assert.ok(doSection && doSection[1] === 'implemented', 'UK Deceased Online not marked implemented');
});

console.log('\nPart 4: Backend Endpoints');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');
test('Has handleSourceCountries', () => assert.ok(indexFile.includes('handleSourceCountries'), 'Missing handler'));
test('Has handleSourceSearch', () => assert.ok(indexFile.includes('handleSourceSearch'), 'Missing handler'));
test('Has handleSourceDetails', () => assert.ok(indexFile.includes('handleSourceDetails'), 'Missing handler'));
test('Has handleSourceCoverage', () => assert.ok(indexFile.includes('handleSourceCoverage'), 'Missing handler'));

test('Route /api/sources/countries registered', () => assert.ok(indexFile.includes('/api/sources/countries'), 'Missing route'));
test('Route /api/sources/search registered', () => assert.ok(indexFile.includes('/api/sources/search'), 'Missing route'));
test('Route /api/sources/coverage registered', () => assert.ok(indexFile.includes('/api/sources/coverage'), 'Missing route'));
test('Route /api/sources/:id/details registered', () => assert.ok(indexFile.includes('/details') && indexFile.includes('handleSourceDetails'), 'Missing route'));

console.log('\nPart 5: Source Countries Endpoint');
test('Returns totalCountries', () => assert.ok(indexFile.includes('totalCountries'), 'Missing totalCountries'));
test('Returns totalSources', () => assert.ok(indexFile.includes('totalSources'), 'Missing totalSources'));
test('Groups sources by country', () => assert.ok(indexFile.includes('countryMap'), 'Missing countryMap'));
test('Includes attribution per source', () => assert.ok(indexFile.includes('attributionRequirement'), 'Missing attribution'));

console.log('\nPart 6: Source Search Endpoint');
test('Accepts q parameter', () => assert.ok(indexFile.includes("get('q')"), 'Missing q param'));
test('Accepts country parameter', () => assert.ok(indexFile.includes("get('country')"), 'Missing country param'));
test('Accepts source parameter', () => assert.ok(indexFile.includes("get('source')"), 'Missing source param'));
test('Returns totalRecords', () => assert.ok(indexFile.includes('totalRecords'), 'Missing totalRecords'));
test('Queries all implemented sources', () => assert.ok(indexFile.includes('sourcesToQuery'), 'Missing source iteration'));

console.log('\nPart 7: Source Coverage Endpoint');
test('Returns global sources list', () => assert.ok(indexFile.includes('coverage.global'), 'Missing global list'));
test('Returns byCountry map', () => assert.ok(indexFile.includes('coverage.byCountry'), 'Missing byCountry'));
test('Returns implementedSources count', () => assert.ok(indexFile.includes('implementedSources'), 'Missing count'));

console.log('\nPart 8: Source Details Endpoint');
test('Returns source metadata', () => assert.ok(indexFile.includes('documentationUrl'), 'Missing documentationUrl'));
test('Returns licensing info', () => assert.ok(indexFile.includes('licenseVerified'), 'Missing licenseVerified'));
test('Returns privacy restrictions', () => assert.ok(indexFile.includes('privacyRestrictions'), 'Missing privacyRestrictions'));
test('Returns geographic coverage', () => assert.ok(indexFile.includes('geographicCoverage'), 'Missing geographicCoverage'));

console.log('\nPart 9: Android Model');
const modelFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/SourceCoverageResult.java'),
  'utf8'
);
test('Class exists', () => assert.ok(modelFile.includes('public class SourceCoverageResult'), 'Not found'));
test('Has SourceEntry inner', () => assert.ok(modelFile.includes('class SourceEntry'), 'Missing SourceEntry'));
test('Has CountrySources inner', () => assert.ok(modelFile.includes('class CountrySources'), 'Missing CountrySources'));
test('Has fromJson', () => assert.ok(modelFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasGlobalSources', () => assert.ok(modelFile.includes('hasGlobalSources'), 'Missing hasGlobalSources'));
test('Has hasMultipleCountries', () => assert.ok(modelFile.includes('hasMultipleCountries'), 'Missing hasMultipleCountries'));

console.log('\nPart 10: API Client');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);
test('Imports SourceCoverageResult', () => assert.ok(apiFile.includes('SourceCoverageResult'), 'Missing import'));
test('Has getSourceCountries', () => {
  assert.ok(apiFile.includes('getSourceCountries'), 'Missing method');
  assert.ok(apiFile.includes('/api/sources/countries'), 'Missing URL');
});
test('Has searchExternalSources', () => {
  assert.ok(apiFile.includes('searchExternalSources'), 'Missing method');
  assert.ok(apiFile.includes('/api/sources/search'), 'Missing URL');
});
test('Has getSourceCoverage', () => {
  assert.ok(apiFile.includes('getSourceCoverage'), 'Missing method');
  assert.ok(apiFile.includes('/api/sources/coverage'), 'Missing URL');
});
test('Has getSourceDetails', () => {
  assert.ok(apiFile.includes('getSourceDetails'), 'Missing method');
  assert.ok(apiFile.includes('/details'), 'Missing URL');
});

console.log('\nPart 11: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);
test('Prompts mention /api/sources/countries', () => assert.ok(promptsFile.includes('sources/countries'), 'Missing'));
test('Prompts mention /api/sources/search', () => assert.ok(promptsFile.includes('sources/search'), 'Missing'));
test('Prompts mention CWGC', () => assert.ok(promptsFile.includes('CWGC') || promptsFile.includes('Commonwealth'), 'Missing CWGC'));
test('Prompts mention Find a Grave', () => assert.ok(promptsFile.includes('Find a Grave'), 'Missing'));
test('Suggested prompts include Commonwealth', () => assert.ok(promptsFile.includes('Commonwealth'), 'Missing'));
test('Suggested prompts include UK', () => assert.ok(promptsFile.includes('UK'), 'Missing'));
test('Suggested prompts include countries', () => assert.ok(promptsFile.includes('countries'), 'Missing'));

console.log('\nPart 12: Documentation');
test('CHANGELOG mentions Phase 18', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Phase 18') || c.includes('Multi-Country'), 'Missing from CHANGELOG');
});
test('STATUS.md mentions Phase 18', () => {
  const s = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(s.includes('18') || s.includes('Multi-Country') || s.includes('connector'), 'Missing from STATUS');
});

console.log('\n=== Phase 18 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 18 Multi-Country Open Data Connectors tests passed!');
else console.log('\n❌ Some tests failed!');
