/**
 * Phase 16.23 Tests — AI Notification & Alert System
 *
 * Tests:
 * - Backend endpoints: /notifications (POST, GET), /notifications/unread, /notifications/:id,
 *   /notifications/:id/read, /notifications/read-all, /notifications/dismiss,
 *   /alerts/rules (POST, GET), /alerts/rules/:id (DELETE), /alerts/check, /alerts/digest
 * - Notification types: 14 types (anomaly_detected through custom)
 * - Notification severity: info, warning, critical
 * - Notification lifecycle: create → read → dismiss
 * - Alert rules: 7 conditions, threshold, cemetery filter, enabled/disabled
 * - Alert checking: condition evaluation, notification firing, dedup
 * - Alert digest: period summary, by type/severity, recent notifications
 * - Notification model
 * - AlertRule model
 * - AlertDigest model
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

test('Backend has POST /api/notifications', () => {
  assert.ok(indexFile.includes('handleCreateNotification'), 'Missing handleCreateNotification');
});

test('Backend has GET /api/notifications', () => {
  assert.ok(indexFile.includes('handleListNotifications'), 'Missing handleListNotifications');
});

test('Backend has GET /api/notifications/unread', () => {
  assert.ok(indexFile.includes('handleGetUnreadNotifications'), 'Missing handleGetUnreadNotifications');
});

test('Backend has GET /api/notifications/:id', () => {
  assert.ok(indexFile.includes('handleGetNotification'), 'Missing handleGetNotification');
});

test('Backend has POST /api/notifications/:id/read', () => {
  assert.ok(indexFile.includes('handleMarkNotificationRead'), 'Missing handleMarkNotificationRead');
});

test('Backend has POST /api/notifications/read-all', () => {
  assert.ok(indexFile.includes('handleMarkAllRead'), 'Missing handleMarkAllRead');
});

test('Backend has DELETE /api/notifications/dismiss', () => {
  assert.ok(indexFile.includes('handleDismissNotification'), 'Missing handleDismissNotification');
});

test('Backend has POST /api/alerts/rules', () => {
  assert.ok(indexFile.includes('handleCreateAlertRule'), 'Missing handleCreateAlertRule');
});

test('Backend has GET /api/alerts/rules', () => {
  assert.ok(indexFile.includes('handleListAlertRules'), 'Missing handleListAlertRules');
});

test('Backend has DELETE /api/alerts/rules/:id', () => {
  assert.ok(indexFile.includes('handleDeleteAlertRule'), 'Missing handleDeleteAlertRule');
});

test('Backend has POST /api/alerts/check', () => {
  assert.ok(indexFile.includes('handleCheckAlerts'), 'Missing handleCheckAlerts');
});

test('Backend has GET /api/alerts/digest', () => {
  assert.ok(indexFile.includes('handleAlertDigest'), 'Missing handleAlertDigest');
});

test('All 12 notification/alert routes registered', () => {
  const routes = ['handleCreateNotification', 'handleListNotifications', 'handleGetUnreadNotifications',
    'handleGetNotification', 'handleMarkNotificationRead', 'handleMarkAllRead', 'handleDismissNotification',
    'handleCreateAlertRule', 'handleListAlertRules', 'handleDeleteAlertRule', 'handleCheckAlerts', 'handleAlertDigest'];
  for (const r of routes) {
    assert.ok(indexFile.includes(r), `Missing route handler: ${r}`);
  }
});

// ── Part 2: Notification Types & Validation ──
console.log('\nPart 2: Notification Types & Validation');

test('Has 14 notification types', () => {
  assert.ok(indexFile.includes('NOTIFICATION_TYPES'), 'Missing NOTIFICATION_TYPES');
  const types = ['anomaly_detected', 'confidence_drop', 'source_dead', 'duplicate_found',
    'review_needed', 'lock_expiring', 'task_assigned', 'task_completed', 'task_rejected',
    'merge_available', 'fix_available', 'data_loss', 'new_record', 'custom'];
  for (const t of types) {
    assert.ok(indexFile.includes(`'${t}'`), `Missing notification type: ${t}`);
  }
});

test('Has 3 severity levels', () => {
  assert.ok(indexFile.includes('NOTIFICATION_SEVERITY'), 'Missing NOTIFICATION_SEVERITY');
  assert.ok(indexFile.includes("'info'") && indexFile.includes("'warning'") && indexFile.includes("'critical'"),
    'Missing severity levels');
});

test('Validates notification type', () => {
  assert.ok(indexFile.includes('Invalid type'), 'Missing type validation');
});

test('Validates severity', () => {
  assert.ok(indexFile.includes('Invalid severity'), 'Missing severity validation');
});

test('Requires title', () => {
  assert.ok(indexFile.includes('Missing required field: title'), 'Missing title validation');
});

// ── Part 3: Notification Creation ──
console.log('\nPart 3: Notification Creation');

test('Creates unique notification ID', () => {
  assert.ok(indexFile.includes("'notif_' + Date.now()"), 'Missing unique ID generation');
});

test('Saves to notifications directory', () => {
  assert.ok(indexFile.includes('notifications/'), 'Missing notifications directory');
});

test('Sets read to false initially', () => {
  assert.ok(indexFile.includes('read: false'), 'Missing read initialization');
});

test('Sets dismissed to false initially', () => {
  assert.ok(indexFile.includes('dismissed: false'), 'Missing dismissed initialization');
});

test('Accepts metadata object', () => {
  assert.ok(indexFile.includes('metadata'), 'Missing metadata field');
});

test('Accepts recipient field', () => {
  assert.ok(indexFile.includes('recipient'), 'Missing recipient field');
});

// ── Part 4: Notification Listing ──
console.log('\nPart 4: Notification Listing');

test('Accepts type filter', () => {
  assert.ok(indexFile.includes("searchParams.get('type')"), 'Missing type filter');
});

test('Accepts severity filter', () => {
  assert.ok(indexFile.includes("searchParams.get('severity')"), 'Missing severity filter');
});

test('Accepts read filter', () => {
  assert.ok(indexFile.includes("searchParams.get('read')"), 'Missing read filter');
});

test('Accepts recipient filter', () => {
  assert.ok(indexFile.includes("searchParams.get('recipient')"), 'Missing recipient filter');
});

test('Accepts since filter for date range', () => {
  assert.ok(indexFile.includes("searchParams.get('since')"), 'Missing since filter');
});

test('Excludes dismissed notifications', () => {
  assert.ok(indexFile.includes('notif.dismissed') && indexFile.includes('continue'),
    'Missing dismissed exclusion');
});

test('Returns unreadCount in response', () => {
  assert.ok(indexFile.includes('unreadCount'), 'Missing unreadCount');
});

test('Sorts newest first', () => {
  assert.ok(indexFile.includes('tb - ta'), 'Missing newest-first sort');
});

// ── Part 5: Unread Notifications ──
console.log('\nPart 5: Unread Notifications');

test('Returns only unread, non-dismissed', () => {
  assert.ok(indexFile.includes('notif.read || notif.dismissed'), 'Missing unread filter');
});

test('Sorts by severity (critical first)', () => {
  assert.ok(indexFile.includes('sevOrder'), 'Missing severity sort');
});

test('Returns count and bySeverity breakdown', () => {
  assert.ok(indexFile.includes('bySeverity') && indexFile.includes('count: unread.length'),
    'Missing count and bySeverity');
});

// ── Part 6: Mark Read & Dismiss ──
console.log('\nPart 6: Mark Read & Dismiss');

test('Mark read sets readAt timestamp', () => {
  assert.ok(indexFile.includes('readAt') && indexFile.includes("notif.read = true"),
    'Missing mark read logic');
});

test('Mark all read counts marked notifications', () => {
  assert.ok(indexFile.includes('markedCount'), 'Missing mark all read count');
});

test('Dismiss requires id param', () => {
  assert.ok(indexFile.includes('Missing required param: id'), 'Missing dismiss id validation');
});

test('Dismiss sets dismissedAt timestamp', () => {
  assert.ok(indexFile.includes('dismissedAt') && indexFile.includes("notif.dismissed = true"),
    'Missing dismiss logic');
});

// ── Part 7: Alert Rules ──
console.log('\nPart 7: Alert Rules');

test('Has 7 alert conditions', () => {
  assert.ok(indexFile.includes('ALERT_CONDITIONS'), 'Missing ALERT_CONDITIONS');
  const conditions = ['anomaly_count_above', 'confidence_below', 'source_dead_above',
    'duplicate_count_above', 'review_queue_above', 'lock_expiry_below', 'records_below'];
  for (const c of conditions) {
    assert.ok(indexFile.includes(`'${c}'`), `Missing alert condition: ${c}`);
  }
});

test('Requires name and condition', () => {
  assert.ok(indexFile.includes('Missing required fields: name, condition'),
    'Missing name/condition validation');
});

test('Validates condition', () => {
  assert.ok(indexFile.includes('Invalid condition'), 'Missing condition validation');
});

test('Requires threshold', () => {
  assert.ok(indexFile.includes('Missing required field: threshold'), 'Missing threshold validation');
});

test('Creates unique rule ID', () => {
  assert.ok(indexFile.includes("'alert_' + Date.now()"), 'Missing unique rule ID');
});

test('Saves to alerts directory', () => {
  assert.ok(indexFile.includes('alerts/'), 'Missing alerts directory');
});

test('Tracks triggerCount and lastTriggered', () => {
  assert.ok(indexFile.includes('triggerCount') && indexFile.includes('lastTriggered'),
    'Missing trigger tracking');
});

// ── Part 8: Alert Rules Listing & Deletion ──
console.log('\nPart 8: Alert Rules Listing & Deletion');

test('List accepts enabled filter', () => {
  assert.ok(indexFile.includes("searchParams.get('enabled')"), 'Missing enabled filter');
});

test('List accepts condition filter', () => {
  assert.ok(indexFile.includes("searchParams.get('condition')"), 'Missing condition filter');
});

test('Returns activeRules count', () => {
  assert.ok(indexFile.includes('activeRules'), 'Missing activeRules count');
});

test('Delete returns 404 for missing rule', () => {
  assert.ok(indexFile.includes('Rule not found'), 'Missing 404 for rule');
});

// ── Part 9: Alert Check ──
console.log('\nPart 9: Alert Check');

test('Loads enabled rules', () => {
  assert.ok(indexFile.includes('rule.enabled'), 'Missing enabled rule filter');
});

test('Checks anomaly_count_above condition', () => {
  assert.ok(indexFile.includes('anomaly_count_above'), 'Missing anomaly count check');
});

test('Checks confidence_below condition', () => {
  assert.ok(indexFile.includes('confidence_below'), 'Missing confidence check');
});

test('Checks source_dead_above condition', () => {
  assert.ok(indexFile.includes('source_dead_above'), 'Missing source dead check');
});

test('Checks duplicate_count_above condition', () => {
  assert.ok(indexFile.includes('duplicate_count_above'), 'Missing duplicate check');
});

test('Checks review_queue_above condition', () => {
  assert.ok(indexFile.includes('review_queue_above'), 'Missing review queue check');
});

test('Checks lock_expiry_below condition', () => {
  assert.ok(indexFile.includes('lock_expiry_below'), 'Missing lock expiry check');
});

test('Checks records_below condition', () => {
  assert.ok(indexFile.includes('records_below'), 'Missing records below check');
});

test('Deduplicates within 1 hour', () => {
  assert.ok(indexFile.includes('3600000'), 'Missing 1-hour dedup');
});

test('Updates rule triggerCount on fire', () => {
  assert.ok(indexFile.includes('rule.triggerCount'), 'Missing triggerCount update');
});

test('Returns triggered notifications', () => {
  assert.ok(indexFile.includes('triggered'), 'Missing triggered array');
});

test('Returns rulesChecked count', () => {
  assert.ok(indexFile.includes('rulesChecked'), 'Missing rulesChecked');
});

// ── Part 10: Alert Digest ──
console.log('\nPart 10: Alert Digest');

test('Accepts hours parameter (default 24)', () => {
  assert.ok(indexFile.includes("'24'"), 'Missing default 24 hours');
});

test('Counts total/unread/dismissed', () => {
  assert.ok(indexFile.includes('total') && indexFile.includes('unread') && indexFile.includes('dismissed'),
    'Missing digest counts');
});

test('Groups by type', () => {
  assert.ok(indexFile.includes('byType'), 'Missing byType in digest');
});

test('Groups by severity', () => {
  assert.ok(indexFile.includes('bySeverity'), 'Missing bySeverity in digest');
});

test('Returns recent notifications (max 20)', () => {
  assert.ok(indexFile.includes('recentNotifications'), 'Missing recent notifications');
});

test('Counts active alert rules', () => {
  assert.ok(indexFile.includes('activeAlertRules'), 'Missing active alert rules count');
});

test('Returns period description', () => {
  assert.ok(indexFile.includes('period'), 'Missing period in digest');
});

// ── Part 11: Notification Model ──
console.log('\nPart 11: Notification Model');

const nFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/Notification.java'),
  'utf8'
);

test('Notification class exists', () => {
  assert.ok(nFile.includes('public class Notification'), 'Class not found');
});

test('Has fromJson method', () => {
  assert.ok(nFile.includes('fromJson'), 'Missing fromJson');
});

test('Has isCritical method', () => {
  assert.ok(nFile.includes('isCritical'), 'Missing isCritical');
});

test('Has isWarning method', () => {
  assert.ok(nFile.includes('isWarning'), 'Missing isWarning');
});

test('Has isUnread method', () => {
  assert.ok(nFile.includes('isUnread'), 'Missing isUnread');
});

test('Has getSeverityIcon method', () => {
  assert.ok(nFile.includes('getSeverityIcon'), 'Missing getSeverityIcon');
});

test('Has getTypeIcon method', () => {
  assert.ok(nFile.includes('getTypeIcon'), 'Missing getTypeIcon');
});

test('Has getSummaryLine method', () => {
  assert.ok(nFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

test('Type icons cover all 14 types', () => {
  const types = ['anomaly_detected', 'confidence_drop', 'source_dead', 'duplicate_found',
    'review_needed', 'lock_expiring', 'task_assigned', 'task_completed', 'task_rejected',
    'merge_available', 'fix_available', 'data_loss', 'new_record', 'custom'];
  for (const t of types) {
    assert.ok(nFile.includes(`"${t}"`), `Missing type icon: ${t}`);
  }
});

// ── Part 12: AlertRule Model ──
console.log('\nPart 12: AlertRule Model');

const arFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/AlertRule.java'),
  'utf8'
);

test('AlertRule class exists', () => {
  assert.ok(arFile.includes('public class AlertRule'), 'Class not found');
});

test('Has fromJson method', () => {
  assert.ok(arFile.includes('fromJson'), 'Missing fromJson');
});

test('Has isActive method', () => {
  assert.ok(arFile.includes('isActive'), 'Missing isActive');
});

test('Has hasTriggered method', () => {
  assert.ok(arFile.includes('hasTriggered'), 'Missing hasTriggered');
});

test('Has getConditionDescription method', () => {
  assert.ok(arFile.includes('getConditionDescription'), 'Missing getConditionDescription');
});

test('Has getSummaryLine method', () => {
  assert.ok(arFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

test('Condition descriptions cover all 7 conditions', () => {
  const conditions = ['anomaly_count_above', 'confidence_below', 'source_dead_above',
    'duplicate_count_above', 'review_queue_above', 'lock_expiry_below', 'records_below'];
  for (const c of conditions) {
    assert.ok(arFile.includes(`"${c}"`), `Missing condition: ${c}`);
  }
});

// ── Part 13: AlertDigest Model ──
console.log('\nPart 13: AlertDigest Model');

const adFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/AlertDigest.java'),
  'utf8'
);

test('AlertDigest class exists', () => {
  assert.ok(adFile.includes('public class AlertDigest'), 'Class not found');
});

test('Has DigestSummary inner class', () => {
  assert.ok(adFile.includes('class DigestSummary'), 'Missing DigestSummary');
});

test('Has fromJson method', () => {
  assert.ok(adFile.includes('fromJson'), 'Missing fromJson');
});

test('Has hasUnread method', () => {
  assert.ok(adFile.includes('hasUnread'), 'Missing hasUnread');
});

test('Has hasCritical method', () => {
  assert.ok(adFile.includes('hasCritical'), 'Missing hasCritical');
});

test('Has getSummaryLine method', () => {
  assert.ok(adFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 14: API Client Integration ──
console.log('\nPart 14: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports Notification', () => {
  assert.ok(apiFile.includes('Notification'), 'Missing Notification import');
});

test('ApiClient imports AlertRule', () => {
  assert.ok(apiFile.includes('AlertRule'), 'Missing AlertRule import');
});

test('ApiClient imports AlertDigest', () => {
  assert.ok(apiFile.includes('AlertDigest'), 'Missing AlertDigest import');
});

test('ApiClient has createNotification method', () => {
  assert.ok(apiFile.includes('createNotification'), 'Missing createNotification');
  assert.ok(apiFile.includes('/notifications'), 'Missing /notifications URL');
});

test('ApiClient has listNotifications method', () => {
  assert.ok(apiFile.includes('listNotifications'), 'Missing listNotifications');
});

test('ApiClient has getUnreadNotifications method', () => {
  assert.ok(apiFile.includes('getUnreadNotifications'), 'Missing getUnreadNotifications');
  assert.ok(apiFile.includes('/notifications/unread'), 'Missing /notifications/unread URL');
});

test('ApiClient has markNotificationRead method', () => {
  assert.ok(apiFile.includes('markNotificationRead'), 'Missing markNotificationRead');
});

test('ApiClient has markAllNotificationsRead method', () => {
  assert.ok(apiFile.includes('markAllNotificationsRead'), 'Missing markAllNotificationsRead');
});

test('ApiClient has dismissNotification method', () => {
  assert.ok(apiFile.includes('dismissNotification'), 'Missing dismissNotification');
});

test('ApiClient has createAlertRule method', () => {
  assert.ok(apiFile.includes('createAlertRule'), 'Missing createAlertRule');
  assert.ok(apiFile.includes('/alerts/rules'), 'Missing /alerts/rules URL');
});

test('ApiClient has listAlertRules method', () => {
  assert.ok(apiFile.includes('listAlertRules'), 'Missing listAlertRules');
});

test('ApiClient has deleteAlertRule method', () => {
  assert.ok(apiFile.includes('deleteAlertRule'), 'Missing deleteAlertRule');
});

test('ApiClient has checkAlerts method', () => {
  assert.ok(apiFile.includes('checkAlerts'), 'Missing checkAlerts');
  assert.ok(apiFile.includes('/alerts/check'), 'Missing /alerts/check URL');
});

test('ApiClient has getAlertDigest method', () => {
  assert.ok(apiFile.includes('getAlertDigest'), 'Missing getAlertDigest');
  assert.ok(apiFile.includes('/alerts/digest'), 'Missing /alerts/digest URL');
});

// ── Part 15: AI System Prompts ──
console.log('\nPart 15: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention notifications', () => {
  assert.ok(promptsFile.includes('/api/notifications'), 'Missing /api/notifications mention');
});

test('AI prompts mention alerts/rules', () => {
  assert.ok(promptsFile.includes('/api/alerts/rules'), 'Missing /api/alerts/rules mention');
});

test('AI prompts mention alerts/check', () => {
  assert.ok(promptsFile.includes('/api/alerts/check'), 'Missing /api/alerts/check mention');
});

test('AI prompts mention alerts/digest', () => {
  assert.ok(promptsFile.includes('/api/alerts/digest'), 'Missing /api/alerts/digest mention');
});

test('AI prompts mention 14 notification types', () => {
  assert.ok(promptsFile.includes('anomaly_detected') && promptsFile.includes('confidence_drop') &&
    promptsFile.includes('data_loss') && promptsFile.includes('custom'),
    'Missing notification types in prompts');
});

test('AI prompts mention 7 alert conditions', () => {
  assert.ok(promptsFile.includes('anomaly_count_above') && promptsFile.includes('confidence_below') &&
    promptsFile.includes('lock_expiry_below'),
    'Missing alert conditions in prompts');
});

test('Suggested prompts include "Check all alerts"', () => {
  assert.ok(promptsFile.includes('Check all alerts'), 'Missing "Check all alerts" prompt');
});

test('Suggested prompts include "unread notifications"', () => {
  assert.ok(promptsFile.includes('unread notifications'), 'Missing "unread notifications" prompt');
});

// ── Part 16: Documentation ──
console.log('\nPart 16: Documentation');

test('CHANGELOG mentions Phase 16.23 or Notification', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.23') || changelog.includes('Notification'),
    'CHANGELOG should mention Phase 16.23');
});

test('STATUS.md mentions Notification or Alert', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Notification') || status.includes('16.23'),
    'STATUS.md should mention Notification/Alert');
});

// ── Results ──
console.log('\n=== Phase 16.23 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.23 Notification & Alert System tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
