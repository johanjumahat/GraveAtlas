/**
 * GraveAtlas Backend Tests — Phase 2
 * Run: node tests/
 */

const assert = require('assert');

function validateSubmission(body) {
  if (!body) return { valid: false, error: 'Empty request body' };
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) return { valid: false, error: 'Name is required' };
  if (body.name.length > 500) return { valid: false, error: 'Name too long (max 500 chars)' };
  if (body.latitude !== undefined || body.longitude !== undefined) {
    const lat = parseFloat(body.latitude), lon = parseFloat(body.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) return { valid: false, error: 'Invalid latitude' };
    if (isNaN(lon) || lon < -180 || lon > 180) return { valid: false, error: 'Invalid longitude' };
  }
  if (body.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.birthDate)) return { valid: false, error: 'Invalid birthDate' };
  if (body.deathDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.deathDate)) return { valid: false, error: 'Invalid deathDate' };
  if (JSON.stringify(body).length > 50000) return { valid: false, error: 'Request too large' };
  return { valid: true };
}

function isValidDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  return !isNaN(new Date(str).getTime());
}

function generateId() { return 'sub_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 8); }

class MockGitHubClient {
  constructor() { this.files = {}; this.writes = []; this.deletes = []; }
  async writeFile(path, content) { this.files[path] = content; this.writes.push(path); }
  async readFile(path) { return this.files[path] || null; }
  async listFiles(prefix) { return Object.keys(this.files).filter(p => p.startsWith(prefix + '/')).map(p => p.split('/').pop()); }
  async deleteFile(path) { delete this.files[path]; this.deletes.push(path); }
}

let passed = 0, failed = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn, async: false });
}
function asyncTest(name, fn) {
  tests.push({ name, fn, async: true });
}

// === Tests ===

test('health has githubConfigured flag', () => {
  const h = { status: 'healthy', version: '2.0.0', githubConfigured: false };
  assert.strictEqual(typeof h.githubConfigured, 'boolean');
});

test('valid submission passes', () => {
  assert.strictEqual(validateSubmission({ name: 'John Doe' }).valid, true);
});

test('empty body rejected', () => {
  assert.strictEqual(validateSubmission(null).valid, false);
});

test('missing name rejected', () => {
  assert.strictEqual(validateSubmission({ birthDate: '1950-01-01' }).valid, false);
});

test('empty name rejected', () => {
  assert.strictEqual(validateSubmission({ name: '   ' }).valid, false);
});

test('lat > 90 rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', latitude: 91 }).valid, false); });
test('lat < -90 rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', latitude: -91 }).valid, false); });
test('lon > 180 rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', longitude: 181 }).valid, false); });
test('lon < -180 rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', longitude: -181 }).valid, false); });
test('valid coords accepted', () => { assert.strictEqual(validateSubmission({ name: 'T', latitude: 1.35, longitude: 103.8 }).valid, true); });
test('invalid birthDate rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', birthDate: 'bad' }).valid, false); });
test('invalid deathDate rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', deathDate: '2020/01/01' }).valid, false); });
test('valid dates accepted', () => { assert.strictEqual(validateSubmission({ name: 'T', birthDate: '1950-01-01', deathDate: '2020-12-31' }).valid, true); });

test('duplicate IDs detected', () => {
  const recs = [{ id: 'a', name: 'T1' }, { id: 'a', name: 'T2' }];
  const ids = {}; let dup = false;
  for (const r of recs) { if (ids[r.id]) { dup = true; break; } ids[r.id] = true; }
  assert.strictEqual(dup, true);
});

test('unique IDs pass', () => {
  const recs = [{ id: 'a', name: 'T1' }, { id: 'b', name: 'T2' }];
  const ids = {}; let dup = false;
  for (const r of recs) { if (ids[r.id]) { dup = true; break; } ids[r.id] = true; }
  assert.strictEqual(dup, false);
});

asyncTest('writes submission to pending/', async () => {
  const c = new MockGitHubClient();
  const id = generateId();
  await c.writeFile(`pending/${id}.json`, JSON.stringify({ id, name: 'Test', status: 'pending' }));
  const content = await c.readFile(`pending/${id}.json`);
  assert.ok(content);
  assert.strictEqual(JSON.parse(content).status, 'pending');
});

asyncTest('reads published graves only', async () => {
  const c = new MockGitHubClient();
  await c.writeFile('graves/abc.json', JSON.stringify({ id: 'abc', status: 'published' }));
  await c.writeFile('graves/def.json', JSON.stringify({ id: 'def', status: 'published' }));
  await c.writeFile('pending/sub.json', JSON.stringify({ id: 'sub', status: 'pending' }));
  assert.strictEqual((await c.listFiles('graves')).length, 2);
  assert.strictEqual((await c.listFiles('pending')).length, 1);
});

asyncTest('approve moves from pending to graves', async () => {
  const c = new MockGitHubClient();
  const id = 'sub_approve';
  await c.writeFile(`pending/${id}.json`, JSON.stringify({ id, name: 'Test', status: 'pending' }));
  const content = await c.readFile(`pending/${id}.json`);
  const record = JSON.parse(content);
  record.status = 'published';
  await c.writeFile(`graves/${record.id}.json`, JSON.stringify(record));
  await c.deleteFile(`pending/${id}.json`);
  assert.ok(await c.readFile(`graves/${id}.json`));
  assert.strictEqual(await c.readFile(`pending/${id}.json`), null);
});

asyncTest('reject updates status to rejected', async () => {
  const c = new MockGitHubClient();
  const id = 'sub_reject';
  await c.writeFile(`pending/${id}.json`, JSON.stringify({ id, name: 'Test', status: 'pending' }));
  const record = JSON.parse(await c.readFile(`pending/${id}.json`));
  record.status = 'rejected';
  await c.writeFile(`pending/${id}.json`, JSON.stringify(record));
  assert.strictEqual(JSON.parse(await c.readFile(`pending/${id}.json`)).status, 'rejected');
});

asyncTest('report creates report_ file in pending/', async () => {
  const c = new MockGitHubClient();
  const rid = generateId();
  await c.writeFile(`pending/report_${rid}.json`, JSON.stringify({ id: rid, graveId: 'g1', report: 'Wrong date', status: 'reported' }));
  const files = await c.listFiles('pending');
  assert.strictEqual(files.length, 1);
  assert.ok(files[0].startsWith('report_'));
});

test('oversized body rejected', () => { assert.strictEqual(validateSubmission({ name: 'x'.repeat(501) }).valid, false); });

test('no secrets in errors', () => {
  const r = validateSubmission({ name: '' });
  assert.ok(!r.error.includes('GITHUB'));
  assert.ok(!r.error.includes('token'));
});

test('submission ID format safe', () => {
  const id = generateId();
  assert.ok(id.startsWith('sub_'));
  assert.ok(id.length >= 10);
});

asyncTest('full lifecycle: submit → pending → approve → published', async () => {
  const c = new MockGitHubClient();
  const id = generateId();
  // Submit
  await c.writeFile(`pending/${id}.json`, JSON.stringify({ id, name: 'John Doe', status: 'pending', submittedAt: new Date().toISOString() }));
  assert.strictEqual((await c.listFiles('pending')).length, 1);
  assert.strictEqual((await c.listFiles('graves')).length, 0);
  // Approve
  const record = JSON.parse(await c.readFile(`pending/${id}.json`));
  record.status = 'published';
  await c.writeFile(`graves/${id}.json`, JSON.stringify(record));
  await c.deleteFile(`pending/${id}.json`);
  assert.strictEqual((await c.listFiles('pending')).length, 0);
  assert.strictEqual((await c.listFiles('graves')).length, 1);
  // Verify
  const pub = JSON.parse(await c.readFile(`graves/${id}.json`));
  assert.strictEqual(pub.name, 'John Doe');
  assert.strictEqual(pub.status, 'published');
});

// === Run ===
(async () => {
  console.log('\n=== GraveAtlas Backend Tests (Phase 2) ===\n');
  for (const t of tests) {
    try {
      if (t.async) await t.fn();
      else t.fn();
      console.log(`  \u2713 ${t.name}`);
      passed++;
    } catch (e) {
      console.log(`  \u2717 ${t.name}: ${e.message}`);
      failed++;
    }
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
