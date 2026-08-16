/**
 * Phase 16.16 Tests — AI Watchlist & Monitoring
 *
 * Tests:
 * - Backend endpoints: /watchlist (GET/POST/DELETE), /watchlist/check, /watchlist/status
 * - WatchlistItem model
 * - WatchAlert model
 * - WatchlistCheckResult model
 * - WatchlistStatus model
 * - Watch types: health_degradation, new_anomalies, unapplied_fixes, duplicate_detected, missing_data
 * - Alert severity levels: critical, high, medium, low
 * - Previous status comparison logic
 * - Alert generation for each watch type
 * - Watchlist item persistence (createdAt, lastChecked, lastStatus)
 * - needsCheck flag in status
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

test('Backend has GET /api/watchlist', () => {
  assert.ok(indexFile.includes('handleGetWatchlist'),
    'Missing handleGetWatchlist');
});

test('Backend has POST /api/watchlist', () => {
  assert.ok(indexFile.includes('handleAddToWatchlist'),
    'Missing handleAddToWatchlist');
});

test('Backend has DELETE /api/watchlist/:itemId', () => {
  assert.ok(indexFile.includes('handleRemoveFromWatchlist'),
    'Missing handleRemoveFromWatchlist');
});

test('Backend has POST /api/watchlist/check', () => {
  assert.ok(indexFile.includes('handleWatchlistCheck'),
    'Missing handleWatchlistCheck');
});

test('Backend has GET /api/watchlist/status', () => {
  assert.ok(indexFile.includes('handleWatchlistStatus'),
    'Missing handleWatchlistStatus');
});

test('All 5 watchlist routes registered', () => {
  const routes = ['handleGetWatchlist', 'handleAddToWatchlist', 'handleRemoveFromWatchlist',
    'handleWatchlistCheck', 'handleWatchlistStatus'];
  for (const r of routes) {
    assert.ok(indexFile.includes(r), `Missing route handler: ${r}`);
  }
});

test('Handlers handle GitHub not configured', () => {
  assert.ok(indexFile.includes('watchlist unavailable'),
    'Missing GitHub not configured fallback');
});

// ── Part 2: Watchlist Add Handler ──
console.log('\nPart 2: Watchlist Add Handler');

test('Add validates targetType and targetId', () => {
  assert.ok(indexFile.includes('Missing required fields'),
    'Missing field validation');
});

test('Add validates targetType is cemetery or record', () => {
  assert.ok(indexFile.includes('cemetery or record') || indexFile.includes('"cemetery" && targetType'),
    'Missing targetType validation');
});

test('Add accepts watchFor array', () => {
  assert.ok(indexFile.includes('watchFor'),
    'Missing watchFor handling');
});

test('Add filters valid watch types', () => {
  assert.ok(indexFile.includes('health_degradation') && indexFile.includes('new_anomalies') &&
    indexFile.includes('unapplied_fixes') && indexFile.includes('duplicate_detected') &&
    indexFile.includes('missing_data'),
    'Missing valid watch types list');
});

test('Add creates item with id, createdAt, active', () => {
  assert.ok(indexFile.includes('createdAt') && indexFile.includes('active'),
    'Missing item metadata fields');
});

test('Add writes item to watchlist directory', () => {
  assert.ok(indexFile.includes("writeFile(`watchlist/"),
    'Missing writeFile in add handler');
});

// ── Part 3: Watchlist Get Handler ──
console.log('\nPart 3: Watchlist Get Handler');

test('Get lists watchlist files', () => {
  assert.ok(indexFile.includes("listFiles('watchlist'"),
    'Missing listFiles in get handler');
});

test('Get sorts by createdAt descending', () => {
  assert.ok(indexFile.includes('sort') && indexFile.includes('createdAt'),
    'Missing sort by createdAt');
});

test('Get returns totalItems count', () => {
  assert.ok(indexFile.includes('totalItems'),
    'Missing totalItems in response');
});

// ── Part 4: Watchlist Remove Handler ──
console.log('\nPart 4: Watchlist Remove Handler');

test('Remove deletes watchlist file', () => {
  assert.ok(indexFile.includes('deleteFile'),
    'Missing deleteFile in remove handler');
});

test('Remove sanitizes item ID', () => {
  assert.ok(indexFile.includes('sanitizePathSegment'),
    'Missing sanitize in remove handler');
});

// ── Part 5: Watchlist Check Handler ──
console.log('\nPart 5: Watchlist Check Handler');

test('Check loads watchlist items', () => {
  assert.ok(indexFile.includes("listFiles('watchlist'"),
    'Missing watchlist loading in check');
});

test('Check loads grave records', () => {
  assert.ok(indexFile.includes("listFiles('graves'"),
    'Missing grave loading in check');
});

test('Check groups records by cemetery', () => {
  assert.ok(indexFile.includes('recordsByCemetery'),
    'Missing records by cemetery grouping');
});

test('Check computes current health', () => {
  assert.ok(indexFile.includes('computeQuickHealth'),
    'Missing computeQuickHealth in check');
});

test('Check computes current anomalies', () => {
  assert.ok(indexFile.includes('computeCemeteryAnomalies'),
    'Missing computeCemeteryAnomalies in check');
});

test('Check generates health_degradation alerts', () => {
  assert.ok(indexFile.includes('health_degradation'),
    'Missing health_degradation alert generation');
});

test('Health degradation severity based on score drop', () => {
  assert.ok(indexFile.includes('>= 15') || indexFile.includes('>= 10') || indexFile.includes('scoreDrop'),
    'Missing score drop severity logic');
});

test('Check generates new_anomalies alerts', () => {
  assert.ok(indexFile.includes('new_anomalies'),
    'Missing new_anomalies alert generation');
});

test('Check generates unapplied_fixes alerts', () => {
  assert.ok(indexFile.includes('unapplied_fixes'),
    'Missing unapplied_fixes alert generation');
});

test('Unapplied fixes uses generateAutoFixes', () => {
  assert.ok(indexFile.includes('generateAutoFixes'),
    'Missing generateAutoFixes in unapplied fixes check');
});

test('Check generates duplicate_detected alerts', () => {
  assert.ok(indexFile.includes('duplicate_detected'),
    'Missing duplicate_detected alert generation');
});

test('Check generates missing_data alerts', () => {
  assert.ok(indexFile.includes('missing_data'),
    'Missing missing_data alert generation');
});

test('Missing_data checks sources and photos', () => {
  assert.ok(indexFile.includes('missingSources') && indexFile.includes('missingPhotos'),
    'Missing source/photo checks in missing_data');
});

test('Check updates lastChecked and lastStatus', () => {
  assert.ok(indexFile.includes('item.lastChecked') && indexFile.includes('item.lastStatus'),
    'Missing lastChecked/lastStatus update');
});

test('Check returns alert counts by severity', () => {
  assert.ok(indexFile.includes('criticalAlerts') && indexFile.includes('highAlerts'),
    'Missing severity counts in response');
});

test('Check returns checkedItems count', () => {
  assert.ok(indexFile.includes('checkedItems'),
    'Missing checkedItems in response');
});

test('Check only processes active items', () => {
  assert.ok(indexFile.includes('active !== false'),
    'Missing active filter');
});

// ── Part 6: Watchlist Status Handler ──
console.log('\nPart 6: Watchlist Status Handler');

test('Status returns activeItems count', () => {
  assert.ok(indexFile.includes('activeItems'),
    'Missing activeItems in status');
});

test('Status returns lastCheckedAt', () => {
  assert.ok(indexFile.includes('lastCheckedAt'),
    'Missing lastCheckedAt in status');
});

test('Status computes needsCheck flag', () => {
  assert.ok(indexFile.includes('needsCheck'),
    'Missing needsCheck in status');
});

test('needsCheck uses 24 hour threshold', () => {
  assert.ok(indexFile.includes('24 * 60 * 60 * 1000'),
    'Missing 24-hour threshold for needsCheck');
});

// ── Part 7: WatchlistItem Model ──
console.log('\nPart 7: WatchlistItem Model');

const watchlistFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/WatchlistItem.java'),
  'utf8'
);

test('WatchlistItem class exists', () => {
  assert.ok(watchlistFile.includes('public class WatchlistItem'), 'Class not found');
});

test('Has WatchStatus inner class', () => {
  assert.ok(watchlistFile.includes('class WatchStatus'), 'Missing WatchStatus');
});

test('Has fromJson method', () => {
  assert.ok(watchlistFile.includes('fromJson'), 'Missing fromJson');
});

test('Parses watchFor array', () => {
  assert.ok(watchlistFile.includes('optJSONArray("watchFor")'),
    'Missing watchFor array parsing');
});

test('Has isCemeteryWatch method', () => {
  assert.ok(watchlistFile.includes('isCemeteryWatch'), 'Missing isCemeteryWatch');
});

test('Has isRecordWatch method', () => {
  assert.ok(watchlistFile.includes('isRecordWatch'), 'Missing isRecordWatch');
});

test('Has watchesFor method', () => {
  assert.ok(watchlistFile.includes('watchesFor'), 'Missing watchesFor');
});

test('Has getDisplayLabel method', () => {
  assert.ok(watchlistFile.includes('getDisplayLabel'), 'Missing getDisplayLabel');
});

// ── Part 8: WatchAlert Model ──
console.log('\nPart 8: WatchAlert Model');

const alertFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/WatchAlert.java'),
  'utf8'
);

test('WatchAlert class exists', () => {
  assert.ok(alertFile.includes('public class WatchAlert'), 'Class not found');
});

test('Has alertType field', () => {
  assert.ok(alertFile.includes('alertType'), 'Missing alertType');
});

test('Has severity field', () => {
  assert.ok(alertFile.includes('severity'), 'Missing severity');
});

test('Has fromJson method', () => {
  assert.ok(alertFile.includes('fromJson'), 'Missing fromJson');
});

test('Handles null previousValue', () => {
  assert.ok(alertFile.includes('isNull("previousValue")'),
    'Missing null previousValue handling');
});

test('Has isCritical method', () => {
  assert.ok(alertFile.includes('isCritical'), 'Missing isCritical');
});

test('Has isHigh method', () => {
  assert.ok(alertFile.includes('isHigh'), 'Missing isHigh');
});

test('Has getFormattedAlertType method', () => {
  assert.ok(alertFile.includes('getFormattedAlertType'), 'Missing getFormattedAlertType');
});

test('getFormattedAlertType handles all 5 types', () => {
  assert.ok(alertFile.includes('health_degradation') && alertFile.includes('new_anomalies') &&
    alertFile.includes('unapplied_fixes') && alertFile.includes('duplicate_detected') &&
    alertFile.includes('missing_data'),
    'Missing alert type formatting for some types');
});

// ── Part 9: WatchlistCheckResult Model ──
console.log('\nPart 9: WatchlistCheckResult Model');

const checkResultFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/WatchlistCheckResult.java'),
  'utf8'
);

test('WatchlistCheckResult class exists', () => {
  assert.ok(checkResultFile.includes('public class WatchlistCheckResult'), 'Class not found');
});

test('Has alerts list', () => {
  assert.ok(checkResultFile.includes('alerts'), 'Missing alerts list');
});

test('Has checkedItems, totalAlerts, criticalAlerts, highAlerts', () => {
  assert.ok(checkResultFile.includes('checkedItems') && checkResultFile.includes('totalAlerts') &&
    checkResultFile.includes('criticalAlerts') && checkResultFile.includes('highAlerts'),
    'Missing count fields');
});

test('Has fromJson method', () => {
  assert.ok(checkResultFile.includes('fromJson'), 'Missing fromJson');
});

test('Has hasCriticalAlerts method', () => {
  assert.ok(checkResultFile.includes('hasCriticalAlerts'), 'Missing hasCriticalAlerts');
});

test('Has hasAlerts method', () => {
  assert.ok(checkResultFile.includes('hasAlerts'), 'Missing hasAlerts');
});

test('Has getSummaryLine method', () => {
  assert.ok(checkResultFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 10: WatchlistStatus Model ──
console.log('\nPart 10: WatchlistStatus Model');

const wlStatusFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/WatchlistStatus.java'),
  'utf8'
);

test('WatchlistStatus class exists', () => {
  assert.ok(wlStatusFile.includes('public class WatchlistStatus'), 'Class not found');
});

test('Has activeItems, totalItems, lastCheckedAt, needsCheck', () => {
  assert.ok(wlStatusFile.includes('activeItems') && wlStatusFile.includes('totalItems') &&
    wlStatusFile.includes('lastCheckedAt') && wlStatusFile.includes('needsCheck'),
    'Missing status fields');
});

test('Has fromJson method', () => {
  assert.ok(wlStatusFile.includes('fromJson'), 'Missing fromJson');
});

test('Has getStatusLine method', () => {
  assert.ok(wlStatusFile.includes('getStatusLine'), 'Missing getStatusLine');
});

// ── Part 11: API Client Integration ──
console.log('\nPart 11: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports WatchlistItem', () => {
  assert.ok(apiFile.includes('WatchlistItem'), 'Missing WatchlistItem import');
});

test('ApiClient imports WatchlistCheckResult', () => {
  assert.ok(apiFile.includes('WatchlistCheckResult'), 'Missing WatchlistCheckResult import');
});

test('ApiClient imports WatchlistStatus', () => {
  assert.ok(apiFile.includes('WatchlistStatus'), 'Missing WatchlistStatus import');
});

test('ApiClient has getWatchlist method', () => {
  assert.ok(apiFile.includes('getWatchlist'), 'Missing getWatchlist');
  assert.ok(apiFile.includes('/api/watchlist'), 'Missing /api/watchlist URL');
});

test('ApiClient has addToWatchlist method', () => {
  assert.ok(apiFile.includes('addToWatchlist'), 'Missing addToWatchlist');
});

test('ApiClient has removeFromWatchlist method', () => {
  assert.ok(apiFile.includes('removeFromWatchlist'), 'Missing removeFromWatchlist');
});

test('ApiClient has checkWatchlist method', () => {
  assert.ok(apiFile.includes('checkWatchlist'), 'Missing checkWatchlist');
  assert.ok(apiFile.includes('/api/watchlist/check'), 'Missing /api/watchlist/check URL');
});

test('ApiClient has getWatchlistStatus method', () => {
  assert.ok(apiFile.includes('getWatchlistStatus'), 'Missing getWatchlistStatus');
  assert.ok(apiFile.includes('/api/watchlist/status'), 'Missing /api/watchlist/status URL');
});

// ── Part 12: AI System Prompts ──
console.log('\nPart 12: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention watchlist', () => {
  assert.ok(promptsFile.includes('watchlist'), 'AI prompts should mention watchlist');
});

test('AI prompts mention watchlist check', () => {
  assert.ok(promptsFile.includes('/watchlist/check'),
    'Missing /watchlist/check in prompts');
});

test('AI prompts mention watchlist status', () => {
  assert.ok(promptsFile.includes('/watchlist/status'),
    'Missing /watchlist/status in prompts');
});

test('Suggested prompts include "Check my watchlist"', () => {
  assert.ok(promptsFile.includes('Check my watchlist'),
    'Missing "Check my watchlist" suggested prompt');
});

test('Suggested prompts include "Add this cemetery to my watchlist"', () => {
  assert.ok(promptsFile.includes('Add this cemetery to my watchlist'),
    'Missing "Add this cemetery to my watchlist" suggested prompt');
});

// ── Part 13: Documentation ──
console.log('\nPart 13: Documentation');

test('CHANGELOG mentions Phase 16.16 or Watchlist', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.16') || changelog.includes('Watchlist'),
    'CHANGELOG should mention Phase 16.16');
});

test('STATUS.md mentions Watchlist & Monitoring', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Watchlist') || status.includes('16.16'),
    'STATUS.md should mention Watchlist & Monitoring');
});

// ── Results ──
console.log('\n=== Phase 16.16 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.16 Watchlist & Monitoring tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
