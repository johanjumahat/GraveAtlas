/**
 * Schema Change Detection (Part 14)
 *
 * Detects external API changes:
 * - renamed fields, removed fields, changed types
 * - changed endpoints, changed authentication, changed response structure
 *
 * Quarantines incompatible data rather than corrupting the database.
 */

// Store last-known schema per source (in-memory per worker)
const schemaHistory = new Map();

/**
 * Record the schema (field names + types) from a response.
 */
export function recordSchema(sourceId, fields) {
  const now = new Date().toISOString();
  const current = { sourceId, fields, recordedAt: now };
  const previous = schemaHistory.get(sourceId);

  if (previous) {
    const changes = detectChanges(previous.fields, fields);
    if (changes.length > 0) {
      current.changes = changes;
      current.requiresReview = changes.some(c => c.type === 'removed' || c.type === 'type_changed');
    }
  }

  schemaHistory.set(sourceId, current);
  return current;
}

/**
 * Detect changes between old and new schema fields.
 */
export function detectChanges(oldFields, newFields) {
  const changes = [];
  const oldKeys = Object.keys(oldFields || {});
  const newKeys = Object.keys(newFields || {});

  // Check for removed fields
  for (const key of oldKeys) {
    if (!newKeys.includes(key)) {
      changes.push({ field: key, type: 'removed', severity: 'high' });
    }
  }

  // Check for new fields
  for (const key of newKeys) {
    if (!oldKeys.includes(key)) {
      changes.push({ field: key, type: 'added', severity: 'low' });
    }
  }

  // Check for type changes
  for (const key of oldKeys) {
    if (newFields[key] !== undefined) {
      const oldType = oldFields[key];
      const newType = newFields[key];
      if (oldType !== newType) {
        changes.push({ field: key, type: 'type_changed', severity: 'high', from: oldType, to: newType });
      }
    }
  }

  return changes;
}

/**
 * Check if data should be quarantined due to schema changes.
 */
export function shouldQuarantine(schemaRecord) {
  return schemaRecord?.requiresReview === true;
}

/**
 * Get schema history for a source.
 */
export function getSchemaHistory(sourceId) {
  return schemaHistory.get(sourceId) || null;
}

/**
 * Extract field names and inferred types from a sample record.
 */
export function inferSchema(sampleRecord) {
  if (!sampleRecord || typeof sampleRecord !== 'object') return {};
  const fields = {};
  for (const [key, value] of Object.entries(sampleRecord)) {
    if (value === null) fields[key] = 'null';
    else if (Array.isArray(value)) fields[key] = 'array';
    else if (typeof value === 'object') fields[key] = 'object';
    else fields[key] = typeof value;
  }
  return fields;
}
