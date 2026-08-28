/**
 * Phase 21 Tests — AI Photo Quality Assessment & Enhancement
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

test('Has handlePhotoAssess', () => assert.ok(indexFile.includes('handlePhotoAssess'), 'Missing'));
test('Has handlePhotoEnhanceSuggest', () => assert.ok(indexFile.includes('handlePhotoEnhanceSuggest'), 'Missing'));
test('Has handlePhotoListAssessments', () => assert.ok(indexFile.includes('handlePhotoListAssessments'), 'Missing'));
test('Has handlePhotoBatchAssess', () => assert.ok(indexFile.includes('handlePhotoBatchAssess'), 'Missing'));
test('Has generateEnhancementSuggestions', () => assert.ok(indexFile.includes('generateEnhancementSuggestions'), 'Missing'));

console.log('\nPart 2: Routes');
test('POST /api/ai/photo/assess', () => assert.ok(indexFile.includes("'/api/ai/photo/assess'"), 'Missing'));
test('POST /api/ai/photo/enhance-suggest', () => assert.ok(indexFile.includes("'/api/ai/photo/enhance-suggest'"), 'Missing'));
test('GET /api/ai/photo/assessments', () => assert.ok(indexFile.includes("'/api/ai/photo/assessments'"), 'Missing'));
test('POST /api/ai/photo/batch-assess', () => assert.ok(indexFile.includes("'/api/ai/photo/batch-assess'"), 'Missing'));

console.log('\nPart 3: Assess Handler');
test('Requires authentication', () => assert.ok(indexFile.includes('Authentication required'), 'Missing'));
test('Requires photoUrl', () => assert.ok(indexFile.includes('photoUrl is required'), 'Missing'));
test('Generates assessmentId', () => assert.ok(indexFile.includes('assessmentId'), 'Missing'));
test('Stores in community/photo-assessments/', () => assert.ok(indexFile.includes('community/photo-assessments/'), 'Missing'));
test('Returns qualityScore', () => assert.ok(indexFile.includes('qualityScore'), 'Missing'));
test('Returns grade (A-F)', () => assert.ok(indexFile.includes("'A'") && indexFile.includes("'F'"), 'Missing'));
test('Returns ocrReadiness', () => assert.ok(indexFile.includes('ocrReadiness'), 'Missing'));
test('Returns issues array', () => assert.ok(indexFile.includes('issues.push'), 'Missing'));
test('Returns recommendations array', () => assert.ok(indexFile.includes('recommendations.push'), 'Missing'));
test('Returns strengths array', () => assert.ok(indexFile.includes('strengths.push'), 'Missing'));
test('Caps score at 100', () => assert.ok(indexFile.includes('Math.min(qualityScore, 100)'), 'Missing'));

console.log('\nPart 4: Quality Scoring Logic');
test('Resolution scoring (megapixels)', () => assert.ok(indexFile.includes('megapixels'), 'Missing'));
test('Brightness scoring (0-255)', () => assert.ok(indexFile.includes('brightness'), 'Missing'));
test('Contrast scoring', () => assert.ok(indexFile.includes('contrast'), 'Missing'));
test('Sharpness scoring (0-100)', () => assert.ok(indexFile.includes('sharpnessScore'), 'Missing'));
test('Noise level scoring', () => assert.ok(indexFile.includes('noiseLevel'), 'Missing'));
test('File size check', () => assert.ok(indexFile.includes('fileSize'), 'Missing'));
test('GPS data check', () => assert.ok(indexFile.includes('gpsLat'), 'Missing'));

console.log('\nPart 5: Photo Type Specific');
test('Headstone type recommendations', () => assert.ok(indexFile.includes('headstone'), 'Missing'));
test('Cemetery type recommendations', () => assert.ok(indexFile.includes('cemetery'), 'Missing'));
test('Straight-on capture tip', () => assert.ok(indexFile.includes('straight-on'), 'Missing'));

console.log('\nPart 6: Grade System');
test('Grade A (>=80)', () => assert.ok(indexFile.includes(">= 80) grade = 'A'"), 'Missing'));
test('Grade B (>=65)', () => assert.ok(indexFile.includes(">= 65) grade = 'B'"), 'Missing'));
test('Grade C (>=50)', () => assert.ok(indexFile.includes(">= 50) grade = 'C'"), 'Missing'));
test('Grade D (>=30)', () => assert.ok(indexFile.includes(">= 30) grade = 'D'"), 'Missing'));
test('Grade F (<30)', () => assert.ok(indexFile.includes("else grade = 'F'"), 'Missing'));

console.log('\nPart 7: OCR Readiness');
test('High readiness (>=70, no high issues)', () => assert.ok(indexFile.includes("ocrReadiness = 'high'"), 'Missing'));
test('Medium readiness (>=40)', () => assert.ok(indexFile.includes("ocrReadiness = 'medium'"), 'Missing'));
test('Low readiness (<40)', () => assert.ok(indexFile.includes("ocrReadiness = 'low'"), 'Missing'));

console.log('\nPart 8: Enhance Suggest Handler');
test('Requires photoUrl', () => assert.ok(indexFile.includes('photoUrl is required'), 'Missing'));
test('Returns suggestions', () => assert.ok(indexFile.includes('suggestions'), 'Missing'));
test('Returns priority (urgent/normal)', () => assert.ok(indexFile.includes('urgent') && indexFile.includes('normal'), 'Missing'));

console.log('\nPart 9: List Assessments');
test('Requires authentication', () => {
  const section = indexFile.match(/handlePhotoListAssessments[\s\S]*?Authentication required/);
  assert.ok(section, 'Missing');
});
test('Paginates', () => assert.ok(indexFile.includes('hasMore'), 'Missing'));
test('Filters by user', () => assert.ok(indexFile.includes('submittedBy'), 'Missing'));

console.log('\nPart 10: Batch Assess');
test('Requires photos array', () => assert.ok(indexFile.includes('photos array is required'), 'Missing'));
test('Rejects empty array', () => assert.ok(indexFile.includes('photos array is empty'), 'Missing'));
test('Max 20 photos', () => assert.ok(indexFile.includes('Maximum 20 photos per batch'), 'Missing'));
test('Returns averageScore', () => assert.ok(indexFile.includes('averageScore'), 'Missing'));
test('Returns per-photo results', () => assert.ok(indexFile.includes('results'), 'Missing'));

console.log('\nPart 11: Enhancement Suggestions');
test('Brightness increase suggestion', () => assert.ok(indexFile.includes('brightness_increase'), 'Missing'));
test('Brightness decrease suggestion', () => assert.ok(indexFile.includes('brightness_decrease'), 'Missing'));
test('Shadow recovery suggestion', () => assert.ok(indexFile.includes('shadow_recovery'), 'Missing'));
test('Highlight recovery suggestion', () => assert.ok(indexFile.includes('highlight_recovery'), 'Missing'));
test('Contrast increase suggestion', () => assert.ok(indexFile.includes('contrast_increase'), 'Missing'));
test('Local contrast suggestion', () => assert.ok(indexFile.includes('local_contrast'), 'Missing'));
test('Sharpen suggestion', () => assert.ok(indexFile.includes('sharpen'), 'Missing'));
test('Deblur suggestion', () => assert.ok(indexFile.includes('deblur'), 'Missing'));
test('Denoise suggestion', () => assert.ok(indexFile.includes('denoise'), 'Missing'));
test('Upscale suggestion', () => assert.ok(indexFile.includes('upscale'), 'Missing'));
test('Crop suggestion', () => assert.ok(indexFile.includes('crop_tight'), 'Missing'));
test('Straighten suggestion', () => assert.ok(indexFile.includes('straighten'), 'Missing'));
test('Suggestions have steps', () => assert.ok(indexFile.includes('step: 1'), 'Missing'));
test('Suggestions have tools', () => assert.ok(indexFile.includes('Snapseed') || indexFile.includes('Lightroom'), 'Missing'));
test('Suggestions have impact levels', () => assert.ok(indexFile.includes("'high'") && indexFile.includes("'medium'") && indexFile.includes("'low'"), 'Missing'));

console.log('\nPart 12: Android Model');
const modelFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/PhotoAssessment.java'), 'utf8'
);
test('PhotoAssessment class exists', () => assert.ok(modelFile.includes('public class PhotoAssessment'), 'Missing'));
test('Has Issue inner class', () => assert.ok(modelFile.includes('class Issue'), 'Missing'));
test('Has EnhancementSuggestion inner class', () => assert.ok(modelFile.includes('class EnhancementSuggestion'), 'Missing'));
test('Has fromJson', () => assert.ok(modelFile.includes('fromJson'), 'Missing'));
test('Has isHighQuality', () => assert.ok(modelFile.includes('isHighQuality'), 'Missing'));
test('Has isOcrReady', () => assert.ok(modelFile.includes('isOcrReady'), 'Missing'));
test('Has hasHighSeverityIssues', () => assert.ok(modelFile.includes('hasHighSeverityIssues'), 'Missing'));
test('Issue has severity/field/message', () => assert.ok(modelFile.includes('severity') && modelFile.includes('field') && modelFile.includes('message'), 'Missing'));
test('EnhancementSuggestion has step/action/tool/impact', () => assert.ok(modelFile.includes('action') && modelFile.includes('tool') && modelFile.includes('impact'), 'Missing'));

console.log('\nPart 13: API Client');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'), 'utf8'
);
test('Imports PhotoAssessment', () => assert.ok(apiFile.includes('PhotoAssessment'), 'Missing'));
test('Has assessPhoto', () => assert.ok(apiFile.includes('assessPhoto') && apiFile.includes('/api/ai/photo/assess'), 'Missing'));
test('Has getEnhancementSuggestions', () => assert.ok(apiFile.includes('getEnhancementSuggestions') && apiFile.includes('/api/ai/photo/enhance-suggest'), 'Missing'));
test('Has listPhotoAssessments', () => assert.ok(apiFile.includes('listPhotoAssessments') && apiFile.includes('/api/ai/photo/assessments'), 'Missing'));
test('Has batchAssessPhotos', () => assert.ok(apiFile.includes('batchAssessPhotos') && apiFile.includes('/api/ai/photo/batch-assess'), 'Missing'));

console.log('\nPart 14: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'), 'utf8'
);
test('Prompts mention photo/assess', () => assert.ok(promptsFile.includes('photo/assess'), 'Missing'));
test('Prompts mention enhance-suggest', () => assert.ok(promptsFile.includes('enhance-suggest'), 'Missing'));
test('Prompts mention photo/assessments', () => assert.ok(promptsFile.includes('photo/assessments'), 'Missing'));
test('Prompts mention batch-assess', () => assert.ok(promptsFile.includes('batch-assess'), 'Missing'));
test('Prompts mention quality score', () => assert.ok(promptsFile.includes('quality score'), 'Missing'));
test('Prompts mention OCR readiness', () => assert.ok(promptsFile.includes('OCR readiness'), 'Missing'));
test('Suggested prompts include photo quality', () => assert.ok(promptsFile.includes('photo quality'), 'Missing'));
test('Suggested prompts include batch assess', () => assert.ok(promptsFile.includes('Batch assess'), 'Missing'));
test('Suggested prompts include enhancement suggestions', () => assert.ok(promptsFile.includes('Enhancement suggestions'), 'Missing'));

console.log('\nPart 15: Documentation');
test('CHANGELOG mentions Phase 21', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Phase 21') || c.includes('Photo Quality'), 'Missing');
});

console.log('\n=== Phase 21 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 21 Photo Quality Assessment tests passed!');
else console.log('\n❌ Some tests failed!');
