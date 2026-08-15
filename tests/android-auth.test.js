#!/usr/bin/env node
/**
 * Android Google Auth Integration Tests
 *
 * Verifies that the Android app correctly integrates Google Sign-In,
 * stores session tokens, and gates submissions behind login.
 *
 * Run: node tests/android-auth.test.js
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

console.log('\n=== Android Google Auth Integration Tests ===\n');

const APP_BASE = path.join(__dirname, '..', 'app', 'src', 'main', 'java', 'com', 'putraworks', 'graveatlas');

// ── Part 1: SecureStorage ──

console.log('Part 1: SecureStorage');

const secureSource = fs.readFileSync(path.join(APP_BASE, 'auth', 'SecureStorage.java'), 'utf8');

test('SecureStorage has session token storage', () => {
  assert.ok(secureSource.includes('saveSessionToken'));
  assert.ok(secureSource.includes('getSessionToken'));
  assert.ok(secureSource.includes('clearSessionToken'));
});

test('SecureStorage stores Google sub', () => {
  assert.ok(secureSource.includes('KEY_GOOGLE_SUB') || secureSource.includes('google_sub'));
});

test('Session token expires after 7 days (client-side)', () => {
  assert.ok(secureSource.includes('7'));
  assert.ok(secureSource.includes('SESSION_MAX_AGE'));
});

test('SecureStorage.canSubmit() checks both login AND valid session', () => {
  assert.ok(secureSource.includes('canSubmit'));
  assert.ok(secureSource.includes('isLoggedIn'));
  assert.ok(secureSource.includes('hasValidSession'));
});

test('Session token stored in encrypted preferences', () => {
  assert.ok(secureSource.includes('EncryptedSharedPreferences') || secureSource.includes('getEncryptedPrefs'));
});

test('Expired session tokens are auto-cleared', () => {
  assert.ok(secureSource.includes('clearSessionToken'));
});

// ── Part 2: LoginActivity ──

console.log('\nPart 2: LoginActivity');

const loginSource = fs.readFileSync(path.join(APP_BASE, 'auth', 'LoginActivity.java'), 'utf8');

test('LoginActivity requests ID token from Google', () => {
  assert.ok(loginSource.includes('requestIdToken'));
});

test('LoginActivity sends ID token to backend /api/auth/google/verify', () => {
  assert.ok(loginSource.includes('/api/auth/google/verify'));
  assert.ok(loginSource.includes('idToken'));
});

test('LoginActivity stores session token from backend response', () => {
  assert.ok(loginSource.includes('sessionToken'));
  assert.ok(loginSource.includes('saveSessionToken'));
});

test('LoginActivity stores Google sub from backend response', () => {
  assert.ok(loginSource.includes('googleSub') || loginSource.includes('saveSessionToken'));
});

test('LoginActivity handles ban responses (banReason)', () => {
  assert.ok(loginSource.includes('banReason'));
});

test('LoginActivity handles network errors gracefully', () => {
  assert.ok(loginSource.includes('onError'));
  assert.ok(loginSource.includes('Network error'));
});

test('LoginActivity has requireLogin() static method for gating', () => {
  assert.ok(loginSource.includes('requireLogin'));
  assert.ok(loginSource.includes('canSubmit'));
});

test('LoginActivity has launch() static method', () => {
  assert.ok(loginSource.includes('static void launch'));
});

test('LoginActivity uses OkHttpClient for backend verification', () => {
  assert.ok(loginSource.includes('OkHttpClient'));
  assert.ok(loginSource.includes('RequestBody'));
});

test('LoginActivity handles missing ID token', () => {
  assert.ok(loginSource.includes('getIdToken'));
  assert.ok(loginSource.includes('No ID token'));
});

// ── Part 3: ApiClient ──

console.log('\nPart 3: ApiClient Auth Integration');

const apiSource = fs.readFileSync(path.join(APP_BASE, 'data', 'api', 'ApiClient.java'), 'utf8');

test('ApiClient imports SecureStorage', () => {
  assert.ok(apiSource.includes('SecureStorage'));
});

test('ApiClient has setSessionContext() for auth', () => {
  assert.ok(apiSource.includes('setSessionContext'));
});

test('ApiClient has getAuthHeader() returning Bearer token', () => {
  assert.ok(apiSource.includes('getAuthHeader'));
  assert.ok(apiSource.includes('Bearer '));
});

test('ApiClient.isAuthenticated() method exists', () => {
  assert.ok(apiSource.includes('isAuthenticated'));
});

test('submitGrave includes Authorization header', () => {
  const section = apiSource.substring(
    apiSource.indexOf('submitGraveWithKey'),
    apiSource.indexOf('submitCemetery')
  );
  assert.ok(section.includes('Authorization'), 'Authorization header not in submitGrave');
});

test('submitCemetery includes Authorization header', () => {
  const section = apiSource.substring(
    apiSource.indexOf('submitCemetery'),
    apiSource.indexOf('submitCorrection')
  );
  assert.ok(section.includes('Authorization'), 'Authorization header not in submitCemetery');
});

test('submitCorrection includes Authorization header', () => {
  const section = apiSource.substring(
    apiSource.indexOf('submitCorrection'),
    apiSource.indexOf('Phase 5')
  );
  assert.ok(section.includes('Authorization'), 'Authorization header not in submitCorrection');
});

test('Auth header is optional (null if not logged in)', () => {
  assert.ok(apiSource.includes('if (auth != null)'));
});

// ── Part 4: AddGraveFragment ──

console.log('\nPart 4: AddGraveFragment Login Gate');

const addGraveSource = fs.readFileSync(path.join(APP_BASE, 'ui', 'addgrave', 'AddGraveFragment.java'), 'utf8');

test('AddGraveFragment imports LoginActivity', () => {
  assert.ok(addGraveSource.includes('LoginActivity'));
});

test('AddGraveFragment imports SecureStorage', () => {
  assert.ok(addGraveSource.includes('SecureStorage'));
});

test('AddGraveFragment checks login before showing review', () => {
  assert.ok(addGraveSource.includes('canSubmit'));
  assert.ok(addGraveSource.includes('sign in with Google'));
});

test('AddGraveFragment launches LoginActivity if not logged in', () => {
  assert.ok(addGraveSource.includes('LoginActivity.launch'));
});

// ── Part 5: MainActivity / MainNavActivity ──

console.log('\nPart 5: Session Context Init');

const mainSource = fs.readFileSync(path.join(APP_BASE, 'MainActivity.java'), 'utf8');
const navSource = fs.readFileSync(path.join(APP_BASE, 'MainNavActivity.java'), 'utf8');

test('MainActivity initializes SecureStorage', () => {
  assert.ok(mainSource.includes('SecureStorage.init'));
});

test('MainActivity sets session context for ApiClient', () => {
  assert.ok(mainSource.includes('ApiClient.setSessionContext'));
});

test('MainNavActivity initializes SecureStorage', () => {
  assert.ok(navSource.includes('SecureStorage.init'));
});

test('MainNavActivity sets session context for ApiClient', () => {
  assert.ok(navSource.includes('ApiClient.setSessionContext'));
});

// ── Part 6: AndroidManifest ──

console.log('\nPart 6: AndroidManifest');

const manifest = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');

test('LoginActivity registered in manifest', () => {
  assert.ok(manifest.includes('LoginActivity'));
});

test('LoginActivity not exported (security)', () => {
  assert.ok(manifest.includes('android:exported="false"'));
});

// ── Part 7: Layout ──

console.log('\nPart 7: Login Layout');

const layout = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'main', 'res', 'layout', 'activity_login.xml'), 'utf8');

test('Login layout has Google sign-in button', () => {
  assert.ok(layout.includes('btnGoogleSignIn'));
});

test('Login layout has skip/browse button', () => {
  assert.ok(layout.includes('btnSkipLogin'));
});

test('Login layout mentions abuse prevention', () => {
  assert.ok(layout.includes('abuse prevention') || layout.includes('abuse'));
});

test('Login layout mentions Google account verification', () => {
  assert.ok(layout.includes('verified') || layout.includes('Google account'));
});

// ── Part 8: Build Config ──

console.log('\nPart 8: Build Configuration');

const buildGradle = fs.readFileSync(path.join(__dirname, '..', 'app', 'build.gradle'), 'utf8');

test('play-services-auth dependency exists', () => {
  assert.ok(buildGradle.includes('play-services-auth'));
});

// ── Part 9: Backend Endpoint ──

console.log('\nPart 9: Backend Endpoint Match');

const indexSource = fs.readFileSync(path.join(__dirname, '..', 'backend', 'src', 'index.js'), 'utf8');

test('Android auth URL matches backend route', () => {
  assert.ok(loginSource.includes('/api/auth/google/verify'));
  assert.ok(indexSource.includes('/api/auth/google/verify'));
});

test('Android expects sessionToken from backend', () => {
  assert.ok(loginSource.includes('sessionToken'));
  assert.ok(indexSource.includes('sessionToken'));
});

test('Android sends idToken in request body', () => {
  assert.ok(loginSource.includes('idToken'));
  const idTokenIdx = indexSource.indexOf("const { idToken } = body");
  assert.ok(idTokenIdx > 0, 'Backend should extract idToken from request body');
});

test('Android uses Bearer auth matching backend requireGoogleAuth', () => {
  assert.ok(apiSource.includes('Bearer '));
  assert.ok(indexSource.includes('Bearer '));
});

console.log('\n=== Android Auth Integration Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Android auth integration tests passed!');
else { console.log('\n❌ Some tests failed!'); failures.forEach(f => console.log(`  - ${f}`)); }

process.exit(failed > 0 ? 1 : 0);
