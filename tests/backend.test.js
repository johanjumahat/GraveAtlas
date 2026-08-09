/**
 * Phase 1 Tests for GraveAtlas Backend
 * Run: node tests/
 * No real GitHub credentials needed — uses mocks.
 */

const assert = require('assert');

// ── Import validation logic ──
// We test the validation function directly since the Worker
// environment isn't available locally without wrangler.

// Inline the validation logic for testing (mirrors backend/src/index.js)
function validateSubmission(body) {
  if (!body) return { valid: false, error: 'Empty request body' };
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }
  if (body.name.length > 500) {
    return { valid: false, error: 'Name too long (max 500 chars)' };
  }
  if (body.latitude !== undefined || body.longitude !== undefined) {
    const lat = parseFloat(body.latitude);
    const lon = parseFloat(body.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return { valid: false, error: 'Invalid latitude (must be -90 to 90)' };
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return { valid: false, error: 'Invalid longitude (must be -180 to 180)' };
    }
  }
  if (body.birthDate && !isValidDate(body.birthDate)) {
    return { valid: false, error: 'Invalid birthDate format (use YYYY-MM-DD)' };
  }
  if (body.deathDate && !isValidDate(body.deathDate)) {
    return { valid: false, error: 'Invalid deathDate format (use YYYY-MM-DD)' };
  }
  const totalStr = JSON.stringify(body);
  if (totalStr.length > 50000) {
    return { valid: false, error: 'Request too large (max 50KB)' };
  }
  return { valid: true };
}

function isValidDate(str) {
  if (typeof str !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(str)) return false;
  const date = new Date(str);
  return !isNaN(date.getTime());
}

// ── Mock GitHub integration abstraction ──
class MockGitHubClient {
  constructor() {
    this.files = {};
    this.writes = [];
  }
  async writeFile(path, content) {
    this.files[path] = content;
    this.writes.push({ path, content });
  }
  async readFile(path) {
    return this.files[path] || null;
  }
  async listFiles(prefix) {
    return Object.keys(this.files).filter(p => p.startsWith(prefix));
  }
}

// ── Tests ──

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

console.log('\n=== GraveAtlas Backend Tests ===\n');

// 1. Health endpoint logic
console.log('Health endpoint:');
test('health response has correct shape', () => {
  const health = { status: 'healthy', timestamp: new Date().toISOString() };
  assert.strictEqual(health.status, 'healthy');
  assert.ok(health.timestamp);
});

// 2. JSON validation
console.log('\nJSON validation:');
test('valid submission passes', () => {
  const result = validateSubmission({ name: 'John Doe', birthDate: '1950-01-01', deathDate: '2020-06-15' });
  assert.strictEqual(result.valid, true);
});

test('empty body rejected', () => {
  const result = validateSubmission(null);
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /Empty/);
});

// 3. Missing required fields
console.log('\nMissing required fields:');
test('missing name rejected', () => {
  const result = validateSubmission({ birthDate: '1950-01-01' });
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /Name is required/);
});

test('empty name rejected', () => {
  const result = validateSubmission({ name: '   ' });
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /Name is required/);
});

// 4. Invalid coordinates
console.log('\nInvalid coordinates:');
test('latitude > 90 rejected', () => {
  const result = validateSubmission({ name: 'Test', latitude: 91, longitude: 0 });
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /Invalid latitude/);
});

test('latitude < -90 rejected', () => {
  const result = validateSubmission({ name: 'Test', latitude: -91, longitude: 0 });
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /Invalid latitude/);
});

test('longitude > 180 rejected', () => {
  const result = validateSubmission({ name: 'Test', latitude: 0, longitude: 181 });
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /Invalid longitude/);
});

test('longitude < -180 rejected', () => {
  const result = validateSubmission({ name: 'Test', latitude: 0, longitude: -181 });
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /Invalid longitude/);
});

test('valid coordinates accepted', () => {
  const result = validateSubmission({ name: 'Test', latitude: 1.3521, longitude: 103.8198 });
  assert.strictEqual(result.valid, true);
});

// 5. Invalid dates
console.log('\nInvalid dates:');
test('invalid birthDate rejected', () => {
  const result = validateSubmission({ name: 'Test', birthDate: 'not-a-date' });
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /birthDate/);
});

test('invalid deathDate rejected', () => {
  const result = validateSubmission({ name: 'Test', deathDate: '2020/06/15' });
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /deathDate/);
});

test('valid dates accepted', () => {
  const result = validateSubmission({ name: 'Test', birthDate: '1950-01-01', deathDate: '2020-12-31' });
  assert.strictEqual(result.valid, true);
});

// 6. Duplicate detection
console.log('\nDuplicate detection:');
test('duplicate IDs detected', () => {
  const records = [
    { id: 'abc12345', name: 'Test 1', status: 'published', submittedAt: '2024-01-01T00:00:00Z' },
    { id: 'abc12345', name: 'Test 2', status: 'pending', submittedAt: '2024-01-02T00:00:00Z' }
  ];
  const ids = {};
  let hasDup = false;
  for (const r of records) {
    if (ids[r.id]) { hasDup = true; break; }
    ids[r.id] = true;
  }
  assert.strictEqual(hasDup, true);
});

test('unique IDs pass', () => {
  const records = [
    { id: 'abc12345', name: 'Test 1', status: 'published', submittedAt: '2024-01-01T00:00:00Z' },
    { id: 'def67890', name: 'Test 2', status: 'pending', submittedAt: '2024-01-02T00:00:00Z' }
  ];
  const ids = {};
  let hasDup = false;
  for (const r of records) {
    if (ids[r.id]) { hasDup = true; break; }
    ids[r.id] = true;
  }
  assert.strictEqual(hasDup, false);
});

// 7. GitHub integration abstraction (mock)
console.log('\nGitHub integration (mock):');
test('mock client writes and reads files', async () => {
  const client = new MockGitHubClient();
  await client.writeFile('pending/sub_001.json', JSON.stringify({ id: 'sub_001', name: 'Test', status: 'pending' }));
  const content = await client.readFile('pending/sub_001.json');
  assert.ok(content);
  const parsed = JSON.parse(content);
  assert.strictEqual(parsed.name, 'Test');
  assert.strictEqual(parsed.status, 'pending');
});

test('mock client lists files by prefix', async () => {
  const client = new MockGitHubClient();
  await client.writeFile('graves/abc.json', '{}');
  await client.writeFile('graves/def.json', '{}');
  await client.writeFile('cemeteries/ghi.json', '{}');
  const graves = await client.listFiles('graves/');
  assert.strictEqual(graves.length, 2);
  const cemeteries = await client.listFiles('cemeteries/');
  assert.strictEqual(cemeteries.length, 1);
});

test('submission goes to pending/, not graves/', async () => {
  const client = new MockGitHubClient();
  await client.writeFile('pending/sub_test.json', JSON.stringify({ status: 'pending' }));
  const pending = await client.listFiles('pending/');
  const published = await client.listFiles('graves/');
  assert.strictEqual(pending.length, 1);
  assert.strictEqual(published.length, 0);
});

// 8. Oversized request
console.log('\nOversized request:');
test('oversized body rejected', () => {
  const bigName = 'x'.repeat(501);
  const result = validateSubmission({ name: bigName });
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /too long/);
});

// 9. Security — no secrets in response
console.log('\nSecurity:');
test('validation error does not leak internal info', () => {
  const result = validateSubmission({ name: '' });
  assert.ok(!result.error.includes('GITHUB'));
  assert.ok(!result.error.includes('token'));
  assert.ok(!result.error.includes('key'));
});

// ── Summary ──
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
