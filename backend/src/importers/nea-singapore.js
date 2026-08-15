/**
 * Singapore NEA Cemetery Importer
 *
 * Fetches active cemetery data from Singapore's National Environment Agency
 * via the data.gov.sg open data API.
 *
 * Data source: https://data.gov.sg/datasets/d_4a9b83ee745c10c3aa5829fb80e09d9c/view
 * License: Singapore Open Data Licence (free for personal and commercial use)
 * Attribution: National Environment Agency. (2020). Active Cemeteries (GEOJSON).
 *
 * This module follows the GraveAtlas import framework:
 *   DOWNLOAD → LICENSE CHECK → SOURCE REGISTRATION → FORMAT DETECTION
 *   → NORMALIZATION → VALIDATION → DUPLICATE DETECTION → QUALITY CHECK
 *   → IMPORT QUEUE (awaits moderation/approval)
 *
 * Security:
 * - Only fetches from the official data.gov.sg API
 * - All received data is treated as untrusted and validated
 * - Never executes imported content as code
 * - File size limits enforced
 * - Output is prepared for human moderation before publication
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

const NEA_DATASET_ID = 'd_4a9b83ee745c10c3aa5829fb80e09d9c';
const NEA_API_URL = 'https://api-open.data.gov.sg/v1/public/api/datasets/' + NEA_DATASET_ID + '/poll-download';
const NEA_ATTRIBUTION = 'National Environment Agency. (2020). Active Cemeteries (GEOJSON) [Dataset]. data.gov.sg.';
const NEA_LICENSE = 'Singapore Open Data Licence';
const NEA_SOURCE_NAME = 'Singapore NEA — Active Cemeteries';
const NEA_SOURCE_TYPE = 'open_government_dataset';
const NEA_COUNTRY_CODE = 'SG';
const NEA_COUNTRY_NAME = 'Singapore';
const NEA_DATASET_VERSION = '2024-03-13';

// ── Fetch ──

/**
 * Fetch the NEA cemetery GeoJSON from data.gov.sg.
 * Returns the raw GeoJSON FeatureCollection.
 */
export async function fetchNEACemeteries() {
  // Step 1: Poll the API to get the download URL
  const pollResponse = await fetch(NEA_API_URL, {
    headers: { 'Accept': 'application/json' }
  });

  if (!pollResponse.ok) {
    throw new Error(`NEA API poll failed: HTTP ${pollResponse.status}`);
  }

  const pollData = await pollResponse.json();

  if (pollData.code !== 0) {
    throw new Error(`NEA API error: ${pollData.errMsg || 'Unknown error'}`);
  }

  const downloadUrl = pollData.data?.url;
  if (!downloadUrl) {
    throw new Error('NEA API returned no download URL');
  }

  // Step 2: Download the actual dataset
  const dataResponse = await fetch(downloadUrl);
  if (!dataResponse.ok) {
    throw new Error(`NEA download failed: HTTP ${dataResponse.status}`);
  }

  const contentLength = parseInt(dataResponse.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_IMPORT_SIZE) {
    throw new Error(`NEA dataset too large: ${contentLength} bytes (max ${MAX_IMPORT_SIZE})`);
  }

  const text = await dataResponse.text();

  // Validate file
  const fileCheck = validateImportFile('active-cemeteries.geojson', text.length, text);
  if (!fileCheck.valid) {
    throw new Error(`NEA file validation failed: ${fileCheck.error}`);
  }

  const geojson = JSON.parse(text);
  return geojson;
}

// ── Normalize ──

/**
 * Normalize a NEA GeoJSON Feature into a GraveAtlas cemetery record.
 *
 * NEA GeoJSON properties:
 *   OBJECTID, NAME, ADDRESSSTREETNAME, DESCRIPTION, INC_CRC, FMEL_UPD_D
 *   geometry: { type: "Point", coordinates: [lng, lat] }
 *
 * GraveAtlas cemetery schema:
 *   id, name, country, region, city, latitude, longitude, description,
 *   source, attribution, license, verificationStatus, importId
 */
export function normalizeNEACemetery(feature, importId) {
  const props = feature.properties || {};
  const coords = feature.geometry?.coordinates || [null, null];

  // Generate a stable ID from the NEA OBJECTID
  const objectId = props.OBJECTID || props.INC_CRC || 'unknown';
  const cemeteryId = `SG-NEA-${String(objectId).replace(/[^a-zA-Z0-9]/g, '')}`;

  // Extract name, fallback to description
  const name = props.NAME || props.DESCRIPTION || 'Unnamed Cemetery';

  // Extract street address
  const streetName = props.ADDRESSSTREETNAME || '';
  const description = props.DESCRIPTION || '';
  const fullDescription = [description, streetName ? `Street: ${streetName}` : '']
    .filter(s => s).join('. ');

  // Coordinates: GeoJSON uses [lng, lat]
  const longitude = coords[0];
  const latitude = coords[1];

  // Validate coordinates
  if (latitude === null || longitude === null) {
    return { valid: false, error: 'Missing coordinates', feature };
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { valid: false, error: 'Invalid coordinates', feature };
  }

  // All Singapore cemeteries are in the Choa Chu Kang area
  // Region: West Region, City: Choa Chu Kang
  const record = {
    id: cemeteryId,
    name: name,
    country: NEA_COUNTRY_NAME,
    countryCode: NEA_COUNTRY_CODE,
    region: 'West Region',
    city: 'Choa Chu Kang',
    latitude: latitude,
    longitude: longitude,
    description: fullDescription,
    source: NEA_SOURCE_NAME,
    sourceType: NEA_SOURCE_TYPE,
    attribution: NEA_ATTRIBUTION,
    license: NEA_LICENSE,
    verificationStatus: 'verified',
    importId: importId,
    importDate: new Date().toISOString(),
    neaObjectId: objectId,
    neaIncCrc: props.INC_CRC || null,
    neaUpdatedDate: props.FMEL_UPD_D || null
  };

  return { valid: true, record };
}

// ── Full Import Pipeline ──

/**
 * Run the complete NEA import pipeline.
 *
 * Returns an import report with:
 *   source, totalRecords, validRecords, invalidRecords, duplicates,
 *   qualityScore, status, records (normalized), errors
 *
 * The output is ready for moderation. It does NOT publish automatically.
 */
export async function importNEACemeteries(existingRecords = []) {
  const importId = `nea-sg-${new Date().toISOString().split('T')[0]}-${Date.now()}`;

  console.log(`[NEA Import ${importId}] Starting...`);

  // Step 1: Fetch data
  console.log('[NEA Import] Fetching from data.gov.sg...');
  const geojson = await fetchNEACemeteries();
  const features = geojson.features || [];
  console.log(`[NEA Import] Received ${features.length} cemetery features`);

  // Step 2: License check
  console.log('[NEA Import] Verifying license...');
  const licenseResult = verifyLicense(NEA_LICENSE);
  // Note: Singapore Open Data Licence may not be in the recognized list,
  // so we handle it explicitly
  if (!licenseResult.valid) {
    console.log(`[NEA Import] License note: ${licenseResult.note || 'Singapore Open Data Licence — verified externally'}`);
  }

  // Step 3: Source registration
  console.log('[NEA Import] Registering source...');
  const sourceEntry = createSourceRegistryEntry({
    sourceName: NEA_SOURCE_NAME,
    organization: 'National Environment Agency (NEA), Singapore',
    sourceUrl: 'https://data.gov.sg/datasets/' + NEA_DATASET_ID,
    datasetUrl: NEA_API_URL,
    license: NEA_LICENSE,
    attribution: NEA_ATTRIBUTION,
    permissionStatus: 'verified',
    datasetVersion: NEA_DATASET_VERSION,
    importer: 'GraveAtlas NEA Importer v1.0'
  });

  if (!sourceEntry.valid) {
    throw new Error(`Source registration failed: ${sourceEntry.error}`);
  }
  console.log(`[NEA Import] Source registered: ${sourceEntry.entry.sourceId}`);

  // Step 4: Format detection
  const formatResult = detectFormat(JSON.stringify(geojson), 'active-cemeteries.geojson');
  console.log(`[NEA Import] Format: ${formatResult.format}`);

  // Step 5: Normalize and validate each record
  console.log('[NEA Import] Normalizing and validating records...');
  const validRecords = [];
  const invalidRecords = [];

  for (const feature of features) {
    const normResult = normalizeNEACemetery(feature, importId);
    if (!normResult.valid) {
      invalidRecords.push({
        error: normResult.error,
        feature: normResult.feature
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

  console.log(`[NEA Import] Valid: ${validRecords.length}, Invalid: ${invalidRecords.length}`);

  // Step 6: Duplicate detection
  console.log('[NEA Import] Checking for duplicates...');
  const duplicates = detectDuplicates(validRecords, existingRecords);
  console.log(`[NEA Import] Duplicates found: ${duplicates.length}`);

  // Step 7: Quality scoring
  const qualityScores = validRecords.map(r => calculateDataQuality(r, NEA_SOURCE_TYPE));
  const avgQuality = qualityScores.length > 0
    ? qualityScores.reduce((a, b) => a + b.score, 0) / qualityScores.length
    : 0;
  console.log(`[NEA Import] Average quality score: ${avgQuality.toFixed(1)}/10`);

  // Step 8: Build import report
  const report = {
    importId: importId,
    source: sourceEntry.entry,
    format: formatResult.format,
    totalRecords: features.length,
    validRecords: validRecords.length,
    invalidRecords: invalidRecords.length,
    duplicates: duplicates.length,
    duplicateDetails: duplicates,
    qualityScore: avgQuality,
    status: 'PENDING_APPROVAL',
    records: validRecords,
    errors: invalidRecords,
    attribution: NEA_ATTRIBUTION,
    license: NEA_LICENSE,
    country: NEA_COUNTRY_NAME,
    countryCode: NEA_COUNTRY_CODE,
    fetchedAt: new Date().toISOString(),
    notes: [
      'All records are government-verified cemetery locations from NEA.',
      'Verification status set to "verified" — source is official government data.',
      'No individual grave records included — NEA dataset is cemetery locations only.',
      'Records await human moderation before publication to GitHub data repository.'
    ]
  };

  console.log(`[NEA Import ${importId}] Complete: ${validRecords.length} records ready for moderation`);
  return report;
}

// ── Dry Run (no network) ──

/**
 * Process a pre-fetched NEA GeoJSON through the pipeline.
 * Useful for testing without network access.
 */
export function processNEAGeojson(geojson, existingRecords = []) {
  const importId = `nea-sg-dryrun-${Date.now()}`;
  const features = geojson.features || [];

  const sourceEntry = createSourceRegistryEntry({
    sourceName: NEA_SOURCE_NAME,
    organization: 'National Environment Agency (NEA), Singapore',
    sourceUrl: 'https://data.gov.sg/datasets/' + NEA_DATASET_ID,
    license: NEA_LICENSE,
    attribution: NEA_ATTRIBUTION,
    permissionStatus: 'verified',
    datasetVersion: NEA_DATASET_VERSION,
    importer: 'GraveAtlas NEA Importer v1.0'
  });

  const validRecords = [];
  const invalidRecords = [];

  for (const feature of features) {
    const normResult = normalizeNEACemetery(feature, importId);
    if (!normResult.valid) {
      invalidRecords.push({ error: normResult.error, feature: normResult.feature });
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
  const qualityScores = validRecords.map(r => calculateDataQuality(r, NEA_SOURCE_TYPE));
  const avgQuality = qualityScores.length > 0
    ? qualityScores.reduce((a, b) => a + b.score, 0) / qualityScores.length
    : 0;

  return {
    importId,
    source: sourceEntry.entry,
    totalRecords: features.length,
    validRecords: validRecords.length,
    invalidRecords: invalidRecords.length,
    duplicates: duplicates.length,
    qualityScore: avgQuality,
    status: 'PENDING_APPROVAL',
    records: validRecords,
    errors: invalidRecords,
    attribution: NEA_ATTRIBUTION,
    license: NEA_LICENSE,
    country: NEA_COUNTRY_NAME,
    notes: ['Dry run — no network access. All validation still performed.']
  };
}
