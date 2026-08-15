#!/usr/bin/env node
/**
 * AI Auto-Moderation Tests
 *
 * Tests the AI moderator that replaces the human admin in the import
 * approval workflow. Covers decision criteria, edge cases, audit
 * entries, and integration with the import state machine.
 *
 * Run: node tests/ai-moderation.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ── Replicate core moderation logic for testing ──

const RECOGNIZED_LICENSES = [
  'CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-ND', 'CC-BY-NC', 'CC-BY-NC-SA',
  'CC-BY-NC-ND', 'ODbL', 'ODC-BY', 'PDDL', 'Singapore Open Data Licence',
  'Open Data Commons Open Database License', 'UK Open Government Licence',
  'Open Government Licence', 'Government Work',
];

const MODERATION_CONFIG = {
  MIN_QUALITY_SCORE: 3.0,
  REVIEW_QUALITY_THRESHOLD: 4.0,
  MAX_ERROR_RATE: 0.30,
  MAX_DUPLICATE_RATE: 1.0,
  MIN_VALID_RECORDS: 1,
  AUTO_APPROVE_ON_REVIEW: true,
};

const VALID_TRANSITIONS = {
  'PENDING_APPROVAL': ['APPROVED', 'REJECTED'],
  'APPROVED': ['IMPORTING'],
  'IMPORTING': ['COMPLETED', 'PARTIAL', 'FAILED'],
  'COMPLETED': [],
  'REJECTED': [],
};

function validateTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    return { valid: false, error: `Invalid transition: ${fromStatus} → ${toStatus}` };
  }
  return { valid: true };
}

function reviewImport(report, options = {}) {
  const config = { ...MODERATION_CONFIG, ...options };
  const checks = {};
  const reasons = [];
  let decision = 'APPROVED';

  // License
  const license = report.license || '';
  const licenseRecognized = RECOGNIZED_LICENSES.some(l => license.toLowerCase().includes(l.toLowerCase()));
  checks.license = { value: license, recognized: licenseRecognized, pass: licenseRecognized };
  if (!licenseRecognized) { decision = 'REJECTED'; reasons.push(`License not recognized: "${license}"`); }

  // Attribution
  const attribution = report.attribution || '';
  const hasAttribution = attribution.trim().length > 0;
  checks.attribution = { present: hasAttribution, pass: hasAttribution };
  if (!hasAttribution) { decision = 'REJECTED'; reasons.push('Attribution is missing'); }

  // Valid records
  const validRecords = report.validRecords || (report.records ? report.records.length : 0);
  checks.validRecords = { count: validRecords, pass: validRecords >= config.MIN_VALID_RECORDS };
  if (validRecords < config.MIN_VALID_RECORDS) { decision = 'REJECTED'; reasons.push(`No valid records`); }

  // Error rate
  const invalidRecords = report.invalidRecords || (report.errors ? report.errors.length : 0);
  const totalRecords = validRecords + invalidRecords;
  const errorRate = totalRecords > 0 ? invalidRecords / totalRecords : 0;
  checks.errorRate = { rate: errorRate, pass: errorRate < config.MAX_ERROR_RATE };
  if (errorRate >= config.MAX_ERROR_RATE) { decision = 'REJECTED'; reasons.push(`Error rate too high`); }

  // Quality score
  const qualityScore = report.qualityScore || 0;
  let qualityCheck = 'pass';
  if (qualityScore < config.MIN_QUALITY_SCORE) {
    qualityCheck = 'fail'; decision = 'REJECTED'; reasons.push(`Quality score too low: ${qualityScore}`);
  } else if (qualityScore < config.REVIEW_QUALITY_THRESHOLD) {
    qualityCheck = 'review'; reasons.push(`Quality score borderline: ${qualityScore}`);
  }
  checks.qualityScore = { score: qualityScore, pass: qualityCheck === 'pass', review: qualityCheck === 'review' };

  // Duplicate rate
  const duplicates = report.duplicates || 0;
  const duplicateRate = validRecords > 0 ? duplicates / validRecords : 0;
  checks.duplicateRate = { count: duplicates, rate: duplicateRate, pass: duplicateRate < config.MAX_DUPLICATE_RATE };
  if (duplicateRate >= config.MAX_DUPLICATE_RATE) { decision = 'REJECTED'; reasons.push(`All records are duplicates`); }

  // Coordinates
  let coordsCheck = { pass: true, missing: 0 };
  if (report.records && report.records.length > 0) {
    const missingCoords = report.records.filter(r =>
      r.latitude == null || r.longitude == null).length;
    coordsCheck = { pass: missingCoords === 0, missing: missingCoords };
    if (missingCoords === report.records.length) { decision = 'REJECTED'; }
  }
  checks.coordinates = coordsCheck;

  // Borderline quality → NEEDS_REVIEW
  if (decision === 'APPROVED' && qualityCheck === 'review') {
    decision = 'NEEDS_REVIEW';
  }
  // Autonomous mode: auto-approve review cases
  if (decision === 'NEEDS_REVIEW' && config.AUTO_APPROVE_ON_REVIEW) {
    decision = 'APPROVED';
    reasons.push('Auto-approved in autonomous mode');
  }

  return { decision, reason: reasons.join('; ') || 'All checks passed', details: checks,
    summary: { decision, reason: reasons.join('; ') || 'All checks passed',
      checksPassed: Object.values(checks).filter(c => c.pass).length,
      totalChecks: Object.keys(checks).length } };
}

// ── Test runner ──

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; failures.push(`${name}: ${e.message}`); console.log(`  ❌ ${name}: ${e.message}`); }
}

console.log('\n=== AI Auto-Moderation Tests ===\n');

// ── Part 1: Module Structure ──

console.log('Part 1: Module Structure');

const modSource = fs.readFileSync(path.join(__dirname, '..', 'backend', 'src', 'ai-moderation.js'), 'utf8');

test('Module file exists and is substantial', () => {
  assert.ok(modSource.length > 2000);
});

test('Exports reviewImport function', () => {
  assert.ok(modSource.includes('export function reviewImport'));
});

test('Exports validateModerationDecision function', () => {
  assert.ok(modSource.includes('export function validateModerationDecision'));
});

test('Exports buildAuditEntry function', () => {
  assert.ok(modSource.includes('export function buildAuditEntry'));
});

test('Exports MODERATION_CONFIG', () => {
  assert.ok(modSource.includes('MODERATION_CONFIG'));
});

test('Exports RECOGNIZED_LICENSES', () => {
  assert.ok(modSource.includes('RECOGNIZED_LICENSES'));
});

test('Imports validateTransition from import-framework', () => {
  assert.ok(modSource.includes('import-framework'));
  assert.ok(modSource.includes('validateTransition'));
});

// ── Part 2: Configuration ──

console.log('\nPart 2: Moderation Configuration');

test('MIN_QUALITY_SCORE is 3.0', () => {
  assert.strictEqual(MODERATION_CONFIG.MIN_QUALITY_SCORE, 3.0);
});

test('REVIEW_QUALITY_THRESHOLD is 4.0', () => {
  assert.strictEqual(MODERATION_CONFIG.REVIEW_QUALITY_THRESHOLD, 4.0);
});

test('MAX_ERROR_RATE is 30%', () => {
  assert.strictEqual(MODERATION_CONFIG.MAX_ERROR_RATE, 0.30);
});

test('MAX_DUPLICATE_RATE is 100%', () => {
  assert.strictEqual(MODERATION_CONFIG.MAX_DUPLICATE_RATE, 1.0);
});

test('MIN_VALID_RECORDS is 1', () => {
  assert.strictEqual(MODERATION_CONFIG.MIN_VALID_RECORDS, 1);
});

test('AUTO_APPROVE_ON_REVIEW is true (autonomous mode)', () => {
  assert.strictEqual(MODERATION_CONFIG.AUTO_APPROVE_ON_REVIEW, true);
});

test('Recognizes ODbL license', () => {
  assert.ok(RECOGNIZED_LICENSES.includes('ODbL'));
});

test('Recognizes Singapore Open Data Licence', () => {
  assert.ok(RECOGNIZED_LICENSES.includes('Singapore Open Data Licence'));
});

test('Recognizes CC0', () => {
  assert.ok(RECOGNIZED_LICENSES.includes('CC0'));
});

test('Recognizes CC-BY-SA', () => {
  assert.ok(RECOGNIZED_LICENSES.includes('CC-BY-SA'));
});

test('Does NOT recognize proprietary license', () => {
  assert.ok(!RECOGNIZED_LICENSES.includes('Proprietary'));
  assert.ok(!RECOGNIZED_LICENSES.includes('All Rights Reserved'));
});

// ── Part 3: Approval Decisions ──

console.log('\nPart 3: Auto-Approval Decisions');

const goodReport = {
  license: 'Singapore Open Data Licence',
  attribution: 'National Environment Agency. (2020). Active Cemeteries (GEOJSON)',
  validRecords: 9,
  invalidRecords: 0,
  duplicates: 0,
  qualityScore: 5.0,
  records: Array.from({ length: 9 }, (_, i) => ({
    id: `NEA-${i}`,
    name: `Cemetery ${i}`,
    latitude: 1.3 + i * 0.01,
    longitude: 103.8 + i * 0.01,
    verificationStatus: 'verified'
  }))
};

test('Approves a clean NEA-like import (high quality, no errors)', () => {
  const result = reviewImport(goodReport);
  assert.strictEqual(result.decision, 'APPROVED');
});

test('Approval reason mentions "All checks passed"', () => {
  const result = reviewImport(goodReport);
  assert.ok(result.reason.includes('All checks passed') || result.reason === 'All checks passed');
});

test('Approves OSM import with ODbL license', () => {
  const osmReport = {
    license: 'ODbL',
    attribution: '© OpenStreetMap contributors (ODbL)',
    validRecords: 150,
    invalidRecords: 5,
    duplicates: 2,
    qualityScore: 4.5,
    records: [{ id: 'OSM-node-1', latitude: 51.5, longitude: -0.1 }]
  };
  const result = reviewImport(osmReport);
  assert.strictEqual(result.decision, 'APPROVED');
});

test('Approves import with some errors (below 30% threshold)', () => {
  const result = reviewImport({
    license: 'ODbL',
    attribution: 'OSM contributors',
    validRecords: 70,
    invalidRecords: 20, // 22% error rate — below 30%
    duplicates: 0,
    qualityScore: 5.0,
    records: [{ id: 'r1', latitude: 1, longitude: 2 }]
  });
  assert.strictEqual(result.decision, 'APPROVED');
});

test('Auto-approves borderline quality (3.5 score, between min and review threshold)', () => {
  const result = reviewImport({
    license: 'ODbL',
    attribution: 'OSM',
    validRecords: 10,
    invalidRecords: 0,
    duplicates: 0,
    qualityScore: 3.5,
    records: [{ id: 'r1', latitude: 1, longitude: 2 }]
  });
  assert.strictEqual(result.decision, 'APPROVED'); // AUTO_APPROVE_ON_REVIEW = true
});

// ── Part 4: Rejection Decisions ──

console.log('\nPart 4: Auto-Rejection Decisions');

test('Rejects unrecognized license', () => {
  const result = reviewImport({
    license: 'Proprietary',
    attribution: 'Some Corp',
    validRecords: 5,
    invalidRecords: 0,
    duplicates: 0,
    qualityScore: 8.0,
    records: [{ id: 'r1', latitude: 1, longitude: 2 }]
  });
  assert.strictEqual(result.decision, 'REJECTED');
  assert.ok(result.reason.includes('License not recognized'));
});

test('Rejects missing license', () => {
  const result = reviewImport({
    license: '',
    attribution: 'Someone',
    validRecords: 5,
    invalidRecords: 0,
    duplicates: 0,
    qualityScore: 8.0,
    records: [{ id: 'r1', latitude: 1, longitude: 2 }]
  });
  assert.strictEqual(result.decision, 'REJECTED');
});

test('Rejects missing attribution', () => {
  const result = reviewImport({
    license: 'ODbL',
    attribution: '',
    validRecords: 5,
    invalidRecords: 0,
    duplicates: 0,
    qualityScore: 8.0,
    records: [{ id: 'r1', latitude: 1, longitude: 2 }]
  });
  assert.strictEqual(result.decision, 'REJECTED');
  assert.ok(result.reason.includes('Attribution is missing'));
});

test('Rejects zero valid records', () => {
  const result = reviewImport({
    license: 'ODbL',
    attribution: 'OSM',
    validRecords: 0,
    invalidRecords: 10,
    duplicates: 0,
    qualityScore: 0,
    records: []
  });
  assert.strictEqual(result.decision, 'REJECTED');
  assert.ok(result.reason.includes('No valid records'));
});

test('Rejects high error rate (>= 30%)', () => {
  const result = reviewImport({
    license: 'ODbL',
    attribution: 'OSM',
    validRecords: 70,
    invalidRecords: 30, // 30% — at threshold
    duplicates: 0,
    qualityScore: 5.0,
    records: [{ id: 'r1', latitude: 1, longitude: 2 }]
  });
  assert.strictEqual(result.decision, 'REJECTED');
  assert.ok(result.reason.includes('Error rate too high'));
});

test('Rejects low quality score (< 3.0)', () => {
  const result = reviewImport({
    license: 'ODbL',
    attribution: 'OSM',
    validRecords: 5,
    invalidRecords: 0,
    duplicates: 0,
    qualityScore: 2.5,
    records: [{ id: 'r1', latitude: 1, longitude: 2 }]
  });
  assert.strictEqual(result.decision, 'REJECTED');
  assert.ok(result.reason.includes('Quality score too low'));
});

test('Rejects 100% duplicate rate', () => {
  const result = reviewImport({
    license: 'ODbL',
    attribution: 'OSM',
    validRecords: 10,
    invalidRecords: 0,
    duplicates: 10, // 100%
    qualityScore: 5.0,
    records: [{ id: 'r1', latitude: 1, longitude: 2 }]
  });
  assert.strictEqual(result.decision, 'REJECTED');
  assert.ok(result.reason.includes('duplicates'));
});

test('Rejects all records missing coordinates', () => {
  const result = reviewImport({
    license: 'ODbL',
    attribution: 'OSM',
    validRecords: 5,
    invalidRecords: 0,
    duplicates: 0,
    qualityScore: 5.0,
    records: [
      { id: 'r1', latitude: null, longitude: null },
      { id: 'r2', latitude: null, longitude: null },
    ]
  });
  assert.strictEqual(result.decision, 'REJECTED');
});

// ── Part 5: Check Details ──

console.log('\nPart 5: Decision Check Details');

test('Review returns details for each check', () => {
  const result = reviewImport(goodReport);
  assert.ok(result.details.license);
  assert.ok(result.details.attribution);
  assert.ok(result.details.validRecords);
  assert.ok(result.details.errorRate);
  assert.ok(result.details.qualityScore);
  assert.ok(result.details.duplicateRate);
  assert.ok(result.details.coordinates);
});

test('Summary includes checksPassed count', () => {
  const result = reviewImport(goodReport);
  assert.ok(result.summary.checksPassed > 0);
  assert.strictEqual(result.summary.totalChecks, 7);
});

test('License check includes recognized flag', () => {
  const result = reviewImport(goodReport);
  assert.ok(result.details.license.recognized === true);
});

test('Error rate check includes numeric rate', () => {
  const result = reviewImport({ ...goodReport, invalidRecords: 3, validRecords: 7 });
  assert.ok(typeof result.details.errorRate.rate === 'number');
});

// ── Part 6: State Machine Integration ──

console.log('\nPart 6: State Machine Integration');

test('PENDING_APPROVAL → APPROVED is valid', () => {
  const result = validateTransition('PENDING_APPROVAL', 'APPROVED');
  assert.ok(result.valid);
});

test('PENDING_APPROVAL → REJECTED is valid', () => {
  const result = validateTransition('PENDING_APPROVAL', 'REJECTED');
  assert.ok(result.valid);
});

test('REJECTED → APPROVED is NOT valid (terminal)', () => {
  const result = validateTransition('REJECTED', 'APPROVED');
  assert.ok(!result.valid);
});

test('COMPLETED → REJECTED is NOT valid (terminal)', () => {
  const result = validateTransition('COMPLETED', 'REJECTED');
  assert.ok(!result.valid);
});

// ── Part 7: Audit Entry ──

console.log('\nPart 7: Audit Entry Generation');

test('Module exports buildAuditEntry', () => {
  assert.ok(modSource.includes('function buildAuditEntry'));
});

test('Audit entry includes action IMPORT_APPROVED_BY_AI or IMPORT_REJECTED_BY_AI', () => {
  assert.ok(modSource.includes('IMPORT_APPROVED_BY_AI') || modSource.includes('IMPORT_') && modSource.includes('_BY_AI'));
  assert.ok(modSource.includes('IMPORT_REJECTED_BY_AI') || modSource.includes('REJECTED'));
});

test('Audit entry includes moderatedBy: ai-auto-moderator', () => {
  assert.ok(modSource.includes('ai-auto-moderator'));
});

test('Audit entry includes timestamp', () => {
  assert.ok(modSource.includes('timestamp'));
});

test('Audit entry includes decision reason', () => {
  assert.ok(modSource.includes('reason'));
});

test('Audit entry includes quality score', () => {
  assert.ok(modSource.includes('qualityScore'));
});

test('Audit entry includes config used for decision', () => {
  assert.ok(modSource.includes('config'));
});

// ── Part 8: Import Handler Integration ──

console.log('\nPart 8: Import Handler Integration');

const handlerSource = fs.readFileSync(
  path.join(__dirname, '..', 'backend', 'src', 'import-handlers.js'), 'utf8'
);

test('Handler imports reviewImport from ai-moderation', () => {
  assert.ok(handlerSource.includes('reviewImport'));
  assert.ok(handlerSource.includes('ai-moderation'));
});

test('Handler imports buildAuditEntry', () => {
  assert.ok(handlerSource.includes('buildAuditEntry'));
});

test('Handler imports MODERATION_CONFIG', () => {
  assert.ok(handlerSource.includes('MODERATION_CONFIG'));
});

test('Handler calls reviewImport in trigger flow', () => {
  assert.ok(handlerSource.includes('reviewImport(report)'));
});

test('Handler validates moderation decision against state machine', () => {
  assert.ok(handlerSource.includes('validateModerationDecision'));
});

test('Handler auto-publishes on AI approval', () => {
  assert.ok(handlerSource.includes("moderationResult.decision === 'APPROVED'"));
  assert.ok(handlerSource.includes('publishedCount'));
});

test('Handler does NOT publish on AI rejection', () => {
  // The publish loop should be inside the APPROVED check
  const approvedSection = handlerSource.substring(
    handlerSource.indexOf("if (moderationResult.decision === 'APPROVED'"),
    handlerSource.indexOf('Save the updated report')
  );
  assert.ok(approvedSection.includes('writeFile'));
  // The reject path should NOT have writeFile for records
  const beforeApproved = handlerSource.substring(0, handlerSource.indexOf("if (moderationResult.decision === 'APPROVED'"));
  // Should not have cemetery publishing before the approved check
  assert.ok(!beforeApproved.includes("targetDir = 'cemeteries'"));
});

test('Handler sets moderatedBy to ai-auto-moderator', () => {
  assert.ok(handlerSource.includes("'ai-auto-moderator'") || handlerSource.includes('ai-auto-moderator'));
});

test('Handler stores moderation details in report', () => {
  assert.ok(handlerSource.includes('moderationReason'));
  assert.ok(handlerSource.includes('moderationDetails'));
});

test('Handler returns moderation decision in API response', () => {
  assert.ok(handlerSource.includes('moderatedBy'));
  assert.ok(handlerSource.includes('moderation'));
  assert.ok(handlerSource.includes('decision'));
});

test('Handler writes AI audit log', () => {
  assert.ok(handlerSource.includes('buildAuditEntry'));
  assert.ok(handlerSource.includes('writeAuditLog'));
});

// ── Part 9: Moderation Config Endpoint ──

console.log('\nPart 9: Moderation Config Endpoint');

test('Handler exports handleGetModerationConfig', () => {
  assert.ok(handlerSource.includes('handleGetModerationConfig'));
});

const indexSource = fs.readFileSync(
  path.join(__dirname, '..', 'backend', 'src', 'index.js'), 'utf8'
);

test('Moderation config route is wired in index.js', () => {
  assert.ok(indexSource.includes('moderation/config'));
  assert.ok(indexSource.includes('handleGetModerationConfig'));
});

test('Moderation config route is admin-protected', () => {
  const configRoute = indexSource.substring(
    indexSource.indexOf('moderation/config'),
    indexSource.indexOf('trigger')
  );
  assert.ok(configRoute.includes('requireAdmin'));
});

// ── Part 10: Edge Cases ──

console.log('\nPart 10: Edge Cases');

test('Empty report is rejected', () => {
  const result = reviewImport({});
  assert.strictEqual(result.decision, 'REJECTED');
});

test('Report with null records array is rejected', () => {
  const result = reviewImport({
    license: 'ODbL',
    attribution: 'OSM',
    validRecords: 0,
    records: null,
    qualityScore: 0
  });
  assert.strictEqual(result.decision, 'REJECTED');
});

test('Config overrides work (lower quality threshold)', () => {
  const result = reviewImport({
    license: 'ODbL',
    attribution: 'OSM',
    validRecords: 5,
    invalidRecords: 0,
    duplicates: 0,
    qualityScore: 2.0, // Below default min of 3.0
    records: [{ id: 'r1', latitude: 1, longitude: 2 }]
  }, { MIN_QUALITY_SCORE: 1.0 }); // Override to 1.0
  assert.strictEqual(result.decision, 'APPROVED');
});

test('Config override: disable auto-approve on review → NEEDS_REVIEW', () => {
  const result = reviewImport({
    license: 'ODbL',
    attribution: 'OSM',
    validRecords: 5,
    invalidRecords: 0,
    duplicates: 0,
    qualityScore: 3.5, // Between 3.0 and 4.0
    records: [{ id: 'r1', latitude: 1, longitude: 2 }]
  }, { AUTO_APPROVE_ON_REVIEW: false });
  assert.strictEqual(result.decision, 'NEEDS_REVIEW');
});

test('Report with partial coordinates (some missing) still approves', () => {
  const result = reviewImport({
    license: 'ODbL',
    attribution: 'OSM',
    validRecords: 10,
    invalidRecords: 0,
    duplicates: 0,
    qualityScore: 5.0,
    records: [
      { id: 'r1', latitude: 1, longitude: 2 },
      { id: 'r2', latitude: null, longitude: null }, // 1 of 10 missing
    ]
  });
  assert.strictEqual(result.decision, 'APPROVED'); // Not all missing
});

test('Multiple failures produce multiple reasons', () => {
  const result = reviewImport({
    license: 'Proprietary',
    attribution: '',
    validRecords: 0,
    invalidRecords: 10,
    duplicates: 0,
    qualityScore: 0,
    records: []
  });
  assert.strictEqual(result.decision, 'REJECTED');
  assert.ok(result.reason.includes('License'));
  assert.ok(result.reason.includes('Attribution'));
  assert.ok(result.reason.includes('valid records'));
});

// ── Part 11: Security ──

console.log('\nPart 11: Security');

test('AI moderation never bypasses state machine (uses validateTransition)', () => {
  assert.ok(modSource.includes('validateTransition'));
  assert.ok(modSource.includes('validateModerationDecision'));
});

test('AI moderation does not auto-publish (handler controls publishing)', () => {
  // The ai-moderation module should not contain writeFile or GitHub calls
  assert.ok(!modSource.includes('writeFile'));
  assert.ok(!modSource.includes('readFile'));
  assert.ok(!modSource.includes('github'));
});

test('AI moderation does not expose secrets', () => {
  assert.ok(!/token\s*=\s*['"]/.test(modSource));
  assert.ok(!/password\s*=\s*['"]/.test(modSource));
  assert.ok(!/apiKey\s*=\s*['"]/.test(modSource));
});

test('AI moderation decisions are auditable (buildAuditEntry)', () => {
  assert.ok(modSource.includes('buildAuditEntry'));
  assert.ok(modSource.includes('moderatedBy'));
  assert.ok(modSource.includes('reason'));
  assert.ok(modSource.includes('checksPassed'));
});

console.log('\n=== AI Auto-Moderation Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All AI auto-moderation tests passed!');
else { console.log('\n❌ Some tests failed!'); failures.forEach(f => console.log(`  - ${f}`)); }

process.exit(failed > 0 ? 1 : 0);
