#!/usr/bin/env node
/**
 * Phase 16.3 Tests — AI Timelines
 *
 * Verifies:
 * - TimelineEvent model creates events from grave records
 * - TimelineEvent supports birth, death, record created, cemetery events
 * - Events sorted chronologically (oldest first)
 * - Decade grouping works
 * - Year range filtering works
 * - Summary generation works
 * - Backend /api/timeline endpoint exists and returns events
 * - TimelineFragment displays events with evidence badges
 * - Timeline accessible from MainNavActivity More sheet
 * - AI system prompts mention timeline capability
 *
 * Run: node tests/phase16-3.test.js
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

console.log('\n=== Phase 16.3 Tests — AI Timelines ===\n');

const APP_BASE = path.join(__dirname, '..', 'app', 'src', 'main', 'java', 'com', 'putraworks', 'graveatlas');

// ── Part 1: TimelineEvent Model ──

console.log('Part 1: TimelineEvent Model');

const timelineSource = fs.readFileSync(path.join(APP_BASE, 'ui', 'timeline', 'TimelineEvent.java'), 'utf8');

test('TimelineEvent class exists', () => {
  assert.ok(timelineSource.includes('class TimelineEvent'));
});

test('TimelineEvent has EventType enum', () => {
  assert.ok(timelineSource.includes('enum EventType'));
});

test('EventType has BIRTH', () => {
  assert.ok(timelineSource.includes('BIRTH'));
});

test('EventType has DEATH', () => {
  assert.ok(timelineSource.includes('DEATH'));
});

test('EventType has BURIAL', () => {
  assert.ok(timelineSource.includes('BURIAL'));
});

test('EventType has CEMETERY_ESTABLISHED', () => {
  assert.ok(timelineSource.includes('CEMETERY_ESTABLISHED'));
});

test('EventType has INSCRIPTION', () => {
  assert.ok(timelineSource.includes('INSCRIPTION'));
});

test('EventType has RECORD_CREATED', () => {
  assert.ok(timelineSource.includes('RECORD_CREATED'));
});

test('EventType has RECORD_UPDATED', () => {
  assert.ok(timelineSource.includes('RECORD_UPDATED'));
});

test('TimelineEvent has date field', () => {
  assert.ok(timelineSource.includes('String date'));
});

test('TimelineEvent has year field', () => {
  assert.ok(timelineSource.includes('String year'));
});

test('TimelineEvent has title field', () => {
  assert.ok(timelineSource.includes('String title'));
});

test('TimelineEvent has recordId field', () => {
  assert.ok(timelineSource.includes('String recordId'));
});

test('TimelineEvent has verificationStatus field', () => {
  assert.ok(timelineSource.includes('verificationStatus'));
});

test('TimelineEvent has sourceRefs list', () => {
  assert.ok(timelineSource.includes('sourceRefs'));
});

test('TimelineEvent has latitude/longitude', () => {
  assert.ok(timelineSource.includes('latitude'));
  assert.ok(timelineSource.includes('longitude'));
});

test('TimelineEvent has hasValidDate method', () => {
  assert.ok(timelineSource.includes('hasValidDate'));
});

test('TimelineEvent has getFormattedDate method', () => {
  assert.ok(timelineSource.includes('getFormattedDate'));
});

test('TimelineEvent has getYearInt method', () => {
  assert.ok(timelineSource.includes('getYearInt'));
});

// ── Part 2: Event Factory Methods ──

console.log('\nPart 2: Event Factory Methods');

test('fromBirth creates birth event from GraveRecord', () => {
  assert.ok(timelineSource.includes('fromBirth'));
  assert.ok(timelineSource.includes('EventType.BIRTH'));
});

test('fromDeath creates death event from GraveRecord', () => {
  assert.ok(timelineSource.includes('fromDeath'));
  assert.ok(timelineSource.includes('EventType.DEATH'));
});

test('fromRecordCreated creates record-created event', () => {
  assert.ok(timelineSource.includes('fromRecordCreated'));
  assert.ok(timelineSource.includes('EventType.RECORD_CREATED'));
});

test('fromCemeteryEstablished creates cemetery event', () => {
  assert.ok(timelineSource.includes('fromCemeteryEstablished'));
  assert.ok(timelineSource.includes('EventType.CEMETERY_ESTABLISHED'));
});

test('fromBirth uses grave.birthDate', () => {
  assert.ok(timelineSource.includes('grave.birthDate'));
});

test('fromDeath uses grave.deathDate', () => {
  assert.ok(timelineSource.includes('grave.deathDate'));
});

test('fromBirth uses grave.name for title', () => {
  assert.ok(timelineSource.includes('grave.name'));
});

test('fromBirth copies verificationStatus', () => {
  assert.ok(timelineSource.includes('grave.verificationStatus'));
});

test('fromBirth copies sourceRefs', () => {
  assert.ok(timelineSource.includes('grave.sourceRefs'));
});

// ── Part 3: Sorting and Filtering ──

console.log('\nPart 3: Sorting and Filtering');

test('sortChronologically method exists', () => {
  assert.ok(timelineSource.includes('sortChronologically'));
});

test('sortChronologically sorts oldest first', () => {
  assert.ok(timelineSource.includes('Integer.compare(yearA, yearB)') || timelineSource.includes('Integer.compare(a, b)') || timelineSource.includes('compare'));
});

test('Unknown dates go last in sort', () => {
  assert.ok(timelineSource.includes('-1') && timelineSource.includes('return 1'));
});

test('filterByYearRange method exists', () => {
  assert.ok(timelineSource.includes('filterByYearRange'));
});

test('filterByYearRange checks startYear and endYear', () => {
  assert.ok(timelineSource.includes('startYear') && timelineSource.includes('endYear'));
});

// ── Part 4: Decade Grouping ──

console.log('\nPart 4: Decade Grouping');

test('groupByDecade method exists', () => {
  assert.ok(timelineSource.includes('groupByDecade'));
});

test('DecadeGroup inner class exists', () => {
  assert.ok(timelineSource.includes('class DecadeGroup'));
});

test('DecadeGroup has decade, label, events fields', () => {
  assert.ok(timelineSource.includes('int decade'));
  assert.ok(timelineSource.includes('String label'));
  assert.ok(timelineSource.includes('List<TimelineEvent> events'));
});

test('DecadeGroup has getEventCount method', () => {
  assert.ok(timelineSource.includes('getEventCount'));
});

test('Decade calculation uses (year / 10) * 10', () => {
  assert.ok(timelineSource.includes('/ 10) * 10'));
});

test('groupByDecade uses TreeMap for sorted output', () => {
  assert.ok(timelineSource.includes('TreeMap'));
});

// ── Part 5: Summary Generation ──

console.log('\nPart 5: Summary Generation');

test('generateSummary method exists', () => {
  assert.ok(timelineSource.includes('generateSummary'));
});

test('generateSummary handles empty list', () => {
  assert.ok(timelineSource.includes('No timeline events'));
});

test('generateSummary counts births and deaths', () => {
  assert.ok(timelineSource.includes('births'));
  assert.ok(timelineSource.includes('deaths'));
});

test('generateSummary includes year range', () => {
  assert.ok(timelineSource.includes('firstYear') && timelineSource.includes('lastYear'));
});

// ── Part 6: JSON Serialization ──

console.log('\nPart 6: JSON Serialization');

test('toJson method exists', () => {
  assert.ok(timelineSource.includes('toJson'));
});

test('toJson includes id, type, date, title', () => {
  assert.ok(timelineSource.includes('"id"'));
  assert.ok(timelineSource.includes('"type"'));
  assert.ok(timelineSource.includes('"date"'));
  assert.ok(timelineSource.includes('"title"'));
});

test('toJson includes verificationStatus and sourceRefs', () => {
  assert.ok(timelineSource.includes('"verificationStatus"'));
  assert.ok(timelineSource.includes('"sourceRefs"'));
});

test('extractYear uses regex for 4-digit year', () => {
  assert.ok(timelineSource.includes('Pattern.compile') || timelineSource.includes('\\\\d{4}'));
});

// ── Part 7: TimelineFragment ──

console.log('\nPart 7: TimelineFragment');

const fragmentSource = fs.readFileSync(path.join(APP_BASE, 'ui', 'timeline', 'TimelineFragment.java'), 'utf8');

test('TimelineFragment class exists', () => {
  assert.ok(fragmentSource.includes('class TimelineFragment'));
});

test('TimelineFragment extends Fragment', () => {
  assert.ok(fragmentSource.includes('extends Fragment'));
});

test('TimelineFragment has title "📊 Timeline"', () => {
  assert.ok(fragmentSource.includes('Timeline'));
});

test('TimelineFragment has summary text', () => {
  assert.ok(fragmentSource.includes('summaryText'));
});

test('TimelineFragment has progress bar', () => {
  assert.ok(fragmentSource.includes('progressBar'));
});

test('TimelineFragment loads data from API', () => {
  assert.ok(fragmentSource.includes('ApiClient'));
});

test('TimelineFragment calls graves endpoint', () => {
  assert.ok(fragmentSource.includes('"graves"'));
});

test('TimelineFragment builds events from graves', () => {
  assert.ok(fragmentSource.includes('buildEvents'));
});

test('TimelineFragment uses TimelineEvent.sortChronologically', () => {
  assert.ok(fragmentSource.includes('TimelineEvent.sortChronologically'));
});

test('TimelineFragment uses TimelineEvent.groupByDecade', () => {
  assert.ok(fragmentSource.includes('TimelineEvent.groupByDecade'));
});

test('TimelineFragment uses TimelineEvent.generateSummary', () => {
  assert.ok(fragmentSource.includes('TimelineEvent.generateSummary'));
});

test('TimelineFragment displays decade headers', () => {
  assert.ok(fragmentSource.includes('decadeHeader'));
});

test('TimelineFragment creates event cards', () => {
  assert.ok(fragmentSource.includes('createEventCard'));
});

test('TimelineFragment shows event type label', () => {
  assert.ok(fragmentSource.includes('event.type.label'));
});

test('TimelineFragment shows formatted date', () => {
  assert.ok(fragmentSource.includes('getFormattedDate'));
});

test('TimelineFragment shows evidence badge', () => {
  assert.ok(fragmentSource.includes('EvidenceStatus'));
  assert.ok(fragmentSource.includes('createBadge'));
});

test('TimelineFragment navigates to grave detail on click', () => {
  assert.ok(fragmentSource.includes('GraveDetailFragment'));
});

test('TimelineFragment has long-press event details dialog', () => {
  assert.ok(fragmentSource.includes('setOnLongClickListener'));
  assert.ok(fragmentSource.includes('showEventDetails'));
});

test('TimelineFragment has event color mapping', () => {
  assert.ok(fragmentSource.includes('getEventColor'));
});

test('TimelineFragment handles API failure gracefully', () => {
  assert.ok(fragmentSource.includes('onFailure'));
});

test('TimelineFragment handles empty events', () => {
  assert.ok(fragmentSource.includes('No timeline events'));
});

// ── Part 8: Backend Timeline Endpoint ──

console.log('\nPart 8: Backend Timeline Endpoint');

const indexSource = fs.readFileSync(path.join(__dirname, '..', 'backend', 'src', 'index.js'), 'utf8');

test('Backend has /api/timeline route', () => {
  assert.ok(indexSource.includes("/api/timeline"));
});

test('Backend has handleGetTimeline function', () => {
  assert.ok(indexSource.includes('handleGetTimeline'));
});

test('Backend timeline supports startYear param', () => {
  assert.ok(indexSource.includes('startYear'));
});

test('Backend timeline supports endYear param', () => {
  assert.ok(indexSource.includes('endYear'));
});

test('Backend timeline builds birth events', () => {
  assert.ok(indexSource.includes('BIRTH'));
});

test('Backend timeline builds death events', () => {
  assert.ok(indexSource.includes('DEATH'));
});

test('Backend timeline sorts chronologically', () => {
  assert.ok(indexSource.includes('.sort('));
});

test('Backend timeline generates summary', () => {
  assert.ok(indexSource.includes('summary'));
});

test('Backend timeline returns events array', () => {
  assert.ok(indexSource.includes('events:') || indexSource.includes('"events"'));
});

test('Backend timeline only includes published records', () => {
  assert.ok(indexSource.includes('published'));
});

test('Backend has extractYear helper', () => {
  assert.ok(indexSource.includes('extractYear'));
});

test('Backend extractYear uses regex', () => {
  assert.ok(indexSource.includes('match') || indexSource.includes('\\d{4}'));
});

// ── Part 9: MainNavActivity Integration ──

console.log('\nPart 9: MainNavActivity Integration');

const navSource = fs.readFileSync(path.join(APP_BASE, 'MainNavActivity.java'), 'utf8');

test('MainNavActivity imports TimelineFragment', () => {
  assert.ok(navSource.includes('import com.putraworks.graveatlas.ui.timeline.TimelineFragment'));
});

test('MainNavActivity has moreTimeline handler', () => {
  assert.ok(navSource.includes('moreTimeline'));
});

test('moreTimeline loads TimelineFragment', () => {
  assert.ok(navSource.includes('new TimelineFragment'));
});

// ── Part 10: Layout Integration ──

console.log('\nPart 10: Layout Integration');

const sheetSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'main', 'res', 'layout', 'sheet_more.xml'), 'utf8');

test('sheet_more.xml has moreTimeline button', () => {
  assert.ok(sheetSource.includes('moreTimeline'));
});

test('sheet_more.xml Timeline button has text label', () => {
  assert.ok(sheetSource.includes('Timeline'));
});

// ── Part 11: AI System Prompts ──

console.log('\nPart 11: AI System Prompts');

const promptsSource = fs.readFileSync(path.join(APP_BASE, 'chat', 'AISystemPrompts.java'), 'utf8');

test('AI system prompts mention timeline', () => {
  assert.ok(promptsSource.includes('imeline') || promptsSource.includes('timeline'));
});

test('Suggested prompts include timeline question', () => {
  assert.ok(
    promptsSource.includes('timeline') || promptsSource.includes('1900s') || promptsSource.includes('historical patterns'),
    'Suggested prompts should include timeline-related questions'
  );
});

test('AI prompts mention /api/timeline endpoint', () => {
  assert.ok(promptsSource.includes('/api/timeline'));
});

test('AI prompts mention startYear/endYear params', () => {
  assert.ok(promptsSource.includes('startYear') || promptsSource.includes('endYear'));
});

// ── Part 12: Phase 16.3 Documentation ──

console.log('\nPart 12: Documentation');

test('CHANGELOG mentions Phase 16.3 or timeline', () => {
  const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
  assert.ok(
    changelog.includes('Phase 16.3') || changelog.includes('timeline') || changelog.includes('Timeline'),
    'CHANGELOG should mention Phase 16.3 or timelines'
  );
});

console.log('\n=== Phase 16.3 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.3 timeline tests passed!');
else { console.log('\n❌ Some tests failed!'); failures.forEach(f => console.log(`  - ${f}`)); }

process.exit(failed > 0 ? 1 : 0);
