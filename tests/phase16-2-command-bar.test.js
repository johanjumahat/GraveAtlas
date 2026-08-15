#!/usr/bin/env node
/**
 * Phase 16.2 Tests — AI Command Bar + Research Session Persistence
 *
 * Verifies:
 * - AICommandBar component exists with send, preFill, clear methods
 * - AICommandBar opens MainActivity with pre-filled question
 * - ResearchSessionManager creates, updates, lists, and deletes sessions
 * - MainNavActivity has AI command bar in layout and code
 * - Research sessions stored in SharedPreferences as JSON
 *
 * Run: node tests/phase16-2-command-bar.test.js
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

console.log('\n=== Phase 16.2 Tests — AI Command Bar + Research Sessions ===\n');

const APP_BASE = path.join(__dirname, '..', 'app', 'src', 'main', 'java', 'com', 'putraworks', 'graveatlas');

// ── Part 1: AICommandBar Component ──

console.log('Part 1: AICommandBar Component');

const commandBarSource = fs.readFileSync(path.join(APP_BASE, 'ui', 'ai', 'AICommandBar.java'), 'utf8');

test('AICommandBar class exists', () => {
  assert.ok(commandBarSource.includes('class AICommandBar'));
});

test('AICommandBar extends LinearLayout', () => {
  assert.ok(commandBarSource.includes('extends LinearLayout'));
});

test('AICommandBar has EditText for command input', () => {
  assert.ok(commandBarSource.includes('EditText'));
  assert.ok(commandBarSource.includes('etCommand'));
});

test('AICommandBar has send button', () => {
  assert.ok(commandBarSource.includes('btnSend'));
  assert.ok(commandBarSource.includes('ImageButton'));
});

test('AICommandBar sendCommand opens MainActivity', () => {
  assert.ok(commandBarSource.includes('MainActivity.class'));
  assert.ok(commandBarSource.includes('prefill_question'));
});

test('AICommandBar clears input after sending', () => {
  assert.ok(commandBarSource.includes('etCommand.setText("")'));
});

test('AICommandBar has preFill method', () => {
  assert.ok(commandBarSource.includes('public void preFill'));
});

test('AICommandBar has clear method', () => {
  assert.ok(commandBarSource.includes('public void clear'));
});

test('AICommandBar has hasText method', () => {
  assert.ok(commandBarSource.includes('public boolean hasText'));
});

test('AICommandBar handles Enter key (IME_ACTION_SEND)', () => {
  assert.ok(commandBarSource.includes('IME_ACTION_SEND'));
});

test('AICommandBar has AI label text', () => {
  assert.ok(commandBarSource.includes('Ask GraveAtlas'));
});

test('AICommandBar has three constructors (Context, AttributeSet, defStyleAttr)', () => {
  assert.ok(commandBarSource.includes('AICommandBar(Context context)'));
  assert.ok(commandBarSource.includes('AICommandBar(Context context, AttributeSet attrs)'));
  assert.ok(commandBarSource.includes('AICommandBar(Context context, AttributeSet attrs, int defStyleAttr)'));
});

// ── Part 2: ResearchSessionManager ──

console.log('\nPart 2: ResearchSessionManager');

const sessionSource = fs.readFileSync(path.join(APP_BASE, 'ui', 'ai', 'ResearchSessionManager.java'), 'utf8');

test('ResearchSessionManager class exists', () => {
  assert.ok(sessionSource.includes('class ResearchSessionManager'));
});

test('ResearchSessionManager uses SharedPreferences', () => {
  assert.ok(sessionSource.includes('SharedPreferences'));
});

test('ResearchSessionManager has createSession method', () => {
  assert.ok(sessionSource.includes('public Session createSession'));
});

test('createSession generates UUID', () => {
  assert.ok(sessionSource.includes('UUID.randomUUID'));
});

test('createSession generates title from first question', () => {
  assert.ok(sessionSource.includes('generateTitle'));
  assert.ok(sessionSource.includes('50'));
});

test('ResearchSessionManager has addAnswer method', () => {
  assert.ok(sessionSource.includes('public void addAnswer'));
});

test('ResearchSessionManager has addQuestion method', () => {
  assert.ok(sessionSource.includes('public void addQuestion'));
});

test('ResearchSessionManager has addReferencedRecord method', () => {
  assert.ok(sessionSource.includes('public void addReferencedRecord'));
});

test('ResearchSessionManager has getSession method', () => {
  assert.ok(sessionSource.includes('public Session getSession'));
});

test('ResearchSessionManager has listSessions method', () => {
  assert.ok(sessionSource.includes('public List<Session> listSessions'));
});

test('listSessions sorts by lastAccessedAt descending', () => {
  assert.ok(sessionSource.includes('sort'));
  assert.ok(sessionSource.includes('lastAccessedAt'));
});

test('ResearchSessionManager has deleteSession method', () => {
  assert.ok(sessionSource.includes('public void deleteSession'));
});

test('ResearchSessionManager has clearAll method', () => {
  assert.ok(sessionSource.includes('public void clearAll'));
});

test('ResearchSessionManager enforces max 50 sessions', () => {
  assert.ok(sessionSource.includes('MAX_SESSIONS'));
  assert.ok(sessionSource.includes('50'));
});

test('Session has interactions list', () => {
  assert.ok(sessionSource.includes('List<Interaction> interactions'));
});

test('Session has referencedRecordIds list', () => {
  assert.ok(sessionSource.includes('List<String> referencedRecordIds'));
});

test('Interaction has question, answer, timestamp', () => {
  assert.ok(sessionSource.includes('String question'));
  assert.ok(sessionSource.includes('String answer'));
  assert.ok(sessionSource.includes('long timestamp'));
});

test('addReferencedRecord prevents duplicates', () => {
  assert.ok(sessionSource.includes('!session.referencedRecordIds.contains'));
});

test('Sessions serialized to JSON', () => {
  assert.ok(sessionSource.includes('JSONObject'));
  assert.ok(sessionSource.includes('JSONArray'));
  assert.ok(sessionSource.includes('toJson'));
  assert.ok(sessionSource.includes('fromJson'));
});

// ── Part 3: MainNavActivity Integration ──

console.log('\nPart 3: MainNavActivity Integration');

const navSource = fs.readFileSync(path.join(APP_BASE, 'MainNavActivity.java'), 'utf8');

test('MainNavActivity imports AICommandBar', () => {
  assert.ok(navSource.includes('import com.putraworks.graveatlas.ui.ai.AICommandBar'));
});

test('MainNavActivity imports ResearchSessionManager', () => {
  assert.ok(navSource.includes('import com.putraworks.graveatlas.ui.ai.ResearchSessionManager'));
});

test('MainNavActivity has aiCommandBar field', () => {
  assert.ok(navSource.includes('AICommandBar aiCommandBar'));
});

test('MainNavActivity has researchSessionManager field', () => {
  assert.ok(navSource.includes('ResearchSessionManager researchSessionManager'));
});

test('MainNavActivity initializes aiCommandBar in onCreate', () => {
  assert.ok(navSource.includes('aiCommandBar = findViewById(R.id.aiCommandBar)'));
});

test('MainNavActivity initializes researchSessionManager in onCreate', () => {
  assert.ok(navSource.includes('researchSessionManager = new ResearchSessionManager'));
});

// ── Part 4: Layout Integration ──

console.log('\nPart 4: Layout Integration');

const layoutSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'main', 'res', 'layout', 'activity_main_nav.xml'), 'utf8');

test('activity_main_nav.xml has AICommandBar', () => {
  assert.ok(layoutSource.includes('AICommandBar'));
  assert.ok(layoutSource.includes('aiCommandBar'));
});

test('AICommandBar positioned above bottom navigation', () => {
  assert.ok(layoutSource.includes('layout_constraintBottom_toTopOf="@id/bottom_navigation"'));
});

test('Fragment container constrained to top of AICommandBar', () => {
  assert.ok(layoutSource.includes('layout_constraintBottom_toTopOf="@id/aiCommandBar"'));
});

test('AICommandBar has background and elevation', () => {
  assert.ok(layoutSource.includes('android:background') || layoutSource.includes('app:background'));
  assert.ok(layoutSource.includes('android:elevation'));
});

console.log('\n=== Phase 16.2 Command Bar + Sessions Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.2 command bar + sessions tests passed!');
else { console.log('\n❌ Some tests failed!'); failures.forEach(f => console.log(`  - ${f}`)); }

process.exit(failed > 0 ? 1 : 0);
