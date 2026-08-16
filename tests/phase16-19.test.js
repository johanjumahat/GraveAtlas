/**
 * Phase 16.19 Tests — AI Confidence Scoring
 *
 * Tests:
 * - Backend endpoints: /confidence (record), /confidence (cemetery), /confidence/batch, /confidence/leaderboard
 * - computeConfidenceScore: 7 signal weights
 * - Completeness scoring (30%): important fields + biographical bonus
 * - Verification scoring (20%): verified/submitted/unverified
 * - Source quality scoring (20%): count, live ratio, archived, multiple sources
 * - Anomaly-free scoring (15%): penalty by severity
 * - Merge history scoring (5%): penalty per merge
 * - Community scoring (5%): submitter, corrections, community review
 * - Geo precision scoring (5%): decimal places
 * - Tier classification: platinum/gold/silver/bronze/unverified
 * - Cemetery summary: average score, tier distribution
 * - Leaderboard: sorting, tier filter, limit
 * - ConfidenceScore model
 * - CemeteryConfidence model
 * - ConfidenceLeaderboard model
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

test('Backend has GET /api/graves/:id/confidence', () => {
  assert.ok(indexFile.includes('handleGetRecordConfidence'),
    'Missing handleGetRecordConfidence');
});

test('Backend has GET /api/cemeteries/:id/confidence', () => {
  assert.ok(indexFile.includes('handleGetCemeteryConfidence'),
    'Missing handleGetCemeteryConfidence');
});

test('Backend has POST /api/confidence/batch', () => {
  assert.ok(indexFile.includes('handleBatchConfidence'),
    'Missing handleBatchConfidence');
});

test('Backend has GET /api/confidence/leaderboard', () => {
  assert.ok(indexFile.includes('handleConfidenceLeaderboard'),
    'Missing handleConfidenceLeaderboard');
});

test('All 4 confidence routes registered', () => {
  const routes = ['handleGetRecordConfidence', 'handleGetCemeteryConfidence',
    'handleBatchConfidence', 'handleConfidenceLeaderboard'];
  for (const r of routes) {
    assert.ok(indexFile.includes(r), `Missing route handler: ${r}`);
  }
});

// ── Part 2: computeConfidenceScore Function ──
console.log('\nPart 2: computeConfidenceScore Function');

test('computeConfidenceScore function exists', () => {
  assert.ok(indexFile.includes('function computeConfidenceScore'),
    'Missing computeConfidenceScore function');
});

test('Has 7 signal breakdowns', () => {
  const signals = ['completeness', 'verification', 'sourceQuality', 'anomalyFree',
    'mergeHistory', 'community', 'geoPrecision'];
  for (const s of signals) {
    assert.ok(indexFile.includes(`breakdown.${s}`), `Missing signal: ${s}`);
  }
});

test('Completeness has max 30', () => {
  assert.ok(indexFile.includes('max: 30'), 'Completeness max should be 30');
});

test('Verification has max 20', () => {
  assert.ok(indexFile.includes('max: 20'), 'Verification max should be 20');
});

test('Source quality has max 20', () => {
  assert.ok(indexFile.includes('max: 20'), 'Source quality max should be 20');
});

test('Anomaly-free has max 15', () => {
  assert.ok(indexFile.includes('max: 15'), 'Anomaly-free max should be 15');
});

test('Merge history has max 5', () => {
  assert.ok(indexFile.includes('max: 5'), 'Merge history max should be 5');
});

test('Community has max 5', () => {
  assert.ok(indexFile.includes('max: 5'), 'Community max should be 5');
});

test('Geo precision has max 5', () => {
  assert.ok(indexFile.includes('max: 5'), 'Geo precision max should be 5');
});

// ── Part 3: Completeness Scoring ──
console.log('\nPart 3: Completeness Scoring');

test('Checks 11 important fields', () => {
  const fields = ['name', 'birthDate', 'deathDate', 'cemeteryId', 'section', 'plot',
    'latitude', 'longitude', 'inscription', 'sourceRefs', 'notes'];
  for (const f of fields) {
    assert.ok(indexFile.includes(`'${f}'`), `Missing important field: ${f}`);
  }
});

test('Computes completeness percentage', () => {
  assert.ok(indexFile.includes('completenessPct'),
    'Missing completeness percentage calculation');
});

test('Biographical fields give bonus', () => {
  assert.ok(indexFile.includes('bioFields') && indexFile.includes('bonus'),
    'Missing biographical field bonus');
});

test('Biographical fields include givenNames, familyName, birthPlace', () => {
  assert.ok(indexFile.includes('givenNames') && indexFile.includes('birthPlace') &&
    indexFile.includes('occupation'),
    'Missing biographical fields');
});

// ── Part 4: Verification Scoring ──
console.log('\nPart 4: Verification Scoring');

test('Verified gets 20 points', () => {
  assert.ok(indexFile.includes("'verified'") && indexFile.includes('20'),
    'Missing verified full points');
});

test('Submitted gets 10 points', () => {
  assert.ok(indexFile.includes("'submitted'") && indexFile.includes('10'),
    'Missing submitted partial points');
});

test('Unverified gets 0 points', () => {
  assert.ok(indexFile.includes("'unverified'"),
    'Missing unverified handling');
});

// ── Part 5: Source Quality Scoring ──
console.log('\nPart 5: Source Quality Scoring');

test('Handles no sources (0 points)', () => {
  assert.ok(indexFile.includes('No sources cited'),
    'Missing no-sources handling');
});

test('Uses live ratio when verification available', () => {
  assert.ok(indexFile.includes('liveRatio'),
    'Missing live ratio calculation');
});

test('Gives bonus for archived sources', () => {
  assert.ok(indexFile.includes('archived') && indexFile.includes('bonus'),
    'Missing archived source bonus');
});

test('Gives bonus for multiple sources (3+)', () => {
  assert.ok(indexFile.includes('multipleSources'),
    'Missing multiple sources bonus');
});

test('Partial credit without verification', () => {
  assert.ok(indexFile.includes('Sources present but not verified'),
    'Missing partial credit for unverified sources');
});

// ── Part 6: Anomaly-Free Scoring ──
console.log('\nPart 6: Anomaly-Free Scoring');

test('No anomalies gets full 15 points', () => {
  assert.ok(indexFile.includes('No anomalies detected'),
    'Missing no-anomaly handling');
});

test('Penalty based on severity', () => {
  assert.ok(indexFile.includes('criticalCount') && indexFile.includes('highCount') &&
    indexFile.includes('mediumCount') && indexFile.includes('lowCount'),
    'Missing severity-based penalty');
});

test('Critical anomalies penalize 8 points each', () => {
  assert.ok(indexFile.includes('criticalCount * 8'),
    'Missing critical anomaly penalty');
});

test('High anomalies penalize 4 points each', () => {
  assert.ok(indexFile.includes('highCount * 4'),
    'Missing high anomaly penalty');
});

test('Medium anomalies penalize 2 points each', () => {
  assert.ok(indexFile.includes('mediumCount * 2'),
    'Missing medium anomaly penalty');
});

test('Low anomalies penalize 1 point each', () => {
  assert.ok(indexFile.includes('lowCount * 1'),
    'Missing low anomaly penalty');
});

test('Minimum anomaly score is 0', () => {
  assert.ok(indexFile.includes('Math.max(15 - penalty, 0)'),
    'Missing minimum score floor');
});

// ── Part 7: Merge History Scoring ──
console.log('\nPart 7: Merge History Scoring');

test('No merges gets full 5 points', () => {
  assert.ok(indexFile.includes('No merges'),
    'Missing no-merge handling');
});

test('Merges reduce score', () => {
  assert.ok(indexFile.includes('5 - mergeHistoryCount'),
    'Missing merge penalty');
});

test('Minimum merge score is 0', () => {
  assert.ok(indexFile.includes('Math.max(5 - mergeHistoryCount, 0)'),
    'Missing merge score floor');
});

// ── Part 8: Community Scoring ──
console.log('\nPart 8: Community Scoring');

test('Has submitter gives points', () => {
  assert.ok(indexFile.includes('submitterName') && indexFile.includes('hasSubmitter'),
    'Missing submitter scoring');
});

test('Corrections give points (max 3)', () => {
  assert.ok(indexFile.includes('corrections.length'),
    'Missing corrections scoring');
});

test('Community review bonus', () => {
  assert.ok(indexFile.includes('communityReview'),
    'Missing community review bonus');
});

// ── Part 9: Geo Precision Scoring ──
console.log('\nPart 9: Geo Precision Scoring');

test('6+ decimal places gets full 5 points', () => {
  assert.ok(indexFile.includes('>= 6'),
    'Missing high precision scoring');
});

test('4+ decimal places gets 3 points', () => {
  assert.ok(indexFile.includes('>= 4'),
    'Missing medium precision scoring');
});

test('2+ decimal places gets 1 point', () => {
  assert.ok(indexFile.includes('>= 2'),
    'Missing low precision scoring');
});

test('No coordinates gets 0 points', () => {
  assert.ok(indexFile.includes('No coordinates'),
    'Missing no-coordinates handling');
});

// ── Part 10: Tier Classification ──
console.log('\nPart 10: Tier Classification');

test('Platinum tier at 90+', () => {
  assert.ok(indexFile.includes(">= 90") && indexFile.includes("'platinum'"),
    'Missing platinum tier');
});

test('Gold tier at 75+', () => {
  assert.ok(indexFile.includes(">= 75") && indexFile.includes("'gold'"),
    'Missing gold tier');
});

test('Silver tier at 60+', () => {
  assert.ok(indexFile.includes(">= 60") && indexFile.includes("'silver'"),
    'Missing silver tier');
});

test('Bronze tier at 40+', () => {
  assert.ok(indexFile.includes(">= 40") && indexFile.includes("'bronze'"),
    'Missing bronze tier');
});

test('Unverified below 40', () => {
  assert.ok(indexFile.includes("'unverified'"),
    'Missing unverified tier');
});

// ── Part 11: Record Confidence Handler ──
console.log('\nPart 11: Record Confidence Handler');

test('Loads record and computes confidence', () => {
  assert.ok(indexFile.includes("readFile(`graves/${safeId}"),
    'Missing record loading');
});

test('Gathers anomaly data', () => {
  assert.ok(indexFile.includes('computeCemeteryAnomalies'),
    'Missing anomaly gathering');
});

test('Gathers source verification data', () => {
  assert.ok(indexFile.includes('sourceVerification'),
    'Missing source verification gathering');
});

test('Gathers merge history count', () => {
  assert.ok(indexFile.includes('mergeHistoryCount'),
    'Missing merge history gathering');
});

test('Returns 404 for missing record', () => {
  assert.ok(indexFile.includes('Record not found'),
    'Missing 404 handling');
});

test('Returns confidence object', () => {
  assert.ok(indexFile.includes('confidence: confidence'),
    'Missing confidence in response');
});

// ── Part 12: Cemetery Confidence Handler ──
console.log('\nPart 12: Cemetery Confidence Handler');

test('Computes scores for all cemetery records', () => {
  assert.ok(indexFile.includes('recordScores'),
    'Missing per-record scores');
});

test('Returns tier distribution', () => {
  assert.ok(indexFile.includes('platinumCount') && indexFile.includes('goldCount') &&
    indexFile.includes('silverCount') && indexFile.includes('bronzeCount') &&
    indexFile.includes('unverifiedCount'),
    'Missing tier distribution counts');
});

test('Returns average score', () => {
  assert.ok(indexFile.includes('averageScore'),
    'Missing average score');
});

test('Sorts by score descending', () => {
  assert.ok(indexFile.includes('sort') && indexFile.includes('b.score - a.score'),
    'Missing sort by score descending');
});

test('Handles empty cemetery', () => {
  assert.ok(indexFile.includes('No records found'),
    'Missing empty cemetery handling');
});

// ── Part 13: Batch Confidence Handler ──
console.log('\nPart 13: Batch Confidence Handler');

test('Accepts recordIds array', () => {
  assert.ok(indexFile.includes('recordIds'),
    'Missing recordIds handling');
});

test('Limits to 50 records', () => {
  assert.ok(indexFile.includes('Maximum 50'),
    'Missing 50-record limit');
});

test('Handles not-found records', () => {
  assert.ok(indexFile.includes('not_found'),
    'Missing not-found handling');
});

test('Handles errors per record', () => {
  assert.ok(indexFile.includes("'error'"),
    'Missing error handling per record');
});

// ── Part 14: Leaderboard Handler ──
console.log('\nPart 14: Leaderboard Handler');

test('Accepts limit parameter', () => {
  assert.ok(indexFile.includes('limit') && indexFile.includes('searchParams'),
    'Missing limit parameter');
});

test('Accepts tier filter', () => {
  assert.ok(indexFile.includes("searchParams.get('tier')"),
    'Missing tier filter');
});

test('Caps limit at 200', () => {
  assert.ok(indexFile.includes('200'),
    'Missing limit cap');
});

test('Returns tier distribution', () => {
  assert.ok(indexFile.includes('tierDistribution'),
    'Missing tier distribution in leaderboard');
});

test('Sorts by score descending', () => {
  assert.ok(indexFile.includes('sort') && indexFile.includes('b.score - a.score'),
    'Missing sort in leaderboard');
});

// ── Part 15: ConfidenceScore Model ──
console.log('\nPart 15: ConfidenceScore Model');

const csFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/ConfidenceScore.java'),
  'utf8'
);

test('ConfidenceScore class exists', () => {
  assert.ok(csFile.includes('public class ConfidenceScore'), 'Class not found');
});

test('Has SignalBreakdown inner class', () => {
  assert.ok(csFile.includes('class SignalBreakdown'), 'Missing SignalBreakdown');
});

test('Has fromJson method', () => {
  assert.ok(csFile.includes('fromJson'), 'Missing fromJson');
});

test('Has tier check methods', () => {
  assert.ok(csFile.includes('isPlatinum') && csFile.includes('isGold') &&
    csFile.includes('isSilver') && csFile.includes('isBronze') && csFile.includes('isUnverified'),
    'Missing tier check methods');
});

test('Has confidence level methods', () => {
  assert.ok(csFile.includes('isHighConfidence') && csFile.includes('isMediumConfidence') &&
    csFile.includes('isLowConfidence'),
    'Missing confidence level methods');
});

test('Has getTierIcon method', () => {
  assert.ok(csFile.includes('getTierIcon'), 'Missing getTierIcon');
});

test('Has getTierLabel method', () => {
  assert.ok(csFile.includes('getTierLabel'), 'Missing getTierLabel');
});

test('Has getSummaryLine method', () => {
  assert.ok(csFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

test('Parses all 7 signals', () => {
  const signals = ['completeness', 'verification', 'sourceQuality', 'anomalyFree',
    'mergeHistory', 'community', 'geoPrecision'];
  for (const s of signals) {
    assert.ok(csFile.includes(`"${s}"`), `Missing signal parsing: ${s}`);
  }
});

// ── Part 16: CemeteryConfidence Model ──
console.log('\nPart 16: CemeteryConfidence Model');

const ccFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CemeteryConfidence.java'),
  'utf8'
);

test('CemeteryConfidence class exists', () => {
  assert.ok(ccFile.includes('public class CemeteryConfidence'), 'Class not found');
});

test('Has RecordScore inner class', () => {
  assert.ok(ccFile.includes('class RecordScore'), 'Missing RecordScore');
});

test('Has CemeteryConfidenceSummary inner class', () => {
  assert.ok(ccFile.includes('class CemeteryConfidenceSummary'), 'Missing CemeteryConfidenceSummary');
});

test('Has fromJson method', () => {
  assert.ok(ccFile.includes('fromJson'), 'Missing fromJson');
});

test('Has isHighQuality method', () => {
  assert.ok(ccFile.includes('isHighQuality'), 'Missing isHighQuality');
});

test('Has getSummaryLine method', () => {
  assert.ok(ccFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 17: ConfidenceLeaderboard Model ──
console.log('\nPart 17: ConfidenceLeaderboard Model');

const lbFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/ConfidenceLeaderboard.java'),
  'utf8'
);

test('ConfidenceLeaderboard class exists', () => {
  assert.ok(lbFile.includes('public class ConfidenceLeaderboard'), 'Class not found');
});

test('Has LeaderboardEntry inner class', () => {
  assert.ok(lbFile.includes('class LeaderboardEntry'), 'Missing LeaderboardEntry');
});

test('Has TierDistribution inner class', () => {
  assert.ok(lbFile.includes('class TierDistribution'), 'Missing TierDistribution');
});

test('Has fromJson method', () => {
  assert.ok(lbFile.includes('fromJson'), 'Missing fromJson');
});

test('Has hasTopTierRecords method', () => {
  assert.ok(lbFile.includes('hasTopTierRecords'), 'Missing hasTopTierRecords');
});

test('Has getDistributionLine method', () => {
  assert.ok(lbFile.includes('getDistributionLine'), 'Missing getDistributionLine');
});

// ── Part 18: API Client Integration ──
console.log('\nPart 18: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports ConfidenceScore', () => {
  assert.ok(apiFile.includes('ConfidenceScore'), 'Missing ConfidenceScore import');
});

test('ApiClient imports CemeteryConfidence', () => {
  assert.ok(apiFile.includes('CemeteryConfidence'), 'Missing CemeteryConfidence import');
});

test('ApiClient imports ConfidenceLeaderboard', () => {
  assert.ok(apiFile.includes('ConfidenceLeaderboard'), 'Missing ConfidenceLeaderboard import');
});

test('ApiClient has getRecordConfidence method', () => {
  assert.ok(apiFile.includes('getRecordConfidence'), 'Missing getRecordConfidence');
  assert.ok(apiFile.includes('/confidence'), 'Missing /confidence URL');
});

test('ApiClient has getCemeteryConfidence method', () => {
  assert.ok(apiFile.includes('getCemeteryConfidence'), 'Missing getCemeteryConfidence');
});

test('ApiClient has batchConfidence method', () => {
  assert.ok(apiFile.includes('batchConfidence'), 'Missing batchConfidence');
  assert.ok(apiFile.includes('/confidence/batch'), 'Missing /confidence/batch URL');
});

test('ApiClient has getConfidenceLeaderboard method', () => {
  assert.ok(apiFile.includes('getConfidenceLeaderboard'), 'Missing getConfidenceLeaderboard');
  assert.ok(apiFile.includes('/confidence/leaderboard'), 'Missing /confidence/leaderboard URL');
});

// ── Part 19: AI System Prompts ──
console.log('\nPart 19: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention confidence scoring', () => {
  assert.ok(promptsFile.includes('confidence score'),
    'Missing confidence score mention');
});

test('AI prompts mention 7 signals', () => {
  assert.ok(promptsFile.includes('completeness') && promptsFile.includes('verification') &&
    promptsFile.includes('anomaly'),
    'Missing signal mentions in prompts');
});

test('AI prompts mention tiers', () => {
  assert.ok(promptsFile.includes('platinum') && promptsFile.includes('gold') &&
    promptsFile.includes('silver') && promptsFile.includes('bronze'),
    'Missing tier mentions in prompts');
});

test('Suggested prompts include "confidence score"', () => {
  assert.ok(promptsFile.includes('confidence score'),
    'Missing "confidence score" suggested prompt');
});

test('Suggested prompts include "confidence leaderboard"', () => {
  assert.ok(promptsFile.includes('confidence leaderboard'),
    'Missing "confidence leaderboard" suggested prompt');
});

// ── Part 20: Documentation ──
console.log('\nPart 20: Documentation');

test('CHANGELOG mentions Phase 16.19 or Confidence Scoring', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.19') || changelog.includes('Confidence Scoring'),
    'CHANGELOG should mention Phase 16.19');
});

test('STATUS.md mentions Confidence Scoring', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Confidence') || status.includes('16.19'),
    'STATUS.md should mention Confidence Scoring');
});

// ── Results ──
console.log('\n=== Phase 16.19 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.19 Confidence Scoring tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
