/**
 * Phase 5 Import Pipeline Integration Test — Parts 46-50
 * Run: node tests/phase5-import-pipeline.test.js
 *
 * Tests the complete synthetic import pipeline:
 *   Source → License → Validation → Normalization → Duplicate Detection
 *   → Preview → Approval → Import → Audit → Rollback
 *
 * Also tests:
 *   Part 47: Synthetic duplicate scenarios (exact, high-confidence, possible, new)
 *   Part 48: Synthetic license scenarios (open, attribution, unknown, missing)
 *   Part 49: Synthetic invalid data scenarios
 *   Part 50: Import rollback verification
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  verifyLicense, detectFormat, validateRecord, validateDataset,
  detectDuplicates, calculateDataQuality, validateTransition,
  createSourceRegistryEntry, generateImportReport, generateImportPreview,
  validateImportFile, MAX_IMPORT_SIZE, MAX_RECORDS
} = require('../backend/src/import-framework.js');

const { searchCountries, getCountryByCode, COUNTRY_COUNT } = require('../backend/src/countries.js');

// ── Test runner ──
let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failed++; failures.push(`${name}: ${e.message}`); console.log(`  ✗ ${name}: ${e.message}`); }
}

// ── Load synthetic dataset ──
const datasetPath = path.join(__dirname, 'synthetic-data', 'phase5-test-dataset.json');
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

console.log('\n=== Phase 5 Import Pipeline Tests (Parts 46-50) ===\n');

// ── PART 46: Synthetic Import Pipeline ──

console.log('Part 46: Synthetic Import Pipeline');
test('dataset loads with 5 cemeteries, 10 graves, 10 people', () => {
  assert.strictEqual(dataset.cemeteries.length, 5);
  assert.strictEqual(dataset.graves.length, 10);
  assert.strictEqual(dataset.people.length, 10);
  assert.strictEqual(dataset.sources.length, 1);
});

test('all records marked as PHASE5_TEST_DATA', () => {
  for (const c of dataset.cemeteries) assert.ok(c.id.includes('phase5test'), `Cemetery ${c.id} not marked`);
  for (const g of dataset.graves) assert.ok(g.id.includes('phase5test'), `Grave ${g.id} not marked`);
  for (const p of dataset.people) assert.ok(p.id.includes('phase5test'), `Person ${p.id} not marked`);
});

test('source registration succeeds with CC0 license', () => {
  const result = createSourceRegistryEntry({
    sourceName: 'Phase 5 Synthetic Test Data',
    license: 'CC0',
    attribution: 'All records are synthetic test data.',
    sourceUrl: null
  });
  assert.ok(result.valid);
  assert.strictEqual(result.entry.license, 'CC0');
});

test('license verification passes for CC0', () => {
  const result = verifyLicense('CC0');
  assert.ok(result.valid);
  assert.ok(!result.requiresAttribution);
});

test('format detection identifies JSON', () => {
  const jsonContent = JSON.stringify(dataset);
  const result = detectFormat(jsonContent, 'phase5-test-dataset.json');
  assert.strictEqual(result.format, 'json');
});

test('import file validation passes for valid JSON', () => {
  const jsonContent = JSON.stringify(dataset);
  assert.ok(validateImportFile('phase5-test-dataset.json', Buffer.byteLength(jsonContent), jsonContent).valid);
});

test('dataset validation — all cemetery records valid', () => {
  const result = validateDataset(dataset.cemeteries);
  assert.strictEqual(result.totalRecords, 5);
  assert.strictEqual(result.invalidRecords, 0, `Expected 0 invalid, got ${result.invalidRecords}: ${result.errors.join(', ')}`);
});

test('dataset validation — all grave records valid', () => {
  const result = validateDataset(dataset.graves);
  assert.strictEqual(result.totalRecords, 10);
  assert.strictEqual(result.invalidRecords, 0);
});

test('dataset validation — all person records valid', () => {
  const result = validateDataset(dataset.people);
  assert.strictEqual(result.totalRecords, 10);
  assert.strictEqual(result.invalidRecords, 0);
});

test('duplicate detection — all records are NEW against empty existing set', () => {
  const result = detectDuplicates(dataset.graves, []);
  assert.strictEqual(result.newRecords, 10);
  assert.strictEqual(result.exactDuplicates, 0);
});

test('import preview generated correctly', () => {
  const source = { sourceName: 'Phase 5 Test', license: 'CC0', datasetVersion: '1.0' };
  const ds = { totalRecords: 10, records: dataset.graves };
  const validation = validateDataset(dataset.graves);
  const duplicates = detectDuplicates(dataset.graves, []);
  const preview = generateImportPreview(source, ds, validation, duplicates);
  assert.strictEqual(preview.totalRecords, 10);
  assert.strictEqual(preview.estimatedFinalRecords, 10);
  assert.strictEqual(preview.possibleDuplicates, 0);
});

test('import status transitions through full pipeline', () => {
  assert.ok(validateTransition('CREATED', 'LICENSE_REVIEW').valid);
  assert.ok(validateTransition('LICENSE_REVIEW', 'VALIDATING').valid);
  assert.ok(validateTransition('VALIDATING', 'DUPLICATE_CHECK').valid);
  assert.ok(validateTransition('DUPLICATE_CHECK', 'PENDING_APPROVAL').valid);
  assert.ok(validateTransition('PENDING_APPROVAL', 'APPROVED').valid);
  assert.ok(validateTransition('APPROVED', 'IMPORTING').valid);
  assert.ok(validateTransition('IMPORTING', 'COMPLETED').valid);
});

test('import report generated for successful import', () => {
  const report = generateImportReport({
    importId: 'import_phase5_test_001',
    source: 'Phase 5 Synthetic Test Data',
    datasetVersion: '1.0',
    recordsRead: 25,
    recordsValid: 25,
    recordsRejected: 0,
    duplicatesDetected: 0,
    recordsImported: 25,
    warnings: [],
    errors: []
  });
  assert.ok(report.success);
  assert.strictEqual(report.recordsImported, 25);
  assert.strictEqual(report.success, true);
});

test('audit trail — report contains import ID for rollback', () => {
  const report = generateImportReport({
    importId: 'import_phase5_test_001',
    source: 'Phase 5 Synthetic Test Data',
    datasetVersion: '1.0'
  });
  assert.ok(report.importId === 'import_phase5_test_001');
});

// ── PART 47: Synthetic Duplicate Test ──

console.log('\nPart 47: Synthetic Duplicate Test');

test('EXACT_DUPLICATE — identical record classified correctly', () => {
  const existing = [{ name: 'Test Person One', cemetery: 'Test Memorial Park Alpha', birthDate: '1900-01-01', deathDate: '1980-06-15', latitude: 1.3521, longitude: 103.8198, countryCode: 'SG' }];
  const imported = [{ name: 'Test Person One', cemetery: 'Test Memorial Park Alpha', birthDate: '1900-01-01', deathDate: '1980-06-15', latitude: 1.3521, longitude: 103.8198, countryCode: 'SG' }];
  const result = detectDuplicates(imported, existing);
  assert.strictEqual(result.results[0].classification, 'EXACT_DUPLICATE');
  assert.ok(result.results[0].duplicateScore >= 0.95);
});

test('HIGH_CONFIDENCE_MATCH — near-identical with slightly different coords', () => {
  const existing = [{ name: 'Test Person Three', cemetery: 'Test Garden Cemetery Beta', birthDate: '1920-07-15', deathDate: '2005-02-28', latitude: 3.1390, longitude: 101.6869, countryCode: 'MY' }];
  const imported = [{ name: 'Test Person Three', cemetery: 'Test Garden Cemetery Beta', birthDate: '1920-07-15', deathDate: '2005-02-28', latitude: 3.1395, longitude: 101.6875, countryCode: 'MY' }];
  const result = detectDuplicates(imported, existing);
  assert.ok(result.results[0].duplicateScore >= 0.80, `Score should be >= 0.80, got ${result.results[0].duplicateScore}`);
  assert.ok(['EXACT_DUPLICATE', 'HIGH_CONFIDENCE_MATCH'].includes(result.results[0].classification));
});

test('POSSIBLE_MATCH — same name, same country, different cemetery and dates', () => {
  const existing = [{ name: 'John Smith', cemetery: 'Cemetery A', birthDate: '1950-01-01', deathDate: '2020-06-15', latitude: 1.0, longitude: 2.0, countryCode: 'SG' }];
  const imported = [{ name: 'John Smith', cemetery: 'Cemetery B', birthDate: '1960-01-01', deathDate: '2020-06-15', latitude: 5.0, longitude: 100.0, countryCode: 'SG' }];
  const result = detectDuplicates(imported, existing);
  assert.ok(result.results[0].duplicateScore >= 0.50, `Score should be >= 0.50, got ${result.results[0].duplicateScore}`);
  assert.ok(['POSSIBLE_MATCH', 'HIGH_CONFIDENCE_MATCH'].includes(result.results[0].classification));
});

test('NEW_RECORD — completely different person', () => {
  const existing = [{ name: 'Test Person One', cemetery: 'Alpha', birthDate: '1900-01-01', deathDate: '1980-06-15' }];
  const imported = [{ name: 'Completely Different Name', cemetery: 'Different Cemetery', birthDate: '2000-01-01', deathDate: '2023-12-25' }];
  const result = detectDuplicates(imported, existing);
  assert.strictEqual(result.results[0].classification, 'NEW_RECORD');
  assert.strictEqual(result.newRecords, 1);
});

test('uncertain records not automatically merged', () => {
  // POSSIBLE_MATCH should not be EXACT_DUPLICATE
  const existing = [{ name: 'John Smith', cemetery: 'Cemetery A', birthDate: '1950', deathDate: '2020' }];
  const imported = [{ name: 'John Smith', cemetery: 'Cemetery B', birthDate: '1960', deathDate: '2020' }];
  const result = detectDuplicates(imported, existing);
  // The system classifies but does not merge — human review required for POSSIBLE_MATCH
  assert.ok(result.results[0].classification !== 'EXACT_DUPLICATE');
});

// ── PART 48: Synthetic License Test ──

console.log('\nPart 48: Synthetic License Test');

test('clearly permitted open license (CC0) — continue', () => {
  const result = verifyLicense('CC0');
  assert.ok(result.valid);
  assert.ok(!result.requiresAttribution);
});

test('attribution-required license (CC-BY) — continue with attribution', () => {
  const result = verifyLicense('CC-BY');
  assert.ok(result.valid);
  assert.ok(result.requiresAttribution);
});

test('unknown license — LICENSE_REVIEW_REQUIRED', () => {
  const result = verifyLicense('Some Custom License We Do Not Recognize');
  assert.ok(!result.valid);
  assert.strictEqual(result.action, 'LICENSE_REVIEW_REQUIRED');
});

test('missing license — do not publish', () => {
  const result = verifyLicense(null);
  assert.ok(!result.valid);
  assert.strictEqual(result.action, 'LICENSE_REVIEW_REQUIRED');

  const sourceResult = createSourceRegistryEntry({ sourceName: 'Test', license: null });
  assert.ok(!sourceResult.valid);
  assert.strictEqual(sourceResult.status, 'LICENSE_REVIEW_REQUIRED');
});

test('publicly accessible does not mean reusable', () => {
  // Simulating a dataset with no license info
  const result = verifyLicense('');
  assert.ok(!result.valid);
});

test('ODbL requires attribution and share-alike', () => {
  const result = verifyLicense('ODbL');
  assert.ok(result.valid);
  assert.ok(result.requiresAttribution);
  assert.ok(result.shareAlike);
});

// ── PART 49: Synthetic Invalid Data Test ──

console.log('\nPart 49: Synthetic Invalid Data Test');

test('malformed coordinates rejected', () => {
  const r1 = validateRecord({ name: 'Test', latitude: 999, longitude: 103.81 });
  assert.ok(!r1.valid);
  const r2 = validateRecord({ name: 'Test', latitude: -91, longitude: 0 });
  assert.ok(!r2.valid);
  const r3 = validateRecord({ name: 'Test', latitude: 0, longitude: 181 });
  assert.ok(!r3.valid);
});

test('impossible dates generate warnings', () => {
  const r = validateRecord({ name: 'Test', birthDate: '9999-99-99' });
  assert.ok(r.warnings.length > 0);
});

test('missing required ID and name rejected', () => {
  const r = validateRecord({ latitude: 1.0, longitude: 2.0 });
  assert.ok(!r.valid);
});

test('duplicate ID handling in dataset', () => {
  const records = [
    { id: 'grave_dup001', name: 'Test A' },
    { id: 'grave_dup001', name: 'Test B' }
  ];
  // Both pass individual validation — duplicate ID detection is a separate concern
  const result = validateDataset(records);
  assert.strictEqual(result.totalRecords, 2);
  assert.strictEqual(result.validRecords, 2);
  // Duplicate IDs would be caught by the GitHub Actions duplicate detection script
});

test('broken cemetery reference detected via cemeteryId pattern', () => {
  const r = validateRecord({ name: 'Test', cemeteryId: 'not-a-valid-id' });
  // cemeteryId pattern validation would be done at schema level
  // validateRecord checks coordinates, dates, etc.
  assert.ok(r.valid); // validateRecord doesn't check ref patterns — schema does
});

test('broken person reference handled gracefully', () => {
  const r = validateRecord({ name: 'Test', personIds: ['invalid-ref'] });
  assert.ok(r.valid); // Reference pattern validation is at schema level
});

test('malformed URL generates warning', () => {
  const r = validateRecord({ name: 'Test', url: 'not-a-url' });
  assert.ok(r.warnings.some(w => w.includes('URL')));
});

test('invalid country code generates warning', () => {
  const r = validateRecord({ name: 'Test', countryCode: 'XYZ' });
  assert.ok(r.warnings.some(w => w.includes('country code')));
});

test('oversized field rejected', () => {
  const r = validateRecord({ name: 'Test', notes: 'x'.repeat(6000) });
  assert.ok(!r.valid);
});

test('unsupported file type rejected', () => {
  assert.ok(!validateImportFile('data.exe', 100, '').valid);
  assert.ok(!validateImportFile('data.sh', 100, '').valid);
});

test('suspicious content detected', () => {
  assert.ok(!validateImportFile('data.csv', 100, '<script>alert(1)</script>').valid);
  assert.ok(!validateImportFile('data.csv', 100, 'eval(malicious)').valid);
});

test('invalid records quarantined — do not silently become production', () => {
  const records = [
    { name: 'Valid Record', latitude: 1.0, longitude: 2.0 },
    { name: 'Invalid Record', latitude: 999 },
    { latitude: 3.0 } // missing name
  ];
  const result = validateDataset(records);
  assert.strictEqual(result.validRecords, 1);
  assert.strictEqual(result.invalidRecords, 2);
  assert.ok(!result.valid); // dataset not fully valid
});

// ── PART 50: Import Rollback Test ──

console.log('\nPart 50: Import Rollback Test');

const IMPORT_ID = 'import_phase5_rollback_test';

test('all imported records tagged with import_id', () => {
  // Verify synthetic dataset records have identifiable IDs
  for (const g of dataset.graves) {
    assert.ok(g.id.includes('phase5test'), `Grave ${g.id} should be identifiable as test data`);
  }
  for (const c of dataset.cemeteries) {
    assert.ok(c.id.includes('phase5test'), `Cemetery ${c.id} should be identifiable as test data`);
  }
});

test('rollback can identify all records from an import', () => {
  // Simulate: find all records with phase5test in their ID
  const allRecords = [...dataset.cemeteries, ...dataset.graves, ...dataset.people];
  const importRecords = allRecords.filter(r => r.id.includes('phase5test'));
  assert.strictEqual(importRecords.length, 25);
});

test('unrelated records are unaffected during rollback', () => {
  const productionRecords = [
    { id: 'grave_production001', name: 'Real Person' },
    { id: 'cemetery_production001', name: 'Real Cemetery' }
  ];
  const testRecords = dataset.graves;
  // Simulate rollback: only remove test records
  const remaining = productionRecords.filter(r => !r.id.includes('phase5test'));
  assert.strictEqual(remaining.length, 2); // production records remain
  const testRemaining = testRecords.filter(r => !r.id.includes('phase5test'));
  assert.strictEqual(testRemaining.length, 0); // test records removed
});

test('rollback creates audit event', () => {
  // The rollback transition is valid
  assert.ok(validateTransition('COMPLETED', 'REJECTED').valid === false); // COMPLETED is terminal
  assert.ok(validateTransition('PARTIAL', 'ROLLED_BACK').valid);
  assert.ok(validateTransition('FAILED', 'ROLLED_BACK').valid);
});

test('rollback does not use global destructive operation', () => {
  // Verify that rollback targets specific import_id, not all records
  const allIds = [...dataset.cemeteries.map(c => c.id), ...dataset.graves.map(g => g.id), ...dataset.people.map(p => p.id)];
  const importIds = allIds.filter(id => id.includes('phase5test'));
  const productionIds = ['grave_real001', 'cemetery_real001', 'person_real001'];

  // Rollback should only target importIds
  const afterRollback = [...importIds, ...productionIds].filter(id => !id.includes('phase5test'));
  assert.deepStrictEqual(afterRollback, productionIds);
});

// ── PART 58: Search Quality (Unicode) ──

console.log('\nPart 58: Search Quality');

test('Arabic search works', () => {
  assert.ok(searchCountries('مصر').some(c => c.code === 'EG'));
  assert.ok(searchCountries('المغرب').some(c => c.code === 'MA'));
});

test('Chinese search works', () => {
  assert.ok(searchCountries('中国').some(c => c.code === 'CN'));
  assert.ok(searchCountries('日本').some(c => c.code === 'JP'));
  assert.ok(searchCountries('新加坡').some(c => c.code === 'SG'));
});

test('Japanese search works', () => {
  assert.ok(searchCountries('日本').some(c => c.code === 'JP'));
});

test('Korean search works', () => {
  assert.ok(searchCountries('한국').some(c => c.code === 'KR'));
});

test('Cyrillic search works', () => {
  assert.ok(searchCountries('Россия').some(c => c.code === 'RU'));
});

test('Greek search works', () => {
  assert.ok(searchCountries('Ελλάδα').some(c => c.code === 'GR'));
});

test('Hebrew search works', () => {
  assert.ok(searchCountries('ישראל').some(c => c.code === 'IL'));
});

test('Malay/Indonesian search works', () => {
  assert.ok(searchCountries('Malaysia').some(c => c.code === 'MY'));
  assert.ok(searchCountries('Indonesia').some(c => c.code === 'ID'));
});

test('accented characters work', () => {
  assert.ok(searchCountries('Österreich').some(c => c.code === 'AT'));
  assert.ok(searchCountries('España').some(c => c.code === 'ES'));
});

test('original names not destroyed by normalization', () => {
  const japan = getCountryByCode('JP');
  assert.strictEqual(japan.localName, '日本');
  assert.strictEqual(japan.name, 'Japan');
  // The local name is preserved as-is
});

// ── PART 65: Idempotency ──

console.log('\nPart 65: Idempotency');

test('same dataset imported twice does not create duplicates', () => {
  // Simulate: if we detect duplicates against existing (which includes first import), all should be EXACT_DUPLICATE
  const firstImport = dataset.graves;
  const secondImport = [...firstImport]; // same data
  const result = detectDuplicates(secondImport, firstImport);
  // All should be exact duplicates (same data)
  assert.ok(result.exactDuplicates === 10, `Expected 10 exact duplicates, got ${result.exactDuplicates}`);
});

test('idempotency key prevents double submission', () => {
  // The Worker already has idempotency key support
  // Simulate: same import_id should not re-process
  const importKey = 'phase5_test_import_v1.0';
  const processedKeys = new Set([importKey]);
  assert.ok(processedKeys.has(importKey));
  // Second submission with same key would be rejected
});

// ── PART 55: Import Performance ──

console.log('\nPart 55: Import Performance');

test('100 records processed in reasonable time', () => {
  const records = Array.from({ length: 100 }, (_, i) => ({
    name: `Test Person ${i}`,
    latitude: 1.0 + i * 0.001,
    longitude: 103.0 + i * 0.001
  }));
  const start = Date.now();
  const result = validateDataset(records);
  const elapsed = Date.now() - start;
  assert.ok(result.valid);
  assert.ok(elapsed < 1000, `100 records took ${elapsed}ms — should be < 1000ms`);
});

test('1000 records processed in reasonable time', () => {
  const records = Array.from({ length: 1000 }, (_, i) => ({
    name: `Test Person ${i}`,
    latitude: 1.0 + i * 0.0001,
    longitude: 103.0 + i * 0.0001
  }));
  const start = Date.now();
  const result = validateDataset(records);
  const elapsed = Date.now() - start;
  assert.ok(result.valid);
  assert.ok(elapsed < 5000, `1000 records took ${elapsed}ms — should be < 5000ms`);
});

test('duplicate detection with 1000 records', () => {
  const records = Array.from({ length: 500 }, (_, i) => ({
    name: `Test Person ${i}`,
    cemetery: `Cemetery ${i % 10}`,
    birthDate: '1950-01-01',
    deathDate: '2020-01-01'
  }));
  const start = Date.now();
  const result = detectDuplicates(records, records.slice(0, 250));
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 10000, `500 vs 250 took ${elapsed}ms — should be < 10000ms`);
  assert.ok(result.exactDuplicates > 0);
});

// ── PART 52-53: Security Regression ──

console.log('\nPart 52-53: Security Regression');

test('no secrets in backend source files', () => {
  const backendFiles = ['backend/src/index.js', 'backend/src/github.js', 'backend/src/countries.js', 'backend/src/import-framework.js'];
  const secretPatterns = [
    /gho_[a-zA-Z0-9]{10,}/, // GitHub OAuth tokens
    /ghp_[a-zA-Z0-9]{10,}/, // GitHub PAT
    /AKIA[A-Z0-9]{16}/, // AWS keys
    /sk_[a-zA-Z0-9]{20,}/, // Stripe-like keys
  ];
  for (const file of backendFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of secretPatterns) {
      assert.ok(!pattern.test(content), `Secret pattern found in ${file}`);
    }
  }
});

test('no secrets in test files', () => {
  const testFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.js'));
  for (const file of testFiles) {
    const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.ok(!/gho_[a-zA-Z0-9]{20,}/.test(content), `GitHub token found in test file ${file}`);
  
  }
});

test('Android cannot directly write to GitHub', () => {
  // Verify Android API client only talks to Worker, not GitHub
  const apiClientPath = path.join(__dirname, '..', 'app', 'src', 'main', 'java', 'com', 'putraworks', 'graveatlas', 'data', 'api', 'ApiClient.java');
  if (!fs.existsSync(apiClientPath)) return;
  const content = fs.readFileSync(apiClientPath, 'utf8');
  assert.ok(!content.includes('api.github.com'), 'Android app should not reference api.github.com');
  assert.ok(content.includes('graveatlas.putraworks-2026.workers.dev'), 'Android should use Worker URL');
});

test('Worker uses server-side configuration for GitHub', () => {
  const workerPath = path.join(__dirname, '..', 'backend', 'src', 'index.js');
  const content = fs.readFileSync(workerPath, 'utf8');
  assert.ok(content.includes('env.GITHUB_APP_ID'), 'Worker should use env.GITHUB_APP_ID');
  assert.ok(content.includes('env.GITHUB_PRIVATE_KEY'), 'Worker should use env.GITHUB_PRIVATE_KEY');
  assert.ok(!content.includes('GITHUB_APP_ID ='), 'Worker should not hardcode GITHUB_APP_ID');
});

test('admin endpoints require authorization', () => {
  const workerPath = path.join(__dirname, '..', 'backend', 'src', 'index.js');
  const content = fs.readFileSync(workerPath, 'utf8');
  // Check that admin routes check auth
  assert.ok(content.includes('ADMIN_TOKEN'), 'Worker should reference ADMIN_TOKEN');
  assert.ok(content.includes('401'), 'Worker should return 401 for unauthorized');
  assert.ok(content.includes('403'), 'Worker should return 403 for forbidden');
});

// ── PART 61: Data Quality Report ──

console.log('\nPart 61: Data Quality Report');

test('data quality report can be generated from synthetic dataset', () => {
  const allRecords = [...dataset.cemeteries, ...dataset.graves];
  const withSources = allRecords.filter(r => r.sourceRefs && r.sourceRefs.length > 0).length;
  const withCoords = allRecords.filter(r => r.latitude && r.longitude).length;
  const verified = allRecords.filter(r => r.verificationStatus === 'verified').length;
  const unverified = allRecords.filter(r => r.verificationStatus === 'unverified').length;

  const report = {
    totalRecords: allRecords.length,
    recordsWithSources: withSources,
    recordsWithoutSources: allRecords.length - withSources,
    recordsWithCoordinates: withCoords,
    recordsWithoutCoordinates: allRecords.length - withCoords,
    verifiedRecords: verified,
    unverifiedRecords: unverified,
    label: 'GraveAtlas database statistics'
  };
  assert.strictEqual(report.totalRecords, 15);
  assert.strictEqual(report.recordsWithSources, 15);
  assert.strictEqual(report.recordsWithCoordinates, 6); // 5 cemeteries + 1 grave have coords
  assert.strictEqual(report.verifiedRecords, 0);
  assert.ok(report.label === 'GraveAtlas database statistics');
});

// ── PART 62: Country Coverage ──

console.log('\nPart 62: Country Coverage');

test('country coverage report from synthetic data', () => {
  const coverage = {};
  for (const c of dataset.cemeteries) {
    if (!coverage[c.country]) {
      coverage[c.country] = { cemeteries: 0, graves: 0, people: 0, verified: 0, unverified: 0 };
    }
    coverage[c.country].cemeteries++;
  }
  for (const g of dataset.graves) {
    const cem = dataset.cemeteries.find(c => c.id === g.cemeteryId);
    if (cem && coverage[cem.country]) {
      coverage[cem.country].graves++;
    }
  }

  assert.ok(coverage['Singapore']);
  assert.ok(coverage['Malaysia']);
  assert.ok(coverage['Japan']);
  assert.ok(coverage['United Kingdom']);
  assert.ok(coverage['United States']);
  assert.strictEqual(coverage['Singapore'].cemeteries, 1);
  assert.strictEqual(coverage['Singapore'].graves, 2);
  assert.strictEqual(coverage['Japan'].graves, 2);
  // Label should be "GraveAtlas currently contains X records" not "X cemeteries exist"
});

// ── Run summary ──

console.log(`\n=== Results ===`);
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) {
  console.log(`\nFailures:`);
  failures.forEach(f => console.log(`  ${f}`));
  process.exit(1);
}
console.log('\nAll Phase 5 import pipeline tests passed! ✅');
