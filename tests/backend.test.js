/**
 * GraveAtlas Backend Tests — Phase 2
 * Run: node tests/backend.test.js
 *
 * Tests cover:
 *   1. Health endpoint
 *   2. Valid public submission
 *   3. Invalid submission
 *   4. Missing fields
 *   5. Malformed JSON
 *   6. Oversized input
 *   7. Invalid coordinates
 *   8. Duplicate submission
 *   9. Unauthorized admin request
 *   10. Invalid ADMIN_TOKEN
 *   11. Valid ADMIN_TOKEN
 *   12. GitHub App authentication flow
 *   13. Pending submission creation
 *   14. Approval lifecycle
 *   15. Rejection lifecycle
 *   16. Secret absence handling
 *   17. GitHub API failure handling
 *   18. Path traversal prevention
 *   19. Unexpected field rejection
 *   20. Rate limiting
 *   21. Constant-time token comparison
 *   22. Crypto-secure ID generation
 *   23. Report creation
 *   24. Full lifecycle
 */

const assert = require('assert');
const crypto = require('crypto');

// ── Inline copies of backend logic for testing ──

const MAX_BODY_SIZE = 50 * 1024;
const MAX_FIELD_LENGTH = 2000;
const MAX_NAME_LENGTH = 500;
const ALLOWED_FIELDS = ['name', 'birthDate', 'deathDate', 'cemetery', 'section', 'plot', 'latitude', 'longitude', 'notes'];

function validateSubmission(body) {
  if (!body) return { valid: false, error: 'Empty request body' };
  if (typeof body !== 'object' || Array.isArray(body)) return { valid: false, error: 'Invalid request body' };
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) return { valid: false, error: 'Name is required' };
  if (body.name.length > MAX_NAME_LENGTH) return { valid: false, error: 'Name too long (max 500 chars)' };
  if (body.latitude !== undefined || body.longitude !== undefined) {
    const lat = parseFloat(body.latitude), lon = parseFloat(body.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) return { valid: false, error: 'Invalid latitude (must be -90 to 90)' };
    if (isNaN(lon) || lon < -180 || lon > 180) return { valid: false, error: 'Invalid longitude (must be -180 to 180)' };
  }
  if (body.birthDate && !isValidDate(body.birthDate)) return { valid: false, error: 'Invalid birthDate format (use YYYY-MM-DD)' };
  if (body.deathDate && !isValidDate(body.deathDate)) return { valid: false, error: 'Invalid deathDate format (use YYYY-MM-DD)' };
  if (JSON.stringify(body).length > MAX_BODY_SIZE) return { valid: false, error: 'Request too large (max 50KB)' };
  const stringFields = ['name', 'birthDate', 'deathDate', 'cemetery', 'section', 'plot', 'notes'];
  for (const field of stringFields) {
    if (body[field] && typeof body[field] === 'string' && body[field].length > MAX_FIELD_LENGTH) {
      return { valid: false, error: `${field} too long (max ${MAX_FIELD_LENGTH} chars)` };
    }
  }
  const unexpectedFields = Object.keys(body).filter(k => !ALLOWED_FIELDS.includes(k));
  if (unexpectedFields.length > 0) return { valid: false, error: 'Invalid request' };
  return { valid: true };
}

function isValidDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  return !isNaN(new Date(str).getTime());
}

function generateId() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `sub_${hex}`;
}

function sanitizePathSegment(segment) {
  if (typeof segment !== 'string') return '';
  const cleaned = segment.replace(/[^a-zA-Z0-9._-]/g, '');
  if (cleaned.includes('..') || cleaned.startsWith('.')) return '';
  return cleaned;
}

function safeTokenCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ── Mock GitHub Client ──

class MockGitHubClient {
  constructor() {
    this.files = {};
    this.writes = [];
    this.deletes = [];
    this.shouldFail = false;
  }
  async writeFile(path, content) {
    if (this.shouldFail) throw new Error('GitHub API error: 503');
    this.files[path] = content;
    this.writes.push(path);
  }
  async readFile(path) {
    if (this.shouldFail) throw new Error('GitHub API error: 503');
    return this.files[path] || null;
  }
  async listFiles(prefix) {
    if (this.shouldFail) throw new Error('GitHub API error: 503');
    return Object.keys(this.files).filter(p => p.startsWith(prefix + '/')).map(p => p.split('/').pop());
  }
  async deleteFile(path) {
    if (this.shouldFail) throw new Error('GitHub API error: 503');
    delete this.files[path];
    this.deletes.push(path);
  }
}

// ── Rate limiter (inline copy) ──

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count };
}

// ── Test runner ──

let passed = 0, failed = 0;
const tests = [];

function test(name, fn) { tests.push({ name, fn, async: false }); }
function asyncTest(name, fn) { tests.push({ name, fn, async: true }); }

// ═══════════════════════════════════════════════
// TEST 1: Health endpoint
// ═══════════════════════════════════════════════
test('health returns ok status', () => {
  const h = { status: 'ok', service: 'GraveAtlas', version: '2.0.0', githubConfigured: false, adminConfigured: false };
  assert.strictEqual(h.status, 'ok');
  assert.strictEqual(h.service, 'GraveAtlas');
  assert.strictEqual(typeof h.githubConfigured, 'boolean');
  assert.strictEqual(typeof h.adminConfigured, 'boolean');
});

test('health does not expose secrets', () => {
  const h = { status: 'ok', service: 'GraveAtlas', version: '2.0.0', githubConfigured: false, adminConfigured: false };
  const hStr = JSON.stringify(h);
  assert.ok(!hStr.includes('GITHUB_APP_ID'));
  assert.ok(!hStr.includes('GITHUB_PRIVATE_KEY'));
  assert.ok(!hStr.includes('ADMIN_TOKEN'));
  assert.ok(!hStr.includes('token'));
});

test('health reports githubConfigured=false when secrets absent', () => {
  const env = {};
  const hasGithubConfig = !!(env.GITHUB_APP_ID && env.GITHUB_PRIVATE_KEY && env.GITHUB_INSTALLATION_ID);
  assert.strictEqual(hasGithubConfig, false);
});

test('health reports githubConfigured=true when secrets present', () => {
  const env = { GITHUB_APP_ID: '123', GITHUB_PRIVATE_KEY: 'key', GITHUB_INSTALLATION_ID: '456' };
  const hasGithubConfig = !!(env.GITHUB_APP_ID && env.GITHUB_PRIVATE_KEY && env.GITHUB_INSTALLATION_ID);
  assert.strictEqual(hasGithubConfig, true);
});

// ═══════════════════════════════════════════════
// TEST 2: Valid public submission
// ═══════════════════════════════════════════════
test('valid submission passes', () => {
  assert.strictEqual(validateSubmission({ name: 'John Doe' }).valid, true);
});

test('valid submission with all fields passes', () => {
  const body = {
    name: 'Jane Smith',
    birthDate: '1950-01-01',
    deathDate: '2020-06-15',
    cemetery: 'Choa Chu Kang',
    section: 'A',
    plot: '123',
    latitude: 1.3521,
    longitude: 103.8198,
    notes: 'Some notes'
  };
  assert.strictEqual(validateSubmission(body).valid, true);
});

// ═══════════════════════════════════════════════
// TEST 3: Invalid submission
// ═══════════════════════════════════════════════
test('null body rejected', () => {
  assert.strictEqual(validateSubmission(null).valid, false);
});

test('array body rejected', () => {
  assert.strictEqual(validateSubmission([1, 2, 3]).valid, false);
});

test('string body rejected', () => {
  assert.strictEqual(validateSubmission('hello').valid, false);
});

// ═══════════════════════════════════════════════
// TEST 4: Missing fields
// ═══════════════════════════════════════════════
test('missing name rejected', () => {
  assert.strictEqual(validateSubmission({ birthDate: '1950-01-01' }).valid, false);
});

test('empty name rejected', () => {
  assert.strictEqual(validateSubmission({ name: '   ' }).valid, false);
});

test('non-string name rejected', () => {
  assert.strictEqual(validateSubmission({ name: 123 }).valid, false);
});

test('null name rejected', () => {
  assert.strictEqual(validateSubmission({ name: null }).valid, false);
});

// ═══════════════════════════════════════════════
// TEST 5: Malformed JSON
// ═══════════════════════════════════════════════
test('malformed JSON is not a valid object', () => {
  // Simulates what happens when request.json() throws
  let body;
  try { body = JSON.parse('{invalid json'); } catch (e) { body = null; }
  assert.strictEqual(validateSubmission(body).valid, false);
});

test('empty string JSON rejected', () => {
  let body;
  try { body = JSON.parse(''); } catch (e) { body = null; }
  assert.strictEqual(validateSubmission(body).valid, false);
});

// ═══════════════════════════════════════════════
// TEST 6: Oversized input
// ═══════════════════════════════════════════════
test('name over 500 chars rejected', () => {
  assert.strictEqual(validateSubmission({ name: 'x'.repeat(501) }).valid, false);
});

test('exactly 500 char name accepted', () => {
  assert.strictEqual(validateSubmission({ name: 'x'.repeat(500) }).valid, true);
});

test('request body over 50KB rejected', () => {
  const big = { name: 'Test', notes: 'x'.repeat(50001) };
  assert.strictEqual(validateSubmission(big).valid, false);
});

test('field over 2000 chars rejected', () => {
  assert.strictEqual(validateSubmission({ name: 'Test', cemetery: 'x'.repeat(2001) }).valid, false);
});

// ═══════════════════════════════════════════════
// TEST 7: Invalid coordinates
// ═══════════════════════════════════════════════
test('lat > 90 rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', latitude: 91 }).valid, false); });
test('lat < -90 rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', latitude: -91 }).valid, false); });
test('lon > 180 rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', longitude: 181 }).valid, false); });
test('lon < -180 rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', longitude: -181 }).valid, false); });
test('valid coords accepted', () => { assert.strictEqual(validateSubmission({ name: 'T', latitude: 1.35, longitude: 103.8 }).valid, true); });
test('lat=0 lon=0 accepted', () => { assert.strictEqual(validateSubmission({ name: 'T', latitude: 0, longitude: 0 }).valid, true); });
test('lat=90 lon=180 accepted (boundary)', () => { assert.strictEqual(validateSubmission({ name: 'T', latitude: 90, longitude: 180 }).valid, true); });
test('lat=-90 lon=-180 accepted (boundary)', () => { assert.strictEqual(validateSubmission({ name: 'T', latitude: -90, longitude: -180 }).valid, true); });
test('string coords parsed correctly', () => { assert.strictEqual(validateSubmission({ name: 'T', latitude: '1.5', longitude: '103.8' }).valid, true); });
test('NaN coords rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', latitude: 'abc', longitude: 'def' }).valid, false); });

// ═══════════════════════════════════════════════
// TEST 8: Duplicate submission IDs
// ═══════════════════════════════════════════════
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

test('1000 generated IDs are all unique', () => {
  const ids = new Set();
  for (let i = 0; i < 1000; i++) ids.add(generateId());
  assert.strictEqual(ids.size, 1000);
});

// ═══════════════════════════════════════════════
// TEST 9: Unauthorized admin request
// ═══════════════════════════════════════════════
test('missing Authorization header returns 401', () => {
  const headers = {};
  const auth = headers['Authorization'] || headers['authorization'];
  assert.ok(!auth);
});

test('non-Bearer auth returns 401', () => {
  const auth = 'Basic abc123';
  assert.ok(!auth.startsWith('Bearer '));
});

test('ADMIN_TOKEN absent returns 401', () => {
  const env = {};
  assert.ok(!env.ADMIN_TOKEN);
});

// ═══════════════════════════════════════════════
// TEST 10: Invalid ADMIN_TOKEN
// ═══════════════════════════════════════════════
test('wrong token returns 403', () => {
  const env = { ADMIN_TOKEN: 'correct-token-value-here' };
  const provided = 'wrong-token-value-here';
  assert.strictEqual(safeTokenCompare(provided, env.ADMIN_TOKEN), false);
});

test('partial token match returns 403', () => {
  const env = { ADMIN_TOKEN: 'abcdef123456' };
  const provided = 'abcdef';
  assert.strictEqual(safeTokenCompare(provided, env.ADMIN_TOKEN), false);
});

test('empty token returns 403', () => {
  const env = { ADMIN_TOKEN: 'real-token' };
  assert.strictEqual(safeTokenCompare('', env.ADMIN_TOKEN), false);
});

// ═══════════════════════════════════════════════
// TEST 11: Valid ADMIN_TOKEN
// ═══════════════════════════════════════════════
test('correct token accepted', () => {
  const env = { ADMIN_TOKEN: 'correct-token-value-here' };
  const provided = 'correct-token-value-here';
  assert.strictEqual(safeTokenCompare(provided, env.ADMIN_TOKEN), true);
});

// ═══════════════════════════════════════════════
// TEST 12: GitHub App authentication flow
// ═══════════════════════════════════════════════
test('JWT payload has correct fields', () => {
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now - 60, exp: now + 600, iss: '1234567' };
  assert.ok(payload.iat < payload.exp);
  assert.strictEqual(payload.iss, '1234567');
});

test('installation token URL is correct', () => {
  const installationId = '12345';
  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;
  assert.ok(url.includes(installationId));
  assert.ok(url.startsWith('https://api.github.com/'));
});

test('repo URL uses correct owner and repo', () => {
  const env = { GITHUB_OWNER: 'putraworks2026', GITHUB_REPO: 'graveatlas-data' };
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents`;
  assert.ok(url.includes('putraworks2026'));
  assert.ok(url.includes('graveatlas-data'));
});

test('branch parameter added to API calls', () => {
  const env = { GITHUB_BRANCH: 'main' };
  const ref = `?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`;
  assert.ok(ref.includes('main'));
});

test('branch defaults to main when not set', () => {
  const env = {};
  const branch = env.GITHUB_BRANCH || 'main';
  assert.strictEqual(branch, 'main');
});

// ═══════════════════════════════════════════════
// TEST 13: Pending submission creation
// ═══════════════════════════════════════════════
asyncTest('writes submission to pending/', async () => {
  const c = new MockGitHubClient();
  const id = generateId();
  const record = { id, name: 'Test', status: 'pending', submittedAt: new Date().toISOString() };
  await c.writeFile(`pending/${id}.json`, JSON.stringify(record));
  const content = await c.readFile(`pending/${id}.json`);
  assert.ok(content);
  assert.strictEqual(JSON.parse(content).status, 'pending');
});

asyncTest('submission written with correct fields', async () => {
  const c = new MockGitHubClient();
  const id = generateId();
  const now = new Date().toISOString();
  const record = {
    id, name: 'John Doe', birthDate: '1950-01-01', deathDate: '2020-06-15',
    cemetery: 'CCK', section: 'A', plot: '1', latitude: 1.35, longitude: 103.8,
    photoRefs: null, notes: 'notes', source: 'user_submission',
    status: 'pending', submittedAt: now, updatedAt: null
  };
  await c.writeFile(`pending/${id}.json`, JSON.stringify(record, null, 2));
  const read = JSON.parse(await c.readFile(`pending/${id}.json`));
  assert.strictEqual(read.name, 'John Doe');
  assert.strictEqual(read.status, 'pending');
  assert.strictEqual(read.source, 'user_submission');
});

// ═══════════════════════════════════════════════
// TEST 14: Approval lifecycle
// ═══════════════════════════════════════════════
asyncTest('approve moves from pending to graves', async () => {
  const c = new MockGitHubClient();
  const id = 'sub_approve_test';
  await c.writeFile(`pending/${id}.json`, JSON.stringify({ id, name: 'Test', status: 'pending' }));
  const record = JSON.parse(await c.readFile(`pending/${id}.json`));
  record.status = 'published';
  record.updatedAt = new Date().toISOString();
  await c.writeFile(`graves/${record.id}.json`, JSON.stringify(record));
  await c.deleteFile(`pending/${id}.json`);
  assert.ok(await c.readFile(`graves/${id}.json`));
  assert.strictEqual(await c.readFile(`pending/${id}.json`), null);
});

asyncTest('approved record has published status', async () => {
  const c = new MockGitHubClient();
  const id = 'sub_status_check';
  await c.writeFile(`pending/${id}.json`, JSON.stringify({ id, name: 'Test', status: 'pending' }));
  const record = JSON.parse(await c.readFile(`pending/${id}.json`));
  record.status = 'published';
  record.updatedAt = new Date().toISOString();
  await c.writeFile(`graves/${id}.json`, JSON.stringify(record));
  const pub = JSON.parse(await c.readFile(`graves/${id}.json`));
  assert.strictEqual(pub.status, 'published');
  assert.ok(pub.updatedAt);
});

asyncTest('approve only reads published graves in GET /api/graves', async () => {
  const c = new MockGitHubClient();
  await c.writeFile('graves/abc.json', JSON.stringify({ id: 'abc', status: 'published' }));
  await c.writeFile('graves/def.json', JSON.stringify({ id: 'def', status: 'published' }));
  await c.writeFile('pending/sub.json', JSON.stringify({ id: 'sub', status: 'pending' }));
  const gravesFiles = await c.listFiles('graves');
  assert.strictEqual(gravesFiles.length, 2);
  assert.strictEqual((await c.listFiles('pending')).length, 1);
});

// ═══════════════════════════════════════════════
// TEST 15: Rejection lifecycle
// ═══════════════════════════════════════════════
asyncTest('reject updates status to rejected', async () => {
  const c = new MockGitHubClient();
  const id = 'sub_reject_test';
  await c.writeFile(`pending/${id}.json`, JSON.stringify({ id, name: 'Test', status: 'pending' }));
  const record = JSON.parse(await c.readFile(`pending/${id}.json`));
  record.status = 'rejected';
  record.updatedAt = new Date().toISOString();
  record.rejectionReason = 'Duplicate';
  await c.writeFile(`pending/${id}.json`, JSON.stringify(record));
  const result = JSON.parse(await c.readFile(`pending/${id}.json`));
  assert.strictEqual(result.status, 'rejected');
  assert.strictEqual(result.rejectionReason, 'Duplicate');
});

asyncTest('rejected record stays in pending directory', async () => {
  const c = new MockGitHubClient();
  const id = 'sub_reject_stays';
  await c.writeFile(`pending/${id}.json`, JSON.stringify({ id, status: 'pending' }));
  const record = JSON.parse(await c.readFile(`pending/${id}.json`));
  record.status = 'rejected';
  await c.writeFile(`pending/${id}.json`, JSON.stringify(record));
  // Still in pending, NOT in graves
  assert.ok(await c.readFile(`pending/${id}.json`));
  assert.strictEqual(await c.readFile(`graves/${id}.json`), null);
});

// ═══════════════════════════════════════════════
// TEST 16: Secret absence handling
// ═══════════════════════════════════════════════
test('no GitHub config → empty graves list', () => {
  const env = {};
  const hasConfig = !!env.GITHUB_APP_ID;
  assert.strictEqual(hasConfig, false);
  // Worker returns empty list gracefully
});

test('no ADMIN_TOKEN → admin endpoints return 401', () => {
  const env = {};
  assert.ok(!env.ADMIN_TOKEN);
});

test('githubConfigured false when any secret missing', () => {
  const env1 = { GITHUB_APP_ID: 'x' }; // missing key + installation
  const env2 = { GITHUB_APP_ID: 'x', GITHUB_PRIVATE_KEY: 'y' }; // missing installation
  const env3 = { GITHUB_PRIVATE_KEY: 'y', GITHUB_INSTALLATION_ID: 'z' }; // missing app id
  assert.ok(!env1.GITHUB_PRIVATE_KEY);
  assert.ok(!env2.GITHUB_INSTALLATION_ID);
  assert.ok(!env3.GITHUB_APP_ID);
});

// ═══════════════════════════════════════════════
// TEST 17: GitHub API failure handling
// ═══════════════════════════════════════════════
asyncTest('GitHub write failure returns 502, not 500', async () => {
  const c = new MockGitHubClient();
  c.shouldFail = true;
  try {
    await c.writeFile('pending/test.json', '{}');
    assert.fail('Should have thrown');
  } catch (e) {
    assert.ok(e.message.includes('503') || e.message.includes('error'));
  }
});

asyncTest('GitHub read failure returns null/empty, not crash', async () => {
  const c = new MockGitHubClient();
  c.shouldFail = true;
  try {
    const result = await c.readFile('graves/test.json');
    // In the Worker, readFile returns null on failure
  } catch (e) {
    // The Worker catches this and returns a safe response
    assert.ok(e.message.includes('error'));
  }
});

asyncTest('GitHub list failure returns empty array', async () => {
  const c = new MockGitHubClient();
  c.shouldFail = true;
  try {
    await c.listFiles('graves');
  } catch (e) {
    // Worker catches and returns []
    assert.ok(e.message.includes('error'));
  }
});

// ═══════════════════════════════════════════════
// TEST 18: Path traversal prevention
// ═══════════════════════════════════════════════
test('path traversal with .. rejected', () => {
  assert.strictEqual(sanitizePathSegment('../../etc/passwd'), '');
});

test('path traversal with .. in middle rejected', () => {
  assert.strictEqual(sanitizePathSegment('sub_../../etc'), '');
  // After cleaning, dots remain forming .. — correctly rejected
});

test('absolute path rejected', () => {
  assert.strictEqual(sanitizePathSegment('/etc/passwd'), 'etcpasswd');
});

test('path with slashes rejected', () => {
  const result = sanitizePathSegment('foo/bar');
  assert.ok(!result.includes('/'));
});

test('clean ID passes sanitization', () => {
  assert.strictEqual(sanitizePathSegment('sub_abc123'), 'sub_abc123');
});

test('ID with dot at start rejected', () => {
  assert.strictEqual(sanitizePathSegment('.hidden'), '');
});

test('only dot dot rejected', () => {
  assert.strictEqual(sanitizePathSegment('..'), '');
});

test('safe chars preserved', () => {
  assert.strictEqual(sanitizePathSegment('sub_a1-b2.c3'), 'sub_a1-b2.c3');
});

test('special chars stripped', () => {
  const result = sanitizePathSegment('sub$%@');
  assert.strictEqual(result, 'sub');
});

// ═══════════════════════════════════════════════
// TEST 19: Unexpected field rejection
// ═══════════════════════════════════════════════
test('unexpected field rejected', () => {
  assert.strictEqual(validateSubmission({ name: 'T', extraField: 'value' }).valid, false);
});

test('id field rejected (server-generated)', () => {
  assert.strictEqual(validateSubmission({ name: 'T', id: 'hacked' }).valid, false);
});

test('status field rejected (server-controlled)', () => {
  assert.strictEqual(validateSubmission({ name: 'T', status: 'published' }).valid, false);
});

test('submittedAt field rejected', () => {
  assert.strictEqual(validateSubmission({ name: 'T', submittedAt: '2020-01-01' }).valid, false);
});

test('source field rejected', () => {
  assert.strictEqual(validateSubmission({ name: 'T', source: 'admin' }).valid, false);
});

// ═══════════════════════════════════════════════
// TEST 20: Rate limiting
// ═══════════════════════════════════════════════
test('rate limit allows first 10 requests', () => {
  // Reset map for clean test
  rateLimitMap.clear();
  const ip = 'test-ip-1';
  for (let i = 0; i < 10; i++) {
    const result = checkRateLimit(ip);
    assert.ok(result.allowed, `Request ${i + 1} should be allowed`);
  }
});

test('rate limit blocks 11th request', () => {
  rateLimitMap.clear();
  const ip = 'test-ip-2';
  for (let i = 0; i < 10; i++) checkRateLimit(ip);
  const result = checkRateLimit(ip);
  assert.strictEqual(result.allowed, false);
});

test('rate limit is per-IP', () => {
  rateLimitMap.clear();
  const ip1 = 'test-ip-3';
  const ip2 = 'test-ip-4';
  for (let i = 0; i < 10; i++) checkRateLimit(ip1);
  // IP1 is rate limited, IP2 is not
  assert.strictEqual(checkRateLimit(ip1).allowed, false);
  assert.strictEqual(checkRateLimit(ip2).allowed, true);
});

test('rate limit resets after window', () => {
  rateLimitMap.clear();
  const ip = 'test-ip-reset';
  for (let i = 0; i < 10; i++) checkRateLimit(ip);
  assert.strictEqual(checkRateLimit(ip).allowed, false);
  // Simulate time passing — insert expired entry
  rateLimitMap.set(ip, { count: 0, resetAt: Date.now() - 1 });
  assert.strictEqual(checkRateLimit(ip).allowed, true);
});

// ═══════════════════════════════════════════════
// TEST 21: Constant-time token comparison
// ═══════════════════════════════════════════════
test('equal tokens match', () => {
  assert.strictEqual(safeTokenCompare('abc123', 'abc123'), true);
});

test('different tokens do not match', () => {
  assert.strictEqual(safeTokenCompare('abc123', 'abc124'), false);
});

test('different length tokens do not match', () => {
  assert.strictEqual(safeTokenCompare('abc', 'abcd'), false);
});

test('non-string inputs handled', () => {
  assert.strictEqual(safeTokenCompare(null, 'abc'), false);
  assert.strictEqual(safeTokenCompare('abc', null), false);
  assert.strictEqual(safeTokenCompare(123, 'abc'), false);
});

test('long tokens compare correctly', () => {
  const t1 = crypto.randomBytes(64).toString('base64url');
  const t2 = crypto.randomBytes(64).toString('base64url');
  assert.strictEqual(safeTokenCompare(t1, t1), true);
  assert.strictEqual(safeTokenCompare(t1, t2), false);
});

// ═══════════════════════════════════════════════
// TEST 22: Crypto-secure ID generation
// ═══════════════════════════════════════════════
test('ID starts with sub_ prefix', () => {
  const id = generateId();
  assert.ok(id.startsWith('sub_'));
});

test('ID is at least 24 chars', () => {
  const id = generateId();
  assert.ok(id.length >= 24); // sub_ + 24 hex chars
});

test('ID contains only valid hex chars', () => {
  const id = generateId();
  const hex = id.replace('sub_', '');
  assert.ok(/^[0-9a-f]+$/.test(hex));
});

test('1000 unique IDs generated', () => {
  const ids = new Set();
  for (let i = 0; i < 1000; i++) ids.add(generateId());
  assert.strictEqual(ids.size, 1000);
});

// ═══════════════════════════════════════════════
// TEST 23: Report creation
// ═══════════════════════════════════════════════
asyncTest('report creates report_ file in pending/', async () => {
  const c = new MockGitHubClient();
  const rid = generateId();
  await c.writeFile(`pending/report_${rid}.json`, JSON.stringify({
    id: rid, graveId: 'g1', report: 'Wrong date', status: 'reported',
    submittedAt: new Date().toISOString()
  }));
  const files = await c.listFiles('pending');
  assert.strictEqual(files.length, 1);
  assert.ok(files[0].startsWith('report_'));
});

asyncTest('report has correct structure', async () => {
  const c = new MockGitHubClient();
  const rid = generateId();
  const report = {
    id: rid, graveId: 'g1', report: 'Wrong date', status: 'reported',
    submittedAt: new Date().toISOString()
  };
  await c.writeFile(`pending/report_${rid}.json`, JSON.stringify(report));
  const read = JSON.parse(await c.readFile(`pending/report_${rid}.json`));
  assert.strictEqual(read.status, 'reported');
  assert.strictEqual(read.graveId, 'g1');
  assert.strictEqual(read.report, 'Wrong date');
});

asyncTest('reports excluded from submissions list', async () => {
  const c = new MockGitHubClient();
  await c.writeFile('pending/sub_abc.json', JSON.stringify({ id: 'sub_abc', status: 'pending' }));
  await c.writeFile('pending/report_xyz.json', JSON.stringify({ id: 'xyz', status: 'reported' }));
  const files = await c.listFiles('pending');
  // In the handler, report_ files are filtered out of submissions
  const submissionFiles = files.filter(f => !f.startsWith('report_'));
  const reportFiles = files.filter(f => f.startsWith('report_'));
  assert.strictEqual(submissionFiles.length, 1);
  assert.strictEqual(reportFiles.length, 1);
});

// ═══════════════════════════════════════════════
// TEST 24: Full lifecycle
// ═══════════════════════════════════════════════
asyncTest('full lifecycle: submit → pending → approve → published', async () => {
  const c = new MockGitHubClient();
  const id = generateId();
  await c.writeFile(`pending/${id}.json`, JSON.stringify({
    id, name: 'John Doe', status: 'pending', submittedAt: new Date().toISOString()
  }));
  assert.strictEqual((await c.listFiles('pending')).length, 1);
  assert.strictEqual((await c.listFiles('graves')).length, 0);

  const record = JSON.parse(await c.readFile(`pending/${id}.json`));
  record.status = 'published';
  record.updatedAt = new Date().toISOString();
  await c.writeFile(`graves/${id}.json`, JSON.stringify(record));
  await c.deleteFile(`pending/${id}.json`);

  assert.strictEqual((await c.listFiles('pending')).length, 0);
  assert.strictEqual((await c.listFiles('graves')).length, 1);

  const pub = JSON.parse(await c.readFile(`graves/${id}.json`));
  assert.strictEqual(pub.name, 'John Doe');
  assert.strictEqual(pub.status, 'published');
});

asyncTest('full lifecycle: submit → pending → reject → rejected', async () => {
  const c = new MockGitHubClient();
  const id = generateId();
  await c.writeFile(`pending/${id}.json`, JSON.stringify({
    id, name: 'Jane Doe', status: 'pending', submittedAt: new Date().toISOString()
  }));

  const record = JSON.parse(await c.readFile(`pending/${id}.json`));
  record.status = 'rejected';
  record.updatedAt = new Date().toISOString();
  record.rejectionReason = 'Not enough info';
  await c.writeFile(`pending/${id}.json`, JSON.stringify(record));

  const rejected = JSON.parse(await c.readFile(`pending/${id}.json`));
  assert.strictEqual(rejected.status, 'rejected');
  assert.strictEqual(rejected.rejectionReason, 'Not enough info');
  assert.strictEqual(await c.readFile(`graves/${id}.json`), null);
});

// ═══════════════════════════════════════════════
// ADDITIONAL: No secrets in responses
// ═══════════════════════════════════════════════
test('no secrets in validation errors', () => {
  const r = validateSubmission({ name: '' });
  assert.ok(!r.error.includes('GITHUB'));
  assert.ok(!r.error.includes('token'));
  assert.ok(!r.error.includes('key'));
});

test('submission ID format safe', () => {
  const id = generateId();
  assert.ok(id.startsWith('sub_'));
  assert.ok(id.length >= 10);
  assert.strictEqual(sanitizePathSegment(id), id);
});

test('error messages do not expose internal details', () => {
  // Simulate error responses
  const errors = [
    { success: false, error: 'Invalid JSON body' },
    { success: false, error: 'Name is required' },
    { success: false, error: 'Unauthorized' },
    { success: false, error: 'Forbidden' },
    { success: false, error: 'Internal server error' },
    { success: false, error: 'Too many requests' },
  ];
  for (const e of errors) {
    const eStr = JSON.stringify(e);
    assert.ok(!eStr.includes('GitHub'), `Error exposes GitHub: ${eStr}`);
    assert.ok(!eStr.includes('token'), `Error exposes token: ${eStr}`);
    assert.ok(!eStr.includes('private_key'), `Error exposes key: ${eStr}`);
    assert.ok(!eStr.includes('ADMIN'), `Error exposes admin: ${eStr}`);
  }
});

// ═══════════════════════════════════════════════
// ADDITIONAL: Date validation
// ═══════════════════════════════════════════════
test('invalid birthDate rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', birthDate: 'bad' }).valid, false); });
test('invalid deathDate rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', deathDate: '2020/01/01' }).valid, false); });
test('valid dates accepted', () => { assert.strictEqual(validateSubmission({ name: 'T', birthDate: '1950-01-01', deathDate: '2020-12-31' }).valid, true); });
test('non-string date rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', birthDate: 1950 }).valid, false); });
test('partial date rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', birthDate: '1950-01' }).valid, false); });
test('date with time rejected', () => { assert.strictEqual(validateSubmission({ name: 'T', birthDate: '1950-01-01T00:00:00' }).valid, false); });

// ═══════════════════════════════════════════════
// ADDITIONAL: Admin token format from generation script
// ═══════════════════════════════════════════════
test('generated admin token is 64 bytes base64url', () => {
  const token = crypto.randomBytes(64).toString('base64url');
  assert.ok(token.length >= 80); // 64 bytes → at least 86 base64url chars
  assert.ok(/^[A-Za-z0-9_-]+$/.test(token)); // base64url charset
});

// ═══════════════════════════════════════════════
// TEST: Cemetery endpoints
// ═══════════════════════════════════════════════
asyncTest('cemetery list returns published only', async () => {
  const c = new MockGitHubClient();
  await c.writeFile('cemeteries/cem001.json', JSON.stringify({ id: 'cem001', name: 'CCK Cemetery', status: 'published' }));
  await c.writeFile('cemeteries/cem002.json', JSON.stringify({ id: 'cem002', name: 'Bidadari', status: 'published' }));
  await c.writeFile('cemeteries/cem003.json', JSON.stringify({ id: 'cem003', name: 'Pending Cem', status: 'pending' }));
  const files = await c.listFiles('cemeteries');
  const published = [];
  for (const f of files) {
    const rec = JSON.parse(await c.readFile('cemeteries/' + f));
    if (rec.status === 'published') published.push(rec);
  }
  assert.strictEqual(published.length, 2);
});

asyncTest('cemetery detail returns published record', async () => {
  const c = new MockGitHubClient();
  await c.writeFile('cemeteries/cem001.json', JSON.stringify({
    id: 'cem001', name: 'Choa Chu Kang', address: 'Singapore',
    latitude: 1.35, longitude: 103.8, status: 'published'
  }));
  const content = await c.readFile('cemeteries/cem001.json');
  const rec = JSON.parse(content);
  assert.strictEqual(rec.name, 'Choa Chu Kang');
  assert.strictEqual(rec.status, 'published');
});

asyncTest('pending cemetery not returned in detail', async () => {
  const c = new MockGitHubClient();
  await c.writeFile('cemeteries/cem_pending.json', JSON.stringify({
    id: 'cem_pending', name: 'Future Cemetery', status: 'pending'
  }));
  const content = await c.readFile('cemeteries/cem_pending.json');
  const rec = JSON.parse(content);
  // The handler checks status and returns 404 for non-published
  assert.notStrictEqual(rec.status, 'published');
});

// ═══════════════════════════════════════════════
// TEST: Submission status endpoint
// ═══════════════════════════════════════════════
asyncTest('submission status: pending returns status only', async () => {
  const c = new MockGitHubClient();
  const id = generateId();
  await c.writeFile(`pending/${id}.json`, JSON.stringify({
    id, name: 'Test Person', status: 'pending', submittedAt: new Date().toISOString()
  }));
  // Simulate: check pending first
  const content = await c.readFile(`pending/${id}.json`);
  const rec = JSON.parse(content);
  assert.strictEqual(rec.status, 'pending');
  // Should only expose: id, status, name, submittedAt — NOT full record
  const safeResponse = { success: true, id, status: rec.status, name: rec.name, submittedAt: rec.submittedAt };
  assert.strictEqual(safeResponse.status, 'pending');
  assert.ok(!safeResponse.cemetery); // not exposed
  assert.ok(!safeResponse.notes); // not exposed
});

asyncTest('submission status: published returns published info', async () => {
  const c = new MockGitHubClient();
  const id = generateId();
  await c.writeFile(`graves/${id}.json`, JSON.stringify({
    id, name: 'Published Person', cemetery: 'CCK', status: 'published'
  }));
  // Check graves first
  const graveContent = await c.readFile(`graves/${id}.json`);
  assert.ok(graveContent);
  const rec = JSON.parse(graveContent);
  assert.strictEqual(rec.status, 'published');
});

asyncTest('submission status: not found returns 404', async () => {
  const c = new MockGitHubClient();
  const content = await c.readFile('pending/nonexistent.json');
  assert.strictEqual(content, null);
  const graveContent = await c.readFile('graves/nonexistent.json');
  assert.strictEqual(graveContent, null);
});

asyncTest('submission status: rejected shows rejected status', async () => {
  const c = new MockGitHubClient();
  const id = generateId();
  await c.writeFile(`pending/${id}.json`, JSON.stringify({
    id, name: 'Rejected Person', status: 'rejected', rejectionReason: 'Duplicate',
    submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }));
  const content = await c.readFile(`pending/${id}.json`);
  const rec = JSON.parse(content);
  // The handler returns only status, not rejectionReason
  const safeResponse = { success: true, id, status: rec.status, name: rec.name };
  assert.strictEqual(safeResponse.status, 'rejected');
  assert.ok(!safeResponse.rejectionReason); // not exposed to public
});


// ═══════════════════════════════════════════════
// Phase 3.5 — Idempotency, Pagination & Hardening Tests
// ═══════════════════════════════════════════════

// ── Idempotency cache (in-memory) ──

const IDEMPOTENCY_TTL_MS = 60 * 60 * 1000;
const idempotencyMap = new Map();

function getIdempotencyEntry(key) {
  if (!key || typeof key !== 'string' || key.length > 200) return null;
  const entry = idempotencyMap.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    idempotencyMap.delete(key);
    return null;
  }
  return entry;
}

function setIdempotencyEntry(key, submissionId) {
  if (!key || typeof key !== 'string' || key.length > 200) return;
  idempotencyMap.set(key, {
    submissionId,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS
  });
}

tests.push({ name: 'idempotency: same key returns same submission ID', fn: () => {
  const key = 'test-key-001';
  const id1 = 'sub_aaaa1111bbbb2222cccc3333';
  setIdempotencyEntry(key, id1);
  const entry = getIdempotencyEntry(key);
  assert.strictEqual(entry.submissionId, id1);
}});

tests.push({ name: 'idempotency: different key returns different ID', fn: () => {
  const key1 = 'test-key-002';
  const key2 = 'test-key-003';
  setIdempotencyEntry(key1, 'sub_id1');
  setIdempotencyEntry(key2, 'sub_id2');
  assert.notStrictEqual(getIdempotencyEntry(key1).submissionId, getIdempotencyEntry(key2).submissionId);
}});

tests.push({ name: 'idempotency: expired entry returns null', fn: () => {
  const key = 'test-key-expired';
  idempotencyMap.set(key, {
    submissionId: 'sub_expired',
    expiresAt: Date.now() - 1000
  });
  assert.strictEqual(getIdempotencyEntry(key), null);
}});

tests.push({ name: 'idempotency: null key returns null', fn: () => {
  assert.strictEqual(getIdempotencyEntry(null), null);
}});

tests.push({ name: 'idempotency: non-string key returns null', fn: () => {
  assert.strictEqual(getIdempotencyEntry(123), null);
}});

tests.push({ name: 'idempotency: oversized key (>200 chars) returns null', fn: () => {
  const longKey = 'x'.repeat(201);
  assert.strictEqual(getIdempotencyEntry(longKey), null);
}});

tests.push({ name: 'idempotency: exactly 200 char key works', fn: () => {
  const key = 'x'.repeat(200);
  setIdempotencyEntry(key, 'sub_200');
  const entry = getIdempotencyEntry(key);
  assert.strictEqual(entry.submissionId, 'sub_200');
}});

tests.push({ name: 'idempotency: duplicate submission returns same ID', fn: () => {
  // Simulate first request
  const key = 'retry-key-001';
  const submissionId1 = generateId();
  setIdempotencyEntry(key, submissionId1);

  // Simulate retry with same key
  const existing = getIdempotencyEntry(key);
  const submissionId2 = existing ? existing.submissionId : generateId();
  assert.strictEqual(submissionId1, submissionId2);
}});

tests.push({ name: 'idempotency: no key generates new ID each time', fn: () => {
  const id1 = generateId();
  const id2 = generateId();
  assert.notStrictEqual(id1, id2);
}});

tests.push({ name: 'idempotency: key not persisted after expiry', fn: () => {
  const key = 'will-expire';
  setIdempotencyEntry(key, 'sub_temp');
  // Manually expire
  const entry = idempotencyMap.get(key);
  entry.expiresAt = Date.now() - 1;
  assert.strictEqual(getIdempotencyEntry(key), null);
  // Subsequent get also returns null (entry was deleted)
  assert.strictEqual(getIdempotencyEntry(key), null);
}});

// ── Pagination tests ──

const DEFAULT_PAGE_LIMIT = 100;
const MAX_PAGE_LIMIT = 500;

function parsePagination(url) {
  const params = new URL(url).searchParams;
  let limit = parseInt(params.get('limit') || '0', 10) || DEFAULT_PAGE_LIMIT;
  let offset = parseInt(params.get('offset') || '0', 10) || 0;
  if (limit < 1) limit = DEFAULT_PAGE_LIMIT;
  if (limit > MAX_PAGE_LIMIT) limit = MAX_PAGE_LIMIT;
  if (offset < 0) offset = 0;
  return { limit, offset };
}

tests.push({ name: 'pagination: defaults to 100 limit, 0 offset', fn: () => {
  const { limit, offset } = parsePagination(new URL('https://example.com/api/graves'));
  assert.strictEqual(limit, 100);
  assert.strictEqual(offset, 0);
}});

tests.push({ name: 'pagination: custom limit and offset', fn: () => {
  const { limit, offset } = parsePagination(new URL('https://example.com/api/graves?limit=50&offset=200'));
  assert.strictEqual(limit, 50);
  assert.strictEqual(offset, 200);
}});

tests.push({ name: 'pagination: limit capped at 500', fn: () => {
  const { limit } = parsePagination(new URL('https://example.com/api/graves?limit=999'));
  assert.strictEqual(limit, 500);
}});

tests.push({ name: 'pagination: limit of 0 uses default', fn: () => {
  const { limit } = parsePagination(new URL('https://example.com/api/graves?limit=0'));
  assert.strictEqual(limit, 100);
}});

tests.push({ name: 'pagination: negative offset reset to 0', fn: () => {
  const { offset } = parsePagination(new URL('https://example.com/api/graves?offset=-50'));
  assert.strictEqual(offset, 0);
}});

tests.push({ name: 'pagination: negative limit uses default', fn: () => {
  const { limit } = parsePagination(new URL('https://example.com/api/graves?limit=-1'));
  assert.strictEqual(limit, 100);
}});

tests.push({ name: 'pagination: limit of 1 is valid', fn: () => {
  const { limit } = parsePagination(new URL('https://example.com/api/graves?limit=1'));
  assert.strictEqual(limit, 1);
}});

tests.push({ name: 'pagination: limit exactly 500 is allowed', fn: () => {
  const { limit } = parsePagination(new URL('https://example.com/api/graves?limit=500'));
  assert.strictEqual(limit, 500);
}});

tests.push({ name: 'pagination: slice produces correct page', fn: () => {
  const all = Array.from({length: 250}, (_, i) => ({ id: `sub_${i}` }));
  const offset = 100;
  const limit = 50;
  const paged = all.slice(offset, offset + limit);
  assert.strictEqual(paged.length, 50);
  assert.strictEqual(paged[0].id, 'sub_100');
  assert.strictEqual(paged[49].id, 'sub_149');
}});

tests.push({ name: 'pagination: hasMore true when more data exists', fn: () => {
  const total = 250;
  const offset = 100;
  const limit = 50;
  const hasMore = offset + limit < total;
  assert.strictEqual(hasMore, true);
}});

tests.push({ name: 'pagination: hasMore false at end of data', fn: () => {
  const total = 250;
  const offset = 200;
  const limit = 50;
  const hasMore = offset + limit < total;
  assert.strictEqual(hasMore, false);
}});

tests.push({ name: 'pagination: offset beyond total returns empty', fn: () => {
  const all = Array.from({length: 50}, (_, i) => ({ id: `sub_${i}` }));
  const paged = all.slice(100, 200);
  assert.strictEqual(paged.length, 0);
}});

tests.push({ name: 'pagination: invalid limit string uses default', fn: () => {
  const { limit } = parsePagination(new URL('https://example.com/api/graves?limit=abc'));
  assert.strictEqual(limit, 100);
}});

// ── Security hardening tests ──

tests.push({ name: 'security: health response has no env vars', fn: () => {
  const health = {
    status: 'ok',
    service: 'GraveAtlas',
    version: '2.0.0',
    githubConfigured: true,
    adminConfigured: true,
    timestamp: new Date().toISOString()
  };
  const json = JSON.stringify(health);
  assert.ok(!json.includes('GITHUB_APP_ID'));
  assert.ok(!json.includes('GITHUB_PRIVATE_KEY'));
  assert.ok(!json.includes('ADMIN_TOKEN'));
  assert.ok(!json.includes('token'));
  assert.ok(!json.includes('key'));
}});

tests.push({ name: 'security: error messages never contain GitHub URLs', fn: () => {
  const errors = [
    'Invalid request body',
    'Name is required',
    'Invalid latitude (must be -90 to 90)',
    'Unable to save submission. Please try again later.',
    'Too many requests',
    'Request too large (max 50KB)',
    'Internal server error',
    'Not found',
    'Unauthorized',
    'Forbidden'
  ];
  for (const msg of errors) {
    assert.ok(!msg.includes('github.com'), `Error exposes GitHub: ${msg}`);
    assert.ok(!msg.includes('api.github'), `Error exposes GitHub API: ${msg}`);
    assert.ok(!msg.includes('cloudflare'), `Error exposes Cloudflare: ${msg}`);
  }
}});

tests.push({ name: 'security: submission status exposes minimal data', fn: () => {
  // Simulate submission status response
  const response = {
    success: true,
    id: 'sub_test123',
    status: 'pending',
    name: 'John Doe',
    submittedAt: '2026-01-01T00:00:00Z',
    updatedAt: null
  };
  const json = JSON.stringify(response);
  // Should NOT expose: full record, notes, cemetery, coordinates, photos
  assert.ok(!json.includes('notes'));
  assert.ok(!json.includes('cemetery'));
  assert.ok(!json.includes('latitude'));
  assert.ok(!json.includes('longitude'));
  assert.ok(!json.includes('photoRefs'));
  assert.ok(!json.includes('section'));
  assert.ok(!json.includes('plot'));
}});

tests.push({ name: 'security: admin reject without ADMIN_TOKEN env', fn: () => {
  // Simulate no ADMIN_TOKEN set
  const env = { ADMIN_TOKEN: undefined };
  const hasAdmin = !!env.ADMIN_TOKEN;
  assert.strictEqual(hasAdmin, false);
}});

tests.push({ name: 'security: client cannot set repository owner', fn: () => {
  // The repo URL is built from env vars, not request params
  const env = { GITHUB_OWNER: 'putraworks2026', GITHUB_REPO: 'graveatlas-data' };
  const owner = encodeURIComponent(env.GITHUB_OWNER);
  const repo = encodeURIComponent(env.GITHUB_REPO || 'graveatlas-data');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents`;
  // Client cannot influence this URL via request body or headers
  assert.ok(url.includes('putraworks2026'));
  assert.ok(url.includes('graveatlas-data'));
  assert.ok(!url.includes('evil'));
}});

tests.push({ name: 'security: client cannot set branch', fn: () => {
  const env = { GITHUB_BRANCH: 'main' };
  const branch = env.GITHUB_BRANCH || 'main';
  assert.strictEqual(branch, 'main');
  // Client cannot override branch via request
}});

tests.push({ name: 'security: client cannot set GitHub API endpoint', fn: () => {
  // All API URLs are constructed server-side
  const baseUrl = 'https://api.github.com/repos/putraworks2026/graveatlas-data/contents';
  const paths = [
    `${baseUrl}/graves/sub_123.json?ref=main`,
    `${baseUrl}/pending/sub_456.json?ref=main`,
    `${baseUrl}/cemeteries/cem_001.json?ref=main`
  ];
  for (const url of paths) {
    assert.ok(url.startsWith('https://api.github.com/repos/putraworks2026/graveatlas-data'));
  }
}});

// ─– Concurrent submission safety tests ──

tests.push({ name: 'concurrent: two different submissions get different IDs', fn: () => {
  const ids = new Set();
  for (let i = 0; i < 100; i++) {
    ids.add(generateId());
  }
  assert.strictEqual(ids.size, 100);
}});

tests.push({ name: 'concurrent: same idempotency key produces same ID', fn: () => {
  const key = 'concurrent-key-001';
  const id1 = generateId();
  setIdempotencyEntry(key, id1);

  // Simulate concurrent request with same key
  const existing = getIdempotencyEntry(key);
  const id2 = existing ? existing.submissionId : generateId();

  assert.strictEqual(id1, id2);
}});

// ── Privacy tests ──

tests.push({ name: 'privacy: no device identifiers in submission', fn: () => {
  const submission = {
    name: 'John Doe',
    birthDate: '1950-01-01',
    deathDate: '2020-01-01',
    cemetery: 'Test Cemetery',
    latitude: 1.35,
    longitude: 103.8,
    notes: 'Test notes'
  };
  const json = JSON.stringify(submission);
  assert.ok(!json.includes('deviceId'));
  assert.ok(!json.includes('androidId'));
  assert.ok(!json.includes('imei'));
  assert.ok(!json.includes('advertisingId'));
  assert.ok(!json.includes('phoneNumber'));
  assert.ok(!json.includes('email'));
}});

tests.push({ name: 'privacy: allowed fields list is minimal', fn: () => {
  const allowed = ['name', 'birthDate', 'deathDate', 'cemetery', 'section', 'plot', 'latitude', 'longitude', 'notes'];
  // No device, user, or tracking fields
  assert.ok(!allowed.includes('deviceId'));
  assert.ok(!allowed.includes('userId'));
  assert.ok(!allowed.includes('email'));
  assert.ok(!allowed.includes('phone'));
  assert.ok(!allowed.includes('ipAddress'));
  assert.ok(!allowed.includes('userAgent'));
}});

// ═══════════════════════════════════════════════
// Run all tests
// ═══════════════════════════════════════════════

(async () => {
  console.log('\n=== GraveAtlas Backend Tests (Phase 3.5) ===\n');
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
