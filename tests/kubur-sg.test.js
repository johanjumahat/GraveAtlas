/**
 * Kubur SG Connector Tests
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
const connFile = fs.readFileSync(
  path.join(projectRoot, 'backend/src/external-connectors/connectors/kubur-sg-connector.js'),
  'utf8'
);

test('Class exists', () => assert.ok(connFile.includes('class KuburSGConnector'), 'Missing class'));
test('Extends BaseConnector', () => assert.ok(connFile.includes('extends BaseConnector'), 'Missing BaseConnector'));
test('Has request method', () => assert.ok(connFile.includes('async request('), 'Missing request'));
test('Has validate method', () => assert.ok(connFile.includes('validate('), 'Missing validate'));
test('Has normalize method', () => assert.ok(connFile.includes('normalize('), 'Missing normalize'));
test('Has getSourceInfo', () => assert.ok(connFile.includes('getSourceInfo'), 'Missing getSourceInfo'));
test('Has listCemeteries', () => assert.ok(connFile.includes('listCemeteries'), 'Missing listCemeteries'));
test('Has listSources', () => assert.ok(connFile.includes('listSources'), 'Missing listSources'));
test('Has fetchCommunityRecords', () => assert.ok(connFile.includes('fetchCommunityRecords'), 'Missing fetchCommunityRecords'));
test('Has getGithubToken', () => assert.ok(connFile.includes('getGithubToken'), 'Missing getGithubToken'));
test('Has pemToDer', () => assert.ok(connFile.includes('pemToDer'), 'Missing pemToDer'));

console.log('\nPart 2: Cemetery Data');
test('Pusara Aman listed', () => assert.ok(connFile.includes('Pusara Aman'), 'Missing Pusara Aman'));
test('Pusara Abadi listed', () => assert.ok(connFile.includes('Pusara Abadi'), 'Missing Pusara Abadi'));
test('Choa Chu Kang Muslim listed', () => assert.ok(connFile.includes('Choa Chu Kang Muslim'), 'Missing CCK Muslim'));
test('Lim Chu Kang Muslim listed', () => assert.ok(connFile.includes('Lim Chu Kang Muslim'), 'Missing LCK Muslim'));
test('Bidadari listed', () => assert.ok(connFile.includes('Bidadari'), 'Missing Bidadari'));
test('Jalan Kubor listed', () => assert.ok(connFile.includes('Jalan Kubor'), 'Missing Jalan Kubor'));
test('Cemeteries have coordinates', () => {
  assert.ok(connFile.includes('latitude'), 'Missing latitude');
  assert.ok(connFile.includes('longitude'), 'Missing longitude');
});
test('Cemeteries have type field', () => assert.ok(connFile.includes("'muslim'"), 'Missing muslim type'));
test('Bidadari marked closed', () => assert.ok(connFile.includes("'closed'"), 'Missing closed status'));
test('Jalan Kubor marked heritage', () => assert.ok(connFile.includes("'heritage'"), 'Missing heritage status'));

console.log('\nPart 3: Source Registry');
test('Has community-records source', () => assert.ok(connFile.includes("'community-records'"), 'Missing community-records'));
test('Has NEA CCK portal source', () => assert.ok(connFile.includes('nea-cck-portals'), 'Missing NEA portal'));
test('Has MUIS source', () => assert.ok(connFile.includes('muis-cemeteries'), 'Missing MUIS'));
test('Has Pusara Aman source', () => assert.ok(connFile.includes('pusara-aman'), 'Missing pusara-aman source'));
test('Has Pusara Abadi source', () => assert.ok(connFile.includes('pusara-abadi'), 'Missing pusara-abadi source'));
test('CC-BY-SA 4.0 license', () => assert.ok(connFile.includes('CC-BY-SA 4.0'), 'Missing license'));

console.log('\nPart 4: Gateway Integration');
const gwFile = fs.readFileSync(path.join(projectRoot, 'backend/src/external-connectors/gateway.js'), 'utf8');
test('Gateway imports KuburSGConnector', () => assert.ok(gwFile.includes('KuburSGConnector'), 'Missing import'));
test('Gateway has kubur-sg case', () => assert.ok(gwFile.includes("case 'kubur-sg'"), 'Missing case'));

console.log('\nPart 5: Registry Entry');
const regFile = fs.readFileSync(path.join(projectRoot, 'backend/src/external-connectors/registry.js'), 'utf8');
test('Kubur SG registered', () => assert.ok(regFile.includes("sourceId: 'kubur-sg'"), 'Missing entry'));
test('Marked implemented', () => {
  const section = regFile.match(/sourceId: 'kubur-sg'[\s\S]*?integrationStatus: '(\w+)'/);
  assert.ok(section && section[1] === 'implemented', 'Not marked implemented');
});
test('Singapore country region', () => {
  const section = regFile.match(/sourceId: 'kubur-sg'[\s\S]*?countryRegion: '([^']+)'/);
  assert.ok(section && section[1] === 'Singapore', 'Not Singapore');
});
test('License verified', () => {
  const section = regFile.match(/sourceId: 'kubur-sg'[\s\S]*?licenseVerified: (\w+)/);
  assert.ok(section && section[1] === 'true', 'Not verified');
});
test('Mentions Muslim/Malay', () => {
  const section = regFile.match(/sourceId: 'kubur-sg'[\s\S]*?notes: '([^']+)'/);
  assert.ok(section && (section[1].includes('Muslim') || section[1].includes('Malay')), 'Missing Muslim/Malay mention');
});

console.log('\nPart 6: Backend Endpoints');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');
test('Imports KuburSGConnector', () => assert.ok(indexFile.includes('KuburSGConnector'), 'Missing import'));
test('Has handleKuburSGCemeteries', () => assert.ok(indexFile.includes('handleKuburSGCemeteries'), 'Missing handler'));
test('Has handleKuburSGSources', () => assert.ok(indexFile.includes('handleKuburSGSources'), 'Missing handler'));
test('Route /api/kubur-sg/cemeteries registered', () => assert.ok(indexFile.includes('/api/kubur-sg/cemeteries'), 'Missing route'));
test('Route /api/kubur-sg/sources registered', () => assert.ok(indexFile.includes('/api/kubur-sg/sources'), 'Missing route'));
test('Returns totalCemeteries', () => assert.ok(indexFile.includes('totalCemeteries'), 'Missing totalCemeteries'));
test('Returns attribution', () => assert.ok(indexFile.includes('attribution'), 'Missing attribution'));
test('Returns license', () => assert.ok(indexFile.includes('CC-BY-SA'), 'Missing license'));

console.log('\nPart 7: API Client');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);
test('Has getKuburSGCemeteries', () => {
  assert.ok(apiFile.includes('getKuburSGCemeteries'), 'Missing method');
  assert.ok(apiFile.includes('/api/kubur-sg/cemeteries'), 'Missing URL');
});
test('Has getKuburSGSources', () => {
  assert.ok(apiFile.includes('getKuburSGSources'), 'Missing method');
  assert.ok(apiFile.includes('/api/kubur-sg/sources'), 'Missing URL');
});

console.log('\nPart 8: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);
test('Prompts mention kubur-sg/cemeteries', () => assert.ok(promptsFile.includes('kubur-sg/cemeteries'), 'Missing'));
test('Prompts mention kubur-sg/sources', () => assert.ok(promptsFile.includes('kubur-sg/sources'), 'Missing'));
test('Prompts mention Pusara Aman', () => assert.ok(promptsFile.includes('Pusara Aman'), 'Missing'));
test('Suggested prompts include Muslim', () => assert.ok(promptsFile.includes('Muslim'), 'Missing'));
test('Suggested prompts include Kubur SG', () => assert.ok(promptsFile.includes('Kubur SG'), 'Missing'));

console.log('\nPart 9: Documentation');
test('CHANGELOG mentions Kubur SG', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Kubur SG') || c.includes('kubur'), 'Missing from CHANGELOG');
});
test('STATUS.md mentions Kubur SG', () => {
  const s = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(s.includes('Kubur') || s.includes('kubur'), 'Missing from STATUS');
});

console.log('\n=== Kubur SG Connector Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Kubur SG Connector tests passed!');
else console.log('\n❌ Some tests failed!');
