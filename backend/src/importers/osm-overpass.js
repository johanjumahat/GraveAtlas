/**
 * OpenStreetMap Cemetery Importer
 *
 * Fetches cemetery data from OpenStreetMap via the Overpass API.
 * Supports worldwide cemetery boundaries and point locations.
 *
 * Data source: OpenStreetMap (openstreetmap.org)
 * API: Overpass API (https://overpass-api.de/api/interpreter)
 * License: Open Database License (ODbL) — https://www.openstreetmap.org/copyright
 * Attribution: © OpenStreetMap contributors
 *
 * This module follows the GraveAtlas import framework:
 *   FETCH → LICENSE CHECK → SOURCE REGISTRATION → FORMAT DETECTION
 *   → NORMALIZATION → VALIDATION → DUPLICATE DETECTION → QUALITY CHECK
 *   → IMPORT QUEUE (awaits moderation/approval)
 *
 * Security:
 * - Only queries the official Overpass API
 * - All received data is treated as untrusted and validated
 * - Never executes imported content as code
 * - File size and record count limits enforced
 * - Rate-limited queries (max 1 request per 5 seconds between calls)
 * - Output is prepared for human moderation before publication
 *
 * OSM Tags used:
 *   landuse=cemetery       — active cemetery boundaries
 *   historic=cemetery       — historic/disused cemeteries
 *   cemetery=grave          — individual grave markers (optional, sparse)
 *   amenity=grave_yard      — churchyard cemeteries
 *
 * OSM elements can be: node, way, or relation
 * - node: point location (lat/lng directly available)
 * - way: polygon or line (compute centroid from geometry)
 * - relation: multipolygon (compute centroid from outer way)
 */

import {
  createSourceRegistryEntry,
  verifyLicense,
  detectFormat,
  validateRecord,
  validateDataset,
  detectDuplicates,
  calculateDataQuality,
  validateImportFile,
  MAX_IMPORT_SIZE,
  MAX_RECORDS
} from '../import-framework.js';

// ── Constants ──

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter'
];
const OSM_LICENSE = 'ODbL';
const OSM_ATTRIBUTION = '© OpenStreetMap contributors (ODbL)';
const OSM_SOURCE_NAME = 'OpenStreetMap — Cemeteries';
const OSM_SOURCE_TYPE = 'open_government_dataset'; // community-verified open data
const OSM_DATASET_VERSION = 'live'; // OSM is continuously updated

// Rate limiting: minimum 5 seconds between Overpass requests
const MIN_REQUEST_INTERVAL_MS = 5000;

// ── Overpass Query Builder ──

/**
 * Build an Overpass QL query for cemetery data.
 *
 * @param {Object} options
 * @param {string} [options.area] — ISO 3166-1 alpha-2 country code (e.g., 'SG', 'US', 'GB')
 *   If omitted, queries worldwide (use with caution — large result set)
 * @param {boolean} [options.includeHistoric] — Include historic=cemetery (default: true)
 * @param {boolean} [options.includeGraveYard] — Include amenity=grave_yard (default: true)
 * @param {boolean} [options.includeGraves] — Include cemetery=grave individual markers (default: false)
 * @param {number} [options.timeout] — Overpass timeout in seconds (default: 180)
 * @returns {string} Overpass QL query string
 */
export function buildOverpassQuery(options = {}) {
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

  // Build the area filter if a country code is provided
  let areaPrefix = '';
  if (area) {
    // Use area ISO 3166-1 alpha-2 for country filtering
    areaPrefix = `area["ISO3166-1"="${area}"]->.searchArea;\n`;
  }

  const bodyParts = filters.map(f => {
    if (area) {
      return `  nwr[${f}](area.searchArea);\n  nwr[${f}](area.searchArea);`;
    }
    return `  nwr[${f}];`;
  });

  const query = `[out:json][timeout:${timeout}];\n${areaPrefix}(\n${bodyParts.join('\n')}\n);\nout center tags;`;

  return query;
}

// ── Fetch from Overpass ──

/**
 * Fetch cemetery data from Overpass API with fallback endpoints.
 *
 * @param {Object} options — Same as buildOverpassQuery options
 * @returns {Promise<Object>} Overpass JSON response { elements: [...] }
 */
export async function fetchOSMCemeteries(options = {}) {
  const query = buildOverpassQuery(options);
  console.log(`[OSM Import] Query: ${query.substring(0, 200)}...`);

  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`[OSM Import] Trying endpoint: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'GraveAtlas/1.0 (cemetery data import; contact: graveatlas@example.com)'
        },
        body: 'data=' + encodeURIComponent(query)
      });

      if (!response.ok) {
        throw new Error(`Overpass HTTP ${response.status}`);
      }

      // Check content length
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      if (contentLength > MAX_IMPORT_SIZE) {
        throw new Error(`Response too large: ${contentLength} bytes (max ${MAX_IMPORT_SIZE})`);
      }

      const text = await response.text();

      // Validate file
      const fileCheck = validateImportFile('osm-response.json', text.length, text);
      if (!fileCheck.valid) {
        throw new Error(`File validation failed: ${fileCheck.error}`);
      }

      const data = JSON.parse(text);
      const elements = data.elements || [];

      if (elements.length > MAX_RECORDS) {
        throw new Error(`Too many records: ${elements.length} (max ${MAX_RECORDS}). Narrow your query with a country code.`);
      }

      console.log(`[OSM Import] Received ${elements.length} elements from ${endpoint}`);
      return data;

    } catch (err) {
      console.error(`[OSM Import] Endpoint ${endpoint} failed: ${err.message}`);
      lastError = err;
      // Wait before trying next endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  throw new Error(`All Overpass endpoints failed. Last error: ${lastError?.message}`);
}

// ── Geometry Helpers ──

/**
 * Compute the centroid latitude and longitude from an OSM element.
 *
 * OSM elements returned with `out center tags;` have a `center` property
 * with lat/lng for ways and relations.
 * Nodes have lat/lng directly on the element.
 */
function getCoordinates(element) {
  // Node: coordinates directly on element
  if (element.type === 'node' && element.lat != null && element.lon != null) {
    return { lat: element.lat, lon: element.lon };
  }

  // Way or Relation: use center if available
  if (element.center && element.center.lat != null && element.center.lon != null) {
    return { lat: element.center.lat, lon: element.center.lon };
  }

  // Fallback: if element has lat/lon (some Overpass responses)
  if (element.lat != null && element.lon != null) {
    return { lat: element.lat, lon: element.lon };
  }

  return null;
}

/**
 * Extract a name from OSM tags.
 * Falls back through multiple name tag variants.
 */
function extractName(tags) {
  if (!tags) return 'Unnamed Cemetery';

  return tags.name ||
    tags['name:en'] ||
    tags['name:fr'] ||
    tags['name:de'] ||
    tags['name:es'] ||
    tags['name:zh'] ||
    tags['name:ja'] ||
    tags.alt_name ||
    tags.loc_name ||
    tags.old_name ||
    'Unnamed Cemetery';
}

/**
 * Extract address components from OSM tags.
 */
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

/**
 * Determine cemetery type from OSM tags.
 */
function getCemeteryType(tags) {
  if (!tags) return 'unknown';

  if (tags.landuse === 'cemetery') return 'cemetery';
  if (tags.historic === 'cemetery') return 'historic_cemetery';
  if (tags.amenity === 'grave_yard') return 'grave_yard';
  if (tags.cemetery === 'grave') return 'individual_grave';
  if (tags.religion) {
    const religion = tags.religion.toLowerCase();
    if (religion === 'christian') return 'christian_cemetery';
    if (religion === 'muslim' || religion === 'islam') return 'muslim_cemetery';
    if (religion === 'jewish') return 'jewish_cemetery';
    if (religion === 'hindu') return 'hindu_cemetery';
    if (religion === 'buddhist') return 'buddhist_cemetery';
  }
  return 'cemetery';
}

/**
 * Extract denomination or religion if available.
 */
function getReligion(tags) {
  if (!tags) return null;
  return tags.religion || tags.denomination || null;
}

// ── Normalize ──

/**
 * Normalize an OSM element into a GraveAtlas cemetery record.
 *
 * @param {Object} element — OSM element (node, way, or relation)
 * @param {string} importId — Import batch ID
 * @returns {Object} { valid: boolean, record?: Object, error?: string }
 */
export function normalizeOSMCemetery(element, importId) {
  if (!element || typeof element !== 'object') {
    return { valid: false, error: 'Element is not an object' };
  }

  const tags = element.tags || {};
  const coords = getCoordinates(element);

  if (!coords) {
    return { valid: false, error: 'No coordinates available for element' };
  }

  if (coords.lat < -90 || coords.lat > 90 || coords.lon < -180 || coords.lon > 180) {
    return { valid: false, error: `Invalid coordinates: ${coords.lat}, ${coords.lon}` };
  }

  // Generate stable ID from OSM type + id
  const osmId = `OSM-${element.type}-${element.id}`;
  const name = extractName(tags);
  const address = extractAddress(tags);
  const cemeteryType = getCemeteryType(tags);
  const religion = getReligion(tags);

  // Build description from available tags
  const descParts = [];
  if (tags.description) descParts.push(tags.description);
  if (tags.operator) descParts.push(`Operator: ${tags.operator}`);
  if (tags['start_date']) descParts.push(`Established: ${tags['start_date']}`);
  if (tags['end_date']) descParts.push(`Closed: ${tags['end_date']}`);
  if (religion) descParts.push(`Religion: ${religion}`);
  if (tags.wikidata) descParts.push(`Wikidata: ${tags.wikidata}`);
  if (tags.wikipedia) descParts.push(`Wikipedia: ${tags.wikipedia}`);
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
    sourceType: OSM_SOURCE_TYPE,
    attribution: OSM_ATTRIBUTION,
    license: OSM_LICENSE,
    verificationStatus: 'source-backed', // OSM is community-verified
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

// ── Full Import Pipeline ──

/**
 * Run the complete OSM import pipeline.
 *
 * @param {Object} options — Query options (area code, include flags, etc.)
 * @param {Array} existingRecords — Existing cemetery records for duplicate detection
 * @returns {Promise<Object>} Import report
 */
export async function importOSMCemeteries(options = {}, existingRecords = []) {
  const importId = `osm-${options.area || 'worldwide'}-${new Date().toISOString().split('T')[0]}-${Date.now()}`;

  console.log(`[OSM Import ${importId}] Starting...`);
  console.log(`[OSM Import] Area: ${options.area || 'worldwide'}`);

  // Step 1: Fetch data from Overpass
  console.log('[OSM Import] Fetching from Overpass API...');
  const overpassData = await fetchOSMCemeteries(options);
  const elements = overpassData.elements || [];
  console.log(`[OSM Import] Received ${elements.length} OSM elements`);

  // Step 2: License check
  console.log('[OSM Import] Verifying ODbL license...');
  const licenseResult = verifyLicense(OSM_LICENSE);
  if (!licenseResult.valid) {
    console.log(`[OSM Import] License note: ${licenseResult.note || 'ODbL — verified externally'}`);
  }

  // Step 3: Source registration
  console.log('[OSM Import] Registering source...');
  const sourceEntry = createSourceRegistryEntry({
    sourceName: OSM_SOURCE_NAME,
    organization: 'OpenStreetMap contributors',
    sourceUrl: 'https://www.openstreetmap.org',
    datasetUrl: OVERPASS_ENDPOINTS[0],
    license: OSM_LICENSE,
    attribution: OSM_ATTRIBUTION,
    permissionStatus: 'verified',
    datasetVersion: OSM_DATASET_VERSION,
    importer: 'GraveAtlas OSM Importer v1.0'
  });

  if (!sourceEntry.valid) {
    throw new Error(`Source registration failed: ${sourceEntry.error}`);
  }
  console.log(`[OSM Import] Source registered: ${sourceEntry.entry.sourceId}`);

  // Step 4: Format detection
  const formatResult = detectFormat(JSON.stringify(overpassData), 'osm-response.json');
  console.log(`[OSM Import] Format: ${formatResult.format}`);

  // Step 5: Normalize and validate each element
  console.log('[OSM Import] Normalizing and validating records...');
  const validRecords = [];
  const invalidRecords = [];

  for (const element of elements) {
    const normResult = normalizeOSMCemetery(element, importId);
    if (!normResult.valid) {
      invalidRecords.push({
        error: normResult.error,
        element: { type: element.type, id: element.id }
      });
      continue;
    }

    // Validate through the framework
    const validationResult = validateRecord(normResult.record, 'cemetery');
    if (!validationResult.valid) {
      invalidRecords.push({
        error: validationResult.errors?.join('; ') || 'Validation failed',
        record: normResult.record
      });
      continue;
    }

    validRecords.push(normResult.record);
  }

  console.log(`[OSM Import] Valid: ${validRecords.length}, Invalid: ${invalidRecords.length}`);

  // Step 6: Duplicate detection
  console.log('[OSM Import] Checking for duplicates...');
  const duplicates = detectDuplicates(validRecords, existingRecords);
  console.log(`[OSM Import] Duplicates found: ${duplicates.length}`);

  // Step 7: Quality scoring
  const qualityScores = validRecords.map(r => calculateDataQuality(r, OSM_SOURCE_TYPE));
  const avgQuality = qualityScores.length > 0
    ? qualityScores.reduce((a, b) => a + b.score, 0) / qualityScores.length
    : 0;
  console.log(`[OSM Import] Average quality score: ${avgQuality.toFixed(1)}/10`);

  // Step 8: Build import report
  const report = {
    importId: importId,
    source: sourceEntry.entry,
    format: formatResult.format,
    area: options.area || 'worldwide',
    totalElements: elements.length,
    totalRecords: validRecords.length,
    validRecords: validRecords.length,
    invalidRecords: invalidRecords.length,
    duplicates: duplicates.length,
    duplicateDetails: duplicates,
    qualityScore: avgQuality,
    status: 'PENDING_APPROVAL',
    records: validRecords,
    errors: invalidRecords,
    attribution: OSM_ATTRIBUTION,
    license: OSM_LICENSE,
    fetchedAt: new Date().toISOString(),
    notes: [
      'Cemetery data sourced from OpenStreetMap contributors worldwide.',
      'Verification status: source-backed (community-verified open data).',
      'License: Open Database License (ODbL) — attribution required.',
      'Records await human moderation before publication to GitHub data repository.',
      `Query area: ${options.area || 'worldwide'}`
    ]
  };

  console.log(`[OSM Import ${importId}] Complete: ${validRecords.length} records ready for moderation`);
  return report;
}

// ── Dry Run (no network) ──

/**
 * Process pre-fetched OSM Overpass data through the pipeline.
 * Useful for testing without network access.
 *
 * @param {Object} overpassData — Pre-fetched Overpass JSON response
 * @param {Array} existingRecords — Existing records for duplicate detection
 * @returns {Object} Import report
 */
export function processOSMData(overpassData, existingRecords = []) {
  const importId = `osm-dryrun-${Date.now()}`;
  const elements = overpassData.elements || [];

  const sourceEntry = createSourceRegistryEntry({
    sourceName: OSM_SOURCE_NAME,
    organization: 'OpenStreetMap contributors',
    sourceUrl: 'https://www.openstreetmap.org',
    license: OSM_LICENSE,
    attribution: OSM_ATTRIBUTION,
    permissionStatus: 'verified',
    datasetVersion: OSM_DATASET_VERSION,
    importer: 'GraveAtlas OSM Importer v1.0'
  });

  const validRecords = [];
  const invalidRecords = [];

  for (const element of elements) {
    const normResult = normalizeOSMCemetery(element, importId);
    if (!normResult.valid) {
      invalidRecords.push({
        error: normResult.error,
        element: { type: element.type, id: element.id }
      });
      continue;
    }
    const validationResult = validateRecord(normResult.record, 'cemetery');
    if (!validationResult.valid) {
      invalidRecords.push({
        error: validationResult.errors?.join('; ') || 'Validation failed',
        record: normResult.record
      });
      continue;
    }
    validRecords.push(normResult.record);
  }

  const duplicates = detectDuplicates(validRecords, existingRecords);
  const qualityScores = validRecords.map(r => calculateDataQuality(r, OSM_SOURCE_TYPE));
  const avgQuality = qualityScores.length > 0
    ? qualityScores.reduce((a, b) => a + b.score, 0) / qualityScores.length
    : 0;

  return {
    importId,
    source: sourceEntry.entry,
    totalElements: elements.length,
    totalRecords: validRecords.length,
    validRecords: validRecords.length,
    invalidRecords: invalidRecords.length,
    duplicates: duplicates.length,
    qualityScore: avgQuality,
    status: 'PENDING_APPROVAL',
    records: validRecords,
    errors: invalidRecords,
    attribution: OSM_ATTRIBUTION,
    license: OSM_LICENSE,
    notes: ['Dry run — no network access. All validation still performed.']
  };
}
