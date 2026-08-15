#!/usr/bin/env node
/**
 * Phase 16.2 Tests — Evidence Badges in Search + Transparency Feature
 *
 * Verifies:
 * - SearchFragment shows evidence badges on result cards
 * - SearchFragment has "Why am I seeing this?" transparency dialog
 * - GlobalSearchFragment uses actual verificationStatus from SearchResult
 * - GlobalSearchFragment has "Why am I seeing this?" transparency dialog
 * - SearchResult model has verificationStatus field
 * - Backend search results include verificationStatus field
 *
 * Run: node tests/phase16-2.test.js
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

console.log('\n=== Phase 16.2 Tests — Evidence Badges in Search + Transparency ===\n');

const APP_BASE = path.join(__dirname, '..', 'app', 'src', 'main', 'java', 'com', 'putraworks', 'graveatlas');

// ── Part 1: SearchResult Model ──

console.log('Part 1: SearchResult verificationStatus');

const searchResultSource = fs.readFileSync(path.join(APP_BASE, 'data', 'model', 'SearchResult.java'), 'utf8');

test('SearchResult has verificationStatus field', () => {
  assert.ok(searchResultSource.includes('verificationStatus'), 'SearchResult should have verificationStatus field');
});

test('SearchResult parses verificationStatus from JSON', () => {
  assert.ok(searchResultSource.includes('json.optString("verificationStatus"'));
});

// ── Part 2: SearchFragment Evidence Badges ──

console.log('\nPart 2: SearchFragment Evidence Badges');

const searchSource = fs.readFileSync(path.join(APP_BASE, 'ui', 'search', 'SearchFragment.java'), 'utf8');

test('SearchFragment imports EvidenceStatus', () => {
  assert.ok(searchSource.includes('import') && searchSource.includes('EvidenceStatus'));
});

test('SearchFragment displayResults creates evidence badge', () => {
  assert.ok(searchSource.includes('EvidenceStatus.fromVerificationStatus'));
  assert.ok(searchSource.includes('EvidenceStatus.createBadge'));
});

test('SearchFragment uses actual verificationStatus from GraveRecord', () => {
  assert.ok(searchSource.includes('g.verificationStatus'));
});

test('SearchFragment card has top row with badge', () => {
  assert.ok(searchSource.includes('topRow'));
  assert.ok(searchSource.includes('badge'));
});

// ── Part 3: SearchFragment Transparency ──

console.log('\nPart 3: SearchFragment Transparency Feature');

test('SearchFragment has "Why am I seeing this?" link', () => {
  assert.ok(searchSource.includes('Why am I seeing this?'));
});

test('SearchFragment has showEvidenceExplanation method', () => {
  assert.ok(searchSource.includes('showEvidenceExplanation'));
});

test('showEvidenceExplanation shows evidence category label', () => {
  assert.ok(searchSource.includes('category.getLabel()'));
});

test('showEvidenceExplanation shows category description', () => {
  assert.ok(searchSource.includes('category.getDescription()'));
});

test('showEvidenceExplanation shows backend status', () => {
  assert.ok(searchSource.includes('Backend status'));
});

test('showEvidenceExplanation shows source info', () => {
  assert.ok(searchSource.includes('Source'));
});

test('showEvidenceExplanation explains search match', () => {
  assert.ok(searchSource.includes('matches your search query'));
});

test('showEvidenceExplanation uses AlertDialog', () => {
  assert.ok(searchSource.includes('AlertDialog'));
});

test('showEvidenceExplanation has Report Issue button', () => {
  assert.ok(searchSource.includes('Report Issue'));
});

// ── Part 4: GlobalSearchFragment Evidence Badges ──

console.log('\nPart 4: GlobalSearchFragment Evidence Badges');

const globalSearchSource = fs.readFileSync(path.join(APP_BASE, 'ui', 'search', 'GlobalSearchFragment.java'), 'utf8');

test('GlobalSearchFragment uses actual verificationStatus from SearchResult', () => {
  assert.ok(globalSearchSource.includes('r.verificationStatus'));
});

test('GlobalSearchFragment badge uses fromVerificationStatus with r.verificationStatus', () => {
  assert.ok(globalSearchSource.includes('EvidenceStatus.fromVerificationStatus(r.verificationStatus)'));
});

// ── Part 5: GlobalSearchFragment Transparency ──

console.log('\nPart 5: GlobalSearchFragment Transparency Feature');

test('GlobalSearchFragment has "Why am I seeing this?" link', () => {
  assert.ok(globalSearchSource.includes('Why am I seeing this?'));
});

test('GlobalSearchFragment has showEvidenceExplanation method', () => {
  assert.ok(globalSearchSource.includes('showEvidenceExplanation'));
});

test('GlobalSearchFragment showEvidenceExplanation uses SearchResult', () => {
  assert.ok(globalSearchSource.includes('SearchResult r'));
});

test('GlobalSearchFragment showEvidenceExplanation has View Record button', () => {
  assert.ok(globalSearchSource.includes('View Record'));
});

// ── Part 6: Backend Search Returns verificationStatus ──

console.log('\nPart 6: Backend Search Returns verificationStatus');

const indexSource = fs.readFileSync(path.join(__dirname, '..', 'backend', 'src', 'index.js'), 'utf8');

test('Backend search handler exists', () => {
  assert.ok(indexSource.includes('handleSearch') || indexSource.includes('/api/search'));
});

// Check if search results include verificationStatus in the response
test('Backend grave model includes verificationStatus', () => {
  assert.ok(indexSource.includes('verificationStatus'), 'Backend should have verificationStatus field');
});

// ── Part 7: EvidenceStatus Categories ──

console.log('\nPart 7: Evidence Status Categories (regression)');

const evidenceSource = fs.readFileSync(path.join(APP_BASE, 'ui', 'evidence', 'EvidenceStatus.java'), 'utf8');

test('EvidenceStatus has all 6 categories', () => {
  assert.ok(evidenceSource.includes('KNOWN'));
  assert.ok(evidenceSource.includes('SOURCE_BACKED'));
  assert.ok(evidenceSource.includes('INFERRED'));
  assert.ok(evidenceSource.includes('UNCERTAIN'));
  assert.ok(evidenceSource.includes('CONFLICTING'));
  assert.ok(evidenceSource.includes('NEEDS_VERIFICATION'));
});

test('EvidenceStatus.fromVerificationStatus handles null', () => {
  assert.ok(evidenceSource.includes('null') && evidenceSource.includes('NEEDS_VERIFICATION'));
});

test('EvidenceStatus.fromVerificationStatus handles "verified"', () => {
  assert.ok(evidenceSource.includes('verified'));
});

test('EvidenceStatus.createBadge returns TextView', () => {
  assert.ok(evidenceSource.includes('createBadge'));
  assert.ok(evidenceSource.includes('TextView'));
});

// ── Part 8: Phase 16.2 Documentation ──

console.log('\nPart 8: Documentation');

test('Phase 16 roadmap exists', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'docs', 'PHASE-16-ROADMAP.md')));
});

test('CHANGELOG mentions Phase 16.2 or evidence badges in search', () => {
  const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
  assert.ok(
    changelog.includes('evidence badge') || changelog.includes('Phase 16') || changelog.includes('transparency'),
    'CHANGELOG should mention evidence badges or Phase 16'
  );
});

console.log('\n=== Phase 16.2 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.2 tests passed!');
else { console.log('\n❌ Some tests failed!'); failures.forEach(f => console.log(`  - ${f}`)); }

process.exit(failed > 0 ? 1 : 0);
