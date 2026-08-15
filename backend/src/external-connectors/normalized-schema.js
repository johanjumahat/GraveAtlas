/**
 * Normalized External Record Schema (Part 5)
 *
 * A canonical representation for records retrieved from external sources.
 * Every field is nullable — we never invent missing data.
 *
 * The schema is used by all connectors to produce a uniform shape
 * regardless of the source's native format.
 */

export const EXTERNAL_RECORD_FIELDS = [
  'externalRecordId',
  'personName',
  'givenNames',
  'familyName',
  'cemetery',
  'cemeteryId',
  'burialDate',
  'deathDate',
  'birthDate',
  'gravePlot',
  'section',
  'row',
  'latitude',
  'longitude',
  'recordUrl',
  'sourceOrganization',
  'sourceId',
  'sourceTimestamp',
  'sourceVersion',
  'provenance',
  'license',
  'confidence',
  'status'
];

export const CONFIDENCE_LEVELS = {
  HIGH: 'high',         // exact match on identifiers
  MEDIUM: 'medium',     // strong name+date match
  LOW: 'low',           // partial match, needs review
  UNVERIFIED: 'unverified'
};

export const IMPORT_STATES = [
  'DISCOVERED',
  'LICENSE_CHECK',
  'VALIDATED',
  'MATCH_REVIEW',
  'APPROVED',
  'IMPORTED',
  'VERIFIED',
  'REJECTED'
];

export const VALID_IMPORT_TRANSITIONS = {
  'DISCOVERED':     ['LICENSE_CHECK', 'REJECTED'],
  'LICENSE_CHECK':  ['VALIDATED', 'REJECTED'],
  'VALIDATED':      ['MATCH_REVIEW', 'REJECTED'],
  'MATCH_REVIEW':   ['APPROVED', 'REJECTED'],
  'APPROVED':        ['IMPORTED'],
  'IMPORTED':        ['VERIFIED'],
  'VERIFIED':        [],
  'REJECTED':        []
};

/**
 * Create a normalized external record from raw source data.
 * Only fills fields that are present in the source — never invents.
 */
export function createNormalizedRecord(rawFields) {
  const record = {};
  for (const field of EXTERNAL_RECORD_FIELDS) {
    record[field] = null;
  }
  if (rawFields && typeof rawFields === 'object') {
    for (const key of EXTERNAL_RECORD_FIELDS) {
      if (rawFields[key] !== undefined && rawFields[key] !== '') {
        record[key] = rawFields[key];
      }
    }
  }
  return record;
}

/**
 * Validate a normalized record for data quality (Part 25).
 * Returns { valid, errors, warnings }.
 */
export function validateNormalizedRecord(record) {
  const errors = [];
  const warnings = [];

  if (!record.externalRecordId) {
    warnings.push('Missing externalRecordId — deduplication may not work');
  }
  if (!record.sourceId) {
    errors.push('Missing sourceId — cannot trace provenance');
  }
  if (!record.sourceOrganization) {
    errors.push('Missing sourceOrganization — cannot display source badge');
  }
  if (!record.license) {
    warnings.push('Missing license — licensing review required before import');
  }
  if (record.latitude !== null) {
    if (record.latitude < -90 || record.latitude > 90) {
      errors.push(`Invalid latitude: ${record.latitude}`);
    }
  }
  if (record.longitude !== null) {
    if (record.longitude < -180 || record.longitude > 180) {
      errors.push(`Invalid longitude: ${record.longitude}`);
    }
  }
  if (record.birthDate && record.deathDate) {
    if (record.birthDate > record.deathDate) {
      warnings.push('birthDate is after deathDate — possible data error');
    }
  }
  if (!record.personName && !record.givenNames && !record.familyName) {
    warnings.push('No person name fields — record may be a cemetery-only entry');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check if an import state transition is valid.
 */
export function canTransitionImportState(from, to) {
  const allowed = VALID_IMPORT_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}
