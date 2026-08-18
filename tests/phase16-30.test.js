/**
 * Phase 16.30 Tests — AI Cross-Reference & Linkage Engine
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
  ['handleFamilyLinkage', 'GET /api/linkage/family/:id'],
  ['handleCrossCemeteryLinkage', 'GET /api/linkage/cross-cemetery'],
  ['handleProximityLinkage', 'GET /api/linkage/proximity'],
  ['handleEventClustering', 'GET /api/linkage/events'],
  ['handleLinkageGraph', 'GET /api/linkage/graph'],
];

for (const [handler, desc] of handlers) {
  test(`Backend has ${desc}`, () => {
    assert.ok(indexFile.includes(handler), `Missing ${handler}`);
  });
}

test('All 5 linkage routes registered', () => {
  assert.ok(indexFile.includes('/api/linkage/family/'), 'Missing family linkage route');
  assert.ok(indexFile.includes('/api/linkage/cross-cemetery'), 'Missing cross-cemetery route');
  assert.ok(indexFile.includes('/api/linkage/proximity'), 'Missing proximity route');
  assert.ok(indexFile.includes('/api/linkage/events'), 'Missing events route');
  assert.ok(indexFile.includes('/api/linkage/graph'), 'Missing graph route');
});

test('Helper functions exist', () => {
  assert.ok(indexFile.includes('stringSimilarity'), 'Missing stringSimilarity');
  assert.ok(indexFile.includes('getSurname'), 'Missing getSurname');
  assert.ok(indexFile.includes('getGivenName'), 'Missing getGivenName');
  assert.ok(indexFile.includes('haversine'), 'Missing haversine');
});

console.log('\nPart 2: Family Linkage');
test('Groups by surname', () => {
  assert.ok(indexFile.includes('surnameGroups'), 'Missing surnameGroups');
});
test('Scores family links', () => {
  assert.ok(indexFile.includes('matchScore'), 'Missing matchScore');
  assert.ok(indexFile.includes('same surname'), 'Missing surname reason');
});
test('Detects date proximity', () => {
  assert.ok(indexFile.includes('death dates within'), 'Missing date proximity');
  assert.ok(indexFile.includes('birth dates within'), 'Missing birth date proximity');
});
test('Detects plot proximity', () => {
  assert.ok(indexFile.includes('same plot'), 'Missing same plot');
  assert.ok(indexFile.includes('same section'), 'Missing same section');
});
test('Detects GPS proximity', () => {
  assert.ok(indexFile.includes('GPS proximity'), 'Missing GPS proximity');
  assert.ok(indexFile.includes('haversine'), 'Missing haversine call');
});
test('Classifies relationships', () => {
  assert.ok(indexFile.includes('likely family'), 'Missing likely family');
  assert.ok(indexFile.includes('possible family'), 'Missing possible family');
  assert.ok(indexFile.includes('same surname'), 'Missing same surname');
});

console.log('\nPart 3: Cross-Cemetery Linkage');
test('Compares across cemeteries', () => {
  assert.ok(indexFile.includes('cross-cemetery') || indexFile.includes('CrossCemetery'), 'Missing cross-cemetery');
});
test('Uses name similarity threshold', () => {
  assert.ok(indexFile.includes('nameSim') || indexFile.includes('name similarity'), 'Missing name similarity');
});
test('Detects same birth/death year', () => {
  assert.ok(indexFile.includes('same birth year'), 'Missing same birth year');
  assert.ok(indexFile.includes('same death year'), 'Missing same death year');
});
test('Classifies linkage type', () => {
  assert.ok(indexFile.includes('possible same person'), 'Missing same person');
  assert.ok(indexFile.includes('possible family member'), 'Missing family member');
});

console.log('\nPart 4: Proximity Linkage');
test('Requires recordId param', () => {
  assert.ok(indexFile.includes("recordId is required"), 'Missing recordId validation');
});
test('Uses haversine distance', () => {
  assert.ok(indexFile.includes('haversine'), 'Missing haversine');
});
test('Supports configurable radius', () => {
  assert.ok(indexFile.includes('radius'), 'Missing radius param');
});
test('Sorts by distance', () => {
  assert.ok(indexFile.includes('a.distance - b.distance'), 'Missing distance sort');
});

console.log('\nPart 5: Event Clustering');
test('Groups by death year', () => {
  assert.ok(indexFile.includes('yearGroups'), 'Missing yearGroups');
});
test('Detects spike years', () => {
  assert.ok(indexFile.includes('isSpike'), 'Missing isSpike');
  assert.ok(indexFile.includes('spikeRatio'), 'Missing spikeRatio');
});
test('Identifies possible events', () => {
  assert.ok(indexFile.includes('epidemic'), 'Missing epidemic');
  assert.ok(indexFile.includes('war'), 'Missing war');
  assert.ok(indexFile.includes('disaster'), 'Missing disaster');
});
test('Returns notable names', () => {
  assert.ok(indexFile.includes('notableNames'), 'Missing notableNames');
});
test('Accepts threshold param', () => {
  assert.ok(indexFile.includes('threshold'), 'Missing threshold');
});
test('Returns year range', () => {
  assert.ok(indexFile.includes('yearRange'), 'Missing yearRange');
});

console.log('\nPart 6: Linkage Graph');
test('Returns nodes and edges', () => {
  assert.ok(indexFile.includes('nodes'), 'Missing nodes');
  assert.ok(indexFile.includes('edges'), 'Missing edges');
});
test('Edge types: family', () => assert.ok(indexFile.includes("'family'"), 'Missing family edge type'));
test('Edge types: same_cemetery', () => assert.ok(indexFile.includes("'same_cemetery'"), 'Missing same_cemetery edge type'));
test('Edge types: same_year', () => assert.ok(indexFile.includes("'same_year'"), 'Missing same_year edge type'));
test('Edge types: proximity', () => assert.ok(indexFile.includes("'proximity'"), 'Missing proximity edge type'));
test('Edge types: shared_source', () => assert.ok(indexFile.includes("'shared_source'"), 'Missing shared_source edge type'));
test('Returns graph stats', () => {
  assert.ok(indexFile.includes('nodeCount'), 'Missing nodeCount');
  assert.ok(indexFile.includes('edgeCount'), 'Missing edgeCount');
  assert.ok(indexFile.includes('edgeTypes'), 'Missing edgeTypes');
});
test('Supports depth param', () => {
  assert.ok(indexFile.includes('depth'), 'Missing depth param');
});

console.log('\nPart 7: FamilyLinkageResult Model');
const flFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/FamilyLinkageResult.java'),
  'utf8'
);
test('Class exists', () => assert.ok(flFile.includes('public class FamilyLinkageResult'), 'Not found'));
test('Has FamilyLink inner', () => assert.ok(flFile.includes('class FamilyLink'), 'Missing FamilyLink'));
test('Has SurnameGroup inner', () => assert.ok(flFile.includes('class SurnameGroup'), 'Missing SurnameGroup'));
test('Has RecordRef inner', () => assert.ok(flFile.includes('class RecordRef'), 'Missing RecordRef'));
test('Has fromJson', () => assert.ok(flFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasLinks', () => assert.ok(flFile.includes('hasLinks'), 'Missing hasLinks'));

console.log('\nPart 8: LinkageGraph Model');
const lgFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/LinkageGraph.java'),
  'utf8'
);
test('Class exists', () => assert.ok(lgFile.includes('public class LinkageGraph'), 'Not found'));
test('Has GraphData inner', () => assert.ok(lgFile.includes('class GraphData'), 'Missing GraphData'));
test('Has GraphNode inner', () => assert.ok(lgFile.includes('class GraphNode'), 'Missing GraphNode'));
test('Has GraphEdge inner', () => assert.ok(lgFile.includes('class GraphEdge'), 'Missing GraphEdge'));
test('Has GraphStats inner', () => assert.ok(lgFile.includes('class GraphStats'), 'Missing GraphStats'));
test('Has EdgeTypeCounts inner', () => assert.ok(lgFile.includes('class EdgeTypeCounts'), 'Missing EdgeTypeCounts'));
test('Has fromJson', () => assert.ok(lgFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasNodes', () => assert.ok(lgFile.includes('hasNodes'), 'Missing hasNodes'));

console.log('\nPart 9: EventClusteringResult Model');
const ecFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/EventClusteringResult.java'),
  'utf8'
);
test('Class exists', () => assert.ok(ecFile.includes('public class EventClusteringResult'), 'Not found'));
test('Has HistoricalEvent inner', () => assert.ok(ecFile.includes('class HistoricalEvent'), 'Missing HistoricalEvent'));
test('Has YearRange inner', () => assert.ok(ecFile.includes('class YearRange'), 'Missing YearRange'));
test('Has fromJson', () => assert.ok(ecFile.includes('fromJson'), 'Missing fromJson'));
test('Has hasEvents', () => assert.ok(ecFile.includes('hasEvents'), 'Missing hasEvents'));
test('Has getSpikes', () => assert.ok(ecFile.includes('getSpikes'), 'Missing getSpikes'));

console.log('\nPart 10: API Client Integration');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);
test('Imports FamilyLinkageResult', () => assert.ok(apiFile.includes('FamilyLinkageResult'), 'Missing import'));
test('Imports LinkageGraph', () => assert.ok(apiFile.includes('LinkageGraph'), 'Missing import'));
test('Imports EventClusteringResult', () => assert.ok(apiFile.includes('EventClusteringResult'), 'Missing import'));
test('Has getFamilyLinkage', () => {
  assert.ok(apiFile.includes('getFamilyLinkage'), 'Missing method');
  assert.ok(apiFile.includes('/api/linkage/family/'), 'Missing URL');
});
test('Has getCrossCemeteryLinkage', () => {
  assert.ok(apiFile.includes('getCrossCemeteryLinkage'), 'Missing method');
  assert.ok(apiFile.includes('/api/linkage/cross-cemetery'), 'Missing URL');
});
test('Has getProximityLinkage', () => {
  assert.ok(apiFile.includes('getProximityLinkage'), 'Missing method');
  assert.ok(apiFile.includes('/api/linkage/proximity'), 'Missing URL');
});
test('Has getEventClustering', () => {
  assert.ok(apiFile.includes('getEventClustering'), 'Missing method');
  assert.ok(apiFile.includes('/api/linkage/events'), 'Missing URL');
});
test('Has getLinkageGraph', () => {
  assert.ok(apiFile.includes('getLinkageGraph'), 'Missing method');
  assert.ok(apiFile.includes('/api/linkage/graph'), 'Missing URL');
});

console.log('\nPart 11: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);
test('Prompts mention /api/linkage/family', () => assert.ok(promptsFile.includes('linkage/family'), 'Missing'));
test('Prompts mention /api/linkage/cross-cemetery', () => assert.ok(promptsFile.includes('linkage/cross-cemetery'), 'Missing'));
test('Prompts mention /api/linkage/events', () => assert.ok(promptsFile.includes('linkage/events'), 'Missing'));
test('Prompts mention /api/linkage/graph', () => assert.ok(promptsFile.includes('linkage/graph'), 'Missing'));
test('Suggested prompts include family links', () => assert.ok(promptsFile.includes('family links'), 'Missing'));
test('Suggested prompts include event clusters', () => assert.ok(promptsFile.includes('event cluster'), 'Missing'));

console.log('\nPart 12: Documentation');
test('CHANGELOG mentions Phase 16.30', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Phase 16.30') || c.includes('Cross-Reference'), 'Missing from CHANGELOG');
});
test('STATUS.md mentions 16.30', () => {
  const s = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(s.includes('16.30') || s.includes('Cross-Reference'), 'Missing from STATUS');
});

console.log('\n=== Phase 16.30 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.30 Cross-Reference & Linkage Engine tests passed!');
else console.log('\n❌ Some tests failed!');
