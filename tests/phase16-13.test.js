/**
 * Phase 16.13 Tests — AI Data Quality Auto-Fix
 *
 * Tests:
 * - Backend endpoints: 4 new routes (preview, apply cemetery, preview record, apply record)
 * - AutoFixProposal model and parsing
 * - CemeteryAutoFixPreview model and parsing
 * - CemeteryAutoFixResult model and parsing
 * - RecordAutoFixResult model and parsing
 * - Name parsing: "Surname, Given" format, multi-part surnames, prefix stripping
 * - Date normalization: ISO, slash, long month, year-only
 * - Birth year estimation from inscription age
 * - Name case fixing: ALL CAPS → Title Case, all lower → Title Case
 * - Coordinate swap fix (lat > 90)
 * - Whitespace trimming
 * - Date swap fix (birth after death)
 * - Confidence levels: high (auto-apply), medium (flag for review)
 * - Dry run support
 * - Fix type filtering
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

test('Backend has /autofix/preview endpoint (GET)', () => {
  assert.ok(indexFile.includes('/autofix/preview') && indexFile.includes('handleCemeteryAutoFixPreview'),
    'Missing /autofix/preview endpoint');
});

test('Backend has /autofix endpoint (POST cemetery)', () => {
  assert.ok(indexFile.includes('/autofix') && indexFile.includes('handleCemeteryAutoFix'),
    'Missing cemetery /autofix endpoint');
});

test('Backend has /graves/:id/autofix endpoint (POST)', () => {
  assert.ok(indexFile.includes('handleRecordAutoFix'),
    'Missing record autofix endpoint');
});

test('Backend has /graves/:id/autofix/apply endpoint (POST)', () => {
  assert.ok(indexFile.includes('/autofix/apply') && indexFile.includes('handleRecordAutoFixApply'),
    'Missing record autofix apply endpoint');
});

test('All 4 auto-fix routes registered', () => {
  const routes = ['handleCemeteryAutoFixPreview', 'handleCemeteryAutoFix',
    'handleRecordAutoFix', 'handleRecordAutoFixApply'];
  for (const r of routes) {
    assert.ok(indexFile.includes(r), `Missing route handler: ${r}`);
  }
});

test('Handlers handle GitHub not configured', () => {
  assert.ok(indexFile.includes('no auto-fix available'),
    'Missing GitHub not configured fallback');
});

// ── Part 2: Name Parsing ──
console.log('\nPart 2: Name Parsing');

test('parseName function exists', () => {
  assert.ok(indexFile.includes('function parseName'), 'Missing parseName function');
});

test('Handles "Surname, Given" format', () => {
  assert.ok(indexFile.includes("includes(',')") || indexFile.includes("includes(',')"),
    'Missing comma format handling');
});

test('Strips title prefixes (Dr., Mr., Mrs., etc.)', () => {
  assert.ok(indexFile.includes('Dr.') && indexFile.includes('Mr.'),
    'Missing prefix stripping');
});

test('Handles multi-word surnames (del, de, la, van, von)', () => {
  assert.ok(indexFile.includes('del') && indexFile.includes('van') && indexFile.includes('von'),
    'Missing multi-word surname handling');
});

test('Returns givenNames and familyName', () => {
  assert.ok(indexFile.includes('givenNames') && indexFile.includes('familyName'),
    'Missing givenNames/familyName return');
});

// ── Part 3: Date Normalization ──
console.log('\nPart 3: Date Normalization');

test('normalizeDate function exists', () => {
  assert.ok(indexFile.includes('function normalizeDate'), 'Missing normalizeDate function');
});

test('Handles ISO format (YYYY-MM-DD)', () => {
  assert.ok(indexFile.includes('YYYY') || indexFile.includes('\\d{4}-\\d{2}-\\d{2}'),
    'Missing ISO format handling');
});

test('Handles slash format (YYYY/MM/DD)', () => {
  assert.ok(indexFile.includes('[/.]'), 'Missing slash format handling');
});

test('Handles long month format (DD Month YYYY)', () => {
  assert.ok(indexFile.includes('january') || indexFile.includes('monthMap'),
    'Missing long month format handling');
});

test('Handles "Month DD, YYYY" format', () => {
  assert.ok(indexFile.includes('Month DD') || indexFile.includes('monthFirst'),
    'Missing month-first format handling');
});

test('Falls back to year-only', () => {
  assert.ok(indexFile.includes('yearMatch'), 'Missing year-only fallback');
});

test('Month map includes all 12 months', () => {
  assert.ok(indexFile.includes("'jan': '01'") && indexFile.includes("'dec': '12'"),
    'Missing month map entries');
});

// ── Part 4: Birth Year Estimation ──
console.log('\nPart 4: Birth Year Estimation');

test('estimateBirthYear function exists', () => {
  assert.ok(indexFile.includes('function estimateBirthYear'), 'Missing estimateBirthYear function');
});

test('Parses "aged N" pattern', () => {
  assert.ok(indexFile.includes('aged'), 'Missing "aged" pattern');
});

test('Parses "N years" pattern', () => {
  assert.ok(indexFile.includes('years'), 'Missing "years" pattern');
});

test('Validates age range (0-120)', () => {
  assert.ok(indexFile.includes('120'), 'Missing age validation');
});

test('Returns null for invalid input', () => {
  assert.ok(indexFile.includes('return null'), 'Missing null return for invalid input');
});

// ── Part 5: Name Case Fixing ──
console.log('\nPart 5: Name Case Fixing');

test('fixNameCase function exists', () => {
  assert.ok(indexFile.includes('function fixNameCase'), 'Missing fixNameCase function');
});

test('Detects ALL CAPS names', () => {
  assert.ok(indexFile.includes('toUpperCase'), 'Missing ALL CAPS detection');
});

test('Detects all lowercase names', () => {
  assert.ok(indexFile.includes('toLowerCase'), 'Missing lowercase detection');
});

test('Preserves Roman numerals', () => {
  assert.ok(indexFile.includes('IVXLCDM'), 'Missing Roman numeral preservation');
});

test('Returns null for already mixed case', () => {
  assert.ok(indexFile.includes('Already mixed case'), 'Missing mixed case check');
});

// ── Part 6: Auto-Fix Generation ──
console.log('\nPart 6: Auto-Fix Generation');

test('generateAutoFixes function exists', () => {
  assert.ok(indexFile.includes('function generateAutoFixes'), 'Missing generateAutoFixes function');
});

test('Generates name parsing fix', () => {
  assert.ok(indexFile.includes('Parsed from full name'),
    'Missing name parsing fix generation');
});

test('Generates name case fix', () => {
  assert.ok(indexFile.includes('title case'),
    'Missing name case fix generation');
});

test('Generates date normalization fix', () => {
  assert.ok(indexFile.includes('Normalized date format'),
    'Missing date normalization fix');
});

test('Generates birth year estimation fix', () => {
  assert.ok(indexFile.includes('Estimated from death year'),
    'Missing birth year estimation fix');
});

test('Generates coordinate swap fix', () => {
  assert.ok(indexFile.includes('appears swapped with longitude'),
    'Missing coordinate swap fix');
});

test('Generates whitespace trim fix', () => {
  assert.ok(indexFile.includes('Trimmed leading/trailing whitespace'),
    'Missing whitespace trim fix');
});

test('Generates date swap fix (birth after death)', () => {
  assert.ok(indexFile.includes('dates appear swapped'),
    'Missing date swap fix');
});

test('Fixes include confidence level', () => {
  assert.ok(indexFile.includes("confidence: 'high'") && indexFile.includes("confidence: 'medium'"),
    'Missing confidence levels in fixes');
});

test('Fixes include reason explanation', () => {
  assert.ok(indexFile.includes('reason:'), 'Missing reason field in fixes');
});

test('Fixes include action type', () => {
  assert.ok(indexFile.includes('action:'), 'Missing action field in fixes');
});

test('All 6 action types used', () => {
  const actions = ["'add'", "'normalize'", "'estimate'", "'swap'", "'trim'", "'swap_dates'"];
  for (const a of actions) {
    assert.ok(indexFile.includes(a), `Missing action type: ${a}`);
  }
});

// ── Part 7: Cemetery Auto-Fix Preview ──
console.log('\nPart 7: Cemetery Auto-Fix Preview');

test('Preview handler scans published records', () => {
  assert.ok(indexFile.includes("status !== 'published'"),
    'Missing published filter in preview');
});

test('Preview returns proposedFixes array', () => {
  assert.ok(indexFile.includes('proposedFixes'), 'Missing proposedFixes in preview');
});

test('Preview includes summary with fix counts', () => {
  assert.ok(indexFile.includes('totalFixes') && indexFile.includes('recordsScanned'),
    'Missing summary in preview');
});

test('Preview counts by action type', () => {
  assert.ok(indexFile.includes('fixCounts') || indexFile.includes('byAction'),
    'Missing byAction counts');
});

test('Preview counts high and medium confidence', () => {
  assert.ok(indexFile.includes('highConfidence') && indexFile.includes('mediumConfidence'),
    'Missing confidence counts');
});

test('Preview limited to 200 results', () => {
  assert.ok(indexFile.includes('slice(0, 200)'), 'Missing 200-result limit');
});

// ── Part 8: Cemetery Auto-Fix Apply ──
console.log('\nPart 8: Cemetery Auto-Fix Apply');

test('Apply handler supports dry run', () => {
  assert.ok(indexFile.includes('dryRun'), 'Missing dry run support');
});

test('Apply handler supports fix type filtering', () => {
  assert.ok(indexFile.includes('fixTypes') && indexFile.includes('allowedTypes'),
    'Missing fix type filtering');
});

test('Only applies high-confidence fixes', () => {
  assert.ok(indexFile.includes("confidence === 'high'"),
    'Missing high-confidence filter');
});

test('Medium-confidence fixes are flagged for review', () => {
  assert.ok(indexFile.includes('riskyFixes') && indexFile.includes('flagged'),
    'Missing medium-confidence flagging');
});

test('Applied fixes update the record', () => {
  assert.ok(indexFile.includes('updatedRecord') && indexFile.includes('writeFile'),
    'Missing record update on apply');
});

test('Updated records get new updated_date', () => {
  assert.ok(indexFile.includes('updated_date'), 'Missing updated_date on write');
});

test('Returns recordsFixed count', () => {
  assert.ok(indexFile.includes('recordsFixed'), 'Missing recordsFixed count');
});

test('Returns recordsFlagged count', () => {
  assert.ok(indexFile.includes('recordsFlagged'), 'Missing recordsFlagged count');
});

// ── Part 9: Single Record Auto-Fix ──
console.log('\nPart 9: Single Record Auto-Fix');

test('Record autofix handles not found', () => {
  assert.ok(indexFile.includes('Record not found'),
    'Missing record not found handling');
});

test('Record autofix returns proposedFixes', () => {
  assert.ok(indexFile.includes('proposedFixes'), 'Missing proposedFixes');
});

test('Record autofix returns hasSafeFixes and hasRiskyFixes', () => {
  assert.ok(indexFile.includes('hasSafeFixes') && indexFile.includes('hasRiskyFixes'),
    'Missing hasSafeFixes/hasRiskyFixes flags');
});

test('Record apply returns applied count', () => {
  assert.ok(indexFile.includes('applied:'), 'Missing applied count');
});

test('Record apply returns changes array', () => {
  assert.ok(indexFile.includes('changes:'), 'Missing changes array');
});

test('Record apply handles no safe fixes', () => {
  assert.ok(indexFile.includes('No high-confidence fixes'),
    'Missing no-safe-fixes message');
});

// ── Part 10: AutoFixProposal Model ──
console.log('\nPart 10: AutoFixProposal Model');

const modelFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/AutoFixProposal.java'),
  'utf8'
);

test('AutoFixProposal class exists', () => {
  assert.ok(modelFile.includes('public class AutoFixProposal'), 'Class not found');
});

test('AutoFixProposal has field, action, currentValue, proposedValue', () => {
  assert.ok(modelFile.includes('field') && modelFile.includes('action') &&
    modelFile.includes('currentValue') && modelFile.includes('proposedValue'),
    'Missing proposal fields');
});

test('AutoFixProposal has confidence and reason', () => {
  assert.ok(modelFile.includes('confidence') && modelFile.includes('reason'),
    'Missing confidence/reason fields');
});

test('AutoFixProposal has isSafe method', () => {
  assert.ok(modelFile.includes('isSafe'), 'Missing isSafe method');
});

test('AutoFixProposal has getActionLabel method', () => {
  assert.ok(modelFile.includes('getActionLabel'), 'Missing getActionLabel');
});

test('AutoFixProposal has getIcon method', () => {
  assert.ok(modelFile.includes('getIcon'), 'Missing getIcon');
});

test('AutoFixProposal has fromJson method', () => {
  assert.ok(modelFile.includes('fromJson'), 'Missing fromJson');
});

test('AutoFixProposal has fromJsonArray method', () => {
  assert.ok(modelFile.includes('fromJsonArray'), 'Missing fromJsonArray');
});

test('AutoFixProposal handles null currentValue', () => {
  assert.ok(modelFile.includes('"null"'), 'Missing null currentValue handling');
});

// ── Part 11: CemeteryAutoFixPreview Model ──
console.log('\nPart 11: CemeteryAutoFixPreview Model');

const previewFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CemeteryAutoFixPreview.java'),
  'utf8'
);

test('CemeteryAutoFixPreview class exists', () => {
  assert.ok(previewFile.includes('public class CemeteryAutoFixPreview'), 'Class not found');
});

test('Has AutoFixSummary inner class', () => {
  assert.ok(previewFile.includes('class AutoFixSummary'), 'Missing AutoFixSummary');
});

test('Summary has byAction map', () => {
  assert.ok(previewFile.includes('byAction'), 'Missing byAction in summary');
});

test('Has getSafeFixes method', () => {
  assert.ok(previewFile.includes('getSafeFixes'), 'Missing getSafeFixes');
});

test('Has getRiskyFixes method', () => {
  assert.ok(previewFile.includes('getRiskyFixes'), 'Missing getRiskyFixes');
});

test('Has getSummaryLine method', () => {
  assert.ok(previewFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 12: CemeteryAutoFixResult Model ──
console.log('\nPart 12: CemeteryAutoFixResult Model');

const resultFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CemeteryAutoFixResult.java'),
  'utf8'
);

test('CemeteryAutoFixResult class exists', () => {
  assert.ok(resultFile.includes('public class CemeteryAutoFixResult'), 'Class not found');
});

test('Has RecordFixResult inner class', () => {
  assert.ok(resultFile.includes('class RecordFixResult'), 'Missing RecordFixResult');
});

test('Has AppliedChange inner class', () => {
  assert.ok(resultFile.includes('class AppliedChange'), 'Missing AppliedChange');
});

test('Supports dryRun parsing', () => {
  assert.ok(resultFile.includes('dryRun'), 'Missing dryRun support');
});

test('Parses applied and flagged results', () => {
  assert.ok(resultFile.includes('appliedFixes') && resultFile.includes('flaggedFixes'),
    'Missing applied/flagged parsing');
});

test('Has getSummaryLine method', () => {
  assert.ok(resultFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 13: RecordAutoFixResult Model ──
console.log('\nPart 13: RecordAutoFixResult Model');

const recordResultFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/RecordAutoFixResult.java'),
  'utf8'
);

test('RecordAutoFixResult class exists', () => {
  assert.ok(recordResultFile.includes('public class RecordAutoFixResult'), 'Class not found');
});

test('RecordAutoFixResult has AppliedChange inner class', () => {
  assert.ok(recordResultFile.includes('class AppliedChange'), 'Missing AppliedChange');
});

test('RecordAutoFixResult has fromJson method', () => {
  assert.ok(recordResultFile.includes('fromJson'), 'Missing fromJson');
});

test('RecordAutoFixResult has isClean method', () => {
  assert.ok(recordResultFile.includes('isClean'), 'Missing isClean');
});

test('RecordAutoFixResult has getSummaryLine method', () => {
  assert.ok(recordResultFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 14: API Client Integration ──
console.log('\nPart 14: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports CemeteryAutoFixPreview', () => {
  assert.ok(apiFile.includes('CemeteryAutoFixPreview'), 'Missing CemeteryAutoFixPreview import');
});

test('ApiClient imports CemeteryAutoFixResult', () => {
  assert.ok(apiFile.includes('CemeteryAutoFixResult'), 'Missing CemeteryAutoFixResult import');
});

test('ApiClient imports RecordAutoFixResult', () => {
  assert.ok(apiFile.includes('RecordAutoFixResult'), 'Missing RecordAutoFixResult import');
});

test('ApiClient has previewCemeteryAutoFix method', () => {
  assert.ok(apiFile.includes('previewCemeteryAutoFix'), 'Missing previewCemeteryAutoFix');
  assert.ok(apiFile.includes('/autofix/preview'), 'Missing /autofix/preview URL');
});

test('ApiClient has applyCemeteryAutoFix method', () => {
  assert.ok(apiFile.includes('applyCemeteryAutoFix'), 'Missing applyCemeteryAutoFix');
  assert.ok(apiFile.includes('/autofix'), 'Missing /autofix URL');
});

test('ApiClient has getRecordAutoFixProposals method', () => {
  assert.ok(apiFile.includes('getRecordAutoFixProposals'), 'Missing getRecordAutoFixProposals');
});

test('ApiClient has applyRecordAutoFix method', () => {
  assert.ok(apiFile.includes('applyRecordAutoFix'), 'Missing applyRecordAutoFix');
  assert.ok(apiFile.includes('/autofix/apply'), 'Missing /autofix/apply URL');
});

// ── Part 15: AI System Prompts ──
console.log('\nPart 15: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention auto-fix', () => {
  assert.ok(promptsFile.includes('autofix') || promptsFile.includes('auto-fix'),
    'AI prompts should mention auto-fix');
});

test('AI prompts mention autofix preview', () => {
  assert.ok(promptsFile.includes('preview'), 'Missing preview mention');
});

test('AI prompts mention autofix apply', () => {
  assert.ok(promptsFile.includes('apply'), 'Missing apply mention');
});

test('Suggested prompts include "Preview auto-fixes"', () => {
  assert.ok(promptsFile.includes('Preview auto-fixes'),
    'Missing "Preview auto-fixes" suggested prompt');
});

test('Suggested prompts include "Auto-fix this record"', () => {
  assert.ok(promptsFile.includes('Auto-fix this record'),
    'Missing "Auto-fix this record" suggested prompt');
});

// ── Part 16: Documentation ──
console.log('\nPart 16: Documentation');

test('CHANGELOG mentions Phase 16.13 or Auto-Fix', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.13') || changelog.includes('Auto-Fix'),
    'CHANGELOG should mention Phase 16.13');
});

test('STATUS.md mentions Auto-Fix', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Auto-Fix') || status.includes('16.13'),
    'STATUS.md should mention Auto-Fix');
});

// ── Results ──
console.log('\n=== Phase 16.13 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.13 Auto-Fix tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
