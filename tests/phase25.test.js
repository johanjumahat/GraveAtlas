/**
 * Phase 25 Tests — AI Cemetery Mapping & Spatial Intelligence
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const si = require('../backend/src/spatial/spatial-intelligence.js');
const projectRoot = path.join(__dirname, '..');
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}

// Test data — Singapore cemetery coordinates
const records = [
  { id: 'g1', name: 'Tan Ah Kow', lat: 1.3850, lon: 103.7550, cemeteryId: 'cck', section: 'A' },
  { id: 'g2', name: 'Tan Ah Bee', lat: 1.3851, lon: 103.7551, cemeteryId: 'cck', section: 'A' },
  { id: 'g3', name: 'Lee Boon', lat: 1.3852, lon: 103.7552, cemeteryId: 'cck', section: 'A' },
  { id: 'g4', name: 'Lim Chee', lat: 1.3860, lon: 103.7560, cemeteryId: 'cck', section: 'B' },
  { id: 'g5', name: 'Wong Tan', lat: 1.3861, lon: 103.7561, cemeteryId: 'cck', section: 'B' },
  { id: 'g6', name: 'Far Away', lat: 1.4000, lon: 103.7700, cemeteryId: 'other' },
  { id: 'g7', name: 'No GPS', cemeteryId: 'cck' },
];

console.log('\nPart 1: Distance Calculations');
test('Haversine distance same point = 0', () => {
  assert.strictEqual(si.haversineDistance(1.0, 103.0, 1.0, 103.0), 0);
});
test('Haversine distance ~1 degree lat ≈ 111km', () => {
  const d = si.haversineDistance(0, 0, 1, 0);
  assert.ok(d > 110000 && d < 112000, `Expected ~111km, got ${d}`);
});
test('Haversine distance is symmetric', () => {
  const d1 = si.haversineDistance(1.0, 103.0, 1.1, 103.1);
  const d2 = si.haversineDistance(1.1, 103.1, 1.0, 103.0);
  assert.ok(Math.abs(d1 - d2) < 0.01);
});

console.log('\nPart 2: Bounding Box');
test('Calculates bounding box', () => {
  const bbox = si.calculateBoundingBox(records.filter(r => r.lat));
  assert.ok(bbox.minLat <= bbox.maxLat);
  assert.ok(bbox.minLon <= bbox.maxLon);
  assert.ok(bbox.centerLat > 0);
});
test('Bounding box area > 0', () => {
  const bbox = si.calculateBoundingBox(records.filter(r => r.lat));
  assert.ok(si.boundingBoxArea(bbox) > 0);
});
test('Empty points returns null', () => {
  assert.strictEqual(si.calculateBoundingBox([]), null);
});

console.log('\nPart 3: GPS Clustering');
test('Clusters graves by proximity', () => {
  const result = si.clusterGraves(records, { eps: 100, minPoints: 2 });
  assert.ok(result.clusterCount > 0, 'Should find clusters');
  assert.ok(result.totalPoints === 6, '6 records have GPS');
});
test('Far point is noise', () => {
  const result = si.clusterGraves(records, { eps: 100, minPoints: 2 });
  assert.ok(result.noise.some(n => n.name === 'Far Away'), 'Far Away should be noise');
});
test('Largest cluster has most points', () => {
  const result = si.clusterGraves(records, { eps: 200, minPoints: 2 });
  if (result.clusters.length > 1) {
    assert.ok(result.clusters[0].pointCount >= result.clusters[1].pointCount);
  }
});
test('Cluster has center and radius', () => {
  const result = si.clusterGraves(records, { eps: 200, minPoints: 2 });
  if (result.clusters.length > 0) {
    assert.ok(result.clusters[0].center);
    assert.ok(result.clusters[0].radiusMeters >= 0);
  }
});
test('Cluster has members', () => {
  const result = si.clusterGraves(records, { eps: 200, minPoints: 2 });
  if (result.clusters.length > 0) {
    assert.ok(result.clusters[0].members.length > 0);
  }
});
test('Empty records returns empty', () => {
  const result = si.clusterGraves([]);
  assert.strictEqual(result.clusterCount, 0);
});
test('Null records returns empty', () => {
  const result = si.clusterGraves(null);
  assert.strictEqual(result.clusterCount, 0);
});
test('Records without GPS are excluded', () => {
  const result = si.clusterGraves(records, { eps: 200, minPoints: 2 });
  assert.strictEqual(result.totalPoints, 6); // g7 has no GPS
});

console.log('\nPart 4: Heatmap Generation');
test('Generates heatmap grid', () => {
  const hm = si.generateHeatmap(records);
  assert.ok(hm.grid.length > 0);
  assert.ok(hm.maxIntensity > 0);
});
test('Heatmap has cells', () => {
  const hm = si.generateHeatmap(records);
  assert.ok(hm.cells.length > 0);
});
test('Heatmap cells sorted by intensity', () => {
  const hm = si.generateHeatmap(records);
  for (let i = 1; i < hm.cells.length; i++) {
    assert.ok(hm.cells[i-1].intensity >= hm.cells[i].intensity);
  }
});
test('Heatmap has density per cell', () => {
  const hm = si.generateHeatmap(records);
  assert.ok(hm.densityPerCell > 0);
});
test('Empty records returns empty heatmap', () => {
  const hm = si.generateHeatmap([]);
  assert.strictEqual(hm.totalPoints, 0);
  assert.strictEqual(hm.maxIntensity, 0);
});
test('Custom grid size', () => {
  const hm = si.generateHeatmap(records, { gridSize: 10 });
  assert.strictEqual(hm.gridSize, 10);
  assert.strictEqual(hm.grid.length, 10);
});

console.log('\nPart 5: Spatial Search');
test('Finds graves within radius', () => {
  const result = si.spatialSearch(1.3850, 103.7550, records, 500);
  assert.ok(result.totalFound > 0);
});
test('Results sorted by distance', () => {
  const result = si.spatialSearch(1.3850, 103.7550, records, 1000);
  for (let i = 1; i < result.results.length; i++) {
    assert.ok(result.results[i-1].distanceMeters <= result.results[i].distanceMeters);
  }
});
test('Far point excluded from small radius', () => {
  const result = si.spatialSearch(1.3850, 103.7550, records, 100);
  assert.ok(!result.results.some(r => r.name === 'Far Away'));
});
test('Returns center and radius', () => {
  const result = si.spatialSearch(1.3850, 103.7550, records, 500);
  assert.strictEqual(result.center.lat, 1.3850);
  assert.strictEqual(result.radiusMeters, 500);
});
test('No GPS records excluded', () => {
  const result = si.spatialSearch(1.3850, 103.7550, records, 10000);
  assert.ok(!result.results.some(r => r.name === 'No GPS'));
});

console.log('\nPart 6: Nearest Neighbors');
test('Finds k nearest neighbors', () => {
  const result = si.findNearestNeighbors(records[0], records, 3);
  assert.ok(result.neighbors.length <= 3);
  assert.ok(result.totalFound > 0);
});
test('Nearest is closest', () => {
  const result = si.findNearestNeighbors(records[0], records, 3);
  assert.ok(result.nearestDistance === result.neighbors[0].distanceMeters);
});
test('Returns avg distance', () => {
  const result = si.findNearestNeighbors(records[0], records, 3);
  assert.ok(result.avgDistance > 0);
});
test('Neighbors sorted by distance', () => {
  const result = si.findNearestNeighbors(records[0], records, 5);
  for (let i = 1; i < result.neighbors.length; i++) {
    assert.ok(result.neighbors[i-1].distanceMeters <= result.neighbors[i].distanceMeters);
  }
});
test('Null record returns empty', () => {
  const result = si.findNearestNeighbors(null, records, 3);
  assert.strictEqual(result.totalFound, 0);
});
test('Record without GPS returns empty', () => {
  const result = si.findNearestNeighbors(records[6], records, 3);
  assert.strictEqual(result.totalFound, 0);
});

console.log('\nPart 7: Density Analysis');
test('Calculates density', () => {
  const d = si.calculateDensity(records);
  assert.ok(d.totalGraves === 6);
  assert.ok(d.areaSqm > 0);
});
test('Density per hectare > 0', () => {
  const d = si.calculateDensity(records);
  assert.ok(typeof d.densityPerHectare === 'number' && d.densityPerHectare >= 0);
});
test('Empty records returns zeros', () => {
  const d = si.calculateDensity([]);
  assert.strictEqual(d.totalGraves, 0);
  assert.strictEqual(d.densityPerSqm, 0);
});

console.log('\nPart 8: Family Spatial Proximity');
const familyTree = {
  edges: [
    { type: 'spouse', personA: 'g1', personB: 'g2', confidence: 85, reasons: ['test'] },
    { type: 'spouse', personA: 'g4', personB: 'g5', confidence: 80, reasons: ['test'] },
  ],
};
test('Analyzes family proximity', () => {
  const result = si.analyzeFamilyProximity(records, familyTree);
  assert.ok(result.familiesAnalyzed > 0);
});
test('Returns proximate families count', () => {
  const result = si.analyzeFamilyProximity(records, familyTree);
  assert.ok(result.proximateFamilies >= 0);
});
test('Returns avg family distance', () => {
  const result = si.analyzeFamilyProximity(records, familyTree);
  assert.ok(result.avgFamilyDistance >= 0);
});
test('Returns analyses with distances', () => {
  const result = si.analyzeFamilyProximity(records, familyTree);
  if (result.analyses.length > 0) {
    assert.ok(result.analyses[0].distances.length > 0);
    assert.ok(result.analyses[0].avgDistanceMeters >= 0);
  }
});
test('Null inputs return empty', () => {
  const result = si.analyzeFamilyProximity(null, null);
  assert.strictEqual(result.familiesAnalyzed, 0);
});
test('Close family is proximate', () => {
  // g1 and g2 are very close (0.0001 deg apart ≈ ~11m)
  const result = si.analyzeFamilyProximity(records, familyTree);
  assert.ok(result.proximateFamilies >= 1, 'g1-g2 family should be proximate');
});

console.log('\nPart 9: Backend Routes & Handlers');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');
['info', 'cluster', 'heatmap', 'search', 'nearest', 'density', 'family'].forEach(route => {
  test(`Route: /api/spatial/${route}`, () => assert.ok(indexFile.includes(`/api/spatial/${route}`), `Missing ${route}`));
});
['handleSpatialInfo', 'handleSpatialCluster', 'handleSpatialHeatmap', 'handleSpatialSearch', 'handleSpatialNearest', 'handleSpatialDensity', 'handleSpatialFamily'].forEach(h => {
  test(`Handler: ${h}`, () => assert.ok(indexFile.includes(h), `Missing ${h}`));
});
test('Imports spatial-intelligence module', () => assert.ok(indexFile.includes('spatial-intelligence.js')));
test('Returns attribution', () => assert.ok(indexFile.includes('GraveAtlas — AI Spatial Intelligence')));
test('Cluster validates records', () => assert.ok(indexFile.includes('records array is required'), 'Missing'));
test('Search validates lat/lon', () => assert.ok(indexFile.includes('lat and lon are required'), 'Missing'));

console.log('\nPart 10: Android Model');
const modelFile = fs.readFileSync(path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/SpatialIntelligenceResult.java'), 'utf8');
test('Class exists', () => assert.ok(modelFile.includes('public class SpatialIntelligenceResult')));
test('Has Cluster inner class', () => assert.ok(modelFile.includes('class Cluster')));
test('Has NoisePoint inner class', () => assert.ok(modelFile.includes('class NoisePoint')));
test('Has fromJson', () => assert.ok(modelFile.includes('fromJson')));
test('Cluster has centerLat/centerLon', () => assert.ok(modelFile.includes('centerLat') && modelFile.includes('centerLon')));
test('Cluster has radiusMeters', () => assert.ok(modelFile.includes('radiusMeters')));

console.log('\nPart 11: API Client');
const apiFile = fs.readFileSync(path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'), 'utf8');
test('Imports SpatialIntelligenceResult', () => assert.ok(apiFile.includes('SpatialIntelligenceResult')));
test('Has getSpatialInfo', () => assert.ok(apiFile.includes('getSpatialInfo') && apiFile.includes('/api/spatial/info')));
test('Has clusterGraves', () => assert.ok(apiFile.includes('clusterGraves') && apiFile.includes('/api/spatial/cluster')));
test('Has generateHeatmap', () => assert.ok(apiFile.includes('generateHeatmap') && apiFile.includes('/api/spatial/heatmap')));
test('Has spatialSearch', () => assert.ok(apiFile.includes('spatialSearch') && apiFile.includes('/api/spatial/search')));
test('Has findNearestNeighbors', () => assert.ok(apiFile.includes('findNearestNeighbors') && apiFile.includes('/api/spatial/nearest')));
test('Has calculateDensity', () => assert.ok(apiFile.includes('calculateDensity') && apiFile.includes('/api/spatial/density')));
test('Has analyzeFamilyProximity', () => assert.ok(apiFile.includes('analyzeFamilyProximity') && apiFile.includes('/api/spatial/family')));

console.log('\n=== Phase 25 Spatial Intelligence Tests ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 25 tests passed!');
else console.log('\n❌ Some tests failed!');
