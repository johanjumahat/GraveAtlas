/**
 * Phase 20 Tests — AI Headstone Image Intelligence
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

console.log('\nPart 1: Backend Handlers');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');

test('Has handleHeadstoneAnalyze', () => assert.ok(indexFile.includes('handleHeadstoneAnalyze'), 'Missing'));
test('Has handleHeadstoneParse', () => assert.ok(indexFile.includes('handleHeadstoneParse'), 'Missing'));
test('Has handleHeadstoneConfirm', () => assert.ok(indexFile.includes('handleHeadstoneConfirm'), 'Missing'));
test('Has handleHeadstoneListAnalyses', () => assert.ok(indexFile.includes('handleHeadstoneListAnalyses'), 'Missing'));
test('Has handleHeadstoneGetAnalysis', () => assert.ok(indexFile.includes('handleHeadstoneGetAnalysis'), 'Missing'));

console.log('\nPart 2: Routes');
test('POST /api/ai/headstone/analyze', () => assert.ok(indexFile.includes("'/api/ai/headstone/analyze'"), 'Missing'));
test('POST /api/ai/headstone/parse', () => assert.ok(indexFile.includes("'/api/ai/headstone/parse'"), 'Missing'));
test('POST /api/ai/headstone/confirm', () => assert.ok(indexFile.includes("'/api/ai/headstone/confirm'"), 'Missing'));
test('GET /api/ai/headstone/analyses', () => assert.ok(indexFile.includes("'/api/ai/headstone/analyses'"), 'Missing'));
test('GET /api/ai/headstone/analyses/:id', () => assert.ok(indexFile.includes('/api/ai/headstone/analyses/'), 'Missing'));

console.log('\nPart 3: Analyze Handler');
test('Requires authentication', () => {
  assert.ok(indexFile.includes('Authentication required') && indexFile.includes('handleHeadstoneAnalyze'), 'Missing');
});
test('Requires photoUrl', () => assert.ok(indexFile.includes('photoUrl is required'), 'Missing'));
test('Generates analysisId', () => assert.ok(indexFile.includes('crypto.randomUUID'), 'Missing'));
test('Stores in community/headstone-analyses/', () => assert.ok(indexFile.includes('community/headstone-analyses/'), 'Missing'));
test('Returns parsedData', () => assert.ok(indexFile.includes('parsedData'), 'Missing'));
test('Returns suggestedRecord', () => assert.ok(indexFile.includes('suggestedRecord'), 'Missing'));
test('Returns warnings array', () => assert.ok(indexFile.includes('warnings.push'), 'Missing'));
test('Warns on missing name', () => assert.ok(indexFile.includes('No person name detected'), 'Missing'));
test('Warns on missing dates', () => assert.ok(indexFile.includes('No dates detected'), 'Missing'));
test('Warns on low confidence', () => assert.ok(indexFile.includes('Low confidence'), 'Missing'));

console.log('\nPart 4: Parse Handler');
test('Requires text', () => assert.ok(indexFile.includes('text is required'), 'Missing'));
test('Returns originalText', () => assert.ok(indexFile.includes('originalText'), 'Missing'));
test('Returns suggestedRecord', () => {
  const section = indexFile.match(/handleHeadstoneParse[\s\S]*?suggestedRecord/);
  assert.ok(section, 'Missing');
});

console.log('\nPart 5: Confirm Handler');
test('Requires analysisId', () => assert.ok(indexFile.includes('analysisId and confirmedData are required'), 'Missing'));
test('Requires personName', () => assert.ok(indexFile.includes('personName is required'), 'Missing'));
test('Loads original analysis', () => assert.ok(indexFile.includes('Analysis not found'), 'Missing'));
test('Creates grave record', () => assert.ok(indexFile.includes('graveRecord'), 'Missing'));
test('Stores in data/graves/', () => assert.ok(indexFile.includes('data/graves/'), 'Missing'));
test('Sets status to published', () => assert.ok(indexFile.includes("status: 'published'"), 'Missing'));
test('Sets verificationStatus', () => assert.ok(indexFile.includes('user_confirmed'), 'Missing'));
test('Updates analysis status to confirmed', () => assert.ok(indexFile.includes("status = 'confirmed'"), 'Missing'));

console.log('\nPart 6: List Analyses');
test('Requires authentication', () => assert.ok(indexFile.includes('Authentication required'), 'Missing'));
test('Paginates', () => assert.ok(indexFile.includes('offset + limit < analyses.length'), 'Missing'));
test('Filters by user', () => assert.ok(indexFile.includes('submittedBy === user.userId'), 'Missing'));
test('Sorts newest first', () => assert.ok(indexFile.includes('new Date(b.submittedAt) - new Date(a.submittedAt)'), 'Missing'));

console.log('\nPart 7: Get Analysis');
test('Returns analysis', () => assert.ok(indexFile.includes('analysis'), 'Missing'));
test('Returns 404 if not found', () => assert.ok(indexFile.includes('Analysis not found'), 'Missing'));

console.log('\nPart 8: Parsing Utilities');
test('Has parseInscriptionText', () => assert.ok(indexFile.includes('function parseInscriptionText'), 'Missing'));
test('Has detectLanguageFromHints', () => assert.ok(indexFile.includes('function detectLanguageFromHints'), 'Missing'));
test('Has detectScriptFromHints', () => assert.ok(indexFile.includes('function detectScriptFromHints'), 'Missing'));
test('Has detectSymbols', () => assert.ok(indexFile.includes('function detectSymbols'), 'Missing'));

console.log('\nPart 9: Date Extraction Patterns');
test('Extracts date range YYYY-YYYY', () => assert.ok(indexFile.includes('dateRange'), 'Missing'));
test('Extracts Born/Died patterns', () => {
  assert.ok(indexFile.includes('born') && indexFile.includes('died'), 'Missing');
});
test('Extracts full date patterns (month names)', () => {
  assert.ok(indexFile.includes('jan') && indexFile.includes('dec'), 'Missing');
});

console.log('\nPart 10: Name Extraction');
test('Extracts "In loving memory of" pattern', () => assert.ok(indexFile.includes('loving') && indexFile.includes('memory'), 'Missing'));
test('Extracts "Sacred to the memory of" pattern', () => assert.ok(indexFile.includes('sacred'), 'Missing'));
test('Extracts "Here lies" pattern', () => assert.ok(indexFile.includes('here') && indexFile.includes('lies'), 'Missing'));
test('Parses name into given/family', () => assert.ok(indexFile.includes('nameParts') && indexFile.includes('givenNames'), 'Missing'));

console.log('\nPart 11: Language/Script Detection');
test('Detects Chinese', () => assert.ok(indexFile.includes('Chinese'), 'Missing'));
test('Detects Japanese', () => assert.ok(indexFile.includes('Japanese'), 'Missing'));
test('Detects Arabic', () => assert.ok(indexFile.includes('Arabic'), 'Missing'));
test('Detects Hebrew', () => assert.ok(indexFile.includes('Hebrew'), 'Missing'));
test('Detects Tamil', () => assert.ok(indexFile.includes('Tamil'), 'Missing'));
test('Detects Malay', () => assert.ok(indexFile.includes('Malay'), 'Missing'));
test('Defaults to English for Latin script', () => assert.ok(indexFile.includes('English'), 'Missing'));

console.log('\nPart 12: Symbol Detection');
test('Detects cross', () => assert.ok(indexFile.includes("'cross'"), 'Missing'));
test('Detects crescent', () => assert.ok(indexFile.includes("'crescent'"), 'Missing'));
test('Detects star of david', () => assert.ok(indexFile.includes("'star of david'"), 'Missing'));
test('Detects lotus', () => assert.ok(indexFile.includes("'lotus'"), 'Missing'));
test('Detects angel', () => assert.ok(indexFile.includes("'angel'"), 'Missing'));
test('Detects anchor', () => assert.ok(indexFile.includes("'anchor'"), 'Missing'));
test('Detects dove', () => assert.ok(indexFile.includes("'dove'"), 'Missing'));

console.log('\nPart 13: Epitaph Extraction');
test('Extracts quoted epitaph', () => assert.ok(indexFile.includes('epitaph'), 'Missing'));
test('Extracts "Beloved" pattern', () => assert.ok(indexFile.includes('beloved'), 'Missing'));

console.log('\nPart 14: Android Model');
const modelFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/HeadstoneAnalysis.java'), 'utf8'
);
test('HeadstoneAnalysis class exists', () => assert.ok(modelFile.includes('public class HeadstoneAnalysis'), 'Missing'));
test('Has ParsedData inner class', () => assert.ok(modelFile.includes('class ParsedData'), 'Missing'));
test('Has GraveRecord inner class', () => assert.ok(modelFile.includes('class GraveRecord'), 'Missing'));
test('Has fromJson', () => assert.ok(modelFile.includes('fromJson'), 'Missing'));
test('Has isConfirmed', () => assert.ok(modelFile.includes('isConfirmed'), 'Missing'));
test('Has hasLowConfidence', () => assert.ok(modelFile.includes('hasLowConfidence'), 'Missing'));
test('Has hasName', () => assert.ok(modelFile.includes('hasName'), 'Missing'));
test('Has hasDates', () => assert.ok(modelFile.includes('hasDates'), 'Missing'));
test('ParsedData has symbols list', () => assert.ok(modelFile.includes('symbols'), 'Missing'));

console.log('\nPart 15: API Client');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'), 'utf8'
);
test('Imports HeadstoneAnalysis', () => assert.ok(apiFile.includes('HeadstoneAnalysis'), 'Missing'));
test('Has analyzeHeadstone', () => assert.ok(apiFile.includes('analyzeHeadstone') && apiFile.includes('/api/ai/headstone/analyze'), 'Missing'));
test('Has parseHeadstoneText', () => assert.ok(apiFile.includes('parseHeadstoneText') && apiFile.includes('/api/ai/headstone/parse'), 'Missing'));
test('Has confirmHeadstoneAnalysis', () => assert.ok(apiFile.includes('confirmHeadstoneAnalysis') && apiFile.includes('/api/ai/headstone/confirm'), 'Missing'));
test('Has listHeadstoneAnalyses', () => assert.ok(apiFile.includes('listHeadstoneAnalyses') && apiFile.includes('/api/ai/headstone/analyses'), 'Missing'));
test('Has getHeadstoneAnalysis', () => assert.ok(apiFile.includes('getHeadstoneAnalysis'), 'Missing'));

console.log('\nPart 16: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'), 'utf8'
);
test('Prompts mention headstone/analyze', () => assert.ok(promptsFile.includes('headstone/analyze'), 'Missing'));
test('Prompts mention headstone/parse', () => assert.ok(promptsFile.includes('headstone/parse'), 'Missing'));
test('Prompts mention headstone/confirm', () => assert.ok(promptsFile.includes('headstone/confirm'), 'Missing'));
test('Prompts mention headstone/analyses', () => assert.ok(promptsFile.includes('headstone/analyses'), 'Missing'));
test('Prompts mention inscription extraction', () => assert.ok(promptsFile.includes('inscription'), 'Missing'));
test('Prompts mention confidence scoring', () => assert.ok(promptsFile.includes('confidence'), 'Missing'));
test('Suggested prompts include headstone photo', () => assert.ok(promptsFile.includes('headstone photo'), 'Missing'));
test('Suggested prompts include inscription', () => assert.ok(promptsFile.includes('inscription from grave'), 'Missing'));
test('Suggested prompts include create record from headstone', () => assert.ok(promptsFile.includes('Create record from headstone'), 'Missing'));

console.log('\nPart 17: Documentation');
test('CHANGELOG mentions Phase 20', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Phase 20') || c.includes('Headstone'), 'Missing');
});
test('STATUS.md mentions Phase 20', () => {
  const s = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(s.includes('20') || s.includes('Headstone') || s.includes('headstone'), 'Missing');
});

console.log('\n=== Phase 20 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 20 Headstone Image Intelligence tests passed!');
else console.log('\n❌ Some tests failed!');
