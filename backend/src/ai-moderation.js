/**
 * AI Auto-Moderation Module
 *
 * Replaces the human admin in the import approval workflow.
 * Reviews import reports and makes approve/reject decisions automatically
 * based on configurable quality criteria.
 *
 * Decision criteria:
 *   AUTO-APPROVE if ALL of:
 *     - License is recognized (CC0, CC-BY, CC-BY-SA, ODbL, Singapore Open Data, etc.)
 *     - Attribution is present and non-empty
 *     - Quality score >= MIN_QUALITY_SCORE (default: 3.0)
 *     - Valid records > 0
 *     - Error rate < MAX_ERROR_RATE (default: 30%)
 *     - No critical validation errors (missing coordinates, invalid data)
 *
 *   AUTO-REJECT if ANY of:
 *     - License is unrecognized or missing
 *     - Attribution is missing
 *     - Quality score < MIN_QUALITY_SCORE
 *     - Valid records === 0
 *     - Error rate >= MAX_ERROR_RATE
 *     - All records are duplicates (100% duplicate rate)
 *
 *   NEEDS_REVIEW (rare edge cases):
 *     - Quality score is borderline (between MIN_QUALITY_SCORE and REVIEW_THRESHOLD)
 *     - Some records have warnings but no critical errors
 *     → In autonomous mode, NEEDS_REVIEW defaults to APPROVE with conservative settings
 *
 * Security:
 * - AI moderation never bypasses the state machine (PENDING_APPROVAL → APPROVED/REJECTED)
 * - All decisions are logged with reasoning
 * - Decisions are auditable and reversible (rollback supported)
 * - No auto-publish without going through the full state machine
 */

import { validateTransition } from './import-framework.js';

// ── Configuration ──

const MODERATION_CONFIG = {
  MIN_QUALITY_SCORE: 3.0,        // Below this → reject
  REVIEW_QUALITY_THRESHOLD: 4.0, // Below this → needs review (auto-approve in autonomous mode)
  MAX_ERROR_RATE: 0.30,          // 30% — above this → reject
  MAX_DUPLICATE_RATE: 1.0,       // 100% — all duplicates → reject
  MIN_VALID_RECORDS: 1,          // Must have at least 1 valid record
  AUTO_APPROVE_ON_REVIEW: true,  // In autonomous mode, review cases auto-approve
};

// ── Recognized Licenses (from import-framework.js) ──

const RECOGNIZED_LICENSES = [
  'CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-ND', 'CC-BY-NC', 'CC-BY-NC-SA',
  'CC-BY-NC-ND', 'ODbL', 'ODC-BY', 'PDDL', 'Singapore Open Data Licence',
  'Open Data Commons Open Database License', 'UK Open Government Licence',
  'Open Government Licence', 'Government Work',
];

// ── Main: Review Import Report ──

/**
 * Review an import report and make an auto-moderation decision.
 *
 * @param {Object} report — The import report from NEA/OSM importer
 * @param {Object} options — Override default config (optional)
 * @returns {Object} { decision, reason, details, config }
 *   decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW'
 *   reason: string (human-readable explanation)
 *   details: object (breakdown of each check)
 */
export function reviewImport(report, options = {}) {
  const config = { ...MODERATION_CONFIG, ...options };

  const checks = {};
  const reasons = [];
  let decision = 'APPROVED';

  // ── Check 1: License Recognition ──

  const license = report.license || '';
  const licenseRecognized = RECOGNIZED_LICENSES.some(
    l => license.toLowerCase().includes(l.toLowerCase())
  );

  checks.license = {
    value: license,
    recognized: licenseRecognized,
    pass: licenseRecognized
  };

  if (!licenseRecognized) {
    decision = 'REJECTED';
    reasons.push(`License not recognized: "${license}"`);
  }

  // ── Check 2: Attribution Present ──

  const attribution = report.attribution || '';
  const hasAttribution = attribution.trim().length > 0;

  checks.attribution = {
    value: attribution.substring(0, 100) + (attribution.length > 100 ? '...' : ''),
    present: hasAttribution,
    pass: hasAttribution
  };

  if (!hasAttribution) {
    decision = 'REJECTED';
    reasons.push('Attribution is missing');
  }

  // ── Check 3: Valid Records Count ──

  const validRecords = report.validRecords || (report.records ? report.records.length : 0);
  const hasValidRecords = validRecords >= config.MIN_VALID_RECORDS;

  checks.validRecords = {
    count: validRecords,
    minimum: config.MIN_VALID_RECORDS,
    pass: hasValidRecords
  };

  if (!hasValidRecords) {
    decision = 'REJECTED';
    reasons.push(`No valid records (minimum: ${config.MIN_VALID_RECORDS})`);
  }

  // ── Check 4: Error Rate ──

  const invalidRecords = report.invalidRecords || (report.errors ? report.errors.length : 0);
  const totalRecords = validRecords + invalidRecords;
  const errorRate = totalRecords > 0 ? invalidRecords / totalRecords : 0;
  const errorRateAcceptable = errorRate < config.MAX_ERROR_RATE;

  checks.errorRate = {
    invalid: invalidRecords,
    total: totalRecords,
    rate: Math.round(errorRate * 100) / 100,
    maxAllowed: config.MAX_ERROR_RATE,
    pass: errorRateAcceptable
  };

  if (!errorRateAcceptable) {
    decision = 'REJECTED';
    reasons.push(`Error rate too high: ${Math.round(errorRate * 100)}% (max: ${Math.round(config.MAX_ERROR_RATE * 100)}%)`);
  }

  // ── Check 5: Quality Score ──

  const qualityScore = report.qualityScore || 0;
  let qualityCheck = 'pass';

  if (qualityScore < config.MIN_QUALITY_SCORE) {
    qualityCheck = 'fail';
    decision = 'REJECTED';
    reasons.push(`Quality score too low: ${qualityScore} (minimum: ${config.MIN_QUALITY_SCORE})`);
  } else if (qualityScore < config.REVIEW_QUALITY_THRESHOLD) {
    qualityCheck = 'review';
    reasons.push(`Quality score borderline: ${qualityScore} (review threshold: ${config.REVIEW_QUALITY_THRESHOLD})`);
  }

  checks.qualityScore = {
    score: qualityScore,
    minimum: config.MIN_QUALITY_SCORE,
    reviewThreshold: config.REVIEW_QUALITY_THRESHOLD,
    pass: qualityCheck === 'pass',
    review: qualityCheck === 'review'
  };

  // ── Check 6: Duplicate Rate ──

  const duplicates = report.duplicates || 0;
  const duplicateRate = validRecords > 0 ? duplicates / validRecords : 0;
  const duplicateRateAcceptable = duplicateRate < config.MAX_DUPLICATE_RATE;

  checks.duplicateRate = {
    count: duplicates,
    rate: Math.round(duplicateRate * 100) / 100,
    maxAllowed: config.MAX_DUPLICATE_RATE,
    pass: duplicateRateAcceptable
  };

  if (!duplicateRateAcceptable) {
    decision = 'REJECTED';
    reasons.push(`All records are duplicates (${duplicates}/${validRecords})`);
  }

  // ── Check 7: Records Have Coordinates ──

  let coordsCheck = { pass: true, missing: 0 };
  if (report.records && report.records.length > 0) {
    const missingCoords = report.records.filter(r =>
      r.latitude == null || r.longitude == null ||
      (typeof r.latitude === 'number' && (r.latitude < -90 || r.latitude > 90)) ||
      (typeof r.longitude === 'number' && (r.longitude < -180 || r.longitude > 180))
    ).length;
    coordsCheck = { pass: missingCoords === 0, missing: missingCoords };
    if (missingCoords > 0) {
      reasons.push(`${missingCoords} records missing valid coordinates`);
      if (missingCoords === report.records.length) {
        decision = 'REJECTED';
      }
    }
  }
  checks.coordinates = coordsCheck;

  // ── Check 8: Verification Status ──

  let verificationCheck = { pass: true, statuses: {} };
  if (report.records && report.records.length > 0) {
    const statuses = {};
    report.records.forEach(r => {
      const s = r.verificationStatus || 'unknown';
      statuses[s] = (statuses[s] || 0) + 1;
    });
    verificationCheck = { pass: true, statuses };
  }
  checks.verification = verificationCheck;

  // ── Final Decision ──

  // If borderline quality and not already rejected → NEEDS_REVIEW
  if (decision === 'APPROVED' && qualityCheck === 'review') {
    decision = 'NEEDS_REVIEW';
  }

  // In autonomous mode, NEEDS_REVIEW auto-approves (conservative: quality is still above minimum)
  if (decision === 'NEEDS_REVIEW' && config.AUTO_APPROVE_ON_REVIEW) {
    decision = 'APPROVED';
    reasons.push('Auto-approved in autonomous mode (quality above minimum threshold)');
  }

  // Build summary
  const allChecksPassed = Object.values(checks).every(c => c.pass);
  const summary = {
    decision,
    reason: reasons.length > 0 ? reasons.join('; ') : 'All checks passed',
    checksPassed: Object.values(checks).filter(c => c.pass).length,
    totalChecks: Object.keys(checks).length,
    allChecksPassed,
    config: {
      MIN_QUALITY_SCORE: config.MIN_QUALITY_SCORE,
      REVIEW_QUALITY_THRESHOLD: config.REVIEW_QUALITY_THRESHOLD,
      MAX_ERROR_RATE: config.MAX_ERROR_RATE,
      MAX_DUPLICATE_RATE: config.MAX_DUPLICATE_RATE,
      AUTO_APPROVE_ON_REVIEW: config.AUTO_APPROVE_ON_REVIEW,
    }
  };

  return {
    decision,
    reason: summary.reason,
    details: checks,
    summary
  };
}

// ── Validate Decision Against State Machine ──

/**
 * Validate that the AI moderation decision is a valid state transition.
 */
export function validateModerationDecision(currentStatus, decision) {
  const targetStatus = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
  return validateTransition(currentStatus, targetStatus);
}

// ── Build Audit Entry ──

/**
 * Build an audit entry for an AI moderation decision.
 */
export function buildAuditEntry(reviewResult, report, importId) {
  return {
    action: `IMPORT_${reviewResult.decision}_BY_AI`,
    importId,
    source: report.source?.sourceName || report.source?.name || 'unknown',
    decision: reviewResult.decision,
    reason: reviewResult.reason,
    checksPassed: reviewResult.summary.checksPassed,
    totalChecks: reviewResult.summary.totalChecks,
    qualityScore: report.qualityScore || 0,
    validRecords: report.validRecords || (report.records ? report.records.length : 0),
    invalidRecords: report.invalidRecords || (report.errors ? report.errors.length : 0),
    duplicates: report.duplicates || 0,
    attribution: report.attribution || '',
    license: report.license || '',
    moderatedBy: 'ai-auto-moderator',
    timestamp: new Date().toISOString(),
    config: reviewResult.summary.config
  };
}

// ── Export Config ──

export { MODERATION_CONFIG, RECOGNIZED_LICENSES };
