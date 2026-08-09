/**
 * GraveAtlas Backend API — Cloudflare Worker
 *
 * Architecture:
 *   Android App → HTTPS → Cloudflare Worker → GitHub App → GitHub Repo (graveatlas-data)
 *
 * Security:
 *   - No secrets in Android app
 *   - GitHub App authentication (not personal token)
 *   - Submissions enter "pending" state — never auto-published
 *   - Rate limiting, input validation, duplicate detection
 *   - Constant-time admin token comparison
 *   - Path sanitization (no traversal)
 *   - Crypto-secure ID generation
 *
 * Phase 2: Full GitHub integration with moderation workflow.
 */

import { getToken, writeFile, readFile, listFiles, deleteFile, sanitizePathSegment } from './github.js';

// ── Constants ──

const MAX_BODY_SIZE = 50 * 1024; // 50 KB
const MAX_FIELD_LENGTH = 2000;
const MAX_NAME_LENGTH = 500;
const MAX_REPORT_LENGTH = 5000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // per IP per window
const ALLOWED_FIELDS = ['name', 'birthDate', 'deathDate', 'cemetery', 'section', 'plot', 'latitude', 'longitude', 'notes'];
const DEFAULT_PAGE_LIMIT = 100;
const MAX_PAGE_LIMIT = 500;
const IDEMPOTENCY_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── In-memory rate limiting (per Worker isolate) ──

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

// Cleanup old entries periodically
function cleanupRateLimit() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}

// ── In-memory idempotency cache (per Worker isolate) ──
// Maps Idempotency-Key → { submissionId, timestamp }
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
  if (idempotencyMap.size > 1000) {
    // Prevent unbounded growth — clear expired entries
    const now = Date.now();
    for (const [k, v] of idempotencyMap) {
      if (now > v.expiresAt) idempotencyMap.delete(k);
    }
  }
  idempotencyMap.set(key, {
    submissionId,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS
  });
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },
};

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Build CORS headers — configurable via ALLOWED_ORIGIN
  const corsHeaders = buildCorsHeaders(env);

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Periodic cleanup
  cleanupRateLimit();

  try {
    // ── Public routes ──

    if (path === '/' && method === 'GET') {
      return jsonResponse({ name: 'GraveAtlas API', version: '2.0.0', status: 'operational' }, 200, corsHeaders);
    }

    if (path === '/api/health' && method === 'GET') {
      return await handleHealth(request, env, corsHeaders);
    }

    if (path === '/api/graves' && method === 'GET') {
      return await handleGetGraves(request, env, corsHeaders);
    }

    if (path === '/api/graves' && method === 'POST') {
      // Rate limit submission endpoint
      const ip = getClientIp(request);
      const rl = checkRateLimit(ip);
      if (!rl.allowed) {
        return jsonResponse({ success: false, error: 'Too many requests' }, 429, corsHeaders);
      }
      return await handleCreateGrave(request, env, corsHeaders);
    }

    if (path.startsWith('/api/graves/') && method === 'GET') {
      const id = path.split('/').pop();
      if (id === 'graves' || !id) return notFound(corsHeaders);
      return await handleGetGrave(id, request, env, corsHeaders);
    }

    if (path.match(/^\/api\/graves\/[^/]+\/report$/) && method === 'POST') {
      const id = path.split('/')[3];
      // Rate limit report endpoint
      const ip = getClientIp(request);
      const rl = checkRateLimit(ip);
      if (!rl.allowed) {
        return jsonResponse({ success: false, error: 'Too many requests' }, 429, corsHeaders);
      }
      return await handleReportGrave(id, request, env, corsHeaders);
    }

    // ── Cemetery routes ──

    if (path === '/api/cemeteries' && method === 'GET') {
      return await handleGetCemeteries(request, env, corsHeaders);
    }

    if (path.startsWith('/api/cemeteries/') && method === 'GET') {
      const id = path.split('/').pop();
      if (id === 'cemeteries' || !id) return notFound(corsHeaders);
      return await handleGetCemetery(id, request, env, corsHeaders);
    }

    // ── Submission status (public, by submission ID) ──

    if (path.startsWith('/api/submissions/') && method === 'GET') {
      const id = path.split('/').pop();
      if (id === 'submissions' || !id) return notFound(corsHeaders);
      return await handleGetSubmissionStatus(id, request, env, corsHeaders);
    }

    // ── Admin routes (auth-protected) ──

    if (path === '/api/admin/submissions' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleListSubmissions(env, corsHeaders));
    }

    if (path === '/api/admin/reports' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleListReports(env, corsHeaders));
    }

    if (path === '/api/admin/status' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleAdminStatus(env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/submissions\/[^/]+\/approve$/) && method === 'POST') {
      const id = path.split('/')[4];
      return await requireAdmin(request, env, corsHeaders, () => handleApproveSubmission(id, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/submissions\/[^/]+\/reject$/) && method === 'POST') {
      const id = path.split('/')[4];
      return await requireAdmin(request, env, corsHeaders, () => handleRejectSubmission(id, request, env, corsHeaders));
    }

    return notFound(corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }
}

// ── CORS ──

function buildCorsHeaders(env) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Only set Allow-Origin if explicitly configured (e.g., for a web admin UI).
  // Android native clients do not need CORS.
  if (env.ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = env.ALLOWED_ORIGIN;
  }

  return headers;
}

// ── Client IP ──

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Real-IP') ||
         'unknown';
}

// ── Handlers ──

// ── Pagination parser ──
function parsePagination(url) {
  const params = url.searchParams;
  let limit = parseInt(params.get('limit') || '0', 10) || DEFAULT_PAGE_LIMIT;
  let offset = parseInt(params.get('offset') || '0', 10) || 0;
  if (limit < 1) limit = DEFAULT_PAGE_LIMIT;
  if (limit > MAX_PAGE_LIMIT) limit = MAX_PAGE_LIMIT;
  if (offset < 0) offset = 0;
  return { limit, offset };
}

async function handleHealth(request, env, cors) {
  const hasGithubConfig = !!(env.GITHUB_APP_ID && env.GITHUB_PRIVATE_KEY && env.GITHUB_INSTALLATION_ID);
  const hasAdminToken = !!env.ADMIN_TOKEN;

  return jsonResponse({
    status: 'ok',
    service: 'GraveAtlas',
    version: '2.0.0',
    githubConfigured: hasGithubConfig,
    adminConfigured: hasAdminToken,
    timestamp: new Date().toISOString()
  }, 200, cors);
}

async function handleGetGraves(request, env, cors) {
  const { limit, offset } = parsePagination(new URL(request.url));

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      graves: [],
      count: 0,
      limit,
      offset,
      hasMore: false,
      message: 'GitHub not configured. Deploy with secrets to enable data access.'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const allGraves = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await readFile(`graves/${file}`, env);
      if (content) {
        try {
          const record = JSON.parse(content);
          if (record.status === 'published') {
            allGraves.push(record);
          }
        } catch (e) { /* skip invalid JSON */ }
      }
    }

    // Apply pagination
    const total = allGraves.length;
    const paged = allGraves.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return jsonResponse({
      success: true,
      graves: paged,
      count: paged.length,
      total,
      limit,
      offset,
      hasMore
    }, 200, cors);
  } catch (error) {
    // GitHub upstream error — return safe message
    return jsonResponse({
      success: true,
      graves: [],
      count: 0,
      limit,
      offset,
      hasMore: false,
      message: 'Unable to fetch from data repository.'
    }, 200, cors);
  }
}

async function handleCreateGrave(request, env, cors) {
  // Check Content-Length to reject oversized payloads early
  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > MAX_BODY_SIZE) {
    return jsonResponse({ success: false, error: 'Request too large (max 50KB)' }, 413, cors);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400, cors);
  }

  // Validate
  const validation = validateSubmission(body);
  if (!validation.valid) {
    return jsonResponse({ success: false, error: validation.error }, 400, cors);
  }

  // Check idempotency key — if provided and seen before, return original response
  const idempotencyKey = request.headers.get('Idempotency-Key');
  if (idempotencyKey) {
    const existing = getIdempotencyEntry(idempotencyKey);
    if (existing) {
      return jsonResponse({
        success: true,
        submissionId: existing.submissionId,
        status: 'pending'
      }, 201, cors);
    }
  }

  // Generate submission ID using crypto-secure randomness
  const submissionId = generateId();
  const now = new Date().toISOString();

  // Build the record
  const record = {
    id: submissionId,
    name: body.name,
    birthDate: body.birthDate || null,
    deathDate: body.deathDate || null,
    cemetery: body.cemetery || null,
    section: body.section || null,
    plot: body.plot || null,
    latitude: body.latitude !== undefined ? body.latitude : null,
    longitude: body.longitude !== undefined ? body.longitude : null,
    photoRefs: null,
    notes: body.notes || null,
    source: 'user_submission',
    status: 'pending',
    submittedAt: now,
    updatedAt: null
  };

  // Write to GitHub pending/ directory (if configured)
  if (env.GITHUB_APP_ID) {
    try {
      await writeFile(
        `pending/${submissionId}.json`,
        JSON.stringify(record, null, 2),
        env,
        `submission: ${body.name} (pending review)`
      );
    } catch (error) {
      // GitHub upstream error
      return jsonResponse({
        success: false,
        error: 'Unable to save submission. Please try again later.'
      }, 502, cors);
    }
  }

  // Store idempotency entry for duplicate protection
  if (idempotencyKey) {
    setIdempotencyEntry(idempotencyKey, submissionId);
  }

  return jsonResponse({
    success: true,
    submissionId: submissionId,
    status: 'pending'
  }, 201, cors);
}

async function handleGetGrave(id, request, env, cors) {
  // Sanitize ID to prevent path traversal
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid grave ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'Grave not found' }, 404, cors);
  }

  try {
    const content = await readFile(`graves/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Grave not found' }, 404, cors);
    }

    const record = JSON.parse(content);
    return jsonResponse(record, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Grave not found' }, 404, cors);
  }
}

async function handleReportGrave(id, request, env, cors) {
  // Sanitize ID
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid grave ID' }, 400, cors);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400, cors);
  }

  if (!body.report || typeof body.report !== 'string' || body.report.trim().length === 0) {
    return jsonResponse({ success: false, error: 'Report text required' }, 400, cors);
  }

  if (body.report.length > MAX_REPORT_LENGTH) {
    return jsonResponse({ success: false, error: 'Report too long (max 5000 chars)' }, 400, cors);
  }

  if (env.GITHUB_APP_ID) {
    try {
      const reportId = generateId();
      const reportRecord = {
        id: reportId,
        graveId: safeId,
        report: body.report,
        status: 'reported',
        submittedAt: new Date().toISOString()
      };
      await writeFile(
        `pending/report_${reportId}.json`,
        JSON.stringify(reportRecord, null, 2),
        env,
        `report: correction for ${safeId}`
      );
    } catch (error) {
      // Don't expose internal errors — still return success
    }
  }

  return jsonResponse({
    success: true,
    message: 'Report received. It will be reviewed by moderators.'
  }, 201, cors);
}

// ── Cemetery Handlers ──

async function handleGetCemeteries(request, env, cors) {
  const { limit, offset } = parsePagination(new URL(request.url));

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      cemeteries: [],
      count: 0,
      limit,
      offset,
      hasMore: false,
      message: 'GitHub not configured.'
    }, 200, cors);
  }

  try {
    const files = await listFiles('cemeteries', env);
    const allCemeteries = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await readFile(`cemeteries/${file}`, env);
      if (content) {
        try {
          const record = JSON.parse(content);
          if (record.status === 'published') {
            allCemeteries.push(record);
          }
        } catch (e) { /* skip invalid JSON */ }
      }
    }

    const total = allCemeteries.length;
    const paged = allCemeteries.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return jsonResponse({
      success: true,
      cemeteries: paged,
      count: paged.length,
      total,
      limit,
      offset,
      hasMore
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: true,
      cemeteries: [],
      count: 0,
      limit,
      offset,
      hasMore: false,
      message: 'Unable to fetch cemeteries.'
    }, 200, cors);
  }
}

async function handleGetCemetery(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'Cemetery not found' }, 404, cors);
  }

  try {
    const content = await readFile(`cemeteries/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Cemetery not found' }, 404, cors);
    }

    const record = JSON.parse(content);
    if (record.status !== 'published') {
      return jsonResponse({ success: false, error: 'Cemetery not found' }, 404, cors);
    }

    return jsonResponse(record, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Cemetery not found' }, 404, cors);
  }
}

// ── Submission Status Handler ──

async function handleGetSubmissionStatus(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid submission ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'Submission not found' }, 404, cors);
  }

  // Check published graves first
  try {
    const graveContent = await readFile(`graves/${safeId}.json`, env);
    if (graveContent) {
      const record = JSON.parse(graveContent);
      return jsonResponse({
        success: true,
        id: safeId,
        status: 'published',
        name: record.name || null,
        cemetery: record.cemetery || null
      }, 200, cors);
    }
  } catch (e) { /* not in graves */ }

  // Check pending submissions
  try {
    const pendingContent = await readFile(`pending/${safeId}.json`, env);
    if (pendingContent) {
      const record = JSON.parse(pendingContent);
      // Only return status, not full record data
      return jsonResponse({
        success: true,
        id: safeId,
        status: record.status || 'pending',
        name: record.name || null,
        submittedAt: record.submittedAt || null,
        updatedAt: record.updatedAt || null
      }, 200, cors);
    }
  } catch (e) { /* not in pending */ }

  return jsonResponse({ success: false, error: 'Submission not found' }, 404, cors);
}

// ── Admin Handlers ──

async function handleListSubmissions(env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      submissions: [],
      message: 'GitHub not configured.'
    }, 200, cors);
  }

  try {
    const files = await listFiles('pending', env);
    const submissions = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      // Skip report files — those are listed via /api/admin/reports
      if (file.startsWith('report_')) continue;

      const content = await readFile(`pending/${file}`, env);
      if (content) {
        try {
          const record = JSON.parse(content);
          submissions.push(record);
        } catch (e) { /* skip */ }
      }
    }

    return jsonResponse({ success: true, submissions, count: submissions.length }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, submissions: [], message: 'Unable to fetch submissions.' }, 200, cors);
  }
}

async function handleListReports(env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      reports: [],
      message: 'GitHub not configured.'
    }, 200, cors);
  }

  try {
    const files = await listFiles('pending', env);
    const reports = [];

    for (const file of files) {
      if (!file.endsWith('.json') || !file.startsWith('report_')) continue;

      const content = await readFile(`pending/${file}`, env);
      if (content) {
        try {
          const record = JSON.parse(content);
          if (record.status === 'reported') {
            reports.push(record);
          }
        } catch (e) { /* skip */ }
      }
    }

    return jsonResponse({ success: true, reports, count: reports.length }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, reports: [], message: 'Unable to fetch reports.' }, 200, cors);
  }
}

async function handleAdminStatus(env, cors) {
  const hasGithubConfig = !!(env.GITHUB_APP_ID && env.GITHUB_PRIVATE_KEY && env.GITHUB_INSTALLATION_ID);
  const hasAdminToken = !!env.ADMIN_TOKEN;

  let pendingCount = 0;
  let publishedCount = 0;
  let reportCount = 0;

  if (env.GITHUB_APP_ID) {
    try {
      const pendingFiles = await listFiles('pending', env);
      pendingCount = pendingFiles.filter(f => f.endsWith('.json') && !f.startsWith('report_')).length;
      reportCount = pendingFiles.filter(f => f.startsWith('report_')).length;

      const graveFiles = await listFiles('graves', env);
      publishedCount = graveFiles.filter(f => f.endsWith('.json')).length;
    } catch (e) { /* ignore */ }
  }

  return jsonResponse({
    success: true,
    status: {
      githubConfigured: hasGithubConfig,
      adminConfigured: hasAdminToken,
      pendingSubmissions: pendingCount,
      publishedGraves: publishedCount,
      pendingReports: reportCount
    }
  }, 200, cors);
}

async function handleApproveSubmission(id, env, cors) {
  // Sanitize ID
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid submission ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  try {
    // Read the pending submission
    const content = await readFile(`pending/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Submission not found' }, 404, cors);
    }

    const record = JSON.parse(content);

    // Don't approve reports
    if (record.status === 'reported') {
      return jsonResponse({ success: false, error: 'Cannot approve a report as a grave submission' }, 400, cors);
    }

    // Update status to published
    record.status = 'published';
    record.updatedAt = new Date().toISOString();

    // Write to graves/ directory
    await writeFile(
      `graves/${record.id}.json`,
      JSON.stringify(record, null, 2),
      env,
      `approve: ${record.name} published`
    );

    // Delete from pending/
    try {
      await deleteFile(`pending/${safeId}.json`, env, `Remove approved submission ${safeId} from pending`);
    } catch (e) {
      // Non-fatal — submission is already published
    }

    return jsonResponse({
      success: true,
      message: `Submission ${safeId} approved and published`,
      graveId: record.id
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to approve submission' }, 500, cors);
  }
}

async function handleRejectSubmission(id, request, env, cors) {
  // Sanitize ID
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid submission ID' }, 400, cors);
  }

  let body = {};
  try { body = await request.json(); } catch (e) {}

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  try {
    const content = await readFile(`pending/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Submission not found' }, 404, cors);
    }

    const record = JSON.parse(content);
    record.status = 'rejected';
    record.updatedAt = new Date().toISOString();
    if (body.reason && typeof body.reason === 'string' && body.reason.length <= MAX_FIELD_LENGTH) {
      record.rejectionReason = body.reason;
    }

    // Update the file in pending/ with rejected status
    await writeFile(
      `pending/${safeId}.json`,
      JSON.stringify(record, null, 2),
      env,
      `reject: submission ${safeId} rejected`
    );

    return jsonResponse({
      success: true,
      message: `Submission ${safeId} rejected`
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to reject submission' }, 500, cors);
  }
}

// ── Validation ──

function validateSubmission(body) {
  if (!body) return { valid: false, error: 'Empty request body' };

  if (typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Invalid request body' };
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }

  if (body.name.length > MAX_NAME_LENGTH) {
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
  if (totalStr.length > MAX_BODY_SIZE) {
    return { valid: false, error: 'Request too large (max 50KB)' };
  }

  const stringFields = ['name', 'birthDate', 'deathDate', 'cemetery', 'section', 'plot', 'notes'];
  for (const field of stringFields) {
    if (body[field] && typeof body[field] === 'string') {
      if (body[field].length > MAX_FIELD_LENGTH) {
        return { valid: false, error: `${field} too long (max ${MAX_FIELD_LENGTH} chars)` };
      }
    }
  }

  // Reject unexpected fields to prevent injection of arbitrary data
  const unexpectedFields = Object.keys(body).filter(k => !ALLOWED_FIELDS.includes(k));
  if (unexpectedFields.length > 0) {
    return { valid: false, error: 'Invalid request' };
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

function generateId() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `sub_${hex}`;
}

// ── Admin auth ──

async function requireAdmin(request, env, cors, handler) {
  if (!env.ADMIN_TOKEN) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401, cors);
  }

  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401, cors);
  }

  const token = auth.substring(7);

  // Constant-time comparison to prevent timing attacks
  if (safeTokenCompare(token, env.ADMIN_TOKEN)) {
    return await handler();
  }

  return jsonResponse({ success: false, error: 'Forbidden' }, 403, cors);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Compares two strings of equal length without short-circuiting.
 */
function safeTokenCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ── Utils ──

function jsonResponse(data, status, cors = {}) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      ...cors,
    },
  });
}

function notFound(cors) {
  return jsonResponse({ success: false, error: 'Not found' }, 404, cors);
}
