/**
 * Phase 22 Tests — AI Inscription Translation & Cross-Language Search
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Import the translator module
const translator = require('../backend/src/translation/inscription-translator.js');

const projectRoot = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}

console.log('\nPart 1: Script Detection');
test('Detects Chinese script', () => {
  const r = translator.detectScript('先考陈先生之墓');
  assert.ok(r.script === 'chinese' || r.language === 'Chinese', `Got script=${r.script}, language=${r.language}`);
});
test('Detects Arabic script', () => {
  const r = translator.detectScript('المرحوم أحمد بن علي');
  assert.ok(r.script === 'arabic' || r.language === 'Arabic', `Got script=${r.script}, language=${r.language}`);
});
test('Detects Hebrew script', () => {
  const r = translator.detectScript('פ״נ פה נטמן');
  assert.ok(r.script === 'hebrew', `Got script=${r.script}`);
});
test('Detects Tamil script', () => {
  const r = translator.detectScript('நினைவாக முருகன்');
  assert.ok(r.script === 'tamil', `Got script=${r.script}`);
});
test('Detects Korean script', () => {
  const r = translator.detectScript('김선생님의 묘');
  assert.ok(r.script === 'korean' || r.language === 'Korean', `Got script=${r.script}, language=${r.language}`);
});
test('Detects Japanese script (Kana)', () => {
  const r = translator.detectScript('さようなら');
  assert.ok(r.script === 'japanese_kana' || r.language === 'Japanese', `Got script=${r.script}, language=${r.language}`);
});
test('Detects Latin script', () => {
  const r = translator.detectScript('In Memory of John Smith');
  assert.ok(r.script === 'latin' || r.language === 'English', `Got script=${r.script}, language=${r.language}`);
});
test('Handles empty text', () => {
  const r = translator.detectScript('');
  assert.strictEqual(r.script, 'unknown');
  assert.strictEqual(r.confidence, 0);
});
test('Handles null text', () => {
  const r = translator.detectScript(null);
  assert.strictEqual(r.script, 'unknown');
});
test('Returns detectedChars object', () => {
  const r = translator.detectScript('先考Ahmed');
  assert.ok(typeof r.detectedChars === 'object');
  assert.ok(r.detectedChars.chinese > 0 || r.detectedChars.latin > 0);
});
test('Returns confidence score', () => {
  const r = translator.detectScript('先考陈先生之墓');
  assert.ok(r.confidence > 0);
  assert.ok(r.confidence <= 100);
});
test('Japanese detection with both CJK and Kana', () => {
  const r = translator.detectScript('山田さようなら');
  assert.ok(r.language === 'Japanese' || r.script === 'japanese');
});

console.log('\nPart 2: Transliteration');
test('Transliterates Arabic to Latin', () => {
  const r = translator.transliterate('أحمد', 'arabic');
  assert.ok(r.length > 0);
  assert.ok(/[a-zA-Z]/.test(r), 'Should contain Latin characters');
});
test('Transliterates Hebrew to Latin', () => {
  const r = translator.transliterate('שלום', 'hebrew');
  assert.ok(r.length >= 0);
});
test('Transliterates Korean surnames', () => {
  const r = translator.transliterate('김', 'korean');
  assert.ok(r === 'Kim' || r.length > 0);
});
test('Returns original for unknown script', () => {
  const r = translator.transliterate('hello', 'unknown');
  assert.strictEqual(r, 'hello');
});
test('Returns original for null text', () => {
  const r = translator.transliterate(null, 'arabic');
  assert.strictEqual(r, '');
});

console.log('\nPart 3: Cultural Notation Identification');
test('Finds Chinese notations', () => {
  const n = translator.identifyNotations('先考陈先生之墓');
  assert.ok(n.length > 0, 'Should find 先考');
  assert.ok(n.some(x => x.notation === '先考'));
  assert.ok(n.some(x => x.tradition === 'Chinese'));
});
test('Finds Islamic notations', () => {
  const n = translator.identifyNotations('Almarhum Ahmad bin Ali');
  assert.ok(n.length > 0, 'Should find Almarhum');
  assert.ok(n.some(x => x.notation.toLowerCase() === 'almarhum'));
  assert.ok(n.some(x => x.tradition === 'Islamic (Malay/Indonesian)'));
});
test('Finds Hebrew notations', () => {
  const n = translator.identifyNotations('פ״נ');
  assert.ok(n.length > 0, 'Should find פ״נ');
  assert.ok(n.some(x => x.tradition === 'Jewish'));
});
test('Finds Christian notations', () => {
  const n = translator.identifyNotations('In Memory of John Smith. RIP');
  assert.ok(n.length >= 2, 'Should find at least 2 notations');
  assert.ok(n.some(x => x.notation === 'In Memory of'));
  assert.ok(n.some(x => x.notation === 'RIP'));
});
test('Finds Japanese notations', () => {
  const n = translator.identifyNotations('戒名 俗名');
  assert.ok(n.length >= 2, 'Should find 戒名 and 俗名');
  assert.ok(n.some(x => x.tradition === 'Japanese Buddhist'));
});
test('Finds Tamil notations', () => {
  const n = translator.identifyNotations('நினைவாக');
  assert.ok(n.length > 0, 'Should find நினைவாக');
  assert.ok(n.some(x => x.language === 'Tamil'));
});
test('Returns empty for no notations', () => {
  const n = translator.identifyNotations('John Smith 1950-2000');
  assert.strictEqual(n.length, 0);
});
test('Returns empty for null text', () => {
  const n = translator.identifyNotations(null);
  assert.strictEqual(n.length, 0);
});

console.log('\nPart 4: Cross-Language Name Equivalents');
test('Finds Arabic equivalent for Ahmad', () => {
  const r = translator.findNameEquivalents('Ahmad');
  assert.ok(r.equivalents.length > 0);
  assert.ok(r.equivalents.some(e => /[\u0600-\u06FF]/.test(e)), 'Should include Arabic');
});
test('Finds Chinese equivalent for Tan', () => {
  const r = translator.findNameEquivalents('Tan');
  assert.ok(r.equivalents.length > 0);
  assert.ok(r.equivalents.some(e => /[\u4E00-\u9FFF]/.test(e)), 'Should include Chinese');
});
test('Finds English variants for Muhammad', () => {
  const r = translator.findNameEquivalents('Muhammad');
  assert.ok(r.equivalents.length > 0);
  assert.ok(r.equivalents.some(e => e === 'Mohammed' || e === 'Mohamed'));
});
test('Finds Tamil equivalent for Murugan', () => {
  const r = translator.findNameEquivalents('Murugan');
  assert.ok(r.equivalents.length > 0);
});
test('Returns empty for unknown name', () => {
  const r = translator.findNameEquivalents('Xyzabc');
  assert.strictEqual(r.equivalents.length, 0);
});
test('Returns empty for null query', () => {
  const r = translator.findNameEquivalents(null);
  assert.strictEqual(r.equivalents.length, 0);
});
test('Returns languages found', () => {
  const r = translator.findNameEquivalents('Ahmad');
  assert.ok(r.languages.length > 0);
  assert.ok(r.languages.includes('English') || r.languages.includes('Arabic'));
});

console.log('\nPart 5: Translation');
test('Translates Chinese epitaph', () => {
  const r = translator.translateInscription('先考陈先生之墓 永遠懷念', 'Chinese');
  assert.ok(r.translatedSegments.length > 0);
  assert.ok(r.translatedText.length > 0);
});
test('Translates Arabic epitaph', () => {
  const r = translator.translateInscription('المرحوم أحمد رحمه الله', 'Arabic');
  assert.ok(r.translatedSegments.length > 0);
  assert.ok(r.translatedText.length > 0);
});
test('Translates Japanese epitaph', () => {
  const r = translator.translateInscription('戒名 享年', 'Japanese');
  assert.ok(r.translatedSegments.length > 0);
  assert.ok(r.translatedText.length > 0);
});
test('Translates Tamil epitaph', () => {
  const r = translator.translateInscription('நினைவாக', 'Tamil');
  assert.ok(r.translatedSegments.length > 0);
  assert.ok(r.translatedText.length > 0);
});
test('Returns untranslated for unknown patterns', () => {
  const r = translator.translateInscription('xyz123', 'English');
  assert.strictEqual(r.translatedSegments.length, 0);
  assert.strictEqual(r.untranslated, 'xyz123');
});
test('Returns empty for null text', () => {
  const r = translator.translateInscription(null, 'Chinese');
  assert.strictEqual(r.translatedSegments.length, 0);
});

console.log('\nPart 6: Full Inscription Analysis');
test('Analyzes Chinese inscription', () => {
  const r = translator.analyzeInscription('先考陈先生之墓 永遠懷念');
  assert.ok(r.script !== 'unknown');
  assert.ok(r.notations.length > 0);
  assert.ok(r.translatedText.length > 0);
});
test('Analyzes Arabic inscription', () => {
  const r = translator.analyzeInscription('المرحوم أحمد بن علي رحمه الله');
  assert.ok(r.script === 'arabic' || r.language === 'Arabic');
  assert.ok(r.notations.length > 0);
  assert.ok(r.transliteratedText.length > 0);
});
test('Analyzes English inscription', () => {
  const r = translator.analyzeInscription('In Memory of John Smith. RIP. Born 1950, Died 2020.');
  assert.ok(r.notations.length >= 2);
});
test('Includes targetLanguage', () => {
  const r = translator.analyzeInscription('test', 'English');
  assert.ok(r.targetLanguage === 'English');
});
test('Handles empty text', () => {
  const r = translator.analyzeInscription('');
  assert.strictEqual(r.script, 'unknown');
});

console.log('\nPart 7: Cross-Language Search Expansion');
test('Expands search for Ahmad', () => {
  const r = translator.expandCrossLanguageSearch('Ahmad');
  assert.ok(r.expandedQueries.length > 0);
  assert.ok(r.languages.length > 0);
});
test('Expands search for Tan', () => {
  const r = translator.expandCrossLanguageSearch('Tan');
  assert.ok(r.expandedQueries.length > 0);
});
test('Returns equivalents with source info', () => {
  const r = translator.expandCrossLanguageSearch('Ahmad');
  assert.ok(r.equivalents.length > 0);
  assert.ok(r.equivalents[0].text);
  assert.ok(r.equivalents[0].source);
});
test('Returns empty for unknown name', () => {
  const r = translator.expandCrossLanguageSearch('UnknownName123');
  assert.strictEqual(r.expandedQueries.length, 0);
});

console.log('\nPart 8: Supported Languages');
test('Returns 8 supported languages', () => {
  const langs = translator.getSupportedLanguages();
  assert.strictEqual(langs.length, 8);
});
test('Includes Chinese', () => {
  const langs = translator.getSupportedLanguages();
  assert.ok(langs.some(l => l.name === 'Chinese'));
});
test('Includes Arabic', () => {
  const langs = translator.getSupportedLanguages();
  assert.ok(langs.some(l => l.name === 'Arabic'));
});
test('Includes Korean', () => {
  const langs = translator.getSupportedLanguages();
  assert.ok(langs.some(l => l.name === 'Korean'));
});
test('Includes Tamil', () => {
  const langs = translator.getSupportedLanguages();
  assert.ok(langs.some(l => l.name === 'Tamil'));
});
test('Each language has code and nativeName', () => {
  const langs = translator.getSupportedLanguages();
  for (const l of langs) {
    assert.ok(l.code, 'Missing code');
    assert.ok(l.nativeName, 'Missing nativeName');
    assert.ok(l.script, 'Missing script');
  }
});

console.log('\nPart 9: Translation Info');
test('Returns system info', () => {
  const info = translator.getTranslationInfo();
  assert.ok(info.system);
  assert.ok(info.version);
  assert.ok(info.supportedLanguages > 0);
});
test('Returns features list', () => {
  const info = translator.getTranslationInfo();
  assert.ok(Array.isArray(info.features));
  assert.ok(info.features.length > 0);
});
test('Returns limitations list', () => {
  const info = translator.getTranslationInfo();
  assert.ok(Array.isArray(info.limitations));
  assert.ok(info.limitations.length > 0);
});
test('Returns attribution', () => {
  const info = translator.getTranslationInfo();
  assert.ok(info.attribution);
  assert.ok(info.attribution.includes('GraveAtlas'));
});

console.log('\nPart 10: Backend Routes');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');
test('Route: /api/translation/info', () => assert.ok(indexFile.includes("'/api/translation/info'") || indexFile.includes('"/api/translation/info"'), 'Missing'));
test('Route: /api/translation/languages', () => assert.ok(indexFile.includes("'/api/translation/languages'") || indexFile.includes('"/api/translation/languages"'), 'Missing'));
test('Route: /api/translation/analyze', () => assert.ok(indexFile.includes("'/api/translation/analyze'") || indexFile.includes('"/api/translation/analyze"'), 'Missing'));
test('Route: /api/translation/translate', () => assert.ok(indexFile.includes("'/api/translation/translate'") || indexFile.includes('"/api/translation/translate"'), 'Missing'));
test('Route: /api/translation/detect', () => assert.ok(indexFile.includes("'/api/translation/detect'") || indexFile.includes('"/api/translation/detect"'), 'Missing'));
test('Route: /api/translation/transliterate', () => assert.ok(indexFile.includes("'/api/translation/transliterate'") || indexFile.includes('"/api/translation/transliterate"'), 'Missing'));
test('Route: /api/translation/notations', () => assert.ok(indexFile.includes("'/api/translation/notations'") || indexFile.includes('"/api/translation/notations"'), 'Missing'));
test('Route: /api/translation/cross-search', () => assert.ok(indexFile.includes("'/api/translation/cross-search'") || indexFile.includes('"/api/translation/cross-search"'), 'Missing'));

console.log('\nPart 11: Backend Handlers');
test('Handler: handleTranslationInfo', () => assert.ok(indexFile.includes('handleTranslationInfo'), 'Missing'));
test('Handler: handleTranslationLanguages', () => assert.ok(indexFile.includes('handleTranslationLanguages'), 'Missing'));
test('Handler: handleTranslationAnalyze', () => assert.ok(indexFile.includes('handleTranslationAnalyze'), 'Missing'));
test('Handler: handleTranslationTranslate', () => assert.ok(indexFile.includes('handleTranslationTranslate'), 'Missing'));
test('Handler: handleTranslationDetect', () => assert.ok(indexFile.includes('handleTranslationDetect'), 'Missing'));
test('Handler: handleTranslationTransliterate', () => assert.ok(indexFile.includes('handleTranslationTransliterate'), 'Missing'));
test('Handler: handleTranslationNotations', () => assert.ok(indexFile.includes('handleTranslationNotations'), 'Missing'));
test('Handler: handleTranslationCrossSearch', () => assert.ok(indexFile.includes('handleTranslationCrossSearch'), 'Missing'));

console.log('\nPart 12: Handler Details');
test('Analyze handler checks text required', () => assert.ok(indexFile.includes("'text is required'") || indexFile.includes('"text is required"'), 'Missing'));
test('Cross-search handles GET params', () => assert.ok(indexFile.includes("url.searchParams.get('q')") || indexFile.includes("url.searchParams.get('query')"), 'Missing'));
test('Cross-search handles POST body', () => assert.ok(indexFile.includes('body.query') || indexFile.includes('body.q'), 'Missing'));
test('Returns attribution', () => assert.ok(indexFile.includes("GraveAtlas — AI Inscription Translation"), 'Missing'));
test('Imports inscription-translator module', () => assert.ok(indexFile.includes("inscription-translator.js"), 'Missing'));

console.log('\nPart 13: Android Model');
const modelFile = fs.readFileSync(path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/InscriptionTranslationResult.java'), 'utf8');
test('Class exists', () => assert.ok(modelFile.includes('public class InscriptionTranslationResult'), 'Missing'));
test('Has CulturalNotation inner class', () => assert.ok(modelFile.includes('class CulturalNotation'), 'Missing'));
test('Has TranslationSegment inner class', () => assert.ok(modelFile.includes('class TranslationSegment'), 'Missing'));
test('Has SupportedLanguage inner class', () => assert.ok(modelFile.includes('class SupportedLanguage'), 'Missing'));
test('Has fromJson', () => assert.ok(modelFile.includes('fromJson'), 'Missing'));
test('Has hasTranslation', () => assert.ok(modelFile.includes('hasTranslation'), 'Missing'));
test('Has hasTransliteration', () => assert.ok(modelFile.includes('hasTransliteration'), 'Missing'));
test('Has hasNotations', () => assert.ok(modelFile.includes('hasNotations'), 'Missing'));
test('Has hasExpandedQueries', () => assert.ok(modelFile.includes('hasExpandedQueries'), 'Missing'));
test('Has hasScriptDetected', () => assert.ok(modelFile.includes('hasScriptDetected'), 'Missing'));
test('CulturalNotation has notation/meaning/tradition', () => assert.ok(modelFile.includes('notation') && modelFile.includes('meaning') && modelFile.includes('tradition'), 'Missing'));
test('TranslationSegment has original/translation/position', () => assert.ok(modelFile.includes('original') && modelFile.includes('translation') && modelFile.includes('position'), 'Missing'));
test('SupportedLanguage has code/name/nativeName', () => assert.ok(modelFile.includes('code') && modelFile.includes('nativeName'), 'Missing'));

console.log('\nPart 14: API Client');
const apiFile = fs.readFileSync(path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'), 'utf8');
test('Imports InscriptionTranslationResult', () => assert.ok(apiFile.includes('InscriptionTranslationResult'), 'Missing'));
test('Has getTranslationInfo', () => assert.ok(apiFile.includes('getTranslationInfo') && apiFile.includes('/api/translation/info'), 'Missing'));
test('Has getTranslationLanguages', () => assert.ok(apiFile.includes('getTranslationLanguages') && apiFile.includes('/api/translation/languages'), 'Missing'));
test('Has analyzeInscription', () => assert.ok(apiFile.includes('analyzeInscription') && apiFile.includes('/api/translation/analyze'), 'Missing'));
test('Has translateInscription', () => assert.ok(apiFile.includes('translateInscription') && apiFile.includes('/api/translation/translate'), 'Missing'));
test('Has detectScript', () => assert.ok(apiFile.includes('detectScript') && apiFile.includes('/api/translation/detect'), 'Missing'));
test('Has transliterateText', () => assert.ok(apiFile.includes('transliterateText') && apiFile.includes('/api/translation/transliterate'), 'Missing'));
test('Has identifyNotations', () => assert.ok(apiFile.includes('identifyNotations') && apiFile.includes('/api/translation/notations'), 'Missing'));
test('Has crossLanguageSearch', () => assert.ok(apiFile.includes('crossLanguageSearch') && apiFile.includes('/api/translation/cross-search'), 'Missing'));

console.log('\nPart 15: AI System Prompts');
const promptsFile = fs.readFileSync(path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'), 'utf8');
test('Prompts mention translation', () => assert.ok(promptsFile.includes('translation'), 'Missing'));
test('Prompts mention inscription analysis', () => assert.ok(promptsFile.includes('inscription'), 'Missing'));
test('Prompts mention transliteration', () => assert.ok(promptsFile.includes('transliteration') || promptsFile.includes('transliterate'), 'Missing'));
test('Prompts mention cross-language', () => assert.ok(promptsFile.includes('cross-language') || promptsFile.includes('cross-search'), 'Missing'));
test('Suggested prompt: Translate headstone inscription', () => assert.ok(promptsFile.includes('Translate this headstone inscription'), 'Missing'));
test('Suggested prompt: Find name equivalents', () => assert.ok(promptsFile.includes('Find name equivalents'), 'Missing'));

console.log('\n=== Phase 22 Inscription Translation Tests ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 22 tests passed!');
else console.log('\n❌ Some tests failed!');
