/**
 * Provenance Tracking (Part 8)
 *
 * Every imported/external record must retain a complete chain:
 *   SOURCE → API → EXTERNAL RECORD ID → RETRIEVAL TIME → TRANSFORMATION → GRAVEATLAS REPRESENTATION
 *
 * Never lose the original source reference.
 */

/**
 * Create a provenance record for an external record.
 */
export function createProvenance({ sourceId, sourceName, apiEndpoint, externalRecordId, retrievalTime, transformation, graveAtlasId }) {
  return {
    sourceId,
    sourceName,
    apiEndpoint,
    externalRecordId,
    retrievalTime: retrievalTime || new Date().toISOString(),
    transformation: transformation || 'none',
    graveAtlasId: graveAtlasId || null,
    chain: [
      { step: 'SOURCE', value: sourceId },
      { step: 'API', value: apiEndpoint },
      { step: 'EXTERNAL_RECORD_ID', value: externalRecordId },
      { step: 'RETRIEVAL_TIME', value: retrievalTime || new Date().toISOString() },
      { step: 'TRANSFORMATION', value: transformation || 'none' },
      { step: 'GRAVEATLAS_REPRESENTATION', value: graveAtlasId || 'not_yet_imported' }
    ]
  };
}

/**
 * Attach provenance to a normalized record.
 */
export function attachProvenance(record, provenance) {
  return {
    ...record,
    provenance: {
      sourceId: provenance.sourceId,
      sourceName: provenance.sourceName,
      apiEndpoint: provenance.apiEndpoint,
      externalRecordId: provenance.externalRecordId,
      retrievalTime: provenance.retrievalTime,
      transformation: provenance.transformation,
      graveAtlasId: provenance.graveAtlasId
    }
  };
}

/**
 * Verify that a record has complete provenance.
 */
export function verifyProvenance(record) {
  if (!record.provenance) return { complete: false, missing: ['provenance'] };
  const required = ['sourceId', 'sourceName', 'externalRecordId', 'retrievalTime'];
  const missing = required.filter(f => !record.provenance[f]);
  return { complete: missing.length === 0, missing };
}

/**
 * Format provenance for display in the GUI (Part 9 — Source Badges).
 */
export function formatSourceBadge(record) {
  if (!record.provenance) return null;
  return {
    source: record.provenance.sourceName || record.sourceOrganization || 'Unknown',
    status: 'External / Source-backed',
    retrieved: record.provenance.retrievalTime,
    externalId: record.provenance.externalRecordId,
    license: record.license || 'Unknown',
    url: record.recordUrl || null
  };
}
