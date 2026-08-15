/**
 * Data Quality Validation (Part 25)
 *
 * Validates external records for:
 * - malformed dates, invalid coordinates, impossible values
 * - duplicate identifiers, missing required source fields
 * - schema violations
 *
 * Does NOT silently repair uncertain historical values.
 */

/**
 * Validate a date string.
 */
export function validateDate(dateStr, fieldName) {
  if (!dateStr) return { valid: true }; // null is OK — fields are nullable
  const errors = [];

  // ISO 8601 check
  const isoDate = /^\d{4}(-\d{2}(-\d{2})?)?(T\d{2}:\d{2}(:\d{2})?Z?)?$/.test(dateStr);
  const yearOnly = /^\d{4}$/.test(dateStr);
  const monthYear = /^\d{4}-\d{2}$/.test(dateStr);

  if (!isoDate && !yearOnly && !monthYear) {
    errors.push(`${fieldName}: malformed date "${dateStr}"`);
    return { valid: false, errors };
  }

  // Check for impossible dates
  const year = parseInt(dateStr.substring(0, 4));
  if (isNaN(year)) {
    errors.push(`${fieldName}: unparseable year in "${dateStr}"`);
  } else if (year < 1500 || year > 2100) {
    errors.push(`${fieldName}: year ${year} is outside reasonable range (1500-2100)`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate coordinates.
 */
export function validateCoordinates(lat, lon) {
  const errors = [];
  if (lat === null && lon === null) return { valid: true };
  if (lat === null || lon === null) {
    errors.push('Only one of lat/lon provided — both required for valid location');
  }
  if (lat !== null && (lat < -90 || lat > 90)) {
    errors.push(`Invalid latitude: ${lat} (must be -90 to 90)`);
  }
  if (lon !== null && (lon < -180 || lon > 180)) {
    errors.push(`Invalid longitude: ${lon} (must be -180 to 180)`);
  }
  if (lat === 0 && lon === 0) {
    errors.push('Coordinates are (0,0) — likely null island, probably missing data');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Check for duplicate external record IDs within a batch.
 */
export function checkDuplicateIds(records) {
  const seen = new Map();
  const duplicates = [];
  for (const record of records) {
    const id = record.externalRecordId;
    if (!id) continue;
    if (seen.has(id)) {
      duplicates.push({ id, firstIndex: seen.get(id), duplicateIndex: records.indexOf(record) });
    } else {
      seen.set(id, records.indexOf(record));
    }
  }
  return { hasDuplicates: duplicates.length > 0, duplicates };
}

/**
 * Full data quality check on a batch of records.
 */
export function validateBatch(records) {
  const errors = [];
  const warnings = [];

  // Duplicate IDs
  const dupCheck = checkDuplicateIds(records);
  if (dupCheck.hasDuplicates) {
    errors.push(`${dupCheck.duplicates.length} duplicate external record IDs detected`);
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Required source fields
    if (!record.sourceId) {
      errors.push(`Record ${i}: missing sourceId`);
    }
    if (!record.sourceOrganization) {
      errors.push(`Record ${i}: missing sourceOrganization`);
    }

    // Date validation
    const birthCheck = validateDate(record.birthDate, 'birthDate');
    if (!birthCheck.valid) errors.push(`Record ${i}: ${birthCheck.errors.join(', ')}`);

    const deathCheck = validateDate(record.deathDate, 'deathDate');
    if (!deathCheck.valid) errors.push(`Record ${i}: ${deathCheck.errors.join(', ')}`);

    const burialCheck = validateDate(record.burialDate, 'burialDate');
    if (!burialCheck.valid) errors.push(`Record ${i}: ${burialCheck.errors.join(', ')}`);

    // Coordinate validation
    const coordCheck = validateCoordinates(record.latitude, record.longitude);
    if (!coordCheck.valid) errors.push(`Record ${i}: ${coordCheck.errors.join(', ')}`);

    // Impossible values
    if (record.birthDate && record.deathDate) {
      if (record.birthDate > record.deathDate) {
        warnings.push(`Record ${i}: birthDate after deathDate`);
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    recordCount: records.length
  };
}
