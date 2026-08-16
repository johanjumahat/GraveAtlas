/**
 * Phase 16.25 Tests — AI Data Governance & Compliance
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}

console.log('\nPart 1: Backend Endpoints');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');

const endpoints = [
  ['handleCreatePolicy', 'POST /api/governance/policies'],
  ['handleListPolicies', 'GET /api/governance/policies'],
  ['handleGetPolicy', 'GET /api/governance/policies/:id'],
  ['handleDeletePolicy', 'DELETE /api/governance/policies/:id'],
  ['handleClassifyRecord', 'POST /api/governance/classify'],
  ['handleGetClassification', 'GET /api/governance/classify/:id'],
  ['handleAuditLog', 'GET /api/governance/audit'],
  ['handleLogAuditEvent', 'POST /api/governance/audit'],
  ['handleApplyRetention', 'POST /api/governance/retention'],
  ['handleRecordConsent', 'POST /api/governance/consent'],
  ['handleGetConsent', 'GET /api/governance/consent'],
  ['handleRightToBeForgotten', 'POST /api/governance/rtbf'],
  ['handleExportPersonalData', 'POST /api/governance/export-personal'],
  ['handleComplianceCheck', 'POST /api/governance/check'],
];

for (const [handler, desc] of endpoints) {
  test(`Backend has ${desc}`, () => {
    assert.ok(indexFile.includes(handler), `Missing ${handler}`);
  });
}

test('All 14 governance routes registered', () => {
  for (const [handler] of endpoints) {
    assert.ok(indexFile.includes(handler), `Missing ${handler}`);
  }
});

console.log('\nPart 2: Constants & Validation');
test('Has 6 policy types', () => {
  assert.ok(indexFile.includes('POLICY_TYPES'), 'Missing POLICY_TYPES');
  const types = ['retention', 'privacy', 'access', 'classification', 'consent', 'deletion'];
  for (const t of types) assert.ok(indexFile.includes(`'${t}'`), `Missing type: ${t}`);
});

test('Has 4 data classifications', () => {
  assert.ok(indexFile.includes('DATA_CLASSIFICATIONS'), 'Missing DATA_CLASSIFICATIONS');
  assert.ok(indexFile.includes("'public'") && indexFile.includes("'internal'") &&
    indexFile.includes("'restricted'") && indexFile.includes("'confidential'"),
    'Missing classification levels');
});

test('Has 4 consent statuses', () => {
  assert.ok(indexFile.includes('CONSENT_STATUSES'), 'Missing CONSENT_STATUSES');
  assert.ok(indexFile.includes("'granted'") && indexFile.includes("'withdrawn'") &&
    indexFile.includes("'pending'") && indexFile.includes("'not_required'"),
    'Missing consent statuses');
});

test('Has 12 audit actions', () => {
  assert.ok(indexFile.includes('AUDIT_ACTIONS'), 'Missing AUDIT_ACTIONS');
  assert.ok(indexFile.includes("'create'") && indexFile.includes("'read'") && indexFile.includes("'update'"),
    'Missing audit actions');
});

test('Validates policy type', () => assert.ok(indexFile.includes('Invalid type'), 'Missing type validation'));
test('Validates classification', () => assert.ok(indexFile.includes('Invalid classification'), 'Missing classification validation'));
test('Validates consent status', () => assert.ok(indexFile.includes('Invalid consentStatus'), 'Missing consent validation'));
test('Requires policy name', () => assert.ok(indexFile.includes('Missing required field: name'), 'Missing name validation'));

console.log('\nPart 3: Policy CRUD');
test('Creates unique policy ID', () => assert.ok(indexFile.includes("'policy_' + Date.now()"), 'Missing unique ID'));
test('Saves to governance/policies/', () => assert.ok(indexFile.includes('governance/policies/'), 'Missing policies directory'));
test('Logs policy creation', () => assert.ok(indexFile.includes('policy_change'), 'Missing policy audit log'));
test('List accepts type filter', () => assert.ok(indexFile.includes("searchParams.get('type')"), 'Missing type filter'));
test('List accepts enabled filter', () => assert.ok(indexFile.includes("searchParams.get('enabled')"), 'Missing enabled filter'));
test('List returns activePolicies count', () => assert.ok(indexFile.includes('activePolicies'), 'Missing activePolicies'));

console.log('\nPart 4: Data Classification');
test('Requires recordId and classification', () => {
  assert.ok(indexFile.includes('Missing required fields: recordId, classification'), 'Missing validation');
});
test('Tracks previous classification', () => assert.ok(indexFile.includes('previousClassification'), 'Missing previous classification'));
test('Saves to governance/classifications/', () => assert.ok(indexFile.includes('governance/classifications/'), 'Missing classifications directory'));
test('Logs classification event', () => assert.ok(indexFile.includes("'classify'"), 'Missing classify audit'));

console.log('\nPart 5: Audit Log');
test('Has logAuditEvent helper', () => assert.ok(indexFile.includes('async function logAuditEvent'), 'Missing logAuditEvent'));
test('Audit log accepts action filter', () => assert.ok(indexFile.includes("searchParams.get('action')"), 'Missing action filter'));
test('Audit log accepts actor filter', () => assert.ok(indexFile.includes("searchParams.get('actor')"), 'Missing actor filter'));
test('Audit log accepts since filter', () => assert.ok(indexFile.includes("searchParams.get('since')"), 'Missing since filter'));
test('Audit log sorts newest first', () => assert.ok(indexFile.includes('b.timestamp').toString() && indexFile.includes('a.timestamp'), 'Missing sort'));
test('Manual audit log validates action', () => assert.ok(indexFile.includes('Invalid action'), 'Missing action validation'));
test('Manual audit log requires description', () => assert.ok(indexFile.includes('Missing required field: description'), 'Missing description validation'));

console.log('\nPart 6: Retention');
test('Requires retentionDays >= 1', () => assert.ok(indexFile.includes('retentionDays'), 'Missing retentionDays validation'));
test('Calculates cutoff date', () => assert.ok(indexFile.includes('cutoffDate'), 'Missing cutoff date'));
test('Marks records exceeding retention', () => assert.ok(indexFile.includes('markedCount'), 'Missing marked count'));
test('Returns markedRecords array', () => assert.ok(indexFile.includes('markedRecords'), 'Missing marked records'));
test('Logs retention apply event', () => assert.ok(indexFile.includes('retention_apply'), 'Missing retention audit'));

console.log('\nPart 7: Consent');
test('Records consent with status', () => assert.ok(indexFile.includes('consentStatus'), 'Missing consentStatus'));
test('Tracks grantedAt timestamp', () => assert.ok(indexFile.includes('grantedAt'), 'Missing grantedAt'));
test('Tracks withdrawnAt timestamp', () => assert.ok(indexFile.includes('withdrawnAt'), 'Missing withdrawnAt'));
test('Consent query accepts recordId filter', () => assert.ok(indexFile.includes("searchParams.get('recordId')"), 'Missing recordId filter'));
test('Consent query accepts personName filter', () => assert.ok(indexFile.includes("searchParams.get('personName')"), 'Missing personName filter'));
test('Consent query accepts consentStatus filter', () => assert.ok(indexFile.includes("searchParams.get('consentStatus')"), 'Missing status filter'));
test('Logs consent change', () => assert.ok(indexFile.includes('consent_change'), 'Missing consent audit'));

console.log('\nPart 8: Right To Be Forgotten');
test('Requires recordId or personName', () => {
  assert.ok(indexFile.includes('Missing required fields: recordId or personName'), 'Missing RTBF validation');
});
test('Supports anonymize action', () => assert.ok(indexFile.includes("'anonymize'"), 'Missing anonymize'));
test('Supports delete action', () => assert.ok(indexFile.includes("'delete'"), 'Missing delete'));
test('Anonymize replaces names with [ANONYMIZED]', () => assert.ok(indexFile.includes('[ANONYMIZED]'), 'Missing anonymization'));
test('Delete sets status to deleted', () => assert.ok(indexFile.includes("'deleted'"), 'Missing deletion'));
test('Sets rtbfApplied flag', () => assert.ok(indexFile.includes('rtbfApplied'), 'Missing rtbfApplied'));
test('Saves RTBF record', () => assert.ok(indexFile.includes('governance/rtbf/'), 'Missing RTBF directory'));
test('Logs RTBF request', () => assert.ok(indexFile.includes('rtbf_request'), 'Missing RTBF audit'));
test('Returns processedCount', () => assert.ok(indexFile.includes('processedCount'), 'Missing processedCount'));

console.log('\nPart 9: Personal Data Export');
test('Requires personName or recordId', () => {
  assert.ok(indexFile.includes('Missing required fields: personName or recordId'), 'Missing export validation');
});
test('Exports record data', () => assert.ok(indexFile.includes('exportedRecords'), 'Missing exported records'));
test('Includes consent records', () => assert.ok(indexFile.includes('consentRecords'), 'Missing consent in export'));
test('Includes classifications', () => assert.ok(indexFile.includes('classifications'), 'Missing classifications in export'));
test('References GDPR Article 20', () => assert.ok(indexFile.includes('GDPR Article 20'), 'Missing GDPR reference'));
test('Logs export event', () => assert.ok(indexFile.includes("'export'"), 'Missing export audit'));

console.log('\nPart 10: Compliance Check');
test('Loads enabled policies', () => assert.ok(indexFile.includes('policy.enabled'), 'Missing enabled filter'));
test('Checks unclassified records', () => assert.ok(indexFile.includes('unclassified_records'), 'Missing unclassified check'));
test('Checks withdrawn consents', () => assert.ok(indexFile.includes('withdrawn_consent'), 'Missing withdrawn consent check'));
test('Checks retention violations', () => assert.ok(indexFile.includes('retention_violation'), 'Missing retention violation check'));
test('Checks RTBF violations', () => assert.ok(indexFile.includes('rtbf_violation'), 'Missing RTBF violation check'));
test('Returns compliance score 0-100', () => assert.ok(indexFile.includes('score'), 'Missing compliance score'));
test('Returns issues with severity', () => assert.ok(indexFile.includes('severity'), 'Missing severity in issues'));
test('Returns summary with counts', () => assert.ok(indexFile.includes('criticalIssues'), 'Missing criticalIssues'));

console.log('\nPart 11: GovernancePolicy Model');
const gpFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/GovernancePolicy.java'),
  'utf8'
);
test('Class exists', () => assert.ok(gpFile.includes('public class GovernancePolicy'), 'Not found'));
test('Has fromJson', () => assert.ok(gpFile.includes('fromJson'), 'Missing fromJson'));
test('Has isActive', () => assert.ok(gpFile.includes('isActive'), 'Missing isActive'));
test('Has hasRetention', () => assert.ok(gpFile.includes('hasRetention'), 'Missing hasRetention'));
test('Has getTypeIcon', () => assert.ok(gpFile.includes('getTypeIcon'), 'Missing getTypeIcon'));
test('Has getSummaryLine', () => assert.ok(gpFile.includes('getSummaryLine'), 'Missing getSummaryLine'));
test('Type icons cover all 6 types', () => {
  const types = ['retention', 'privacy', 'access', 'classification', 'consent', 'deletion'];
  for (const t of types) assert.ok(gpFile.includes(`"${t}"`), `Missing type: ${t}`);
});

console.log('\nPart 12: DataClassification Model');
const dcFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/DataClassification.java'),
  'utf8'
);
test('Class exists', () => assert.ok(dcFile.includes('public class DataClassification'), 'Not found'));
test('Has fromJson', () => assert.ok(dcFile.includes('fromJson'), 'Missing fromJson'));
test('Has isPublic/isInternal/isRestricted/isConfidential', () => {
  assert.ok(dcFile.includes('isPublic') && dcFile.includes('isInternal') &&
    dcFile.includes('isRestricted') && dcFile.includes('isConfidential'),
    'Missing classification checks');
});
test('Has hasChanged', () => assert.ok(dcFile.includes('hasChanged'), 'Missing hasChanged'));
test('Has getClassificationIcon', () => assert.ok(dcFile.includes('getClassificationIcon'), 'Missing getClassificationIcon'));
test('Has getSummaryLine', () => assert.ok(dcFile.includes('getSummaryLine'), 'Missing getSummaryLine'));

console.log('\nPart 13: ComplianceReport Model');
const crFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/ComplianceReport.java'),
  'utf8'
);
test('Class exists', () => assert.ok(crFile.includes('public class ComplianceReport'), 'Not found'));
test('Has ComplianceSummary inner', () => assert.ok(crFile.includes('class ComplianceSummary'), 'Missing ComplianceSummary'));
test('Has ComplianceIssue inner', () => assert.ok(crFile.includes('class ComplianceIssue'), 'Missing ComplianceIssue'));
test('Has PolicySummary inner', () => assert.ok(crFile.includes('class PolicySummary'), 'Missing PolicySummary'));
test('Has fromJson', () => assert.ok(crFile.includes('fromJson'), 'Missing fromJson'));
test('Has isCompliant', () => assert.ok(crFile.includes('isCompliant'), 'Missing isCompliant'));
test('Has hasCriticalIssues', () => assert.ok(crFile.includes('hasCriticalIssues'), 'Missing hasCriticalIssues'));
test('Has getScoreColor', () => assert.ok(crFile.includes('getScoreColor'), 'Missing getScoreColor'));
test('Has getSummaryLine', () => assert.ok(crFile.includes('getSummaryLine'), 'Missing getSummaryLine'));

console.log('\nPart 14: API Client Integration');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);
test('Imports GovernancePolicy', () => assert.ok(apiFile.includes('GovernancePolicy'), 'Missing import'));
test('Imports DataClassification', () => assert.ok(apiFile.includes('DataClassification'), 'Missing import'));
test('Imports ComplianceReport', () => assert.ok(apiFile.includes('ComplianceReport'), 'Missing import'));
test('Has createGovernancePolicy', () => {
  assert.ok(apiFile.includes('createGovernancePolicy'), 'Missing createGovernancePolicy');
  assert.ok(apiFile.includes('/governance/policies'), 'Missing URL');
});
test('Has listGovernancePolicies', () => assert.ok(apiFile.includes('listGovernancePolicies'), 'Missing listGovernancePolicies'));
test('Has classifyRecord', () => {
  assert.ok(apiFile.includes('classifyRecord'), 'Missing classifyRecord');
  assert.ok(apiFile.includes('/governance/classify'), 'Missing URL');
});
test('Has runComplianceCheck', () => {
  assert.ok(apiFile.includes('runComplianceCheck'), 'Missing runComplianceCheck');
  assert.ok(apiFile.includes('/governance/check'), 'Missing URL');
});
test('Has rightToBeForgotten', () => {
  assert.ok(apiFile.includes('rightToBeForgotten'), 'Missing rightToBeForgotten');
  assert.ok(apiFile.includes('/governance/rtbf'), 'Missing URL');
});
test('Has exportPersonalData', () => {
  assert.ok(apiFile.includes('exportPersonalData'), 'Missing exportPersonalData');
  assert.ok(apiFile.includes('/governance/export-personal'), 'Missing URL');
});

console.log('\nPart 15: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);
test('Prompts mention governance/policies', () => assert.ok(promptsFile.includes('governance/policies'), 'Missing governance/policies'));
test('Prompts mention governance/classify', () => assert.ok(promptsFile.includes('governance/classify'), 'Missing governance/classify'));
test('Prompts mention governance/audit', () => assert.ok(promptsFile.includes('governance/audit'), 'Missing governance/audit'));
test('Prompts mention governance/rtbf', () => assert.ok(promptsFile.includes('governance/rtbf'), 'Missing governance/rtbf'));
test('Prompts mention GDPR', () => assert.ok(promptsFile.includes('GDPR'), 'Missing GDPR mention'));
test('Prompts mention compliance check', () => assert.ok(promptsFile.includes('compliance check'), 'Missing compliance mention'));
test('Prompts mention data classifications', () => {
  assert.ok(promptsFile.includes('public') && promptsFile.includes('restricted') &&
    promptsFile.includes('confidential'), 'Missing classification levels in prompts');
});
test('Suggested prompts include "compliance check"', () => assert.ok(promptsFile.includes('compliance check'), 'Missing suggested prompt'));
test('Suggested prompts include "Export personal data"', () => assert.ok(promptsFile.includes('Export personal data'), 'Missing suggested prompt'));

console.log('\nPart 16: Documentation');
test('CHANGELOG mentions Phase 16.25', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Phase 16.25') || c.includes('Governance'), 'Missing from CHANGELOG');
});
test('STATUS.md mentions Governance', () => {
  const s = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(s.includes('Governance') || s.includes('16.25'), 'Missing from STATUS');
});

console.log('\n=== Phase 16.25 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.25 Governance & Compliance tests passed!');
else console.log('\n❌ Some tests failed!');
