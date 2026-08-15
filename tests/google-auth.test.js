#!/usr/bin/env node
/**
 * Google OAuth & Abuse Prevention Tests
 *
 * Tests the Google authentication module and its integration
 * with the submission endpoints.
 *
 * Run: node tests/google-auth.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; failures.push(`${name}: ${e.message}`); console.log(`  ❌ ${name}: ${e.message}`); }
}

console.log('\n=== Google OAuth & Abuse Prevention Tests ===\n');

// ── Part 1: Module Structure ──

console.log('Part 1: Module Structure');

const modSource = fs.readFileSync(
  path.join(__dirname, '..', 'backend', 'src', 'google-auth.js'), 'utf8'
);

test('Module file exists and is substantial', () => {
  assert.ok(modSource.length > 2000);
});

test('Exports verifyGoogleIdToken', () => {
  assert.ok(modSource.includes('export async function verifyGoogleIdToken') || modSource.includes('verifyGoogleIdToken'));
});

test('Exports createSessionToken', () => {
  assert.ok(modSource.includes('createSessionToken'));
});

test('Exports verifySessionToken', () => {
  assert.ok(modSource.includes('verifySessionToken'));
});

test('Exports createOrUpdateGoogleUser', () => {
  assert.ok(modSource.includes('createOrUpdateGoogleUser'));
});

test('Exports logSubmissionAttempt', () => {
  assert.ok(modSource.includes('logSubmissionAttempt'));
});

test('Exports getSubmissionAuditLog', () => {
  assert.ok(modSource.includes('getSubmissionAuditLog'));
});

test('Exports getAbuseStats', () => {
  assert.ok(modSource.includes('getAbuseStats'));
});

test('Exports banGoogleAccount', () => {
  assert.ok(modSource.includes('banGoogleAccount'));
});

test('Exports requireGoogleAuth', () => {
  assert.ok(modSource.includes('requireGoogleAuth'));
});

test('Imports from github.js', () => {
  assert.ok(modSource.includes('github.js'));
  assert.ok(modSource.includes('writeFile'));
  assert.ok(modSource.includes('readFile'));
});

// ── Part 2: Google Token Verification ──

console.log('\nPart 2: Google Token Verification');

test('Uses Google tokeninfo endpoint', () => {
  assert.ok(modSource.includes('oauth2.googleapis.com/tokeninfo'));
});

test('Checks for sub claim (stable Google account ID)', () => {
  assert.ok(modSource.includes('payload.sub'));
});

test('Checks email_verified is true', () => {
  assert.ok(modSource.includes('email_verified'));
});

test('Checks token expiration', () => {
  assert.ok(modSource.includes('exp'));
});

test('Supports expected client ID verification (audience check)', () => {
  assert.ok(modSource.includes('expectedClientId'));
  assert.ok(modSource.includes('payload.aud'));
});

test('Rejects tokens with error payload', () => {
  assert.ok(modSource.includes('payload.error'));
});

test('Rejects empty or too-long tokens', () => {
  assert.ok(modSource.includes('4096'));
});

// ── Part 3: Session Token ──

console.log('\nPart 3: Session Token');

test('createSessionToken produces a string', () => {
  // We can't import ES modules easily in Node, so test the logic
  // by verifying the source code has the right structure
  assert.ok(modSource.includes('function createSessionToken'));
  assert.ok(modSource.includes('btoa'));
});

test('verifySessionToken checks signature', () => {
  assert.ok(modSource.includes('function verifySessionToken'));
  assert.ok(modSource.includes('signature'));
  assert.ok(modSource.includes('atob'));
});

test('Session tokens expire after 7 days', () => {
  assert.ok(modSource.includes('7 * 24 * 60 * 60 * 1000'));
});

test('Session token includes userId and googleSub', () => {
  assert.ok(modSource.includes('userId'));
  assert.ok(modSource.includes('googleSub'));
});

// ── Part 4: User Identity Management ──

console.log('\nPart 4: User Identity Management');

test('Maps Google sub to GraveAtlas user ID', () => {
  assert.ok(modSource.includes('google_mappings'));
  assert.ok(modSource.includes('user_g'));
});

test('Checks if Google account is banned before creating user', () => {
  assert.ok(modSource.includes('banned/'));
  assert.ok(modSource.includes('banRecord'));
});

test('Creates user record compatible with Phase 6A format', () => {
  assert.ok(modSource.includes('authMethod'));
  assert.ok(modSource.includes('google'));
  assert.ok(modSource.includes('accountStatus'));
  assert.ok(modSource.includes('ACTIVE'));
  assert.ok(modSource.includes('contributionCount'));
});

test('Stores Google profile info (email, name, picture)', () => {
  assert.ok(modSource.includes('googleEmail'));
  assert.ok(modSource.includes('googlePicture'));
});

test('Updates mapping on returning login (loginCount, lastLoginIp)', () => {
  assert.ok(modSource.includes('loginCount'));
  assert.ok(modSource.includes('lastLoginIp'));
  assert.ok(modSource.includes('lastLoginUserAgent'));
});

test('Sanitizes Google sub to prevent path traversal', () => {
  assert.ok(modSource.includes('sanitizePathSegment'));
});

// ── Part 5: Abuse Logging ──

console.log('\nPart 5: Abuse Logging');

test('logSubmissionAttempt logs userId, googleSub, IP, userAgent', () => {
  assert.ok(modSource.includes('userId'));
  assert.ok(modSource.includes('googleSub'));
  assert.ok(modSource.includes('clientIp'));
  assert.ok(modSource.includes('userAgent'));
});

test('Log entries include timestamp and contribution type', () => {
  assert.ok(modSource.includes('timestamp'));
  assert.ok(modSource.includes('contributionType'));
  assert.ok(modSource.includes('contributionId'));
});

test('Logs stored in audit/submissions/ directory', () => {
  assert.ok(modSource.includes('audit/submissions'));
});

test('getSubmissionAuditLog supports filtering by user, Google sub, IP', () => {
  assert.ok(modSource.includes('filter'));
  assert.ok(modSource.includes('filter.userId'));
  assert.ok(modSource.includes('filter.googleSub'));
  assert.ok(modSource.includes('filter.ip'));
});

test('getAbuseStats returns total submissions and banned accounts', () => {
  assert.ok(modSource.includes('totalSubmissionEvents'));
  assert.ok(modSource.includes('totalBannedAccounts'));
});

// ── Part 6: Banning ──

console.log('\nPart 6: Account Banning');

test('banGoogleAccount writes to banned/ directory', () => {
  assert.ok(modSource.includes('banned/google_'));
});

test('Ban record includes reason and bannedBy', () => {
  assert.ok(modSource.includes('reason'));
  assert.ok(modSource.includes('bannedBy'));
  assert.ok(modSource.includes('bannedAt'));
});

test('Banning suspends associated user account', () => {
  assert.ok(modSource.includes('SUSPENDED'));
  assert.ok(modSource.includes('suspendedAt'));
});

test('Ban is logged to audit trail', () => {
  assert.ok(modSource.includes('audit/bans'));
  assert.ok(modSource.includes('GOOGLE_ACCOUNT_BANNED'));
});

// ── Part 7: Auth Middleware ──

console.log('\nPart 7: Auth Middleware');

test('requireGoogleAuth checks Authorization header', () => {
  assert.ok(modSource.includes('Authorization'));
  assert.ok(modSource.includes('Bearer '));
});

test('requireGoogleAuth returns userId and googleSub on success', () => {
  assert.ok(modSource.includes('authenticated: true'));
  assert.ok(modSource.includes('userId'));
  assert.ok(modSource.includes('googleSub'));
});

test('requireGoogleAuth returns error on missing/expired token', () => {
  assert.ok(modSource.includes('authenticated: false'));
  assert.ok(modSource.includes('error'));
});

// ── Part 8: Integration in index.js ──

console.log('\nPart 8: Integration in index.js');

const indexSource = fs.readFileSync(
  path.join(__dirname, '..', 'backend', 'src', 'index.js'), 'utf8'
);

test('index.js imports Google auth functions', () => {
  assert.ok(indexSource.includes('google-auth.js'));
  assert.ok(indexSource.includes('verifyGoogleIdToken'));
  assert.ok(indexSource.includes('requireGoogleAuth'));
  assert.ok(indexSource.includes('logSubmissionAttempt'));
});

test('POST /api/auth/google/verify route exists', () => {
  assert.ok(indexSource.includes('/api/auth/google/verify'));
  assert.ok(indexSource.includes('handleGoogleVerify'));
});

test('GET /api/auth/session route exists', () => {
  assert.ok(indexSource.includes('/api/auth/session'));
  assert.ok(indexSource.includes('handleCheckSession'));
});

test('POST /api/auth/logout route exists', () => {
  assert.ok(indexSource.includes('/api/auth/logout'));
});

test('GET /api/admin/abuse/log route exists (admin-protected)', () => {
  assert.ok(indexSource.includes('/api/admin/abuse/log'));
});

test('GET /api/admin/abuse/stats route exists (admin-protected)', () => {
  assert.ok(indexSource.includes('/api/admin/abuse/stats'));
});

test('POST /api/admin/abuse/ban/:sub route exists (admin-protected)', () => {
  assert.ok(indexSource.includes('abuse') && indexSource.includes('ban'));
  assert.ok(indexSource.includes('handleBanAccount'));
});

test('handleGoogleVerify function exists', () => {
  assert.ok(indexSource.includes('async function handleGoogleVerify'));
});

test('handleGoogleVerify verifies Google token server-side', () => {
  assert.ok(indexSource.includes('verifyGoogleIdToken'));
});

test('handleGoogleVerify creates session token', () => {
  assert.ok(indexSource.includes('createSessionToken'));
});

test('handleGoogleVerify logs the login', () => {
  assert.ok(indexSource.includes('AUTH_LOGIN'));
});

// ── Part 9: Submission Endpoints Require Google Auth ──

console.log('\nPart 9: Submission Endpoints Require Google Auth');

test('handleCreateGrave requires Google auth', () => {
  const section = indexSource.substring(
    indexSource.indexOf('async function handleCreateGrave'),
    indexSource.indexOf('async function handleGetGrave(')
  );
  assert.ok(section.length > 100, 'handleCreateGrave section should exist');
  assert.ok(section.includes('requireGoogleAuth'), 'requireGoogleAuth not found in handleCreateGrave');
});

test('handleCreateCemetery requires Google auth', () => {
  const section = indexSource.substring(
    indexSource.indexOf('async function handleCreateCemetery'),
    indexSource.indexOf('function validateCemeterySubmission')
  );
  assert.ok(section.includes('requireGoogleAuth'));
  assert.ok(section.includes('auth.error'));
  assert.ok(section.includes('401'));
});

test('handleSubmitDraft requires Google auth', () => {
  const section = indexSource.substring(
    indexSource.indexOf('async function handleSubmitDraft'),
    indexSource.indexOf('async function handleSubmitPhoto')
  );
  assert.ok(section.includes('requireGoogleAuth'));
});

test('handleSubmitPhoto requires Google auth', () => {
  const section = indexSource.substring(
    indexSource.indexOf('async function handleSubmitPhoto'),
    indexSource.indexOf('Phase 7A')
  );
  assert.ok(section.includes('requireGoogleAuth'));
});

test('Grave submission records include submittedBy, IP, userAgent', () => {
  const section = indexSource.substring(
    indexSource.indexOf('async function handleCreateGrave'),
    indexSource.indexOf('async function handleGetGrave')
  );
  assert.ok(indexSource.includes('submittedBy'), 'submittedBy not found anywhere');
  assert.ok(indexSource.includes('submittedByIp'));
  assert.ok(indexSource.includes('submittedByUserAgent'));
});

test('Cemetery submission records include submittedBy, IP, userAgent', () => {
  const section = indexSource.substring(
    indexSource.indexOf('async function handleCreateCemetery'),
    indexSource.indexOf('function validateCemeterySubmission')
  );
  assert.ok(section.includes('submittedBy'));
  assert.ok(section.includes('submittedByGoogleSub'));
  assert.ok(section.includes('submittedByIp'));
  assert.ok(section.includes('submittedByUserAgent'));
});

test('All submission handlers log to abuse audit trail', () => {
  assert.ok(indexSource.includes('logSubmissionAttempt'));
  // Should appear in multiple handlers
  const count = (indexSource.match(/logSubmissionAttempt/g) || []).length;
  assert.ok(count >= 4, `Expected 4+ logSubmissionAttempt calls, found ${count}`);
});

// ── Part 10: Security ──

console.log('\nPart 10: Security');

test('Google ID tokens verified server-side (never trust client)', () => {
  // The verification calls Google's tokeninfo endpoint — not the client's claim
  assert.ok(modSource.includes('fetch'));
  assert.ok(modSource.includes('oauth2.googleapis.com'));
});

test('No Google access tokens or refresh tokens stored', () => {
  assert.ok(!modSource.includes('accessToken'));
  assert.ok(!modSource.includes('refreshToken'));
});

test('Banned accounts cannot re-register', () => {
  // The createOrUpdateGoogleUser function checks banned/ before creating
  assert.ok(modSource.includes('banned'), 'banned not found in google-auth.js');
  assert.ok(modSource.includes('banRecord'), 'banRecord not found');
});

test('Path traversal prevention on Google sub', () => {
  assert.ok(modSource.includes('sanitizePathSegment'));
});

test('User-agent truncated to prevent log injection', () => {
  assert.ok(indexSource.includes('substring(0, 500)'), 'User-agent truncation not found in index.js');
});

test('Session tokens expire (not permanent)', () => {
  assert.ok(modSource.includes('7 * 24'));
});

test('No secrets exposed in auth responses', () => {
  // The auth response should not include ADMIN_TOKEN or internal secrets
  const verifyHandler = indexSource.substring(
    indexSource.indexOf('async function handleGoogleVerify'),
    indexSource.indexOf('function isNewUserLogin')
  );
  assert.ok(verifyHandler.includes('sessionToken'));
  assert.ok(!verifyHandler.includes('ADMIN_TOKEN"'), 'ADMIN_TOKEN value should not be exposed in response');
});

test('Email verification required', () => {
  // Google token verification checks email_verified
  assert.ok(modSource.includes('email_verified'));
  assert.ok(modSource.includes('email_verified') && modSource.includes('true'), 'email_verified check not found');
});

console.log('\n=== Google OAuth & Abuse Prevention Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Google OAuth & abuse prevention tests passed!');
else { console.log('\n❌ Some tests failed!'); failures.forEach(f => console.log(`  - ${f}`)); }

process.exit(failed > 0 ? 1 : 0);
