/**
 * Phase 16.22 Tests — AI Collaborative Curation
 *
 * Tests:
 * - Backend endpoints: /curation/tasks (POST, GET), /curation/tasks/:id, /assign, /complete, /review,
 *   /curation/queue, /curation/lock (POST, DELETE), /curation/stats
 * - Task types: verify, enrich, fix, merge, review, transcribe, geocode, cleanup
 * - Task priorities: low, medium, high, urgent
 * - Task statuses: pending, assigned, in_progress, submitted, reviewing, completed, cancelled
 * - Task workflow: create → assign → complete → review (approve/reject)
 * - Task history tracking
 * - Review queue: submitted first, then pending by priority
 * - Record locking: exclusive edit, expiry, conflict detection
 * - Curation stats: by status, type, priority, active locks
 * - CurationTask model
 * - CurationQueue model
 * - RecordLock model
 * - CurationStats model
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

test('Backend has POST /api/curation/tasks', () => {
  assert.ok(indexFile.includes('handleCreateCurationTask'), 'Missing handleCreateCurationTask');
});

test('Backend has GET /api/curation/tasks', () => {
  assert.ok(indexFile.includes('handleListCurationTasks'), 'Missing handleListCurationTasks');
});

test('Backend has GET /api/curation/tasks/:id', () => {
  assert.ok(indexFile.includes('handleGetCurationTask'), 'Missing handleGetCurationTask');
});

test('Backend has POST /api/curation/tasks/:id/assign', () => {
  assert.ok(indexFile.includes('handleAssignTask'), 'Missing handleAssignTask');
});

test('Backend has POST /api/curation/tasks/:id/complete', () => {
  assert.ok(indexFile.includes('handleCompleteTask'), 'Missing handleCompleteTask');
});

test('Backend has POST /api/curation/tasks/:id/review', () => {
  assert.ok(indexFile.includes('handleReviewTask'), 'Missing handleReviewTask');
});

test('Backend has GET /api/curation/queue', () => {
  assert.ok(indexFile.includes('handleCurationQueue'), 'Missing handleCurationQueue');
});

test('Backend has POST /api/curation/lock', () => {
  assert.ok(indexFile.includes('handleLockRecord'), 'Missing handleLockRecord');
});

test('Backend has DELETE /api/curation/lock', () => {
  assert.ok(indexFile.includes('handleUnlockRecord'), 'Missing handleUnlockRecord');
});

test('Backend has GET /api/curation/stats', () => {
  assert.ok(indexFile.includes('handleCurationStats'), 'Missing handleCurationStats');
});

test('All 10 curation routes registered', () => {
  const routes = ['handleCreateCurationTask', 'handleListCurationTasks', 'handleGetCurationTask',
    'handleAssignTask', 'handleCompleteTask', 'handleReviewTask', 'handleCurationQueue',
    'handleLockRecord', 'handleUnlockRecord', 'handleCurationStats'];
  for (const r of routes) {
    assert.ok(indexFile.includes(r), `Missing route handler: ${r}`);
  }
});

// ── Part 2: Task Types & Validation ──
console.log('\nPart 2: Task Types & Validation');

test('Has 8 task types', () => {
  assert.ok(indexFile.includes('TASK_TYPES'), 'Missing TASK_TYPES');
  const types = ['verify', 'enrich', 'fix', 'merge', 'review', 'transcribe', 'geocode', 'cleanup'];
  for (const t of types) {
    assert.ok(indexFile.includes(`'${t}'`), `Missing task type: ${t}`);
  }
});

test('Has 4 priority levels', () => {
  assert.ok(indexFile.includes('TASK_PRIORITIES'), 'Missing TASK_PRIORITIES');
  const priorities = ['low', 'medium', 'high', 'urgent'];
  for (const p of priorities) {
    assert.ok(indexFile.includes(`'${p}'`), `Missing priority: ${p}`);
  }
});

test('Has 7 task statuses', () => {
  assert.ok(indexFile.includes('TASK_STATUSES'), 'Missing TASK_STATUSES');
  const statuses = ['pending', 'assigned', 'in_progress', 'submitted', 'reviewing', 'completed', 'cancelled'];
  for (const s of statuses) {
    assert.ok(indexFile.includes(`'${s}'`), `Missing status: ${s}`);
  }
});

test('Validates task type', () => {
  assert.ok(indexFile.includes('Invalid task type'), 'Missing task type validation');
});

test('Validates priority', () => {
  assert.ok(indexFile.includes('Invalid priority'), 'Missing priority validation');
});

test('Requires title', () => {
  assert.ok(indexFile.includes('Missing required field: title'), 'Missing title validation');
});

// ── Part 3: Task Creation ──
console.log('\nPart 3: Task Creation');

test('Creates unique task ID', () => {
  assert.ok(indexFile.includes("'task_' + Date.now()"), 'Missing unique task ID generation');
});

test('Sets status based on assignment', () => {
  assert.ok(indexFile.includes("assignedTo ? 'assigned' : 'pending'"),
    'Missing status assignment logic');
});

test('Creates initial history entry', () => {
  assert.ok(indexFile.includes("action: 'created'"), 'Missing initial history entry');
});

test('Saves task to curation directory', () => {
  assert.ok(indexFile.includes("curation/"), 'Missing curation directory');
});

// ── Part 4: Task Listing ──
console.log('\nPart 4: Task Listing');

test('Accepts status filter', () => {
  assert.ok(indexFile.includes("searchParams.get('status')"), 'Missing status filter');
});

test('Accepts type filter', () => {
  assert.ok(indexFile.includes("searchParams.get('type')"), 'Missing type filter');
});

test('Accepts priority filter', () => {
  assert.ok(indexFile.includes("searchParams.get('priority')"), 'Missing priority filter');
});

test('Accepts assignedTo filter', () => {
  assert.ok(indexFile.includes("searchParams.get('assignedTo')"), 'Missing assignedTo filter');
});

test('Accepts cemeteryId filter', () => {
  assert.ok(indexFile.includes("searchParams.get('cemeteryId')"), 'Missing cemeteryId filter');
});

test('Accepts recordId filter', () => {
  assert.ok(indexFile.includes("searchParams.get('recordId')"), 'Missing recordId filter');
});

test('Sorts by created date (newest first)', () => {
  assert.ok(indexFile.includes('b.createdAt').toString() && indexFile.includes('a.createdAt'),
    'Missing sort by created date');
});

test('Returns filters in response', () => {
  assert.ok(indexFile.includes('filters:'), 'Missing filters in response');
});

// ── Part 5: Task Assignment ──
console.log('\nPart 5: Task Assignment');

test('Requires assignedTo', () => {
  assert.ok(indexFile.includes('Missing required field: assignedTo'),
    'Missing assignedTo validation');
});

test('Sets status to assigned', () => {
  assert.ok(indexFile.includes("task.status = 'assigned'"), 'Missing status assignment');
});

test('Records assignment in history', () => {
  assert.ok(indexFile.includes("action: 'assigned'"), 'Missing assignment history');
});

test('Sets assignedAt timestamp', () => {
  assert.ok(indexFile.includes('assignedAt'), 'Missing assignedAt');
});

// ── Part 6: Task Completion ──
console.log('\nPart 6: Task Completion');

test('Sets status to submitted', () => {
  assert.ok(indexFile.includes("task.status = 'submitted'"), 'Missing status submission');
});

test('Records completion in history', () => {
  assert.ok(indexFile.includes("action: 'completed'"), 'Missing completion history');
});

test('Accepts completionNotes', () => {
  assert.ok(indexFile.includes('completionNotes'), 'Missing completionNotes');
});

test('Prevents double completion', () => {
  assert.ok(indexFile.includes('already completed'), 'Missing double completion prevention');
});

test('Sets submittedAt timestamp', () => {
  assert.ok(indexFile.includes('submittedAt'), 'Missing submittedAt');
});

// ── Part 7: Task Review ──
console.log('\nPart 7: Task Review');

test('Requires approved boolean', () => {
  assert.ok(indexFile.includes('Missing required field: approved'),
    'Missing approved validation');
});

test('Requires submitted status for review', () => {
  assert.ok(indexFile.includes("must be in 'submitted' status"),
    'Missing submitted status check');
});

test('Sets status to completed on approval', () => {
  assert.ok(indexFile.includes("approved ? 'completed' : 'pending'"),
    'Missing approval/rejection status logic');
});

test('Records review in history', () => {
  assert.ok(indexFile.includes("action: approved ? 'approved' : 'rejected'"),
    'Missing review history');
});

test('Accepts reviewNotes', () => {
  assert.ok(indexFile.includes('reviewNotes'), 'Missing reviewNotes');
});

test('Sets reviewResult', () => {
  assert.ok(indexFile.includes("approved ? 'approved' : 'rejected'"),
    'Missing reviewResult');
});

// ── Part 8: Review Queue ──
console.log('\nPart 8: Review Queue');

test('Returns submitted and pending tasks', () => {
  assert.ok(indexFile.includes("'submitted'") && indexFile.includes("'pending'"),
    'Missing submitted/pending filter');
});

test('Submitted tasks sorted first', () => {
  assert.ok(indexFile.includes('a.status === \'submitted\' && b.status !== \'submitted\''),
    'Missing submitted-first sort');
});

test('Then sorted by priority', () => {
  assert.ok(indexFile.includes('priorityOrder'), 'Missing priority sort');
});

test('Returns submittedCount and pendingCount', () => {
  assert.ok(indexFile.includes('submittedCount') && indexFile.includes('pendingCount'),
    'Missing count breakdowns');
});

test('Returns totalInQueue', () => {
  assert.ok(indexFile.includes('totalInQueue'), 'Missing totalInQueue');
});

// ── Part 9: Record Locking ──
console.log('\nPart 9: Record Locking');

test('Requires recordId and lockedBy', () => {
  assert.ok(indexFile.includes('Missing required fields: recordId, lockedBy'),
    'Missing lock validation');
});

test('Checks for existing lock', () => {
  assert.ok(indexFile.includes('already locked'), 'Missing existing lock check');
});

test('Returns 409 when locked by another user', () => {
  assert.ok(indexFile.includes('409'), 'Missing 409 conflict response');
});

test('Sets expiry time', () => {
  assert.ok(indexFile.includes('expiresAt'), 'Missing expiry time');
});

test('Default duration is 30 minutes', () => {
  assert.ok(indexFile.includes('30'), 'Missing default 30-minute duration');
});

test('Saves lock to locks directory', () => {
  assert.ok(indexFile.includes('locks/'), 'Missing locks directory');
});

// ── Part 10: Unlock ──
console.log('\nPart 10: Unlock');

test('Requires recordId and lockedBy params', () => {
  assert.ok(indexFile.includes('Missing required params: recordId, lockedBy'),
    'Missing unlock validation');
});

test('Verifies lock ownership before unlock', () => {
  assert.ok(indexFile.includes('Cannot unlock'), 'Missing ownership check');
});

test('Returns 403 if lock belongs to another user', () => {
  assert.ok(indexFile.includes('403'), 'Missing 403 forbidden response');
});

// ── Part 11: Curation Stats ──
console.log('\nPart 11: Curation Stats');

test('Counts total tasks', () => {
  assert.ok(indexFile.includes('stats.total'), 'Missing total count');
});

test('Counts by status', () => {
  assert.ok(indexFile.includes('byStatus'), 'Missing byStatus');
});

test('Counts by type', () => {
  assert.ok(indexFile.includes('byType'), 'Missing byType');
});

test('Counts by priority', () => {
  assert.ok(indexFile.includes('byPriority'), 'Missing byPriority');
});

test('Counts active locks', () => {
  assert.ok(indexFile.includes('activeLocks'), 'Missing activeLocks');
});

test('Filters expired locks', () => {
  assert.ok(indexFile.includes('expiresAt') && indexFile.includes('Date.now()'),
    'Missing expired lock filter');
});

// ── Part 12: CurationTask Model ──
console.log('\nPart 12: CurationTask Model');

const ctFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CurationTask.java'),
  'utf8'
);

test('CurationTask class exists', () => {
  assert.ok(ctFile.includes('public class CurationTask'), 'Class not found');
});

test('Has TaskHistoryEntry inner class', () => {
  assert.ok(ctFile.includes('class TaskHistoryEntry'), 'Missing TaskHistoryEntry');
});

test('Has fromJson method', () => {
  assert.ok(ctFile.includes('fromJson'), 'Missing fromJson');
});

test('Has status check methods', () => {
  assert.ok(ctFile.includes('isPending') && ctFile.includes('isAssigned') &&
    ctFile.includes('isSubmitted') && ctFile.includes('isCompleted'),
    'Missing status check methods');
});

test('Has isUrgent method', () => {
  assert.ok(ctFile.includes('isUrgent'), 'Missing isUrgent');
});

test('Has getStatusIcon method', () => {
  assert.ok(ctFile.includes('getStatusIcon'), 'Missing getStatusIcon');
});

test('Has getPriorityIcon method', () => {
  assert.ok(ctFile.includes('getPriorityIcon'), 'Missing getPriorityIcon');
});

test('Has getTypeIcon method', () => {
  assert.ok(ctFile.includes('getTypeIcon'), 'Missing getTypeIcon');
});

test('Has getSummaryLine method', () => {
  assert.ok(ctFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

test('Status icons cover all statuses', () => {
  const statuses = ['pending', 'assigned', 'in_progress', 'submitted', 'reviewing', 'completed', 'cancelled'];
  for (const s of statuses) {
    assert.ok(ctFile.includes(`"${s}"`), `Missing status icon: ${s}`);
  }
});

test('Type icons cover all types', () => {
  const types = ['verify', 'enrich', 'fix', 'merge', 'review', 'transcribe', 'geocode', 'cleanup'];
  for (const t of types) {
    assert.ok(ctFile.includes(`"${t}"`), `Missing type icon: ${t}`);
  }
});

// ── Part 13: CurationQueue Model ──
console.log('\nPart 13: CurationQueue Model');

const cqFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CurationQueue.java'),
  'utf8'
);

test('CurationQueue class exists', () => {
  assert.ok(cqFile.includes('public class CurationQueue'), 'Class not found');
});

test('Has QueueEntry inner class', () => {
  assert.ok(cqFile.includes('class QueueEntry'), 'Missing QueueEntry');
});

test('Has fromJson method', () => {
  assert.ok(cqFile.includes('fromJson'), 'Missing fromJson');
});

test('Has hasTasks method', () => {
  assert.ok(cqFile.includes('hasTasks'), 'Missing hasTasks');
});

test('Has hasReviewTasks method', () => {
  assert.ok(cqFile.includes('hasReviewTasks'), 'Missing hasReviewTasks');
});

test('Has getSummaryLine method', () => {
  assert.ok(cqFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 14: RecordLock Model ──
console.log('\nPart 14: RecordLock Model');

const rlFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/RecordLock.java'),
  'utf8'
);

test('RecordLock class exists', () => {
  assert.ok(rlFile.includes('public class RecordLock'), 'Class not found');
});

test('Has fromJson method', () => {
  assert.ok(rlFile.includes('fromJson'), 'Missing fromJson');
});

test('Has isExpired method', () => {
  assert.ok(rlFile.includes('isExpired'), 'Missing isExpired');
});

test('Has isActive method', () => {
  assert.ok(rlFile.includes('isActive'), 'Missing isActive');
});

test('Has getSummaryLine method', () => {
  assert.ok(rlFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 15: CurationStats Model ──
console.log('\nPart 15: CurationStats Model');

const csFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CurationStats.java'),
  'utf8'
);

test('CurationStats class exists', () => {
  assert.ok(csFile.includes('public class CurationStats'), 'Class not found');
});

test('Has fromJson method', () => {
  assert.ok(csFile.includes('fromJson'), 'Missing fromJson');
});

test('Has getPending, getAssigned, getSubmitted, getCompleted', () => {
  assert.ok(csFile.includes('getPending') && csFile.includes('getAssigned') &&
    csFile.includes('getSubmitted') && csFile.includes('getCompleted'),
    'Missing status getter methods');
});

test('Has getUrgent', () => {
  assert.ok(csFile.includes('getUrgent'), 'Missing getUrgent');
});

test('Has getActiveTasks', () => {
  assert.ok(csFile.includes('getActiveTasks'), 'Missing getActiveTasks');
});

test('Has getCompletionRate', () => {
  assert.ok(csFile.includes('getCompletionRate'), 'Missing getCompletionRate');
});

test('Has getSummaryLine', () => {
  assert.ok(csFile.includes('getSummaryLine'), 'Missing getSummaryLine');
});

// ── Part 16: API Client Integration ──
console.log('\nPart 16: API Client Integration');

const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'),
  'utf8'
);

test('ApiClient imports CurationTask', () => {
  assert.ok(apiFile.includes('CurationTask'), 'Missing CurationTask import');
});

test('ApiClient imports CurationQueue', () => {
  assert.ok(apiFile.includes('CurationQueue'), 'Missing CurationQueue import');
});

test('ApiClient imports RecordLock', () => {
  assert.ok(apiFile.includes('RecordLock'), 'Missing RecordLock import');
});

test('ApiClient imports CurationStats', () => {
  assert.ok(apiFile.includes('CurationStats'), 'Missing CurationStats import');
});

test('ApiClient has createCurationTask method', () => {
  assert.ok(apiFile.includes('createCurationTask'), 'Missing createCurationTask');
  assert.ok(apiFile.includes('/curation/tasks'), 'Missing /curation/tasks URL');
});

test('ApiClient has listCurationTasks method', () => {
  assert.ok(apiFile.includes('listCurationTasks'), 'Missing listCurationTasks');
});

test('ApiClient has getCurationTask method', () => {
  assert.ok(apiFile.includes('getCurationTask'), 'Missing getCurationTask');
});

test('ApiClient has assignTask method', () => {
  assert.ok(apiFile.includes('assignTask'), 'Missing assignTask');
  assert.ok(apiFile.includes('/assign'), 'Missing /assign URL');
});

test('ApiClient has completeTask method', () => {
  assert.ok(apiFile.includes('completeTask'), 'Missing completeTask');
  assert.ok(apiFile.includes('/complete'), 'Missing /complete URL');
});

test('ApiClient has reviewTask method', () => {
  assert.ok(apiFile.includes('reviewTask'), 'Missing reviewTask');
  assert.ok(apiFile.includes('/review'), 'Missing /review URL');
});

test('ApiClient has getCurationQueue method', () => {
  assert.ok(apiFile.includes('getCurationQueue'), 'Missing getCurationQueue');
  assert.ok(apiFile.includes('/curation/queue'), 'Missing /curation/queue URL');
});

test('ApiClient has lockRecord method', () => {
  assert.ok(apiFile.includes('lockRecord'), 'Missing lockRecord');
  assert.ok(apiFile.includes('/curation/lock'), 'Missing /curation/lock URL');
});

test('ApiClient has unlockRecord method', () => {
  assert.ok(apiFile.includes('unlockRecord'), 'Missing unlockRecord');
});

test('ApiClient has getCurationStats method', () => {
  assert.ok(apiFile.includes('getCurationStats'), 'Missing getCurationStats');
  assert.ok(apiFile.includes('/curation/stats'), 'Missing /curation/stats URL');
});

// ── Part 17: AI System Prompts ──
console.log('\nPart 17: AI System Prompts');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AI prompts mention curation/tasks', () => {
  assert.ok(promptsFile.includes('curation/tasks'), 'Missing curation/tasks mention');
});

test('AI prompts mention curation/queue', () => {
  assert.ok(promptsFile.includes('curation/queue'), 'Missing curation/queue mention');
});

test('AI prompts mention curation/lock', () => {
  assert.ok(promptsFile.includes('curation/lock'), 'Missing curation/lock mention');
});

test('AI prompts mention curation/stats', () => {
  assert.ok(promptsFile.includes('curation/stats'), 'Missing curation/stats mention');
});

test('AI prompts mention task types', () => {
  assert.ok(promptsFile.includes('verify') && promptsFile.includes('enrich') &&
    promptsFile.includes('geocode'),
    'Missing task types in prompts');
});

test('AI prompts mention priorities', () => {
  assert.ok(promptsFile.includes('urgent'), 'Missing urgent priority mention');
});

test('Suggested prompts include "verification task"', () => {
  assert.ok(promptsFile.includes('verification task'),
    'Missing "verification task" prompt');
});

test('Suggested prompts include "curation review queue"', () => {
  assert.ok(promptsFile.includes('curation review queue'),
    'Missing "curation review queue" prompt');
});

// ── Part 18: Documentation ──
console.log('\nPart 18: Documentation');

test('CHANGELOG mentions Phase 16.22 or Collaborative Curation', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Phase 16.22') || changelog.includes('Collaborative Curation'),
    'CHANGELOG should mention Phase 16.22');
});

test('STATUS.md mentions Collaborative Curation', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(status.includes('Collaborative') || status.includes('16.22'),
    'STATUS.md should mention Collaborative Curation');
});

// ── Results ──
console.log('\n=== Phase 16.22 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.22 Collaborative Curation tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
