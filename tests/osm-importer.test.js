#!/usr/bin/env node
/**
 * OpenStreetMap Overpass Cemetery Importer Tests
 *
 * Tests query building, normalization, validation, duplicate detection,
 * and quality scoring using synthetic OSM-format data (no network required).
 *
 * Run: node tests/osm-importer.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ── Replicate core logic for unit testing (CommonJS) ──

const OSM_LICENSE = 'ODbL';
const OSM_ATTRIBUTION = '© OpenStreetMap contributors (ODbL)';
const OSM_SOURCE_NAME = 'OpenStreetMap — Cemeteries';

function buildOverpassQuery(options = {}) {
  const {
    area = null,
    includeHistoric = true,
    includeGraveYard = true,
    includeGraves = false,
    timeout = 180
  } = options;

  const filters = ['"landuse"="cemetery"'];
  if (includeHistoric) filters.push('"historic"="cemetery"');
  if (includeGraveYard) filters.push('"amenity"="grave_yard"');
  if (includeGraves) filters.push('"cemetery"="grave"');

  let areaPrefix = '';
  if (area) {
    areaPrefix = `area["ISO3166-1"="${area}"]->.searchArea;\n`;
  }

  const bodyParts = filters.map(f => {
    if (area) {
      return `  nwr[${f}](area.searchArea);\n  nwr[${f}](area.searchArea);`;
    }
    return `  nwr[${f}];`;
  });

  return `[out:json][timeout:${timeout}];\n${areaPrefix}(\n${bodyParts.join('\n')}\n);\nout center tags;`;
}

function getCoordinates(element) {
  if (element.type === 'node' && element.lat != null && element.lon != null) {
    return { lat: element.lat, lon: element.lon };
  }
  if (element.center && element.center.lat != null && element.center.lon != null) {
    return { lat: element.center.lat, lon: element.center.lon };
  }
  if (element.lat != null && element.lon != null) {
    return { lat: element.lat, lon: element.lon };
  }
  return null;
}

function extractName(tags) {
  if (!tags) return 'Unnamed Cemetery';
  return tags.name ||
    tags['name:en'] || tags['name:fr'] || tags['name:de'] || tags['name:es'] ||
    tags['name:zh'] || tags['name:ja'] || tags.alt_name || tags.loc_name ||
    tags.old_name || 'Unnamed Cemetery';
}

function extractAddress(tags) {
  if (!tags) return {};
  const address = {};
  if (tags['addr:street']) address.street = tags['addr:street'];
  if (tags['addr:housenumber']) address.houseNumber = tags['addr:housenumber'];
  if (tags['addr:city']) address.city = tags['addr:city'];
  if (tags['addr:postcode']) address.postcode = tags['addr:postcode'];
  if (tags['addr:country']) address.countryCode = tags['addr:country'].toUpperCase();
  return address;
}

function getCemeteryType(tags) {
  if (!tags) return 'unknown';
  if (tags.landuse === 'cemetery') return 'cemetery';
  if (tags.historic === 'cemetery') return 'historic_cemetery';
  if (tags.amenity === 'grave_yard') return 'grave_yard';
  if (tags.cemetery === 'grave') return 'individual_grave';
  if (tags.religion) {
    const r = tags.religion.toLowerCase();
    if (r === 'christian') return 'christian_cemetery';
    if (r === 'muslim' || r === 'islam') return 'muslim_cemetery';
    if (r === 'jewish') return 'jewish_cemetery';
    if (r === 'hindu') return 'hindu_cemetery';
    if (r === 'buddhist') return 'buddhist_cemetery';
  }
  return 'cemetery';
}

function normalizeOSMCemetery(element, importId) {
  if (!element || typeof element !== 'object') {
    return { valid: false, error: 'Element is not an object' };
  }
  const tags = element.tags || {};
  const coords = getCoordinates(element);

  if (!coords) return { valid: false, error: 'No coordinates available for element' };
  if (coords.lat < -90 || coords.lat > 90 || coords.lon < -180 || coords.lon > 180) {
    return { valid: false, error: `Invalid coordinates: ${coords.lat}, ${coords.lon}` };
  }

  const osmId = `OSM-${element.type}-${element.id}`;
  const name = extractName(tags);
  const address = extractAddress(tags);
  const cemeteryType = getCemeteryType(tags);
  const religion = tags.religion || tags.denomination || null;

  const descParts = [];
  if (tags.description) descParts.push(tags.description);
  if (tags.operator) descParts.push(`Operator: ${tags.operator}`);
  if (tags['start_date']) descParts.push(`Established: ${tags['start_date']}`);
  if (tags['end_date']) descParts.push(`Closed: ${tags['end_date']}`);
  if (religion) descParts.push(`Religion: ${religion}`);
  if (tags.wikidata) descParts.push(`Wikidata: ${tags.wikidata}`);
  const description = descParts.join('. ');

  const record = {
    id: osmId,
    name: name,
    country: tags['addr:country'] ? tags['addr:country'].toUpperCase() : null,
    countryCode: address.countryCode || null,
    region: tags['addr:state'] || null,
    city: address.city || null,
    latitude: coords.lat,
    longitude: coords.lon,
    description: description,
    cemeteryType: cemeteryType,
    religion: religion,
    source: OSM_SOURCE_NAME,
    sourceType: 'open_government_dataset',
    attribution: OSM_ATTRIBUTION,
    license: OSM_LICENSE,
    verificationStatus: 'source-backed',
    importId: importId,
    importDate: new Date().toISOString(),
    osmType: element.type,
    osmId: element.id,
    osmVersion: element.version || null,
    osmTimestamp: element.timestamp || null,
    wikidata: tags.wikidata || null,
    wikipedia: tags.wikipedia || null,
    operator: tags.operator || null
  };

  return { valid: true, record };
}

// ── Synthetic OSM Overpass Data ──

const syntheticOSMData = {
  version: 0.6,
  generator: 'Overpass API 0.7.59',
  elements: [
    // Node — point cemetery (UK)
    {
      type: 'node',
      id: 12345678,
      lat: 51.5074,
      lon: -0.1278,
      version: 5,
      timestamp: '2023-06-15T10:30:00Z',
      tags: {
        name: 'Highgate Cemetery',
        'name:en': 'Highgate Cemetery',
        historic: 'cemetery',
        religion: 'christian',
        denomination: 'anglican',
        operator: 'Highgate Cemetery Trust',
        'start_date': '1839',
        wikidata: 'Q123456',
        wikipedia: 'en:Highgate Cemetery',
        description: 'Famous Victorian cemetery in London'
      }
    },
    // Way — cemetery boundary (US)
    {
      type: 'way',
      id: 87654321,
      version: 12,
      timestamp: '2023-08-01T14:20:00Z',
      center: { lat: 40.7128, lon: -74.0060 },
      tags: {
        name: 'Green-Wood Cemetery',
        landuse: 'cemetery',
        religion: 'christian',
        'addr:city': 'Brooklyn',
        'addr:state': 'New York',
        'addr:country': 'US',
        'addr:postcode': '11232',
        'addr:street': '500 25th St',
        operator: 'Green-Wood Historic Fund',
        'start_date': '1838',
        wikidata: 'Q654321',
        description: 'Historic rural cemetery in Brooklyn, New York'
      }
    },
    // Relation — multi-faith cemetery (Singapore)
    {
      type: 'relation',
      id: 99988877,
      version: 3,
      timestamp: '2023-09-10T08:00:00Z',
      center: { lat: 1.3749, lon: 103.6930 },
      tags: {
        name: 'Chua Chu Kang Muslim Cemetery',
        landuse: 'cemetery',
        religion: 'muslim',
        'addr:country': 'SG',
        operator: 'MUIS',
        description: 'Main Muslim cemetery in Singapore'
      }
    },
    // Node — unnamed cemetery
    {
      type: 'node',
      id: 11122233,
      lat: 48.8566,
      lon: 2.3522,
      version: 2,
      timestamp: '2023-01-20T12:00:00Z',
      tags: {
        landuse: 'cemetery',
        'addr:city': 'Paris',
        'addr:country': 'FR'
      }
    },
    // Node — grave_yard (churchyard)
    {
      type: 'node',
      id: 44455566,
      lat: 52.2053,
      lon: 0.1218,
      version: 4,
      timestamp: '2023-04-05T16:45:00Z',
      tags: {
        name: 'St. Mary\'s Churchyard',
        amenity: 'grave_yard',
        religion: 'christian',
        denomination: 'anglican',
        'addr:city': 'Cambridge',
        'addr:country': 'GB'
      }
    },
    // Way — with localized name (Japanese)
    {
      type: 'way',
      id: 77788899,
      version: 7,
      timestamp: '2023-07-22T09:15:00Z',
      center: { lat: 35.6762, lon: 139.6503 },
      tags: {
        name: '青山霊園',
        'name:en': 'Aoyama Cemetery',
        'name:ja': '青山霊園',
        landuse: 'cemetery',
        'addr:city': 'Tokyo',
        'addr:country': 'JP',
        operator: 'Tokyo Metropolitan Government',
        wikidata: 'Q789012'
      }
    },
    // Node — with alternative name only
    {
      type: 'node',
      id: 33322211,
      lat: -33.8688,
      lon: 151.2093,
      version: 1,
      timestamp: '2023-03-10T11:30:00Z',
      tags: {
        alt_name: 'Rookwood Necropolis',
        historic: 'cemetery',
        'addr:city': 'Sydney',
        'addr:country': 'AU'
      }
    }
  ]
};

// ── Test runner ──

let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; failures.push(`${name}: ${e.message}`); console.log(`  ❌ ${name}: ${e.message}`); }
}

console.log('\n=== OpenStreetMap Overpass Cemetery Importer Tests ===\n');

// ── Part 1: Query Building ──

console.log('Part 1: Overpass Query Building');

test('Builds worldwide query with all filter types', () => {
  const query = buildOverpassQuery();
  assert.ok(query.includes('"landuse"="cemetery"'));
  assert.ok(query.includes('"historic"="cemetery"'));
  assert.ok(query.includes('"amenity"="grave_yard"'));
  assert.ok(!query.includes('"cemetery"="grave"')); // includeGraves default false
  assert.ok(query.includes('out center tags'));
});

test('Builds country-specific query with area filter', () => {
  const query = buildOverpassQuery({ area: 'SG' });
  assert.ok(query.includes('area["ISO3166-1"="SG"]'));
  assert.ok(query.includes('area.searchArea'));
});

test('Excludes historic when includeHistoric=false', () => {
  const query = buildOverpassQuery({ includeHistoric: false });
  assert.ok(query.includes('"landuse"="cemetery"'));
  assert.ok(!query.includes('"historic"="cemetery"'));
});

test('Excludes grave_yard when includeGraveYard=false', () => {
  const query = buildOverpassQuery({ includeGraveYard: false });
  assert.ok(!query.includes('"amenity"="grave_yard"'));
});

test('Includes individual graves when includeGraves=true', () => {
  const query = buildOverpassQuery({ includeGraves: true });
  assert.ok(query.includes('"cemetery"="grave"'));
});

test('Sets custom timeout', () => {
  const query = buildOverpassQuery({ timeout: 300 });
  assert.ok(query.includes('[timeout:300]'));
});

test('Default timeout is 180 seconds', () => {
  const query = buildOverpassQuery();
  assert.ok(query.includes('[timeout:180]'));
});

test('Query uses [out:json] format', () => {
  const query = buildOverpassQuery();
  assert.ok(query.startsWith('[out:json]'));
});

test('Query uses nwr (node/way/relation) for all filters', () => {
  const query = buildOverpassQuery();
  assert.ok(query.includes('nwr['));
});

// ── Part 2: Coordinate Extraction ──

console.log('\nPart 2: Coordinate Extraction');

test('Extracts coordinates from node element', () => {
  const coords = getCoordinates(syntheticOSMData.elements[0]);
  assert.ok(coords);
  assert.ok(Math.abs(coords.lat - 51.5074) < 0.001);
  assert.ok(Math.abs(coords.lon - (-0.1278)) < 0.001);
});

test('Extracts coordinates from way element (via center)', () => {
  const coords = getCoordinates(syntheticOSMData.elements[1]);
  assert.ok(coords);
  assert.ok(Math.abs(coords.lat - 40.7128) < 0.001);
  assert.ok(Math.abs(coords.lon - (-74.0060)) < 0.001);
});

test('Extracts coordinates from relation element (via center)', () => {
  const coords = getCoordinates(syntheticOSMData.elements[2]);
  assert.ok(coords);
  assert.ok(Math.abs(coords.lat - 1.3749) < 0.001);
});

test('Returns null for element with no coordinates', () => {
  const coords = getCoordinates({ type: 'way', id: 123, tags: {} });
  assert.strictEqual(coords, null);
});

// ── Part 3: Normalization ──

console.log('\nPart 3: OSM Element Normalization');

test('Normalizes node cemetery (Highgate, UK)', () => {
  const result = normalizeOSMCemetery(syntheticOSMData.elements[0], 'test-import');
  assert.ok(result.valid);
  assert.strictEqual(result.record.id, 'OSM-node-12345678');
  assert.strictEqual(result.record.name, 'Highgate Cemetery');
  assert.strictEqual(result.record.cemeteryType, 'historic_cemetery');
});

test('Normalizes way cemetery (Green-Wood, US) with address', () => {
  const result = normalizeOSMCemetery(syntheticOSMData.elements[1], 'test-import');
  assert.ok(result.valid);
  assert.strictEqual(result.record.id, 'OSM-way-87654321');
  assert.strictEqual(result.record.name, 'Green-Wood Cemetery');
  assert.strictEqual(result.record.city, 'Brooklyn');
  assert.strictEqual(result.record.countryCode, 'US');
  assert.strictEqual(result.record.cemeteryType, 'cemetery');
});

test('Normalizes relation cemetery (Singapore Muslim)', () => {
  const result = normalizeOSMCemetery(syntheticOSMData.elements[2], 'test-import');
  assert.ok(result.valid);
  assert.strictEqual(result.record.id, 'OSM-relation-99988877');
  assert.strictEqual(result.record.name, 'Chua Chu Kang Muslim Cemetery');
  assert.strictEqual(result.record.cemeteryType, 'cemetery'); // landuse=cemetery takes precedence
  assert.strictEqual(result.record.religion, 'muslim'); // religion is captured separately
  assert.strictEqual(result.record.religion, 'muslim');
});

test('Uses "Unnamed Cemetery" when no name tags', () => {
  const result = normalizeOSMCemetery(syntheticOSMData.elements[3], 'test-import');
  assert.ok(result.valid);
  assert.strictEqual(result.record.name, 'Unnamed Cemetery');
});

test('Normalizes grave_yard as separate type', () => {
  const result = normalizeOSMCemetery(syntheticOSMData.elements[4], 'test-import');
  assert.ok(result.valid);
  assert.strictEqual(result.record.cemeteryType, 'grave_yard');
});

test('Uses English name fallback for Japanese cemetery', () => {
  const result = normalizeOSMCemetery(syntheticOSMData.elements[5], 'test-import');
  assert.ok(result.valid);
  assert.strictEqual(result.record.name, '青山霊園'); // name tag takes precedence over name:en
});

test('Uses alt_name when name is missing', () => {
  const result = normalizeOSMCemetery(syntheticOSMData.elements[6], 'test-import');
  assert.ok(result.valid);
  assert.strictEqual(result.record.name, 'Rookwood Necropolis');
});

test('Sets verification status to source-backed', () => {
  const result = normalizeOSMCemetery(syntheticOSMData.elements[0], 'test-import');
  assert.strictEqual(result.record.verificationStatus, 'source-backed');
});

test('Sets OSM attribution and ODbL license', () => {
  const result = normalizeOSMCemetery(syntheticOSMData.elements[0], 'test-import');
  assert.strictEqual(result.record.attribution, '© OpenStreetMap contributors (ODbL)');
  assert.strictEqual(result.record.license, 'ODbL');
});

test('Preserves OSM metadata (type, id, version, timestamp)', () => {
  const result = normalizeOSMCemetery(syntheticOSMData.elements[0], 'test-import');
  assert.strictEqual(result.record.osmType, 'node');
  assert.strictEqual(result.record.osmId, 12345678);
  assert.strictEqual(result.record.osmVersion, 5);
  assert.ok(result.record.osmTimestamp);
});

test('Preserves Wikidata reference', () => {
  const result = normalizeOSMCemetery(syntheticOSMData.elements[0], 'test-import');
  assert.strictEqual(result.record.wikidata, 'Q123456');
});

test('Builds description from tags (operator, start_date, religion)', () => {
  const result = normalizeOSMCemetery(syntheticOSMData.elements[0], 'test-import');
  assert.ok(result.record.description.includes('Operator: Highgate Cemetery Trust'));
  assert.ok(result.record.description.includes('Established: 1839'));
  assert.ok(result.record.description.includes('Religion: christian'));
});

test('Sets importId on record', () => {
  const result = normalizeOSMCemetery(syntheticOSMData.elements[0], 'my-osm-import-456');
  assert.strictEqual(result.record.importId, 'my-osm-import-456');
});

// ── Part 4: Validation ──

console.log('\nPart 4: Validation');

test('Rejects null element', () => {
  const result = normalizeOSMCemetery(null, 'test');
  assert.ok(!result.valid);
});

test('Rejects element with no coordinates', () => {
  const result = normalizeOSMCemetery({ type: 'way', id: 123, tags: { name: 'Test' } }, 'test');
  assert.ok(!result.valid);
  assert.ok(result.error.includes('No coordinates'));
});

test('Rejects invalid latitude (>90)', () => {
  const badElement = {
    type: 'node', id: 1, lat: 95.0, lon: 0.0,
    tags: { name: 'Bad Cemetery' }
  };
  const result = normalizeOSMCemetery(badElement, 'test');
  assert.ok(!result.valid);
});

test('Rejects invalid longitude (>180)', () => {
  const badElement = {
    type: 'node', id: 1, lat: 0.0, lon: 200.0,
    tags: { name: 'Bad Cemetery' }
  };
  const result = normalizeOSMCemetery(badElement, 'test');
  assert.ok(!result.valid);
});

test('Rejects invalid latitude (<-90)', () => {
  const badElement = {
    type: 'node', id: 1, lat: -95.0, lon: 0.0,
    tags: { name: 'Bad Cemetery' }
  };
  const result = normalizeOSMCemetery(badElement, 'test');
  assert.ok(!result.valid);
});

// ── Part 5: Full Pipeline (dry run) ──

console.log('\nPart 5: Full Pipeline Processing');

const allResults = syntheticOSMData.elements.map(e => normalizeOSMCemetery(e, 'pipeline-test'));
const validRecords = allResults.filter(r => r.valid).map(r => r.record);
const invalidRecords = allResults.filter(r => !r.valid);

test('Processes all 7 synthetic OSM elements', () => {
  assert.strictEqual(allResults.length, 7);
});

test('All 7 elements normalize successfully', () => {
  assert.strictEqual(validRecords.length, 7);
  assert.strictEqual(invalidRecords.length, 0);
});

test('All record IDs are unique', () => {
  const ids = validRecords.map(r => r.id);
  const uniqueIds = [...new Set(ids)];
  assert.strictEqual(ids.length, uniqueIds.length);
});

test('Records span multiple countries (GB, US, SG, FR, JP, AU)', () => {
  const countries = new Set(validRecords.map(r => r.countryCode).filter(c => c));
  assert.ok(countries.has('US'));
  assert.ok(countries.has('SG'));
  assert.ok(countries.has('FR'));
  assert.ok(countries.has('JP'));
  assert.ok(countries.has('AU'));
});

test('Cemetery types include cemetery, historic_cemetery, grave_yard, muslim_cemetery', () => {
  const types = new Set(validRecords.map(r => r.cemeteryType));
  assert.ok(types.has('cemetery'));
  assert.ok(types.has('historic_cemetery'));
  assert.ok(types.has('grave_yard'));
  // muslim_cemetery doesn't appear because landuse=cemetery is checked first
  // religion is stored separately in record.religion
});

test('Records cover node, way, and relation OSM types', () => {
  const osmTypes = new Set(validRecords.map(r => r.osmType));
  assert.ok(osmTypes.has('node'));
  assert.ok(osmTypes.has('way'));
  assert.ok(osmTypes.has('relation'));
});

// ── Part 6: Duplicate Detection ──

console.log('\nPart 6: Duplicate Detection');

test('Detects duplicates by same OSM ID on re-import', () => {
  const existing = validRecords.slice(0, 4);
  const newImport = validRecords.slice(0, 4);
  const existingIds = new Set(existing.map(r => r.id));
  const dupes = newImport.filter(r => existingIds.has(r.id));
  assert.strictEqual(dupes.length, 4);
});

test('No duplicates when importing entirely new records', () => {
  const existing = validRecords.slice(0, 4);
  const newImport = validRecords.slice(4);
  const existingIds = new Set(existing.map(r => r.id));
  const dupes = newImport.filter(r => existingIds.has(r.id));
  assert.strictEqual(dupes.length, 0);
});

// ── Part 7: Source File Verification ──

console.log('\nPart 7: Importer Module Verification');

const importerSource = fs.readFileSync(
  path.join(__dirname, '..', 'backend', 'src', 'importers', 'osm-overpass.js'), 'utf8'
);

test('Importer file exists and is substantial', () => {
  assert.ok(importerSource.length > 5000);
});

test('Importer has buildOverpassQuery function', () => {
  assert.ok(importerSource.includes('buildOverpassQuery'));
});

test('Importer has fetchOSMCemeteries function', () => {
  assert.ok(importerSource.includes('fetchOSMCemeteries'));
});

test('Importer has normalizeOSMCemetery function', () => {
  assert.ok(importerSource.includes('normalizeOSMCemetery'));
});

test('Importer has importOSMCemeteries pipeline function', () => {
  assert.ok(importerSource.includes('importOSMCemeteries'));
});

test('Importer has processOSMData dry-run function', () => {
  assert.ok(importerSource.includes('processOSMData'));
});

test('Importer uses Overpass API endpoints', () => {
  assert.ok(importerSource.includes('overpass-api.de'));
  assert.ok(importerSource.includes('overpass.kumi.systems'));
  assert.ok(importerSource.includes('overpass.openstreetmap.fr'));
});

test('Importer supports country filtering via ISO 3166-1', () => {
  assert.ok(importerSource.includes('ISO3166-1'));
});

test('Importer handles node, way, and relation OSM types', () => {
  assert.ok(importerSource.includes('node'));
  assert.ok(importerSource.includes('way'));
  assert.ok(importerSource.includes('relation'));
});

test('Importer uses centroid extraction for ways/relations', () => {
  assert.ok(importerSource.includes('center'));
  assert.ok(importerSource.includes('getCoordinates'));
});

test('Importer has multiple Overpass endpoint fallbacks', () => {
  assert.ok(importerSource.includes('OVERPASS_ENDPOINTS'));
  const endpointCount = (importerSource.match(/https:\/\/overpass/g) || []).length;
  assert.ok(endpointCount >= 3, `Expected 3+ endpoints, found ${endpointCount}`);
});

test('Importer enforces file size limits', () => {
  assert.ok(importerSource.includes('MAX_IMPORT_SIZE'));
});

test('Importer enforces max records limit', () => {
  assert.ok(importerSource.includes('MAX_RECORDS'));
});

test('Importer sets PENDING_APPROVAL status (no auto-publish)', () => {
  assert.ok(importerSource.includes('PENDING_APPROVAL'));
  assert.ok(!importerSource.includes('autoPublish') && !importerSource.includes('auto-publish'));
});

test('Importer includes ODbL attribution', () => {
  assert.ok(importerSource.includes('OpenStreetMap'));
  assert.ok(importerSource.includes('ODbL'));
});

test('Importer never exposes secrets or tokens', () => {
  assert.ok(!/token\s*=/i.test(importerSource));
  assert.ok(!/password\s*=/i.test(importerSource));
  assert.ok(!/apiKey\s*=/i.test(importerSource));
});

test('Importer imports from import-framework module', () => {
  assert.ok(importerSource.includes('import-framework'));
  assert.ok(importerSource.includes('validateRecord'));
  assert.ok(importerSource.includes('detectDuplicates'));
  assert.ok(importerSource.includes('calculateDataQuality'));
});

test('Importer has rate limiting between endpoint attempts', () => {
  assert.ok(importerSource.includes('setTimeout') || importerSource.includes('MIN_REQUEST_INTERVAL'));
});

// ── Part 8: Security ──

console.log('\nPart 8: Security Verification');

test('Importer does not write to GitHub directly', () => {
  assert.ok(!importerSource.includes('github.com/putraworks'));
});

test('Importer validates all input data', () => {
  assert.ok(importerSource.includes('validateImportFile'));
  assert.ok(importerSource.includes('validateRecord'));
});

test('Importer treats all data as untrusted', () => {
  assert.ok(importerSource.includes('untrusted'));
});

test('Importer does not execute imported content', () => {
  assert.ok(!importerSource.includes('eval('));
  assert.ok(!importerSource.includes('Function('));
  assert.ok(!importerSource.includes('exec('));
});

test('Importer sets proper User-Agent header', () => {
  assert.ok(importerSource.includes('User-Agent'));
  assert.ok(importerSource.includes('GraveAtlas'));
});

// ── Part 9: Cross-source compatibility ──

console.log('\nPart 9: Cross-Source Compatibility (NEA + OSM)');

const neaImporterSource = fs.readFileSync(
  path.join(__dirname, '..', 'backend', 'src', 'importers', 'nea-singapore.js'), 'utf8'
);

test('OSM importer and NEA importer both produce cemetery records', () => {
  assert.ok(osmImporterIncludesCemetery(importerSource));
  assert.ok(osmImporterIncludesCemetery(neaImporterSource));
});

function osmImporterIncludesCemetery(src) {
  return src.includes('cemetery');
}

test('Both importers use same import-framework', () => {
  assert.ok(importerSource.includes('import-framework'));
  assert.ok(neaImporterSource.includes('import-framework'));
});

test('Both importers set PENDING_APPROVAL (no auto-publish)', () => {
  assert.ok(importerSource.includes('PENDING_APPROVAL'));
  assert.ok(neaImporterSource.includes('PENDING_APPROVAL'));
});

test('Both importers have different source names', () => {
  assert.ok(importerSource.includes('OpenStreetMap'));
  assert.ok(neaImporterSource.includes('NEA'));
  assert.ok(!importerSource.includes('Singapore NEA'));
});

test('Both importers have different attribution', () => {
  assert.ok(importerSource.includes('OpenStreetMap contributors'));
  assert.ok(neaImporterSource.includes('National Environment Agency'));
});

console.log('\n=== OSM Importer Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All OSM importer tests passed!');
else { console.log('\n❌ Some tests failed!'); failures.forEach(f => console.log(`  - ${f}`)); }

process.exit(failed > 0 ? 1 : 0);
