/**
 * Audit Log (Part 23)
 *
 * Audits important connector actions:
 * - source, connector, request type, timestamp, status
 * - records processed, errors, operator/system, license decision
 *
 * Never logs secrets.
 */

import { writeFile, sanitizePathSegment } from '../github.js';

const AUDIT_DIR = 'audit/external-connectors';

/**
 * Write an audit entry to the backend storage.
 */
export async function writeAuditEntry(env, entry) {
  const auditEntry = {
    id: crypto.randomUUID(),
    timestamp: entry.timestamp || new Date().toISOString(),
    source: entry.source || 'unknown',
    connector: entry.connector || entry.source || 'unknown',
    requestType: entry.requestType || 'unknown',
    status: entry.status || 'unknown',
    recordsProcessed: entry.recordsProcessed || 0,
    errors: entry.errors || [],
    operator: entry.operator || 'system',
    licenseDecision: entry.licenseDecision || null,
    // Explicitly never include: API keys, tokens, credentials, secrets
  };

  const dateStr = new Date().toISOString().split('T')[0];
  const path = `${AUDIT_DIR}/${sanitizePathSegment(auditEntry.source)}/${dateStr}.jsonl`;

  // Append to audit log file
  try {
    let existing = '';
    try {
      existing = await readFile(env, path);
    } catch (e) { /* file may not exist yet */ }

    const line = JSON.stringify(auditEntry) + '\n';
    const content = (existing || '') + line;

    await writeFile(env, path, content);
    return auditEntry;
  } catch (error) {
    console.error('Failed to write audit entry:', error.message);
    // Return the entry anyway — audit failure should not block the operation
    return auditEntry;
  }
}

/**
 * Create an audit entry for a successful connector operation.
 */
export function createSuccessAudit(sourceId, requestType, recordCount) {
  return {
    source: sourceId,
    requestType,
    status: 'success',
    recordsProcessed: recordCount,
    errors: [],
    timestamp: new Date().toISOString()
  };
}

/**
 * Create an audit entry for a failed connector operation.
 */
export function createFailureAudit(sourceId, requestType, error) {
  return {
    source: sourceId,
    requestType,
    status: 'failure',
    recordsProcessed: 0,
    errors: [{ message: error.message || String(error), type: error.type || 'unknown' }],
    timestamp: new Date().toISOString()
  };
}

/**
 * Create an audit entry for a license decision.
 */
export function createLicenseAudit(sourceId, licenseDecision, reason) {
  return {
    source: sourceId,
    requestType: 'license_check',
    status: licenseDecision,
    licenseDecision: { decision: licenseDecision, reason },
    timestamp: new Date().toISOString()
  };
}
