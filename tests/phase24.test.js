/**
 * Phase 24 Tests — AI Memorial Story Generator
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const gen = require('../backend/src/memorial/story-generator.js');
const projectRoot = path.join(__dirname, '..');
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}

console.log('\nPart 1: Historical Context');
test('WWI context', () => {
  const c = gen.getHistoricalContext(1890, 1920);
  assert.ok(c.era === 'Pre-Modern' || c.era === 'Early Modern');
  assert.ok(c.historicalEvents.some(e => e.event.includes('World War I')));
});
test('WWII context', () => {
  const c = gen.getHistoricalContext(1920, 1950);
  assert.ok(c.historicalEvents.some(e => e.event.includes('World War II')));
});
test('Spanish Flu context', () => {
  const c = gen.getHistoricalContext(1900, 1925);
  assert.ok(c.historicalEvents.some(e => e.event.includes('Spanish Flu')));
});
test('Great Depression context', () => {
  const c = gen.getHistoricalContext(1925, 1940);
  assert.ok(c.historicalEvents.some(e => e.event.includes('Great Depression')));
});
test('COVID context', () => {
  const c = gen.getHistoricalContext(1950, 2021);
  assert.ok(c.historicalEvents.some(e => e.event.includes('COVID')));
});
test('Singapore Independence', () => {
  const c = gen.getHistoricalContext(1940, 1970);
  assert.ok(c.historicalEvents.some(e => e.event.includes('Singapore Independence')));
});
test('Japanese Occupation', () => {
  const c = gen.getHistoricalContext(1920, 1943);
  assert.ok(c.historicalEvents.some(e => e.event.includes('Japanese Occupation')));
});
test('Vietnam War era', () => {
  const c = gen.getHistoricalContext(1945, 1970);
  assert.ok(c.historicalEvents.some(e => e.event.includes('Vietnam')));
});
test('Contemporary era', () => {
  const c = gen.getHistoricalContext(1990, 2020);
  assert.strictEqual(c.era, 'Contemporary');
});
test('Modern era', () => {
  const c = gen.getHistoricalContext(1950, 1990);
  assert.strictEqual(c.era, 'Modern');
});
test('Early Modern era', () => {
  const c = gen.getHistoricalContext(1910, 1940);
  assert.strictEqual(c.era, 'Early Modern');
});
test('Pre-Modern era', () => {
  const c = gen.getHistoricalContext(1850, 1890);
  assert.strictEqual(c.era, 'Pre-Modern');
});
test('Returns lifespan', () => {
  const c = gen.getHistoricalContext(1950, 2020);
  assert.strictEqual(c.lifespan, 70);
});
test('Returns cultural notes', () => {
  const c = gen.getHistoricalContext(1950, 2020);
  assert.ok(c.culturalNotes.length > 0);
});
test('Returns burial practices', () => {
  const c = gen.getHistoricalContext(1950, 2020);
  assert.ok(c.burialPractices.length > 0);
});
test('Returns null for no years', () => {
  const c = gen.getHistoricalContext(null, null);
  assert.strictEqual(c, null);
});
test('Handles only birth year', () => {
  const c = gen.getHistoricalContext(1950, null);
  assert.ok(c.era === 'Modern' || c.era === 'Contemporary');
  assert.strictEqual(c.lifespan, null);
});

console.log('\nPart 2: Memorial Story Generation');
const sampleRecord = {
  id: 'r1',
  name: 'Tan Ah Kow',
  birthDate: '1930-01-15',
  deathDate: '2010-06-20',
  cemeteryName: 'Choa Chu Kang Cemetery',
  section: 'A',
  plot: 'A-001',
  inscription: 'In loving memory of a devoted father',
};
test('Generates story', () => {
  const s = gen.generateMemorialStory(sampleRecord);
  assert.ok(s.title);
  assert.ok(s.fullText);
  assert.ok(s.sections.length > 0);
});
test('Story title includes name', () => {
  const s = gen.generateMemorialStory(sampleRecord);
  assert.ok(s.title.includes('Tan Ah Kow'));
});
test('Story has introduction section', () => {
  const s = gen.generateMemorialStory(sampleRecord);
  assert.ok(s.sections.some(sec => sec.title === 'Remembering'));
});
test('Story has historical context section', () => {
  const s = gen.generateMemorialStory(sampleRecord);
  assert.ok(s.sections.some(sec => sec.title === 'Historical Context'));
});
test('Story has inscription section', () => {
  const s = gen.generateMemorialStory(sampleRecord);
  assert.ok(s.sections.some(sec => sec.title === 'Inscription'));
});
test('Story has resting place section', () => {
  const s = gen.generateMemorialStory(sampleRecord);
  assert.ok(s.sections.some(sec => sec.title === 'Resting Place'));
});
test('Story has closing section', () => {
  const s = gen.generateMemorialStory(sampleRecord);
  assert.ok(s.sections.some(sec => sec.title === 'In Remembrance'));
});
test('Story has metadata', () => {
  const s = gen.generateMemorialStory(sampleRecord);
  assert.ok(s.metadata);
  assert.strictEqual(s.metadata.name, 'Tan Ah Kow');
  assert.strictEqual(s.metadata.birthYear, 1930);
  assert.strictEqual(s.metadata.deathYear, 2010);
  assert.ok(s.metadata.wordCount > 0);
  assert.ok(s.metadata.sectionsGenerated > 0);
});
test('Story has attribution', () => {
  const s = gen.generateMemorialStory(sampleRecord);
  assert.ok(s.attribution.includes('GraveAtlas'));
});
test('Story includes inscription text', () => {
  const s = gen.generateMemorialStory(sampleRecord);
  assert.ok(s.fullText.includes('devoted father'));
});
test('Story includes cemetery name', () => {
  const s = gen.generateMemorialStory(sampleRecord);
  assert.ok(s.fullText.includes('Choa Chu Kang'));
});
test('Story includes lifespan age', () => {
  const s = gen.generateMemorialStory(sampleRecord);
  assert.ok(s.fullText.includes('80'));
});
test('Handles minimal record', () => {
  const s = gen.generateMemorialStory({ id: 'r1', name: 'Unknown' });
  assert.ok(s.fullText.length > 0);
});
test('Handles null record', () => {
  const s = gen.generateMemorialStory(null);
  assert.ok(s.error);
});
test('Handles record with no dates', () => {
  const s = gen.generateMemorialStory({ id: 'r2', name: 'Jane Doe', inscription: 'RIP' });
  assert.ok(s.fullText.includes('Jane Doe'));
  assert.ok(s.fullText.includes('RIP'));
});

console.log('\nPart 3: Enrichment Integration');
test('Uses translation enrichment', () => {
  const s = gen.generateMemorialStory(sampleRecord, {
    translation: { translatedText: 'Translated text', sourceLanguage: 'Chinese', notations: [{ notation: '先考', meaning: 'Deceased father' }] },
  });
  assert.ok(s.fullText.includes('Translated text'));
  assert.ok(s.metadata.enrichmentUsed.includes('translation'));
});
test('Uses family tree enrichment', () => {
  const s = gen.generateMemorialStory(sampleRecord, {
    familyTree: {
      edges: [{ type: 'spouse', personA: 'r1', personB: 'r2', confidence: 85, reasons: ['same surname'] }],
    },
  });
  assert.ok(s.fullText.includes('connected'));
  assert.ok(s.metadata.enrichmentUsed.includes('familyTree'));
});
test('Uses photo analysis enrichment', () => {
  const s = gen.generateMemorialStory(sampleRecord, {
    photoAnalysis: { qualityScore: 75, ocrText: 'OCR text here', issues: ['worn surface'] },
  });
  assert.ok(s.fullText.includes('75'));
  assert.ok(s.metadata.enrichmentUsed.includes('photoAnalysis'));
});

console.log('\nPart 4: Batch Generation');
const batchRecords = [
  { id: 'r1', name: 'Person A', birthDate: '1950', deathDate: '2020' },
  { id: 'r2', name: 'Person B', birthDate: '1940', deathDate: '2005' },
  { id: 'r3', name: 'Person C', birthDate: '1960', deathDate: '2015' },
];
test('Generates batch stories', () => {
  const r = gen.generateBatchStories(batchRecords);
  assert.strictEqual(r.totalGenerated, 3);
  assert.strictEqual(r.totalErrors, 0);
});
test('Returns previews', () => {
  const r = gen.generateBatchStories(batchRecords);
  assert.ok(r.stories[0].preview.length > 0);
});
test('Returns titles', () => {
  const r = gen.generateBatchStories(batchRecords);
  assert.ok(r.stories[0].title.includes('Person A'));
});
test('Respects maxRecords', () => {
  const r = gen.generateBatchStories(batchRecords, { maxRecords: 2 });
  assert.strictEqual(r.totalGenerated, 2);
});
test('Handles empty records', () => {
  const r = gen.generateBatchStories([]);
  assert.strictEqual(r.totalGenerated, 0);
});
test('Handles null records', () => {
  const r = gen.generateBatchStories(null);
  assert.strictEqual(r.totalGenerated, 0);
});
test('Returns attribution', () => {
  const r = gen.generateBatchStories(batchRecords);
  assert.ok(r.attribution.includes('GraveAtlas'));
});

console.log('\nPart 5: Story Info');
test('Returns system info', () => {
  const info = gen.getStoryInfo();
  assert.ok(info.system);
  assert.ok(info.version);
});
test('Returns story sections list', () => {
  const info = gen.getStoryInfo();
  assert.ok(info.storySections.length >= 7);
});
test('Returns historical events', () => {
  const info = gen.getStoryInfo();
  assert.ok(info.historicalEvents.length >= 5);
});
test('Returns features', () => {
  const info = gen.getStoryInfo();
  assert.ok(info.features.length > 0);
});
test('Returns limitations', () => {
  const info = gen.getStoryInfo();
  assert.ok(info.limitations.length > 0);
});
test('Returns enrichment integrations', () => {
  const info = gen.getStoryInfo();
  assert.ok(info.enrichmentIntegrations.includes('Phase 22: Inscription Translation'));
  assert.ok(info.enrichmentIntegrations.includes('Phase 23: Family Tree Builder'));
});
test('Returns attribution', () => {
  const info = gen.getStoryInfo();
  assert.ok(info.attribution.includes('GraveAtlas'));
});

console.log('\nPart 6: Backend Routes & Handlers');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');
['info', 'generate', 'batch', 'history'].forEach(route => {
  test(`Route: /api/memorial/${route}`, () => assert.ok(indexFile.includes(`/api/memorial/${route}`), `Missing route ${route}`));
});
['handleStoryInfo', 'handleStoryGenerate', 'handleStoryBatch', 'handleStoryHistory'].forEach(h => {
  test(`Handler: ${h}`, () => assert.ok(indexFile.includes(h), `Missing ${h}`));
});
test('Imports story-generator module', () => assert.ok(indexFile.includes('story-generator.js'), 'Missing'));
test('Generate validates record', () => assert.ok(indexFile.includes('record is required'), 'Missing'));
test('Batch validates records', () => assert.ok(indexFile.includes('records array is required'), 'Missing'));
test('History validates years', () => assert.ok(indexFile.includes('birthYear or deathYear is required'), 'Missing'));
test('Returns attribution', () => assert.ok(indexFile.includes('GraveAtlas — AI Memorial Story Generator'), 'Missing'));

console.log('\nPart 7: Android Model');
const modelFile = fs.readFileSync(path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/MemorialStoryResult.java'), 'utf8');
test('Class exists', () => assert.ok(modelFile.includes('public class MemorialStoryResult')));
test('Has StorySection inner class', () => assert.ok(modelFile.includes('class StorySection')));
test('Has StoryMetadata inner class', () => assert.ok(modelFile.includes('class StoryMetadata')));
test('Has fromJson', () => assert.ok(modelFile.includes('fromJson')));
test('Has hasSections', () => assert.ok(modelFile.includes('hasSections')));
test('StorySection has title and text', () => assert.ok(modelFile.includes('title') && modelFile.includes('text')));
test('StoryMetadata has wordCount and sectionsGenerated', () => assert.ok(modelFile.includes('wordCount') && modelFile.includes('sectionsGenerated')));

console.log('\nPart 8: API Client');
const apiFile = fs.readFileSync(path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'), 'utf8');
test('Imports MemorialStoryResult', () => assert.ok(apiFile.includes('MemorialStoryResult')));
test('Has getMemorialStoryInfo', () => assert.ok(apiFile.includes('getMemorialStoryInfo') && apiFile.includes('/api/memorial/info')));
test('Has generateMemorialStory', () => assert.ok(apiFile.includes('generateMemorialStory') && apiFile.includes('/api/memorial/generate')));
test('Has generateBatchStories', () => assert.ok(apiFile.includes('generateBatchStories') && apiFile.includes('/api/memorial/batch')));
test('Has getHistoricalContext', () => assert.ok(apiFile.includes('getHistoricalContext') && apiFile.includes('/api/memorial/history')));

console.log('\n=== Phase 24 Memorial Story Tests ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 24 tests passed!');
else console.log('\n❌ Some tests failed!');
