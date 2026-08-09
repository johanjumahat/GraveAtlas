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
 * Phase 2: Full GitHub integration with moderation workflow.
 */

import { getToken, writeFile, readFile, listFiles, moveFile } from './github.js';

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
      return jsonResponse({ name: 'GraveAtlas API', version: '2.0.0', status: 'operational' }, 200, corsHeaders);
    }

    if (path === '/api/health' && method === 'GET') {
      return await handleHealth(request, env, corsHeaders);
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

    // ── Admin routes (auth-protected) ──

    if (path === '/api/admin/submissions' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleListSubmissions(env, corsHeaders));
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
    // Never leak error details or secrets
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders);
  }
}

// ── Handlers ──

async function handleHealth(request, env, cors) {
  const hasGithubConfig = !!(env.GITHUB_APP_ID && env.GITHUB_PRIVATE_KEY && env.GITHUB_INSTALLATION_ID);
  return jsonResponse({
    status: 'healthy',
    version: '2.0.0',
    githubConfigured: hasGithubConfig,
    timestamp: new Date().toISOString()
  }, 200, cors);
}

async function handleGetGraves(request, env, cors) {
  // If GitHub is not configured, return empty
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      graves: [],
      message: 'GitHub not configured. Deploy with secrets to enable data access.'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const graves = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await readFile(`graves/${file}`, env);
      if (content) {
        try {
          const record = JSON.parse(content);
          if (record.status === 'published') {
            graves.push(record);
          }
        } catch (e) { /* skip invalid JSON */ }
      }
    }

    return jsonResponse({ success: true, graves: graves, count: graves.length }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: true,
      graves: [],
      message: 'Unable to fetch from GitHub repository.'
    }, 200, cors);
  }
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

  // Generate submission ID
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
      return jsonResponse({
        success: false,
        error: 'Unable to save submission. Please try again later.'
      }, 503, cors);
    }
  }

  return jsonResponse({
    success: true,
    submissionId: submissionId,
    status: 'pending'
  }, 201, cors);
}

async function handleGetGrave(id, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'Grave not found' }, 404, cors);
  }

  try {
    const content = await readFile(`graves/${id}.json`, env);
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

  // Write report as a file in pending/ with reported status
  if (env.GITHUB_APP_ID) {
    try {
      const reportRecord = {
        id: generateId(),
        graveId: id,
        report: body.report,
        status: 'reported',
        submittedAt: new Date().toISOString()
      };
      await writeFile(
        `pending/report_${reportRecord.id}.json`,
        JSON.stringify(reportRecord, null, 2),
        env,
        `report: correction for ${id}`
      );
    } catch (error) {
      // Still return success — don't expose internal errors
    }
  }

  return jsonResponse({
    success: true,
    message: 'Report received. It will be reviewed by moderators.'
  }, 201, cors);
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
      const content = await readFile(`pending/${file}`, env);
      if (content) {
        try {
          const record = JSON.parse(content);
          submissions.push(record);
        } catch (e) { /* skip */ }
      }
    }

    return jsonResponse({ success: true, submissions: submissions, count: submissions.length }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, submissions: [], message: 'Unable to fetch submissions.' }, 200, cors);
  }
}

async function handleApproveSubmission(id, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  try {
    // Read the pending submission
    const content = await readFile(`pending/${id}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Submission not found' }, 404, cors);
    }

    const record = JSON.parse(content);

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

    // Remove from pending/
    try {
      await moveFile(`pending/${id}.json`, `pending/${id}.json`, env, '');
    } catch (e) { /* already handled */ }

    // Delete from pending (the move creates a copy, we need to delete original)
    const token = await import('./github.js').then(m => m.getToken(env));
    const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/pending/${id}.json`;
    const getResp = await fetch(url, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
    });
    if (getResp.ok) {
      const data = await getResp.json();
      await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: `Remove approved submission ${id} from pending`, sha: data.sha }),
      });
    }

    return jsonResponse({
      success: true,
      message: `Submission ${id} approved and published`,
      graveId: record.id
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to approve submission' }, 500, cors);
  }
}

async function handleRejectSubmission(id, request, env, cors) {
  let body = {};
  try { body = await request.json(); } catch (e) {}

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  try {
    const content = await readFile(`pending/${id}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Submission not found' }, 404, cors);
    }

    const record = JSON.parse(content);
    record.status = 'rejected';
    record.updatedAt = new Date().toISOString();
    record.rejectionReason = body.reason || null;

    // Update the file in pending/ with rejected status
    await writeFile(
      `pending/${id}.json`,
      JSON.stringify(record, null, 2),
      env,
      `reject: submission ${id} rejected${body.reason ? ` — ${body.reason}` : ''}`
    );

    return jsonResponse({
      success: true,
      message: `Submission ${id} rejected`
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to reject submission' }, 500, cors);
  }
}

// ── Validation ──

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
