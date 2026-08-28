/**
 * Phase 23 Tests — AI Genealogy & Family Tree Builder
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const builder = require('../backend/src/genealogy/family-tree-builder.js');
const projectRoot = path.join(__dirname, '..');
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}

console.log('\nPart 1: Name Extraction');
test('Extract Western surname', () => {
  assert.strictEqual(builder.extractSurname('John Smith'), 'Smith');
});
test('Extract Western given name', () => {
  assert.strictEqual(builder.extractGivenName('John Smith'), 'John');
});
test('Extract Chinese surname (1 char)', () => {
  assert.strictEqual(builder.extractSurname('陈'), '陈');
});
test('Extract Chinese surname (2 chars)', () => {
  assert.strictEqual(builder.extractSurname('欧阳'), '欧阳');
});
test('Extract Chinese given name', () => {
  assert.ok(builder.extractGivenName('陈小明').length > 0);
});
test('Extract Malay surname (bin pattern)', () => {
  assert.strictEqual(builder.extractSurname('Ahmad bin Ali'), 'Ahmad');
});
test('Extract Malay given name (bin pattern)', () => {
  assert.strictEqual(builder.extractGivenName('Ahmad bin Ali'), 'Ahmad');
});
test('Handle single name', () => {
  assert.strictEqual(builder.extractSurname('Madonna'), 'Madonna');
});
test('Handle empty name', () => {
  assert.strictEqual(builder.extractSurname(''), '');
});
test('Handle null name', () => {
  assert.strictEqual(builder.extractSurname(null), '');
});

console.log('\nPart 2: Family Tree Building');
const sampleRecords = [
  { id: 'r1', name: 'John Tan', birthDate: '1930-01-15', deathDate: '2000-03-20', cemeteryId: 'c1', section: 'A', plot: 'A-001', inscription: 'Beloved husband' },
  { id: 'r2', name: 'Mary Tan', birthDate: '1935-05-10', deathDate: '2005-08-15', cemeteryId: 'c1', section: 'A', plot: 'A-002', inscription: 'Beloved wife' },
  { id: 'r3', name: 'James Tan', birthDate: '1960-03-01', deathDate: '2020-06-10', cemeteryId: 'c1', section: 'A', plot: 'A-003', inscription: 'Son of John and Mary' },
  { id: 'r4', name: 'Ahmad bin Ali', birthDate: '1950-01-01', deathDate: '2010-01-01', cemeteryId: 'c2', section: 'B', plot: 'B-010' },
  { id: 'r5', name: 'Unrelated Person', birthDate: '1980-01-01', deathDate: '2022-01-01', cemeteryId: 'c3' },
];

test('Builds tree with nodes', () => {
  const tree = builder.buildFamilyTree(sampleRecords);
  assert.ok(tree.nodes.length === 5);
});
test('Builds tree with edges (relationships)', () => {
  const tree = builder.buildFamilyTree(sampleRecords);
  assert.ok(tree.edges.length > 0, 'Should detect at least 1 relationship');
});
test('Detects spouse relationship', () => {
  const tree = builder.buildFamilyTree(sampleRecords);
  assert.ok(tree.edges.some(e => e.type === 'spouse'), 'Should detect spouse');
});
test('Detects parent-child relationship', () => {
  // James is son of John (inscription says "Son of John and Mary", same surname, dates align)
  const records = [
    { id: 'p1', name: 'John Tan', birthDate: '1930', deathDate: '2000', cemeteryId: 'c1', section: 'A', plot: 'A-001' },
    { id: 'c1', name: 'James Tan', birthDate: '1960', deathDate: '2020', cemeteryId: 'c1', section: 'A', plot: 'A-003', inscription: 'Son of John' },
  ];
  const tree = builder.buildFamilyTree(records);
  assert.ok(tree.edges.some(e => e.type === 'parent_child'), 'Should detect parent-child');
});
test('Detects sibling relationship', () => {
  const records = [
    { id: 's1', name: 'Alice Tan', birthDate: '1960', cemeteryId: 'c1', section: 'A', plot: 'A-010' },
    { id: 's2', name: 'Bob Tan', birthDate: '1965', cemeteryId: 'c1', section: 'A', plot: 'A-011', inscription: 'Brother of Alice' },
  ];
  const tree = builder.buildFamilyTree(records);
  assert.ok(tree.edges.some(e => e.type === 'sibling'), 'Should detect sibling');
});
test('Returns stats', () => {
  const tree = builder.buildFamilyTree(sampleRecords);
  assert.ok(tree.stats.totalRecords === 5);
  assert.ok(tree.stats.totalRelationships > 0);
  assert.ok(typeof tree.stats.byType === 'object');
});
test('Returns family clusters', () => {
  const tree = builder.buildFamilyTree(sampleRecords);
  assert.ok(Array.isArray(tree.families));
});
test('Respects minConfidence option', () => {
  const tree1 = builder.buildFamilyTree(sampleRecords, { minConfidence: 40 });
  const tree2 = builder.buildFamilyTree(sampleRecords, { minConfidence: 90 });
  assert.ok(tree1.edges.length >= tree2.edges.length, 'Lower threshold should find more or equal relationships');
});
test('Respects maxRelationships option', () => {
  const tree = builder.buildFamilyTree(sampleRecords, { maxRelationships: 1 });
  assert.ok(tree.edges.length <= 1);
});
test('Handles single record', () => {
  const tree = builder.buildFamilyTree([{ id: 'r1', name: 'Test' }]);
  assert.strictEqual(tree.edges.length, 0);
});
test('Handles empty records', () => {
  const tree = builder.buildFamilyTree([]);
  assert.strictEqual(tree.nodes.length, 0);
  assert.strictEqual(tree.edges.length, 0);
});
test('Handles null records', () => {
  const tree = builder.buildFamilyTree(null);
  assert.strictEqual(tree.nodes.length, 0);
});

console.log('\nPart 3: Spouse Detection');
test('Spouse: same surname + adjacent plot + inscription', () => {
  const rel = builder.detectSpouse ? null : null;
  // Use the internal function via buildFamilyTree
  const records = [
    { id: 'h', name: 'John Lee', plot: 'A-001', cemeteryId: 'c1', section: 'A', deathDate: '2000', inscription: 'Beloved husband' },
    { id: 'w', name: 'Jane Lee', plot: 'A-002', cemeteryId: 'c1', section: 'A', deathDate: '2005', inscription: 'Beloved wife' },
  ];
  const tree = builder.buildFamilyTree(records);
  assert.ok(tree.edges.some(e => e.type === 'spouse'), 'Should detect spouse');
});
test('Spouse: different surname, same plot', () => {
  const records = [
    { id: 'h', name: 'John Lee', plot: 'A-001', cemeteryId: 'c1', inscription: 'Husband' },
    { id: 'w', name: 'Jane Wong', plot: 'A-001', cemeteryId: 'c1', inscription: 'Wife' },
  ];
  const tree = builder.buildFamilyTree(records);
  assert.ok(tree.edges.some(e => e.type === 'spouse'), 'Same plot + inscription should detect spouse');
});

console.log('\nPart 4: Relationship Confirmation');
test('Creates confirmation request', () => {
  const conf = builder.createConfirmationRequest({
    type: 'spouse',
    personA: 'r1',
    personB: 'r2',
    confidence: 85,
    reasons: ['same surname', 'adjacent plots'],
  });
  assert.ok(conf.relationshipId);
  assert.strictEqual(conf.status, 'pending');
  assert.strictEqual(conf.confidence, 85);
  assert.ok(conf.message.includes('spouse'));
});
test('Confirmation has relationship type', () => {
  const conf = builder.createConfirmationRequest({
    type: 'parent_child', parent: 'r1', child: 'r2', confidence: 70, reasons: ['test'],
  });
  assert.strictEqual(conf.type, 'parent_child');
});

console.log('\nPart 5: Genealogy Info');
test('Returns system info', () => {
  const info = builder.getGenealogyInfo();
  assert.ok(info.system);
  assert.ok(info.version);
});
test('Returns relationship types', () => {
  const info = builder.getGenealogyInfo();
  assert.ok(info.relationshipTypes.includes('spouse'));
  assert.ok(info.relationshipTypes.includes('parent_child'));
  assert.ok(info.relationshipTypes.includes('sibling'));
});
test('Returns detection signals', () => {
  const info = builder.getGenealogyInfo();
  assert.ok(info.detectionSignals.length > 0);
  assert.ok(info.detectionSignals.some(s => s.includes('Surname')));
});
test('Returns tree features', () => {
  const info = builder.getGenealogyInfo();
  assert.ok(info.treeFeatures.length > 0);
});
test('Returns limitations', () => {
  const info = builder.getGenealogyInfo();
  assert.ok(info.limitations.length > 0);
});
test('Returns attribution', () => {
  const info = builder.getGenealogyInfo();
  assert.ok(info.attribution.includes('GraveAtlas'));
});

console.log('\nPart 6: Backend Routes & Handlers');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');
['info', 'build-tree', 'relationships', 'confirm', 'surname-analysis'].forEach(route => {
  test(`Route: /api/genealogy/${route}`, () => {
    assert.ok(indexFile.includes(`/api/genealogy/${route}`), `Missing route ${route}`);
  });
});
['handleGenealogyInfo', 'handleGenealogyBuildTree', 'handleGenealogyRelationships', 'handleGenealogyConfirm', 'handleGenealogySurnameAnalysis'].forEach(h => {
  test(`Handler: ${h}`, () => assert.ok(indexFile.includes(h), `Missing ${h}`));
});
test('Imports family-tree-builder module', () => assert.ok(indexFile.includes('family-tree-builder.js'), 'Missing'));
test('Returns attribution', () => assert.ok(indexFile.includes('GraveAtlas — AI Genealogy System'), 'Missing'));
test('Build-tree validates min records', () => assert.ok(indexFile.includes('At least 2 records'), 'Missing'));
test('Relationships validates target', () => assert.ok(indexFile.includes('target record is required'), 'Missing'));

console.log('\nPart 7: Android Model');
const modelFile = fs.readFileSync(path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/FamilyTreeResult.java'), 'utf8');
test('Class exists', () => assert.ok(modelFile.includes('public class FamilyTreeResult')));
test('Has TreeNode inner class', () => assert.ok(modelFile.includes('class TreeNode')));
test('Has TreeEdge inner class', () => assert.ok(modelFile.includes('class TreeEdge')));
test('Has TreeStats inner class', () => assert.ok(modelFile.includes('class TreeStats')));
test('Has fromJson', () => assert.ok(modelFile.includes('fromJson')));
test('Has hasRelationships', () => assert.ok(modelFile.includes('hasRelationships')));
test('Has hasFamilies', () => assert.ok(modelFile.includes('hasFamilies')));
test('TreeNode has id/name/surname', () => assert.ok(modelFile.includes('id') && modelFile.includes('surname')));
test('TreeEdge has type/confidence/reasons', () => assert.ok(modelFile.includes('type') && modelFile.includes('confidence') && modelFile.includes('reasons')));
test('TreeStats has totalRecords/familyCount', () => assert.ok(modelFile.includes('totalRecords') && modelFile.includes('familyCount')));

console.log('\nPart 8: API Client');
const apiFile = fs.readFileSync(path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'), 'utf8');
test('Imports FamilyTreeResult', () => assert.ok(apiFile.includes('FamilyTreeResult')));
test('Has getGenealogyInfo', () => assert.ok(apiFile.includes('getGenealogyInfo') && apiFile.includes('/api/genealogy/info')));
test('Has buildFamilyTree', () => assert.ok(apiFile.includes('buildFamilyTree') && apiFile.includes('/api/genealogy/build-tree')));
test('Has detectRelationships', () => assert.ok(apiFile.includes('detectRelationships') && apiFile.includes('/api/genealogy/relationships')));
test('Has confirmRelationship', () => assert.ok(apiFile.includes('confirmRelationship') && apiFile.includes('/api/genealogy/confirm')));
test('Has analyzeSurnames', () => assert.ok(apiFile.includes('analyzeSurnames') && apiFile.includes('/api/genealogy/surname-analysis')));

console.log('\nPart 9: AI System Prompts');
const promptsFile = fs.readFileSync(path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'), 'utf8');
test('Prompts mention genealogy', () => assert.ok(promptsFile.includes('genealogy')));
test('Prompts mention family tree', () => assert.ok(promptsFile.includes('family tree') || promptsFile.includes('family-tree')));
test('Prompts mention surname analysis', () => assert.ok(promptsFile.includes('surname')));
test('Suggested prompt: Build family tree', () => assert.ok(promptsFile.includes('Build a family tree')));
test('Suggested prompt: Find family clusters', () => assert.ok(promptsFile.includes('family clusters')));

console.log('\n=== Phase 23 Genealogy Tests ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 23 tests passed!');
else console.log('\n❌ Some tests failed!');
