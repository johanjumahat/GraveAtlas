/**
 * Phase 5 Backend Tests — Global Discovery, Open-Data Import & Worldwide Expansion
 * Run: node tests/phase5.test.js
 */

const assert = require('assert');

// Import modules
const { getAllCountries, getCountryByCode, searchCountries, COUNTRY_COUNT } = require('../backend/src/countries.js');
const {
  verifyLicense, detectFormat, validateRecord, validateDataset,
  detectDuplicates, calculateDataQuality, validateTransition,
  createSourceRegistryEntry, generateImportReport, generateImportPreview,
  validateImportFile, MAX_IMPORT_SIZE, MAX_RECORDS
} = require('../backend/src/import-framework.js');

// ── Test runner ──

let passed = 0, failed = 0;
const groups = [];

function describe(name, fn) {
  groups.push({ name, fn });
}

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

// ── Country Directory Tests ──

describe('Country Directory', () => {
  test('all countries present (100+)', () => {
    assert.ok(COUNTRY_COUNT >= 100, `Expected at least 100, got ${COUNTRY_COUNT}`);
  });

  test('ISO codes are valid', () => {
    const countries = getAllCountries();
    for (const c of countries) {
      assert.ok(/^[A-Z]{2}$/.test(c.code), `Invalid ISO code: ${c.code} for ${c.name}`);
    }
  });

  test('local names present for major countries', () => {
    assert.strictEqual(getCountryByCode('JP').localName, '日本');
    assert.strictEqual(getCountryByCode('CN').localName, '中国');
  });

  test('search by English name', () => {
    const results = searchCountries('Germany');
    assert.ok(results.some(c => c.code === 'DE'));
  });

  test('search by local name (Unicode)', () => {
    const results = searchCountries('日本');
    assert.ok(results.some(c => c.code === 'JP'));
  });

  test('search by alternative name', () => {
    const results = searchCountries('Holland');
    assert.ok(results.some(c => c.code === 'NL'));
  });

  test('search by ISO code', () => {
    const results = searchCountries('SG');
    assert.ok(results.some(c => c.code === 'SG'));
  });
});

// ── License Verification Tests ──

describe('License Verification', () => {
  test('recognized licenses accepted', () => {
    for (const license of ['CC0', 'CC-BY', 'CC-BY-SA', 'ODbL', 'Public Domain']) {
      const result = verifyLicense(license);
      assert.ok(result.valid, `License ${license} should be valid`);
    }
  });

  test('unrecognized license rejected', () => {
    const result = verifyLicense('Some Random License');
    assert.ok(!result.valid);
    assert.strictEqual(result.action, 'LICENSE_REVIEW_REQUIRED');
  });

  test('no license rejected', () => {
    const result = verifyLicense(null);
    assert.ok(!result.valid);
    assert.strictEqual(result.action, 'LICENSE_REVIEW_REQUIRED');
  });

  test('attribution required for CC-BY', () => {
    const result = verifyLicense('CC-BY');
    assert.ok(result.valid);
    assert.ok(result.requiresAttribution);
  });

  test('attribution not required for CC0', () => {
    const result = verifyLicense('CC0');
    assert.ok(result.valid);
    assert.ok(!result.requiresAttribution);
  });
});

// ── Format Detection Tests ──

describe('Format Detection', () => {
  test('CSV detected', () => {
    assert.strictEqual(detectFormat('name,latitude,longitude\nTest,1.0,2.0', 'data.csv').format, 'csv');
  });

  test('JSON detected', () => {
    assert.strictEqual(detectFormat(JSON.stringify([{ name: 'Test' }]), 'data.json').format, 'json');
  });

  test('GeoJSON detected', () => {
    assert.strictEqual(detectFormat(JSON.stringify({ type: 'FeatureCollection', features: [] }), 'data.geojson').format, 'geojson');
  });

  test('XML detected', () => {
    assert.strictEqual(detectFormat('<records><record><name>Test</name></record></records>', 'data.xml').format, 'xml');
  });

  test('unsupported format rejected', () => {
    assert.ok(!detectFormat('random binary content', 'data.bin').format);
  });
});

// ── Import Validation Tests ──

describe('Import Validation', () => {
  test('valid record passes', () => {
    const result = validateRecord({ id: 'grave_test1234567890', name: 'John Doe', latitude: 1.35, longitude: 103.81 });
    assert.ok(result.valid);
    assert.strictEqual(result.errors.length, 0);
  });

  test('invalid coordinates rejected', () => {
    const result = validateRecord({ name: 'Test', latitude: 999, longitude: 999 });
    assert.ok(!result.valid);
    assert.ok(result.errors.some(e => e.includes('latitude')));
  });

  test('invalid dates generate warnings', () => {
    const result = validateRecord({ name: 'Test', birthDate: 'not-a-date' });
    assert.ok(result.warnings.length > 0);
  });

  test('missing name and id rejected', () => {
    const result = validateRecord({ latitude: 1.0, longitude: 2.0 });
    assert.ok(!result.valid);
  });

  test('oversized field rejected', () => {
    const result = validateRecord({ name: 'Test', notes: 'x'.repeat(6000) });
    assert.ok(!result.valid);
  });

  test('dataset validation — all valid', () => {
    const result = validateDataset([{ name: 'Test 1', latitude: 1.0, longitude: 2.0 }, { name: 'Test 2', latitude: 3.0, longitude: 4.0 }]);
    assert.ok(result.valid);
    assert.strictEqual(result.totalRecords, 2);
    assert.strictEqual(result.validRecords, 2);
  });

  test('dataset validation — mixed', () => {
    const result = validateDataset([{ name: 'Valid', latitude: 1.0, longitude: 2.0 }, { name: 'Invalid', latitude: 999 }]);
    assert.ok(!result.valid);
    assert.strictEqual(result.validRecords, 1);
    assert.strictEqual(result.invalidRecords, 1);
  });

  test('dataset validation — exceeds max records', () => {
    const result = validateDataset(new Array(MAX_RECORDS + 1).fill({ name: 'Test' }));
    assert.ok(!result.valid);
  });
});

// ── Duplicate Detection Tests ──

describe('Duplicate Detection', () => {
  test('exact duplicate detected', () => {
    const existing = [{ name: 'John Doe', cemetery: 'Test Cemetery', birthDate: '1950-01-01', deathDate: '2020-06-15', latitude: 1.35, longitude: 103.81, countryCode: 'SG' }];
    const imported = [{ name: 'John Doe', cemetery: 'Test Cemetery', birthDate: '1950-01-01', deathDate: '2020-06-15', latitude: 1.35, longitude: 103.81, countryCode: 'SG' }];
    const result = detectDuplicates(imported, existing);
    assert.strictEqual(result.results[0].classification, 'EXACT_DUPLICATE');
    assert.strictEqual(result.exactDuplicates, 1);
  });

  test('high confidence match detected', () => {
    const existing = [{ name: 'John Doe', cemetery: 'Test Cemetery', birthDate: '1950-01-01', deathDate: '2020-06-15', latitude: 1.35, longitude: 103.81, countryCode: 'SG' }];
    const imported = [{ name: 'John Doe', cemetery: 'Test Cemetery', birthDate: '1950-01-01', deathDate: '2020-06-15', latitude: 1.36, longitude: 103.82, countryCode: 'SG' }];
    const result = detectDuplicates(imported, existing);
    assert.ok(result.results[0].duplicateScore >= 0.5);
  });

  test('new record classified correctly', () => {
    const existing = [{ name: 'John Doe', cemetery: 'Test Cemetery', birthDate: '1950-01-01', deathDate: '2020-06-15' }];
    const imported = [{ name: 'Jane Smith', cemetery: 'Other Cemetery', birthDate: '1980-05-20', deathDate: '2023-03-10' }];
    const result = detectDuplicates(imported, existing);
    assert.strictEqual(result.results[0].classification, 'NEW_RECORD');
    assert.strictEqual(result.newRecords, 1);
  });

  test('coordinate proximity improves score', () => {
    const existing = [{ name: 'Test', latitude: 1.3521, longitude: 103.8198, cemetery: 'CCK' }];
    const closeResult = detectDuplicates([{ name: 'Test', latitude: 1.3522, longitude: 103.8199, cemetery: 'CCK' }], existing);
    const farResult = detectDuplicates([{ name: 'Test', latitude: 5.0, longitude: 100.0, cemetery: 'CCK' }], existing);
    assert.ok(closeResult.results[0].duplicateScore >= farResult.results[0].duplicateScore);
  });
});

// ── Data Quality Score Tests ──

describe('Data Quality Score', () => {
  test('perfect record gets high score', () => {
    const record = { name: 'Test', latitude: 1.0, longitude: 2.0, cemeteryId: 'cemetery_test', birthDate: '1950', deathDate: '2020', sourceRefs: ['source_test'], verificationStatus: 'verified' };
    const score = calculateDataQuality(record);
    assert.ok(score >= 8, `Score should be >= 8, got ${score}`);
  });

  test('minimal record gets low score', () => {
    const score = calculateDataQuality({ name: 'Test' });
    assert.ok(score < 3, `Score should be < 3, got ${score}`);
  });

  test('source quality adds bonus', () => {
    const record = { name: 'Test', sourceRefs: ['source_test'], verificationStatus: 'verified' };
    const without = calculateDataQuality(record);
    const withSource = calculateDataQuality(record, 'official_cemetery_source');
    assert.ok(withSource > without);
  });

  test('score never exceeds 10', () => {
    const record = { name: 'Test', latitude: 1.0, longitude: 2.0, cemeteryId: 'cemetery_test', birthDate: '1950', deathDate: '2020', sourceRefs: ['source_test', 'source_test2'], verificationStatus: 'verified' };
    const score = calculateDataQuality(record, 'official_cemetery_source');
    assert.ok(score <= 10);
  });
});

// ── Import Status Transition Tests ──

describe('Import Status Transitions', () => {
  test('valid transition accepted', () => {
    assert.ok(validateTransition('CREATED', 'LICENSE_REVIEW').valid);
    assert.ok(validateTransition('LICENSE_REVIEW', 'VALIDATING').valid);
    assert.ok(validateTransition('VALIDATING', 'DUPLICATE_CHECK').valid);
    assert.ok(validateTransition('PENDING_APPROVAL', 'APPROVED').valid);
    assert.ok(validateTransition('APPROVED', 'IMPORTING').valid);
    assert.ok(validateTransition('IMPORTING', 'COMPLETED').valid);
  });

  test('invalid transition rejected', () => {
    assert.ok(!validateTransition('CREATED', 'IMPORTING').valid);
    assert.ok(!validateTransition('COMPLETED', 'IMPORTING').valid);
    assert.ok(!validateTransition('REJECTED', 'APPROVED').valid);
  });

  test('terminal states reject all transitions', () => {
    assert.ok(!validateTransition('COMPLETED', 'REJECTED').valid);
    assert.ok(!validateTransition('ROLLED_BACK', 'APPROVED').valid);
  });
});

// ── Source Registry Tests ──

describe('Source Registry', () => {
  test('create valid entry', () => {
    const result = createSourceRegistryEntry({ sourceName: 'Test Source', license: 'CC-BY', organization: 'Test Org', sourceUrl: 'https://example.com' });
    assert.ok(result.valid);
    assert.ok(result.entry.sourceId.startsWith('source_'));
    assert.strictEqual(result.entry.license, 'CC-BY');
    assert.strictEqual(result.entry.status, 'PENDING_REVIEW');
  });

  test('missing license rejected', () => {
    const result = createSourceRegistryEntry({ sourceName: 'Test Source' });
    assert.ok(!result.valid);
    assert.strictEqual(result.status, 'LICENSE_REVIEW_REQUIRED');
  });
});

// ── Import Report Tests ──

describe('Import Report', () => {
  test('successful import report', () => {
    const report = generateImportReport({ importId: 'test-import-1', source: 'Test Source', recordsRead: 100, recordsValid: 100, recordsRejected: 0, duplicatesDetected: 0, recordsImported: 100, warnings: [], errors: [] });
    assert.ok(report.success);
    assert.strictEqual(report.recordsImported, 100);
  });

  test('partial failure report', () => {
    const report = generateImportReport({ importId: 'test-import-2', source: 'Test Source', recordsRead: 100, recordsValid: 80, recordsRejected: 20, duplicatesDetected: 5, recordsImported: 75, warnings: ['Some warnings'], errors: [] });
    assert.ok(report.partialSuccess);
    assert.strictEqual(report.recordsRejected, 20);
  });
});

// ── Import Preview Tests ──

describe('Import Preview', () => {
  test('preview summary generated', () => {
    const source = { sourceName: 'Test', license: 'CC0', datasetVersion: '1.0' };
    const dataset = { totalRecords: 10, records: [{ name: 'Test1' }, { name: 'Test2' }] };
    const validation = { validRecords: 8, invalidRecords: 2, warnings: [], errors: ['err'] };
    const duplicates = { exactDuplicates: 1, highConfidenceMatches: 0 };
    const preview = generateImportPreview(source, dataset, validation, duplicates);
    assert.strictEqual(preview.totalRecords, 10);
    assert.strictEqual(preview.estimatedFinalRecords, 7);
  });
});

// ── Import File Validation Tests ──

describe('Import File Validation', () => {
  test('valid CSV file accepted', () => {
    assert.ok(validateImportFile('data.csv', 1024, 'name,lat,lon\nTest,1,2').valid);
  });

  test('oversized file rejected', () => {
    assert.ok(!validateImportFile('data.csv', MAX_IMPORT_SIZE + 1, '').valid);
  });

  test('unsupported extension rejected', () => {
    assert.ok(!validateImportFile('data.exe', 1024, '').valid);
  });

  test('suspicious content rejected', () => {
    assert.ok(!validateImportFile('data.csv', 1024, '<script>alert(1)</script>').valid);
  });
});

// ── Unicode Search Tests ──

describe('Unicode Search', () => {
  test('non-Latin characters handled', () => {
    assert.ok(searchCountries('Россия').some(c => c.code === 'RU'));
  });

  test('Arabic characters handled', () => {
    assert.ok(searchCountries('مصر').some(c => c.code === 'EG'));
  });
});

// ── Run all tests ──

console.log('\n=== GraveAtlas Phase 5 Tests ===\n');
for (const group of groups) {
  const before = passed + failed;
  group.fn();
  const groupPassed = (passed + failed) - before;
  console.log(`  ${group.name}: ${groupPassed - (groupPassed - (passed - (passed - groupPassed)))} passed`);
}
console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) {
  process.exit(1);
}
console.log('\nAll Phase 5 tests passed! ✅');
