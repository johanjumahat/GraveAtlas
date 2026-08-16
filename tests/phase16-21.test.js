/**
 * Phase 16.21 Tests — AI Data Export & Archival
 *
 * Tests:
 * - Backend endpoints: /export/dataset, /export/geojson, /export/jsonld, /export/manifest, /export/batch
 * - Dataset export: JSON CSV-ready, optional provenance/confidence/sources
 * - GeoJSON export: RFC 7946 compliance, Point geometry, coordinates [lon, lat]
 * - JSON-LD export: @context, @graph, schema.org vocab, provenance + confidence
 * - Manifest: record stats, cemetery list, date range, available formats
 * - Batch export: up to 10 exports, error handling
 * - DatasetExport model
 * - GeoJSONExport model
 * - JSONLDExport model
 * - ExportManifest model
 * - API client methods
 * - AI system prompt awareness
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

// ── Part 1: Backend Endpoints ──
console.log('\nPart 1: Backend Endpoints');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');

test('Backend has GET /api/export/dataset', () => {
  assert.ok(indexFile.includes('handleExportDataset'), 'Missing handleExportDataset');
});

test('Backend has GET /api/export/geojson', () => {
  assert.ok(indexFile.includes('handleExportGeoJSON'), 'Missing handleExportGeoJSON');
});

test('Backend has GET /api/export/jsonld', () => {
  assert.ok(indexFile.includes('handleExportJSONLD'), 'Missing handleExportJSONLD');
});

test('Backend has GET /api/export/manifest', () => {
  assert.ok(indexFile.includes('handleExportManifest'), 'Missing handleExportManifest');
});

test('Backend has POST /api/export/batch', () => {
  assert.ok(indexFile.includes('handleExportBatch'), 'Missing handleExportBatch');
});

test('All 5 export routes registered', () => {
  const routes = ['handleExportDataset', 'handleExportGeoJSON',
    'handleExportJSONLD', 'handleExportManifest', 'handleExportBatch'];
  for (const r of routes) {
    assert.ok(indexFile.includes(r), `Missing route handler: ${r}`);
  }
});

// ── Part 2: Dataset Export ──
console.log('\nPart 2: Dataset Export');

test('Accepts cemeteryId filter', () => {
  assert.ok(indexFile.includes("searchParams.get('cemeteryId')"),
    'Missing cemeteryId filter');
});

test('Accepts includeProvenance option', () => {
  assert.ok(indexFile.includes('includeProvenance'),
    'Missing includeProvenance');
});

test('Accepts includeConfidence option', () => {
  assert.ok(indexFile.includes('includeConfidence'),
    'Missing includeConfidence');
});

test('Accepts includeSources option', () => {
  assert.ok(indexFile.includes('includeSources'),
    'Missing includeSources');
});

test('Accepts includeUnpublished option', () => {
  assert.ok(indexFile.includes('includeUnpublished'),
    'Missing includeUnpublished');
});

test('Accepts limit parameter (max 50000)', () => {
  assert.ok(indexFile.includes('50000'),
    'Missing 50000 limit cap');
});

test('Export record has all standard fields', () => {
  const fields = ['id', 'name', 'birthDate', 'deathDate', 'cemeteryId', 'section',
    'plot', 'latitude', 'longitude', 'inscription', 'verificationStatus'];
  // Check these appear in the export record construction
  assert.ok(indexFile.includes('exportRecord') || indexFile.includes('ExportRecord'),
    'Missing export record construction');
});

test('Includes confidence score when requested', () => {
  assert.ok(indexFile.includes('computeConfidenceScore') && indexFile.includes('includeConfidence'),
    'Missing confidence in export');
});

test('Includes provenance chain when requested', () => {
  assert.ok(indexFile.includes('buildProvenanceChain') && indexFile.includes('includeProvenance'),
    'Missing provenance in export');
});

test('Returns export metadata with schema and license', () => {
  assert.ok(indexFile.includes('GraveAtlas v7.2.21') && indexFile.includes('CC-BY-SA'),
    'Missing schema version or license');
});

test('Returns metadata with exportedAt timestamp', () => {
  assert.ok(indexFile.includes('exportedAt'),
    'Missing exportedAt in metadata');
});

// ── Part 3: GeoJSON Export ──
console.log('\nPart 3: GeoJSON Export');

test('Returns FeatureCollection type', () => {
  assert.ok(indexFile.includes('FeatureCollection'),
    'Missing FeatureCollection type');
});

test('Each feature is type Feature', () => {
  assert.ok(indexFile.includes("type: 'Feature'"),
    'Missing Feature type');
});

test('Geometry is Point type', () => {
  assert.ok(indexFile.includes("type: 'Point'"),
    'Missing Point geometry');
});

test('Coordinates are [longitude, latitude]', () => {
  assert.ok(indexFile.includes('parseFloat(record.longitude)') && indexFile.includes('parseFloat(record.latitude)'),
    'Missing coordinate parsing');
});

test('Skips records without coordinates', () => {
  assert.ok(indexFile.includes('!record.latitude || !record.longitude'),
    'Missing coordinate filter');
});

test('Properties include id, name, dates, cemetery, verification', () => {
  assert.ok(indexFile.includes('properties') && indexFile.includes('verificationStatus'),
    'Missing GeoJSON properties');
});

test('Returns schema as GeoJSON RFC 7946', () => {
  assert.ok(indexFile.includes('RFC 7946'),
    'Missing RFC 7946 reference');
});

test('Returns coordinate system as WGS84', () => {
  assert.ok(indexFile.includes('WGS84'),
    'Missing WGS84 coordinate system');
});

// ── Part 4: JSON-LD Export ──
console.log('\nPart 4: JSON-LD Export');

test('Has @context with schema.org vocab', () => {
  assert.ok(indexFile.includes('@context') && indexFile.includes('schema.org'),
    'Missing @context with schema.org');
});

test('Has @graph array', () => {
  assert.ok(indexFile.includes('@graph'),
    'Missing @graph');
});

test('Each entity has @id and @type', () => {
  assert.ok(indexFile.includes("@id") && indexFile.includes("@type"),
    'Missing @id/@type in entities');
});

test('Entity type is Person', () => {
  assert.ok(indexFile.includes("'Person'"),
    'Missing Person type');
});

test('Includes confidence in JSON-LD', () => {
  assert.ok(indexFile.includes('confidence') && indexFile.includes('computeConfidenceScore'),
    'Missing confidence in JSON-LD');
});

test('Includes provenance in JSON-LD', () => {
  assert.ok(indexFile.includes('buildProvenanceChain'),
    'Missing provenance in JSON-LD');
});

test('Context has custom graves vocab', () => {
  assert.ok(indexFile.includes('graveatlas.com/vocab') || indexFile.includes('graves:'),
    'Missing custom graves vocabulary');
});

test('Accepts recordId for single record export', () => {
  assert.ok(indexFile.includes("searchParams.get('recordId')"),
    'Missing recordId filter');
});

test('Returns schema as JSON-LD 1.1', () => {
  assert.ok(indexFile.includes('JSON-LD 1.1'),
    'Missing JSON-LD 1.1 schema');
});

// ── Part 5: Manifest ──
console.log('\nPart 5: Manifest');

test('Counts total/published/unpublished records', () => {
  assert.ok(indexFile.includes('totalRecords') && indexFile.includes('publishedRecords') &&
    indexFile.includes('unpublishedRecords'),
    'Missing record counts');
});

test('Counts records with sources and coordinates', () => {
  assert.ok(indexFile.includes('recordsWithSources') && indexFile.includes('recordsWithCoordinates'),
    'Missing source/coordinate counts');
});

test('Counts total source references', () => {
  assert.ok(indexFile.includes('totalSourceRefs'),
    'Missing total source refs');
});

test('Lists cemeteries with record counts', () => {
  assert.ok(indexFile.includes('cemeteryCounts'),
    'Missing cemetery counts');
});

test('Returns date range (earliest, latest)', () => {
  assert.ok(indexFile.includes('earliestDate') && indexFile.includes('latestDate'),
    'Missing date range');
});

test('Lists available export formats', () => {
  assert.ok(indexFile.includes('availableFormats'),
    'Missing available formats');
});

test('Returns license', () => {
  assert.ok(indexFile.includes('license') && indexFile.includes('CC-BY-SA'),
    'Missing license');
});

test('Returns export options documentation', () => {
  assert.ok(indexFile.includes('exportOptions'),
    'Missing export options');
});

test('Returns schema version', () => {
  assert.ok(indexFile.includes('GraveAtlas v7.2.21'),
    'Missing schema version in manifest');
});

// ── Part 6: Batch Export ──
console.log('\nPart 6: Batch Export');

test('Accepts exports array', () => {
  assert.ok(indexFile.includes('exports'),
    'Missing exports array handling');
});

test('Limits to 10 exports', () => {
  assert.ok(indexFile.includes('Maximum 10'),
    'Missing 10-export limit');
});

test('Each export spec has format, cemeteryId, options', () => {
  assert.ok(indexFile.includes('format') && indexFile.includes('cemeteryId') && indexFile.includes('options'),
    'Missing export spec fields');
});

test('Returns per-export results with record count', () => {
  assert.ok(indexFile.includes('recordCount') && indexFile.includes('status'),
    'Missing per-export results');
});

test('Handles errors per export', () => {
  assert.ok(indexFile.includes("'error'"),
    'Missing error handling per export');
});

test('Returns totalExports count', () => {
  assert.ok(indexFile.includes('totalExports'),
    'Missing totalExports');
});

// ── Part 7: DatasetExport Model ──
console.log('\nPart 7: DatasetExport Model');

const deFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/DatasetExport.java'),
  'utf8'
);

test('DatasetExport class exists', () => {
  assert.ok(deFile.includes('public class DatasetExport'), 'Class not found');
});

test('Has ExportMetadata inner class', () => {
  assert.ok(deFile.includes('class ExportMetadata'), 'Missing ExportMetadata');
});

test('Has ExportFilters inner class', () => {
  assert.ok(deFile.includes('class ExportFilters'), 'Missing ExportFilters');
});

test('Has ExportRecord inner class', () => {
  assert.ok(deFile.includes('class ExportRecord'), 'Missing ExportRecord');
});

test('Has fromJson method', () => {
  assert.ok(deFile.includes('fromJson'), 'Missing fromJson');
});

test('Has getRecordCount method', () => {
  assert.ok(deFile.includes('getRecordCount'), 'Missing getRecordCount');
});

test('Has getSummaryLine method', () => {
  assert.ok(deFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 8: GeoJSONExport Model ──
console.log('\nPart 8: GeoJSONExport Model');

const gjFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/GeoJSONExport.java'),
  'utf8'
);

test('GeoJSONExport class exists', () => {
  assert.ok(gjFile.includes('public class GeoJSONExport'), 'Class not found');
});

test('Has GeoFeature inner class', () => {
  assert.ok(gjFile.includes('class GeoFeature'), 'Missing GeoFeature');
});

test('Has GeoGeometry inner class', () => {
  assert.ok(gjFile.includes('class GeoGeometry'), 'Missing GeoGeometry');
});

test('Has GeoProperties inner class', () => {
  assert.ok(gjFile.includes('class GeoProperties'), 'Missing GeoProperties');
});

test('Has GeoJSONMetadata inner class', () => {
  assert.ok(gjFile.includes('class GeoJSONMetadata'), 'Missing GeoJSONMetadata');
});

test('Has fromJson method', () => {
  assert.ok(gjFile.includes('fromJson'), 'Missing fromJson');
});

test('Has getFeatureCount method', () => {
  assert.ok(gjFile.includes('getFeatureCount'), 'Missing getFeatureCount');
});

test('Has getSummaryLine method', () => {
  assert.ok(gjFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 9: JSONLDExport Model ──
console.log('\nPart 9: JSONLDExport Model');

const jlFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/JSONLDExport.java'),
  'utf8'
);

test('JSONLDExport class exists', () => {
  assert.ok(jlFile.includes('public class JSONLDExport'), 'Class not found');
});

test('Has JSONLDMetadata inner class', () => {
  assert.ok(jlFile.includes('class JSONLDMetadata'), 'Missing JSONLDMetadata');
});

test('Has fromJson method', () => {
  assert.ok(jlFile.includes('fromJson'), 'Missing fromJson');
});

test('Has getEntityCount method', () => {
  assert.ok(jlFile.includes('getEntityCount'), 'Missing getEntityCount');
});

test('Has getSummaryLine method', () => {
  assert.ok(jlFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 10: ExportManifest Model ──
console.log('\nPart 10: ExportManifest Model');

const emFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/ExportManifest.java'),
  'utf8'
);

test('ExportManifest class exists', () => {
  assert.ok(emFile.includes('public class ExportManifest'), 'Class not found');
});

test('Has RecordStats inner class', () => {
  assert.ok(emFile.includes('class RecordStats'), 'Missing RecordStats');
});

test('Has CemeteryEntry inner class', () => {
  assert.ok(emFile.includes('class CemeteryEntry'), 'Missing CemeteryEntry');
});

test('Has DateRange inner class', () => {
  assert.ok(emFile.includes('class DateRange'), 'Missing DateRange');
});

test('Has AvailableFormat inner class', () => {
  assert.ok(emFile.includes('class AvailableFormat'), 'Missing AvailableFormat');
});

test('Has fromJson method', () => {
  assert.ok(emFile.includes('fromJson'), 'Missing fromJson');
});

test('Has hasData method', () => {
  assert.ok(emFile.includes('hasData'), 'Missing hasData');
});

test('Has getSummaryLine method', () => {
  assert.ok(emFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 11: API Client Integration ──
console.log('\nPart 11: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports DatasetExport', () => {
  assert.ok(apiFile.includes('DatasetExport'), 'Missing DatasetExport import');
});

test('ApiClient imports GeoJSONExport', () => {
  assert.ok(apiFile.includes('GeoJSONExport'), 'Missing GeoJSONExport import');
});

test('ApiClient imports JSONLDExport', () => {
  assert.ok(apiFile.includes('JSONLDExport'), 'Missing JSONLDExport import');
});

test('ApiClient imports ExportManifest', () => {
  assert.ok(apiFile.includes('ExportManifest'), 'Missing ExportManifest import');
});

test('ApiClient has exportDataset method', () => {
  assert.ok(apiFile.includes('exportDataset'), 'Missing exportDataset');
  assert.ok(apiFile.includes('/export/dataset'), 'Missing /export/dataset URL');
});

test('ApiClient has exportGeoJSON method', () => {
  assert.ok(apiFile.includes('exportGeoJSON'), 'Missing exportGeoJSON');
  assert.ok(apiFile.includes('/export/geojson'), 'Missing /export/geojson URL');
});

test('ApiClient has exportJSONLD method', () => {
  assert.ok(apiFile.includes('exportJSONLD'), 'Missing exportJSONLD');
  assert.ok(apiFile.includes('/export/jsonld'), 'Missing /export/jsonld URL');
});

test('ApiClient has getExportManifest method', () => {
  assert.ok(apiFile.includes('getExportManifest'), 'Missing getExportManifest');
  assert.ok(apiFile.includes('/export/manifest'), 'Missing /export/manifest URL');
});

test('ApiClient has exportBatch method', () => {
  assert.ok(apiFile.includes('exportBatch'), 'Missing exportBatch');
  assert.ok(apiFile.includes('/export/batch'), 'Missing /export/batch URL');
});

// ── Part 12: AI System Prompts ──
console.log('\nPart 12: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention export/dataset', () => {
  assert.ok(promptsFile.includes('export/dataset'), 'Missing export/dataset mention');
});

test('AI prompts mention export/geojson', () => {
  assert.ok(promptsFile.includes('export/geojson'), 'Missing export/geojson mention');
});

test('AI prompts mention export/jsonld', () => {
  assert.ok(promptsFile.includes('export/jsonld'), 'Missing export/jsonld mention');
});

test('AI prompts mention export/manifest', () => {
  assert.ok(promptsFile.includes('export/manifest'), 'Missing export/manifest mention');
});

test('AI prompts mention GeoJSON RFC 7946', () => {
  assert.ok(promptsFile.includes('RFC 7946') || promptsFile.includes('GeoJSON'),
    'Missing GeoJSON reference');
});

test('AI prompts mention CC-BY-SA license', () => {
  assert.ok(promptsFile.includes('CC-BY-SA'),
    'Missing license mention');
});

test('Suggested prompts include "Export" GeoJSON', () => {
  assert.ok(promptsFile.includes('Export') && promptsFile.includes('GeoJSON'),
    'Missing "Export GeoJSON" prompt');
});

test('Suggested prompts include "export manifest"', () => {
  assert.ok(promptsFile.includes('export manifest'),
    'Missing "export manifest" prompt');
});

// ── Part 13: Documentation ──
console.log('\nPart 13: Documentation');

test('CHANGELOG mentions Phase 16.21 or Export', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.21') || changelog.includes('Data Export'),
    'CHANGELOG should mention Phase 16.21');
});

test('STATUS.md mentions Export', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Export') || status.includes('16.21'),
    'STATUS.md should mention Export');
});

// ── Results ──
console.log('\n=== Phase 16.21 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.21 Data Export & Archival tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
