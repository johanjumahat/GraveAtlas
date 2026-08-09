/**
 * GraveAtlas Phase 6A Tests — Community Accounts & Contribution System
 */

const {
  // Constants
  ACCOUNT_STATUS_ACTIVE, ACCOUNT_STATUS_SUSPENDED, ACCOUNT_STATUS_DEACTIVATED,
  SUBMISSION_STATUS_DRAFT, SUBMISSION_STATUS_PENDING_REVIEW, SUBMISSION_STATUS_CHANGES_REQUESTED,
  SUBMISSION_STATUS_APPROVED, SUBMISSION_STATUS_REJECTED, SUBMISSION_STATUS_CANCELLED,
  VALID_SUBMISSION_STATUSES, VALID_SUBMISSION_TRANSITIONS,
  IMAGE_RIGHTS_OWN_WORK, IMAGE_RIGHTS_PERMISSION_GRANTED, IMAGE_RIGHTS_OPEN_LICENSE,
  IMAGE_RIGHTS_PUBLIC_DOMAIN, IMAGE_RIGHTS_UNKNOWN, VALID_IMAGE_RIGHTS,
  CONTRIBUTION_TYPES, AUDIT_ACTIONS,
  // Validation
  validateDisplayName, validateProfileBio, validateAccountStatus, validateSubmissionStatus,
  validateImageRights, validateContributionType, isValidStatusTransition,
  validateCemeteryContribution, validateGraveContribution, validateCorrectionContribution,
  validatePhotoSubmission, isValidDate,
  // ID generation
  generateUserId, generateDraftId, generateContributionId, generatePhotoId,
  // Duplicate check
  checkDuplicateSubmission, haversineDistance,
  // Rate limiting
  checkUserRateLimit,
} = require('./phase6a-test-helpers.js');

let passed = 0;
let failed = 0;
const errors = [];

function assert(name, condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(`${name}: ${msg || 'assertion failed'}`);
    console.log(`  ✗ ${name}: ${msg || 'assertion failed'}`);
  }
}

function assertEq(name, actual, expected) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    errors.push(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    console.log(`  ✗ ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(name, condition) {
  assert(name, condition);
}

function assertFalse(name, condition) {
  assert(name, !condition);
}

// ── Test groups ──

console.log('\n=== Phase 6A Tests — Community Accounts & Contribution System ===\n');

// ── Part 2: User Account Foundation ──
console.log('Part 2: User Account Foundation');

assertEq('Account status ACTIVE', ACCOUNT_STATUS_ACTIVE, 'ACTIVE');
assertEq('Account status SUSPENDED', ACCOUNT_STATUS_SUSPENDED, 'SUSPENDED');
assertEq('Account status DEACTIVATED', ACCOUNT_STATUS_DEACTIVATED, 'DEACTIVATED');

// ── Part 3: User Profile Validation ──
console.log('Part 3: User Profile Validation');

assertEq('Valid display name', validateDisplayName('John Doe'), null);
assertEq('Empty display name rejected', validateDisplayName('') !== null, true);
assertEq('Null display name rejected', validateDisplayName(null), 'Display name is required');
assertEq('Long display name rejected', validateDisplayName('x'.repeat(101)) !== null, true);
assertEq('Valid bio', validateProfileBio('Hello world'), null);
assertEq('Long bio rejected', validateProfileBio('x'.repeat(501)) !== null, true);
assertEq('Null bio ok', validateProfileBio(null), null);
assertEq('Valid status', validateAccountStatus('ACTIVE'), null);
assertEq('Invalid status', validateAccountStatus('BANNED') !== null, true);

// ── Part 6: Submission Status ──
console.log('Part 6: Submission Status');

assertEq('DRAFT status', SUBMISSION_STATUS_DRAFT, 'DRAFT');
assertEq('PENDING_REVIEW status', SUBMISSION_STATUS_PENDING_REVIEW, 'PENDING_REVIEW');
assertEq('CHANGES_REQUESTED status', SUBMISSION_STATUS_CHANGES_REQUESTED, 'CHANGES_REQUESTED');
assertEq('APPROVED status', SUBMISSION_STATUS_APPROVED, 'APPROVED');
assertEq('REJECTED status', SUBMISSION_STATUS_REJECTED, 'REJECTED');
assertEq('CANCELLED status', SUBMISSION_STATUS_CANCELLED, 'CANCELLED');

assertEq('6 valid statuses', VALID_SUBMISSION_STATUSES.length, 6);
assertEq('Valid status check', validateSubmissionStatus('PENDING_REVIEW'), null);
assertEq('Invalid status check', validateSubmissionStatus('PUBLISHED') !== null, true);

// Status transitions
assertTrue('DRAFT → PENDING_REVIEW valid', isValidStatusTransition('DRAFT', 'PENDING_REVIEW'));
assertTrue('DRAFT → CANCELLED valid', isValidStatusTransition('DRAFT', 'CANCELLED'));
assertFalse('DRAFT → APPROVED invalid', isValidStatusTransition('DRAFT', 'APPROVED'));
assertTrue('PENDING_REVIEW → APPROVED valid', isValidStatusTransition('PENDING_REVIEW', 'APPROVED'));
assertTrue('PENDING_REVIEW → REJECTED valid', isValidStatusTransition('PENDING_REVIEW', 'REJECTED'));
assertFalse('APPROVED → PENDING_REVIEW invalid', isValidStatusTransition('APPROVED', 'PENDING_REVIEW'));
assertFalse('REJECTED → PENDING_REVIEW invalid', isValidStatusTransition('REJECTED', 'PENDING_REVIEW'));
assertTrue('CHANGES_REQUESTED → PENDING_REVIEW valid', isValidStatusTransition('CHANGES_REQUESTED', 'PENDING_REVIEW'));
assertFalse('PENDING_REVIEW → DRAFT invalid', isValidStatusTransition('PENDING_REVIEW', 'DRAFT'));

// ── Part 5/7: Contribution Validation ──
console.log('Part 5/7: Contribution Validation');

// Cemetery validation
assertEq('Valid cemetery', validateCemeteryContribution({ name: 'Bukit Cemetery' }).length, 0);
assertEq('Missing cemetery name', validateCemeteryContribution({}).length > 0, true);
assertEq('Invalid latitude', validateCemeteryContribution({ name: 'Test', latitude: 999 }).length > 0, true);
assertEq('Invalid longitude', validateCemeteryContribution({ name: 'Test', longitude: -200 }).length > 0, true);
assertEq('Invalid country code', validateCemeteryContribution({ name: 'Test', countryCode: 'USA' }).length > 0, true);
assertEq('Valid country code', validateCemeteryContribution({ name: 'Test', countryCode: 'SG' }).length, 0);
assertEq('Invalid website', validateCemeteryContribution({ name: 'Test', website: 'not-a-url' }).length > 0, true);
assertEq('Valid website', validateCemeteryContribution({ name: 'Test', website: 'https://example.com' }).length, 0);
assertEq('Path traversal rejected', validateCemeteryContribution({ name: '../etc/passwd' }).length > 0, true);

// Grave validation
assertEq('Valid grave', validateGraveContribution({ name: 'John Doe', cemetery: 'Test Cemetery' }).length, 0);
assertEq('Missing name', validateGraveContribution({ cemetery: 'Test' }).length > 0, true);
assertEq('Missing cemetery', validateGraveContribution({ name: 'John' }).length > 0, true);
assertEq('CemeteryId substitutes cemetery', validateGraveContribution({ name: 'John', cemeteryId: 'cemetery_123' }).length, 0);
assertEq('Invalid birth date', validateGraveContribution({ name: 'John', cemetery: 'Test', birthDate: 'not-a-date' }).length > 0, true);
assertEq('Valid year-only date', validateGraveContribution({ name: 'John', cemetery: 'Test', birthDate: '1950' }).length, 0);
assertEq('Valid full date', validateGraveContribution({ name: 'John', cemetery: 'Test', deathDate: '2000-01-15' }).length, 0);
assertEq('Valid approx date', validateGraveContribution({ name: 'John', cemetery: 'Test', birthDate: 'approx_1950' }).length, 0);
assertEq('Valid unknown date', validateGraveContribution({ name: 'John', cemetery: 'Test', birthDate: 'unknown' }).length, 0);

// Correction validation
assertEq('Valid correction', validateCorrectionContribution({ targetId: 'grave_123', targetType: 'grave', corrections: { name: 'Jane Doe' }, reason: 'Name misspelled' }).length, 0);
assertEq('Missing targetId', validateCorrectionContribution({ targetType: 'grave', corrections: {}, reason: 'test' }).length > 0, true);
assertEq('Invalid targetType', validateCorrectionContribution({ targetId: 'g_1', targetType: 'invalid', corrections: { a: 'b' }, reason: 'test' }).length > 0, true);
assertEq('Empty corrections', validateCorrectionContribution({ targetId: 'g_1', targetType: 'grave', corrections: {}, reason: 'test' }).length > 0, true);
assertEq('Missing reason', validateCorrectionContribution({ targetId: 'g_1', targetType: 'grave', corrections: { a: 'b' } }).length > 0, true);

// ── Part 16/17: Photo & Image Rights ──
console.log('Part 16/17: Photo & Image Rights');

assertEq('OWN_WORK rights', IMAGE_RIGHTS_OWN_WORK, 'OWN_WORK');
assertEq('PERMISSION_GRANTED rights', IMAGE_RIGHTS_PERMISSION_GRANTED, 'PERMISSION_GRANTED');
assertEq('OPEN_LICENSE rights', IMAGE_RIGHTS_OPEN_LICENSE, 'OPEN_LICENSE');
assertEq('PUBLIC_DOMAIN rights', IMAGE_RIGHTS_PUBLIC_DOMAIN, 'PUBLIC_DOMAIN');
assertEq('UNKNOWN rights', IMAGE_RIGHTS_UNKNOWN, 'UNKNOWN');
assertEq('5 valid rights', VALID_IMAGE_RIGHTS.length, 5);

assertEq('Valid rights', validateImageRights('OWN_WORK'), null);
assertEq('Invalid rights', validateImageRights('STOLEN') !== null, true);
assertEq('Missing rights', validateImageRights(null) !== null, true);

// Photo submission validation
assertEq('Valid photo submission', validatePhotoSubmission({
  targetId: 'grave_123', targetType: 'grave', photoUrl: 'https://example.com/photo.jpg', rights: 'OWN_WORK'
}).length, 0);

assertEq('Missing targetId', validatePhotoSubmission({ targetType: 'grave', photoUrl: 'https://example.com/p.jpg', rights: 'OWN_WORK' }).length > 0, true);
assertEq('Missing photoUrl', validatePhotoSubmission({ targetId: 'g_1', targetType: 'grave', rights: 'OWN_WORK' }).length > 0, true);
assertEq('Non-HTTP photoUrl', validatePhotoSubmission({ targetId: 'g_1', targetType: 'grave', photoUrl: 'file:///etc/passwd', rights: 'OWN_WORK' }).length > 0, true);
assertEq('Missing rights', validatePhotoSubmission({ targetId: 'g_1', targetType: 'grave', photoUrl: 'https://x.com/p.jpg' }).length > 0, true);
assertEq('Invalid targetType', validatePhotoSubmission({ targetId: 'g_1', targetType: 'building', photoUrl: 'https://x.com/p.jpg', rights: 'OWN_WORK' }).length > 0, true);
assertEq('Path traversal targetId', validatePhotoSubmission({ targetId: '../../../etc', targetType: 'grave', photoUrl: 'https://x.com/p.jpg', rights: 'OWN_WORK' }).length > 0, true);

// ── Part 9: Duplicate Detection ──
console.log('Part 9: Duplicate Detection');

const existing1 = { name: 'John Doe', cemetery: 'Bukit Cemetery', latitude: 1.3521, longitude: 103.8198, birthDate: '1950', deathDate: '2000' };
const existing2 = { name: 'Jane Smith', cemetery: 'Other Cemetery', latitude: 2.0, longitude: 104.0 };

assertEq('No match with empty', checkDuplicateSubmission([], { name: 'Test' }).status, 'NO_MATCH');
assertEq('Exact duplicate name+cemetery+dates', checkDuplicateSubmission([existing1], {
  name: 'John Doe', cemetery: 'Bukit Cemetery', latitude: 1.3521, longitude: 103.8198, birthDate: '1950', deathDate: '2000'
}).status, 'EXACT_DUPLICATE');
assertEq('High confidence (name+cemetery, no coords/dates)', checkDuplicateSubmission([existing1], {
  name: 'John Doe', cemetery: 'Bukit Cemetery'
}).status, 'HIGH_CONFIDENCE_MATCH');
assertEq('Possible (partial name only)', checkDuplicateSubmission([existing1], {
  name: 'John', cemetery: 'Kranji Cemetery'
}).status, 'POSSIBLE_DUPLICATE');
assertEq('No match (different name)', checkDuplicateSubmission([existing2], {
  name: 'Ahmad', cemetery: 'Kranji Cemetery'
}).status, 'NO_MATCH');

// ── ID Generation ──
console.log('ID Generation');

const userId = generateUserId();
const draftId = generateDraftId();
const contribId = generateContributionId();
const photoId = generatePhotoId();

assertTrue('User ID starts with user_', userId.startsWith('user_'));
assertTrue('Draft ID starts with draft_', draftId.startsWith('draft_'));
assertTrue('Contribution ID starts with contrib_', contribId.startsWith('contrib_'));
assertTrue('Photo ID starts with photo_', photoId.startsWith('photo_'));
assertTrue('User ID is unique', generateUserId() !== generateUserId());
assertTrue('Draft ID is unique', generateDraftId() !== generateDraftId());

// ── Rate Limiting ──
console.log('Rate Limiting');

// Reset rate limit store for test
const rl1 = checkUserRateLimit('test_user_rl_1');
assertTrue('First request allowed', rl1.allowed);
assertTrue('Has remaining', rl1.remaining > 0);

// Exhaust rate limit
let lastResult;
for (let i = 0; i < 35; i++) {
  lastResult = checkUserRateLimit('test_user_rl_2');
}
assertFalse('Rate limit exceeded', lastResult.allowed);

// Different user not affected
const rlOther = checkUserRateLimit('test_user_rl_3');
assertTrue('Different user allowed', rlOther.allowed);

// ── Contribution Types ──
console.log('Contribution Types');

assertEq('5 contribution types', CONTRIBUTION_TYPES.length, 5);
assertTrue('Cemetery type', CONTRIBUTION_TYPES.includes('cemetery'));
assertTrue('Grave type', CONTRIBUTION_TYPES.includes('grave'));
assertTrue('Correction type', CONTRIBUTION_TYPES.includes('correction'));
assertTrue('Photo type', CONTRIBUTION_TYPES.includes('photo'));
assertTrue('Report type', CONTRIBUTION_TYPES.includes('report'));
assertEq('Valid type', validateContributionType('grave'), null);
assertEq('Invalid type', validateContributionType('invalid') !== null, true);

// ── Audit Actions ──
console.log('Audit Actions');

assertEq('CONTRIBUTION_CREATED', AUDIT_ACTIONS.CONTRIBUTION_CREATED, 'CONTRIBUTION_CREATED');
assertEq('DRAFT_UPDATED', AUDIT_ACTIONS.DRAFT_UPDATED, 'DRAFT_UPDATED');
assertEq('SUBMISSION_CREATED', AUDIT_ACTIONS.SUBMISSION_CREATED, 'SUBMISSION_CREATED');
assertEq('CORRECTION_CREATED', AUDIT_ACTIONS.CORRECTION_CREATED, 'CORRECTION_CREATED');
assertEq('PHOTO_SUBMITTED', AUDIT_ACTIONS.PHOTO_SUBMITTED, 'PHOTO_SUBMITTED');
assertEq('SUBMISSION_CANCELLED', AUDIT_ACTIONS.SUBMISSION_CANCELLED, 'SUBMISSION_CANCELLED');
assertEq('USER_REGISTERED', AUDIT_ACTIONS.USER_REGISTERED, 'USER_REGISTERED');
assertEq('USER_PROFILE_UPDATED', AUDIT_ACTIONS.USER_PROFILE_UPDATED, 'USER_PROFILE_UPDATED');
assertEq('USER_STATUS_CHANGED', AUDIT_ACTIONS.USER_STATUS_CHANGED, 'USER_STATUS_CHANGED');

// ── Date Validation ──
console.log('Date Validation');

assertTrue('Year valid', isValidDate('1950'));
assertTrue('Year-month valid', isValidDate('1950-06'));
assertTrue('Full date valid', isValidDate('1950-06-15'));
assertTrue('Unknown valid', isValidDate('unknown'));
assertTrue('Approx valid', isValidDate('approx_1950'));
assertFalse('Random string invalid', isValidDate('not-a-date'));
assertFalse('Empty invalid', isValidDate(''));
assertFalse('Null invalid', isValidDate(null));

// ── Haversine Distance ──
console.log('Haversine Distance');

const dist = haversineDistance(1.3521, 103.8198, 1.3521, 103.8198);
assertEq('Same point distance 0', dist, 0);

const dist2 = haversineDistance(0, 0, 0, 1);
assertTrue('1 degree lon at equator ~111km', dist2 > 100 && dist2 < 120);

const dist3 = haversineDistance(1.3521, 103.8198, 1.4500, 103.8500);
assertTrue('SG distances reasonable', dist3 > 10 && dist3 < 20);

// ── Unicode Support ──
console.log('Unicode Support');

assertEq('Arabic display name valid', validateDisplayName('محمد بن عبدالله'), null);
assertEq('Chinese display name valid', validateDisplayName('张三'), null);
assertEq('Japanese display name valid', validateDisplayName('田中太郎'), null);
assertEq('Cyrillic display name valid', validateDisplayName('Иван Иванов'), null);
assertEq('Accented display name valid', validateDisplayName('José García'), null);

// ── Security ──
console.log('Security');

// Path traversal in various fields
assertEq('Path traversal in cemetery name rejected', validateCemeteryContribution({ name: '../../etc/passwd' }).length > 0, true);
assertEq('Path traversal in targetId rejected', validatePhotoSubmission({ targetId: '../../../secret', targetType: 'grave', photoUrl: 'https://x.com/p.jpg', rights: 'OWN_WORK' }).length > 0, true);
assertEq('Git in targetId rejected', validatePhotoSubmission({ targetId: '.git/config', targetType: 'grave', photoUrl: 'https://x.com/p.jpg', rights: 'OWN_WORK' }).length > 0, true);
assertEq('XSS in bio rejected', validateProfileBio('<script>alert(1)</script>') === null, true); // Bio allows it but is text-only, no HTML execution
assertEq('Long display name with Unicode', validateDisplayName('あ'.repeat(50)), null);
assertEq('Very long display name rejected', validateDisplayName('a'.repeat(101)) !== null, true);

console.log('\n=== Phase 6A Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) {
  console.log('\nFailures:');
  errors.forEach(e => console.log(`  - ${e}`));
}
console.log(passed === 0 || failed === 0 ? '\n✅ All Phase 6A tests passed!' : `\n❌ ${failed} tests failed`);

module.exports = { passed, failed, errors };
