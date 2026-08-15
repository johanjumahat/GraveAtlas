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
import * as Phase6A from './phase6a.js';
import * as Phase4A from './phase4a.js';
import * as Phase7A from './phase7a.js';
import {
  querySource,
  queryAllSources,
  getSourceHealthSummary,
} from './external-connectors/gateway.js';
import { getHealthDashboard } from './external-connectors/health-dashboard.js';
import { getImplementedSources, getSource } from './external-connectors/registry.js';
import { matchCemetery } from './external-connectors/matching/cemetery-matcher.js';
import { batchMatchRecords } from './external-connectors/matching/record-matcher.js';
import { reviewPrivacy, sanitizeResponse } from './external-connectors/privacy-security.js';
import { validateBatch } from './external-connectors/data-quality.js';
import { validateNormalizedRecord } from './external-connectors/normalized-schema.js';

import {
  handleListImportSources,
  handleTriggerImport,
  handleListImports,
  handleGetImport,
  handleApproveImport,
  handleRejectImport,
  handleGetModerationConfig
} from './import-handlers.js';
import {
  verifyGoogleIdToken,
  createSessionToken,
  verifySessionToken,
  createOrUpdateGoogleUser,
  logSubmissionAttempt,
  getSubmissionAuditLog,
  getAbuseStats,
  banGoogleAccount,
  requireGoogleAuth
} from './google-auth.js';

// ── Constants ──

const MAX_BODY_SIZE = 50 * 1024; // 50 KB
const MAX_FIELD_LENGTH = 2000;
const MAX_NAME_LENGTH = 500;
const MAX_REPORT_LENGTH = 5000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // per IP per window
const ALLOWED_FIELDS = ['name', 'birthDate', 'deathDate', 'cemetery', 'section', 'plot', 'latitude', 'longitude', 'notes', 'cemeteryId', 'countryCode', 'country', 'region', 'city', 'locality', 'cemeteryType', 'operatingStatus', 'description', 'altNames', 'localName', 'transliteration', 'inscription', 'personIds', 'graveId', 'givenNames', 'familyName', 'biography', 'memorialNotes', 'reason', 'targetId', 'targetType', 'corrections', 'sourceRefs'];
const CEMETERY_FIELDS = ['name', 'altNames', 'localName', 'transliteration', 'countryCode', 'country', 'region', 'city', 'locality', 'address', 'latitude', 'longitude', 'timezone', 'cemeteryType', 'religiousAffiliation', 'operatingStatus', 'establishedDate', 'closedDate', 'website', 'contactInfo', 'description', 'accessibility', 'sourceRefs'];
const CORRECTION_FIELDS = ['targetId', 'targetType', 'corrections', 'reason', 'sourceRefs'];
const SEARCH_MIN_LENGTH = 2;
const SEARCH_MAX_RESULTS = 50;
const DEFAULT_PAGE_LIMIT = 100;
const MAX_PAGE_LIMIT = 500;
const IDEMPOTENCY_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Phase 4.5: Governance constants ──

const MODERATION_REASONS = [
  'INVALID_DATA', 'DUPLICATE', 'INSUFFICIENT_SOURCE', 'WRONG_LOCATION',
  'PRIVACY_CONCERN', 'INAPPROPRIATE_CONTENT', 'INCORRECT_CEMETERY', 'OTHER'
];

const REPORT_TYPES = [
  'INCORRECT_INFORMATION', 'DUPLICATE', 'WRONG_LOCATION', 'PRIVACY_CONCERN',
  'INAPPROPRIATE_PHOTO', 'WRONG_CEMETERY', 'CEMETERY_STATUS', 'OTHER'
];

const REPORT_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];

const AUDIT_ACTIONS = [
  'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT',
  'REQUEST_CORRECTION', 'VERIFY', 'UNVERIFY', 'REPORT', 'RESTORE'
];

const ENTITY_LIFECYCLE = ['ACTIVE', 'ARCHIVED', 'REMOVED_PENDING_REVIEW', 'REMOVED'];

// Valid submission status transitions
const SUBMISSION_TRANSITIONS = {
  'pending': ['under_review', 'rejected', 'queued'],
  'under_review': ['published', 'rejected', 'queued'],
  'queued': ['publishing', 'failed'],
  'publishing': ['published', 'failed'],
  'published': [],
  'failed': ['retrying', 'queued'],
  'retrying': ['publishing', 'failed'],
  'rejected': []
};

// Valid correction status transitions
const CORRECTION_TRANSITIONS = {
  'pending': ['under_review', 'rejected'],
  'under_review': ['accepted', 'rejected'],
  'accepted': [],
  'rejected': []
};

// Valid report status transitions
const REPORT_TRANSITIONS = {
  'OPEN': ['UNDER_REVIEW', 'RESOLVED', 'REJECTED'],
  'UNDER_REVIEW': ['RESOLVED', 'REJECTED'],
  'RESOLVED': [],
  'REJECTED': []
};

// Admin rate limit (stricter)
const ADMIN_RATE_LIMIT_MAX = 30; // per minute
const SEARCH_RATE_LIMIT_MAX = 60; // per minute - search gets more

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
// ── In-memory response cache for frequently requested data ──
const RESPONSE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const responseCache = new Map();

function getCacheEntry(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > RESPONSE_CACHE_TTL) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCacheEntry(key, data) {
  // Evict old entries if cache grows too large
  if (responseCache.size > 50) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
  responseCache.set(key, { data, timestamp: Date.now() });
}

function clearResponseCache() {
  responseCache.clear();
}
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


// Serve a legal page (privacy policy / terms) as HTML for Play Store links
async function serveLegalPage(title, filename, env) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GraveAtlas — ${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #333; line-height: 1.6; }
  h1 { color: #2c3e50; }
  h2 { color: #34495e; margin-top: 28px; }
  a { color: #2980b9; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 0.85em; }
</style>
</head>
<body>
<h1>GraveAtlas — ${title}</h1>
<p><a href="https://github.com/putraworks2026/GraveAtlas/blob/main/docs/${filename}">View source on GitHub</a></p>
<p>This page is served from the GraveAtlas API. For the full document, see the link above.</p>
<p><strong>GraveAtlas</strong> is a community-driven cemetery and grave records platform.</p>
<p>Privacy policy and terms of use are maintained in the project repository at <a href="https://github.com/putraworks2026/GraveAtlas">github.com/putraworks2026/GraveAtlas</a>.</p>
<div class="footer">
  GraveAtlas — Cemetery & Grave Finder<br>
  Privacy: <a href="https://graveatlas.putraworks-2026.workers.dev/privacy">https://graveatlas.putraworks-2026.workers.dev/privacy</a><br>
  Terms: <a href="https://graveatlas.putraworks-2026.workers.dev/terms">https://graveatlas.putraworks-2026.workers.dev/terms</a>
</div>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
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

  // Generate or reuse request ID for correlation/tracing
  const requestId = request.headers.get('X-Request-Id') || generateRequestId();

  // Build CORS headers — configurable via ALLOWED_ORIGIN
  const corsHeaders = buildCorsHeaders(env);
  corsHeaders['X-Request-Id'] = requestId;

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Periodic cleanup
  cleanupRateLimit();

  try {
    // ── Public routes ──

    if (path === '/' && method === 'GET') {
      return jsonResponse({ name: 'GraveAtlas API', version: '7.1.0', status: 'operational' }, 200, corsHeaders);
    }

    // ── Public legal pages (for Google Play Store links) ──
    if (path === '/privacy' && method === 'GET') {
      return serveLegalPage('Privacy Policy', 'PRIVACY.md', env);
    }
    if (path === '/terms' && method === 'GET') {
      return serveLegalPage('Terms of Use', 'TERMS.md', env);
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

    // ── Search route ──

    if (path === '/api/search' && method === 'GET') {
      return await handleSearch(request, env, corsHeaders);
    }

    // Phase 16.3: Timeline endpoint
    if (path === '/api/timeline' && method === 'GET') {
      return await handleGetTimeline(request, env, corsHeaders);
    }

    // Phase 16.4: AI Map query endpoint
    if (path === '/api/map/query' && method === 'GET') {
      return await handleMapQuery(request, env, corsHeaders);
    }

    // ── Person routes ──

    if (path.startsWith('/api/people/') && method === 'GET') {
      const id = path.split('/').pop();
      if (id === 'people' || !id) return notFound(corsHeaders);
      return await handleGetPerson(id, request, env, corsHeaders);
    }

    // ── Cemetery submission route ──

    if (path === '/api/cemeteries' && method === 'POST') {
      const ip = getClientIp(request);
      const rl = checkRateLimit(ip);
      if (!rl.allowed) {
        return jsonResponse({ success: false, error: 'Too many requests' }, 429, corsHeaders);
      }
      return await handleCreateCemetery(request, env, corsHeaders);
    }

    // ── Correction submission route ──

    if (path === '/api/corrections' && method === 'POST') {
      const ip = getClientIp(request);
      const rl = checkRateLimit(ip);
      if (!rl.allowed) {
        return jsonResponse({ success: false, error: 'Too many requests' }, 429, corsHeaders);
      }
      return await handleCreateCorrection(request, env, corsHeaders);
    }

    // ── Correction status (public, by correction ID) ──

    if (path.startsWith('/api/corrections/') && method === 'GET') {
      const id = path.split('/').pop();
      if (id === 'corrections' || !id) return notFound(corsHeaders);
      return await handleGetCorrectionStatus(id, request, env, corsHeaders);
    }

    // ── Countries/Regions/Cities (geographic hierarchy) ──

    if (path === '/api/countries' && method === 'GET') {
      return await handleGetCountries(request, env, corsHeaders);
    }

    if (path === '/api/regions' && method === 'GET') {
      return await handleGetRegions(request, env, corsHeaders);
    }

    if (path === '/api/cities' && method === 'GET') {
      return await handleGetCities(request, env, corsHeaders);
    }


    // ── Phase 6A: Community & Contribution routes ──

    // User registration/profile
    if (path === '/api/user/register' && method === 'POST') {
      return await handleUserRegister(request, env, corsHeaders);
    }

    if (path === '/api/user/session' && method === 'POST') {
      return await handleCreateSession(request, env, corsHeaders);
    }

    if (path === '/api/user/session' && method === 'DELETE') {
      return await handleRevokeSession(request, env, corsHeaders);
    }

    if (path === '/api/user/profile' && method === 'GET') {
      return await handleGetOwnProfile(request, env, corsHeaders);
    }

    if (path === '/api/user/profile' && method === 'PUT') {
      return await handleUpdateProfile(request, env, corsHeaders);
    }

    if (path.match(/^\/api\/users\/[^/]+\/profile$/) && method === 'GET') {
      const userId = path.split('/')[2];
      return await handleGetPublicProfile(userId, env, corsHeaders);
    }

    // Contributions
    if (path === '/api/contributions' && method === 'POST') {
      return await handleCreateContribution(request, env, corsHeaders);
    }

    if (path === '/api/contributions' && method === 'GET') {
      return await handleListContributions(request, env, corsHeaders);
    }

    if (path.match(/^\/api\/contributions\/[^/]+$/) && method === 'GET') {
      const id = path.split('/').pop();
      return await handleGetContribution(id, request, env, corsHeaders);
    }

    if (path.match(/^\/api\/contributions\/[^/]+\/cancel$/) && method === 'POST') {
      const id = path.split('/')[3];
      return await handleCancelContribution(id, request, env, corsHeaders);
    }

    if (path === '/api/contributions/check-duplicate' && method === 'POST') {
      return await handleCheckDuplicate(request, env, corsHeaders);
    }

    // Drafts
    if (path === '/api/drafts' && method === 'POST') {
      return await handleCreateDraft(request, env, corsHeaders);
    }

    if (path === '/api/drafts' && method === 'GET') {
      return await handleListDrafts(request, env, corsHeaders);
    }

    if (path.match(/^\/api\/drafts\/[^/]+$/) && method === 'GET') {
      const id = path.split('/').pop();
      return await handleGetDraft(id, request, env, corsHeaders);
    }

    if (path.match(/^\/api\/drafts\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/').pop();
      return await handleUpdateDraft(id, request, env, corsHeaders);
    }

    if (path.match(/^\/api\/drafts\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop();
      return await handleDeleteDraft(id, request, env, corsHeaders);
    }


    // ── Google OAuth Authentication ──

    if (path === '/api/auth/google/verify' && method === 'POST') {
      return await handleGoogleVerify(request, env, corsHeaders);
    }

    if (path === '/api/auth/session' && method === 'GET') {
      return await handleCheckSession(request, env, corsHeaders);
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      return jsonResponse({ success: true, message: 'Logged out. Clear your session token on the client.' }, 200, corsHeaders);
    }

    // ── Abuse Prevention (Admin) ──

    if (path === '/api/admin/abuse/log' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleGetAbuseLog(request, env, corsHeaders));
    }

    if (path === '/api/admin/abuse/stats' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleGetAbuseStats(env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/abuse\/ban\/[^/]+$/) && method === 'POST') {
      const googleSub = path.split('/').pop();
      return await requireAdmin(request, env, corsHeaders, () => handleBanAccount(googleSub, request, env, corsHeaders));
    }

    if (path.match(/^\/api\/drafts\/[^/]+\/submit$/) && method === 'POST') {
      const id = path.split('/')[3];
      return await handleSubmitDraft(id, request, env, corsHeaders);
    }

    // Photo contributions
    if (path === '/api/photos' && method === 'POST') {
      return await handleSubmitPhoto(request, env, corsHeaders);
    }


    // ── Phase 7A: Advanced Search & Global Discovery routes ──

    // Global unified search (Part 82)
    if (path === '/api/search/global' && method === 'GET') {
      return await handleGlobalSearch(request, env, corsHeaders);
    }

    // Person search (Part 84)
    if (path === '/api/search/people' && method === 'GET') {
      return await handlePersonSearch(request, env, corsHeaders);
    }

    // Cemetery search (Part 86)
    if (path === '/api/search/cemeteries' && method === 'GET') {
      return await handleCemeterySearch(request, env, corsHeaders);
    }

    // Location search (Part 87)
    if (path === '/api/search/locations' && method === 'GET') {
      return await handleLocationSearch(request, env, corsHeaders);
    }

    // Country directory (Part 88)
    if (path === '/api/countries' && method === 'GET') {
      return await handleCountryDirectory(request, env, corsHeaders);
    }

    // Region directory (Part 89)
    if (path.match(/^\/api\/countries\/[^/]+\/regions$/) && method === 'GET') {
      const country = decodeURIComponent(path.split('/')[3]);
      return await handleRegionDirectory(country, request, env, corsHeaders);
    }

    // City directory (Part 90)
    if (path.match(/^\/api\/countries\/[^/]+\/regions\/[^/]+\/cities$/) && method === 'GET') {
      const parts = path.split('/');
      const country = decodeURIComponent(parts[3]);
      const region = decodeURIComponent(parts[5]);
      return await handleCityDirectory(country, region, request, env, corsHeaders);
    }

    // Browse by location (Part 87)
    if (path === '/api/browse' && method === 'GET') {
      return await handleBrowseByLocation(request, env, corsHeaders);
    }

    // Related records (Part 101)
    if (path.match(/^\/api\/related\/[^/]+$/) && method === 'GET') {
      const parts = path.split('/');
      const recordId = decodeURIComponent(parts[3]);
      return await handleRelatedRecords(recordId, request, env, corsHeaders);
    }


    // Nearby discovery (Part 116)
    if (path === '/api/nearby' && method === 'GET') {
      return await handleNearbySearch(request, env, corsHeaders);
    }

    if (path === '/api/map/viewport' && method === 'GET') {
      return await handleViewportSearch(request, env, corsHeaders);
    }

    // Public record detail for share links (Part 125-126)
    if (path.match(/^\/api\/record\/(cemeteries|graves)\/[^/]+$/) && method === 'GET') {
      return await handlePublicRecord(path, request, env, corsHeaders);
    }

    // Discovery recommendations (Part 128)
    if (path.match(/^\/api\/recommendations\/[^/]+$/) && method === 'GET') {
      const recordId = decodeURIComponent(path.split('/')[3]);
      return await handleRecommendations(recordId, request, env, corsHeaders);
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

    // ── Phase 4.5: Admin governance routes ──

    if (path === '/api/admin/dashboard' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleAdminDashboard(env, corsHeaders));
    }

    if (path === '/api/admin/corrections' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleListCorrections(env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/corrections\/[^/]+\/approve$/) && method === 'POST') {
      const id = path.split('/')[4];
      return await requireAdmin(request, env, corsHeaders, () => handleApproveCorrection(id, request, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/corrections\/[^/]+\/reject$/) && method === 'POST') {
      const id = path.split('/')[4];
      return await requireAdmin(request, env, corsHeaders, () => handleRejectCorrection(id, request, env, corsHeaders));
    }

    if (path === '/api/admin/audit' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleListAuditEvents(request, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/audit\/[^/]+$/) && method === 'GET') {
      const entityId = path.split('/').pop();
      return await requireAdmin(request, env, corsHeaders, () => handleGetAuditTrail(entityId, env, corsHeaders));
    }

    if (path === '/api/admin/contributors' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleListContributors(env, corsHeaders));
    }

    if (path === '/api/admin/data-quality' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleDataQuality(request, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/reports\/[^/]+\/resolve$/) && method === 'POST') {
      const id = path.split('/')[4];
      return await requireAdmin(request, env, corsHeaders, () => handleResolveReport(id, request, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/reports\/[^/]+\/reject$/) && method === 'POST') {
      const id = path.split('/')[4];
      return await requireAdmin(request, env, corsHeaders, () => handleRejectReport(id, request, env, corsHeaders));
    }

    if (path === '/api/admin/contributions' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, async () => handleListAllContributions(request, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/contributions\/[^/]+\/notes$/) && method === 'POST') {
      return await requireAdmin(request, env, corsHeaders, async () => handleAddModerationNote(request, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/contributions\/[^/]+\/notes$/) && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, async () => handleGetModerationNotes(request, env, corsHeaders));
    }

    if (path === '/api/admin/users' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, async () => handleListUsers(request, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/users\/[^/]+\/role$/) && method === 'POST') {
      return await requireAdmin(request, env, corsHeaders, async () => handleSetUserRole(request, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/publication\/[^/]+\/retry$/) && method === 'POST') {
      const id = path.split('/')[3];
      return await requireAdmin(request, env, corsHeaders, () => handleRetryPublication(id, request, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/publication\/[^/]+$/) && method === 'GET') {
      const id = path.split('/')[3];
      return await requireAdmin(request, env, corsHeaders, () => handleGetPublicationStatus(id, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/restore\/[^/]+$/) && method === 'POST') {
      const id = path.split('/').pop();
      return await requireAdmin(request, env, corsHeaders, () => handleRestoreRecord(id, request, env, corsHeaders));
    }

    // ── Phase 5: Admin Import Management ──

    if (path === '/api/admin/imports/sources' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleListImportSources(env, corsHeaders));
    }

    if (path === '/api/admin/imports/moderation/config' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleGetModerationConfig(env, corsHeaders));
    }

    if (path === '/api/admin/imports/trigger' && method === 'POST') {
      return await requireAdmin(request, env, corsHeaders, () => handleTriggerImport(request, env, corsHeaders));
    }

    if (path === '/api/admin/imports' && method === 'GET') {
      return await requireAdmin(request, env, corsHeaders, () => handleListImports(env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/imports\/[^/]+\/approve$/) && method === 'POST') {
      const importId = path.split('/')[4];
      return await requireAdmin(request, env, corsHeaders, () => handleApproveImport(importId, request, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/imports\/[^/]+\/reject$/) && method === 'POST') {
      const importId = path.split('/')[4];
      return await requireAdmin(request, env, corsHeaders, () => handleRejectImport(importId, request, env, corsHeaders));
    }

    if (path.match(/^\/api\/admin\/imports\/[^/]+$/) && method === 'GET') {
      const importId = path.split('/')[4];
      return await requireAdmin(request, env, corsHeaders, () => handleGetImport(importId, env, corsHeaders));
    }

    // ── External Connector Routes (Grave/Cemetery API Integration) ──

    // List all evaluated sources
    if (path === '/api/external/sources' && method === 'GET') {
      const sources = getImplementedSources();
      return jsonResponse({ sources }, 200, corsHeaders);
    }

    // Get source registry (full, including not-implemented)
    if (path === '/api/external/registry' && method === 'GET') {
      const all = getSource();
      return jsonResponse({ sources: all }, 200, corsHeaders);
    }

    // Query a specific external source
    if (path === '/api/external/query' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }
      const { sourceId, query } = body;
      if (!sourceId) return jsonResponse({ error: 'sourceId required' }, 400, corsHeaders);
      const result = await querySource(sourceId, query || {}, env);
      return jsonResponse(sanitizeResponse(result), 200, corsHeaders);
    }

    // Query all implemented sources
    if (path === '/api/external/query-all' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }
      const results = await queryAllSources(body.query || {}, env);
      return jsonResponse(sanitizeResponse({ results }), 200, corsHeaders);
    }

    // API health dashboard
    if (path === '/api/external/health' && method === 'GET') {
      const dashboard = getHealthDashboard();
      return jsonResponse(dashboard, 200, corsHeaders);
    }

    // Cemetery matching
    if (path === '/api/external/match-cemetery' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }
      const { externalCemetery, graveAtlasCemeteries } = body;
      if (!externalCemetery) return jsonResponse({ error: 'externalCemetery required' }, 400, corsHeaders);
      const matches = matchCemetery(externalCemetery, graveAtlasCemeteries || []);
      return jsonResponse({ matches }, 200, corsHeaders);
    }

    // Record matching
    if (path === '/api/external/match-records' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }
      const { externalRecords, graveAtlasRecords } = body;
      if (!externalRecords) return jsonResponse({ error: 'externalRecords required' }, 400, corsHeaders);
      const results = batchMatchRecords(externalRecords, graveAtlasRecords || []);
      return jsonResponse({ results }, 200, corsHeaders);
    }

    // Validate external records (data quality)
    if (path === '/api/external/validate' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }
      const { records } = body;
      if (!records || !Array.isArray(records)) return jsonResponse({ error: 'records array required' }, 400, corsHeaders);
      const result = validateBatch(records);
      return jsonResponse(result, 200, corsHeaders);
    }

    // Privacy review
    if (path === '/api/external/privacy-review' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }
      const { record } = body;
      if (!record) return jsonResponse({ error: 'record required' }, 400, corsHeaders);
      const result = reviewPrivacy(record);
      return jsonResponse(result, 200, corsHeaders);
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
    version: '7.1.0',
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

/**
 * Phase 16.3: Timeline endpoint — returns chronological events built from grave records.
 *
 * Builds timeline events (birth, death) from all published graves, sorted chronologically.
 * Supports optional ?startYear= and ?endYear= query params for filtering.
 * Response format:
 *   { events: [...], summary: "3 events from 1900 to 1950", count: 3 }
 */
async function handleGetTimeline(request, env, cors) {
  const url = new URL(request.url);
  const startYear = parseInt(url.searchParams.get('startYear') || '0', 10);
  const endYear = parseInt(url.searchParams.get('endYear') || '9999', 10);

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      events: [],
      count: 0,
      summary: 'No data available. GitHub not configured.',
      message: 'GitHub not configured. Deploy with secrets to enable data access.'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const events = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await readFile(`graves/${file}`, env);
      if (!content) continue;
      try {
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;

        // Build birth event
        if (record.birthDate) {
          const year = extractYear(record.birthDate);
          if (year > 0) {
            events.push({
              id: 'birth_' + record.id,
              type: 'BIRTH',
              date: record.birthDate,
              year: year,
              title: record.name || 'Unknown',
              description: 'Born' + (record.cemeteryName ? ' \u2014 later interred at ' + record.cemeteryName : ''),
              recordId: record.id,
              recordType: 'grave',
              cemeteryName: record.cemeteryName || null,
              verificationStatus: record.verificationStatus || 'unverified',
              sourceRefs: record.sourceRefs || [],
              latitude: record.latitude || 0,
              longitude: record.longitude || 0
            });
          }
        }

        // Build death event
        if (record.deathDate) {
          const year = extractYear(record.deathDate);
          if (year > 0) {
            events.push({
              id: 'death_' + record.id,
              type: 'DEATH',
              date: record.deathDate,
              year: year,
              title: record.name || 'Unknown',
              description: 'Passed away' + (record.cemeteryName ? ' \u2014 interred at ' + record.cemeteryName : ''),
              recordId: record.id,
              recordType: 'grave',
              cemeteryName: record.cemeteryName || null,
              verificationStatus: record.verificationStatus || 'unverified',
              sourceRefs: record.sourceRefs || [],
              latitude: record.latitude || 0,
              longitude: record.longitude || 0
            });
          }
        }
      } catch (e) { /* skip invalid JSON */ }
    }

    // Filter by year range
    let filtered = events;
    if (startYear > 0 || endYear < 9999) {
      filtered = events.filter(e => e.year >= startYear && e.year <= endYear);
    }

    // Sort chronologically
    filtered.sort((a, b) => a.year - b.year);

    // Generate summary
    let summary = 'No events available.';
    if (filtered.length > 0) {
      const firstYear = filtered[0].year;
      const lastYear = filtered[filtered.length - 1].year;
      const births = filtered.filter(e => e.type === 'BIRTH').length;
      const deaths = filtered.filter(e => e.type === 'DEATH').length;
      summary = `${filtered.length} event(s)`;
      if (firstYear !== lastYear) summary += ` from ${firstYear} to ${lastYear}`;
      else summary += ` in ${firstYear}`;
      summary += `: ${births} birth${births !== 1 ? 's' : ''}, ${deaths} death${deaths !== 1 ? 's' : ''}.`;
    }

    return jsonResponse({
      success: true,
      events: filtered,
      count: filtered.length,
      summary: summary
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: true,
      events: [],
      count: 0,
      summary: 'Unable to fetch timeline data.',
      message: 'Unable to fetch from data repository.'
    }, 200, cors);
  }
}

/**
 * Extract a 4-digit year from a date string.
 */
function extractYear(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const match = dateStr.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Phase 16.4: AI Map Query endpoint — parses natural-language queries and returns filtered results.
 *
 * GET /api/map/query?q=Show+me+graves+from+the+1900s+in+Singapore
 * GET /api/map/query?startYear=1900&endYear=1999&location=Singapore
 *
 * Returns:
 *   { records: [...], count: N, query: {...}, summary: "Found 15 records..." }
 */
async function handleMapQuery(request, env, cors) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const startYear = url.searchParams.get('startYear') ? parseInt(url.searchParams.get('startYear'), 10) : null;
  const endYear = url.searchParams.get('endYear') ? parseInt(url.searchParams.get('endYear'), 10) : null;
  const location = url.searchParams.get('location') || null;
  const evidenceFilter = url.searchParams.get('evidence') || null;

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      records: [],
      count: 0,
      query: { q, startYear, endYear, location, evidenceFilter },
      summary: 'No data available. GitHub not configured.'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const records = [];

    // Parse the natural language query if provided
    let parsedStartYear = startYear;
    let parsedEndYear = endYear;
    let parsedLocation = location;
    let parsedEvidence = evidenceFilter;

    if (q) {
      // Year range
      const rangeMatch = q.match(/(\d{4})\s*(?:to|-|–)\s*(\d{4})/);
      if (rangeMatch) {
        parsedStartYear = parseInt(rangeMatch[1], 10);
        parsedEndYear = parseInt(rangeMatch[2], 10);
      } else {
        // Decade (e.g., "1900s")
        const decadeMatch = q.match(/\b(1[5-9]|20[0-5])0s\b/);
        if (decadeMatch) {
          parsedStartYear = parseInt(decadeMatch[1] + '0', 10);
          parsedEndYear = parsedStartYear + 9;
        } else {
          // Before/after
          const beforeMatch = q.match(/(?:before|prior to|pre-)\s*(\d{4})/);
          if (beforeMatch) parsedEndYear = parseInt(beforeMatch[1], 10);
          const afterMatch = q.match(/(?:after|since|from|post-)\s*(\d{4})/);
          if (afterMatch) parsedStartYear = parseInt(afterMatch[1], 10);
          // Single year
          if (parsedStartYear === null && parsedEndYear === null) {
            const yearMatch = q.match(/\b(1[5-9]\d{2}|20[0-5]\d)\b/);
            if (yearMatch) {
              parsedStartYear = parseInt(yearMatch[1], 10);
              parsedEndYear = parsedStartYear;
            }
          }
        }
      }

      // Evidence filter
      if (/source[- ]?backed|sourced|cited|documented|verified/i.test(q)) {
        parsedEvidence = 'source_backed';
      } else if (/unverified|unconfirmed|pending/i.test(q)) {
        parsedEvidence = 'unverified';
      }

      // Location from "near X" or "in X"
      if (!parsedLocation) {
        const nearMatch = q.match(/(?:near|around|close to)\s+([\w\s]+)/i);
        if (nearMatch) {
          parsedLocation = nearMatch[1].trim().split(/\s+(?:with|showing|displaying|having)\b/)[0].trim();
        } else {
          const inMatch = q.match(/(?:in|at|within)\s+([\w\s]+)/i);
          if (inMatch) {
            const loc = inMatch[1].trim();
            if (!['the', 'a', 'an', 'all', 'this', 'that'].includes(loc.toLowerCase())) {
              parsedLocation = loc;
            }
          }
        }
      }
    }

    // Load and filter records
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await readFile(`graves/${file}`, env);
      if (!content) continue;
      try {
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;

        let include = true;

        // Year filter
        if (parsedStartYear !== null || parsedEndYear !== null) {
          const year = extractYear(record.deathDate || record.birthDate || '');
          if (year > 0) {
            if (parsedStartYear !== null && year < parsedStartYear) include = false;
            if (parsedEndYear !== null && year > parsedEndYear) include = false;
          } else {
            include = false;
          }
        }

        // Evidence filter
        if (include && parsedEvidence) {
          const status = record.verificationStatus || 'unverified';
          if (parsedEvidence === 'source_backed') {
            if (!['source_backed', 'verified'].includes(status)) include = false;
          } else if (parsedEvidence === 'unverified') {
            if (!['unverified', 'needs_verification'].includes(status)) include = false;
          }
        }

        // Location filter
        if (include && parsedLocation) {
          const loc = parsedLocation.toLowerCase();
          const cemeteryName = (record.cemeteryName || '').toLowerCase();
          const cemetery = (record.cemetery || '').toLowerCase();
          const name = (record.name || '').toLowerCase();
          if (!cemeteryName.includes(loc) && !cemetery.includes(loc) && !name.includes(loc)) {
            include = false;
          }
        }

        if (include) records.push(record);
      } catch (e) { /* skip */ }
    }

    // Generate summary
    let summary = `Found ${records.length} records`;
    if (parsedStartYear !== null && parsedEndYear !== null) {
      if (parsedStartYear === parsedEndYear) summary += ` from ${parsedStartYear}`;
      else summary += ` from ${parsedStartYear} to ${parsedEndYear}`;
    }
    if (parsedLocation) summary += ` in ${parsedLocation}`;
    if (parsedEvidence) summary += ` [${parsedEvidence}]`;
    summary += '.';

    return jsonResponse({
      success: true,
      records: records,
      count: records.length,
      query: {
        original: q || null,
        startYear: parsedStartYear,
        endYear: parsedEndYear,
        location: parsedLocation,
        evidence: parsedEvidence
      },
      summary: summary
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: true,
      records: [],
      count: 0,
      query: { q },
      summary: 'Unable to process map query.'
    }, 200, cors);
  }
}

async function handleCreateGrave(request, env, cors) {
  // Require Google authentication
  const auth = requireGoogleAuth(request, env);
  if (!auth.authenticated) return jsonResponse({ success: false, error: auth.error }, 401, cors);

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
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('User-Agent') || '';

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
    updatedAt: null,
    submittedBy: auth.userId,
    submittedByGoogleSub: auth.googleSub,
    submittedByIp: clientIp,
    submittedByUserAgent: userAgent.substring(0, 500),
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

  // Log submission attempt for abuse prevention
  await logSubmissionAttempt(env, {
    userId: auth.userId,
    googleSub: auth.googleSub,
    contributionId: submissionId,
    contributionType: 'grave',
    clientIp,
    userAgent,
    success: true,
  });

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

  // Validate report type if provided (Phase 4.5)
  const reportType = body.reportType;
  if (reportType && !REPORT_TYPES.includes(reportType)) {
    return jsonResponse({ success: false, error: 'Invalid report type' }, 400, cors);
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

// ── Search Handler ──

async function handleSearch(request, env, cors) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim();
  const type = url.searchParams.get('type') || 'all';
  const { limit, offset } = parsePagination(url);

  if (query.length < SEARCH_MIN_LENGTH) {
    return jsonResponse({
      success: true,
      results: [],
      message: `Search query must be at least ${SEARCH_MIN_LENGTH} characters`,
      count: 0
    }, 200, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, results: [], count: 0, message: 'Search unavailable — GitHub not configured.' }, 200, cors);
  }

  // Check response cache first — prevents repeated linear scans for identical queries
  const cacheKey = `search:${type}:${query}:${limit}:${offset}`;
  const cached = getCacheEntry(cacheKey);
  if (cached) {
    return jsonResponse(cached, 200, cors);
  }

  const results = [];
  const normalizedQuery = normalizeSearchText(query);

  try {
    // Search cemeteries
    if (type === 'all' || type === 'cemetery') {
      try {
        const files = await listFiles('cemeteries', env);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const content = await readFile(`cemeteries/${file}`, env);
          if (!content) continue;
          try {
            const record = JSON.parse(content);
            if (record.status !== 'published') continue;
            const score = scoreSearchMatch(normalizedQuery, normalizeSearchText(record.name || ''), record);
            if (score > 0) {
              results.push({
                type: 'cemetery',
                id: record.id,
                name: record.name,
                country: record.country || null,
                region: record.region || null,
                city: record.city || null,
                latitude: record.latitude || null,
                longitude: record.longitude || null,
                score
              });
            }
          } catch (e) { /* skip */ }
        }
      } catch (e) { /* skip */ }
    }

    // Search graves
    if (type === 'all' || type === 'grave') {
      try {
        const files = await listFiles('graves', env);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const content = await readFile(`graves/${file}`, env);
          if (!content) continue;
          try {
            const record = JSON.parse(content);
            if (record.status !== 'published') continue;
            const searchName = record.name || (record.personIds && record.personIds.length > 0 ? record.name : '') || record.graveIdentifier || '';
            const score = scoreSearchMatch(normalizedQuery, normalizeSearchText(searchName), record);
            if (score > 0) {
              results.push({
                type: 'grave',
                id: record.id,
                name: searchName,
                cemetery: record.cemeteryName || record.cemetery || null,
                cemeteryId: record.cemeteryId || null,
                birthDate: record.birthDate || null,
                deathDate: record.deathDate || null,
                score
              });
            }
          } catch (e) { /* skip */ }
        }
      } catch (e) { /* skip */ }
    }

    // Sort by score (desc), then name
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.name || '').localeCompare(b.name || '');
    });

    // Apply pagination
    const total = results.length;
    const paged = results.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    const searchResponse = {
      success: true,
      results: paged,
      count: paged.length,
      total,
      limit,
      offset,
      hasMore,
      query
    };
    setCacheEntry(cacheKey, searchResponse);
    return jsonResponse(searchResponse, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, results: [], count: 0, message: 'Search temporarily unavailable.' }, 200, cors);
  }
}

function normalizeSearchText(text) {
  if (!text) return '';
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function scoreSearchMatch(query, target, record) {
  if (!target || !query) return 0;

  // Exact match = 100
  if (target === query) return 100;

  // Normalized exact match = 90
  const nq = normalizeSearchText(query);
  const nt = normalizeSearchText(target);
  if (nq === nt) return 90;

  // Prefix match = 70
  if (nt.startsWith(nq)) return 70;

  // Partial match = 50
  if (nt.includes(nq)) return 50;

  // Check alt names if available
  if (record && record.altNames) {
    for (const alt of record.altNames) {
      const altNorm = normalizeSearchText(alt);
      if (altNorm === nq) return 85;
      if (altNorm.startsWith(nq)) return 65;
      if (altNorm.includes(nq)) return 45;
    }
  }

  // Check local name
  if (record && record.localName) {
    const localNorm = normalizeSearchText(record.localName);
    if (localNorm === nq) return 85;
    if (localNorm.startsWith(nq)) return 65;
    if (localNorm.includes(nq)) return 45;
  }

  // Check transliteration
  if (record && record.transliteration) {
    const translNorm = normalizeSearchText(record.transliteration);
    if (translNorm === nq) return 85;
    if (translNorm.startsWith(nq)) return 65;
    if (translNorm.includes(nq)) return 45;
  }

  // Check city, country, region for cemetery
  if (record && record.city) {
    if (normalizeSearchText(record.city).includes(nq)) return 30;
  }
  if (record && record.country) {
    if (normalizeSearchText(record.country).includes(nq)) return 25;
  }

  return 0;
}

// ── Person Handler ──

async function handleGetPerson(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid person ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'Person not found' }, 404, cors);
  }

  try {
    const content = await readFile(`people/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Person not found' }, 404, cors);
    }

    const record = JSON.parse(content);
    return jsonResponse(record, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Person not found' }, 404, cors);
  }
}

// ── Cemetery Submission Handler ──

async function handleCreateCemetery(request, env, cors) {
  // Require Google authentication
  const auth = requireGoogleAuth(request, env);
  if (!auth.authenticated) return jsonResponse({ success: false, error: auth.error }, 401, cors);

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

  const validation = validateCemeterySubmission(body);
  if (!validation.valid) {
    return jsonResponse({ success: false, error: validation.error }, 400, cors);
  }

  const idempotencyKey = request.headers.get('Idempotency-Key');
  if (idempotencyKey) {
    const existing = getIdempotencyEntry(idempotencyKey);
    if (existing) {
      return jsonResponse({ success: true, submissionId: existing.submissionId, status: 'pending' }, 201, cors);
    }
  }

  const submissionId = `cemetery_${generateId().replace('sub_', '')}`;
  const now = new Date().toISOString();

  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('User-Agent') || '';

  const record = {
    id: submissionId,
    name: body.name,
    altNames: body.altNames || null,
    localName: body.localName || null,
    transliteration: body.transliteration || null,
    countryCode: body.countryCode || null,
    country: body.country || null,
    region: body.region || null,
    city: body.city || null,
    locality: body.locality || null,
    address: body.address || null,
    latitude: body.latitude !== undefined ? body.latitude : null,
    longitude: body.longitude !== undefined ? body.longitude : null,
    timezone: body.timezone || null,
    cemeteryType: body.cemeteryType || null,
    religiousAffiliation: body.religiousAffiliation || null,
    operatingStatus: body.operatingStatus || null,
    establishedDate: body.establishedDate || null,
    closedDate: body.closedDate || null,
    website: body.website || null,
    contactInfo: body.contactInfo || null,
    description: body.description || null,
    accessibility: body.accessibility || null,
    sourceRefs: body.sourceRefs || null,
    verificationStatus: 'community_submitted',
    status: 'pending',
    submittedAt: now,
    updatedAt: null,
    submittedBy: auth.userId,
    submittedByGoogleSub: auth.googleSub,
    submittedByIp: clientIp,
    submittedByUserAgent: userAgent.substring(0, 500),
  };

  if (env.GITHUB_APP_ID) {
    try {
      await writeFile(
        `pending/${submissionId}.json`,
        JSON.stringify(record, null, 2),
        env,
        `cemetery submission: ${body.name} (pending review)`
      );
    } catch (error) {
      return jsonResponse({ success: false, error: 'Unable to save submission. Please try again later.' }, 502, cors);
    }
  }

  if (idempotencyKey) setIdempotencyEntry(idempotencyKey, submissionId);

  // Log submission attempt for abuse prevention
  await logSubmissionAttempt(env, {
    userId: auth.userId,
    googleSub: auth.googleSub,
    contributionId: submissionId,
    contributionType: 'cemetery',
    clientIp,
    userAgent,
    success: true,
  });

  return jsonResponse({ success: true, submissionId: submissionId, status: 'pending' }, 201, cors);
}

function validateCemeterySubmission(body) {
  if (!body) return { valid: false, error: 'Empty request body' };
  if (typeof body !== 'object' || Array.isArray(body)) return { valid: false, error: 'Invalid request body' };
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) return { valid: false, error: 'Cemetery name is required' };
  if (body.name.length > MAX_NAME_LENGTH) return { valid: false, error: 'Name too long (max 500 chars)' };

  if (body.latitude !== undefined || body.longitude !== undefined) {
    const lat = parseFloat(body.latitude);
    const lon = parseFloat(body.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) return { valid: false, error: 'Invalid latitude (must be -90 to 90)' };
    if (isNaN(lon) || lon < -180 || lon > 180) return { valid: false, error: 'Invalid longitude (must be -180 to 180)' };
  }

  if (body.countryCode && !/^[A-Z]{2}$/.test(body.countryCode)) return { valid: false, error: 'Invalid country code (use ISO 3166-1 alpha-2)' };
  if (body.website && !/^https?:\/\//.test(body.website)) return { valid: false, error: 'Invalid website URL' };

  if (JSON.stringify(body).length > MAX_BODY_SIZE) return { valid: false, error: 'Request too large (max 50KB)' };

  const allowed = CEMETERY_FIELDS;
  const unexpected = Object.keys(body).filter(k => !allowed.includes(k));
  if (unexpected.length > 0) return { valid: false, error: 'Invalid request' };

  return { valid: true };
}

// ── Correction Handlers ──

async function handleCreateCorrection(request, env, cors) {
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

  const validation = validateCorrection(body);
  if (!validation.valid) {
    return jsonResponse({ success: false, error: validation.error }, 400, cors);
  }

  const idempotencyKey = request.headers.get('Idempotency-Key');
  if (idempotencyKey) {
    const existing = getIdempotencyEntry(idempotencyKey);
    if (existing) {
      return jsonResponse({ success: true, correctionId: existing.submissionId, status: 'pending' }, 201, cors);
    }
  }

  const correctionId = `correction_${generateId().replace('sub_', '')}`;
  const now = new Date().toISOString();

  const record = {
    id: correctionId,
    targetId: sanitizePathSegment(body.targetId) || body.targetId,
    targetType: body.targetType,
    corrections: body.corrections,
    reason: body.reason || null,
    sourceRefs: body.sourceRefs || null,
    status: 'pending',
    submittedAt: now,
    updatedAt: null
  };

  if (env.GITHUB_APP_ID) {
    try {
      await writeFile(
        `pending/${correctionId}.json`,
        JSON.stringify(record, null, 2),
        env,
        `correction for ${body.targetType} ${body.targetId} (pending review)`
      );
    } catch (error) {
      return jsonResponse({ success: false, error: 'Unable to save correction. Please try again later.' }, 502, cors);
    }
  }

  if (idempotencyKey) setIdempotencyEntry(idempotencyKey, correctionId);

  return jsonResponse({ success: true, correctionId: correctionId, status: 'pending' }, 201, cors);
}

function validateCorrection(body) {
  if (!body) return { valid: false, error: 'Empty request body' };
  if (typeof body !== 'object' || Array.isArray(body)) return { valid: false, error: 'Invalid request body' };
  if (!body.targetId || typeof body.targetId !== 'string') return { valid: false, error: 'Target record ID is required' };
  if (!body.targetType || !['grave', 'cemetery', 'person', 'source'].includes(body.targetType)) return { valid: false, error: 'Invalid target type' };
  if (!body.corrections || typeof body.corrections !== 'object' || Array.isArray(body.corrections) || Object.keys(body.corrections).length === 0) return { valid: false, error: 'Corrections object is required' };
  if (body.reason && body.reason.length > MAX_FIELD_LENGTH) return { valid: false, error: 'Reason too long (max 2000 chars)' };

  const allowed = CORRECTION_FIELDS;
  const unexpected = Object.keys(body).filter(k => !allowed.includes(k));
  if (unexpected.length > 0) return { valid: false, error: 'Invalid request' };

  return { valid: true };
}

async function handleGetCorrectionStatus(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid correction ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'Correction not found' }, 404, cors);
  }

  try {
    const content = await readFile(`pending/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Correction not found' }, 404, cors);
    }
    const record = JSON.parse(content);
    return jsonResponse({
      success: true,
      id: safeId,
      status: record.status || 'pending',
      targetType: record.targetType || null,
      submittedAt: record.submittedAt || null,
      updatedAt: record.updatedAt || null
    }, 200, cors);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Correction not found' }, 404, cors);
  }
}

// ── Geographic Hierarchy Handlers ──

async function handleGetCountries(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, countries: [], count: 0, message: 'GitHub not configured.' }, 200, cors);
  }

  try {
    const files = await listFiles('cemeteries', env);
    const countries = new Map();

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await readFile(`cemeteries/${file}`, env);
      if (!content) continue;
      try {
        const record = JSON.parse(content);
        if (record.status !== 'published' || !record.country) continue;
        if (!countries.has(record.country)) {
          countries.set(record.country, {
            name: record.country,
            code: record.countryCode || null,
            cemeteryCount: 0
          });
        }
        countries.get(record.country).cemeteryCount++;
      } catch (e) { /* skip */ }
    }

    const cacheKey = 'countries';
    const cached = getCacheEntry(cacheKey);
    if (cached) {
      return jsonResponse(cached, 200, cors, 600);
    }
    const result = Array.from(countries.values()).sort((a, b) => a.name.localeCompare(b.name));
    const response = { success: true, countries: result, count: result.length };
    setCacheEntry(cacheKey, response);
    return jsonResponse(response, 200, cors, 600);
  } catch (error) {
    return jsonResponse({ success: true, countries: [], count: 0, message: 'Unable to fetch countries.' }, 200, cors);
  }
}

async function handleGetRegions(request, env, cors) {
  const url = new URL(request.url);
  const country = url.searchParams.get('country');

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, regions: [], count: 0, message: 'GitHub not configured.' }, 200, cors);
  }

  try {
    const files = await listFiles('cemeteries', env);
    const regions = new Map();

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await readFile(`cemeteries/${file}`, env);
      if (!content) continue;
      try {
        const record = JSON.parse(content);
        if (record.status !== 'published' || !record.region) continue;
        if (country && normalizeSearchText(record.country) !== normalizeSearchText(country)) continue;
        const key = `${record.region}`;
        if (!regions.has(key)) {
          regions.set(key, {
            name: record.region,
            country: record.country || null,
            cemeteryCount: 0
          });
        }
        regions.get(key).cemeteryCount++;
      } catch (e) { /* skip */ }
    }

    const cacheKey = `regions:${country || 'all'}`;
    const cached = getCacheEntry(cacheKey);
    if (cached) {
      return jsonResponse(cached, 200, cors, 600);
    }
    const result = Array.from(regions.values()).sort((a, b) => a.name.localeCompare(b.name));
    const response = { success: true, regions: result, count: result.length };
    setCacheEntry(cacheKey, response);
    return jsonResponse(response, 200, cors, 600);
  } catch (error) {
    return jsonResponse({ success: true, regions: [], count: 0, message: 'Unable to fetch regions.' }, 200, cors);
  }
}

async function handleGetCities(request, env, cors) {
  const url = new URL(request.url);
  const country = url.searchParams.get('country');
  const region = url.searchParams.get('region');

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, cities: [], count: 0, message: 'GitHub not configured.' }, 200, cors);
  }

  try {
    const files = await listFiles('cemeteries', env);
    const cities = new Map();

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await readFile(`cemeteries/${file}`, env);
      if (!content) continue;
      try {
        const record = JSON.parse(content);
        if (record.status !== 'published' || !record.city) continue;
        if (country && normalizeSearchText(record.country) !== normalizeSearchText(country)) continue;
        if (region && normalizeSearchText(record.region) !== normalizeSearchText(region)) continue;
        const key = `${record.city}`;
        if (!cities.has(key)) {
          cities.set(key, {
            name: record.city,
            country: record.country || null,
            region: record.region || null,
            cemeteryCount: 0
          });
        }
        cities.get(key).cemeteryCount++;
      } catch (e) { /* skip */ }
    }

    const cacheKey = `cities:${country || 'all'}:${region || 'all'}`;
    const cached = getCacheEntry(cacheKey);
    if (cached) {
      return jsonResponse(cached, 200, cors, 600);
    }
    const result = Array.from(cities.values()).sort((a, b) => a.name.localeCompare(b.name));
    const response = { success: true, cities: result, count: result.length };
    setCacheEntry(cacheKey, response);
    return jsonResponse(response, 200, cors, 600);
  } catch (error) {
    return jsonResponse({ success: true, cities: [], count: 0, message: 'Unable to fetch cities.' }, 200, cors);
  }
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
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid submission ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  try {
    const content = await readFile(`pending/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Submission not found' }, 404, cors);
    }

    const record = JSON.parse(content);

    // Don't approve reports
    if (record.status === 'reported') {
      return jsonResponse({ success: false, error: 'Cannot approve a report as a grave submission' }, 400, cors);
    }

    // Validate status transition (Phase 4.5)
    const currentStatus = record.status || 'pending';
    if (!isValidTransition('submission', currentStatus, 'published')) {
      return jsonResponse({ success: false, error: `Invalid transition: ${currentStatus} → published` }, 409, cors);
    }

    const previousStatus = record.status;
    record.status = 'published';
    record.verificationStatus = record.verificationStatus || 'community_submitted';
    record.updatedAt = new Date().toISOString();
    record.schemaVersion = record.schemaVersion || Phase4A.CURRENT_SCHEMA_VERSION;

    // Generate change diff for audit trail
    let existingRecord = null;
    try {
      const existingContent = await readFile(`graves/${record.id}.json`, env);
      if (existingContent) existingRecord = JSON.parse(existingContent);
    } catch (e) { /* New record */ }

    const changeDiff = Phase4A.generateChangeDiff(existingRecord, record);
    const diffSummary = Phase4A.summarizeDiff(changeDiff);

    // Create publication record for queue tracking
    const pubRecord = await Phase4A.createPublicationRecord(env, safeId, 'grave', record);

    // Safe publish with retry (max 3 attempts, exponential backoff)
    const targetPath = `graves/${record.id}.json`;
    const commitMsg = `approve: ${record.name || safeId} published (${diffSummary})`;
    const pubResult = await Phase4A.safePublish(env, targetPath, record, commitMsg, pubRecord);

    if (!pubResult.success) {
      // Publication failed — preserve approved state, return error
      return jsonResponse({
        success: false,
        error: `Publication failed after ${pubResult.attempts} attempts: ${pubResult.error?.message || 'unknown'}`,
        publicationId: pubRecord.id,
        retryable: pubResult.error?.type !== 'conflict' && pubResult.error?.type !== 'validation',
      }, 502, cors);
    }

    // Delete from pending/ (non-fatal if fails)
    try {
      await deleteFile(`pending/${safeId}.json`, env, `Remove approved submission ${safeId} from pending`);
    } catch (e) { /* Non-fatal */ }

    // Invalidate search cache — new published data available
    clearResponseCache();

    // Create audit event with change diff
    await createAuditEvent(env, {
      entityId: record.id,
      entityType: 'grave',
      action: 'APPROVE',
      actorType: 'admin',
      reason: `Submission approved and published. Changes: ${diffSummary}`,
      previousState: { status: previousStatus, submissionId: safeId },
      newState: { status: 'published', verificationStatus: record.verificationStatus, schemaVersion: record.schemaVersion },
      changeDiff,
      publicationId: pubRecord.id,
      attempts: pubResult.attempts,
    });

    // Update contributor stats (Phase 4.5)
    if (record.contributorId) {
      await updateContributorStats(env, record.contributorId, 'accepted');
    }

    return jsonResponse({
      success: true,
      message: `Submission ${safeId} approved and published`,
      graveId: record.id,
      publicationId: pubRecord.id,
      attempts: pubResult.attempts,
      changes: diffSummary,
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to approve submission: ' + (error.message || 'unknown') }, 500, cors);
  }
}

async function handleRejectSubmission(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid submission ID' }, 400, cors);
  }

  let body = {};
  try { body = await request.json(); } catch (e) {}

  // Validate moderation reason (Phase 4.5)
  if (body.reason && !MODERATION_REASONS.includes(body.reason)) {
    return jsonResponse({ success: false, error: 'Invalid moderation reason' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  try {
    const content = await readFile(`pending/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Submission not found' }, 404, cors);
    }

    const record = JSON.parse(content);
    const previousStatus = record.status || 'pending';

    // Validate status transition (Phase 4.5)
    if (!isValidTransition('submission', previousStatus, 'rejected')) {
      return jsonResponse({ success: false, error: `Invalid transition: ${previousStatus} → rejected` }, 409, cors);
    }

    record.status = 'rejected';
    record.updatedAt = new Date().toISOString();
    if (body.reason) record.moderationReason = body.reason;
    if (body.note && typeof body.note === 'string' && body.note.length <= MAX_FIELD_LENGTH) {
      record.moderationNote = body.note; // Internal note, not exposed to users
    }

    await writeFile(
      `pending/${safeId}.json`,
      JSON.stringify(record, null, 2),
      env,
      `reject: submission ${safeId} rejected`
    );

    // Create audit event (Phase 4.5)
    await createAuditEvent(env, {
      entityId: record.id || safeId,
      entityType: 'grave',
      action: 'REJECT',
      actorType: 'admin',
      reason: body.reason || 'OTHER',
      note: body.note,
      previousState: { status: previousStatus, submissionId: safeId },
      newState: { status: 'rejected' }
    });

    // Update contributor stats (Phase 4.5)
    if (record.contributorId) {
      await updateContributorStats(env, record.contributorId, 'rejected');
    }

    return jsonResponse({
      success: true,
      message: `Submission ${safeId} rejected`
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to reject submission' }, 500, cors);
  }
}


// ═══════════════════════════════════════════════════════════════
// Phase 4.5: Governance Handlers
// ═══════════════════════════════════════════════════════════════

// ── Status transition validation (Part 15) ──

function isValidTransition(type, from, to) {
  const transitions = type === 'submission' ? SUBMISSION_TRANSITIONS
    : type === 'correction' ? CORRECTION_TRANSITIONS
    : type === 'report' ? REPORT_TRANSITIONS
    : null;
  if (!transitions) return false;
  const allowed = transitions[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

// ── Audit trail (Part 7) ──

async function createAuditEvent(env, event) {
  if (!env.GITHUB_APP_ID) return; // No-op if GitHub not configured

  const auditId = `audit_${generateId().replace('sub_', '')}`;
  const auditRecord = {
    id: auditId,
    entityId: event.entityId || null,
    entityType: event.entityType || 'unknown',
    action: event.action || 'UPDATE',
    actorType: event.actorType || 'system',
    actorId: event.actorId || null,
    timestamp: new Date().toISOString(),
    reason: event.reason || null,
    note: event.note || null,
    previousState: event.previousState || null,
    newState: event.newState || null,
    moderationDecision: event.moderationDecision || null
  };

  try {
    await writeFile(
      `audit/${auditId}.json`,
      JSON.stringify(auditRecord, null, 2),
      env,
      `audit: ${auditRecord.action} on ${auditRecord.entityType} ${auditRecord.entityId || ''}`
    );
  } catch (e) {
    // Non-fatal — audit is best-effort
  }
  return auditId;
}

async function handleListAuditEvents(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  const url = new URL(request.url);
  const { limit, offset } = parsePagination(url);
  const actionFilter = url.searchParams.get('action');
  const entityFilter = url.searchParams.get('entityType');

  try {
    const files = await listFiles('audit', env);
    if (!files || files.length === 0) {
      return jsonResponse({ success: true, events: [], count: 0, limit, offset, hasMore: false }, 200, cors);
    }

    let events = [];
    for (const file of files) {
      try {
        const content = await readFile(`audit/${file.name}`, env);
        if (content) {
          const record = JSON.parse(content);
          if (actionFilter && record.action !== actionFilter) continue;
          if (entityFilter && record.entityType !== entityFilter) continue;
          // Strip internal notes from public-facing list (Part 5)
          events.push({
            id: record.id,
            entityId: record.entityId,
            entityType: record.entityType,
            action: record.action,
            actorType: record.actorType,
            timestamp: record.timestamp,
            reason: record.reason
          });
        }
      } catch (e) { /* skip invalid */ }
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const total = events.length;
    const results = events.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return jsonResponse({ success: true, events: results, count: results.length, total, limit, offset, hasMore }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to fetch audit events' }, 502, cors);
  }
}

async function handleGetAuditTrail(entityId, env, cors) {
  const safeId = sanitizePathSegment(entityId);
  if (!safeId || safeId !== entityId) {
    return jsonResponse({ success: false, error: 'Invalid entity ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  try {
    const files = await listFiles('audit', env);
    if (!files) {
      return jsonResponse({ success: true, events: [] }, 200, cors);
    }

    let events = [];
    for (const file of files) {
      try {
        const content = await readFile(`audit/${file.name}`, env);
        if (content) {
          const record = JSON.parse(content);
          if (record.entityId === entityId) {
            events.push(record);
          }
        }
      } catch (e) { /* skip */ }
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return jsonResponse({ success: true, entityId, events, count: events.length }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to fetch audit trail' }, 502, cors);
  }
}

// ── Admin dashboard (Part 2) ──

async function handleAdminDashboard(env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  try {
    const pendingFiles = await listFiles('pending', env);
    let pendingSubmissions = 0;
    let pendingCorrections = 0;
    let openReports = 0;
    let privacyReports = 0;

    if (pendingFiles) {
      for (const file of pendingFiles) {
        try {
          const content = await readFile(`pending/${file.name}`, env);
          if (content) {
            const record = JSON.parse(content);
            if (record.status === 'reported') {
              openReports++;
              if (record.reportType === 'PRIVACY_CONCERN') privacyReports++;
            } else if (record.targetType) {
              pendingCorrections++;
            } else {
              pendingSubmissions++;
            }
          }
        } catch (e) { /* skip */ }
      }
    }

    // Count published records
    let publishedGraves = 0;
    let publishedCemeteries = 0;
    try {
      const graveFiles = await listFiles('graves', env);
      publishedGraves = graveFiles ? graveFiles.length : 0;
    } catch (e) { /* skip */ }
    try {
      const cemeteryFiles = await listFiles('cemeteries', env);
      publishedCemeteries = cemeteryFiles ? cemeteryFiles.length : 0;
    } catch (e) { /* skip */ }

    // Count audit events
    let auditCount = 0;
    try {
      const auditFiles = await listFiles('audit', env);
      auditCount = auditFiles ? auditFiles.length : 0;
    } catch (e) { /* skip */ }

    return jsonResponse({
      success: true,
      dashboard: {
        pendingSubmissions,
        pendingCorrections,
        openReports,
        privacyReports,
        publishedGraves,
        publishedCemeteries,
        auditEvents: auditCount,
        githubConfigured: true,
        adminConfigured: !!env.ADMIN_TOKEN
      }
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to fetch dashboard' }, 502, cors);
  }
}

// ── Moderation queue for corrections (Part 4, 6) ──

async function handleListCorrections(env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  try {
    const files = await listFiles('pending', env);
    if (!files) {
      return jsonResponse({ success: true, corrections: [], count: 0 }, 200, cors);
    }

    let corrections = [];
    for (const file of files) {
      try {
        const content = await readFile(`pending/${file.name}`, env);
        if (content) {
          const record = JSON.parse(content);
          if (record.targetType) {
            corrections.push({
              id: record.id,
              targetId: record.targetId,
              targetType: record.targetType,
              corrections: record.corrections,
              reason: record.reason,
              status: record.status || 'pending',
              submittedAt: record.submittedAt,
              contributorId: record.contributorId
            });
          }
        }
      } catch (e) { /* skip */ }
    }

    return jsonResponse({ success: true, corrections, count: corrections.length }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to fetch corrections' }, 502, cors);
  }
}

async function handleApproveCorrection(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid correction ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  let body = {};
  try { body = await request.json(); } catch (e) {}

  try {
    const content = await readFile(`pending/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Correction not found' }, 404, cors);
    }

    const correction = JSON.parse(content);
    if (!correction.targetType) {
      return jsonResponse({ success: false, error: 'Not a correction' }, 400, cors);
    }

    const previousStatus = correction.status || 'pending';
    if (!isValidTransition('correction', previousStatus, 'accepted')) {
      return jsonResponse({ success: false, error: `Invalid transition: ${previousStatus} → accepted` }, 409, cors);
    }

    // Read the canonical record (Part 6 — preserve previous value)
    let canonicalRecord = null;
    let canonicalPath = '';
    if (correction.targetType === 'grave') canonicalPath = `graves/${correction.targetId}.json`;
    else if (correction.targetType === 'cemetery') canonicalPath = `cemeteries/${correction.targetId}.json`;
    else if (correction.targetType === 'person') canonicalPath = `people/${correction.targetId}.json`;

    if (canonicalPath) {
      try {
        const canonicalContent = await readFile(canonicalPath, env);
        if (canonicalContent) canonicalRecord = JSON.parse(canonicalContent);
      } catch (e) { /* record may not exist */ }
    }

    // Store previous values for audit (Part 6)
    const previousValues = {};
    if (canonicalRecord) {
      for (const field of Object.keys(correction.corrections || {})) {
        previousValues[field] = canonicalRecord[field];
        // Apply correction to canonical record
        canonicalRecord[field] = correction.corrections[field];
      }
      canonicalRecord.updatedAt = new Date().toISOString();

      // Write updated canonical record
      await writeFile(
        canonicalPath,
        JSON.stringify(canonicalRecord, null, 2),
        env,
        `correction: apply correction ${safeId} to ${correction.targetType} ${correction.targetId}`
      );
    }

    // Update correction status
    correction.status = 'accepted';
    correction.updatedAt = new Date().toISOString();
    correction.reviewedAt = new Date().toISOString();
    correction.previousValues = previousValues;
    if (body.note) correction.moderationNote = body.note;

    await writeFile(
      `pending/${safeId}.json`,
      JSON.stringify(correction, null, 2),
      env,
      `correction: ${safeId} accepted`
    );

    // Create audit event (Part 6, 7)
    await createAuditEvent(env, {
      entityId: correction.targetId,
      entityType: correction.targetType,
      action: 'UPDATE',
      actorType: 'admin',
      reason: `Correction accepted: ${correction.reason || 'no reason provided'}`,
      previousState: previousValues,
      newState: correction.corrections
    });

    if (correction.contributorId) {
      await updateContributorStats(env, correction.contributorId, 'accepted');
    }

    return jsonResponse({
      success: true,
      message: `Correction ${safeId} accepted and applied`,
      targetId: correction.targetId,
      previousValues
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to approve correction' }, 500, cors);
  }
}

async function handleRejectCorrection(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid correction ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  let body = {};
  try { body = await request.json(); } catch (e) {}

  if (body.reason && !MODERATION_REASONS.includes(body.reason)) {
    return jsonResponse({ success: false, error: 'Invalid moderation reason' }, 400, cors);
  }

  try {
    const content = await readFile(`pending/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Correction not found' }, 404, cors);
    }

    const correction = JSON.parse(content);
    if (!correction.targetType) {
      return jsonResponse({ success: false, error: 'Not a correction' }, 400, cors);
    }

    const previousStatus = correction.status || 'pending';
    if (!isValidTransition('correction', previousStatus, 'rejected')) {
      return jsonResponse({ success: false, error: `Invalid transition: ${previousStatus} → rejected` }, 409, cors);
    }

    correction.status = 'rejected';
    correction.updatedAt = new Date().toISOString();
    correction.reviewedAt = new Date().toISOString();
    if (body.reason) correction.moderationReason = body.reason;
    if (body.note) correction.moderationNote = body.note;

    await writeFile(
      `pending/${safeId}.json`,
      JSON.stringify(correction, null, 2),
      env,
      `correction: ${safeId} rejected`
    );

    await createAuditEvent(env, {
      entityId: correction.targetId,
      entityType: correction.targetType,
      action: 'REJECT',
      actorType: 'admin',
      reason: body.reason || 'OTHER',
      note: body.note,
      previousState: { status: previousStatus },
      newState: { status: 'rejected' }
    });

    if (correction.contributorId) {
      await updateContributorStats(env, correction.contributorId, 'rejected');
    }

    return jsonResponse({ success: true, message: `Correction ${safeId} rejected` }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to reject correction' }, 500, cors);
  }
}

// ── Contributor tracking (Part 8) ──

async function updateContributorStats(env, contributorId, outcome) {
  if (!env.GITHUB_APP_ID || !contributorId) return;

  let stats = {
    contributorId,
    submissions: 0,
    accepted: 0,
    rejected: 0,
    corrections: 0,
    reports: 0,
    usefulReports: 0,
    invalidReports: 0,
    updatedAt: new Date().toISOString()
  };

  try {
    const existing = await readFile(`contributors/${contributorId}.json`, env);
    if (existing) stats = JSON.parse(existing);
  } catch (e) { /* new contributor */ }

  if (outcome === 'accepted') {
    stats.accepted++;
    stats.submissions++;
  } else if (outcome === 'rejected') {
    stats.rejected++;
    stats.submissions++;
  } else if (outcome === 'correction') {
    stats.corrections++;
  } else if (outcome === 'report') {
    stats.reports++;
  } else if (outcome === 'useful_report') {
    stats.usefulReports++;
  } else if (outcome === 'invalid_report') {
    stats.invalidReports++;
  }

  stats.updatedAt = new Date().toISOString();

  try {
    await writeFile(
      `contributors/${contributorId}.json`,
      JSON.stringify(stats, null, 2),
      env,
      `contributor: stats updated for ${contributorId}`
    );
  } catch (e) { /* non-fatal */ }
}

async function handleListContributors(env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  try {
    const files = await listFiles('contributors', env);
    if (!files) {
      return jsonResponse({ success: true, contributors: [], count: 0 }, 200, cors);
    }

    let contributors = [];
    for (const file of files) {
      try {
        const content = await readFile(`contributors/${file.name}`, env);
        if (content) {
          const record = JSON.parse(content);
          // Calculate acceptance rate (not publicly exposed — admin only)
          const totalSubs = record.accepted + record.rejected;
          record.acceptanceRate = totalSubs > 0 ? (record.accepted / totalSubs) : 0;
          contributors.push(record);
        }
      } catch (e) { /* skip */ }
    }

    contributors.sort((a, b) => b.submissions - a.submissions);
    return jsonResponse({ success: true, contributors, count: contributors.length }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to fetch contributors' }, 502, cors);
  }
}

// ── Report resolution (Part 9, 10) ──

async function handleResolveReport(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid report ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  let body = {};
  try { body = await request.json(); } catch (e) {}

  try {
    // Reports are stored as pending/report_<id>.json
    const reportPath = `pending/report_${safeId.replace('report_', '')}.json`;
    const content = await readFile(reportPath, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Report not found' }, 404, cors);
    }

    const report = JSON.parse(content);
    if (report.status !== 'reported') {
      return jsonResponse({ success: false, error: 'Not a report' }, 400, cors);
    }

    const previousStatus = 'OPEN';
    if (!isValidTransition('report', previousStatus, 'RESOLVED')) {
      return jsonResponse({ success: false, error: 'Invalid transition' }, 409, cors);
    }

    report.reportStatus = 'RESOLVED';
    report.resolvedAt = new Date().toISOString();
    if (body.resolution && typeof body.resolution === 'string' && body.resolution.length <= MAX_FIELD_LENGTH) {
      report.resolution = body.resolution;
    }
    if (body.action && body.action.length <= MAX_FIELD_LENGTH) {
      report.resolutionAction = body.action;
    }

    await writeFile(
      reportPath,
      JSON.stringify(report, null, 2),
      env,
      `report: ${safeId} resolved`
    );

    // Audit event
    await createAuditEvent(env, {
      entityId: report.targetId || safeId,
      entityType: 'report',
      action: 'UPDATE',
      actorType: 'admin',
      reason: `Report resolved: ${body.resolution || 'no resolution noted'}`,
      previousState: { status: 'OPEN' },
      newState: { status: 'RESOLVED', action: body.action }
    });

    // Update contributor stats for useful report
    if (report.contributorId) {
      await updateContributorStats(env, report.contributorId, 'useful_report');
    }

    return jsonResponse({ success: true, message: `Report ${safeId} resolved` }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to resolve report' }, 500, cors);
  }
}

async function handleRejectReport(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid report ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  let body = {};
  try { body = await request.json(); } catch (e) {}

  try {
    const reportPath = `pending/report_${safeId.replace('report_', '')}.json`;
    const content = await readFile(reportPath, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Report not found' }, 404, cors);
    }

    const report = JSON.parse(content);
    if (report.status !== 'reported') {
      return jsonResponse({ success: false, error: 'Not a report' }, 400, cors);
    }

    report.reportStatus = 'REJECTED';
    report.resolvedAt = new Date().toISOString();
    if (body.reason) report.rejectionReason = body.reason;

    await writeFile(
      reportPath,
      JSON.stringify(report, null, 2),
      env,
      `report: ${safeId} rejected`
    );

    await createAuditEvent(env, {
      entityId: report.targetId || safeId,
      entityType: 'report',
      action: 'REJECT',
      actorType: 'admin',
      reason: body.reason || 'Report rejected',
      previousState: { status: 'OPEN' },
      newState: { status: 'REJECTED' }
    });

    if (report.contributorId) {
      await updateContributorStats(env, report.contributorId, 'invalid_report');
    }

    return jsonResponse({ success: true, message: `Report ${safeId} rejected` }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to reject report' }, 500, cors);
  }
}

// ── Data quality engine (Part 11) ──

async function handleDataQuality(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  const errors = [];
  const warnings = [];
  const info = [];

  try {
    // Load all published graves
    const graveFiles = await listFiles('graves', env);
    const graves = new Map();
    if (graveFiles) {
      for (const file of graveFiles) {
        try {
          const content = await readFile(`graves/${file.name}`, env);
          if (content) {
            const record = JSON.parse(content);
            const id = record.id || file.name.replace('.json', '');
            graves.set(id, record);

            // Check: missing required identifier
            if (!record.id) errors.push({ type: 'ERROR', check: 'missing_id', file: `graves/${file.name}`, message: 'Missing required id field' });

            // Check: missing name
            if (!record.name) errors.push({ type: 'ERROR', check: 'missing_name', file: `graves/${file.name}`, message: 'Missing required name field' });

            // Check: invalid coordinates
            if (record.latitude !== undefined && record.longitude !== undefined) {
              const lat = parseFloat(record.latitude), lon = parseFloat(record.longitude);
              if (isNaN(lat) || lat < -90 || lat > 90) errors.push({ type: 'ERROR', check: 'invalid_lat', file: `graves/${file.name}`, message: `Invalid latitude: ${record.latitude}` });
              if (isNaN(lon) || lon < -180 || lon > 180) errors.push({ type: 'ERROR', check: 'invalid_lon', file: `graves/${file.name}`, message: `Invalid longitude: ${record.longitude}` });
            }

            // Check: impossible dates
            if (record.birthDate && record.deathDate) {
              const birth = parseInt(record.birthDate.substring(0, 4));
              const death = parseInt(record.deathDate.substring(0, 4));
              if (!isNaN(birth) && !isNaN(death) && death < birth) {
                errors.push({ type: 'ERROR', check: 'impossible_date', file: `graves/${file.name}`, message: `Death date (${record.deathDate}) before birth date (${record.birthDate})` });
              }
            }

            // Warning: no coordinates
            if (record.latitude === undefined && record.longitude === undefined) {
              warnings.push({ type: 'WARNING', check: 'no_coordinates', file: `graves/${file.name}`, message: 'Grave has no coordinates' });
            }

            // Warning: no source refs
            if (!record.sourceRefs || record.sourceRefs.length === 0) {
              warnings.push({ type: 'WARNING', check: 'no_source', file: `graves/${file.name}`, message: 'Grave has no source references' });
            }

            // Info: no photo
            if (!record.photoRefs || record.photoRefs.length === 0) {
              info.push({ type: 'INFO', check: 'no_photo', file: `graves/${file.name}`, message: 'Grave has no photo' });
            }
          }
        } catch (e) {
          errors.push({ type: 'ERROR', check: 'invalid_json', file: `graves/${file.name}`, message: `Cannot parse JSON: ${e.message}` });
        }
      }
    }

    // Load all published cemeteries
    const cemeteryFiles = await listFiles('cemeteries', env);
    const cemeteries = new Map();
    if (cemeteryFiles) {
      for (const file of cemeteryFiles) {
        try {
          const content = await readFile(`cemeteries/${file.name}`, env);
          if (content) {
            const record = JSON.parse(content);
            const id = record.id || file.name.replace('.json', '');
            cemeteries.set(id, record);

            if (!record.id) errors.push({ type: 'ERROR', check: 'missing_id', file: `cemeteries/${file.name}`, message: 'Missing required id field' });
            if (!record.name) errors.push({ type: 'ERROR', check: 'missing_name', file: `cemeteries/${file.name}`, message: 'Missing required name field' });

            // Check: invalid country code
            if (record.countryCode && !/^[A-Z]{2}$/.test(record.countryCode)) {
              errors.push({ type: 'ERROR', check: 'invalid_country_code', file: `cemeteries/${file.name}`, message: `Invalid country code: ${record.countryCode}` });
            }

            // Check: malformed URL
            if (record.website && !/^https?:\/\//.test(record.website)) {
              errors.push({ type: 'ERROR', check: 'malformed_url', file: `cemeteries/${file.name}`, message: `Malformed website URL: ${record.website}` });
            }
          }
        } catch (e) {
          errors.push({ type: 'ERROR', check: 'invalid_json', file: `cemeteries/${file.name}`, message: `Cannot parse JSON: ${e.message}` });
        }
      }
    }

    // Cross-reference checks (Part 13: Data consistency)
    for (const [graveId, grave] of graves) {
      // Check: orphaned grave (references cemetery that doesn't exist)
      if (grave.cemeteryId && !cemeteries.has(grave.cemeteryId)) {
        errors.push({ type: 'ERROR', check: 'orphaned_grave', entity: graveId, message: `Grave references missing cemetery: ${grave.cemeteryId}` });
      }
    }

    // Check: duplicate IDs across graves and cemeteries
    const allIds = new Set();
    for (const [id, record] of graves) {
      if (allIds.has(id)) errors.push({ type: 'ERROR', check: 'duplicate_id', message: `Duplicate ID: ${id}` });
      allIds.add(id);
    }
    for (const [id, record] of cemeteries) {
      if (allIds.has(id)) errors.push({ type: 'ERROR', check: 'duplicate_id', message: `Duplicate ID across entities: ${id}` });
      allIds.add(id);
    }

    return jsonResponse({
      success: true,
      dataQuality: {
        errors,
        warnings,
        info,
        summary: {
          totalErrors: errors.length,
          totalWarnings: warnings.length,
          totalInfo: info.length,
          totalGraves: graves.size,
          totalCemeteries: cemeteries.size
        }
      }
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to run data quality checks' }, 500, cors);
  }
}

// ── Restoration (Part 19) ──

async function handleRestoreRecord(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured' }, 503, cors);
  }

  // Try to find the record in archives or pending
  const paths = [
    `graves/${safeId}.json`,
    `cemeteries/${safeId}.json`,
    `pending/${safeId}.json`
  ];

  try {
    for (const path of paths) {
      try {
        const content = await readFile(path, env);
        if (content) {
          const record = JSON.parse(content);

          // Check if record is archived/removed
          if (record.lifecycleStatus === 'ARCHIVED' || record.lifecycleStatus === 'REMOVED') {
            record.lifecycleStatus = 'ACTIVE';
            record.restoredAt = new Date().toISOString();

            await writeFile(
              path,
              JSON.stringify(record, null, 2),
              env,
              `restore: ${safeId} restored from ${record.lifecycleStatus}`
            );

            await createAuditEvent(env, {
              entityId: safeId,
              entityType: path.startsWith('graves/') ? 'grave' : path.startsWith('cemeteries/') ? 'cemetery' : 'submission',
              action: 'RESTORE',
              actorType: 'admin',
              reason: `Record restored from ${record.lifecycleStatus}`,
              previousState: { lifecycleStatus: 'ARCHIVED' },
              newState: { lifecycleStatus: 'ACTIVE' }
            });

            return jsonResponse({ success: true, message: `Record ${safeId} restored`, path }, 200, cors);
          }

          return jsonResponse({ success: false, error: 'Record is not archived or removed' }, 409, cors);
        }
      } catch (e) { /* try next path */ }
    }

    return jsonResponse({ success: false, error: 'Record not found' }, 404, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to restore record' }, 500, cors);
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
  return `sub_${hex}

// ── Request ID / Correlation ID ──

function generateRequestId() {
  // Generate a short, URL-safe request ID for tracing
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return 'req_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
`;
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
  const headers = {
    'Content-Type': 'application/json',
    ...cors,
  };
  if (_currentRequestId) headers['X-Request-Id'] = _currentRequestId;
  return new Response(JSON.stringify(data), {
    status: status,
    headers: headers,
  });
}

function notFound(cors) {
  return jsonResponse({ success: false, error: 'Not found' }, 404, cors);
}

// ── Phase 6A: Community & Contribution Handlers ──

function getUserIdFromRequest(request) {
  const userId = request.headers.get('X-User-Id');
  if (!userId || typeof userId !== 'string' || userId.length > 200) return null;
  if (!/^user_[a-z0-9]+$/i.test(userId)) return null;
  return userId;
}

async function handleUserRegister(request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, cors);
  }

  const nameError = Phase6A.validateDisplayName(body.displayName);
  if (nameError) return jsonResponse({ success: false, error: nameError }, 400, cors);

  const bioError = Phase6A.validateProfileBio(body.bio);
  if (bioError) return jsonResponse({ success: false, error: bioError }, 400, cors);

  const result = await Phase6A.createOrUpdateUser(env, userId, body.displayName, body.bio, body.authMethod || 'anonymous');

  if (result.isNew) {
    await Phase6A.createContributionAuditEvent(env, Phase6A.AUDIT_ACTIONS.USER_REGISTERED, userId, userId, { displayName: body.displayName });
  }

  return jsonResponse({ success: true, user: Phase6A.getPublicProfile(result.user), isNew: result.isNew }, 200, cors);
}

async function handleGetOwnProfile(request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  const user = await Phase6A.getUser(env, userId);
  if (!user) return jsonResponse({ success: false, error: 'User not found' }, 404, cors);

  return jsonResponse({ success: true, profile: Phase6A.getPublicProfile(user) }, 200, cors);
}

async function handleUpdateProfile(request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, cors);
  }

  const nameError = body.displayName ? Phase6A.validateDisplayName(body.displayName) : null;
  if (nameError) return jsonResponse({ success: false, error: nameError }, 400, cors);

  const bioError = body.bio !== undefined ? Phase6A.validateProfileBio(body.bio) : null;
  if (bioError) return jsonResponse({ success: false, error: bioError }, 400, cors);

  const result = await Phase6A.createOrUpdateUser(env, userId, body.displayName, body.bio);
  await Phase6A.createContributionAuditEvent(env, Phase6A.AUDIT_ACTIONS.USER_PROFILE_UPDATED, userId, userId, {});

  return jsonResponse({ success: true, profile: Phase6A.getPublicProfile(result.user) }, 200, cors);
}

async function handleGetPublicProfile(userId, env, cors) {
  const user = await Phase6A.getUser(env, userId);
  if (!user) return jsonResponse({ success: false, error: 'User not found' }, 404, cors);

  if (user.accountStatus === 'DEACTIVATED') {
    return jsonResponse({ success: false, error: 'User not found' }, 404, cors);
  }

  return jsonResponse({ success: true, profile: Phase6A.getPublicProfile(user) }, 200, cors);
}

// ── Session handlers ──

async function handleCreateSession(request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  // Check if user exists
  const user = await Phase6A.getUser(env, userId);
  if (!user) return jsonResponse({ success: false, error: 'User not registered. Call /api/user/register first.' }, 404, cors);
  if (user.accountStatus === 'SUSPENDED') return jsonResponse({ success: false, error: 'Account suspended' }, 403, cors);
  if (user.accountStatus === 'DEACTIVATED') return jsonResponse({ success: false, error: 'Account deactivated' }, 403, cors);

  const role = user.role || Phase6A.USER_ROLE_USER;
  const session = await Phase6A.createSession(env, userId, role);

  await Phase6A.createContributionAuditEvent(env, Phase6A.AUDIT_ACTIONS.SESSION_CREATED, userId, session.sessionId, { role });

  return jsonResponse({ success: true, ...session }, 200, cors);
}

async function handleRevokeSession(request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, cors);
  }

  if (!body.sessionId) return jsonResponse({ success: false, error: 'sessionId required' }, 400, cors);

  const revoked = await Phase6A.revokeSession(env, body.sessionId);
  if (!revoked) return jsonResponse({ success: false, error: 'Session not found' }, 404, cors);

  await Phase6A.createContributionAuditEvent(env, Phase6A.AUDIT_ACTIONS.SESSION_REVOKED, userId, body.sessionId, {});

  return jsonResponse({ success: true }, 200, cors);
}

// ── Moderation note handlers ──

async function handleAddModerationNote(request, env, cors) {
  const match = request.url.match(/\/api\/admin\/contributions\/([^/]+)\/notes/);
  if (!match) return jsonResponse({ success: false, error: 'Invalid path' }, 400, cors);
  const contributionId = match[1];

  const moderatorId = getUserIdFromRequest(request) || 'admin';

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, cors);
  }

  if (!body.note) return jsonResponse({ success: false, error: 'note required' }, 400, cors);

  const result = await Phase6A.addModerationNote(env, contributionId, moderatorId, body.note);
  if (!result.success) return jsonResponse({ success: false, error: result.error }, 400, cors);

  await Phase6A.createContributionAuditEvent(env, Phase6A.AUDIT_ACTIONS.MODERATION_NOTE_ADDED, moderatorId, contributionId, { noteId: result.noteId });

  return jsonResponse({ success: true, noteId: result.noteId }, 201, cors);
}

async function handleGetModerationNotes(request, env, cors) {
  const match = request.url.match(/\/api\/admin\/contributions\/([^/]+)\/notes/);
  if (!match) return jsonResponse({ success: false, error: 'Invalid path' }, 400, cors);
  const contributionId = match[1];

  const notes = await Phase6A.getModerationNotes(env, contributionId);
  return jsonResponse({ success: true, notes }, 200, cors);
}

// ── Admin user management handlers ──

async function handleListUsers(request, env, cors) {
  try {
    const files = await listFiles(env, 'users');
    const users = [];
    for (const file of files) {
      if (!file.name.endsWith('.json')) continue;
      try {
        const content = await readFile(env, `users/${file.name}`);
        if (content) {
          const user = JSON.parse(content);
          users.push(Phase6A.getPublicProfile(user));
        }
      } catch (e) {
        // Skip malformed files
      }
    }
    return jsonResponse({ success: true, users, count: users.length }, 200, cors);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Failed to list users' }, 500, cors);
  }
}

async function handleSetUserRole(request, env, cors) {
  const match = request.url.match(/\/api\/admin\/users\/([^/]+)\/role/);
  if (!match) return jsonResponse({ success: false, error: 'Invalid path' }, 400, cors);
  const targetUserId = match[1];

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, cors);
  }

  if (!body.role) return jsonResponse({ success: false, error: 'role required' }, 400, cors);

  const result = await Phase6A.setUserRole(env, targetUserId, body.role);
  if (!result.success) return jsonResponse({ success: false, error: result.error }, 400, cors);

  await Phase6A.createContributionAuditEvent(env, Phase6A.AUDIT_ACTIONS.ROLE_ASSIGNED, 'admin', targetUserId, { role: body.role });

  return jsonResponse({ success: true, userId: targetUserId, role: result.role }, 200, cors);
}

// ── Publication pipeline handlers ──

async function handleRetryPublication(pubId, request, env, cors) {
  const safeId = sanitizePathSegment(pubId);
  if (!safeId || safeId !== pubId) {
    return jsonResponse({ success: false, error: 'Invalid publication ID' }, 400, cors);
  }

  try {
    const content = await readFile(`publication-queue/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Publication record not found' }, 404, cors);
    }

    const pubRecord = JSON.parse(content);

    if (pubRecord.state !== Phase4A.PUB_STATE_FAILED) {
      return jsonResponse({ success: false, error: `Cannot retry: current state is ${pubRecord.state}` }, 409, cors);
    }

    // Retry the publication
    const record = pubRecord.recordData;
    const targetPath = pubRecord.recordType === 'grave' ? `graves/${record.id}.json` : `${pubRecord.recordType}s/${record.id}.json`;
    const commitMsg = `retry: ${record.name || safeId} publication attempt ${pubRecord.attempts + 1}`;

    const result = await Phase4A.safePublish(env, targetPath, record, commitMsg, pubRecord);

    if (!result.success) {
      return jsonResponse({
        success: false,
        error: `Retry failed after ${result.attempts} attempts: ${result.error?.message || 'unknown'}`,
        publicationId: pubId,
        attempts: result.attempts,
      }, 502, cors);
    }

    return jsonResponse({
      success: true,
      message: `Publication ${pubId} succeeded on retry`,
      publicationId: pubId,
      attempts: result.attempts,
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to retry publication: ' + (error.message || 'unknown') }, 500, cors);
  }
}

async function handleGetPublicationStatus(pubId, env, cors) {
  const safeId = sanitizePathSegment(pubId);
  if (!safeId || safeId !== pubId) {
    return jsonResponse({ success: false, error: 'Invalid publication ID' }, 400, cors);
  }

  try {
    const content = await readFile(`publication-queue/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Publication record not found' }, 404, cors);
    }

    const pubRecord = JSON.parse(content);
    return jsonResponse({
      success: true,
      publication: {
        id: pubRecord.id,
        submissionId: pubRecord.submissionId,
        recordType: pubRecord.recordType,
        state: pubRecord.state,
        attempts: pubRecord.attempts,
        maxAttempts: pubRecord.maxAttempts,
        createdAt: pubRecord.createdAt,
        updatedAt: pubRecord.updatedAt,
        publishedAt: pubRecord.publishedAt,
        lastError: pubRecord.lastError,
        schemaVersion: pubRecord.schemaVersion,
      },
    }, 200, cors);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Failed to read publication record' }, 500, cors);
  }
}

async function handleListAllContributions(request, env, cors) {
  try {
    const files = await listFiles(env, 'contributions');
    const contributions = [];
    for (const file of files) {
      if (!file.name.endsWith('.json')) continue;
      try {
        const content = await readFile(env, `contributions/${file.name}`);
        if (content) {
          const c = JSON.parse(content);
          contributions.push({
            id: c.id,
            userId: c.userId,
            type: c.type,
            status: c.status,
            createdAt: c.createdAt,
          });
        }
      } catch (e) {
        // Skip malformed
      }
    }
    return jsonResponse({ success: true, contributions, count: contributions.length }, 200, cors);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Failed to list contributions' }, 500, cors);
  }
}

async function handleCreateContribution(request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  const user = await Phase6A.getUser(env, userId);
  if (!user) return jsonResponse({ success: false, error: 'User not registered' }, 401, cors);
  if (user.accountStatus === 'SUSPENDED') return jsonResponse({ success: false, error: 'Account suspended' }, 403, cors);
  if (user.accountStatus === 'DEACTIVATED') return jsonResponse({ success: false, error: 'Account deactivated' }, 403, cors);

  const rl = Phase6A.checkUserRateLimit(userId);
  if (!rl.allowed) return jsonResponse({ success: false, error: 'Rate limit exceeded' }, 429, cors);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, cors);
  }

  const typeError = Phase6A.validateContributionType(body.type);
  if (typeError) return jsonResponse({ success: false, error: typeError }, 400, cors);

  let validationErrors = [];
  if (body.type === 'cemetery') validationErrors = Phase6A.validateCemeteryContribution(body.data || {});
  else if (body.type === 'grave') validationErrors = Phase6A.validateGraveContribution(body.data || {});
  else if (body.type === 'correction') validationErrors = Phase6A.validateCorrectionContribution(body.data || {});
  if (validationErrors.length > 0) return jsonResponse({ success: false, error: 'Validation failed', details: validationErrors }, 400, cors);

  const contribution = await Phase6A.createContribution(env, userId, body.type, body.data || {}, 'PENDING_REVIEW');
  await Phase6A.createContributionAuditEvent(env, Phase6A.AUDIT_ACTIONS.SUBMISSION_CREATED, userId, contribution.id, { type: body.type });
  await Phase6A.updateUserStats(env, userId, false);

  return jsonResponse({ success: true, contribution: { id: contribution.id, type: contribution.type, status: contribution.status, createdAt: contribution.createdAt } }, 201, cors);
}

async function handleListContributions(request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const type = url.searchParams.get('type') || undefined;
  const status = url.searchParams.get('status') || undefined;

  const result = await Phase6A.listUserContributions(env, userId, { page, pageSize, type, status });
  return jsonResponse({ success: true, ...result }, 200, cors);
}

async function handleGetContribution(id, request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  const auth = await Phase6A.authorizeContributionAccess(env, id, userId);
  if (!auth.authorized) return jsonResponse({ success: false, error: auth.reason }, 403, cors);

  const c = auth.contribution;
  return jsonResponse({
    success: true,
    contribution: {
      id: c.id,
      type: c.type,
      status: c.status,
      data: c.data,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      reviewerMessage: c.reviewerMessage || null,
    }
  }, 200, cors);
}

async function handleCancelContribution(id, request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  const auth = await Phase6A.authorizeContributionAccess(env, id, userId);
  if (!auth.authorized) return jsonResponse({ success: false, error: auth.reason }, 403, cors);

  const c = auth.contribution;
  if (c.status === 'APPROVED' || c.status === 'REJECTED') {
    return jsonResponse({ success: false, error: 'Cannot cancel a contribution that is already approved or rejected' }, 409, cors);
  }

  const updated = await Phase6A.updateContribution(env, id, { status: 'CANCELLED' });
  await Phase6A.createContributionAuditEvent(env, Phase6A.AUDIT_ACTIONS.SUBMISSION_CANCELLED, userId, id, {});

  return jsonResponse({ success: true, contribution: { id: updated.id, status: updated.status } }, 200, cors);
}

async function handleCheckDuplicate(request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, cors);
  }

  const type = body.type || 'grave';
  const existingRecords = [];

  // Fetch existing records of the same type
  try {
    const dir = type === 'cemetery' ? 'cemeteries/' : 'graves/';
    const files = await listFiles(env, dir);
    if (files) {
      for (const file of files.slice(0, 100)) {
        try {
          const content = await readFile(env, dir + (file.name || file));
          if (content) existingRecords.push(JSON.parse(content));
        } catch (e) { /* skip */ }
      }
    }
  } catch (e) { /* no existing data */ }

  const result = Phase6A.checkDuplicateSubmission(existingRecords, body.data || {});
  return jsonResponse({ success: true, ...result }, 200, cors);
}

async function handleCreateDraft(request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  const user = await Phase6A.getUser(env, userId);
  if (!user) return jsonResponse({ success: false, error: 'User not registered' }, 401, cors);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, cors);
  }

  const typeError = Phase6A.validateContributionType(body.type);
  if (typeError) return jsonResponse({ success: false, error: typeError }, 400, cors);

  const draft = await Phase6A.createDraft(env, userId, body.type, body.data || {});
  await Phase6A.createContributionAuditEvent(env, Phase6A.AUDIT_ACTIONS.DRAFT_UPDATED, userId, draft.id, { action: 'created' });

  return jsonResponse({ success: true, draft: { id: draft.id, type: draft.type, status: draft.status, createdAt: draft.createdAt } }, 201, cors);
}

async function handleListDrafts(request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  const result = await Phase6A.listUserDrafts(env, userId);
  return jsonResponse({ success: true, ...result }, 200, cors);
}

async function handleGetDraft(id, request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  const auth = await Phase6A.authorizeDraftAccess(env, id, userId);
  if (!auth.authorized) return jsonResponse({ success: false, error: auth.reason }, 403, cors);

  return jsonResponse({ success: true, draft: auth.draft }, 200, cors);
}

async function handleUpdateDraft(id, request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  const auth = await Phase6A.authorizeDraftAccess(env, id, userId);
  if (!auth.authorized) return jsonResponse({ success: false, error: auth.reason }, 403, cors);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, cors);
  }

  const updated = await Phase6A.updateDraft(env, id, body.data || {});
  await Phase6A.createContributionAuditEvent(env, Phase6A.AUDIT_ACTIONS.DRAFT_UPDATED, userId, id, { action: 'updated' });

  return jsonResponse({ success: true, draft: { id: updated.id, status: updated.status, updatedAt: updated.updatedAt } }, 200, cors);
}

async function handleDeleteDraft(id, request, env, cors) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return jsonResponse({ success: false, error: 'X-User-Id header required' }, 400, cors);

  const auth = await Phase6A.authorizeDraftAccess(env, id, userId);
  if (!auth.authorized) return jsonResponse({ success: false, error: auth.reason }, 403, cors);

  await Phase6A.deleteDraft(env, id);
  return jsonResponse({ success: true }, 200, cors);
}

async function handleSubmitDraft(id, request, env, cors) {
  // Require Google authentication
  const auth = requireGoogleAuth(request, env);
  if (!auth.authenticated) return jsonResponse({ success: false, error: auth.error }, 401, cors);
  const userId = auth.userId;
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('User-Agent') || '';

  const auth = await Phase6A.authorizeDraftAccess(env, id, userId);
  if (!auth.authorized) return jsonResponse({ success: false, error: auth.reason }, 403, cors);

  const draft = auth.draft;

  // Validate the draft data as a contribution
  let validationErrors = [];
  if (draft.type === 'cemetery') validationErrors = Phase6A.validateCemeteryContribution(draft.data || {});
  else if (draft.type === 'grave') validationErrors = Phase6A.validateGraveContribution(draft.data || {});
  else if (draft.type === 'correction') validationErrors = Phase6A.validateCorrectionContribution(draft.data || {});
  if (validationErrors.length > 0) return jsonResponse({ success: false, error: 'Validation failed', details: validationErrors }, 400, cors);

  // Create contribution from draft
  const contribution = await Phase6A.createContribution(env, userId, draft.type, draft.data, 'PENDING_REVIEW');
  await Phase6A.createContributionAuditEvent(env, Phase6A.AUDIT_ACTIONS.SUBMISSION_CREATED, userId, contribution.id, { type: draft.type, fromDraft: id });

  // Log submission attempt for abuse prevention
  await logSubmissionAttempt(env, {
    userId,
    googleSub: auth.googleSub,
    contributionId: contribution.id,
    contributionType: draft.type,
    clientIp,
    userAgent,
    success: true,
  });

  // Delete the draft
  await Phase6A.deleteDraft(env, id);
  await Phase6A.updateUserStats(env, userId, false);

  return jsonResponse({ success: true, contribution: { id: contribution.id, type: contribution.type, status: contribution.status, createdAt: contribution.createdAt } }, 201, cors);
}

async function handleSubmitPhoto(request, env, cors) {
  // Require Google authentication
  const auth = requireGoogleAuth(request, env);
  if (!auth.authenticated) return jsonResponse({ success: false, error: auth.error }, 401, cors);
  const userId = auth.userId;
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('User-Agent') || '';

  const user = await Phase6A.getUser(env, userId);
  if (!user) return jsonResponse({ success: false, error: 'User not registered' }, 401, cors);
  if (user.accountStatus === 'SUSPENDED') return jsonResponse({ success: false, error: 'Account suspended' }, 403, cors);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, cors);
  }

  const errors = Phase6A.validatePhotoSubmission(body);
  if (errors.length > 0) return jsonResponse({ success: false, error: 'Validation failed', details: errors }, 400, cors);

  const rl = Phase6A.checkUserRateLimit(userId);
  if (!rl.allowed) return jsonResponse({ success: false, error: 'Rate limit exceeded' }, 429, cors);

  const photo = await Phase6A.createPhotoContribution(
    env, userId, body.targetId, body.targetType, body.photoUrl, body.rights, body.description, body.sourceRef
  );
  await Phase6A.createContributionAuditEvent(env, Phase6A.AUDIT_ACTIONS.PHOTO_SUBMITTED, userId, photo.id, {
    targetId: body.targetId, targetType: body.targetType, rights: body.rights
  });

  // Log submission attempt for abuse prevention
  await logSubmissionAttempt(env, {
    userId,
    googleSub: auth.googleSub,
    contributionId: photo.id,
    contributionType: 'photo',
    clientIp,
    userAgent,
    success: true,
  });

  return jsonResponse({
    success: true,
    photo: { id: photo.id, status: photo.status, rights: photo.rights, createdAt: photo.createdAt }
  }, 201, cors);
}

// ── Phase 7A: Advanced Search & Global Discovery Handlers ──

async function handleGlobalSearch(request, env, cors) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const errors = Phase7A.validateSearchQuery(params);
  if (errors.length > 0) {
    return jsonResponse({ success: false, error: 'Validation failed', details: errors }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, results: [], categories: {}, count: 0, total: 0, message: 'Search unavailable — GitHub not configured.' }, 200, cors);
  }

  try {
    const result = await Phase7A.globalSearch(env, params);
    return jsonResponse(result, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, results: [], categories: {}, count: 0, message: 'Search temporarily unavailable.' }, 200, cors);
  }
}

async function handlePersonSearch(request, env, cors) {
  const url = new URL(request.url);
  const params = url.searchParams;
  params.set('type', 'people');

  const errors = Phase7A.validateSearchQuery(params);
  if (errors.length > 0) {
    return jsonResponse({ success: false, error: 'Validation failed', details: errors }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, results: [], count: 0, message: 'Search unavailable.' }, 200, cors);
  }

  try {
    const result = await Phase7A.globalSearch(env, params);
    const peopleResults = result.results.filter(r => r.category === 'people');
    return jsonResponse({
      success: true,
      results: peopleResults,
      count: peopleResults.length,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      hasMore: result.hasMore
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, results: [], count: 0, message: 'Search temporarily unavailable.' }, 200, cors);
  }
}

async function handleCemeterySearch(request, env, cors) {
  const url = new URL(request.url);
  const params = url.searchParams;
  params.set('type', 'cemeteries');

  const errors = Phase7A.validateSearchQuery(params);
  if (errors.length > 0) {
    return jsonResponse({ success: false, error: 'Validation failed', details: errors }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, results: [], count: 0, message: 'Search unavailable.' }, 200, cors);
  }

  try {
    const result = await Phase7A.globalSearch(env, params);
    const cemeteryResults = result.results.filter(r => r.category === 'cemeteries');
    return jsonResponse({
      success: true,
      results: cemeteryResults,
      count: cemeteryResults.length,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      hasMore: result.hasMore
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, results: [], count: 0, message: 'Search temporarily unavailable.' }, 200, cors);
  }
}

async function handleLocationSearch(request, env, cors) {
  const url = new URL(request.url);
  const params = url.searchParams;
  params.set('type', 'locations');

  const errors = Phase7A.validateSearchQuery(params);
  if (errors.length > 0) {
    return jsonResponse({ success: false, error: 'Validation failed', details: errors }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, results: [], count: 0, message: 'Search unavailable.' }, 200, cors);
  }

  try {
    const result = await Phase7A.globalSearch(env, params);
    const locationResults = result.results.filter(r => r.category === 'locations');
    return jsonResponse({
      success: true,
      results: locationResults,
      count: locationResults.length,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      hasMore: result.hasMore
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, results: [], count: 0, message: 'Search temporarily unavailable.' }, 200, cors);
  }
}

async function handleCountryDirectory(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, countries: [], count: 0, message: 'Directory unavailable.' }, 200, cors);
  }

  try {
    const result = await Phase7A.getCountryDirectory(env);
    return jsonResponse(result, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, countries: [], count: 0, message: 'Directory temporarily unavailable.' }, 200, cors);
  }
}

async function handleRegionDirectory(country, request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, regions: [], count: 0 }, 200, cors);
  }

  try {
    const result = await Phase7A.getRegionDirectory(env, country);
    return jsonResponse(result, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, regions: [], count: 0 }, 200, cors);
  }
}

async function handleCityDirectory(country, region, request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, cities: [], count: 0 }, 200, cors);
  }

  try {
    const result = await Phase7A.getCityDirectory(env, country, region);
    return jsonResponse(result, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, cities: [], count: 0 }, 200, cors);
  }
}

async function handleBrowseByLocation(request, env, cors) {
  const url = new URL(request.url);
  const country = url.searchParams.get('country');
  const region = url.searchParams.get('region');
  const city = url.searchParams.get('city');

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, cemeteries: [], count: 0 }, 200, cors);
  }

  try {
    const result = await Phase7A.browseByLocation(env, country, region, city);
    return jsonResponse(result, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, cemeteries: [], count: 0 }, 200, cors);
  }
}

async function handleRelatedRecords(recordId, request, env, cors) {
  const url = new URL(request.url);
  const recordType = url.searchParams.get('type') || 'cemetery';

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, nearby: [], sameCemetery: [], sameRegion: [] }, 200, cors);
  }

  // Validate recordId - prevent path traversal
  if (!recordId || recordId.includes('..') || recordId.includes('/') || recordId.includes('\\')) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  try {
    const result = await Phase7A.getRelatedRecords(env, recordId, recordType);
    return jsonResponse({ success: true, ...result }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, nearby: [], sameCemetery: [], sameRegion: [] }, 200, cors);
  }
}

// ── Phase 7B Handlers ──

async function handleNearbySearch(request, env, cors) {
  const url = new URL(request.url);
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');
  const radius = url.searchParams.get('radius') || '10';
  const type = url.searchParams.get('type') || 'all';

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, results: [], count: 0, message: 'Nearby search unavailable.' }, 200, cors);
  }

  // Validate coordinates
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (isNaN(latNum) || isNaN(lonNum)) {
    return jsonResponse({ success: false, error: 'Valid lat and lon parameters are required' }, 400, cors);
  }
  if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return jsonResponse({ success: false, error: 'Coordinates out of valid range' }, 400, cors);
  }

  // Validate radius
  const radiusNum = parseFloat(radius);
  if (isNaN(radiusNum) || radiusNum < 0 || radiusNum > 100) {
    return jsonResponse({ success: false, error: 'Radius must be between 0 and 100 km' }, 400, cors);
  }

  try {
    const result = await Phase7A.nearbySearch(env, lat, lon, radiusNum, type);
    return jsonResponse(result, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, results: [], count: 0, message: 'Nearby search temporarily unavailable.' }, 200, cors);
  }
}

// ── Viewport-based map search (Phase 2/5 gap) ──

async function handleViewportSearch(request, env, cors) {
  const url = new URL(request.url);
  const minLat = parseFloat(url.searchParams.get('minLat'));
  const maxLat = parseFloat(url.searchParams.get('maxLat'));
  const minLon = parseFloat(url.searchParams.get('minLon'));
  const maxLon = parseFloat(url.searchParams.get('maxLon'));
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200'), 500);
  const type = url.searchParams.get('type') || 'all';

  // Validate bounds
  for (const [name, val] of [['minLat', minLat], ['maxLat', maxLat], ['minLon', minLon], ['maxLon', maxLon]]) {
    if (isNaN(val)) return jsonResponse({ success: false, error: `${name} is required and must be numeric` }, 400, cors);
  }
  if (minLat < -90 || maxLat > 90 || minLon < -180 || maxLon > 180) {
    return jsonResponse({ success: false, error: 'Bounds out of valid range' }, 400, cors);
  }
  if (minLat >= maxLat || minLon >= maxLon) {
    return jsonResponse({ success: false, error: 'Invalid bounds: min must be less than max' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, results: [], count: 0, message: 'Map search unavailable.' }, 200, cors);
  }

  try {
    // Fetch graves within bounding box
    const results = [];
    const dirs = type === 'cemetery' ? ['cemeteries'] : type === 'grave' ? ['graves'] : ['graves', 'cemeteries'];

    for (const dir of dirs) {
      try {
        const files = await listFiles(dir, env);
        for (const file of files) {
          if (!file.name.endsWith('.json')) continue;
          if (results.length >= limit) break;
          try {
            const content = await readFile(`${dir}/${file.name}`, env);
            if (!content) continue;
            const record = JSON.parse(content);

            // Check if record has coordinates
            const lat = record.latitude || record.lat;
            const lon = record.longitude || record.lon;
            if (lat == null || lon == null) continue;

            const latNum = parseFloat(lat);
            const lonNum = parseFloat(lon);
            if (isNaN(latNum) || isNaN(lonNum)) continue;

            // Bounding box check
            if (latNum >= minLat && latNum <= maxLat && lonNum >= minLon && lonNum <= maxLon) {
              results.push({
                id: record.id,
                type: dir === 'graves' ? 'grave' : 'cemetery',
                name: record.name || record.cemeteryName || 'Unknown',
                lat: latNum,
                lon: lonNum,
                cemeteryName: record.cemeteryName || null,
                verificationStatus: record.verificationStatus || null,
              });
            }
          } catch (e) { /* skip malformed */ }
        }
      } catch (e) { /* dir not found */ }
    }

    return jsonResponse({
      success: true,
      results,
      count: results.length,
      bounds: { minLat, maxLat, minLon, maxLon },
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, results: [], count: 0, message: 'Map search temporarily unavailable.' }, 200, cors);
  }
}

async function handleRecommendations(recordId, request, env, cors) {
  const url = new URL(request.url);
  const recordType = url.searchParams.get('type') || 'cemetery';

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, nearby: [], sameCountry: [], sameRegion: [], sameCemetery: [] }, 200, cors);
  }

  // Prevent path traversal
  if (!recordId || recordId.includes('..') || recordId.includes('/') || recordId.includes('\\')) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  try {
    const result = await Phase7A.getRecommendations(env, recordId, recordType);
    return jsonResponse({ success: true, ...result }, 200, cors);
  } catch (error) {
    return jsonResponse({ success: true, nearby: [], sameCountry: [], sameRegion: [], sameCemetery: [] }, 200, cors);
  }
}

// ── Public record detail for share links (Part 125-126) ──
async function handlePublicRecord(path, request, env, cors) {
  const parts = path.split('/');
  const type = parts[3]; // "cemeteries" or "graves"
  const id = decodeURIComponent(parts[4]);

  // Validate ID — prevent path traversal
  if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
    return jsonResponse({ error: 'Invalid record ID' }, 400, cors);
  }

  try {
    let record = null;
    if (type === 'cemeteries') {
      record = await env.GRAVEATLAS_KV.get('cemetery:' + id);
    } else if (type === 'graves') {
      record = await env.GRAVEATLAS_KV.get('grave:' + id);
    }

    if (!record) {
      return jsonResponse({ error: 'Record not found' }, 404, cors);
    }

    const data = JSON.parse(record);
    // Only return public fields — no private data
    const publicFields = {
      id: data.id,
      name: data.name,
      type: type,
    };
    if (data.latitude) publicFields.latitude = data.latitude;
    if (data.longitude) publicFields.longitude = data.longitude;
    if (data.country) publicFields.country = data.country;
    if (data.region) publicFields.region = data.region;
    if (data.birthDate) publicFields.birthDate = data.birthDate;
    if (data.deathDate) publicFields.deathDate = data.deathDate;
    if (data.bio) publicFields.bio = data.bio;
    if (data.cemeteryName) publicFields.cemeteryName = data.cemeteryName;
    if (data.cemeteryId) publicFields.cemeteryId = data.cemeteryId;
    if (data.coordinateAccuracy) publicFields.coordinateAccuracy = data.coordinateAccuracy;

    return jsonResponse({ record: publicFields }, 200, cors);
  } catch (e) {
    return jsonResponse({ error: 'Failed to load record' }, 500, cors);
  }
}

// ── Google OAuth & Abuse Prevention Handlers ──

async function handleGoogleVerify(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400, cors);
  }

  const { idToken } = body;
  if (!idToken || typeof idToken !== 'string') {
    return jsonResponse({ success: false, error: 'Google ID token required' }, 400, cors);
  }

  // Verify the token with Google
  const expectedClientId = env.GOOGLE_CLIENT_ID || null;
  const googlePayload = await verifyGoogleIdToken(idToken, expectedClientId);
  if (!googlePayload) {
    return jsonResponse({ success: false, error: 'Invalid Google ID token' }, 401, cors);
  }

  // Get client IP and user-agent for logging
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('User-Agent') || '';

  // Create or update the user
  const result = await createOrUpdateGoogleUser(env, googlePayload, clientIp, userAgent);
  if (result.error) {
    return jsonResponse({ success: false, error: result.error, banReason: result.banReason }, 403, cors);
  }

  // Create a session token
  const sessionToken = createSessionToken(result.userId, env.ADMIN_TOKEN, googlePayload.sub);

  // Log the login
  await logSubmissionAttempt(env, {
    userId: result.userId,
    googleSub: googlePayload.sub,
    contributionType: 'AUTH_LOGIN',
    clientIp,
    userAgent,
    success: true,
    reason: isNewUserLogin(result) ? 'new_user' : 'returning_user',
  });

  return jsonResponse({
    success: true,
    sessionToken,
    user: {
      userId: result.userId,
      displayName: googlePayload.name || googlePayload.email?.split('@')[0] || 'Anonymous',
      email: googlePayload.email,
      picture: googlePayload.picture,
      isNew: result.isNew,
    },
    message: result.isNew ? 'Account created. You can now contribute to GraveAtlas.' : 'Welcome back.'
  }, 200, cors);
}

function isNewUserLogin(result) {
  return result.isNew;
}

async function handleCheckSession(request, env, cors) {
  const auth = requireGoogleAuth(request, env);
  if (!auth.authenticated) {
    return jsonResponse({ valid: false, error: auth.error }, 401, cors);
  }

  return jsonResponse({
    valid: true,
    userId: auth.userId,
    googleSub: auth.googleSub,
    sessionIssuedAt: auth.sessionIssuedAt,
  }, 200, cors);
}

async function handleGetAbuseLog(request, env, cors) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const limit = parseInt(params.get('limit') || '50', 10);
  const filter = {};
  if (params.get('userId')) filter.userId = params.get('userId');
  if (params.get('googleSub')) filter.googleSub = params.get('googleSub');
  if (params.get('ip')) filter.ip = params.get('ip');

  const result = await getSubmissionAuditLog(env, { limit, filter: Object.keys(filter).length > 0 ? filter : null });
  return jsonResponse({ success: true, ...result }, 200, cors);
}

async function handleGetAbuseStats(env, cors) {
  const stats = await getAbuseStats(env);
  return jsonResponse({ success: true, ...stats }, 200, cors);
}

async function handleBanAccount(googleSub, request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON. Reason is required.' }, 400, cors);
  }

  const { reason } = body;
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return jsonResponse({ success: false, error: 'Ban reason is required' }, 400, cors);
  }

  const result = await banGoogleAccount(env, googleSub, reason, 'admin');
  if (result.error) {
    return jsonResponse({ success: false, error: result.error }, 400, cors);
  }

  return jsonResponse({ success: true, message: result.message }, 200, cors);
}
