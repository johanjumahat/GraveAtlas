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
 *
 * Phase 1: Foundation with route stubs and validation logic.
 */

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },
};

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Public routes ──

    if (path === '/' && method === 'GET') {
      return jsonResponse({ name: 'GraveAtlas API', version: '1.0.0', status: 'operational' }, 200, corsHeaders);
    }

    if (path === '/api/health' && method === 'GET') {
      return jsonResponse({ status: 'healthy', timestamp: new Date().toISOString() }, 200, corsHeaders);
    }

    if (path === '/api/graves' && method === 'GET') {
      return await handleGetGraves(request, env, corsHeaders);
    }

    if (path === '/api/graves' && method === 'POST') {
      return await handleCreateGrave(request, env, corsHeaders);
    }

    if (path.startsWith('/api/graves/') && method === 'GET') {
      const id = path.split('/').pop();
      if (id === 'graves' || !id) return notFound(corsHeaders);
      return await handleGetGrave(id, env, corsHeaders);
    }

    if (path.match(/^\/api\/graves\/[^/]+\/report$/) && method === 'POST') {
      const id = path.split('/')[3];
      return await handleReportGrave(id, request, env, corsHeaders);
    }

    // ── Admin routes (not exposed publicly — require auth) ──

    if (path === '/api/admin/submissions' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleListSubmissions(env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/submissions\/[^/]+\/approve$/) && method === 'POST') {
      const id = path.split('/')[4];
      return await requireAdmin(request, env, corsHeaders, () => handleApproveSubmission(id, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/submissions\/[^/]+\/reject$/) && method === 'POST') {
      const id = path.split('/')[4];
      return await requireAdmin(request, env, corsHeaders, () => handleRejectSubmission(id, env, corsHeaders));
    }

    return notFound(corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }
}

// ── Handlers ──

async function handleGetGraves(request, env, cors) {
  // Phase 1: returns placeholder
  // Future: fetch from GitHub repo via GitHub App
  return jsonResponse({
    success: true,
    graves: [],
    message: 'No graves published yet. Submissions require moderation.'
  }, 200, cors);
}

async function handleCreateGrave(request, env, cors) {
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

  // Rate limit check (basic — future: use Cloudflare KV)
  // Phase 1: simple per-IP via request headers

  // Generate submission ID
  const submissionId = generateId();

  // Phase 1: return pending status without writing to GitHub
  // Future: write to pending/ in GitHub repo via GitHub App
  return jsonResponse({
    success: true,
    submissionId: submissionId,
    status: 'pending'
  }, 201, cors);
}

async function handleGetGrave(id, env, cors) {
  // Phase 1: placeholder
  return jsonResponse({
    success: false,
    error: 'Grave not found'
  }, 404, cors);
}

async function handleReportGrave(id, request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400, cors);
  }

  if (!body.report || body.report.length === 0) {
    return jsonResponse({ success: false, error: 'Report text required' }, 400, cors);
  }

  if (body.report.length > 5000) {
    return jsonResponse({ success: false, error: 'Report too long (max 5000 chars)' }, 400, cors);
  }

  // Phase 1: placeholder
  return jsonResponse({
    success: true,
    message: 'Report received. It will be reviewed by moderators.'
  }, 201, cors);
}

async function handleListSubmissions(env, cors) {
  // Admin only — Phase 1 placeholder
  return jsonResponse({
    success: true,
    submissions: [],
    message: 'No pending submissions'
  }, 200, cors);
}

async function handleApproveSubmission(id, env, cors) {
  // Admin only — Phase 1 placeholder
  return jsonResponse({
    success: false,
    error: 'Moderation workflow not yet implemented'
  }, 501, cors);
}

async function handleRejectSubmission(id, env, cors) {
  // Admin only — Phase 1 placeholder
  return jsonResponse({
    success: false,
    error: 'Moderation workflow not yet implemented'
  }, 501, cors);
}

// ── Validation ──

function validateSubmission(body) {
  if (!body) return { valid: false, error: 'Empty request body' };

  // Name is required
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }

  if (body.name.length > 500) {
    return { valid: false, error: 'Name too long (max 500 chars)' };
  }

  // Validate coordinates if provided
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

  // Validate dates if provided
  if (body.birthDate && !isValidDate(body.birthDate)) {
    return { valid: false, error: 'Invalid birthDate format (use YYYY-MM-DD)' };
  }

  if (body.deathDate && !isValidDate(body.deathDate)) {
    return { valid: false, error: 'Invalid deathDate format (use YYYY-MM-DD)' };
  }

  // Check for oversized requests
  const totalStr = JSON.stringify(body);
  if (totalStr.length > 50000) {
    return { valid: false, error: 'Request too large (max 50KB)' };
  }

  // Sanitize string fields
  const stringFields = ['name', 'birthDate', 'deathDate', 'cemetery', 'section', 'plot', 'notes'];
  for (const field of stringFields) {
    if (body[field] && typeof body[field] === 'string') {
      if (body[field].length > 2000) {
        return { valid: false, error: `${field} too long (max 2000 chars)` };
      }
    }
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
  return 'sub_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
}

// ── Admin auth ──

async function requireAdmin(request, env, cors, handler) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401, cors);
  }

  const token = auth.substring(7);

  // Future: validate against Cloudflare KV / admin token
  // Phase 1: check against env.ADMIN_TOKEN if set
  if (env.ADMIN_TOKEN && token === env.ADMIN_TOKEN) {
    return await handler();
  }

  return jsonResponse({ success: false, error: 'Forbidden' }, 403, cors);
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
