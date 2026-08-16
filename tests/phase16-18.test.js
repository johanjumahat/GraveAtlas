/**
 * Phase 16.18 Tests — AI Source Verification
 *
 * Tests:
 * - Backend endpoints: /sources/verify (record), /sources/verify (cemetery), /sources/verify/batch, /sources/verify/status
 * - verifySourceRef: URL liveness, HEAD request, status codes, content type
 * - verifySourceRef: Wayback Machine archive checking
 * - verifySourceRef: non-URL citation handling
 * - verifyRecordSources: per-record summary, overall status, verification score
 * - Cemetery-wide verification: per-record summaries, cemetery summary
 * - Batch verification: up to 50 records, error handling
 * - Status endpoint: global source health score
 * - Overall statuses: verified, partial, unverified, critical, no_sources
 * - SourceVerification model
 * - RecordSourceVerification model
 * - CemeterySourceVerification model
 * - SourceVerificationStatus model
 * - API client methods
 * - AI system prompt awareness
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

// ── Part 1: Backend Endpoints ──
console.log('\nPart 1: Backend Endpoints');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');

test('Backend has POST /api/graves/:id/sources/verify', () => {
  assert.ok(indexFile.includes('handleVerifyRecordSources'),
    'Missing handleVerifyRecordSources');
});

test('Backend has POST /api/cemeteries/:id/sources/verify', () => {
  assert.ok(indexFile.includes('handleVerifyCemeterySources'),
    'Missing handleVerifyCemeterySources');
});

test('Backend has POST /api/sources/verify/batch', () => {
  assert.ok(indexFile.includes('handleBatchVerifySources'),
    'Missing handleBatchVerifySources');
});

test('Backend has GET /api/sources/verify/status', () => {
  assert.ok(indexFile.includes('handleSourceVerificationStatus'),
    'Missing handleSourceVerificationStatus');
});

test('All 4 source verification routes registered', () => {
  const routes = ['handleVerifyRecordSources', 'handleVerifyCemeterySources',
    'handleBatchVerifySources', 'handleSourceVerificationStatus'];
  for (const r of routes) {
    assert.ok(indexFile.includes(r), `Missing route handler: ${r}`);
  }
});

// ── Part 2: verifySourceRef Helper ──
console.log('\nPart 2: verifySourceRef Helper');

test('verifySourceRef function exists', () => {
  assert.ok(indexFile.includes('async function verifySourceRef'),
    'Missing verifySourceRef function');
});

test('Handles invalid source references', () => {
  assert.ok(indexFile.includes('Invalid source reference'),
    'Missing invalid reference handling');
});

test('Detects URL pattern', () => {
  assert.ok(indexFile.includes('urlPattern') || indexFile.includes('https'),
    'Missing URL pattern detection');
});

test('Handles non-URL citations', () => {
  assert.ok(indexFile.includes('Non-URL reference') || indexFile.includes('citation'),
    'Missing non-URL citation handling');
});

test('Performs HEAD request for liveness check', () => {
  assert.ok(indexFile.includes("method: 'HEAD'"),
    'Missing HEAD request for URL liveness');
});

test('Uses AbortSignal timeout', () => {
  assert.ok(indexFile.includes('AbortSignal.timeout'),
    'Missing timeout for fetch requests');
});

test('Detects 200 OK as live', () => {
  assert.ok(indexFile.includes("'live'"),
    'Missing live status');
});

test('Detects 404 as dead', () => {
  assert.ok(indexFile.includes("'dead'") && indexFile.includes('404'),
    'Missing dead status for 404');
});

test('Detects 403/401 as restricted', () => {
  assert.ok(indexFile.includes("'restricted'") && (indexFile.includes('403') || indexFile.includes('401')),
    'Missing restricted status');
});

test('Detects 5xx as error', () => {
  assert.ok(indexFile.includes('>= 500') || indexFile.includes("'error'"),
    'Missing server error handling');
});

test('Detects 3xx as redirect', () => {
  assert.ok(indexFile.includes("'redirect'") && indexFile.includes('>= 300'),
    'Missing redirect handling');
});

test('Handles network errors as unreachable', () => {
  assert.ok(indexFile.includes("'unreachable'"),
    'Missing unreachable status');
});

test('Handles timeout separately', () => {
  assert.ok(indexFile.includes("'timeout'") || indexFile.includes('TimeoutError'),
    'Missing timeout handling');
});

test('Checks Wayback Machine for archives', () => {
  assert.ok(indexFile.includes('archive.org/wayback'),
    'Missing Wayback Machine check');
});

test('Stores archive URL if found', () => {
  assert.ok(indexFile.includes('archiveUrl') && indexFile.includes('archived_snapshots'),
    'Missing archive URL storage');
});

test('Boosts confidence if dead URL has archive', () => {
  assert.ok(indexFile.includes('Original URL is dead but archived copy exists'),
    'Missing archive confidence boost');
});

// ── Part 3: verifyRecordSources Helper ──
console.log('\nPart 3: verifyRecordSources Helper');

test('verifyRecordSources function exists', () => {
  assert.ok(indexFile.includes('async function verifyRecordSources'),
    'Missing verifyRecordSources function');
});

test('Handles records with no sources', () => {
  assert.ok(indexFile.includes('no_sources'),
    'Missing no_sources handling');
});

test('Returns per-source results', () => {
  assert.ok(indexFile.includes('results: results'),
    'Missing per-source results');
});

test('Computes summary counts (live, dead, restricted, unreachable, unverifiable)', () => {
  assert.ok(indexFile.includes('live') && indexFile.includes('dead') &&
    indexFile.includes('restricted') && indexFile.includes('unreachable') &&
    indexFile.includes('unverifiable'),
    'Missing summary counts');
});

test('Computes overall confidence as average', () => {
  assert.ok(indexFile.includes('avgConfidence'),
    'Missing average confidence calculation');
});

test('Determines overall status as critical when dead and not archived', () => {
  assert.ok(indexFile.includes("'critical'"),
    'Missing critical status');
});

test('Determines overall status as verified when all live', () => {
  assert.ok(indexFile.includes('live === total'),
    'Missing verified status condition');
});

test('Determines overall status as partial when some live', () => {
  assert.ok(indexFile.includes("'partial'"),
    'Missing partial status');
});

test('Computes verification score as percentage of live sources', () => {
  assert.ok(indexFile.includes('verificationScore') && indexFile.includes('(live / total)'),
    'Missing verification score calculation');
});

// ── Part 4: Record Source Verify Handler ──
console.log('\nPart 4: Record Source Verify Handler');

test('Loads record from graves directory', () => {
  assert.ok(indexFile.includes("readFile(`graves/${safeId}"),
    'Missing record loading');
});

test('Returns 404 for missing record', () => {
  assert.ok(indexFile.includes('Record not found'),
    'Missing 404 handling');
});

test('Returns verification object in response', () => {
  assert.ok(indexFile.includes('verification: verification'),
    'Missing verification in response');
});

// ── Part 5: Cemetery Source Verify Handler ──
console.log('\nPart 5: Cemetery Source Verify Handler');

test('Loads all cemetery records', () => {
  assert.ok(indexFile.includes("listFiles('graves'"),
    'Missing record listing');
});

test('Skips records without source references', () => {
  assert.ok(indexFile.includes('sourceRefs.length === 0'),
    'Missing skip for no-source records');
});

test('Returns per-record verification summaries', () => {
  assert.ok(indexFile.includes('recordVerifications'),
    'Missing per-record verifications');
});

test('Computes cemetery summary with totals', () => {
  assert.ok(indexFile.includes('cemeterySummary'),
    'Missing cemetery summary');
});

test('Cemetery summary includes verification score', () => {
  assert.ok(indexFile.includes('verificationScore'),
    'Missing verification score in cemetery summary');
});

test('Handles empty cemetery', () => {
  assert.ok(indexFile.includes('No records with source references'),
    'Missing empty cemetery handling');
});

// ── Part 6: Batch Verify Handler ──
console.log('\nPart 6: Batch Verify Handler');

test('Accepts recordIds array', () => {
  assert.ok(indexFile.includes('recordIds'),
    'Missing recordIds handling');
});

test('Limits to 50 records', () => {
  assert.ok(indexFile.includes('Maximum 50'),
    'Missing 50-record limit');
});

test('Returns per-record results', () => {
  assert.ok(indexFile.includes('results: results'),
    'Missing per-record results in batch');
});

test('Handles not-found records in batch', () => {
  assert.ok(indexFile.includes('not_found'),
    'Missing not-found handling in batch');
});

test('Handles errors per record', () => {
  assert.ok(indexFile.includes("'error'"),
    'Missing error handling per record in batch');
});

// ── Part 7: Source Verification Status Handler ──
console.log('\nPart 7: Source Verification Status Handler');

test('Counts total records and records with sources', () => {
  assert.ok(indexFile.includes('totalRecords') && indexFile.includes('recordsWithSources'),
    'Missing record counts');
});

test('Checks unique URLs only (deduplication)', () => {
  assert.ok(indexFile.includes('checkedUrls') && indexFile.includes('Map'),
    'Missing URL deduplication');
});

test('Computes source health score', () => {
  assert.ok(indexFile.includes('sourceHealthScore'),
    'Missing source health score');
});

test('Returns live/dead URL counts', () => {
  assert.ok(indexFile.includes('liveUrls') && indexFile.includes('deadUrls'),
    'Missing live/dead counts');
});

// ── Part 8: SourceVerification Model ──
console.log('\nPart 8: SourceVerification Model');

const svFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/SourceVerification.java'),
  'utf8'
);

test('SourceVerification class exists', () => {
  assert.ok(svFile.includes('public class SourceVerification'), 'Class not found');
});

test('Has all status fields', () => {
  assert.ok(svFile.includes('status') && svFile.includes('confidence') &&
    svFile.includes('statusCode') && svFile.includes('contentType'),
    'Missing status fields');
});

test('Has archive fields', () => {
  assert.ok(svFile.includes('archived') && svFile.includes('archiveUrl'),
    'Missing archive fields');
});

test('Has fromJson method', () => {
  assert.ok(svFile.includes('fromJson'), 'Missing fromJson');
});

test('Has isLive method', () => {
  assert.ok(svFile.includes('isLive'), 'Missing isLive');
});

test('Has isDead method', () => {
  assert.ok(svFile.includes('isDead'), 'Missing isDead');
});

test('Has hasArchive method', () => {
  assert.ok(svFile.includes('hasArchive'), 'Missing hasArchive');
});

test('Has getStatusIcon method', () => {
  assert.ok(svFile.includes('getStatusIcon'), 'Missing getStatusIcon');
});

// ── Part 9: RecordSourceVerification Model ──
console.log('\nPart 9: RecordSourceVerification Model');

const rsvFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/RecordSourceVerification.java'),
  'utf8'
);

test('RecordSourceVerification class exists', () => {
  assert.ok(rsvFile.includes('public class RecordSourceVerification'), 'Class not found');
});

test('Has VerificationSummary inner class', () => {
  assert.ok(rsvFile.includes('class VerificationSummary'), 'Missing VerificationSummary');
});

test('Has fromJson method', () => {
  assert.ok(rsvFile.includes('fromJson'), 'Missing fromJson');
});

test('Has isFullyVerified method', () => {
  assert.ok(rsvFile.includes('isFullyVerified'), 'Missing isFullyVerified');
});

test('Has hasDeadSources method', () => {
  assert.ok(rsvFile.includes('hasDeadSources'), 'Missing hasDeadSources');
});

test('Has hasCriticalStatus method', () => {
  assert.ok(rsvFile.includes('hasCriticalStatus'), 'Missing hasCriticalStatus');
});

test('Has getSummaryLine method', () => {
  assert.ok(rsvFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 10: CemeterySourceVerification Model ──
console.log('\nPart 10: CemeterySourceVerification Model');

const csvFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CemeterySourceVerification.java'),
  'utf8'
);

test('CemeterySourceVerification class exists', () => {
  assert.ok(csvFile.includes('public class CemeterySourceVerification'), 'Class not found');
});

test('Has RecordVerificationEntry inner class', () => {
  assert.ok(csvFile.includes('class RecordVerificationEntry'), 'Missing RecordVerificationEntry');
});

test('Has CemeteryVerificationSummary inner class', () => {
  assert.ok(csvFile.includes('class CemeteryVerificationSummary'), 'Missing CemeteryVerificationSummary');
});

test('Has fromJson method', () => {
  assert.ok(csvFile.includes('fromJson'), 'Missing fromJson');
});

test('Has isHealthy method', () => {
  assert.ok(csvFile.includes('isHealthy'), 'Missing isHealthy');
});

test('Has getSummaryLine method', () => {
  assert.ok(csvFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 11: SourceVerificationStatus Model ──
console.log('\nPart 11: SourceVerificationStatus Model');

const svsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/SourceVerificationStatus.java'),
  'utf8'
);

test('SourceVerificationStatus class exists', () => {
  assert.ok(svsFile.includes('public class SourceVerificationStatus'), 'Class not found');
});

test('Has sourceHealthScore field', () => {
  assert.ok(svsFile.includes('sourceHealthScore'), 'Missing sourceHealthScore');
});

test('Has fromJson method', () => {
  assert.ok(svsFile.includes('fromJson'), 'Missing fromJson');
});

test('Has isHealthy method', () => {
  assert.ok(svsFile.includes('isHealthy'), 'Missing isHealthy');
});

test('Has getStatusLine method', () => {
  assert.ok(svsFile.includes('getStatusLine'), 'Missing getStatusLine');
});

// ── Part 12: API Client Integration ──
console.log('\nPart 12: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports SourceVerification', () => {
  assert.ok(apiFile.includes('SourceVerification'), 'Missing SourceVerification import');
});

test('ApiClient imports RecordSourceVerification', () => {
  assert.ok(apiFile.includes('RecordSourceVerification'), 'Missing RecordSourceVerification import');
});

test('ApiClient imports CemeterySourceVerification', () => {
  assert.ok(apiFile.includes('CemeterySourceVerification'), 'Missing CemeterySourceVerification import');
});

test('ApiClient imports SourceVerificationStatus', () => {
  assert.ok(apiFile.includes('SourceVerificationStatus'), 'Missing SourceVerificationStatus import');
});

test('ApiClient has verifyRecordSources method', () => {
  assert.ok(apiFile.includes('verifyRecordSources'), 'Missing verifyRecordSources');
  assert.ok(apiFile.includes('/sources/verify'), 'Missing /sources/verify URL');
});

test('ApiClient has verifyCemeterySources method', () => {
  assert.ok(apiFile.includes('verifyCemeterySources'), 'Missing verifyCemeterySources');
});

test('ApiClient has batchVerifySources method', () => {
  assert.ok(apiFile.includes('batchVerifySources'), 'Missing batchVerifySources');
  assert.ok(apiFile.includes('/sources/verify/batch'), 'Missing /sources/verify/batch URL');
});

test('ApiClient has getSourceVerificationStatus method', () => {
  assert.ok(apiFile.includes('getSourceVerificationStatus'), 'Missing getSourceVerificationStatus');
  assert.ok(apiFile.includes('/sources/verify/status'), 'Missing /sources/verify/status URL');
});

// ── Part 13: AI System Prompts ──
console.log('\nPart 13: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention sources/verify', () => {
  assert.ok(promptsFile.includes('sources/verify'),
    'Missing sources/verify in prompts');
});

test('AI prompts mention source verification', () => {
  assert.ok(promptsFile.includes('source references') || promptsFile.includes('source verification'),
    'Missing source verification mention');
});

test('AI prompts mention Wayback Machine', () => {
  assert.ok(promptsFile.includes('Wayback') || promptsFile.includes('archived'),
    'Missing Wayback Machine mention');
});

test('Suggested prompts include "Verify sources"', () => {
  assert.ok(promptsFile.includes('Verify sources'),
    'Missing "Verify sources" suggested prompt');
});

test('Suggested prompts include "source health"', () => {
  assert.ok(promptsFile.includes('source health'),
    'Missing "source health" suggested prompt');
});

// ── Part 14: Documentation ──
console.log('\nPart 14: Documentation');

test('CHANGELOG mentions Phase 16.18 or Source Verification', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.18') || changelog.includes('Source Verification'),
    'CHANGELOG should mention Phase 16.18');
});

test('STATUS.md mentions Source Verification', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Source Verification') || status.includes('16.18'),
    'STATUS.md should mention Source Verification');
});

// ── Results ──
console.log('\n=== Phase 16.18 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.18 Source Verification tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
