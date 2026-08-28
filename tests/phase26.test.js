/**
 * Phase 26 Tests — AI Cemetery Analytics & Insights Dashboard
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ca = require('../backend/src/analytics/cemetery-analytics.js');
const projectRoot = path.join(__dirname, '..');
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}

const records = [
  { id: 'g1', name: 'Tan Ah Kow', birthDate: '1930-01-15', deathDate: '2005-06-20', cemeteryId: 'cck' },
  { id: 'g2', name: 'Tan Ah Bee', birthDate: '1935-05-10', deathDate: '2010-08-15', cemeteryId: 'cck' },
  { id: 'g3', name: 'Lee Boon Hee', birthDate: '1940-03-01', deathDate: '2015-06-10', cemeteryId: 'cck' },
  { id: 'g4', name: 'Lim Chee Seng', birthDate: '1950-01-01', deathDate: '2020-01-01', cemeteryId: 'cck' },
  { id: 'g5', name: 'Ahmad bin Ali', birthDate: '1945-01-01', deathDate: '2018-01-01', cemeteryId: 'cck' },
  { id: 'g6', name: 'Fatimah binte Ahmad', birthDate: '1955-01-01', deathDate: '2022-01-01', cemeteryId: 'cck' },
  { id: 'g7', name: 'Wong Tan', birthDate: '1960-01-01', deathDate: '2023-01-01', cemeteryId: 'cck' },
  { id: 'g8', name: 'Unknown Person', cemeteryId: 'cck' },
];

console.log('\nPart 1: Burial Trends');
test('Analyzes burial trends', () => {
  const t = ca.analyzeBurialTrends(records);
  assert.strictEqual(t.totalRecords, 8);
  assert.ok(t.totalWithDates === 7);
});
test('Returns decade breakdown', () => {
  const t = ca.analyzeBurialTrends(records);
  assert.ok(t.byDecade.length > 0);
  assert.ok(t.byDecade[0].decade === 2000);
});
test('Returns year breakdown', () => {
  const t = ca.analyzeBurialTrends(records);
  assert.ok(t.byYear.length > 0);
});
test('Returns peak year', () => {
  const t = ca.analyzeBurialTrends(records);
  assert.ok(t.peakYear !== null);
  assert.ok(t.peakYear.count > 0);
});
test('Returns trend direction', () => {
  const t = ca.analyzeBurialTrends(records);
  assert.ok(['increasing', 'decreasing', 'stable', 'unknown'].includes(t.trend));
});
test('Calculates date coverage', () => {
  const t = ca.analyzeBurialTrends(records);
  assert.ok(t.dateCoverage > 0);
  assert.ok(t.dateCoverage <= 100);
});
test('Empty records', () => {
  const t = ca.analyzeBurialTrends([]);
  assert.strictEqual(t.totalRecords, 0);
  assert.strictEqual(t.trend, 'unknown');
});
test('Null records', () => {
  const t = ca.analyzeBurialTrends(null);
  assert.strictEqual(t.totalRecords, 0);
});

console.log('\nPart 2: Demographics');
test('Analyzes demographics', () => {
  const d = ca.analyzeDemographics(records);
  assert.strictEqual(d.totalRecords, 8);
});
test('Returns age distribution', () => {
  const d = ca.analyzeDemographics(records);
  assert.ok(d.ageDistribution.length === 5);
  assert.ok(d.ageDistribution[4].label === '80+');
});
test('Returns average lifespan', () => {
  const d = ca.analyzeDemographics(records);
  assert.ok(d.avgLifespan > 0);
});
test('Returns max lifespan', () => {
  const d = ca.analyzeDemographics(records);
  assert.ok(d.maxLifespan > 0);
  assert.ok(d.maxLifespan >= d.avgLifespan);
});
test('Returns min lifespan', () => {
  const d = ca.analyzeDemographics(records);
  assert.ok(d.minLifespan > 0);
  assert.ok(d.minLifespan <= d.avgLifespan);
});
test('Returns gender breakdown', () => {
  const d = ca.analyzeDemographics(records);
  assert.ok(d.genderBreakdown.male >= 0);
  assert.ok(d.genderBreakdown.female >= 0);
  assert.ok(d.genderBreakdown.unknown >= 0);
});
test('Returns birth decades', () => {
  const d = ca.analyzeDemographics(records);
  assert.ok(d.birthDecades.length > 0);
});
test('Returns age coverage', () => {
  const d = ca.analyzeDemographics(records);
  assert.ok(d.ageCoverage > 0);
  assert.ok(d.ageCoverage <= 100);
});
test('Empty records', () => {
  const d = ca.analyzeDemographics([]);
  assert.strictEqual(d.totalRecords, 0);
  assert.strictEqual(d.avgLifespan, 0);
});

console.log('\nPart 3: Surname Distribution');
test('Analyzes surnames', () => {
  const s = ca.analyzeSurnameDistribution(records);
  assert.strictEqual(s.totalRecords, 8);
});
test('Returns top surnames', () => {
  const s = ca.analyzeSurnameDistribution(records);
  assert.ok(s.topSurnames.length > 0);
  assert.ok(s.topSurnames[0].count > 0);
  assert.ok(s.topSurnames[0].percentage > 0);
});
test('Returns total surnames', () => {
  const s = ca.analyzeSurnameDistribution(records);
  assert.ok(s.totalSurnames > 0);
});
test('Returns diversity index', () => {
  const s = ca.analyzeSurnameDistribution(records);
  assert.ok(s.diversityIndex >= 0 && s.diversityIndex <= 1);
});
test('Returns surname coverage', () => {
  const s = ca.analyzeSurnameDistribution(records);
  assert.ok(s.surnameCoverage > 0);
});
test('Empty records', () => {
  const s = ca.analyzeSurnameDistribution([]);
  assert.strictEqual(s.totalRecords, 0);
  assert.strictEqual(s.totalSurnames, 0);
});

console.log('\nPart 4: Family Analysis');
const familyTree = {
  edges: [
    { type: 'spouse', personA: 'g1', personB: 'g2', confidence: 85, reasons: ['test'] },
    { type: 'parent_child', parent: 'g1', child: 'g3', confidence: 70, reasons: ['test'] },
    { type: 'sibling', personA: 'g6', personB: 'g7', confidence: 60, reasons: ['test'] },
  ],
  families: [['g1', 'g2', 'g3'], ['g6', 'g7']],
};
test('Analyzes families', () => {
  const f = ca.analyzeFamilies(records, familyTree);
  assert.strictEqual(f.totalFamilies, 2);
  assert.ok(f.avgFamilySize > 0);
});
test('Returns largest family', () => {
  const f = ca.analyzeFamilies(records, familyTree);
  assert.strictEqual(f.largestFamily, 3);
});
test('Returns smallest family', () => {
  const f = ca.analyzeFamilies(records, familyTree);
  assert.strictEqual(f.smallestFamily, 2);
});
test('Returns relationship types', () => {
  const f = ca.analyzeFamilies(records, familyTree);
  assert.strictEqual(f.relationshipTypes.spouse, 1);
  assert.strictEqual(f.relationshipTypes.parent_child, 1);
  assert.strictEqual(f.relationshipTypes.sibling, 1);
});
test('Returns total relationships', () => {
  const f = ca.analyzeFamilies(records, familyTree);
  assert.strictEqual(f.totalRelationships, 3);
});
test('Returns family coverage', () => {
  const f = ca.analyzeFamilies(records, familyTree);
  assert.ok(f.familyCoverage > 0);
});
test('Null family tree', () => {
  const f = ca.analyzeFamilies(records, null);
  assert.strictEqual(f.totalFamilies, 0);
});

console.log('\nPart 5: Cemetery Insights');
test('Generates insights', () => {
  const i = ca.generateInsights(records);
  assert.ok(i.totalRecords > 0);
  assert.ok(i.insights.length > 0);
  assert.ok(i.totalInsights > 0);
});
test('Insights have categories', () => {
  const i = ca.generateInsights(records);
  assert.ok(i.insights[0].category);
  assert.ok(i.insights[0].title);
  assert.ok(i.insights[0].value);
  assert.ok(i.insights[0].detail);
});
test('Includes data quality insight', () => {
  const i = ca.generateInsights(records);
  assert.ok(i.insights.some(ins => ins.category === 'Data Quality'));
});
test('Includes burial trend insight', () => {
  const i = ca.generateInsights(records);
  assert.ok(i.insights.some(ins => ins.category === 'Burial Trends'));
});
test('Includes demographics insight', () => {
  const i = ca.generateInsights(records);
  assert.ok(i.insights.some(ins => ins.category === 'Demographics'));
});
test('Includes surname insight', () => {
  const i = ca.generateInsights(records);
  assert.ok(i.insights.some(ins => ins.category === 'Surnames'));
});
test('Includes timeline insight', () => {
  const i = ca.generateInsights(records);
  assert.ok(i.insights.some(ins => ins.category === 'Timeline'));
});
test('Returns attribution', () => {
  const i = ca.generateInsights(records);
  assert.ok(i.attribution.includes('GraveAtlas'));
});
test('Returns summary', () => {
  const i = ca.generateInsights(records);
  assert.ok(i.summary);
  assert.ok(i.summary.burialTrends);
  assert.ok(i.summary.demographics);
  assert.ok(i.summary.surnames);
});
test('Empty records', () => {
  const i = ca.generateInsights([]);
  assert.strictEqual(i.totalRecords, 0);
  assert.strictEqual(i.insights.length, 0);
});

console.log('\nPart 6: Analytics Info');
test('Returns system info', () => {
  const info = ca.getAnalyticsInfo();
  assert.ok(info.system);
  assert.ok(info.version);
});
test('Returns analytics modules', () => {
  const info = ca.getAnalyticsInfo();
  assert.ok(info.analyticsModules.length >= 5);
});
test('Returns metrics', () => {
  const info = ca.getAnalyticsInfo();
  assert.ok(info.metrics.length > 0);
});
test('Returns integrations', () => {
  const info = ca.getAnalyticsInfo();
  assert.ok(info.integrations.includes('Phase 23: Family Tree Builder'));
});
test('Returns attribution', () => {
  const info = ca.getAnalyticsInfo();
  assert.ok(info.attribution.includes('GraveAtlas'));
});

console.log('\nPart 7: Backend Routes & Handlers');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');
['info', 'trends', 'demographics', 'surnames', 'families', 'insights'].forEach(route => {
  test(`Route: /api/analytics/${route}`, () => assert.ok(indexFile.includes(`/api/analytics/${route}`), `Missing ${route}`));
});
['handleAnalyticsInfo', 'handleAnalyticsTrends', 'handleAnalyticsDemographics', 'handleAnalyticsSurnames', 'handleAnalyticsFamilies', 'handleAnalyticsInsights'].forEach(h => {
  test(`Handler: ${h}`, () => assert.ok(indexFile.includes(h), `Missing ${h}`));
});
test('Imports cemetery-analytics module', () => assert.ok(indexFile.includes('cemetery-analytics.js')));
test('Returns attribution', () => assert.ok(indexFile.includes('GraveAtlas — AI Cemetery Analytics')));
test('Validates records', () => assert.ok(indexFile.includes('records array is required'), 'Missing'));

console.log('\nPart 8: Android Model');
const modelFile = fs.readFileSync(path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CemeteryAnalyticsResult.java'), 'utf8');
test('Class exists', () => assert.ok(modelFile.includes('public class CemeteryAnalyticsResult')));
test('Has Insight inner class', () => assert.ok(modelFile.includes('class Insight')));
test('Has fromJson', () => assert.ok(modelFile.includes('fromJson')));
test('Insight has category/title/value', () => assert.ok(modelFile.includes('category') && modelFile.includes('title') && modelFile.includes('value')));

console.log('\nPart 9: API Client');
const apiFile = fs.readFileSync(path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'), 'utf8');
test('Imports CemeteryAnalyticsResult', () => assert.ok(apiFile.includes('CemeteryAnalyticsResult')));
test('Has getAnalyticsInfo', () => assert.ok(apiFile.includes('getAnalyticsInfo') && apiFile.includes('/api/analytics/info')));
test('Has analyzeBurialTrends', () => assert.ok(apiFile.includes('analyzeBurialTrends') && apiFile.includes('/api/analytics/trends')));
test('Has analyzeDemographics', () => assert.ok(apiFile.includes('analyzeDemographics') && apiFile.includes('/api/analytics/demographics')));
test('Has analyzeSurnames', () => assert.ok(apiFile.includes('analyzeSurnames') && apiFile.includes('/api/analytics/surnames')));
test('Has analyzeFamilies', () => assert.ok(apiFile.includes('analyzeFamilies') && apiFile.includes('/api/analytics/families')));
test('Has generateInsights', () => assert.ok(apiFile.includes('generateInsights') && apiFile.includes('/api/analytics/insights')));

console.log('\n=== Phase 26 Cemetery Analytics Tests ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 26 tests passed!');
else console.log('\n❌ Some tests failed!');
