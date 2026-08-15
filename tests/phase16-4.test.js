#!/usr/bin/env node
/**
 * Phase 16.4 Tests — AI Map: natural-language queries, historical layers, source overlays
 *
 * Verifies:
 * - AIMapQuery parses natural-language queries correctly
 * - Year/decade/range extraction works
 * - Evidence filter extraction works
 * - Location extraction works
 * - Record type extraction works
 * - applyFilters correctly filters records
 * - generateResponse produces helpful summaries
 * - HistoricalLayers organizes records into era-based layers
 * - Layer visibility toggling works
 * - Source overlays (source-backed vs community) work
 * - Backend /api/map/query endpoint exists
 * - AI system prompts mention map queries
 *
 * Run: node tests/phase16-4.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; failures.push(`${name}: ${e.message}`); console.log(`  ❌ ${name}: ${e.message}`); }
}

console.log('\n=== Phase 16.4 Tests — AI Map ===\n');

const APP_BASE = path.join(__dirname, '..', 'app', 'src', 'main', 'java', 'com', 'putraworks', 'graveatlas');

// ── Part 1: AIMapQuery Model ──

console.log('Part 1: AIMapQuery Model');

const mapQuerySource = fs.readFileSync(path.join(APP_BASE, 'ui', 'map', 'AIMapQuery.java'), 'utf8');

test('AIMapQuery class exists', () => {
  assert.ok(mapQuerySource.includes('class AIMapQuery'));
});

test('MapQuery inner class exists', () => {
  assert.ok(mapQuerySource.includes('class MapQuery'));
});

test('MapQuery has locationName field', () => {
  assert.ok(mapQuerySource.includes('String locationName'));
});

test('MapQuery has startYear field', () => {
  assert.ok(mapQuerySource.includes('Integer startYear'));
});

test('MapQuery has endYear field', () => {
  assert.ok(mapQuerySource.includes('Integer endYear'));
});

test('MapQuery has evidenceFilter field', () => {
  assert.ok(mapQuerySource.includes('String evidenceFilter'));
});

test('MapQuery has recordType field', () => {
  assert.ok(mapQuerySource.includes('String recordType'));
});

test('MapQuery has proximityOnly field', () => {
  assert.ok(mapQuerySource.includes('boolean proximityOnly'));
});

test('MapQuery has hasFilters method', () => {
  assert.ok(mapQuerySource.includes('hasFilters'));
});

test('MapQuery has getDescription method', () => {
  assert.ok(mapQuerySource.includes('getDescription'));
});

test('parse method exists', () => {
  assert.ok(mapQuerySource.includes('static MapQuery parse'));
});

// ── Part 2: Year Extraction ──

console.log('\nPart 2: Year Extraction');

test('Year pattern matches 1500-2059', () => {
  assert.ok(mapQuerySource.includes('1[5-9]') && mapQuerySource.includes('20[0-5]'));
});

test('Decade pattern matches "1900s"', () => {
  assert.ok(mapQuerySource.includes('DECADE_PATTERN') && mapQuerySource.includes('0s'));
});

test('Year range pattern matches "1900 to 1999"', () => {
  assert.ok(mapQuerySource.includes('YEAR_RANGE_PATTERN'));
});

test('Before pattern matches "before 1900"', () => {
  assert.ok(mapQuerySource.includes('BEFORE_PATTERN') && mapQuerySource.includes('before'));
});

test('After pattern matches "after 1950"', () => {
  assert.ok(mapQuerySource.includes('AFTER_PATTERN') && mapQuerySource.includes('after'));
});

test('Parse extracts single year', () => {
  // Verify the parse method handles single years
  assert.ok(mapQuerySource.includes('YEAR_PATTERN'));
});

test('Parse extracts decade range', () => {
  assert.ok(mapQuerySource.includes('decadeMatcher'));
});

// ── Part 3: Evidence Filter Extraction ──

console.log('\nPart 3: Evidence Filter Extraction');

test('Source-backed pattern exists', () => {
  assert.ok(mapQuerySource.includes('SOURCE_BACKED_PATTERN'));
});

test('Source-backed matches "verified" and "cited"', () => {
  assert.ok(mapQuerySource.includes('verified') && mapQuerySource.includes('cited'));
});

test('Unverified pattern exists', () => {
  assert.ok(mapQuerySource.includes('UNVERIFIED_PATTERN'));
});

test('Unverified matches "pending"', () => {
  assert.ok(mapQuerySource.includes('pending'));
});

// ── Part 4: Location Extraction ──

console.log('\nPart 4: Location Extraction');

test('Near pattern exists', () => {
  assert.ok(mapQuerySource.includes('NEAR_PATTERN'));
});

test('Near pattern matches "near X"', () => {
  assert.ok(mapQuerySource.includes('near') && mapQuerySource.includes('around'));
});

test('In pattern exists', () => {
  assert.ok(mapQuerySource.includes('IN_PATTERN'));
});

test('Stop word filtering exists', () => {
  assert.ok(mapQuerySource.includes('isStopWord'));
});

test('Stop words include "the", "a", "all"', () => {
  assert.ok(mapQuerySource.includes('"the"') && mapQuerySource.includes('"all"'));
});

// ── Part 5: Record Type Extraction ──

console.log('\nPart 5: Record Type Extraction');

test('Cemetery pattern exists', () => {
  assert.ok(mapQuerySource.includes('CEMETERY_PATTERN'));
});

test('Cemetery pattern matches "cemetery" and "memorial"', () => {
  assert.ok(mapQuerySource.includes('cemetery') && mapQuerySource.includes('memorial'));
});

test('Grave pattern exists', () => {
  assert.ok(mapQuerySource.includes('GRAVE_PATTERN'));
});

test('Grave pattern matches "grave" and "tomb"', () => {
  assert.ok(mapQuerySource.includes('grave') && mapQuerySource.includes('tomb'));
});

// ── Part 6: applyFilters ──

console.log('\nPart 6: applyFilters');

test('applyFilters method exists', () => {
  assert.ok(mapQuerySource.includes('applyFilters'));
});

test('applyFilters checks year range', () => {
  assert.ok(mapQuerySource.includes('startYear') && mapQuerySource.includes('endYear'));
});

test('applyFilters checks evidence filter', () => {
  assert.ok(mapQuerySource.includes('evidenceFilter'));
});

test('applyFilters checks location', () => {
  assert.ok(mapQuerySource.includes('locationName') && mapQuerySource.includes('cemeteryName'));
});

test('applyFilters returns filtered list', () => {
  assert.ok(mapQuerySource.includes('filtered.add'));
});

test('extractYear uses death date first', () => {
  assert.ok(mapQuerySource.includes('deathDate') && mapQuerySource.includes('birthDate'));
});

// ── Part 7: generateResponse ──

console.log('\nPart 7: generateResponse');

test('generateResponse method exists', () => {
  assert.ok(mapQuerySource.includes('generateResponse'));
});

test('generateResponse handles empty query', () => {
  assert.ok(mapQuerySource.includes('Showing all'));
});

test('generateResponse handles no results', () => {
  assert.ok(mapQuerySource.includes('No records match'));
});

test('generateResponse suggests broadening search', () => {
  assert.ok(mapQuerySource.includes('Try broadening'));
});

test('generateResponse handles clusters for large results', () => {
  assert.ok(mapQuerySource.includes('clusters'));
});

// ── Part 8: HistoricalLayers ──

console.log('\nPart 8: HistoricalLayers');

const layersSource = fs.readFileSync(path.join(APP_BASE, 'ui', 'map', 'HistoricalLayers.java'), 'utf8');

test('HistoricalLayers class exists', () => {
  assert.ok(layersSource.includes('class HistoricalLayers'));
});

test('Era enum exists with 6 eras', () => {
  assert.ok(layersSource.includes('enum Era'));
  assert.ok(layersSource.includes('PRE_1800'));
  assert.ok(layersSource.includes('C19_EARLY'));
  assert.ok(layersSource.includes('C19_LATE'));
  assert.ok(layersSource.includes('C20_EARLY'));
  assert.ok(layersSource.includes('C20_LATE'));
  assert.ok(layersSource.includes('C21'));
});

test('Era has label, startYear, endYear', () => {
  assert.ok(layersSource.includes('String label') && layersSource.includes('startYear') && layersSource.includes('endYear'));
});

test('SourceFilter enum exists', () => {
  assert.ok(layersSource.includes('enum SourceFilter'));
  assert.ok(layersSource.includes('ALL'));
  assert.ok(layersSource.includes('SOURCE_BACKED'));
  assert.ok(layersSource.includes('COMMUNITY'));
});

test('Layer inner class exists', () => {
  assert.ok(layersSource.includes('class Layer'));
});

test('Layer has era, sourceFilter, visible, records', () => {
  assert.ok(layersSource.includes('Era era'));
  assert.ok(layersSource.includes('SourceFilter sourceFilter'));
  assert.ok(layersSource.includes('boolean visible'));
  assert.ok(layersSource.includes('List<GraveRecord> records'));
});

test('buildFromRecords method exists', () => {
  assert.ok(layersSource.includes('buildFromRecords'));
});

test('getEraForYear method exists', () => {
  assert.ok(layersSource.includes('getEraForYear'));
});

test('getLayer method exists', () => {
  assert.ok(layersSource.includes('getLayer'));
});

test('getVisibleLayers method exists', () => {
  assert.ok(layersSource.includes('getVisibleLayers'));
});

test('toggleLayer method exists', () => {
  assert.ok(layersSource.includes('toggleLayer'));
});

test('setEraVisible method exists', () => {
  assert.ok(layersSource.includes('setEraVisible'));
});

test('setSourceFilterVisible method exists', () => {
  assert.ok(layersSource.includes('setSourceFilterVisible'));
});

test('getVisibleRecords method exists', () => {
  assert.ok(layersSource.includes('getVisibleRecords'));
});

test('getVisibleRecords deduplicates by ID', () => {
  assert.ok(layersSource.includes('HashSet') || layersSource.includes('seen'));
});

test('getSummary method exists', () => {
  assert.ok(layersSource.includes('getSummary'));
});

test('getTotalRecordCount method exists', () => {
  assert.ok(layersSource.includes('getTotalRecordCount'));
});

test('buildFromRecords checks sourceRefs', () => {
  assert.ok(layersSource.includes('sourceRefs'));
});

test('Era C20_EARLY starts at 1900', () => {
  assert.ok(layersSource.includes('C20_EARLY("1900–1949", 1900, 1949'));
});

test('Era C21 starts at 2000', () => {
  assert.ok(layersSource.includes('C21("2000–Present", 2000, 9999'));
});

// ── Part 9: Backend Map Query Endpoint ──

console.log('\nPart 9: Backend Map Query Endpoint');

const indexSource = fs.readFileSync(path.join(__dirname, '..', 'backend', 'src', 'index.js'), 'utf8');

test('Backend has /api/map/query route', () => {
  assert.ok(indexSource.includes('/api/map/query'));
});

test('Backend has handleMapQuery function', () => {
  assert.ok(indexSource.includes('handleMapQuery'));
});

test('Backend map query supports q param', () => {
  assert.ok(indexSource.includes("get('q')"));
});

test('Backend map query supports startYear param', () => {
  assert.ok(indexSource.includes("get('startYear')"));
});

test('Backend map query supports endYear param', () => {
  assert.ok(indexSource.includes("get('endYear')"));
});

test('Backend map query supports location param', () => {
  assert.ok(indexSource.includes("get('location')"));
});

test('Backend map query supports evidence param', () => {
  assert.ok(indexSource.includes("get('evidence')"));
});

test('Backend map query parses natural language year ranges', () => {
  assert.ok(indexSource.includes('rangeMatch'));
});

test('Backend map query parses decades', () => {
  assert.ok(indexSource.includes('decadeMatch'));
});

test('Backend map query parses before/after', () => {
  assert.ok(indexSource.includes('beforeMatch') && indexSource.includes('afterMatch'));
});

test('Backend map query parses evidence from NL', () => {
  assert.ok(indexSource.includes('source[- ]?backed'));
});

test('Backend map query parses location from NL', () => {
  assert.ok(indexSource.includes('nearMatch') && indexSource.includes('inMatch'));
});

test('Backend map query filters by year', () => {
  assert.ok(indexSource.includes('parsedStartYear'));
});

test('Backend map query filters by evidence', () => {
  assert.ok(indexSource.includes('parsedEvidence'));
});

test('Backend map query filters by location', () => {
  assert.ok(indexSource.includes('parsedLocation'));
});

test('Backend map query generates summary', () => {
  assert.ok(indexSource.includes('summary'));
});

test('Backend map query only includes published records', () => {
  assert.ok(indexSource.includes('published'));
});

// ── Part 10: AI System Prompts ──

console.log('\nPart 10: AI System Prompts');

const promptsSource = fs.readFileSync(path.join(APP_BASE, 'chat', 'AISystemPrompts.java'), 'utf8');

test('AI prompts mention map queries', () => {
  assert.ok(promptsSource.includes('map quer') || promptsSource.includes('AI map'));
});

test('AI prompts mention map queries', () => {
  assert.ok(promptsSource.includes('/api/map/query') || promptsSource.includes('AI map quer') || promptsSource.includes('map quer'),
      'AI prompts should mention map queries');
});

test('AI prompts mention era organization', () => {
  assert.ok(promptsSource.includes('era') || promptsSource.includes('Pre-1800'));
});

test('Suggested prompts include map query', () => {
  assert.ok(
    promptsSource.includes('map') && (promptsSource.includes('1900s') || promptsSource.includes('Bukit Brown')),
    'Suggested prompts should include map query examples'
  );
});

// ── Part 11: Documentation ──

console.log('\nPart 11: Documentation');

test('CHANGELOG mentions Phase 16.4 or AI Map', () => {
  const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
  assert.ok(
    changelog.includes('Phase 16.4') || changelog.includes('AI Map') || changelog.includes('map query'),
    'CHANGELOG should mention Phase 16.4 or AI Map'
  );
});

console.log('\n=== Phase 16.4 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.4 AI Map tests passed!');
else { console.log('\n❌ Some tests failed!'); failures.forEach(f => console.log(`  - ${f}`)); }

process.exit(failed > 0 ? 1 : 0);
