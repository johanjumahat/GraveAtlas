/**
 * Import Framework — controlled pipeline for legitimate open-data imports.
 *
 * Flow: SOURCE → DOWNLOAD → LICENSE CHECK → SOURCE REGISTRATION → FORMAT DETECTION
 *       → NORMALIZATION → VALIDATION → DUPLICATE DETECTION → QUALITY CHECK
 *       → IMPORT QUEUE → MODERATION → PUBLISH
 *
 * This module provides the core logic for each stage. Actual data I/O
 * (reading files, writing to GitHub) is handled by the caller.
 *
 * Security:
 * - Never executes imported files as code
 * - All input is treated as untrusted data
 * - File size limits enforced
 * - Only structured formats accepted (CSV, JSON, GeoJSON, XML)
 */

// ── Constants ──

const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_RECORDS = 10000;
const MAX_FIELD_LENGTH = 5000;

const IMPORT_STATUSES = [
  'CREATED',
  'LICENSE_REVIEW',
  'VALIDATING',
  'DUPLICATE_CHECK',
  'PENDING_APPROVAL',
  'APPROVED',
  'IMPORTING',
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'REJECTED',
  'ROLLED_BACK'
];

const VALID_TRANSITIONS = {
  'CREATED': ['LICENSE_REVIEW', 'REJECTED'],
  'LICENSE_REVIEW': ['VALIDATING', 'REJECTED'],
  'VALIDATING': ['DUPLICATE_CHECK', 'FAILED', 'REJECTED'],
  'DUPLICATE_CHECK': ['PENDING_APPROVAL', 'FAILED', 'REJECTED'],
  'PENDING_APPROVAL': ['APPROVED', 'REJECTED'],
  'APPROVED': ['IMPORTING'],
  'IMPORTING': ['COMPLETED', 'PARTIAL', 'FAILED'],
  'COMPLETED': [],
  'PARTIAL': ['ROLLED_BACK'],
  'FAILED': ['ROLLED_BACK'],
  'REJECTED': [],
  'ROLLED_BACK': []
};

const RECOGNIZED_LICENSES = [
  'CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-ND', 'CC-BY-NC', 'CC-BY-NC-SA',
  'ODbL', 'PDDL', 'Public Domain', 'public-domain',
  'OGTSL', 'NDDL'
];

const SOURCE_TYPES = [
  'official_cemetery_source',
  'public_historical_source',
  'open_government_dataset',
  'community_contribution',
  'unverified_source'
];

const DATA_QUALITY_LEVELS = {
  SOURCE_QUALITY: {
    official_cemetery_source: 5,
    public_historical_source: 4,
    open_government_dataset: 4,
    community_contribution: 2,
    unverified_source: 1
  }
};

// ── Source Registry ──

/**
 * Create a source registry entry.
 */
export function createSourceRegistryEntry(params) {
  const {
    sourceName, organization, sourceUrl, datasetUrl,
    license, attribution, permissionStatus, datasetVersion,
    publicationDate, importer
  } = params;

  if (!sourceName || typeof sourceName !== 'string') {
    return { valid: false, error: 'Source name is required' };
  }

  if (!license) {
    return { valid: false, error: 'License is required — cannot import without documented permission', status: 'LICENSE_REVIEW_REQUIRED' };
  }

  const recognized = RECOGNIZED_LICENSES.some(l =>
    license.toUpperCase().includes(l.toUpperCase()) || license.toLowerCase() === l.toLowerCase()
  );

  if (!recognized) {
    return {
      valid: false,
      error: `Unrecognized license: ${license}. Marking for manual review.`,
      status: 'LICENSE_REVIEW_REQUIRED'
    };
  }

  return {
    valid: true,
    entry: {
      sourceId: generateSourceId(),
      sourceName,
      organization: organization || null,
      sourceUrl: sourceUrl || null,
      datasetUrl: datasetUrl || null,
      license,
      licenseRecognized: recognized,
      attribution: attribution || null,
      permissionStatus: permissionStatus || 'PENDING_REVIEW',
      datasetVersion: datasetVersion || null,
      publicationDate: publicationDate || null,
      importDate: new Date().toISOString(),
      importer: importer || null,
      recordCount: 0,
      status: 'PENDING_REVIEW'
    }
  };
}

// ── License Verification ──

/**
 * Verify a license is recognized and compatible with GraveAtlas.
 */
export function verifyLicense(license) {
  if (!license || typeof license !== 'string') {
    return { valid: false, reason: 'No license specified', action: 'LICENSE_REVIEW_REQUIRED' };
  }

  const normalized = license.trim();
  const matched = RECOGNIZED_LICENSES.find(l =>
    normalized.toUpperCase() === l.toUpperCase() ||
    normalized.toUpperCase().includes(l.toUpperCase())
  );

  if (!matched) {
    return { valid: false, reason: `Unrecognized license: ${normalized}`, action: 'LICENSE_REVIEW_REQUIRED' };
  }

  // ODbL requires attribution and share-alike
  const requiresAttribution = !['CC0', 'Public Domain', 'public-domain', 'PDDL'].includes(matched);

  return {
    valid: true,
    license: matched,
    requiresAttribution,
    shareAlike: ['CC-BY-SA', 'CC-BY-NC-SA', 'ODbL'].includes(matched)
  };
}

// ── Format Detection ──

/**
 * Detect the format of a dataset based on content and optional filename.
 */
export function detectFormat(content, filename) {
  if (!content || (typeof content !== 'string' && !Buffer.isBuffer(content))) {
    return { format: null, error: 'No content provided' };
  }

  const text = typeof content === 'string' ? content : content.toString('utf8');
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';

  // GeoJSON detection
  try {
    const parsed = JSON.parse(text);
    if (parsed.type === 'FeatureCollection' || parsed.type === 'Feature') {
      return { format: 'geojson', error: null };
    }
    if (Array.isArray(parsed) || typeof parsed === 'object') {
      return { format: 'json', error: null };
    }
  } catch (e) {
    // Not JSON — try CSV or XML
  }

  // CSV detection
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length > 0 && lines[0].includes(',')) {
    const commaCount = (lines[0].match(/,/g) || []).length;
    if (commaCount >= 1) {
      return { format: 'csv', error: null };
    }
  }

  // XML detection
  if (text.trim().startsWith('<')) {
    return { format: 'xml', error: null };
  }

  return { format: null, error: 'Unable to detect format. Supported: CSV, JSON, GeoJSON, XML' };
}

// ── Validation ──

/**
 * Validate a single record against the GraveAtlas canonical schema.
 */
export function validateRecord(record, type = 'grave') {
  const errors = [];
  const warnings = [];

  if (!record || typeof record !== 'object') {
    return { valid: false, errors: ['Record is not an object'], warnings: [] };
  }

  // Required fields
  if (!record.id && !record.name) {
    errors.push('Missing required field: id or name');
  }

  // Coordinate validation
  if (record.latitude !== null && record.latitude !== undefined) {
    const lat = parseFloat(record.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push(`Invalid latitude: ${record.latitude}`);
    }
  }
  if (record.longitude !== null && record.longitude !== undefined) {
    const lon = parseFloat(record.longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) {
      errors.push(`Invalid longitude: ${record.longitude}`);
    }
  }

  // Date validation
  if (record.birthDate && !isValidDate(record.birthDate)) {
    warnings.push(`Invalid birthDate format: ${record.birthDate}`);
  }
  if (record.deathDate && !isValidDate(record.deathDate)) {
    warnings.push(`Invalid deathDate format: ${record.deathDate}`);
  }

  // Country code validation
  if (record.countryCode && !/^[A-Z]{2}$/.test(record.countryCode)) {
    warnings.push(`Invalid country code: ${record.countryCode}`);
  }

  // URL validation
  if (record.url && !/^https?:\/\//.test(record.url)) {
    warnings.push(`Invalid URL: ${record.url}`);
  }

  // Field length checks
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && value.length > MAX_FIELD_LENGTH) {
      errors.push(`Field ${key} exceeds max length (${MAX_FIELD_LENGTH})`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate an entire dataset.
 */
export function validateDataset(records) {
  if (!Array.isArray(records)) {
    return { valid: false, totalRecords: 0, validRecords: 0, invalidRecords: 0, errors: ['Dataset is not an array'], warnings: [] };
  }

  if (records.length > MAX_RECORDS) {
    return { valid: false, totalRecords: records.length, validRecords: 0, invalidRecords: records.length, errors: [`Dataset exceeds max records (${MAX_RECORDS})`], warnings: [] };
  }

  const results = records.map(r => validateRecord(r));
  const validRecords = results.filter(r => r.valid).length;
  const invalidRecords = results.filter(r => !r.valid).length;
  const allErrors = results.filter(r => !r.valid).flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);

  return {
    valid: invalidRecords === 0,
    totalRecords: records.length,
    validRecords,
    invalidRecords,
    errors: allErrors,
    warnings: allWarnings,
    results
  };
}

// ── Duplicate Detection ──

const DUPLICATE_CLASSIFICATIONS = ['EXACT_DUPLICATE', 'HIGH_CONFIDENCE_MATCH', 'POSSIBLE_MATCH', 'NEW_RECORD'];

/**
 * Detect duplicates between imported records and existing records.
 */
export function detectDuplicates(importedRecords, existingRecords) {
  const results = [];

  for (const imported of importedRecords) {
    let bestMatch = null;
    let bestScore = 0;

    for (const existing of existingRecords) {
      const score = calculateDuplicateScore(imported, existing);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = existing;
      }
    }

    let classification;
    if (bestScore >= 0.95) classification = 'EXACT_DUPLICATE';
    else if (bestScore >= 0.80) classification = 'HIGH_CONFIDENCE_MATCH';
    else if (bestScore >= 0.50) classification = 'POSSIBLE_MATCH';
    else classification = 'NEW_RECORD';

    results.push({
      importedRecord: imported,
      existingRecord: bestMatch,
      duplicateScore: bestScore,
      classification
    });
  }

  return {
    results,
    exactDuplicates: results.filter(r => r.classification === 'EXACT_DUPLICATE').length,
    highConfidenceMatches: results.filter(r => r.classification === 'HIGH_CONFIDENCE_MATCH').length,
    possibleMatches: results.filter(r => r.classification === 'POSSIBLE_MATCH').length,
    newRecords: results.filter(r => r.classification === 'NEW_RECORD').length
  };
}

/**
 * Calculate a duplicate score between two records (0.0 to 1.0).
 */
function calculateDuplicateScore(a, b) {
  let score = 0;
  let weight = 0;

  // Name match (weight: 30)
  if (a.name && b.name) {
    const nameSimilarity = stringSimilarity(a.name.toLowerCase(), b.name.toLowerCase());
    score += nameSimilarity * 30;
    weight += 30;
  }

  // Cemetery match (weight: 20)
  const aCem = a.cemetery || a.cemeteryName;
  const bCem = b.cemetery || b.cemeteryName;
  if (aCem && bCem) {
    score += (aCem.toLowerCase() === bCem.toLowerCase() ? 1 : 0) * 20;
    weight += 20;
  }

  // Birth date match (weight: 15)
  if (a.birthDate && b.birthDate) {
    score += (a.birthDate === b.birthDate ? 1 : 0) * 15;
    weight += 15;
  }

  // Death date match (weight: 15)
  if (a.deathDate && b.deathDate) {
    score += (a.deathDate === b.deathDate ? 1 : 0) * 15;
    weight += 15;
  }

  // Coordinates match (weight: 10)
  if (a.latitude && b.latitude && a.longitude && b.longitude) {
    const dist = haversineDistance(a.latitude, a.longitude, b.latitude, b.longitude);
    score += (dist < 50 ? 1 : dist < 500 ? 0.5 : 0) * 10;
    weight += 10;
  }

  // Country match (weight: 10)
  if (a.countryCode && b.countryCode) {
    score += (a.countryCode === b.countryCode ? 1 : 0) * 10;
    weight += 10;
  }

  return weight > 0 ? score / weight : 0;
}

function stringSimilarity(s1, s2) {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1;
  const dist = levenshtein(s1, s2);
  return (longer.length - dist) / longer.length;
}

function levenshtein(s1, s2) {
  const dp = Array(s2.length + 1).fill(0).map(() => Array(s1.length + 1).fill(0));
  for (let i = 0; i <= s1.length; i++) dp[0][i] = i;
  for (let j = 0; j <= s2.length; j++) dp[j][0] = j;
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      if (s1[i-1] === s2[j-1]) {
        dp[j][i] = dp[j-1][i-1];
      } else {
        dp[j][i] = Math.min(dp[j-1][i] + 1, dp[j][i-1] + 1, dp[j-1][i-1] + 1);
      }
    }
  }
  return dp[s2.length][s1.length];
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Data Quality Score ──

/**
 * Calculate a deterministic data quality score for a record.
 * Returns 0-10 scale. This is NOT a "truth score."
 */
export function calculateDataQuality(record, sourceQuality = null) {
  let score = 0;

  // Source available (2 points)
  if (record.sourceRefs && record.sourceRefs.length > 0) score += 2;

  // Valid coordinates (2 points)
  if (record.latitude && record.longitude) {
    const lat = parseFloat(record.latitude);
    const lon = parseFloat(record.longitude);
    if (!isNaN(lat) && lat >= -90 && lat <= 90 && !isNaN(lon) && lon >= -180 && lon <= 180) {
      score += 2;
    }
  }

  // Complete cemetery information (1.5 points)
  if (record.cemeteryId || record.cemeteryName || record.cemetery) score += 1.5;

  // Complete dates (1.5 points)
  if (record.birthDate) score += 0.75;
  if (record.deathDate) score += 0.75;

  // Verified status (2 points)
  if (record.verificationStatus === 'verified') score += 2;

  // Source quality bonus (1 point)
  if (sourceQuality && DATA_QUALITY_LEVELS.SOURCE_QUALITY[sourceQuality]) {
    score += DATA_QUALITY_LEVELS.SOURCE_QUALITY[sourceQuality] * 0.2;
  }

  return Math.min(10, Math.round(score * 10) / 10);
}

// ── Import Status Transitions ──

/**
 * Validate a status transition for an import.
 */
export function validateTransition(fromStatus, toStatus) {
  if (!IMPORT_STATUSES.includes(fromStatus)) {
    return { valid: false, error: `Invalid from status: ${fromStatus}` };
  }
  if (!IMPORT_STATUSES.includes(toStatus)) {
    return { valid: false, error: `Invalid to status: ${toStatus}` };
  }
  const allowed = VALID_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    return { valid: false, error: `Invalid transition: ${fromStatus} → ${toStatus}. Allowed: ${allowed.join(', ') || 'none'}` };
  }
  return { valid: true };
}

// ── Import Report ──

/**
 * Generate an import report.
 */
export function generateImportReport(params) {
  const {
    importId, source, datasetVersion, startedAt, completedAt,
    recordsRead, recordsValid, recordsRejected,
    duplicatesDetected, recordsImported, warnings, errors
  } = params;

  return {
    importId: importId || generateSourceId(),
    source: source || 'Unknown',
    datasetVersion: datasetVersion || null,
    startedAt: startedAt || new Date().toISOString(),
    completedAt: completedAt || new Date().toISOString(),
    recordsRead: recordsRead || 0,
    recordsValid: recordsValid || 0,
    recordsRejected: recordsRejected || 0,
    duplicatesDetected: duplicatesDetected || 0,
    recordsImported: recordsImported || 0,
    warnings: warnings || [],
    errors: errors || [],
    success: (errors || []).length === 0 && (recordsRejected || 0) === 0,
    partialSuccess: (errors || []).length === 0 && (recordsRejected || 0) > 0 && (recordsImported || 0) > 0
  };
}

// ── Import Preview ──

/**
 * Generate a preview of an import for administrator review.
 */
export function generateImportPreview(source, dataset, validation, duplicates) {
  return {
    source: source.sourceName || 'Unknown',
    license: source.license || 'Unknown',
    datasetVersion: source.datasetVersion || null,
    totalRecords: dataset.totalRecords || 0,
    validRecords: validation.validRecords || 0,
    invalidRecords: validation.invalidRecords || 0,
    possibleDuplicates: duplicates.exactDuplicates + duplicates.highConfidenceMatches || 0,
    warnings: validation.warnings || [],
    errors: validation.errors || [],
    estimatedFinalRecords: (validation.validRecords || 0) - (duplicates.exactDuplicates || 0),
    sampleRecords: (dataset.records || []).slice(0, 5)
  };
}

// ── Security ──

/**
 * Validate a file is safe for import.
 */
export function validateImportFile(filename, fileSize, content) {
  if (!filename) return { valid: false, error: 'No filename provided' };
  if (fileSize > MAX_IMPORT_SIZE) return { valid: false, error: `File too large (max ${MAX_IMPORT_SIZE / 1024 / 1024}MB)` };

  const ext = filename.split('.').pop().toLowerCase();
  const allowedExts = ['csv', 'json', 'geojson', 'xml', 'txt'];
  if (!allowedExts.includes(ext)) {
    return { valid: false, error: `Unsupported file type: ${ext}. Allowed: ${allowedExts.join(', ')}` };
  }

  // Check for script-like content
  if (typeof content === 'string') {
    const suspicious = ['<script', '<%', '<?php', '#!/', 'javascript:', 'eval(', 'Function('];
    for (const pattern of suspicious) {
      if (content.toLowerCase().includes(pattern)) {
        return { valid: false, error: `Suspicious content detected: ${pattern}` };
      }
    }
  }

  return { valid: true };
}

// ── Helpers ──

function isValidDate(str) {
  if (!str || str === 'unknown') return true;
  if (/^\d{4}$/.test(str)) return true;
  if (/^\d{4}-\d{2}$/.test(str)) return true;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return !isNaN(new Date(str).getTime());
  if (/^approx_/.test(str)) return true;
  return false;
}

function generateSourceId() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return 'source_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Exports ──

export {
  IMPORT_STATUSES,
  VALID_TRANSITIONS,
  RECOGNIZED_LICENSES,
  SOURCE_TYPES,
  DUPLICATE_CLASSIFICATIONS,
  MAX_IMPORT_SIZE,
  MAX_RECORDS
};
