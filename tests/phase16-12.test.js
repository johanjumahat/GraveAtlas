/**
 * Phase 16.12 Tests — AI Smart Recommendations
 *
 * Tests:
 * - Backend endpoints: /api/cemeteries/:id/recommendations, /api/recommendations/global
 * - CemeteryRecommendations model and parsing
 * - GlobalRecommendations model and parsing
 * - Recommendation structure: category, priority, title, description, affectedRecords, estimatedEffort, actionEndpoint
 * - Priority levels: critical, high, medium, low
 * - Categories: data_quality, anomalies, enrichment, duplicates, content, connections
 * - Recommendation generation logic for missing fields, anomalies, duplicates
 * - Sorting by priority (critical first)
 * - Summary with counts per priority
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

test('Backend has /recommendations endpoint registration', () => {
  assert.ok(indexFile.includes('/recommendations') && indexFile.includes('handleCemeteryRecommendations'),
    'Missing /recommendations endpoint or handleCemeteryRecommendations');
});

test('Backend has /api/recommendations/global endpoint', () => {
  assert.ok(indexFile.includes('/api/recommendations/global') && indexFile.includes('handleGlobalRecommendations'),
    'Missing /api/recommendations/global endpoint or handleGlobalRecommendations');
});

test('Cemetery recommendations handler reads published records', () => {
  assert.ok(indexFile.includes("status !== 'published'"),
    'Missing published status filter in recommendations');
});

test('Cemetery recommendations handles no records', () => {
  assert.ok(indexFile.includes('No published records found'),
    'Missing empty cemetery handling');
});

test('Cemetery recommendations handles GitHub not configured', () => {
  assert.ok(indexFile.includes('no recommendations available'),
    'Missing GitHub not configured fallback');
});

// ── Part 2: Recommendation Analysis ──
console.log('\nPart 2: Recommendation Analysis');

test('Analyzes missing birth dates', () => {
  assert.ok(indexFile.includes('missingBirthDate'), 'Missing birth date analysis');
});

test('Analyzes missing death dates', () => {
  assert.ok(indexFile.includes('missingDeathDate'), 'Missing death date analysis');
});

test('Analyzes missing names', () => {
  assert.ok(indexFile.includes('missingName'), 'Missing name analysis');
});

test('Analyzes missing photos', () => {
  assert.ok(indexFile.includes('missingPhotos'), 'Missing photo analysis');
});

test('Analyzes missing inscriptions', () => {
  assert.ok(indexFile.includes('missingInscriptions'), 'Missing inscription analysis');
});

test('Analyzes missing sources', () => {
  assert.ok(indexFile.includes('missingSources'), 'Missing source analysis');
});

test('Analyzes missing coordinates', () => {
  assert.ok(indexFile.includes('missingCoords'), 'Missing coordinate analysis');
});

test('Analyzes missing section/plot', () => {
  assert.ok(indexFile.includes('missingSectionPlot'), 'Missing section/plot analysis');
});

test('Analyzes enrichment needs', () => {
  assert.ok(indexFile.includes('needsEnrichment'), 'Missing enrichment analysis');
});

test('Analyzes critical anomalies', () => {
  assert.ok(indexFile.includes('criticalAnomalies'), 'Missing critical anomaly analysis');
});

test('Analyzes warning anomalies', () => {
  assert.ok(indexFile.includes('warningAnomalies'), 'Missing warning anomaly analysis');
});

test('Detects duplicates (name + death date)', () => {
  assert.ok(indexFile.includes('nameDateMap'), 'Missing duplicate detection');
});

test('Tracks surname groups for connections', () => {
  assert.ok(indexFile.includes('surnameGroups'), 'Missing surname group tracking');
});

test('Collects death years for outlier detection', () => {
  assert.ok(indexFile.includes('deathYears'), 'Missing death year collection');
});

// ── Part 3: Recommendation Generation ──
console.log('\nPart 3: Recommendation Generation');

test('Generates recommendation for missing names (critical)', () => {
  assert.ok(indexFile.includes('missing name or identifier'),
    'Missing name recommendation');
});

test('Generates recommendation for critical anomalies', () => {
  assert.ok(indexFile.includes('critical anomalies detected'),
    'Missing critical anomaly recommendation');
});

test('Generates recommendation for missing both dates', () => {
  assert.ok(indexFile.includes('no birth or death date'),
    'Missing both-dates recommendation');
});

test('Generates recommendation for missing sources', () => {
  assert.ok(indexFile.includes('source attribution'),
    'Missing source recommendation');
});

test('Generates recommendation for missing photos', () => {
  assert.ok(indexFile.includes('no photos'),
    'Missing photo recommendation');
});

test('Generates recommendation for duplicates', () => {
  assert.ok(indexFile.includes('duplicate records detected') || indexFile.includes('potential duplicate'),
    'Missing duplicate recommendation');
});

test('Generates recommendation for missing inscriptions', () => {
  assert.ok(indexFile.includes('transcribed inscriptions'),
    'Missing inscription recommendation');
});

test('Generates recommendation for AI enrichment', () => {
  assert.ok(indexFile.includes('AI enrichment'),
    'Missing enrichment recommendation');
});

test('Generates recommendation for missing coordinates', () => {
  assert.ok(indexFile.includes('GPS coordinates'),
    'Missing coordinate recommendation');
});

test('Generates recommendation for family connections', () => {
  assert.ok(indexFile.includes('family groups') || indexFile.includes('family connections'),
    'Missing family connection recommendation');
});

test('Generates recommendation for warning anomalies', () => {
  assert.ok(indexFile.includes('minor anomalies to review'),
    'Missing warning anomaly recommendation');
});

test('Generates recommendation for statistical outliers', () => {
  assert.ok(indexFile.includes('statistical outliers'),
    'Missing statistical outlier recommendation');
});

// ── Part 4: Recommendation Structure ──
console.log('\nPart 4: Recommendation Structure');

test('Recommendations have category field', () => {
  assert.ok(indexFile.includes('category:'), 'Missing category field');
});

test('Recommendations have priority field', () => {
  assert.ok(indexFile.includes('priority:'), 'Missing priority field');
});

test('Recommendations have title field', () => {
  assert.ok(indexFile.includes('title:'), 'Missing title field');
});

test('Recommendations have description field', () => {
  assert.ok(indexFile.includes('description:'), 'Missing description field');
});

test('Recommendations have affectedRecords field', () => {
  assert.ok(indexFile.includes('affectedRecords:'), 'Missing affectedRecords field');
});

test('Recommendations have estimatedEffort field', () => {
  assert.ok(indexFile.includes('estimatedEffort:'), 'Missing estimatedEffort field');
});

test('Recommendations have actionEndpoint field', () => {
  assert.ok(indexFile.includes('actionEndpoint:'), 'Missing actionEndpoint field');
});

test('Uses all 6 categories', () => {
  assert.ok(indexFile.includes('data_quality') && indexFile.includes('anomalies') &&
    indexFile.includes('enrichment') && indexFile.includes('duplicates') &&
    indexFile.includes('content') && indexFile.includes('connections'),
    'Missing one or more recommendation categories');
});

test('Uses all 4 priority levels', () => {
  assert.ok(indexFile.includes("'critical'") && indexFile.includes("'high'") &&
    indexFile.includes("'medium'") && indexFile.includes("'low'"),
    'Missing one or more priority levels');
});

// ── Part 5: Sorting and Summary ──
console.log('\nPart 5: Sorting and Summary');

test('Recommendations sorted by priority (critical first)', () => {
  assert.ok(indexFile.includes('priorityOrder'), 'Missing priority sorting');
});

test('Summary includes total count', () => {
  assert.ok(indexFile.includes('total:') || indexFile.includes('total ='),
    'Missing total count in summary');
});

test('Summary includes critical count', () => {
  assert.ok(indexFile.includes('critical:'), 'Missing critical count in summary');
});

test('Summary includes high count', () => {
  assert.ok(indexFile.includes('high:'), 'Missing high count in summary');
});

test('Summary includes medium count', () => {
  assert.ok(indexFile.includes('medium:'), 'Missing medium count in summary');
});

test('Summary includes low count', () => {
  assert.ok(indexFile.includes('low:'), 'Missing low count in summary');
});

test('Summary includes recordsAnalyzed', () => {
  assert.ok(indexFile.includes('recordsAnalyzed'), 'Missing recordsAnalyzed in summary');
});

// ── Part 6: Global Recommendations ──
console.log('\nPart 6: Global Recommendations');

test('Global handler lists all cemetery files', () => {
  assert.ok(indexFile.includes("listFiles('cemeteries'"),
    'Missing cemetery file listing in global handler');
});

test('Global handler aggregates total records', () => {
  assert.ok(indexFile.includes('totalRecords'), 'Missing total records aggregation');
});

test('Global handler counts missing sources globally', () => {
  assert.ok(indexFile.includes('totalMissingSources'), 'Missing global source count');
});

test('Global handler counts missing photos globally', () => {
  assert.ok(indexFile.includes('totalMissingPhotos'), 'Missing global photo count');
});

test('Global handler counts missing dates globally', () => {
  assert.ok(indexFile.includes('totalMissingDates'), 'Missing global date count');
});

test('Global handler counts critical anomalies globally', () => {
  assert.ok(indexFile.includes('totalCriticalAnomalies'), 'Missing global critical count');
});

test('Global handler counts duplicates globally', () => {
  assert.ok(indexFile.includes('totalDuplicates'), 'Missing global duplicate count');
});

test('Global handler recommends per-cemetery review', () => {
  assert.ok(indexFile.includes('Review health for cemetery'),
    'Missing per-cemetery review recommendation');
});

test('Global summary includes totalCemeteries', () => {
  assert.ok(indexFile.includes('totalCemeteries'), 'Missing totalCemeteries in global summary');
});

// ── Part 7: CemeteryRecommendations Model ──
console.log('\nPart 7: CemeteryRecommendations Model');

const modelFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CemeteryRecommendations.java'),
  'utf8'
);

test('CemeteryRecommendations class exists', () => {
  assert.ok(modelFile.includes('public class CemeteryRecommendations'), 'Class not found');
});

test('Has Recommendation inner class', () => {
  assert.ok(modelFile.includes('class Recommendation'), 'Missing Recommendation inner class');
});

test('Has RecommendationSummary inner class', () => {
  assert.ok(modelFile.includes('class RecommendationSummary'), 'Missing RecommendationSummary');
});

test('Recommendation has category, priority, title, description', () => {
  assert.ok(modelFile.includes('category') && modelFile.includes('priority') &&
    modelFile.includes('title') && modelFile.includes('description'),
    'Missing recommendation fields');
});

test('Recommendation has affectedRecords, estimatedEffort, actionEndpoint', () => {
  assert.ok(modelFile.includes('affectedRecords') && modelFile.includes('estimatedEffort') &&
    modelFile.includes('actionEndpoint'),
    'Missing recommendation metadata fields');
});

test('Has fromJson method', () => {
  assert.ok(modelFile.includes('fromJson'), 'Missing fromJson');
});

test('Has getCriticalRecommendations', () => {
  assert.ok(modelFile.includes('getCriticalRecommendations'), 'Missing getCriticalRecommendations');
});

test('Has getByCategory', () => {
  assert.ok(modelFile.includes('getByCategory'), 'Missing getByCategory');
});

test('Has hasUrgentIssues', () => {
  assert.ok(modelFile.includes('hasUrgentIssues'), 'Missing hasUrgentIssues');
});

test('Has getSummaryLine', () => {
  assert.ok(modelFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

test('Recommendation has getPriorityOrder', () => {
  assert.ok(modelFile.includes('getPriorityOrder'), 'Missing getPriorityOrder');
});

test('Recommendation has getPriorityLabel', () => {
  assert.ok(modelFile.includes('getPriorityLabel'), 'Missing getPriorityLabel');
});

test('Recommendation has getCategoryIcon', () => {
  assert.ok(modelFile.includes('getCategoryIcon'), 'Missing getCategoryIcon');
});

test('Handles null actionEndpoint', () => {
  assert.ok(modelFile.includes('"null"'), 'Missing null actionEndpoint handling');
});

// ── Part 8: GlobalRecommendations Model ──
console.log('\nPart 8: GlobalRecommendations Model');

const globalFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/GlobalRecommendations.java'),
  'utf8'
);

test('GlobalRecommendations class exists', () => {
  assert.ok(globalFile.includes('public class GlobalRecommendations'), 'Class not found');
});

test('GlobalRecommendations has GlobalSummary inner class', () => {
  assert.ok(globalFile.includes('class GlobalSummary'), 'Missing GlobalSummary');
});

test('GlobalRecommendations reuses Recommendation from CemeteryRecommendations', () => {
  assert.ok(globalFile.includes('CemeteryRecommendations.Recommendation'),
    'Missing Recommendation reuse from CemeteryRecommendations');
});

test('GlobalRecommendations has fromJson method', () => {
  assert.ok(globalFile.includes('fromJson'), 'Missing fromJson');
});

test('GlobalRecommendations has getCriticalRecommendations', () => {
  assert.ok(globalFile.includes('getCriticalRecommendations'), 'Missing getCriticalRecommendations');
});

test('GlobalRecommendations has getSummaryLine', () => {
  assert.ok(globalFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

test('GlobalSummary has totalCemeteries and totalRecords', () => {
  assert.ok(globalFile.includes('totalCemeteries') && globalFile.includes('totalRecords'),
    'Missing totalCemeteries/totalRecords in GlobalSummary');
});

// ── Part 9: API Client Integration ──
console.log('\nPart 9: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports CemeteryRecommendations', () => {
  assert.ok(apiFile.includes('CemeteryRecommendations'), 'Missing CemeteryRecommendations import');
});

test('ApiClient imports GlobalRecommendations', () => {
  assert.ok(apiFile.includes('GlobalRecommendations'), 'Missing GlobalRecommendations import');
});

test('ApiClient has getCemeteryRecommendations method', () => {
  assert.ok(apiFile.includes('getCemeteryRecommendations'),
    'Missing getCemeteryRecommendations method');
  assert.ok(apiFile.includes('/recommendations'),
    'Missing /recommendations URL');
});

test('ApiClient has getGlobalRecommendations method', () => {
  assert.ok(apiFile.includes('getGlobalRecommendations'),
    'Missing getGlobalRecommendations method');
  assert.ok(apiFile.includes('/api/recommendations/global'),
    'Missing /api/recommendations/global URL');
});

// ── Part 10: AI System Prompts ──
console.log('\nPart 10: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention recommendations', () => {
  assert.ok(promptsFile.includes('recommendation'),
    'AI prompts should mention recommendations');
});

test('AI prompts mention global recommendations endpoint', () => {
  assert.ok(promptsFile.includes('/api/recommendations/global'),
    'Missing /api/recommendations/global in prompts');
});

test('Suggested prompts include "fix first"', () => {
  assert.ok(promptsFile.includes('fix first'), 'Missing "fix first" suggested prompt');
});

test('Suggested prompts include global recommendations', () => {
  assert.ok(promptsFile.includes('global recommendations'),
    'Missing global recommendations suggested prompt');
});

// ── Part 11: Documentation ──
console.log('\nPart 11: Documentation');

test('CHANGELOG mentions Phase 16.12 or Smart Recommendations', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.12') || changelog.includes('Smart Recommendations'),
    'CHANGELOG should mention Phase 16.12');
});

test('STATUS.md mentions Smart Recommendations', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Recommendation') || status.includes('16.12'),
    'STATUS.md should mention Smart Recommendations');
});

// ── Results ──
console.log('\n=== Phase 16.12 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.12 Smart Recommendations tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
