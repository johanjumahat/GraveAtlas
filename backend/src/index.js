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
import { wantsExternalSearch, executeExternalSearch, combinedSearch } from './external-connectors/ai-external-search.js';
import { DataGovSgConnector } from './external-connectors/connectors/datagov-sg-connector.js';
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

    // Phase 16.7: Cemetery Intelligence — stats, summary, duplicate detection
    if (path.startsWith('/api/cemeteries/') && path.endsWith('/stats') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleCemeteryStats(id, request, env, corsHeaders);
    }

    if (path.startsWith('/api/cemeteries/') && path.endsWith('/summary') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleCemeterySummary(id, request, env, corsHeaders);
    }

    if (path.startsWith('/api/cemeteries/') && path.endsWith('/duplicates') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleCemeteryDuplicates(id, request, env, corsHeaders);
    }

    // Phase 16.8: AI Record Enrichment — suggest missing fields, detect family connections
    if (path.startsWith('/api/graves/') && path.endsWith('/enrich') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleRecordEnrichment(id, request, env, corsHeaders);
    }

    if (path.startsWith('/api/cemeteries/') && path.endsWith('/connections') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleCemeteryConnections(id, request, env, corsHeaders);
    }

    // Phase 16.9: AI Import Quality Scoring
    if (path === '/api/import/score' && method === 'POST') {
      return await handleImportQualityScore(request, env, corsHeaders);
    }

    if (path === '/api/import/batch-report' && method === 'POST') {
      return await handleImportBatchReport(request, env, corsHeaders);
    }

    // Phase 16.10: AI Anomaly Detection
    if (path.startsWith('/api/cemeteries/') && path.endsWith('/anomalies') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleCemeteryAnomalies(id, request, env, corsHeaders);
    }

    if (path.startsWith('/api/graves/') && path.endsWith('/anomaly-check') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleRecordAnomalyCheck(id, request, env, corsHeaders);
    }

    // Phase 16.11: AI Cemetery Health Dashboard
    if (path.startsWith('/api/cemeteries/') && path.endsWith('/health') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleCemeteryHealth(id, request, env, corsHeaders);
    }

    if (path === '/api/health/overview' && method === 'GET') {
      return await handleGlobalHealthOverview(request, env, corsHeaders);
    }

    // Phase 16.12: AI Smart Recommendations
    if (path.startsWith('/api/cemeteries/') && path.endsWith('/recommendations') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleCemeteryRecommendations(id, request, env, corsHeaders);
    }

    if (path === '/api/recommendations/global' && method === 'GET') {
      return await handleGlobalRecommendations(request, env, corsHeaders);
    }

    // Phase 16.13: AI Data Quality Auto-Fix
    if (path.startsWith('/api/cemeteries/') && path.endsWith('/autofix') && method === 'POST') {
      const id = path.split('/')[3];
      return await handleCemeteryAutoFix(id, request, env, corsHeaders);
    }

    if (path.startsWith('/api/graves/') && path.endsWith('/autofix') && method === 'POST') {
      const id = path.split('/')[3];
      return await handleRecordAutoFix(id, request, env, corsHeaders);
    }

    if (path.startsWith('/api/cemeteries/') && path.endsWith('/autofix/preview') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleCemeteryAutoFixPreview(id, request, env, corsHeaders);
    }

    if (path.startsWith('/api/graves/') && path.endsWith('/autofix/apply') && method === 'POST') {
      const id = path.split('/')[3];
      return await handleRecordAutoFixApply(id, request, env, corsHeaders);
    }

    // Phase 16.14: AI Batch Operations
    if (path.startsWith('/api/cemeteries/') && path.endsWith('/cleanup') && method === 'POST') {
      const id = path.split('/')[3];
      return await handleCemeteryCleanup(id, request, env, corsHeaders);
    }

    if (path.startsWith('/api/cemeteries/') && path.endsWith('/cleanup/preview') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleCemeteryCleanupPreview(id, request, env, corsHeaders);
    }

    if (path === '/api/cleanup/global' && method === 'POST') {
      return await handleGlobalCleanup(request, env, corsHeaders);
    }

    // Phase 16.15: AI Export & Reporting
    if (path.startsWith('/api/cemeteries/') && path.endsWith('/report') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleCemeteryReport(id, request, env, corsHeaders);
    }

    if (path.startsWith('/api/cemeteries/') && path.endsWith('/report/summary') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleCemeteryReportSummary(id, request, env, corsHeaders);
    }

    if (path === '/api/reports/global' && method === 'GET') {
      return await handleGlobalReport(request, env, corsHeaders);
    }

    // Phase 16.16: AI Watchlist & Monitoring
    if (path === '/api/watchlist' && method === 'GET') {
      return await handleGetWatchlist(request, env, corsHeaders);
    }

    if (path === '/api/watchlist' && method === 'POST') {
      return await handleAddToWatchlist(request, env, corsHeaders);
    }

    if (path.startsWith('/api/watchlist/') && method === 'DELETE') {
      const itemId = path.split('/').pop();
      return await handleRemoveFromWatchlist(itemId, request, env, corsHeaders);
    }

    if (path === '/api/watchlist/check' && method === 'POST') {
      return await handleWatchlistCheck(request, env, corsHeaders);
    }

    if (path === '/api/watchlist/status' && method === 'GET') {
      return await handleWatchlistStatus(request, env, corsHeaders);
    }

    // Phase 16.17: AI Merge Resolution
    if (path.startsWith('/api/graves/') && path.endsWith('/merge/preview') && method === 'POST') {
      const parts = path.split('/');
      const idA = parts[3];
      const idB = parts[5];
      return await handleMergePreview(idA, idB, request, env, corsHeaders);
    }

    if (path.startsWith('/api/graves/') && path.endsWith('/merge/apply') && method === 'POST') {
      const parts = path.split('/');
      const idA = parts[3];
      const idB = parts[5];
      return await handleMergeApply(idA, idB, request, env, corsHeaders);
    }

    if (path.startsWith('/api/cemeteries/') && path.endsWith('/merge/suggestions') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleMergeSuggestions(id, request, env, corsHeaders);
    }

    if (path === '/api/merge/history' && method === 'GET') {
      return await handleMergeHistory(request, env, corsHeaders);
    }

    // Phase 16.18: AI Source Verification
    if (path.startsWith('/api/graves/') && path.endsWith('/sources/verify') && method === 'POST') {
      const id = path.split('/')[3];
      return await handleVerifyRecordSources(id, request, env, corsHeaders);
    }

    if (path.startsWith('/api/cemeteries/') && path.endsWith('/sources/verify') && method === 'POST') {
      const id = path.split('/')[3];
      return await handleVerifyCemeterySources(id, request, env, corsHeaders);
    }

    if (path === '/api/sources/verify/batch' && method === 'POST') {
      return await handleBatchVerifySources(request, env, corsHeaders);
    }

    if (path === '/api/sources/verify/status' && method === 'GET') {
      return await handleSourceVerificationStatus(request, env, corsHeaders);
    }

    // Phase 16.19: AI Confidence Scoring
    if (path.startsWith('/api/graves/') && path.endsWith('/confidence') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleGetRecordConfidence(id, request, env, corsHeaders);
    }

    if (path.startsWith('/api/cemeteries/') && path.endsWith('/confidence') && method === 'GET') {
      const id = path.split('/')[3];
      return await handleGetCemeteryConfidence(id, request, env, corsHeaders);
    }

    if (path === '/api/confidence/batch' && method === 'POST') {
      return await handleBatchConfidence(request, env, corsHeaders);
    }

    if (path === '/api/confidence/leaderboard' && method === 'GET') {
      return await handleConfidenceLeaderboard(request, env, corsHeaders);
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

    // List Singapore government datasets available via data.gov.sg connector
    if (path === '/api/external/sg/datasets' && method === 'GET') {
      const connector = new DataGovSgConnector();
      const datasets = connector.listDatasets();
      return jsonResponse({ datasets }, 200, corsHeaders);
    }

    // GitHub community data — list files
    if (path === '/api/external/community' && method === 'GET') {
      try {
        const { GitHubCommunityConnector } = await import('./external-connectors/connectors/github-community-connector.js');
        const connector = new GitHubCommunityConnector();
        const files = await connector.listCommunityFiles();
        return jsonResponse({ files, count: files.length }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: 'Failed to list community files', detail: err.message }, 500, corsHeaders);
      }
    }

    // GitHub community data — query
    if (path === '/api/external/community/query' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }
      try {
        const { GitHubCommunityConnector } = await import('./external-connectors/connectors/github-community-connector.js');
        const connector = new GitHubCommunityConnector();
        const result = await connector.execute(body.query || {});
        return jsonResponse(sanitizeResponse(result), 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ error: 'Community data query failed', detail: err.message }, 500, corsHeaders);
      }
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

    // AI external search (Part 16-17)
    if (path === '/api/external/ai-search' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }
      const { query } = body;
      if (!query) return jsonResponse({ error: 'query required' }, 400, corsHeaders);
      const result = await executeExternalSearch(query, env);
      return jsonResponse(sanitizeResponse(result), 200, corsHeaders);
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

    // Check if the user wants external source data (Part 16-17, 27)
    let externalResults = null;
    if (wantsExternalSearch(q)) {
      try {
        externalResults = await executeExternalSearch(q, env);
      } catch (e) {
        // External search failure should never block internal results
        externalResults = null;
      }
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
      summary: summary,
      externalResults: externalResults ? {
        records: externalResults.records,
        sourcesUsed: externalResults.sourcesUsed,
        summary: externalResults.summary
      } : null
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
                section: record.section || null,
                plot: record.plot || null,
                birthDate: record.birthDate || null,
                deathDate: record.deathDate || null,
                latitude: record.latitude || null,
                longitude: record.longitude || null,
                verificationStatus: record.status || null,
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
  return `sub_${hex}`;
}

// ── Request ID / Correlation ID ──

function generateRequestId() {
  // Generate a short, URL-safe request ID for tracing
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return 'req_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
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

// ── Phase 16.19: AI Confidence Scoring Handlers ──

/**
 * Compute a comprehensive confidence score for a single record.
 * Combines multiple signals into a single 0-100 score with transparent breakdown.
 *
 * Signals:
 * - Completeness (30%): how many important fields are filled
 * - Verification (20%): verificationStatus (verified > submitted > unverified)
 * - Source quality (20%): number and quality of source references
 * - Anomaly-free (15%): no detected anomalies
 * - Merge history (5%): records that resulted from merges are slightly lower
 * - Community engagement (5%): corrections, submissions, views
 * - Geographic precision (5%): has precise coordinates
 */
function computeConfidenceScore(record, anomalies, sourceVerification, mergeHistoryCount) {
  const breakdown = {
    completeness: { score: 0, max: 30, details: [] },
    verification: { score: 0, max: 20, details: [] },
    sourceQuality: { score: 0, max: 20, details: [] },
    anomalyFree: { score: 0, max: 15, details: [] },
    mergeHistory: { score: 0, max: 5, details: [] },
    community: { score: 0, max: 5, details: [] },
    geoPrecision: { score: 0, max: 5, details: [] }
  };

  // ── Completeness (30 points) ──
  const importantFields = [
    'name', 'birthDate', 'deathDate', 'cemeteryId', 'section', 'plot',
    'latitude', 'longitude', 'inscription', 'sourceRefs', 'notes'
  ];
  const filledFields = importantFields.filter(f => {
    const val = record[f];
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'string') return val.trim().length > 0;
    return true;
  });
  const completenessPct = filledFields.length / importantFields.length;
  breakdown.completeness.score = Math.round(completenessPct * 30);
  breakdown.completeness.details.push({
    filled: filledFields.length,
    total: importantFields.length,
    percentage: Math.round(completenessPct * 100)
  });

  // Extra credit for biographical fields
  const bioFields = ['givenNames', 'familyName', 'birthPlace', 'deathPlace', 'occupation', 'spouseName'];
  const filledBio = bioFields.filter(f => record[f] && String(record[f]).trim().length > 0);
  if (filledBio.length > 0) {
    const bonus = Math.min(filledBio.length * 1, 5);
    breakdown.completeness.score = Math.min(breakdown.completeness.score + bonus, 30);
    breakdown.completeness.details.push({ biographicalFields: filledBio.length, bonus: bonus });
  }

  // ── Verification (20 points) ──
  const status = record.verificationStatus || 'unverified';
  switch (status) {
    case 'verified':
      breakdown.verification.score = 20;
      breakdown.verification.details.push({ status: 'verified', fullPoints: true });
      break;
    case 'submitted':
      breakdown.verification.score = 10;
      breakdown.verification.details.push({ status: 'submitted', partialPoints: true });
      break;
    case 'unverified':
    default:
      breakdown.verification.score = 0;
      breakdown.verification.details.push({ status: 'unverified', noPoints: true });
      break;
  }

  // ── Source quality (20 points) ──
  const sourceRefs = record.sourceRefs || [];
  if (sourceRefs.length === 0) {
    breakdown.sourceQuality.score = 0;
    breakdown.sourceQuality.details.push({ count: 0, message: 'No sources cited' });
  } else {
    let sourcePoints = 0;
    breakdown.sourceQuality.details.push({ count: sourceRefs.length });

    if (sourceVerification) {
      // Use actual verification data if available
      const liveRatio = sourceVerification.live / Math.max(sourceVerification.total, 1);
      sourcePoints = Math.round(liveRatio * 15);
      breakdown.sourceQuality.details.push({
        live: sourceVerification.live,
        dead: sourceVerification.dead,
        liveRatio: Math.round(liveRatio * 100) + '%'
      });

      // Bonus for archived sources
      if (sourceVerification.archived > 0) {
        sourcePoints += Math.min(sourceVerification.archived * 1, 3);
        breakdown.sourceQuality.details.push({ archived: sourceVerification.archived });
      }

      // Bonus for multiple sources
      if (sourceVerification.total >= 3) {
        sourcePoints += 2;
        breakdown.sourceQuality.details.push({ multipleSources: true, bonus: 2 });
      }
    } else {
      // Without verification, give partial credit for having sources
      sourcePoints = Math.min(sourceRefs.length * 4, 12);
      breakdown.sourceQuality.details.push({ message: 'Sources present but not verified' });
      if (sourceRefs.length >= 3) sourcePoints += 2;
    }

    breakdown.sourceQuality.score = Math.min(sourcePoints, 20);
  }

  // ── Anomaly-free (15 points) ──
  if (anomalies && anomalies.length > 0) {
    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    const highCount = anomalies.filter(a => a.severity === 'high').length;
    const mediumCount = anomalies.filter(a => a.severity === 'medium').length;
    const lowCount = anomalies.filter(a => a.severity === 'low').length;

    let penalty = criticalCount * 8 + highCount * 4 + mediumCount * 2 + lowCount * 1;
    breakdown.anomalyFree.score = Math.max(15 - penalty, 0);
    breakdown.anomalyFree.details.push({
      total: anomalies.length,
      critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount,
      penalty: penalty
    });
  } else {
    breakdown.anomalyFree.score = 15;
    breakdown.anomalyFree.details.push({ total: 0, message: 'No anomalies detected' });
  }

  // ── Merge history (5 points) ──
  if (mergeHistoryCount > 0) {
    // Merged records lose a small amount — they might have inherited fields
    breakdown.mergeHistory.score = Math.max(5 - mergeHistoryCount, 0);
    breakdown.mergeHistory.details.push({
      mergeCount: mergeHistoryCount,
      message: 'Record has merge history — slightly reduced confidence'
    });
  } else {
    breakdown.mergeHistory.score = 5;
    breakdown.mergeHistory.details.push({ mergeCount: 0, message: 'No merges — original record' });
  }

  // ── Community engagement (5 points) ──
  const corrections = record.corrections || [];
  const submitterName = record.submitterName;
  let communityPoints = 0;
  if (submitterName) {
    communityPoints += 1;
    breakdown.community.details.push({ hasSubmitter: true });
  }
  if (corrections.length > 0) {
    communityPoints += Math.min(corrections.length * 1, 3);
    breakdown.community.details.push({ corrections: corrections.length });
  }
  // Bonus: if record has been viewed/submitted (proxy: has submitterName and corrections)
  if (submitterName && corrections.length > 0) {
    communityPoints += 1;
    breakdown.community.details.push({ communityReview: true, bonus: 1 });
  }
  breakdown.community.score = Math.min(communityPoints, 5);

  // ── Geographic precision (5 points) ──
  if (record.latitude && record.longitude) {
    const latStr = String(record.latitude);
    const lonStr = String(record.longitude);
    const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
    const lonDecimals = lonStr.includes('.') ? lonStr.split('.')[1].length : 0;
    const maxDecimals = Math.max(latDecimals, lonDecimals);

    if (maxDecimals >= 6) {
      breakdown.geoPrecision.score = 5;
      breakdown.geoPrecision.details.push({ precision: maxDecimals + ' decimal places', fullPoints: true });
    } else if (maxDecimals >= 4) {
      breakdown.geoPrecision.score = 3;
      breakdown.geoPrecision.details.push({ precision: maxDecimals + ' decimal places', partial: true });
    } else if (maxDecimals >= 2) {
      breakdown.geoPrecision.score = 1;
      breakdown.geoPrecision.details.push({ precision: maxDecimals + ' decimal places', low: true });
    } else {
      breakdown.geoPrecision.score = 0;
      breakdown.geoPrecision.details.push({ precision: maxDecimals + ' decimal places', message: 'Insufficient precision' });
    }
  } else {
    breakdown.geoPrecision.score = 0;
    breakdown.geoPrecision.details.push({ message: 'No coordinates' });
  }

  // ── Total ──
  const total = Object.values(breakdown).reduce((sum, b) => sum + b.score, 0);

  // Determine confidence tier
  let tier;
  if (total >= 90) tier = 'platinum';
  else if (total >= 75) tier = 'gold';
  else if (total >= 60) tier = 'silver';
  else if (total >= 40) tier = 'bronze';
  else tier = 'unverified';

  return {
    score: total,
    maxScore: 100,
    tier,
    breakdown,
    computedAt: new Date().toISOString()
  };
}

/**
 * GET /api/graves/:id/confidence
 * Compute and return confidence score for a single record.
 */
async function handleGetRecordConfidence(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured — confidence scoring unavailable',
      confidence: { score: 0, tier: 'unverified' }
    }, 200, cors);
  }

  try {
    const content = await readFile(`graves/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Record not found' }, 404, cors);
    }

    const record = JSON.parse(content);

    // Gather signals
    // 1. Anomalies
    let anomalies = [];
    try {
      const anomalyResult = computeCemeteryAnomalies([record]);
      anomalies = anomalyResult.anomalies || [];
    } catch (e) { /* no anomalies */ }

    // 2. Source verification (lightweight — don't do live HTTP checks, just count)
    const sourceRefs = record.sourceRefs || [];
    let sourceVerification = null;
    if (sourceRefs.length > 0) {
      // Use stored verification if available, otherwise basic count
      sourceVerification = {
        total: sourceRefs.length,
        live: sourceRefs.length, // assume live without checking
        dead: 0,
        archived: 0
      };
    }

    // 3. Merge history count
    const mergeHistoryCount = (record.mergeHistory || []).length;

    const confidence = computeConfidenceScore(record, anomalies, sourceVerification, mergeHistoryCount);

    return jsonResponse({
      success: true,
      recordId: safeId,
      recordName: record.name || record.graveIdentifier || 'Unknown',
      confidence: confidence
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to compute confidence score',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/cemeteries/:id/confidence
 * Compute confidence scores for all records in a cemetery.
 */
async function handleGetCemeteryConfidence(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const records = [];
    const recordsById = {};

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        records.push(record);
        recordsById[record.id] = record;
      } catch (e) { /* skip */ }
    }

    if (records.length === 0) {
      return jsonResponse({
        success: true,
        cemeteryId: safeId,
        totalRecords: 0,
        recordScores: [],
        cemeterySummary: {
          averageScore: 0,
          platinumCount: 0, goldCount: 0, silverCount: 0, bronzeCount: 0, unverifiedCount: 0,
          totalRecords: 0
        },
        message: 'No records found'
      }, 200, cors);
    }

    const recordScores = [];
    let totalScore = 0;
    let platinumCount = 0, goldCount = 0, silverCount = 0, bronzeCount = 0, unverifiedCount = 0;

    for (const record of records) {
      // Lightweight anomalies
      let anomalies = [];
      try {
        const anomalyResult = computeCemeteryAnomalies([record]);
        anomalies = anomalyResult.anomalies || [];
      } catch (e) { /* skip */ }

      const sourceRefs = record.sourceRefs || [];
      let sourceVerification = null;
      if (sourceRefs.length > 0) {
        sourceVerification = { total: sourceRefs.length, live: sourceRefs.length, dead: 0, archived: 0 };
      }

      const mergeHistoryCount = (record.mergeHistory || []).length;
      const confidence = computeConfidenceScore(record, anomalies, sourceVerification, mergeHistoryCount);

      recordScores.push({
        recordId: record.id,
        recordName: record.name || record.graveIdentifier || 'Unknown',
        score: confidence.score,
        tier: confidence.tier
      });

      totalScore += confidence.score;
      switch (confidence.tier) {
        case 'platinum': platinumCount++; break;
        case 'gold': goldCount++; break;
        case 'silver': silverCount++; break;
        case 'bronze': bronzeCount++; break;
        default: unverifiedCount++; break;
      }
    }

    recordScores.sort((a, b) => b.score - a.score);
    const avgScore = Math.round(totalScore / records.length);

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      totalRecords: records.length,
      recordScores: recordScores,
      cemeterySummary: {
        averageScore: avgScore,
        platinumCount, goldCount, silverCount, bronzeCount, unverifiedCount,
        totalRecords: records.length
      },
      computedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to compute cemetery confidence',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/confidence/batch
 * Batch compute confidence scores for up to 50 records.
 * Body: { recordIds: string[] }
 */
async function handleBatchConfidence(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, message: 'GitHub not configured', results: [] }, 200, cors);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const recordIds = (body && body.recordIds) || [];

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return jsonResponse({ success: false, error: 'Missing recordIds array' }, 400, cors);
    }

    if (recordIds.length > 50) {
      return jsonResponse({ success: false, error: 'Maximum 50 records per batch' }, 400, cors);
    }

    const results = [];

    for (const recordId of recordIds) {
      const safeId = sanitizePathSegment(recordId);
      if (!safeId || safeId !== recordId) continue;

      try {
        const content = await readFile(`graves/${safeId}.json`, env);
        if (!content) {
          results.push({ recordId, status: 'not_found' });
          continue;
        }
        const record = JSON.parse(content);

        let anomalies = [];
        try {
          const anomalyResult = computeCemeteryAnomalies([record]);
          anomalies = anomalyResult.anomalies || [];
        } catch (e) { /* skip */ }

        const sourceRefs = record.sourceRefs || [];
        let sourceVerification = null;
        if (sourceRefs.length > 0) {
          sourceVerification = { total: sourceRefs.length, live: sourceRefs.length, dead: 0, archived: 0 };
        }

        const mergeHistoryCount = (record.mergeHistory || []).length;
        const confidence = computeConfidenceScore(record, anomalies, sourceVerification, mergeHistoryCount);

        results.push({
          recordId: record.id,
          recordName: record.name || record.graveIdentifier || 'Unknown',
          score: confidence.score,
          tier: confidence.tier
        });
      } catch (e) {
        results.push({ recordId, status: 'error', message: e.message });
      }
    }

    return jsonResponse({
      success: true,
      results: results,
      totalComputed: results.length,
      computedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to batch compute confidence',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/confidence/leaderboard
 * Returns top records by confidence score across the entire system.
 */
async function handleConfidenceLeaderboard(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, message: 'GitHub not configured', leaderboard: [] }, 200, cors);
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const tier = url.searchParams.get('tier'); // filter by tier if provided

    const files = await listFiles('graves', env);
    const scores = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;

        let anomalies = [];
        try {
          const anomalyResult = computeCemeteryAnomalies([record]);
          anomalies = anomalyResult.anomalies || [];
        } catch (e) { /* skip */ }

        const sourceRefs = record.sourceRefs || [];
        let sourceVerification = null;
        if (sourceRefs.length > 0) {
          sourceVerification = { total: sourceRefs.length, live: sourceRefs.length, dead: 0, archived: 0 };
        }

        const mergeHistoryCount = (record.mergeHistory || []).length;
        const confidence = computeConfidenceScore(record, anomalies, sourceVerification, mergeHistoryCount);

        if (tier && confidence.tier !== tier) continue;

        scores.push({
          recordId: record.id,
          recordName: record.name || record.graveIdentifier || 'Unknown',
          cemeteryId: record.cemeteryId || null,
          score: confidence.score,
          tier: confidence.tier,
          verificationStatus: record.verificationStatus || 'unverified'
        });
      } catch (e) { /* skip */ }
    }

    scores.sort((a, b) => b.score - a.score);

    return jsonResponse({
      success: true,
      leaderboard: scores.slice(0, limit),
      totalRecords: scores.length,
      tierDistribution: {
        platinum: scores.filter(s => s.tier === 'platinum').length,
        gold: scores.filter(s => s.tier === 'gold').length,
        silver: scores.filter(s => s.tier === 'silver').length,
        bronze: scores.filter(s => s.tier === 'bronze').length,
        unverified: scores.filter(s => s.tier === 'unverified').length
      },
      computedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate leaderboard',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.18: AI Source Verification Handlers ──

/**
 * Verify a single source reference.
 * Checks: URL liveness (HEAD request), content type, archive availability.
 * Returns verification result with status, confidence, and notes.
 */
async function verifySourceRef(sourceRef) {
  if (!sourceRef || typeof sourceRef !== 'string') {
    return { ref: sourceRef, status: 'invalid', confidence: 0, notes: 'Invalid source reference' };
  }

  // Check if it's a URL
  const urlPattern = /^https?:\/\/[^\s]+$/i;
  if (!urlPattern.test(sourceRef)) {
    // Non-URL reference — check if it looks like a citation
    if (sourceRef.length > 10) {
      return {
        ref: sourceRef,
        status: 'unverifiable',
        confidence: 0,
        notes: 'Non-URL reference — manual verification needed',
        type: 'citation'
      };
    }
    return { ref: sourceRef, status: 'invalid', confidence: 0, notes: 'Source reference too short' };
  }

  const result = {
    ref: sourceRef,
    url: sourceRef,
    status: 'unknown',
    confidence: 0,
    statusCode: null,
    contentType: null,
    archived: false,
    archiveUrl: null,
    notes: []
  };

  // Try HEAD request to check liveness
  try {
    const response = await fetch(sourceRef, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });

    result.statusCode = response.status;
    result.contentType = response.headers.get('content-type') || 'unknown';

    if (response.ok) {
      result.status = 'live';
      result.confidence = 85;
      result.notes.push('URL is accessible and returns content');
    } else if (response.status === 404) {
      result.status = 'dead';
      result.confidence = 95;
      result.notes.push('URL returns 404 — source may have been removed');
    } else if (response.status === 403 || response.status === 401) {
      result.status = 'restricted';
      result.confidence = 50;
      result.notes.push('URL exists but access is restricted');
    } else if (response.status >= 500) {
      result.status = 'error';
      result.confidence = 30;
      result.notes.push(`Server error (${response.status}) — temporarily unavailable`);
    } else if (response.status >= 300 && response.status < 400) {
      result.status = 'redirect';
      result.confidence = 70;
      result.notes.push('URL redirects — source likely still accessible');
    } else {
      result.status = 'unknown';
      result.confidence = 20;
      result.notes.push(`Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    // Network error — might be DNS failure, timeout, or SSL issue
    result.status = 'unreachable';
    result.confidence = 60;
    result.notes.push(`Network error: ${error.message || 'unable to reach URL'}`);

    // Check if it's a timeout
    if (error.name === 'TimeoutError' || (error.message && error.message.includes('timeout'))) {
      result.status = 'timeout';
      result.confidence = 40;
      result.notes = ['Request timed out — source may be slow or down'];
    }
  }

  // Check Wayback Machine for archived copy
  try {
    const waybackUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(sourceRef)}`;
    const wbResponse = await fetch(waybackUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(8000)
    });

    if (wbResponse.ok) {
      const wbData = await wbResponse.json();
      if (wbData.archived_snapshots && wbData.archived_snapshots.closest) {
        result.archived = true;
        result.archiveUrl = wbData.archived_snapshots.closest.url;
        result.archiveTimestamp = wbData.archived_snapshots.closest.timestamp;
        result.notes.push('Archived copy available on Wayback Machine');

        // If the URL is dead but we have an archive, boost confidence
        if (result.status === 'dead' || result.status === 'unreachable') {
          result.confidence = Math.max(result.confidence, 65);
          result.notes.push('Original URL is dead but archived copy exists');
        }
      }
    }
  } catch (e) {
    // Wayback check failed — not critical
  }

  return result;
}

/**
 * Verify all source references for a record.
 * Returns per-source verification results and an overall verification summary.
 */
async function verifyRecordSources(record) {
  const sourceRefs = record.sourceRefs || [];

  if (sourceRefs.length === 0) {
    return {
      recordId: record.id,
      recordName: record.name || record.graveIdentifier || 'Unknown',
      totalSources: 0,
      results: [],
      summary: {
        total: 0,
        live: 0,
        dead: 0,
        restricted: 0,
        unreachable: 0,
        unverifiable: 0,
        archived: 0,
        overallStatus: 'no_sources',
        overallConfidence: 0,
        verificationScore: 0
      }
    };
  }

  const results = [];
  for (const ref of sourceRefs) {
    const result = await verifySourceRef(ref);
    results.push(result);
  }

  // Compute summary
  let live = 0, dead = 0, restricted = 0, unreachable = 0, unverifiable = 0;
  let archived = 0;
  let totalConfidence = 0;

  for (const r of results) {
    switch (r.status) {
      case 'live': live++; break;
      case 'dead': dead++; break;
      case 'restricted': restricted++; break;
      case 'unreachable': unreachable++; break;
      case 'unverifiable': unverifiable++; break;
    }
    if (r.archived) archived++;
    totalConfidence += r.confidence || 0;
  }

  const total = results.length;
  const avgConfidence = total > 0 ? Math.round(totalConfidence / total) : 0;

  // Overall status: if any dead and not archived, that's critical
  let overallStatus;
  if (dead > 0 && archived < dead) {
    overallStatus = 'critical';
  } else if (live === total) {
    overallStatus = 'verified';
  } else if (live > 0) {
    overallStatus = 'partial';
  } else if (unreachable > 0 && live === 0) {
    overallStatus = 'unverified';
  } else {
    overallStatus = 'unverified';
  }

  // Verification score: percentage of live sources
  const verificationScore = total > 0 ? Math.round((live / total) * 100) : 0;

  return {
    recordId: record.id,
    recordName: record.name || record.graveIdentifier || 'Unknown',
    totalSources: total,
    results: results,
    summary: {
      total: total,
      live: live,
      dead: dead,
      restricted: restricted,
      unreachable: unreachable,
      unverifiable: unverifiable,
      archived: archived,
      overallStatus: overallStatus,
      overallConfidence: avgConfidence,
      verificationScore: verificationScore
    }
  };
}

/**
 * POST /api/graves/:id/sources/verify
 * Verify all source references for a single record.
 */
async function handleVerifyRecordSources(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured — source verification unavailable',
      verification: { summary: { overallStatus: 'unverified', verificationScore: 0 } }
    }, 200, cors);
  }

  try {
    const content = await readFile(`graves/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Record not found' }, 404, cors);
    }

    const record = JSON.parse(content);
    const verification = await verifyRecordSources(record);

    return jsonResponse({
      success: true,
      verification: verification
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to verify sources',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/cemeteries/:id/sources/verify
 * Verify source references for all records in a cemetery.
 * Returns per-record summaries and an overall cemetery verification report.
 */
async function handleVerifyCemeterySources(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured — source verification unavailable'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const records = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        if (!record.sourceRefs || record.sourceRefs.length === 0) continue;
        records.push(record);
      } catch (e) { /* skip */ }
    }

    if (records.length === 0) {
      return jsonResponse({
        success: true,
        cemeteryId: safeId,
        totalRecords: 0,
        recordVerifications: [],
        cemeterySummary: {
          totalRecords: 0,
          recordsWithSources: 0,
          totalSources: 0,
          liveSources: 0,
          deadSources: 0,
          overallStatus: 'no_sources',
          verificationScore: 0
        },
        message: 'No records with source references found'
      }, 200, cors);
    }

    const recordVerifications = [];
    let totalSources = 0, liveSources = 0, deadSources = 0;
    let totalScore = 0;

    for (const record of records) {
      const verification = await verifyRecordSources(record);
      recordVerifications.push({
        recordId: verification.recordId,
        recordName: verification.recordName,
        totalSources: verification.totalSources,
        summary: verification.summary
      });
      totalSources += verification.summary.total;
      liveSources += verification.summary.live;
      deadSources += verification.summary.dead;
      totalScore += verification.summary.verificationScore;
    }

    const avgScore = records.length > 0 ? Math.round(totalScore / records.length) : 0;

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      totalRecords: records.length,
      recordVerifications: recordVerifications,
      cemeterySummary: {
        totalRecords: records.length,
        recordsWithSources: records.length,
        totalSources: totalSources,
        liveSources: liveSources,
        deadSources: deadSources,
        overallStatus: avgScore >= 80 ? 'verified' : avgScore >= 50 ? 'partial' : 'unverified',
        verificationScore: avgScore
      },
      verifiedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to verify cemetery sources',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/sources/verify/batch
 * Batch verify sources across multiple records.
 * Body: { recordIds: string[] }
 */
async function handleBatchVerifySources(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured',
      results: []
    }, 200, cors);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const recordIds = (body && body.recordIds) || [];

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return jsonResponse({
        success: false,
        error: 'Missing recordIds array'
      }, 400, cors);
    }

    if (recordIds.length > 50) {
      return jsonResponse({
        success: false,
        error: 'Maximum 50 records per batch'
      }, 400, cors);
    }

    const results = [];

    for (const recordId of recordIds) {
      const safeId = sanitizePathSegment(recordId);
      if (!safeId || safeId !== recordId) continue;

      try {
        const content = await readFile(`graves/${safeId}.json`, env);
        if (!content) {
          results.push({ recordId, status: 'not_found' });
          continue;
        }
        const record = JSON.parse(content);
        const verification = await verifyRecordSources(record);
        results.push({
          recordId: verification.recordId,
          recordName: verification.recordName,
          totalSources: verification.totalSources,
          summary: verification.summary
        });
      } catch (e) {
        results.push({ recordId, status: 'error', message: e.message });
      }
    }

    return jsonResponse({
      success: true,
      results: results,
      totalVerified: results.length,
      verifiedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to batch verify sources',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/sources/verify/status
 * Returns a summary of source verification status across all records.
 */
async function handleSourceVerificationStatus(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    let totalRecords = 0;
    let recordsWithSources = 0;
    let totalSourceRefs = 0;
    let recordsFullyVerified = 0;
    let recordsWithDeadSources = 0;
    let recordsWithArchivedSources = 0;

    // Track source URLs we've already checked (avoid redundant fetches)
    const checkedUrls = new Map();
    let liveUrls = 0, deadUrls = 0, totalUrlsChecked = 0;

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        totalRecords++;

        const sourceRefs = record.sourceRefs || [];
        if (sourceRefs.length === 0) continue;

        recordsWithSources++;
        totalSourceRefs += sourceRefs.length;

        // Check unique URLs only
        const newUrls = sourceRefs.filter(ref =>
          typeof ref === 'string' && /^https?:\/\//i.test(ref) && !checkedUrls.has(ref)
        );

        for (const url of newUrls) {
          checkedUrls.set(url, true);
          totalUrlsChecked++;
          try {
            const response = await fetch(url, {
              method: 'HEAD',
              redirect: 'follow',
              signal: AbortSignal.timeout(8000)
            });
            if (response.ok) liveUrls++;
            else if (response.status === 404) deadUrls++;
          } catch (e) {
            deadUrls++;
          }
        }
      } catch (e) { /* skip */ }
    }

    return jsonResponse({
      success: true,
      totalRecords: totalRecords,
      recordsWithSources: recordsWithSources,
      totalSourceRefs: totalSourceRefs,
      uniqueUrlsChecked: totalUrlsChecked,
      liveUrls: liveUrls,
      deadUrls: deadUrls,
      sourceHealthScore: totalUrlsChecked > 0 ? Math.round((liveUrls / totalUrlsChecked) * 100) : 0,
      checkedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to get verification status',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.17: AI Merge Resolution Handlers ──

/**
 * Compare two records field by field and generate a merge proposal.
 * For each field: shows value from both records, recommends which to keep,
 * and provides a confidence level.
 */
function generateMergeProposal(recordA, recordB) {
  const fields = [
    'name', 'givenNames', 'familyName', 'birthDate', 'deathDate',
    'cemeteryId', 'cemeteryName', 'section', 'plot', 'block',
    'latitude', 'longitude', 'inscription', 'notes',
    'verificationStatus', 'submitterName', 'sourceRefs', 'photoRefs',
    'graveIdentifier', 'birthPlace', 'deathPlace', 'occupation',
    'spouseName', 'parents', 'children'
  ];

  const proposals = [];
  let resolvedCount = 0;
  let conflictCount = 0;
  let identicalCount = 0;

  for (const field of fields) {
    const valA = recordA[field];
    const valB = recordB[field];

    // Both null/undefined — skip
    if (!valA && !valB) continue;

    // Both have value
    if (valA && valB) {
      const strA = JSON.stringify(valA);
      const strB = JSON.stringify(valB);

      if (strA === strB) {
        // Identical — no conflict
        identicalCount++;
        proposals.push({
          field,
          valueA: valA,
          valueB: valB,
          recommendation: 'keep_either',
          recommendedValue: valA,
          confidence: 'high',
          reason: 'Both records have identical values'
        });
      } else {
        // Conflict — need to decide
        conflictCount++;
        let recommendation = 'manual_review';
        let recommendedValue = null;
        let confidence = 'low';
        let reason = 'Values differ — manual review recommended';

        // Heuristic: prefer verified record
        if (recordA.verificationStatus === 'verified' && recordB.verificationStatus !== 'verified') {
          recommendation = 'keep_a';
          recommendedValue = valA;
          confidence = 'high';
          reason = 'Record A is verified, Record B is not';
        } else if (recordB.verificationStatus === 'verified' && recordA.verificationStatus !== 'verified') {
          recommendation = 'keep_b';
          recommendedValue = valB;
          confidence = 'high';
          reason = 'Record B is verified, Record A is not';
        } else {
          // Heuristic: prefer longer/more complete value for text fields
          const lenA = typeof valA === 'string' ? valA.length : JSON.stringify(valA).length;
          const lenB = typeof valB === 'string' ? valB.length : JSON.stringify(valB).length;
          if (field === 'inscription' || field === 'notes' || field === 'sourceRefs' || field === 'photoRefs') {
            if (lenA > lenB * 1.5) {
              recommendation = 'keep_a';
              recommendedValue = valA;
              confidence = 'medium';
              reason = `Record A has more complete ${field} (${lenA} vs ${lenB} chars)`;
            } else if (lenB > lenA * 1.5) {
              recommendation = 'keep_b';
              recommendedValue = valB;
              confidence = 'medium';
              reason = `Record B has more complete ${field} (${lenB} vs ${lenA} chars)`;
            }
          } else if (field === 'name' || field === 'givenNames' || field === 'familyName') {
            // Prefer longer name (more complete)
            if (lenA > lenB) {
              recommendation = 'keep_a';
              recommendedValue = valA;
              confidence = 'medium';
              reason = `Record A has more complete name (${lenA} vs ${lenB} chars)`;
            } else if (lenB > lenA) {
              recommendation = 'keep_b';
              recommendedValue = valB;
              confidence = 'medium';
              reason = `Record B has more complete name (${lenB} vs ${lenA} chars)`;
            }
          } else if (field === 'latitude' || field === 'longitude') {
            // Prefer more precise coordinates
            const precA = valA ? String(valA).split('.').length > 1 ? String(valA).split('.')[1].length : 0 : 0;
            const precB = valB ? String(valB).split('.').length > 1 ? String(valB).split('.')[1].length : 0 : 0;
            if (precA > precB) {
              recommendation = 'keep_a';
              recommendedValue = valA;
              confidence = 'medium';
              reason = `Record A has more precise coordinates (${precA} vs ${precB} decimal places)`;
            } else if (precB > precA) {
              recommendation = 'keep_b';
              recommendedValue = valB;
              confidence = 'medium';
              reason = `Record B has more precise coordinates (${precB} vs ${precA} decimal places)`;
            }
          } else if (Array.isArray(valA) || Array.isArray(valB)) {
            // For arrays, merge unique items
            const arrA = Array.isArray(valA) ? valA : [valA];
            const arrB = Array.isArray(valB) ? valB : [valB];
            const merged = [...new Set([...arrA, ...arrB])];
            recommendation = 'merge_both';
            recommendedValue = merged;
            confidence = 'medium';
            reason = `Merged unique items from both records (${merged.length} total)`;
          }
        }

        proposals.push({
          field,
          valueA: valA,
          valueB: valB,
          recommendation,
          recommendedValue,
          confidence,
          reason
        });
      }
    } else {
      // Only one has a value — keep that one
      resolvedCount++;
      proposals.push({
        field,
        valueA: valA || null,
        valueB: valB || null,
        recommendation: valA ? 'keep_a' : 'keep_b',
        recommendedValue: valA || valB,
        confidence: 'high',
        reason: `Only ${valA ? 'Record A' : 'Record B'} has this field`
      });
    }
  }

  return {
    proposals,
    summary: {
      totalFields: proposals.length,
      identicalFields: identicalCount,
      conflictFields: conflictCount,
      resolvedFields: resolvedCount,
      autoResolvable: proposals.filter(p => p.confidence !== 'low').length,
      needsManualReview: proposals.filter(p => p.confidence === 'low').length
    }
  };
}

/**
 * POST /api/graves/:idA/merge/preview/:idB
 * Generate a merge proposal for two records.
 */
async function handleMergePreview(idA, idB, request, env, cors) {
  const safeIdA = sanitizePathSegment(idA);
  const safeIdB = sanitizePathSegment(idB);

  if (!safeIdA || safeIdA !== idA || !safeIdB || safeIdB !== idB) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured — merge preview unavailable'
    }, 200, cors);
  }

  try {
    // Load both records
    let recordA = null, recordB = null;

    try {
      const contentA = await readFile(`graves/${safeIdA}.json`, env);
      if (contentA) recordA = JSON.parse(contentA);
    } catch (e) { /* not found */ }

    try {
      const contentB = await readFile(`graves/${safeIdB}.json`, env);
      if (contentB) recordB = JSON.parse(contentB);
    } catch (e) { /* not found */ }

    if (!recordA || !recordB) {
      return jsonResponse({
        success: false,
        error: 'One or both records not found',
        recordAFound: !!recordA,
        recordBFound: !!recordB
      }, 404, cors);
    }

    const proposal = generateMergeProposal(recordA, recordB);

    // Compute a similarity score
    const allFields = proposal.proposals.length;
    const identical = proposal.summary.identicalFields;
    const similarity = allFields > 0 ? Math.round((identical / allFields) * 100) : 0;

    return jsonResponse({
      success: true,
      recordA: {
        id: safeIdA,
        name: recordA.name || recordA.graveIdentifier || 'Unknown',
        verificationStatus: recordA.verificationStatus || 'unverified',
        cemeteryId: recordA.cemeteryId || null
      },
      recordB: {
        id: safeIdB,
        name: recordB.name || recordB.graveIdentifier || 'Unknown',
        verificationStatus: recordB.verificationStatus || 'unverified',
        cemeteryId: recordB.cemeteryId || null
      },
      similarityScore: similarity,
      proposal: proposal.proposals,
      summary: proposal.summary,
      recommendedAction: proposal.summary.needsManualReview === 0
        ? 'safe_to_merge'
        : proposal.summary.needsManualReview <= 2
        ? 'merge_with_caution'
        : 'manual_review_required'
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate merge preview',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/graves/:idA/merge/apply/:idB
 * Apply a merge: combine record B into record A, mark B as merged.
 * Body: { fieldOverrides: { fieldName: value } }
 */
async function handleMergeApply(idA, idB, request, env, cors) {
  const safeIdA = sanitizePathSegment(idA);
  const safeIdB = sanitizePathSegment(idB);

  if (!safeIdA || safeIdA !== idA || !safeIdB || safeIdB !== idB) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: false,
      error: 'GitHub not configured — merge unavailable'
    }, 503, cors);
  }

  try {
    let recordA = null, recordB = null;

    try {
      const contentA = await readFile(`graves/${safeIdA}.json`, env);
      if (contentA) recordA = JSON.parse(contentA);
    } catch (e) { /* not found */ }

    try {
      const contentB = await readFile(`graves/${safeIdB}.json`, env);
      if (contentB) recordB = JSON.parse(contentB);
    } catch (e) { /* not found */ }

    if (!recordA || !recordB) {
      return jsonResponse({
        success: false,
        error: 'One or both records not found'
      }, 404, cors);
    }

    // Generate proposal
    const proposal = generateMergeProposal(recordA, recordB);

    // Apply proposed values, with optional overrides
    const body = await request.json().catch(() => ({}));
    const overrides = (body && body.fieldOverrides) || {};

    const mergedRecord = { ...recordA };
    const appliedFields = [];
    const skippedFields = [];

    for (const p of proposal.proposals) {
      // Check for override
      if (overrides[p.field] !== undefined) {
        mergedRecord[p.field] = overrides[p.field];
        appliedFields.push({
          field: p.field,
          source: 'override',
          value: overrides[p.field]
        });
        continue;
      }

      // Auto-apply high and medium confidence
      if (p.confidence === 'high' || p.confidence === 'medium') {
        mergedRecord[p.field] = p.recommendedValue;
        appliedFields.push({
          field: p.field,
          source: p.recommendation,
          value: p.recommendedValue,
          confidence: p.confidence
        });
      } else {
        // Low confidence — skip unless overridden
        skippedFields.push({
          field: p.field,
          reason: 'Low confidence — requires manual override'
        });
      }
    }

    // Add merge provenance
    mergedRecord.mergeHistory = mergedRecord.mergeHistory || [];
    mergedRecord.mergeHistory.push({
      mergedFromId: safeIdB,
      mergedFromName: recordB.name || recordB.graveIdentifier || 'Unknown',
      mergedAt: new Date().toISOString(),
      mergedBy: body.mergedBy || 'system',
      fieldsApplied: appliedFields.length,
      fieldsSkipped: skippedFields.length,
      similarityScore: proposal.summary.identicalFields > 0
        ? Math.round((proposal.summary.identicalFields / proposal.proposals.length) * 100)
        : 0
    });

    // Update record A with merged data
    mergedRecord.updatedDate = new Date().toISOString();
    await writeFile(`graves/${safeIdA}.json`, JSON.stringify(mergedRecord, null, 2), env);

    // Mark record B as merged (keep it for provenance, but change status)
    recordB.status = 'merged';
    recordB.mergedIntoId = safeIdA;
    recordB.mergedAt = new Date().toISOString();
    recordB.updatedDate = new Date().toISOString();
    await writeFile(`graves/${safeIdB}.json`, JSON.stringify(recordB, null, 2), env);

    return jsonResponse({
      success: true,
      mergedRecordId: safeIdA,
      mergedFromId: safeIdB,
      appliedFields: appliedFields,
      skippedFields: skippedFields,
      totalApplied: appliedFields.length,
      totalSkipped: skippedFields.length,
      mergeHistory: mergedRecord.mergeHistory[mergedRecord.mergeHistory.length - 1]
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to apply merge',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/cemeteries/:id/merge/suggestions
 * Find potential duplicate pairs within a cemetery and suggest merges.
 */
async function handleMergeSuggestions(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      suggestions: [],
      message: 'GitHub not configured'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const records = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status === 'merged') continue;
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        records.push(record);
      } catch (e) { /* skip */ }
    }

    if (records.length < 2) {
      return jsonResponse({
        success: true,
        suggestions: [],
        totalRecords: records.length,
        message: 'Not enough records to suggest merges'
      }, 200, cors);
    }

    // Find potential duplicates
    const suggestions = [];
    const seen = new Set();

    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        const a = records[i];
        const b = records[j];
        const pairKey = [a.id, b.id].sort().join('|');
        if (seen.has(pairKey)) continue;

        let matchScore = 0;
        let matchReasons = [];

        // Name match
        const nameA = (a.name || a.graveIdentifier || '').toLowerCase().trim();
        const nameB = (b.name || b.graveIdentifier || '').toLowerCase().trim();
        if (nameA && nameB && nameA === nameB) {
          matchScore += 50;
          matchReasons.push('exact_name_match');
        } else if (nameA && nameB && (nameA.includes(nameB) || nameB.includes(nameA))) {
          matchScore += 30;
          matchReasons.push('partial_name_match');
        }

        // Death date match
        if (a.deathDate && b.deathDate && a.deathDate === b.deathDate) {
          matchScore += 30;
          matchReasons.push('death_date_match');
        }

        // Birth date match
        if (a.birthDate && b.birthDate && a.birthDate === b.birthDate) {
          matchScore += 20;
          matchReasons.push('birth_date_match');
        }

        // Plot match
        if (a.plot && b.plot && a.plot === b.plot && a.section === b.section) {
          matchScore += 15;
          matchReasons.push('same_plot');
        }

        if (matchScore >= 50) {
          seen.add(pairKey);
          suggestions.push({
            recordA: {
              id: a.id,
              name: a.name || a.graveIdentifier || 'Unknown',
              deathDate: a.deathDate || null,
              verificationStatus: a.verificationStatus || 'unverified'
            },
            recordB: {
              id: b.id,
              name: b.name || b.graveIdentifier || 'Unknown',
              deathDate: b.deathDate || null,
              verificationStatus: b.verificationStatus || 'unverified'
            },
            matchScore: matchScore,
            matchReasons: matchReasons,
            recommendedAction: matchScore >= 80 ? 'high_confidence_merge' :
              matchScore >= 60 ? 'likely_duplicate' : 'possible_duplicate'
          });
        }
      }
    }

    suggestions.sort((a, b) => b.matchScore - a.matchScore);

    return jsonResponse({
      success: true,
      suggestions: suggestions.slice(0, 50),
      totalSuggestions: suggestions.length,
      totalRecords: records.length,
      checkedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate merge suggestions',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/merge/history
 * Returns merge history across all records.
 */
async function handleMergeHistory(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      history: [],
      message: 'GitHub not configured'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const history = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.mergeHistory && record.mergeHistory.length > 0) {
          for (const entry of record.mergeHistory) {
            history.push({
              ...entry,
              targetRecordId: record.id,
              targetRecordName: record.name || record.graveIdentifier || 'Unknown'
            });
          }
        }
      } catch (e) { /* skip */ }
    }

    history.sort((a, b) => new Date(b.mergedAt || 0) - new Date(a.mergedAt || 0));

    return jsonResponse({
      success: true,
      history: history.slice(0, 100),
      totalMerges: history.length
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to fetch merge history',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.16: AI Watchlist & Monitoring Handlers ──

/**
 * GET /api/watchlist
 * Returns all watchlist items.
 */
async function handleGetWatchlist(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      items: [],
      message: 'GitHub not configured — watchlist unavailable'
    }, 200, cors);
  }

  try {
    const files = await listFiles('watchlist', env);
    const items = [];

    for (const file of files) {
      try {
        const content = await readFile(`watchlist/${file}`, env);
        if (!content) continue;
        items.push(JSON.parse(content));
      } catch (e) { /* skip */ }
    }

    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return jsonResponse({
      success: true,
      items: items,
      totalItems: items.length
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to fetch watchlist',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/watchlist
 * Add a cemetery or record to the watchlist.
 * Body: { targetType: 'cemetery'|'record', targetId: string,
 *         watchFor: string[], label: string }
 */
async function handleAddToWatchlist(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: false,
      error: 'GitHub not configured — watchlist unavailable'
    }, 503, cors);
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (!body || !body.targetType || !body.targetId) {
      return jsonResponse({
        success: false,
        error: 'Missing required fields: targetType, targetId'
      }, 400, cors);
    }

    const targetType = body.targetType;
    const targetId = sanitizePathSegment(body.targetId);
    if (!targetId || targetId !== body.targetId) {
      return jsonResponse({ success: false, error: 'Invalid target ID' }, 400, cors);
    }

    if (targetType !== 'cemetery' && targetType !== 'record') {
      return jsonResponse({
        success: false,
        error: 'targetType must be "cemetery" or "record"'
      }, 400, cors);
    }

    const watchFor = Array.isArray(body.watchFor)
      ? body.watchFor
      : ['health_degradation', 'new_anomalies', 'unapplied_fixes'];

    const validWatchTypes = ['health_degradation', 'new_anomalies', 'unapplied_fixes', 'duplicate_detected', 'missing_data'];
    const filteredWatch = watchFor.filter(w => validWatchTypes.includes(w));

    const itemId = `watch_${targetType}_${targetId}_${Date.now()}`;
    const item = {
      id: itemId,
      targetType: targetType,
      targetId: targetId,
      label: body.label || targetId,
      watchFor: filteredWatch,
      createdAt: new Date().toISOString(),
      lastChecked: null,
      lastStatus: null,
      active: true
    };

    await writeFile(`watchlist/${itemId}.json`, JSON.stringify(item, null, 2), env);

    return jsonResponse({
      success: true,
      item: item
    }, 201, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to add to watchlist',
      message: error.message
    }, 500, cors);
  }
}

/**
 * DELETE /api/watchlist/:itemId
 * Remove an item from the watchlist.
 */
async function handleRemoveFromWatchlist(itemId, request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: false,
      error: 'GitHub not configured — watchlist unavailable'
    }, 503, cors);
  }

  const safeId = sanitizePathSegment(itemId);
  if (!safeId || safeId !== itemId) {
    return jsonResponse({ success: false, error: 'Invalid item ID' }, 400, cors);
  }

  try {
    await deleteFile(`watchlist/${safeId}.json`, env);
    return jsonResponse({ success: true, message: 'Watchlist item removed' }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to remove watchlist item',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/watchlist/check
 * Check all watchlist items for changes and return alerts.
 * For each item: computes current health/anomalies, compares with last check,
 * generates alerts if conditions are met.
 */
async function handleWatchlistCheck(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      alerts: [],
      message: 'GitHub not configured — watchlist unavailable'
    }, 200, cors);
  }

  try {
    // Load watchlist items
    const wlFiles = await listFiles('watchlist', env);
    const watchlistItems = [];

    for (const file of wlFiles) {
      try {
        const content = await readFile(`watchlist/${file}`, env);
        if (!content) continue;
        const item = JSON.parse(content);
        if (item.active !== false) watchlistItems.push(item);
      } catch (e) { /* skip */ }
    }

    if (watchlistItems.length === 0) {
      return jsonResponse({
        success: true,
        alerts: [],
        checkedItems: 0,
        message: 'No active watchlist items'
      }, 200, cors);
    }

    // Load all grave records (cache by cemetery for efficiency)
    const graveFiles = await listFiles('graves', env);
    const allRecords = [];
    const recordsByCemetery = {};

    for (const file of graveFiles) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        allRecords.push(record);
        const cemId = record.cemeteryId || 'unknown';
        if (!recordsByCemetery[cemId]) recordsByCemetery[cemId] = [];
        recordsByCemetery[cemId].push(record);
      } catch (e) { /* skip */ }
    }

    const alerts = [];
    let checkedCount = 0;

    for (const item of watchlistItems) {
      checkedCount++;
      let records = [];

      if (item.targetType === 'cemetery') {
        records = recordsByCemetery[item.targetId] || [];
      } else if (item.targetType === 'record') {
        const rec = allRecords.find(r => r.id === item.targetId);
        if (rec) records = [rec];
      }

      if (records.length === 0) continue;

      // Compute current health
      const currentHealth = computeQuickHealth(records);
      const currentAnomalies = computeCemeteryAnomalies(records);

      // Compare with previous state
      const previousStatus = item.lastStatus;
      const watchFor = item.watchFor || [];

      // Health degradation alert
      if (watchFor.includes('health_degradation') && previousStatus) {
        const scoreDrop = (previousStatus.healthScore || 0) - currentHealth.overallScore;
        if (scoreDrop >= 5) {
          alerts.push({
            watchlistItemId: item.id,
            targetType: item.targetType,
            targetId: item.targetId,
            label: item.label,
            alertType: 'health_degradation',
            severity: scoreDrop >= 15 ? 'critical' : scoreDrop >= 10 ? 'high' : 'medium',
            message: `Health score dropped by ${scoreDrop} points (from ${previousStatus.healthScore || 0} to ${currentHealth.overallScore})`,
            currentValue: currentHealth.overallScore,
            previousValue: previousStatus.healthScore || 0,
            detectedAt: new Date().toISOString()
          });
        }
      }

      // New anomalies alert
      if (watchFor.includes('new_anomalies') && previousStatus) {
        const prevAnomalies = previousStatus.anomalyCount || 0;
        const currentAnomalyTotal = currentAnomalies.total;
        if (currentAnomalyTotal > prevAnomalies) {
          const newCount = currentAnomalyTotal - prevAnomalies;
          alerts.push({
            watchlistItemId: item.id,
            targetType: item.targetType,
            targetId: item.targetId,
            label: item.label,
            alertType: 'new_anomalies',
            severity: currentAnomalies.critical > (previousStatus.criticalAnomalies || 0) ? 'critical' : 'medium',
            message: `${newCount} new anomaly(ies) detected (total: ${currentAnomalyTotal})`,
            currentValue: currentAnomalyTotal,
            previousValue: prevAnomalies,
            detectedAt: new Date().toISOString()
          });
        }
      }

      // Unapplied fixes alert
      if (watchFor.includes('unapplied_fixes')) {
        let totalFixes = 0;
        for (const rec of records) {
          const fixes = generateAutoFixes(rec);
          totalFixes += fixes.filter(f => f.confidence === 'high').length;
        }
        if (totalFixes > 0) {
          alerts.push({
            watchlistItemId: item.id,
            targetType: item.targetType,
            targetId: item.targetId,
            label: item.label,
            alertType: 'unapplied_fixes',
            severity: 'low',
            message: `${totalFixes} high-confidence fix(es) available but not applied`,
            currentValue: totalFixes,
            previousValue: null,
            detectedAt: new Date().toISOString()
          });
        }
      }

      // Duplicate detected alert
      if (watchFor.includes('duplicate_detected')) {
        const nameDateMap = {};
        let dupCount = 0;
        for (const rec of records) {
          if (rec.name && rec.deathDate) {
            const key = (rec.name || '').toLowerCase().trim() + '|' + rec.deathDate;
            if (nameDateMap[key]) dupCount++;
            else nameDateMap[key] = true;
          }
        }
        if (dupCount > 0) {
          alerts.push({
            watchlistItemId: item.id,
            targetType: item.targetType,
            targetId: item.targetId,
            label: item.label,
            alertType: 'duplicate_detected',
            severity: 'medium',
            message: `${dupCount} potential duplicate(s) detected`,
            currentValue: dupCount,
            previousValue: null,
            detectedAt: new Date().toISOString()
          });
        }
      }

      // Missing data alert
      if (watchFor.includes('missing_data')) {
        const missingSources = records.filter(r => !r.sourceRefs || r.sourceRefs.length === 0).length;
        const missingPhotos = records.filter(r => !r.photoRefs || r.photoRefs.length === 0).length;
        const missingRate = records.length > 0 ? (missingSources + missingPhotos) / (records.length * 2) : 0;
        if (missingRate > 0.5) {
          alerts.push({
            watchlistItemId: item.id,
            targetType: item.targetType,
            targetId: item.targetId,
            label: item.label,
            alertType: 'missing_data',
            severity: missingRate > 0.8 ? 'high' : 'medium',
            message: `${Math.round(missingRate * 100)}% of expected data fields are missing`,
            currentValue: Math.round(missingRate * 100),
            previousValue: null,
            detectedAt: new Date().toISOString()
          });
        }
      }

      // Update watchlist item with current status
      item.lastChecked = new Date().toISOString();
      item.lastStatus = {
        healthScore: currentHealth.overallScore,
        healthGrade: currentHealth.grade,
        anomalyCount: currentAnomalies.total,
        criticalAnomalies: currentAnomalies.critical,
        recordCount: records.length
      };

      try {
        await writeFile(`watchlist/${item.id}.json`, JSON.stringify(item, null, 2), env);
      } catch (e) { /* continue even if write fails */ }
    }

    return jsonResponse({
      success: true,
      alerts: alerts,
      checkedItems: checkedCount,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      highAlerts: alerts.filter(a => a.severity === 'high').length,
      checkedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to check watchlist',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/watchlist/status
 * Returns a summary of watchlist status without detailed alerts.
 */
async function handleWatchlistStatus(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured — watchlist unavailable'
    }, 200, cors);
  }

  try {
    const files = await listFiles('watchlist', env);
    let activeItems = 0;
    let itemsWithAlerts = 0;
    let lastCheckedAt = null;
    let totalAlerts = 0;

    for (const file of files) {
      try {
        const content = await readFile(`watchlist/${file}`, env);
        if (!content) continue;
        const item = JSON.parse(content);
        if (item.active !== false) activeItems++;
        if (item.lastChecked) {
          const checkedDate = new Date(item.lastChecked);
          if (!lastCheckedAt || checkedDate > new Date(lastCheckedAt)) {
            lastCheckedAt = item.lastChecked;
          }
        }
      } catch (e) { /* skip */ }
    }

    return jsonResponse({
      success: true,
      activeItems: activeItems,
      totalItems: activeItems,
      lastCheckedAt: lastCheckedAt,
      needsCheck: lastCheckedAt
        ? (Date.now() - new Date(lastCheckedAt).getTime()) > 24 * 60 * 60 * 1000
        : true
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to get watchlist status',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.15: AI Export & Reporting Handlers ──

/**
 * Compute cemetery statistics from an in-memory record array.
 * Used by reporting endpoints.
 */
function computeCemeteryStats(records) {
  const total = records.length;
  let verified = 0, unverified = 0, communitySubmitted = 0;
  let withPhotos = 0, withInscriptions = 0, withSources = 0, withCoords = 0;
  let withBirthDate = 0, withDeathDate = 0, withGivenNames = 0, withFamilyName = 0;
  let withSection = 0, withPlot = 0;
  const deathYears = [];

  for (const rec of records) {
    if (rec.verificationStatus === 'verified') verified++;
    else unverified++;
    if (rec.submitterName) communitySubmitted++;
    if (rec.photoRefs && rec.photoRefs.length > 0) withPhotos++;
    if (rec.inscription && rec.inscription.trim()) withInscriptions++;
    if (rec.sourceRefs && rec.sourceRefs.length > 0) withSources++;
    if (rec.latitude && rec.longitude) withCoords++;
    if (rec.birthDate) withBirthDate++;
    if (rec.deathDate) {
      withDeathDate++;
      const y = parseInt(String(rec.deathDate).substring(0, 4));
      if (!isNaN(y)) deathYears.push(y);
    }
    if (rec.givenNames) withGivenNames++;
    if (rec.familyName) withFamilyName++;
    if (rec.section) withSection++;
    if (rec.plot) withPlot++;
  }

  return {
    totalRecords: total,
    verifiedRecords: verified,
    unverified: unverified,
    communitySubmitted: communitySubmitted,
    withPhotos: withPhotos,
    withInscriptions: withInscriptions,
    withSources: withSources,
    withCoordinates: withCoords,
    withBirthDate: withBirthDate,
    withDeathDate: withDeathDate,
    withGivenNames: withGivenNames,
    withFamilyName: withFamilyName,
    withSection: withSection,
    withPlot: withPlot,
    photoCoverage: total > 0 ? Math.round((withPhotos / total) * 100) : 0,
    inscriptionCoverage: total > 0 ? Math.round((withInscriptions / total) * 100) : 0,
    sourceCoverage: total > 0 ? Math.round((withSources / total) * 100) : 0,
    coordinateCoverage: total > 0 ? Math.round((withCoords / total) * 100) : 0,
    dateCoverage: total > 0 ? Math.round((withDeathDate / total) * 100) : 0,
    nameCoverage: total > 0 ? Math.round((withGivenNames / total) * 100) : 0,
    deathYearRange: deathYears.length > 0 ? {
      earliest: Math.min(...deathYears),
      latest: Math.max(...deathYears)
    } : null
  };
}

/**
 * Compute anomaly summary from an in-memory record array.
 */
function computeCemeteryAnomalies(records) {
  let critical = 0, warning = 0, info = 0;
  const byType = {};
  const currentYear = new Date().getFullYear();

  for (const rec of records) {
    // Date anomalies
    if (rec.birthDate && rec.deathDate) {
      const by = parseInt(String(rec.birthDate).substring(0, 4));
      const dy = parseInt(String(rec.deathDate).substring(0, 4));
      if (!isNaN(by) && !isNaN(dy)) {
        if (by > dy) { critical++; byType.date_birth_after_death = (byType.date_birth_after_death || 0) + 1; }
        if (dy - by > 120) { warning++; byType.date_age_over_120 = (byType.date_age_over_120 || 0) + 1; }
      }
    }
    if (rec.birthDate) {
      const by = parseInt(String(rec.birthDate).substring(0, 4));
      if (!isNaN(by) && by > currentYear) { critical++; byType.date_birth_future = (byType.date_birth_future || 0) + 1; }
    }
    if (rec.deathDate) {
      const dy = parseInt(String(rec.deathDate).substring(0, 4));
      if (!isNaN(dy) && dy > currentYear) { critical++; byType.date_death_future = (byType.date_death_future || 0) + 1; }
    }

    // Name anomalies
    if (!rec.name && !rec.graveIdentifier) { critical++; byType.name_missing = (byType.name_missing || 0) + 1; }

    // Coordinate anomalies
    if (rec.latitude !== undefined && rec.latitude !== null) {
      if (Math.abs(rec.latitude) > 90) { critical++; byType.coord_lat_invalid = (byType.coord_lat_invalid || 0) + 1; }
    }
    if (rec.longitude !== undefined && rec.longitude !== null) {
      if (Math.abs(rec.longitude) > 180) { critical++; byType.coord_lng_invalid = (byType.coord_lng_invalid || 0) + 1; }
    }
  }

  return {
    critical, warning, info,
    total: critical + warning + info,
    byType
  };
}

/**
 * Generate recommendations from in-memory records, stats, and anomalies.
 * Lightweight version of the full recommendation generator.
 */
function generateRecommendations(records, stats, anomalySummary) {
  const recommendations = [];
  const total = records.length;
  if (total === 0) return recommendations;

  // Critical: missing names
  const missingNames = records.filter(r => !r.name && !r.graveIdentifier).length;
  if (missingNames > 0) {
    recommendations.push({
      category: 'data_quality', priority: 'critical',
      title: 'Records missing name or identifier',
      description: `${missingNames} record(s) have no name or grave identifier`,
      affectedRecords: missingNames,
      estimatedEffort: 'high',
      actionEndpoint: null
    });
  }

  // Critical: birth after death anomalies
  if (anomalySummary.critical > 0) {
    recommendations.push({
      category: 'anomalies', priority: 'critical',
      title: `${anomalySummary.critical} critical anomalies detected`,
      description: 'Critical anomalies require immediate attention',
      affectedRecords: anomalySummary.critical,
      estimatedEffort: 'medium',
      actionEndpoint: null
    });
  }

  // High: missing sources
  const missingSources = total - (stats.withSources || 0);
  if (missingSources / total > 0.5) {
    recommendations.push({
      category: 'content', priority: 'high',
      title: 'Majority of records lack source attribution',
      description: `${missingSources} of ${total} records have no source references`,
      affectedRecords: missingSources,
      estimatedEffort: 'high',
      actionEndpoint: null
    });
  }

  // High: missing photos
  const missingPhotos = total - (stats.withPhotos || 0);
  if (missingPhotos / total > 0.6) {
    recommendations.push({
      category: 'content', priority: 'high',
      title: 'Most records have no photos',
      description: `${missingPhotos} of ${total} records have no photo references`,
      affectedRecords: missingPhotos,
      estimatedEffort: 'medium',
      actionEndpoint: null
    });
  }

  // Medium: missing inscriptions
  const missingInscriptions = total - (stats.withInscriptions || 0);
  if (missingInscriptions / total > 0.4) {
    recommendations.push({
      category: 'content', priority: 'medium',
      title: 'Many records lack transcribed inscriptions',
      description: `${missingInscriptions} of ${total} records have no inscription`,
      affectedRecords: missingInscriptions,
      estimatedEffort: 'medium',
      actionEndpoint: null
    });
  }

  // Medium: missing dates
  const missingDates = total - (stats.withDeathDate || 0);
  if (missingDates / total > 0.3) {
    recommendations.push({
      category: 'data_quality', priority: 'medium',
      title: 'Records missing death dates',
      description: `${missingDates} of ${total} records have no death date`,
      affectedRecords: missingDates,
      estimatedEffort: 'low',
      actionEndpoint: null
    });
  }

  // Low: duplicates
  const nameDateMap = {};
  let duplicates = 0;
  for (const rec of records) {
    if (rec.name && rec.deathDate) {
      const key = (rec.name || '').toLowerCase().trim() + '|' + rec.deathDate;
      if (nameDateMap[key]) duplicates++;
      else nameDateMap[key] = true;
    }
  }
  if (duplicates > 0) {
    recommendations.push({
      category: 'duplicates', priority: 'high',
      title: 'Potential duplicate records detected',
      description: `${duplicates} potential duplicate record(s) found`,
      affectedRecords: duplicates,
      estimatedEffort: 'medium',
      actionEndpoint: null
    });
  }

  // Low: warning anomalies
  if (anomalySummary.warning > 0) {
    recommendations.push({
      category: 'anomalies', priority: 'low',
      title: 'Minor anomalies to review',
      description: `${anomalySummary.warning} minor anomaly(ies) detected`,
      affectedRecords: anomalySummary.warning,
      estimatedEffort: 'low',
      actionEndpoint: null
    });
  }

  return recommendations;
}

// ── Phase 16.19: AI Confidence Scoring Handlers ──

/**
 * Compute a comprehensive confidence score for a single record.
 * Combines multiple signals into a single 0-100 score with transparent breakdown.
 *
 * Signals:
 * - Completeness (30%): how many important fields are filled
 * - Verification (20%): verificationStatus (verified > submitted > unverified)
 * - Source quality (20%): number and quality of source references
 * - Anomaly-free (15%): no detected anomalies
 * - Merge history (5%): records that resulted from merges are slightly lower
 * - Community engagement (5%): corrections, submissions, views
 * - Geographic precision (5%): has precise coordinates
 */
function computeConfidenceScore(record, anomalies, sourceVerification, mergeHistoryCount) {
  const breakdown = {
    completeness: { score: 0, max: 30, details: [] },
    verification: { score: 0, max: 20, details: [] },
    sourceQuality: { score: 0, max: 20, details: [] },
    anomalyFree: { score: 0, max: 15, details: [] },
    mergeHistory: { score: 0, max: 5, details: [] },
    community: { score: 0, max: 5, details: [] },
    geoPrecision: { score: 0, max: 5, details: [] }
  };

  // ── Completeness (30 points) ──
  const importantFields = [
    'name', 'birthDate', 'deathDate', 'cemeteryId', 'section', 'plot',
    'latitude', 'longitude', 'inscription', 'sourceRefs', 'notes'
  ];
  const filledFields = importantFields.filter(f => {
    const val = record[f];
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'string') return val.trim().length > 0;
    return true;
  });
  const completenessPct = filledFields.length / importantFields.length;
  breakdown.completeness.score = Math.round(completenessPct * 30);
  breakdown.completeness.details.push({
    filled: filledFields.length,
    total: importantFields.length,
    percentage: Math.round(completenessPct * 100)
  });

  // Extra credit for biographical fields
  const bioFields = ['givenNames', 'familyName', 'birthPlace', 'deathPlace', 'occupation', 'spouseName'];
  const filledBio = bioFields.filter(f => record[f] && String(record[f]).trim().length > 0);
  if (filledBio.length > 0) {
    const bonus = Math.min(filledBio.length * 1, 5);
    breakdown.completeness.score = Math.min(breakdown.completeness.score + bonus, 30);
    breakdown.completeness.details.push({ biographicalFields: filledBio.length, bonus: bonus });
  }

  // ── Verification (20 points) ──
  const status = record.verificationStatus || 'unverified';
  switch (status) {
    case 'verified':
      breakdown.verification.score = 20;
      breakdown.verification.details.push({ status: 'verified', fullPoints: true });
      break;
    case 'submitted':
      breakdown.verification.score = 10;
      breakdown.verification.details.push({ status: 'submitted', partialPoints: true });
      break;
    case 'unverified':
    default:
      breakdown.verification.score = 0;
      breakdown.verification.details.push({ status: 'unverified', noPoints: true });
      break;
  }

  // ── Source quality (20 points) ──
  const sourceRefs = record.sourceRefs || [];
  if (sourceRefs.length === 0) {
    breakdown.sourceQuality.score = 0;
    breakdown.sourceQuality.details.push({ count: 0, message: 'No sources cited' });
  } else {
    let sourcePoints = 0;
    breakdown.sourceQuality.details.push({ count: sourceRefs.length });

    if (sourceVerification) {
      // Use actual verification data if available
      const liveRatio = sourceVerification.live / Math.max(sourceVerification.total, 1);
      sourcePoints = Math.round(liveRatio * 15);
      breakdown.sourceQuality.details.push({
        live: sourceVerification.live,
        dead: sourceVerification.dead,
        liveRatio: Math.round(liveRatio * 100) + '%'
      });

      // Bonus for archived sources
      if (sourceVerification.archived > 0) {
        sourcePoints += Math.min(sourceVerification.archived * 1, 3);
        breakdown.sourceQuality.details.push({ archived: sourceVerification.archived });
      }

      // Bonus for multiple sources
      if (sourceVerification.total >= 3) {
        sourcePoints += 2;
        breakdown.sourceQuality.details.push({ multipleSources: true, bonus: 2 });
      }
    } else {
      // Without verification, give partial credit for having sources
      sourcePoints = Math.min(sourceRefs.length * 4, 12);
      breakdown.sourceQuality.details.push({ message: 'Sources present but not verified' });
      if (sourceRefs.length >= 3) sourcePoints += 2;
    }

    breakdown.sourceQuality.score = Math.min(sourcePoints, 20);
  }

  // ── Anomaly-free (15 points) ──
  if (anomalies && anomalies.length > 0) {
    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    const highCount = anomalies.filter(a => a.severity === 'high').length;
    const mediumCount = anomalies.filter(a => a.severity === 'medium').length;
    const lowCount = anomalies.filter(a => a.severity === 'low').length;

    let penalty = criticalCount * 8 + highCount * 4 + mediumCount * 2 + lowCount * 1;
    breakdown.anomalyFree.score = Math.max(15 - penalty, 0);
    breakdown.anomalyFree.details.push({
      total: anomalies.length,
      critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount,
      penalty: penalty
    });
  } else {
    breakdown.anomalyFree.score = 15;
    breakdown.anomalyFree.details.push({ total: 0, message: 'No anomalies detected' });
  }

  // ── Merge history (5 points) ──
  if (mergeHistoryCount > 0) {
    // Merged records lose a small amount — they might have inherited fields
    breakdown.mergeHistory.score = Math.max(5 - mergeHistoryCount, 0);
    breakdown.mergeHistory.details.push({
      mergeCount: mergeHistoryCount,
      message: 'Record has merge history — slightly reduced confidence'
    });
  } else {
    breakdown.mergeHistory.score = 5;
    breakdown.mergeHistory.details.push({ mergeCount: 0, message: 'No merges — original record' });
  }

  // ── Community engagement (5 points) ──
  const corrections = record.corrections || [];
  const submitterName = record.submitterName;
  let communityPoints = 0;
  if (submitterName) {
    communityPoints += 1;
    breakdown.community.details.push({ hasSubmitter: true });
  }
  if (corrections.length > 0) {
    communityPoints += Math.min(corrections.length * 1, 3);
    breakdown.community.details.push({ corrections: corrections.length });
  }
  // Bonus: if record has been viewed/submitted (proxy: has submitterName and corrections)
  if (submitterName && corrections.length > 0) {
    communityPoints += 1;
    breakdown.community.details.push({ communityReview: true, bonus: 1 });
  }
  breakdown.community.score = Math.min(communityPoints, 5);

  // ── Geographic precision (5 points) ──
  if (record.latitude && record.longitude) {
    const latStr = String(record.latitude);
    const lonStr = String(record.longitude);
    const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
    const lonDecimals = lonStr.includes('.') ? lonStr.split('.')[1].length : 0;
    const maxDecimals = Math.max(latDecimals, lonDecimals);

    if (maxDecimals >= 6) {
      breakdown.geoPrecision.score = 5;
      breakdown.geoPrecision.details.push({ precision: maxDecimals + ' decimal places', fullPoints: true });
    } else if (maxDecimals >= 4) {
      breakdown.geoPrecision.score = 3;
      breakdown.geoPrecision.details.push({ precision: maxDecimals + ' decimal places', partial: true });
    } else if (maxDecimals >= 2) {
      breakdown.geoPrecision.score = 1;
      breakdown.geoPrecision.details.push({ precision: maxDecimals + ' decimal places', low: true });
    } else {
      breakdown.geoPrecision.score = 0;
      breakdown.geoPrecision.details.push({ precision: maxDecimals + ' decimal places', message: 'Insufficient precision' });
    }
  } else {
    breakdown.geoPrecision.score = 0;
    breakdown.geoPrecision.details.push({ message: 'No coordinates' });
  }

  // ── Total ──
  const total = Object.values(breakdown).reduce((sum, b) => sum + b.score, 0);

  // Determine confidence tier
  let tier;
  if (total >= 90) tier = 'platinum';
  else if (total >= 75) tier = 'gold';
  else if (total >= 60) tier = 'silver';
  else if (total >= 40) tier = 'bronze';
  else tier = 'unverified';

  return {
    score: total,
    maxScore: 100,
    tier,
    breakdown,
    computedAt: new Date().toISOString()
  };
}

/**
 * GET /api/graves/:id/confidence
 * Compute and return confidence score for a single record.
 */
async function handleGetRecordConfidence(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured — confidence scoring unavailable',
      confidence: { score: 0, tier: 'unverified' }
    }, 200, cors);
  }

  try {
    const content = await readFile(`graves/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Record not found' }, 404, cors);
    }

    const record = JSON.parse(content);

    // Gather signals
    // 1. Anomalies
    let anomalies = [];
    try {
      const anomalyResult = computeCemeteryAnomalies([record]);
      anomalies = anomalyResult.anomalies || [];
    } catch (e) { /* no anomalies */ }

    // 2. Source verification (lightweight — don't do live HTTP checks, just count)
    const sourceRefs = record.sourceRefs || [];
    let sourceVerification = null;
    if (sourceRefs.length > 0) {
      // Use stored verification if available, otherwise basic count
      sourceVerification = {
        total: sourceRefs.length,
        live: sourceRefs.length, // assume live without checking
        dead: 0,
        archived: 0
      };
    }

    // 3. Merge history count
    const mergeHistoryCount = (record.mergeHistory || []).length;

    const confidence = computeConfidenceScore(record, anomalies, sourceVerification, mergeHistoryCount);

    return jsonResponse({
      success: true,
      recordId: safeId,
      recordName: record.name || record.graveIdentifier || 'Unknown',
      confidence: confidence
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to compute confidence score',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/cemeteries/:id/confidence
 * Compute confidence scores for all records in a cemetery.
 */
async function handleGetCemeteryConfidence(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const records = [];
    const recordsById = {};

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        records.push(record);
        recordsById[record.id] = record;
      } catch (e) { /* skip */ }
    }

    if (records.length === 0) {
      return jsonResponse({
        success: true,
        cemeteryId: safeId,
        totalRecords: 0,
        recordScores: [],
        cemeterySummary: {
          averageScore: 0,
          platinumCount: 0, goldCount: 0, silverCount: 0, bronzeCount: 0, unverifiedCount: 0,
          totalRecords: 0
        },
        message: 'No records found'
      }, 200, cors);
    }

    const recordScores = [];
    let totalScore = 0;
    let platinumCount = 0, goldCount = 0, silverCount = 0, bronzeCount = 0, unverifiedCount = 0;

    for (const record of records) {
      // Lightweight anomalies
      let anomalies = [];
      try {
        const anomalyResult = computeCemeteryAnomalies([record]);
        anomalies = anomalyResult.anomalies || [];
      } catch (e) { /* skip */ }

      const sourceRefs = record.sourceRefs || [];
      let sourceVerification = null;
      if (sourceRefs.length > 0) {
        sourceVerification = { total: sourceRefs.length, live: sourceRefs.length, dead: 0, archived: 0 };
      }

      const mergeHistoryCount = (record.mergeHistory || []).length;
      const confidence = computeConfidenceScore(record, anomalies, sourceVerification, mergeHistoryCount);

      recordScores.push({
        recordId: record.id,
        recordName: record.name || record.graveIdentifier || 'Unknown',
        score: confidence.score,
        tier: confidence.tier
      });

      totalScore += confidence.score;
      switch (confidence.tier) {
        case 'platinum': platinumCount++; break;
        case 'gold': goldCount++; break;
        case 'silver': silverCount++; break;
        case 'bronze': bronzeCount++; break;
        default: unverifiedCount++; break;
      }
    }

    recordScores.sort((a, b) => b.score - a.score);
    const avgScore = Math.round(totalScore / records.length);

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      totalRecords: records.length,
      recordScores: recordScores,
      cemeterySummary: {
        averageScore: avgScore,
        platinumCount, goldCount, silverCount, bronzeCount, unverifiedCount,
        totalRecords: records.length
      },
      computedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to compute cemetery confidence',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/confidence/batch
 * Batch compute confidence scores for up to 50 records.
 * Body: { recordIds: string[] }
 */
async function handleBatchConfidence(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, message: 'GitHub not configured', results: [] }, 200, cors);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const recordIds = (body && body.recordIds) || [];

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return jsonResponse({ success: false, error: 'Missing recordIds array' }, 400, cors);
    }

    if (recordIds.length > 50) {
      return jsonResponse({ success: false, error: 'Maximum 50 records per batch' }, 400, cors);
    }

    const results = [];

    for (const recordId of recordIds) {
      const safeId = sanitizePathSegment(recordId);
      if (!safeId || safeId !== recordId) continue;

      try {
        const content = await readFile(`graves/${safeId}.json`, env);
        if (!content) {
          results.push({ recordId, status: 'not_found' });
          continue;
        }
        const record = JSON.parse(content);

        let anomalies = [];
        try {
          const anomalyResult = computeCemeteryAnomalies([record]);
          anomalies = anomalyResult.anomalies || [];
        } catch (e) { /* skip */ }

        const sourceRefs = record.sourceRefs || [];
        let sourceVerification = null;
        if (sourceRefs.length > 0) {
          sourceVerification = { total: sourceRefs.length, live: sourceRefs.length, dead: 0, archived: 0 };
        }

        const mergeHistoryCount = (record.mergeHistory || []).length;
        const confidence = computeConfidenceScore(record, anomalies, sourceVerification, mergeHistoryCount);

        results.push({
          recordId: record.id,
          recordName: record.name || record.graveIdentifier || 'Unknown',
          score: confidence.score,
          tier: confidence.tier
        });
      } catch (e) {
        results.push({ recordId, status: 'error', message: e.message });
      }
    }

    return jsonResponse({
      success: true,
      results: results,
      totalComputed: results.length,
      computedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to batch compute confidence',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/confidence/leaderboard
 * Returns top records by confidence score across the entire system.
 */
async function handleConfidenceLeaderboard(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: true, message: 'GitHub not configured', leaderboard: [] }, 200, cors);
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const tier = url.searchParams.get('tier'); // filter by tier if provided

    const files = await listFiles('graves', env);
    const scores = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;

        let anomalies = [];
        try {
          const anomalyResult = computeCemeteryAnomalies([record]);
          anomalies = anomalyResult.anomalies || [];
        } catch (e) { /* skip */ }

        const sourceRefs = record.sourceRefs || [];
        let sourceVerification = null;
        if (sourceRefs.length > 0) {
          sourceVerification = { total: sourceRefs.length, live: sourceRefs.length, dead: 0, archived: 0 };
        }

        const mergeHistoryCount = (record.mergeHistory || []).length;
        const confidence = computeConfidenceScore(record, anomalies, sourceVerification, mergeHistoryCount);

        if (tier && confidence.tier !== tier) continue;

        scores.push({
          recordId: record.id,
          recordName: record.name || record.graveIdentifier || 'Unknown',
          cemeteryId: record.cemeteryId || null,
          score: confidence.score,
          tier: confidence.tier,
          verificationStatus: record.verificationStatus || 'unverified'
        });
      } catch (e) { /* skip */ }
    }

    scores.sort((a, b) => b.score - a.score);

    return jsonResponse({
      success: true,
      leaderboard: scores.slice(0, limit),
      totalRecords: scores.length,
      tierDistribution: {
        platinum: scores.filter(s => s.tier === 'platinum').length,
        gold: scores.filter(s => s.tier === 'gold').length,
        silver: scores.filter(s => s.tier === 'silver').length,
        bronze: scores.filter(s => s.tier === 'bronze').length,
        unverified: scores.filter(s => s.tier === 'unverified').length
      },
      computedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate leaderboard',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.18: AI Source Verification Handlers ──

/**
 * Verify a single source reference.
 * Checks: URL liveness (HEAD request), content type, archive availability.
 * Returns verification result with status, confidence, and notes.
 */
async function verifySourceRef(sourceRef) {
  if (!sourceRef || typeof sourceRef !== 'string') {
    return { ref: sourceRef, status: 'invalid', confidence: 0, notes: 'Invalid source reference' };
  }

  // Check if it's a URL
  const urlPattern = /^https?:\/\/[^\s]+$/i;
  if (!urlPattern.test(sourceRef)) {
    // Non-URL reference — check if it looks like a citation
    if (sourceRef.length > 10) {
      return {
        ref: sourceRef,
        status: 'unverifiable',
        confidence: 0,
        notes: 'Non-URL reference — manual verification needed',
        type: 'citation'
      };
    }
    return { ref: sourceRef, status: 'invalid', confidence: 0, notes: 'Source reference too short' };
  }

  const result = {
    ref: sourceRef,
    url: sourceRef,
    status: 'unknown',
    confidence: 0,
    statusCode: null,
    contentType: null,
    archived: false,
    archiveUrl: null,
    notes: []
  };

  // Try HEAD request to check liveness
  try {
    const response = await fetch(sourceRef, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });

    result.statusCode = response.status;
    result.contentType = response.headers.get('content-type') || 'unknown';

    if (response.ok) {
      result.status = 'live';
      result.confidence = 85;
      result.notes.push('URL is accessible and returns content');
    } else if (response.status === 404) {
      result.status = 'dead';
      result.confidence = 95;
      result.notes.push('URL returns 404 — source may have been removed');
    } else if (response.status === 403 || response.status === 401) {
      result.status = 'restricted';
      result.confidence = 50;
      result.notes.push('URL exists but access is restricted');
    } else if (response.status >= 500) {
      result.status = 'error';
      result.confidence = 30;
      result.notes.push(`Server error (${response.status}) — temporarily unavailable`);
    } else if (response.status >= 300 && response.status < 400) {
      result.status = 'redirect';
      result.confidence = 70;
      result.notes.push('URL redirects — source likely still accessible');
    } else {
      result.status = 'unknown';
      result.confidence = 20;
      result.notes.push(`Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    // Network error — might be DNS failure, timeout, or SSL issue
    result.status = 'unreachable';
    result.confidence = 60;
    result.notes.push(`Network error: ${error.message || 'unable to reach URL'}`);

    // Check if it's a timeout
    if (error.name === 'TimeoutError' || (error.message && error.message.includes('timeout'))) {
      result.status = 'timeout';
      result.confidence = 40;
      result.notes = ['Request timed out — source may be slow or down'];
    }
  }

  // Check Wayback Machine for archived copy
  try {
    const waybackUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(sourceRef)}`;
    const wbResponse = await fetch(waybackUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(8000)
    });

    if (wbResponse.ok) {
      const wbData = await wbResponse.json();
      if (wbData.archived_snapshots && wbData.archived_snapshots.closest) {
        result.archived = true;
        result.archiveUrl = wbData.archived_snapshots.closest.url;
        result.archiveTimestamp = wbData.archived_snapshots.closest.timestamp;
        result.notes.push('Archived copy available on Wayback Machine');

        // If the URL is dead but we have an archive, boost confidence
        if (result.status === 'dead' || result.status === 'unreachable') {
          result.confidence = Math.max(result.confidence, 65);
          result.notes.push('Original URL is dead but archived copy exists');
        }
      }
    }
  } catch (e) {
    // Wayback check failed — not critical
  }

  return result;
}

/**
 * Verify all source references for a record.
 * Returns per-source verification results and an overall verification summary.
 */
async function verifyRecordSources(record) {
  const sourceRefs = record.sourceRefs || [];

  if (sourceRefs.length === 0) {
    return {
      recordId: record.id,
      recordName: record.name || record.graveIdentifier || 'Unknown',
      totalSources: 0,
      results: [],
      summary: {
        total: 0,
        live: 0,
        dead: 0,
        restricted: 0,
        unreachable: 0,
        unverifiable: 0,
        archived: 0,
        overallStatus: 'no_sources',
        overallConfidence: 0,
        verificationScore: 0
      }
    };
  }

  const results = [];
  for (const ref of sourceRefs) {
    const result = await verifySourceRef(ref);
    results.push(result);
  }

  // Compute summary
  let live = 0, dead = 0, restricted = 0, unreachable = 0, unverifiable = 0;
  let archived = 0;
  let totalConfidence = 0;

  for (const r of results) {
    switch (r.status) {
      case 'live': live++; break;
      case 'dead': dead++; break;
      case 'restricted': restricted++; break;
      case 'unreachable': unreachable++; break;
      case 'unverifiable': unverifiable++; break;
    }
    if (r.archived) archived++;
    totalConfidence += r.confidence || 0;
  }

  const total = results.length;
  const avgConfidence = total > 0 ? Math.round(totalConfidence / total) : 0;

  // Overall status: if any dead and not archived, that's critical
  let overallStatus;
  if (dead > 0 && archived < dead) {
    overallStatus = 'critical';
  } else if (live === total) {
    overallStatus = 'verified';
  } else if (live > 0) {
    overallStatus = 'partial';
  } else if (unreachable > 0 && live === 0) {
    overallStatus = 'unverified';
  } else {
    overallStatus = 'unverified';
  }

  // Verification score: percentage of live sources
  const verificationScore = total > 0 ? Math.round((live / total) * 100) : 0;

  return {
    recordId: record.id,
    recordName: record.name || record.graveIdentifier || 'Unknown',
    totalSources: total,
    results: results,
    summary: {
      total: total,
      live: live,
      dead: dead,
      restricted: restricted,
      unreachable: unreachable,
      unverifiable: unverifiable,
      archived: archived,
      overallStatus: overallStatus,
      overallConfidence: avgConfidence,
      verificationScore: verificationScore
    }
  };
}

/**
 * POST /api/graves/:id/sources/verify
 * Verify all source references for a single record.
 */
async function handleVerifyRecordSources(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured — source verification unavailable',
      verification: { summary: { overallStatus: 'unverified', verificationScore: 0 } }
    }, 200, cors);
  }

  try {
    const content = await readFile(`graves/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Record not found' }, 404, cors);
    }

    const record = JSON.parse(content);
    const verification = await verifyRecordSources(record);

    return jsonResponse({
      success: true,
      verification: verification
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to verify sources',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/cemeteries/:id/sources/verify
 * Verify source references for all records in a cemetery.
 * Returns per-record summaries and an overall cemetery verification report.
 */
async function handleVerifyCemeterySources(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured — source verification unavailable'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const records = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        if (!record.sourceRefs || record.sourceRefs.length === 0) continue;
        records.push(record);
      } catch (e) { /* skip */ }
    }

    if (records.length === 0) {
      return jsonResponse({
        success: true,
        cemeteryId: safeId,
        totalRecords: 0,
        recordVerifications: [],
        cemeterySummary: {
          totalRecords: 0,
          recordsWithSources: 0,
          totalSources: 0,
          liveSources: 0,
          deadSources: 0,
          overallStatus: 'no_sources',
          verificationScore: 0
        },
        message: 'No records with source references found'
      }, 200, cors);
    }

    const recordVerifications = [];
    let totalSources = 0, liveSources = 0, deadSources = 0;
    let totalScore = 0;

    for (const record of records) {
      const verification = await verifyRecordSources(record);
      recordVerifications.push({
        recordId: verification.recordId,
        recordName: verification.recordName,
        totalSources: verification.totalSources,
        summary: verification.summary
      });
      totalSources += verification.summary.total;
      liveSources += verification.summary.live;
      deadSources += verification.summary.dead;
      totalScore += verification.summary.verificationScore;
    }

    const avgScore = records.length > 0 ? Math.round(totalScore / records.length) : 0;

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      totalRecords: records.length,
      recordVerifications: recordVerifications,
      cemeterySummary: {
        totalRecords: records.length,
        recordsWithSources: records.length,
        totalSources: totalSources,
        liveSources: liveSources,
        deadSources: deadSources,
        overallStatus: avgScore >= 80 ? 'verified' : avgScore >= 50 ? 'partial' : 'unverified',
        verificationScore: avgScore
      },
      verifiedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to verify cemetery sources',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/sources/verify/batch
 * Batch verify sources across multiple records.
 * Body: { recordIds: string[] }
 */
async function handleBatchVerifySources(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured',
      results: []
    }, 200, cors);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const recordIds = (body && body.recordIds) || [];

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return jsonResponse({
        success: false,
        error: 'Missing recordIds array'
      }, 400, cors);
    }

    if (recordIds.length > 50) {
      return jsonResponse({
        success: false,
        error: 'Maximum 50 records per batch'
      }, 400, cors);
    }

    const results = [];

    for (const recordId of recordIds) {
      const safeId = sanitizePathSegment(recordId);
      if (!safeId || safeId !== recordId) continue;

      try {
        const content = await readFile(`graves/${safeId}.json`, env);
        if (!content) {
          results.push({ recordId, status: 'not_found' });
          continue;
        }
        const record = JSON.parse(content);
        const verification = await verifyRecordSources(record);
        results.push({
          recordId: verification.recordId,
          recordName: verification.recordName,
          totalSources: verification.totalSources,
          summary: verification.summary
        });
      } catch (e) {
        results.push({ recordId, status: 'error', message: e.message });
      }
    }

    return jsonResponse({
      success: true,
      results: results,
      totalVerified: results.length,
      verifiedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to batch verify sources',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/sources/verify/status
 * Returns a summary of source verification status across all records.
 */
async function handleSourceVerificationStatus(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    let totalRecords = 0;
    let recordsWithSources = 0;
    let totalSourceRefs = 0;
    let recordsFullyVerified = 0;
    let recordsWithDeadSources = 0;
    let recordsWithArchivedSources = 0;

    // Track source URLs we've already checked (avoid redundant fetches)
    const checkedUrls = new Map();
    let liveUrls = 0, deadUrls = 0, totalUrlsChecked = 0;

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        totalRecords++;

        const sourceRefs = record.sourceRefs || [];
        if (sourceRefs.length === 0) continue;

        recordsWithSources++;
        totalSourceRefs += sourceRefs.length;

        // Check unique URLs only
        const newUrls = sourceRefs.filter(ref =>
          typeof ref === 'string' && /^https?:\/\//i.test(ref) && !checkedUrls.has(ref)
        );

        for (const url of newUrls) {
          checkedUrls.set(url, true);
          totalUrlsChecked++;
          try {
            const response = await fetch(url, {
              method: 'HEAD',
              redirect: 'follow',
              signal: AbortSignal.timeout(8000)
            });
            if (response.ok) liveUrls++;
            else if (response.status === 404) deadUrls++;
          } catch (e) {
            deadUrls++;
          }
        }
      } catch (e) { /* skip */ }
    }

    return jsonResponse({
      success: true,
      totalRecords: totalRecords,
      recordsWithSources: recordsWithSources,
      totalSourceRefs: totalSourceRefs,
      uniqueUrlsChecked: totalUrlsChecked,
      liveUrls: liveUrls,
      deadUrls: deadUrls,
      sourceHealthScore: totalUrlsChecked > 0 ? Math.round((liveUrls / totalUrlsChecked) * 100) : 0,
      checkedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to get verification status',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.17: AI Merge Resolution Handlers ──

/**
 * Compare two records field by field and generate a merge proposal.
 * For each field: shows value from both records, recommends which to keep,
 * and provides a confidence level.
 */
function generateMergeProposal(recordA, recordB) {
  const fields = [
    'name', 'givenNames', 'familyName', 'birthDate', 'deathDate',
    'cemeteryId', 'cemeteryName', 'section', 'plot', 'block',
    'latitude', 'longitude', 'inscription', 'notes',
    'verificationStatus', 'submitterName', 'sourceRefs', 'photoRefs',
    'graveIdentifier', 'birthPlace', 'deathPlace', 'occupation',
    'spouseName', 'parents', 'children'
  ];

  const proposals = [];
  let resolvedCount = 0;
  let conflictCount = 0;
  let identicalCount = 0;

  for (const field of fields) {
    const valA = recordA[field];
    const valB = recordB[field];

    // Both null/undefined — skip
    if (!valA && !valB) continue;

    // Both have value
    if (valA && valB) {
      const strA = JSON.stringify(valA);
      const strB = JSON.stringify(valB);

      if (strA === strB) {
        // Identical — no conflict
        identicalCount++;
        proposals.push({
          field,
          valueA: valA,
          valueB: valB,
          recommendation: 'keep_either',
          recommendedValue: valA,
          confidence: 'high',
          reason: 'Both records have identical values'
        });
      } else {
        // Conflict — need to decide
        conflictCount++;
        let recommendation = 'manual_review';
        let recommendedValue = null;
        let confidence = 'low';
        let reason = 'Values differ — manual review recommended';

        // Heuristic: prefer verified record
        if (recordA.verificationStatus === 'verified' && recordB.verificationStatus !== 'verified') {
          recommendation = 'keep_a';
          recommendedValue = valA;
          confidence = 'high';
          reason = 'Record A is verified, Record B is not';
        } else if (recordB.verificationStatus === 'verified' && recordA.verificationStatus !== 'verified') {
          recommendation = 'keep_b';
          recommendedValue = valB;
          confidence = 'high';
          reason = 'Record B is verified, Record A is not';
        } else {
          // Heuristic: prefer longer/more complete value for text fields
          const lenA = typeof valA === 'string' ? valA.length : JSON.stringify(valA).length;
          const lenB = typeof valB === 'string' ? valB.length : JSON.stringify(valB).length;
          if (field === 'inscription' || field === 'notes' || field === 'sourceRefs' || field === 'photoRefs') {
            if (lenA > lenB * 1.5) {
              recommendation = 'keep_a';
              recommendedValue = valA;
              confidence = 'medium';
              reason = `Record A has more complete ${field} (${lenA} vs ${lenB} chars)`;
            } else if (lenB > lenA * 1.5) {
              recommendation = 'keep_b';
              recommendedValue = valB;
              confidence = 'medium';
              reason = `Record B has more complete ${field} (${lenB} vs ${lenA} chars)`;
            }
          } else if (field === 'name' || field === 'givenNames' || field === 'familyName') {
            // Prefer longer name (more complete)
            if (lenA > lenB) {
              recommendation = 'keep_a';
              recommendedValue = valA;
              confidence = 'medium';
              reason = `Record A has more complete name (${lenA} vs ${lenB} chars)`;
            } else if (lenB > lenA) {
              recommendation = 'keep_b';
              recommendedValue = valB;
              confidence = 'medium';
              reason = `Record B has more complete name (${lenB} vs ${lenA} chars)`;
            }
          } else if (field === 'latitude' || field === 'longitude') {
            // Prefer more precise coordinates
            const precA = valA ? String(valA).split('.').length > 1 ? String(valA).split('.')[1].length : 0 : 0;
            const precB = valB ? String(valB).split('.').length > 1 ? String(valB).split('.')[1].length : 0 : 0;
            if (precA > precB) {
              recommendation = 'keep_a';
              recommendedValue = valA;
              confidence = 'medium';
              reason = `Record A has more precise coordinates (${precA} vs ${precB} decimal places)`;
            } else if (precB > precA) {
              recommendation = 'keep_b';
              recommendedValue = valB;
              confidence = 'medium';
              reason = `Record B has more precise coordinates (${precB} vs ${precA} decimal places)`;
            }
          } else if (Array.isArray(valA) || Array.isArray(valB)) {
            // For arrays, merge unique items
            const arrA = Array.isArray(valA) ? valA : [valA];
            const arrB = Array.isArray(valB) ? valB : [valB];
            const merged = [...new Set([...arrA, ...arrB])];
            recommendation = 'merge_both';
            recommendedValue = merged;
            confidence = 'medium';
            reason = `Merged unique items from both records (${merged.length} total)`;
          }
        }

        proposals.push({
          field,
          valueA: valA,
          valueB: valB,
          recommendation,
          recommendedValue,
          confidence,
          reason
        });
      }
    } else {
      // Only one has a value — keep that one
      resolvedCount++;
      proposals.push({
        field,
        valueA: valA || null,
        valueB: valB || null,
        recommendation: valA ? 'keep_a' : 'keep_b',
        recommendedValue: valA || valB,
        confidence: 'high',
        reason: `Only ${valA ? 'Record A' : 'Record B'} has this field`
      });
    }
  }

  return {
    proposals,
    summary: {
      totalFields: proposals.length,
      identicalFields: identicalCount,
      conflictFields: conflictCount,
      resolvedFields: resolvedCount,
      autoResolvable: proposals.filter(p => p.confidence !== 'low').length,
      needsManualReview: proposals.filter(p => p.confidence === 'low').length
    }
  };
}

/**
 * POST /api/graves/:idA/merge/preview/:idB
 * Generate a merge proposal for two records.
 */
async function handleMergePreview(idA, idB, request, env, cors) {
  const safeIdA = sanitizePathSegment(idA);
  const safeIdB = sanitizePathSegment(idB);

  if (!safeIdA || safeIdA !== idA || !safeIdB || safeIdB !== idB) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured — merge preview unavailable'
    }, 200, cors);
  }

  try {
    // Load both records
    let recordA = null, recordB = null;

    try {
      const contentA = await readFile(`graves/${safeIdA}.json`, env);
      if (contentA) recordA = JSON.parse(contentA);
    } catch (e) { /* not found */ }

    try {
      const contentB = await readFile(`graves/${safeIdB}.json`, env);
      if (contentB) recordB = JSON.parse(contentB);
    } catch (e) { /* not found */ }

    if (!recordA || !recordB) {
      return jsonResponse({
        success: false,
        error: 'One or both records not found',
        recordAFound: !!recordA,
        recordBFound: !!recordB
      }, 404, cors);
    }

    const proposal = generateMergeProposal(recordA, recordB);

    // Compute a similarity score
    const allFields = proposal.proposals.length;
    const identical = proposal.summary.identicalFields;
    const similarity = allFields > 0 ? Math.round((identical / allFields) * 100) : 0;

    return jsonResponse({
      success: true,
      recordA: {
        id: safeIdA,
        name: recordA.name || recordA.graveIdentifier || 'Unknown',
        verificationStatus: recordA.verificationStatus || 'unverified',
        cemeteryId: recordA.cemeteryId || null
      },
      recordB: {
        id: safeIdB,
        name: recordB.name || recordB.graveIdentifier || 'Unknown',
        verificationStatus: recordB.verificationStatus || 'unverified',
        cemeteryId: recordB.cemeteryId || null
      },
      similarityScore: similarity,
      proposal: proposal.proposals,
      summary: proposal.summary,
      recommendedAction: proposal.summary.needsManualReview === 0
        ? 'safe_to_merge'
        : proposal.summary.needsManualReview <= 2
        ? 'merge_with_caution'
        : 'manual_review_required'
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate merge preview',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/graves/:idA/merge/apply/:idB
 * Apply a merge: combine record B into record A, mark B as merged.
 * Body: { fieldOverrides: { fieldName: value } }
 */
async function handleMergeApply(idA, idB, request, env, cors) {
  const safeIdA = sanitizePathSegment(idA);
  const safeIdB = sanitizePathSegment(idB);

  if (!safeIdA || safeIdA !== idA || !safeIdB || safeIdB !== idB) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: false,
      error: 'GitHub not configured — merge unavailable'
    }, 503, cors);
  }

  try {
    let recordA = null, recordB = null;

    try {
      const contentA = await readFile(`graves/${safeIdA}.json`, env);
      if (contentA) recordA = JSON.parse(contentA);
    } catch (e) { /* not found */ }

    try {
      const contentB = await readFile(`graves/${safeIdB}.json`, env);
      if (contentB) recordB = JSON.parse(contentB);
    } catch (e) { /* not found */ }

    if (!recordA || !recordB) {
      return jsonResponse({
        success: false,
        error: 'One or both records not found'
      }, 404, cors);
    }

    // Generate proposal
    const proposal = generateMergeProposal(recordA, recordB);

    // Apply proposed values, with optional overrides
    const body = await request.json().catch(() => ({}));
    const overrides = (body && body.fieldOverrides) || {};

    const mergedRecord = { ...recordA };
    const appliedFields = [];
    const skippedFields = [];

    for (const p of proposal.proposals) {
      // Check for override
      if (overrides[p.field] !== undefined) {
        mergedRecord[p.field] = overrides[p.field];
        appliedFields.push({
          field: p.field,
          source: 'override',
          value: overrides[p.field]
        });
        continue;
      }

      // Auto-apply high and medium confidence
      if (p.confidence === 'high' || p.confidence === 'medium') {
        mergedRecord[p.field] = p.recommendedValue;
        appliedFields.push({
          field: p.field,
          source: p.recommendation,
          value: p.recommendedValue,
          confidence: p.confidence
        });
      } else {
        // Low confidence — skip unless overridden
        skippedFields.push({
          field: p.field,
          reason: 'Low confidence — requires manual override'
        });
      }
    }

    // Add merge provenance
    mergedRecord.mergeHistory = mergedRecord.mergeHistory || [];
    mergedRecord.mergeHistory.push({
      mergedFromId: safeIdB,
      mergedFromName: recordB.name || recordB.graveIdentifier || 'Unknown',
      mergedAt: new Date().toISOString(),
      mergedBy: body.mergedBy || 'system',
      fieldsApplied: appliedFields.length,
      fieldsSkipped: skippedFields.length,
      similarityScore: proposal.summary.identicalFields > 0
        ? Math.round((proposal.summary.identicalFields / proposal.proposals.length) * 100)
        : 0
    });

    // Update record A with merged data
    mergedRecord.updatedDate = new Date().toISOString();
    await writeFile(`graves/${safeIdA}.json`, JSON.stringify(mergedRecord, null, 2), env);

    // Mark record B as merged (keep it for provenance, but change status)
    recordB.status = 'merged';
    recordB.mergedIntoId = safeIdA;
    recordB.mergedAt = new Date().toISOString();
    recordB.updatedDate = new Date().toISOString();
    await writeFile(`graves/${safeIdB}.json`, JSON.stringify(recordB, null, 2), env);

    return jsonResponse({
      success: true,
      mergedRecordId: safeIdA,
      mergedFromId: safeIdB,
      appliedFields: appliedFields,
      skippedFields: skippedFields,
      totalApplied: appliedFields.length,
      totalSkipped: skippedFields.length,
      mergeHistory: mergedRecord.mergeHistory[mergedRecord.mergeHistory.length - 1]
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to apply merge',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/cemeteries/:id/merge/suggestions
 * Find potential duplicate pairs within a cemetery and suggest merges.
 */
async function handleMergeSuggestions(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      suggestions: [],
      message: 'GitHub not configured'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const records = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status === 'merged') continue;
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        records.push(record);
      } catch (e) { /* skip */ }
    }

    if (records.length < 2) {
      return jsonResponse({
        success: true,
        suggestions: [],
        totalRecords: records.length,
        message: 'Not enough records to suggest merges'
      }, 200, cors);
    }

    // Find potential duplicates
    const suggestions = [];
    const seen = new Set();

    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        const a = records[i];
        const b = records[j];
        const pairKey = [a.id, b.id].sort().join('|');
        if (seen.has(pairKey)) continue;

        let matchScore = 0;
        let matchReasons = [];

        // Name match
        const nameA = (a.name || a.graveIdentifier || '').toLowerCase().trim();
        const nameB = (b.name || b.graveIdentifier || '').toLowerCase().trim();
        if (nameA && nameB && nameA === nameB) {
          matchScore += 50;
          matchReasons.push('exact_name_match');
        } else if (nameA && nameB && (nameA.includes(nameB) || nameB.includes(nameA))) {
          matchScore += 30;
          matchReasons.push('partial_name_match');
        }

        // Death date match
        if (a.deathDate && b.deathDate && a.deathDate === b.deathDate) {
          matchScore += 30;
          matchReasons.push('death_date_match');
        }

        // Birth date match
        if (a.birthDate && b.birthDate && a.birthDate === b.birthDate) {
          matchScore += 20;
          matchReasons.push('birth_date_match');
        }

        // Plot match
        if (a.plot && b.plot && a.plot === b.plot && a.section === b.section) {
          matchScore += 15;
          matchReasons.push('same_plot');
        }

        if (matchScore >= 50) {
          seen.add(pairKey);
          suggestions.push({
            recordA: {
              id: a.id,
              name: a.name || a.graveIdentifier || 'Unknown',
              deathDate: a.deathDate || null,
              verificationStatus: a.verificationStatus || 'unverified'
            },
            recordB: {
              id: b.id,
              name: b.name || b.graveIdentifier || 'Unknown',
              deathDate: b.deathDate || null,
              verificationStatus: b.verificationStatus || 'unverified'
            },
            matchScore: matchScore,
            matchReasons: matchReasons,
            recommendedAction: matchScore >= 80 ? 'high_confidence_merge' :
              matchScore >= 60 ? 'likely_duplicate' : 'possible_duplicate'
          });
        }
      }
    }

    suggestions.sort((a, b) => b.matchScore - a.matchScore);

    return jsonResponse({
      success: true,
      suggestions: suggestions.slice(0, 50),
      totalSuggestions: suggestions.length,
      totalRecords: records.length,
      checkedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate merge suggestions',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/merge/history
 * Returns merge history across all records.
 */
async function handleMergeHistory(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      history: [],
      message: 'GitHub not configured'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const history = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.mergeHistory && record.mergeHistory.length > 0) {
          for (const entry of record.mergeHistory) {
            history.push({
              ...entry,
              targetRecordId: record.id,
              targetRecordName: record.name || record.graveIdentifier || 'Unknown'
            });
          }
        }
      } catch (e) { /* skip */ }
    }

    history.sort((a, b) => new Date(b.mergedAt || 0) - new Date(a.mergedAt || 0));

    return jsonResponse({
      success: true,
      history: history.slice(0, 100),
      totalMerges: history.length
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to fetch merge history',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.16: AI Watchlist & Monitoring Handlers ──

/**
 * GET /api/watchlist
 * Returns all watchlist items.
 */
async function handleGetWatchlist(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      items: [],
      message: 'GitHub not configured — watchlist unavailable'
    }, 200, cors);
  }

  try {
    const files = await listFiles('watchlist', env);
    const items = [];

    for (const file of files) {
      try {
        const content = await readFile(`watchlist/${file}`, env);
        if (!content) continue;
        items.push(JSON.parse(content));
      } catch (e) { /* skip */ }
    }

    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return jsonResponse({
      success: true,
      items: items,
      totalItems: items.length
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to fetch watchlist',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/watchlist
 * Add a cemetery or record to the watchlist.
 * Body: { targetType: 'cemetery'|'record', targetId: string,
 *         watchFor: string[], label: string }
 */
async function handleAddToWatchlist(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: false,
      error: 'GitHub not configured — watchlist unavailable'
    }, 503, cors);
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (!body || !body.targetType || !body.targetId) {
      return jsonResponse({
        success: false,
        error: 'Missing required fields: targetType, targetId'
      }, 400, cors);
    }

    const targetType = body.targetType;
    const targetId = sanitizePathSegment(body.targetId);
    if (!targetId || targetId !== body.targetId) {
      return jsonResponse({ success: false, error: 'Invalid target ID' }, 400, cors);
    }

    if (targetType !== 'cemetery' && targetType !== 'record') {
      return jsonResponse({
        success: false,
        error: 'targetType must be "cemetery" or "record"'
      }, 400, cors);
    }

    const watchFor = Array.isArray(body.watchFor)
      ? body.watchFor
      : ['health_degradation', 'new_anomalies', 'unapplied_fixes'];

    const validWatchTypes = ['health_degradation', 'new_anomalies', 'unapplied_fixes', 'duplicate_detected', 'missing_data'];
    const filteredWatch = watchFor.filter(w => validWatchTypes.includes(w));

    const itemId = `watch_${targetType}_${targetId}_${Date.now()}`;
    const item = {
      id: itemId,
      targetType: targetType,
      targetId: targetId,
      label: body.label || targetId,
      watchFor: filteredWatch,
      createdAt: new Date().toISOString(),
      lastChecked: null,
      lastStatus: null,
      active: true
    };

    await writeFile(`watchlist/${itemId}.json`, JSON.stringify(item, null, 2), env);

    return jsonResponse({
      success: true,
      item: item
    }, 201, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to add to watchlist',
      message: error.message
    }, 500, cors);
  }
}

/**
 * DELETE /api/watchlist/:itemId
 * Remove an item from the watchlist.
 */
async function handleRemoveFromWatchlist(itemId, request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: false,
      error: 'GitHub not configured — watchlist unavailable'
    }, 503, cors);
  }

  const safeId = sanitizePathSegment(itemId);
  if (!safeId || safeId !== itemId) {
    return jsonResponse({ success: false, error: 'Invalid item ID' }, 400, cors);
  }

  try {
    await deleteFile(`watchlist/${safeId}.json`, env);
    return jsonResponse({ success: true, message: 'Watchlist item removed' }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to remove watchlist item',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/watchlist/check
 * Check all watchlist items for changes and return alerts.
 * For each item: computes current health/anomalies, compares with last check,
 * generates alerts if conditions are met.
 */
async function handleWatchlistCheck(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      alerts: [],
      message: 'GitHub not configured — watchlist unavailable'
    }, 200, cors);
  }

  try {
    // Load watchlist items
    const wlFiles = await listFiles('watchlist', env);
    const watchlistItems = [];

    for (const file of wlFiles) {
      try {
        const content = await readFile(`watchlist/${file}`, env);
        if (!content) continue;
        const item = JSON.parse(content);
        if (item.active !== false) watchlistItems.push(item);
      } catch (e) { /* skip */ }
    }

    if (watchlistItems.length === 0) {
      return jsonResponse({
        success: true,
        alerts: [],
        checkedItems: 0,
        message: 'No active watchlist items'
      }, 200, cors);
    }

    // Load all grave records (cache by cemetery for efficiency)
    const graveFiles = await listFiles('graves', env);
    const allRecords = [];
    const recordsByCemetery = {};

    for (const file of graveFiles) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        allRecords.push(record);
        const cemId = record.cemeteryId || 'unknown';
        if (!recordsByCemetery[cemId]) recordsByCemetery[cemId] = [];
        recordsByCemetery[cemId].push(record);
      } catch (e) { /* skip */ }
    }

    const alerts = [];
    let checkedCount = 0;

    for (const item of watchlistItems) {
      checkedCount++;
      let records = [];

      if (item.targetType === 'cemetery') {
        records = recordsByCemetery[item.targetId] || [];
      } else if (item.targetType === 'record') {
        const rec = allRecords.find(r => r.id === item.targetId);
        if (rec) records = [rec];
      }

      if (records.length === 0) continue;

      // Compute current health
      const currentHealth = computeQuickHealth(records);
      const currentAnomalies = computeCemeteryAnomalies(records);

      // Compare with previous state
      const previousStatus = item.lastStatus;
      const watchFor = item.watchFor || [];

      // Health degradation alert
      if (watchFor.includes('health_degradation') && previousStatus) {
        const scoreDrop = (previousStatus.healthScore || 0) - currentHealth.overallScore;
        if (scoreDrop >= 5) {
          alerts.push({
            watchlistItemId: item.id,
            targetType: item.targetType,
            targetId: item.targetId,
            label: item.label,
            alertType: 'health_degradation',
            severity: scoreDrop >= 15 ? 'critical' : scoreDrop >= 10 ? 'high' : 'medium',
            message: `Health score dropped by ${scoreDrop} points (from ${previousStatus.healthScore || 0} to ${currentHealth.overallScore})`,
            currentValue: currentHealth.overallScore,
            previousValue: previousStatus.healthScore || 0,
            detectedAt: new Date().toISOString()
          });
        }
      }

      // New anomalies alert
      if (watchFor.includes('new_anomalies') && previousStatus) {
        const prevAnomalies = previousStatus.anomalyCount || 0;
        const currentAnomalyTotal = currentAnomalies.total;
        if (currentAnomalyTotal > prevAnomalies) {
          const newCount = currentAnomalyTotal - prevAnomalies;
          alerts.push({
            watchlistItemId: item.id,
            targetType: item.targetType,
            targetId: item.targetId,
            label: item.label,
            alertType: 'new_anomalies',
            severity: currentAnomalies.critical > (previousStatus.criticalAnomalies || 0) ? 'critical' : 'medium',
            message: `${newCount} new anomaly(ies) detected (total: ${currentAnomalyTotal})`,
            currentValue: currentAnomalyTotal,
            previousValue: prevAnomalies,
            detectedAt: new Date().toISOString()
          });
        }
      }

      // Unapplied fixes alert
      if (watchFor.includes('unapplied_fixes')) {
        let totalFixes = 0;
        for (const rec of records) {
          const fixes = generateAutoFixes(rec);
          totalFixes += fixes.filter(f => f.confidence === 'high').length;
        }
        if (totalFixes > 0) {
          alerts.push({
            watchlistItemId: item.id,
            targetType: item.targetType,
            targetId: item.targetId,
            label: item.label,
            alertType: 'unapplied_fixes',
            severity: 'low',
            message: `${totalFixes} high-confidence fix(es) available but not applied`,
            currentValue: totalFixes,
            previousValue: null,
            detectedAt: new Date().toISOString()
          });
        }
      }

      // Duplicate detected alert
      if (watchFor.includes('duplicate_detected')) {
        const nameDateMap = {};
        let dupCount = 0;
        for (const rec of records) {
          if (rec.name && rec.deathDate) {
            const key = (rec.name || '').toLowerCase().trim() + '|' + rec.deathDate;
            if (nameDateMap[key]) dupCount++;
            else nameDateMap[key] = true;
          }
        }
        if (dupCount > 0) {
          alerts.push({
            watchlistItemId: item.id,
            targetType: item.targetType,
            targetId: item.targetId,
            label: item.label,
            alertType: 'duplicate_detected',
            severity: 'medium',
            message: `${dupCount} potential duplicate(s) detected`,
            currentValue: dupCount,
            previousValue: null,
            detectedAt: new Date().toISOString()
          });
        }
      }

      // Missing data alert
      if (watchFor.includes('missing_data')) {
        const missingSources = records.filter(r => !r.sourceRefs || r.sourceRefs.length === 0).length;
        const missingPhotos = records.filter(r => !r.photoRefs || r.photoRefs.length === 0).length;
        const missingRate = records.length > 0 ? (missingSources + missingPhotos) / (records.length * 2) : 0;
        if (missingRate > 0.5) {
          alerts.push({
            watchlistItemId: item.id,
            targetType: item.targetType,
            targetId: item.targetId,
            label: item.label,
            alertType: 'missing_data',
            severity: missingRate > 0.8 ? 'high' : 'medium',
            message: `${Math.round(missingRate * 100)}% of expected data fields are missing`,
            currentValue: Math.round(missingRate * 100),
            previousValue: null,
            detectedAt: new Date().toISOString()
          });
        }
      }

      // Update watchlist item with current status
      item.lastChecked = new Date().toISOString();
      item.lastStatus = {
        healthScore: currentHealth.overallScore,
        healthGrade: currentHealth.grade,
        anomalyCount: currentAnomalies.total,
        criticalAnomalies: currentAnomalies.critical,
        recordCount: records.length
      };

      try {
        await writeFile(`watchlist/${item.id}.json`, JSON.stringify(item, null, 2), env);
      } catch (e) { /* continue even if write fails */ }
    }

    return jsonResponse({
      success: true,
      alerts: alerts,
      checkedItems: checkedCount,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      highAlerts: alerts.filter(a => a.severity === 'high').length,
      checkedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to check watchlist',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/watchlist/status
 * Returns a summary of watchlist status without detailed alerts.
 */
async function handleWatchlistStatus(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured — watchlist unavailable'
    }, 200, cors);
  }

  try {
    const files = await listFiles('watchlist', env);
    let activeItems = 0;
    let itemsWithAlerts = 0;
    let lastCheckedAt = null;
    let totalAlerts = 0;

    for (const file of files) {
      try {
        const content = await readFile(`watchlist/${file}`, env);
        if (!content) continue;
        const item = JSON.parse(content);
        if (item.active !== false) activeItems++;
        if (item.lastChecked) {
          const checkedDate = new Date(item.lastChecked);
          if (!lastCheckedAt || checkedDate > new Date(lastCheckedAt)) {
            lastCheckedAt = item.lastChecked;
          }
        }
      } catch (e) { /* skip */ }
    }

    return jsonResponse({
      success: true,
      activeItems: activeItems,
      totalItems: activeItems,
      lastCheckedAt: lastCheckedAt,
      needsCheck: lastCheckedAt
        ? (Date.now() - new Date(lastCheckedAt).getTime()) > 24 * 60 * 60 * 1000
        : true
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to get watchlist status',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.15: AI Export & Reporting Handlers ──

/**
 * GET /api/cemeteries/:id/report
 * Generates a comprehensive quality report for a cemetery.
 * Aggregates: metadata, health score, anomaly summary, recommendations,
 * cleanup history, record statistics, and content coverage.
 */
async function handleCemeteryReport(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      message: 'GitHub not configured — no report available'
    }, 200, cors);
  }

  try {
    // Load cemetery metadata
    let cemeteryName = 'Unknown Cemetery';
    let cemeteryMetadata = {};
    try {
      const cContent = await readFile(`cemeteries/${safeId}.json`, env);
      if (cContent) {
        cemeteryMetadata = JSON.parse(cContent);
        cemeteryName = cemeteryMetadata.name || cemeteryMetadata.title || 'Unknown Cemetery';
      }
    } catch (e) { /* cemetery file may not exist */ }

    // Load all records for this cemetery
    const files = await listFiles('graves', env);
    const records = [];
    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        records.push(record);
      } catch (e) { /* skip */ }
    }

    if (records.length === 0) {
      return jsonResponse({
        success: true,
        cemeteryId: safeId,
        message: 'No published records found'
      }, 200, cors);
    }

    // Compute health
    const health = computeQuickHealth(records);

    // Compute statistics
    const stats = computeCemeteryStats(records);

    // Generate anomaly summary
    let anomalySummary = { critical: 0, warning: 0, info: 0, total: 0, byType: {} };
    try {
      const anomalies = await computeCemeteryAnomalies(records);
      anomalySummary = anomalies;
    } catch (e) { /* anomaly computation may fail */ }

    // Generate recommendations summary
    let recommendationsSummary = { total: 0, critical: 0, high: 0, medium: 0, low: 0, topItems: [] };
    try {
      const recs = generateRecommendations(records, stats, anomalySummary);
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      recs.sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99));
      recommendationsSummary.total = recs.length;
      recommendationsSummary.critical = recs.filter(r => r.priority === 'critical').length;
      recommendationsSummary.high = recs.filter(r => r.priority === 'high').length;
      recommendationsSummary.medium = recs.filter(r => r.priority === 'medium').length;
      recommendationsSummary.low = recs.filter(r => r.priority === 'low').length;
      recommendationsSummary.topItems = recs.slice(0, 10).map(r => ({
        category: r.category,
        priority: r.priority,
        title: r.title,
        affectedRecords: r.affectedRecords
      }));
    } catch (e) { /* recommendation generation may fail */ }

    // Compute cleanup preview (before/after)
    let cleanupPreview = null;
    try {
      let totalProposed = 0, safeFixes = 0, riskyFixes = 0;
      const simulatedRecords = records.map(rec => {
        const fixes = generateAutoFixes(rec);
        for (const fix of fixes) {
          totalProposed++;
          if (fix.confidence === 'high') safeFixes++;
          else riskyFixes++;
        }
        const simulated = { ...rec };
        for (const fix of fixes) {
          if (fix.confidence === 'high') simulated[fix.field] = fix.proposedValue;
        }
        return simulated;
      });
      const afterHealth = computeQuickHealth(simulatedRecords);
      cleanupPreview = {
        currentGrade: health.grade,
        currentScore: health.overallScore,
        projectedGrade: afterHealth.grade,
        projectedScore: afterHealth.overallScore,
        scoreDelta: afterHealth.overallScore - health.overallScore,
        totalProposedFixes: totalProposed,
        safeFixes: safeFixes,
        riskyFixes: riskyFixes
      };
    } catch (e) { /* cleanup preview may fail */ }

    // Content coverage breakdown
    const contentCoverage = {
      withPhotos: records.filter(r => r.photoRefs && r.photoRefs.length > 0).length,
      withInscriptions: records.filter(r => r.inscription && r.inscription.trim()).length,
      withSources: records.filter(r => r.sourceRefs && r.sourceRefs.length > 0).length,
      withCoordinates: records.filter(r => r.latitude && r.longitude).length,
      withSection: records.filter(r => r.section).length,
      withPlot: records.filter(r => r.plot).length,
      withBirthDate: records.filter(r => r.birthDate).length,
      withDeathDate: records.filter(r => r.deathDate).length,
      withGivenNames: records.filter(r => r.givenNames).length,
      withFamilyName: records.filter(r => r.familyName).length
    };

    // Date range
    const deathYears = records
      .map(r => r.deathDate ? parseInt(String(r.deathDate).substring(0, 4)) : null)
      .filter(y => y !== null && !isNaN(y));
    const dateRange = deathYears.length > 0 ? {
      earliest: Math.min(...deathYears),
      latest: Math.max(...deathYears)
    } : null;

    // Build report
    const report = {
      reportId: `report_${safeId}_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      cemeteryId: safeId,
      cemeteryName: cemeteryName,
      cemeteryMetadata: {
        country: cemeteryMetadata.country || null,
        region: cemeteryMetadata.region || null,
        city: cemeteryMetadata.city || null,
        establishedDate: cemeteryMetadata.establishedDate || null
      },
      recordCount: records.length,
      health: health,
      contentCoverage: contentCoverage,
      dateRange: dateRange,
      statistics: stats,
      anomalySummary: anomalySummary,
      recommendations: recommendationsSummary,
      cleanupPreview: cleanupPreview,
      // Report metadata for citation/export
      reportMetadata: {
        version: '1.0',
        schema: 'GraveAtlas Quality Report',
        generator: 'GraveAtlas AI Intelligence Engine',
        license: 'CC-BY-SA 4.0'
      }
    };

    return jsonResponse({
      success: true,
      report: report
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate cemetery report',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/cemeteries/:id/report/summary
 * Lightweight summary — just health grade, record count, and top recommendations.
 */
async function handleCemeteryReportSummary(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      message: 'GitHub not configured — no report available'
    }, 200, cors);
  }

  try {
    let cemeteryName = 'Unknown Cemetery';
    try {
      const cContent = await readFile(`cemeteries/${safeId}.json`, env);
      if (cContent) {
        const c = JSON.parse(cContent);
        cemeteryName = c.name || c.title || 'Unknown Cemetery';
      }
    } catch (e) { /* skip */ }

    const files = await listFiles('graves', env);
    const records = [];
    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        records.push(record);
      } catch (e) { /* skip */ }
    }

    if (records.length === 0) {
      return jsonResponse({
        success: true,
        cemeteryId: safeId,
        message: 'No published records found'
      }, 200, cors);
    }

    const health = computeQuickHealth(records);
    const stats = computeCemeteryStats(records);

    // Quick anomaly count
    let criticalCount = 0, warningCount = 0;
    for (const rec of records) {
      if (rec.birthDate && rec.deathDate) {
        const by = parseInt(String(rec.birthDate).substring(0, 4));
        const dy = parseInt(String(rec.deathDate).substring(0, 4));
        if (!isNaN(by) && !isNaN(dy) && by > dy) criticalCount++;
      }
      if (!rec.name && !rec.graveIdentifier) criticalCount++;
    }

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      cemeteryName: cemeteryName,
      recordCount: records.length,
      healthGrade: health.grade,
      healthScore: health.overallScore,
      completeness: health.completeness,
      contentCoverage: health.contentCoverage,
      anomalies: { critical: criticalCount, warning: warningCount },
      duplicates: health.duplicates,
      photoCoverage: health.content ? health.content.photoCoverage : 0,
      sourceCoverage: health.content ? health.content.sourceCoverage : 0,
      inscriptionCoverage: health.content ? health.content.inscriptionCoverage : 0,
      generatedAt: new Date().toISOString()
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate report summary',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/reports/global
 * Global quality report across all cemeteries.
 */
async function handleGlobalReport(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured — no report available'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const records = [];
    const cemeteryIds = new Set();

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        records.push(record);
        if (record.cemeteryId) cemeteryIds.add(record.cemeteryId);
      } catch (e) { /* skip */ }
    }

    if (records.length === 0) {
      return jsonResponse({
        success: true,
        message: 'No published records found'
      }, 200, cors);
    }

    const health = computeQuickHealth(records);

    // Per-cemetery breakdown
    const cemeteryBreakdown = {};
    for (const rec of records) {
      const cemId = rec.cemeteryId || 'unknown';
      if (!cemeteryBreakdown[cemId]) {
        cemeteryBreakdown[cemId] = {
          cemeteryId: cemId,
          recordCount: 0,
          withPhotos: 0,
          withSources: 0,
          withInscriptions: 0,
          criticalAnomalies: 0
        };
      }
      const entry = cemeteryBreakdown[cemId];
      entry.recordCount++;
      if (rec.photoRefs && rec.photoRefs.length > 0) entry.withPhotos++;
      if (rec.sourceRefs && rec.sourceRefs.length > 0) entry.withSources++;
      if (rec.inscription && rec.inscription.trim()) entry.withInscriptions++;
      if (rec.birthDate && rec.deathDate) {
        const by = parseInt(String(rec.birthDate).substring(0, 4));
        const dy = parseInt(String(rec.deathDate).substring(0, 4));
        if (!isNaN(by) && !isNaN(dy) && by > dy) entry.criticalAnomalies++;
      }
    }

    // Sort by record count descending
    const sortedBreakdown = Object.values(cemeteryBreakdown)
      .sort((a, b) => b.recordCount - a.recordCount);

    // Global content coverage
    const globalContent = {
      totalWithPhotos: records.filter(r => r.photoRefs && r.photoRefs.length > 0).length,
      totalWithSources: records.filter(r => r.sourceRefs && r.sourceRefs.length > 0).length,
      totalWithInscriptions: records.filter(r => r.inscription && r.inscription.trim()).length,
      totalWithCoordinates: records.filter(r => r.latitude && r.longitude).length,
      totalWithBirthDate: records.filter(r => r.birthDate).length,
      totalWithDeathDate: records.filter(r => r.deathDate).length
    };

    const report = {
      reportId: `report_global_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      totalCemeteries: cemeteryIds.size,
      totalRecords: records.length,
      globalHealth: health,
      globalContentCoverage: globalContent,
      cemeteryBreakdown: sortedBreakdown,
      reportMetadata: {
        version: '1.0',
        schema: 'GraveAtlas Global Quality Report',
        generator: 'GraveAtlas AI Intelligence Engine',
        license: 'CC-BY-SA 4.0'
      }
    };

    return jsonResponse({
      success: true,
      report: report
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate global report',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.14: AI Batch Operations Handlers ──

/**
 * Computes a quick health score for a set of records.
 * Reuses the same scoring logic as Phase 16.11 but works on an in-memory array.
 */
function computeQuickHealth(records) {
  const recordCount = records.length;
  if (recordCount === 0) return { grade: 'N/A', overallScore: 0 };

  const essentialFields = ['name', 'birthDate', 'deathDate', 'cemeteryId'];
  const optionalFields = ['photoRefs', 'inscription', 'sourceRefs', 'latitude', 'longitude', 'section', 'plot'];
  let totalCompleteness = 0, totalCoverage = 0;
  let criticalCount = 0, warningCount = 0, infoCount = 0;
  let withPhotos = 0, withInscriptions = 0, withSources = 0, withCoords = 0;
  let duplicateCount = 0;
  const nameDateMap = {};
  const currentYear = new Date().getFullYear();

  for (const rec of records) {
    let completeness = 0;
    for (const field of essentialFields) {
      if (rec[field] !== undefined && rec[field] !== null && rec[field] !== '') completeness += 25;
    }
    totalCompleteness += completeness;

    let coverage = 0;
    for (const field of optionalFields) {
      if (rec[field] !== undefined && rec[field] !== null && rec[field] !== '') {
        if (Array.isArray(rec[field]) ? rec[field].length > 0 : true) coverage += 100 / optionalFields.length;
      }
    }
    totalCoverage += coverage;

    // Quick anomaly count
    if (rec.birthDate && rec.deathDate) {
      const by = parseInt(String(rec.birthDate).substring(0, 4));
      const dy = parseInt(String(rec.deathDate).substring(0, 4));
      if (!isNaN(by) && !isNaN(dy)) {
        if (by > dy) criticalCount++;
        if (dy - by > 120) warningCount++;
      }
    }
    if (rec.birthDate) {
      const by = parseInt(String(rec.birthDate).substring(0, 4));
      if (!isNaN(by) && by > currentYear) criticalCount++;
    }
    if (!rec.name && !rec.graveIdentifier) criticalCount++;

    // Content coverage
    if (rec.photoRefs && rec.photoRefs.length > 0) withPhotos++;
    if (rec.inscription && rec.inscription.trim()) withInscriptions++;
    if (rec.sourceRefs && rec.sourceRefs.length > 0) withSources++;
    if (rec.latitude && rec.longitude) withCoords++;

    // Duplicates
    if (rec.name && rec.deathDate) {
      const key = (rec.name || '').toLowerCase().trim() + '|' + rec.deathDate;
      if (nameDateMap[key]) duplicateCount++;
      else nameDateMap[key] = true;
    }
  }

  const avgCompleteness = Math.round(totalCompleteness / recordCount);
  const avgCoverage = Math.round(totalCoverage / recordCount);
  const dataQualityScore = Math.round(avgCompleteness * 0.5 + avgCoverage * 0.5);
  const totalAnomalies = criticalCount + warningCount + infoCount;
  const anomalyRate = Math.round((totalAnomalies / recordCount) * 100);
  const anomalyScore = Math.max(0, 100 - anomalyRate);
  const photoCoverage = Math.round((withPhotos / recordCount) * 100);
  const inscriptionCoverage = Math.round((withInscriptions / recordCount) * 100);
  const sourceCoverage = Math.round((withSources / recordCount) * 100);
  const coordinateCoverage = Math.round((withCoords / recordCount) * 100);
  const contentAvg = Math.round((photoCoverage + inscriptionCoverage + sourceCoverage + coordinateCoverage) / 4);
  const duplicateRate = Math.round((duplicateCount / recordCount) * 100);
  const duplicateScore = Math.max(0, 100 - duplicateRate * 5);

  const overallScore = Math.round(
    dataQualityScore * 0.30 + anomalyScore * 0.25 +
    contentAvg * 0.15 + duplicateScore * 0.15 + contentAvg * 0.15
  );

  let grade;
  if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 80) grade = 'B';
  else if (overallScore >= 70) grade = 'C';
  else if (overallScore >= 60) grade = 'D';
  else grade = 'F';

  return {
    grade,
    overallScore,
    dataQuality: dataQualityScore,
    anomalyFree: anomalyScore,
    contentCoverage: contentAvg,
    duplicateFree: duplicateScore,
    anomalies: { critical: criticalCount, warning: warningCount, total: totalAnomalies },
    content: { photoCoverage, inscriptionCoverage, sourceCoverage, coordinateCoverage },
    duplicates: { count: duplicateCount, rate: duplicateRate },
    completeness: avgCompleteness,
    coverage: avgCoverage
  };
}

/**
 * GET /api/cemeteries/:id/cleanup/preview
 * Simulates a full cleanup pass without applying any changes.
 * Returns before-health, proposed fixes, and estimated after-health.
 */
async function handleCemeteryCleanupPreview(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      message: 'GitHub not configured — no cleanup preview available'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const records = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        records.push(record);
      } catch (e) { /* skip */ }
    }

    if (records.length === 0) {
      return jsonResponse({
        success: true,
        cemeteryId: safeId,
        message: 'No published records found'
      }, 200, cors);
    }

    // Compute before-health
    const beforeHealth = computeQuickHealth(records);

    // Generate simulated fixes
    let totalProposed = 0;
    let safeProposed = 0;
    let riskyProposed = 0;
    const fixTypeCounts = {};
    const simulatedRecords = records.map(rec => {
      const fixes = generateAutoFixes(rec);
      for (const fix of fixes) {
        totalProposed++;
        fixTypeCounts[fix.action] = (fixTypeCounts[fix.action] || 0) + 1;
        if (fix.confidence === 'high') safeProposed++;
        else riskyProposed++;
      }

      // Simulate applying safe fixes
      const simulated = { ...rec };
      for (const fix of fixes) {
        if (fix.confidence === 'high') {
          simulated[fix.field] = fix.proposedValue;
        }
      }
      return simulated;
    });

    // Compute estimated after-health
    const afterHealth = computeQuickHealth(simulatedRecords);

    // Compute improvement
    const scoreDelta = afterHealth.overallScore - beforeHealth.overallScore;
    const gradeDelta = afterHealth.grade !== beforeHealth.grade
      ? `${beforeHealth.grade} → ${afterHealth.grade}`
      : null;
    const anomalyDelta = beforeHealth.anomalies.total - afterHealth.anomalies.total;
    const contentDelta = afterHealth.contentCoverage - beforeHealth.contentCoverage;

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      recordCount: records.length,
      before: beforeHealth,
      after: afterHealth,
      improvement: {
        scoreDelta: scoreDelta,
        gradeChange: gradeDelta,
        anomalyReduction: anomalyDelta,
        contentCoverageGain: contentDelta,
        fixesProposed: totalProposed,
        safeFixes: safeProposed,
        riskyFixes: riskyProposed,
        fixTypeCounts: fixTypeCounts
      }
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate cleanup preview',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/cemeteries/:id/cleanup
 * Runs a full cleanup pass: apply auto-fixes → re-score health.
 * Body: { dryRun: boolean, fixTypes: string[] }
 * Returns before/after health comparison and applied fix summary.
 */
async function handleCemeteryCleanup(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      message: 'GitHub not configured — no cleanup available'
    }, 200, cors);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body && body.dryRun === true;
    const allowedTypes = body && Array.isArray(body.fixTypes) ? body.fixTypes : null;

    const files = await listFiles('graves', env);
    const records = [];
    const recordFiles = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        records.push(record);
        recordFiles.push(file);
      } catch (e) { /* skip */ }
    }

    if (records.length === 0) {
      return jsonResponse({
        success: true,
        cemeteryId: safeId,
        message: 'No published records found'
      }, 200, cors);
    }

    // Compute before-health
    const beforeHealth = computeQuickHealth(records);

    // Apply fixes
    let recordsFixed = 0;
    let totalApplied = 0;
    let totalFlagged = 0;
    const fixTypeCounts = {};
    const appliedSummary = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const fixes = generateAutoFixes(record);
      const filteredFixes = allowedTypes
        ? fixes.filter(f => allowedTypes.includes(f.action))
        : fixes;

      const safeFixes = filteredFixes.filter(f => f.confidence === 'high');
      const riskyFixes = filteredFixes.filter(f => f.confidence === 'medium');

      totalApplied += safeFixes.length;
      totalFlagged += riskyFixes.length;

      for (const fix of safeFixes) {
        fixTypeCounts[fix.action] = (fixTypeCounts[fix.action] || 0) + 1;
      }

      if (dryRun) continue;

      if (safeFixes.length > 0) {
        const updatedRecord = { ...record };
        for (const fix of safeFixes) {
          updatedRecord[fix.field] = fix.proposedValue;
        }
        updatedRecord.updated_date = new Date().toISOString();
        await writeFile(`graves/${recordFiles[i]}`, JSON.stringify(updatedRecord, null, 2), env);
        recordsFixed++;

        appliedSummary.push({
          recordId: record.id,
          recordName: record.name || 'Unknown',
          fixesApplied: safeFixes.length,
          flagged: riskyFixes.length
        });
      }
    }

    // Compute after-health
    // For dry run, simulate; for real run, re-read is expensive, so compute from simulated
    const simulatedRecords = records.map(rec => {
      const fixes = generateAutoFixes(rec);
      const filtered = allowedTypes
        ? fixes.filter(f => allowedTypes.includes(f.action))
        : fixes;
      const simulated = { ...rec };
      for (const fix of filtered) {
        if (fix.confidence === 'high') {
          simulated[fix.field] = fix.proposedValue;
        }
      }
      return simulated;
    });

    const afterHealth = computeQuickHealth(simulatedRecords);

    // Compute improvement
    const scoreDelta = afterHealth.overallScore - beforeHealth.overallScore;
    const gradeDelta = afterHealth.grade !== beforeHealth.grade
      ? `${beforeHealth.grade} → ${afterHealth.grade}`
      : null;
    const anomalyReduction = beforeHealth.anomalies.total - afterHealth.anomalies.total;
    const contentGain = afterHealth.contentCoverage - beforeHealth.contentCoverage;

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      dryRun: dryRun,
      recordCount: records.length,
      before: beforeHealth,
      after: afterHealth,
      improvement: {
        scoreDelta: scoreDelta,
        gradeChange: gradeDelta,
        anomalyReduction: anomalyReduction,
        contentCoverageGain: contentGain
      },
      fixes: {
        totalApplied: totalApplied,
        totalFlagged: totalFlagged,
        recordsFixed: dryRun ? 0 : recordsFixed,
        byType: fixTypeCounts
      },
      appliedDetails: dryRun ? undefined : appliedSummary.slice(0, 100)
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to run cleanup',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/cleanup/global
 * Runs cleanup preview across all cemeteries — no changes applied.
 * Returns aggregated before/after stats.
 */
async function handleGlobalCleanup(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      message: 'GitHub not configured — no cleanup available'
    }, 200, cors);
  }

  try {
    // Gather all published records
    const files = await listFiles('graves', env);
    const records = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        records.push(record);
      } catch (e) { /* skip */ }
    }

    if (records.length === 0) {
      return jsonResponse({
        success: true,
        message: 'No published records found'
      }, 200, cors);
    }

    // Compute global before-health
    const beforeHealth = computeQuickHealth(records);

    // Simulate fixes
    let totalProposed = 0;
    let safeProposed = 0;
    let riskyProposed = 0;
    const fixTypeCounts = {};
    const cemeteryStats = {};

    const simulatedRecords = records.map(rec => {
      const fixes = generateAutoFixes(rec);
      for (const fix of fixes) {
        totalProposed++;
        fixTypeCounts[fix.action] = (fixTypeCounts[fix.action] || 0) + 1;
        if (fix.confidence === 'high') safeProposed++;
        else riskyProposed++;
      }

      // Track per-cemetery stats
      const cemId = rec.cemeteryId || 'unknown';
      if (!cemeteryStats[cemId]) {
        cemeteryStats[cemId] = { records: 0, fixes: 0 };
      }
      cemeteryStats[cemId].records++;
      cemeteryStats[cemId].fixes += fixes.length;

      // Simulate safe fixes
      const simulated = { ...rec };
      for (const fix of fixes) {
        if (fix.confidence === 'high') {
          simulated[fix.field] = fix.proposedValue;
        }
      }
      return simulated;
    });

    const afterHealth = computeQuickHealth(simulatedRecords);

    const scoreDelta = afterHealth.overallScore - beforeHealth.overallScore;
    const gradeDelta = afterHealth.grade !== beforeHealth.grade
      ? `${beforeHealth.grade} → ${afterHealth.grade}`
      : null;

    // Top cemeteries by fix count
    const topCemeteries = Object.entries(cemeteryStats)
      .map(([id, stats]) => ({ cemeteryId: id, records: stats.records, proposedFixes: stats.fixes }))
      .sort((a, b) => b.proposedFixes - a.proposedFixes)
      .slice(0, 10);

    return jsonResponse({
      success: true,
      totalRecords: records.length,
      totalCemeteries: Object.keys(cemeteryStats).length,
      before: beforeHealth,
      after: afterHealth,
      improvement: {
        scoreDelta: scoreDelta,
        gradeChange: gradeDelta,
        anomalyReduction: beforeHealth.anomalies.total - afterHealth.anomalies.total,
        contentCoverageGain: afterHealth.contentCoverage - beforeHealth.contentCoverage
      },
      fixes: {
        totalProposed: totalProposed,
        safeFixes: safeProposed,
        riskyFixes: riskyProposed,
        byType: fixTypeCounts
      },
      topCemeteries: topCemeteries
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to run global cleanup',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.13: AI Data Quality Auto-Fix Handlers ──

/**
 * Parse a full name into given names and family name.
 * Handles: "John Smith", "John Michael Smith", "Smith, John",
 *          "Dr. John Smith", "Maria del Carmen Rodriguez"
 */
function parseName(fullName) {
  if (!fullName || typeof fullName !== 'string') return null;
  const name = fullName.trim();
  if (name.length < 2) return null;

  let givenNames = '';
  let familyName = '';

  // Handle "Surname, Given" format
  if (name.includes(',')) {
    const parts = name.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      familyName = parts[0];
      givenNames = parts.slice(1).join(' ');
    }
  } else {
    const parts = name.split(/\s+/);

    // Strip common prefixes
    const prefixes = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Rev.', 'Fr.', 'Sir', 'Lady', 'Capt.', 'Lt.', 'Sgt.'];
    const filteredParts = [];
    let i = 0;
    while (i < parts.length && prefixes.includes(parts[i])) {
      i++; // skip prefix
    }
    const remaining = parts.slice(i);

    if (remaining.length === 1) {
      givenNames = remaining[0];
      familyName = '';
    } else if (remaining.length === 2) {
      givenNames = remaining[0];
      familyName = remaining[1];
    } else {
      // Handle multi-word surnames (del, de, la, van, von, etc.)
      const surnamePrefixes = ['del', 'de', 'la', 'van', 'von', 'di', 'da', 'du', 'le', 'el'];
      if (remaining.length >= 3 && surnamePrefixes.includes(remaining[remaining.length - 2].toLowerCase())) {
        givenNames = remaining.slice(0, -2).join(' ');
        familyName = remaining.slice(-2).join(' ');
      } else {
        givenNames = remaining.slice(0, -1).join(' ');
        familyName = remaining[remaining.length - 1];
      }
    }
  }

  return { givenNames, familyName };
}

/**
 * Estimate birth year from death date and age-at-death in inscription.
 * Looks for patterns like "died 1920 aged 75", "aged 75", "Æ 75", "Æt 75"
 */
function estimateBirthYear(deathDate, inscription) {
  if (!deathDate || !inscription) return null;
  const deathYear = parseInt(String(deathDate).substring(0, 4));
  if (isNaN(deathYear)) return null;

  const insc = inscription.toLowerCase();
  let age = null;

  // Pattern: "aged 75", "age 75", "Æ 75", "aet 75"
  const agePatterns = [
    /(?:aged|age|æ|aet)\s*(\d{1,3})/i,
    /\b(\d{1,3})\s*(?:years|yrs)\b/i,
    /\b(\d{1,3})\s*(?:years old|yrs old)\b/i
  ];

  for (const pattern of agePatterns) {
    const match = insc.match(pattern);
    if (match) {
      age = parseInt(match[1]);
      break;
    }
  }

  if (age === null || age < 0 || age > 120) return null;
  return String(deathYear - age);
}

/**
 * Normalize a date string to ISO format (YYYY-MM-DD or YYYY-MM or YYYY).
 * Handles: "1920", "1920-01", "1920-01-15", "15 Jan 1920", "January 15, 1920"
 */
function normalizeDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  if (/^\d{4}$/.test(s)) return s;

  // "YYYY/MM/DD" or "YYYY.MM.DD"
  const slashMatch = s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
  if (slashMatch) {
    const [, y, m, d] = slashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // "DD Month YYYY" or "DD Mon YYYY"
  const monthMap = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
    'january': '01', 'february': '02', 'march': '03', 'april': '04',
    'june': '06', 'july': '07', 'august': '08', 'september': '09',
    'october': '10', 'november': '11', 'december': '12'
  };

  const longMatch = s.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/i);
  if (longMatch) {
    const [, d, mon, y] = longMatch;
    const m = monthMap[mon.toLowerCase()];
    if (m) return `${y}-${m}-${d.padStart(2, '0')}`;
  }

  // "Month DD, YYYY"
  const monthFirst = s.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (monthFirst) {
    const [, mon, d, y] = monthFirst;
    const m = monthMap[mon.toLowerCase()];
    if (m) return `${y}-${m}-${d.padStart(2, '0')}`;
  }

  // Just a year at the start
  const yearMatch = s.match(/^(\d{4})/);
  if (yearMatch) return yearMatch[1];

  return null;
}

/**
 * Fix name case (ALL CAPS -> Title Case, all lower -> Title Case).
 */
function fixNameCase(name) {
  if (!name || typeof name !== 'string') return null;
  const s = name.trim();
  if (s.length < 2) return null;

  // Check if all uppercase (has letters) and not just initials
  const hasLower = /[a-z]/.test(s);
  const hasUpper = /[A-Z]/.test(s);
  if (!hasLower && hasUpper && s.length > 3) {
    // Convert to title case, preserving common all-caps words
    return s.split(/\s+/).map(word => {
      // Keep initials uppercase (single letters)
      if (word.length === 1) return word;
      // Keep Roman numerals
      if (/^[IVXLCDM]+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  }

  // Check if all lowercase
  if (!hasUpper && hasLower && s.length > 3) {
    return s.split(/\s+/).map(word => {
      if (word.length === 1) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  }

  return null; // Already mixed case, no fix needed
}

/**
 * Generate auto-fix proposals for a single record.
 * Returns an array of proposed changes (diff items).
 */
function generateAutoFixes(record) {
  const fixes = [];

  // 1. Parse name into given/family
  if (record.name && !record.givenNames && !record.familyName) {
    const parsed = parseName(record.name);
    if (parsed && (parsed.givenNames || parsed.familyName)) {
      fixes.push({
        field: 'givenNames',
        action: 'add',
        currentValue: null,
        proposedValue: parsed.givenNames,
        confidence: 'high',
        reason: 'Parsed from full name field'
      });
      fixes.push({
        field: 'familyName',
        action: 'add',
        currentValue: null,
        proposedValue: parsed.familyName,
        confidence: 'high',
        reason: 'Parsed from full name field'
      });
    }
  }

  // 2. Fix name case
  if (record.name) {
    const fixedName = fixNameCase(record.name);
    if (fixedName && fixedName !== record.name) {
      fixes.push({
        field: 'name',
        action: 'normalize',
        currentValue: record.name,
        proposedValue: fixedName,
        confidence: 'high',
        reason: 'Converted from ALL CAPS/lowercase to title case'
      });
    }
  }

  // 3. Normalize dates
  if (record.birthDate) {
    const normalized = normalizeDate(record.birthDate);
    if (normalized && normalized !== record.birthDate) {
      fixes.push({
        field: 'birthDate',
        action: 'normalize',
        currentValue: record.birthDate,
        proposedValue: normalized,
        confidence: 'high',
        reason: 'Normalized date format to ISO'
      });
    }
  }
  if (record.deathDate) {
    const normalized = normalizeDate(record.deathDate);
    if (normalized && normalized !== record.deathDate) {
      fixes.push({
        field: 'deathDate',
        action: 'normalize',
        currentValue: record.deathDate,
        proposedValue: normalized,
        confidence: 'high',
        reason: 'Normalized date format to ISO'
      });
    }
  }

  // 4. Estimate birth year from inscription
  if (!record.birthDate && record.deathDate && record.inscription) {
    const birthYear = estimateBirthYear(record.deathDate, record.inscription);
    if (birthYear) {
      fixes.push({
        field: 'birthDate',
        action: 'estimate',
        currentValue: null,
        proposedValue: birthYear,
        confidence: 'medium',
        reason: `Estimated from death year and age in inscription`
      });
    }
  }

  // 5. Fix invalid coordinates (swap lat/lng if latitude > 90)
  if (record.latitude !== undefined && record.latitude !== null &&
      record.longitude !== undefined && record.longitude !== null) {
    if (Math.abs(record.latitude) > 90 && Math.abs(record.longitude) <= 90) {
      fixes.push({
        field: 'latitude',
        action: 'swap',
        currentValue: record.latitude,
        proposedValue: record.longitude,
        confidence: 'high',
        reason: 'Latitude out of range (-90 to 90) — appears swapped with longitude'
      });
      fixes.push({
        field: 'longitude',
        action: 'swap',
        currentValue: record.longitude,
        proposedValue: record.latitude,
        confidence: 'high',
        reason: 'Swapped with latitude (which was out of range)'
      });
    }
  }

  // 6. Trim whitespace in text fields
  for (const field of ['name', 'inscription', 'section', 'plot', 'cemeteryId']) {
    if (record[field] && typeof record[field] === 'string') {
      const trimmed = record[field].trim();
      if (trimmed !== record[field]) {
        fixes.push({
          field: field,
          action: 'trim',
          currentValue: record[field],
          proposedValue: trimmed,
          confidence: 'high',
          reason: 'Trimmed leading/trailing whitespace'
        });
      }
    }
  }

  // 7. Fix birth after death (swap if exactly swapped)
  if (record.birthDate && record.deathDate) {
    const by = parseInt(String(record.birthDate).substring(0, 4));
    const dy = parseInt(String(record.deathDate).substring(0, 4));
    if (!isNaN(by) && !isNaN(dy) && by > dy) {
      // Check if swapping makes sense (birth < death)
      fixes.push({
        field: 'birthDate',
        action: 'swap_dates',
        currentValue: record.birthDate,
        proposedValue: record.deathDate,
        confidence: 'medium',
        reason: 'Birth date is after death date — dates appear swapped'
      });
      fixes.push({
        field: 'deathDate',
        action: 'swap_dates',
        currentValue: record.deathDate,
        proposedValue: record.birthDate,
        confidence: 'medium',
        reason: 'Swapped with birth date (was after death)'
      });
    }
  }

  return fixes;
}

/**
 * GET /api/cemeteries/:id/autofix/preview
 * Scans all records in a cemetery and returns proposed fixes without applying them.
 */
async function handleCemeteryAutoFixPreview(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      proposedFixes: [],
      message: 'GitHub not configured — no auto-fix available'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const proposedFixes = [];
    let recordsScanned = 0;

    const fixCounts = {
      add: 0,
      normalize: 0,
      estimate: 0,
      swap: 0,
      trim: 0,
      swap_dates: 0
    };

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        recordsScanned++;

        const fixes = generateAutoFixes(record);
        for (const fix of fixes) {
          fixCounts[fix.action] = (fixCounts[fix.action] || 0) + 1;
          proposedFixes.push({
            recordId: record.id,
            recordName: record.name || 'Unknown',
            ...fix
          });
        }
      } catch (e) { /* skip */ }
    }

    const summary = {
      totalFixes: proposedFixes.length,
      recordsScanned: recordsScanned,
      recordsWithFixes: new Set(proposedFixes.map(f => f.recordId)).size,
      byAction: fixCounts,
      highConfidence: proposedFixes.filter(f => f.confidence === 'high').length,
      mediumConfidence: proposedFixes.filter(f => f.confidence === 'medium').length
    };

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      proposedFixes: proposedFixes.slice(0, 200),
      totalProposed: proposedFixes.length,
      summary: summary
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate auto-fix preview',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/cemeteries/:id/autofix
 * Applies auto-fixes to records in a cemetery.
 * Body: { dryRun: boolean, fixTypes: string[] }
 * If dryRun is true, returns proposed fixes without applying.
 */
async function handleCemeteryAutoFix(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      applied: 0,
      message: 'GitHub not configured — no auto-fix available'
    }, 200, cors);
  }

  try {
    const body = await request.json();
    const dryRun = body && body.dryRun === true;
    const allowedTypes = body && Array.isArray(body.fixTypes) ? body.fixTypes : null;

    const files = await listFiles('graves', env);
    const applied = [];
    const skipped = [];
    let recordsScanned = 0;

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        recordsScanned++;

        const fixes = generateAutoFixes(record);
        const filteredFixes = allowedTypes
          ? fixes.filter(f => allowedTypes.includes(f.action))
          : fixes;

        if (filteredFixes.length === 0) continue;

        // Only apply high-confidence fixes automatically
        const safeFixes = filteredFixes.filter(f => f.confidence === 'high');
        const riskyFixes = filteredFixes.filter(f => f.confidence === 'medium');

        if (dryRun) {
          applied.push({
            recordId: record.id,
            recordName: record.name || 'Unknown',
            fixes: filteredFixes,
            wouldApply: safeFixes.length,
            wouldFlag: riskyFixes.length
          });
          continue;
        }

        // Apply high-confidence fixes
        const updatedRecord = { ...record };
        for (const fix of safeFixes) {
          updatedRecord[fix.field] = fix.proposedValue;
        }

        // Write back if we applied anything
        if (safeFixes.length > 0) {
          updatedRecord.updated_date = new Date().toISOString();
          await writeFile(`graves/${record.id}.json`, JSON.stringify(updatedRecord, null, 2), env);

          applied.push({
            recordId: record.id,
            recordName: record.name || 'Unknown',
            appliedFixes: safeFixes.map(f => ({
              field: f.field,
              action: f.action,
              oldValue: f.currentValue,
              newValue: f.proposedValue,
              reason: f.reason
            })),
            flaggedFixes: riskyFixes.map(f => ({
              field: f.field,
              action: f.action,
              proposedValue: f.proposedValue,
              reason: f.reason,
              confidence: f.confidence
            }))
          });
        } else if (riskyFixes.length > 0) {
          skipped.push({
            recordId: record.id,
            recordName: record.name || 'Unknown',
            flaggedFixes: riskyFixes
          });
        }
      } catch (e) { /* skip */ }
    }

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      dryRun: dryRun,
      recordsScanned: recordsScanned,
      recordsFixed: applied.length,
      recordsFlagged: skipped.length,
      results: dryRun ? applied : {
        applied: applied,
        flagged: skipped
      }
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to apply auto-fixes',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/graves/:id/autofix
 * Generates auto-fix proposals for a single record.
 */
async function handleRecordAutoFix(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      recordId: safeId,
      proposedFixes: [],
      message: 'GitHub not configured — no auto-fix available'
    }, 200, cors);
  }

  try {
    const content = await readFile(`graves/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Record not found' }, 404, cors);
    }

    const record = JSON.parse(content);
    const fixes = generateAutoFixes(record);

    return jsonResponse({
      success: true,
      recordId: safeId,
      recordName: record.name || null,
      proposedFixes: fixes,
      totalFixes: fixes.length,
      highConfidence: fixes.filter(f => f.confidence === 'high').length,
      mediumConfidence: fixes.filter(f => f.confidence === 'medium').length,
      hasSafeFixes: fixes.some(f => f.confidence === 'high'),
      hasRiskyFixes: fixes.some(f => f.confidence === 'medium')
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate auto-fix proposals',
      message: error.message
    }, 500, cors);
  }
}

/**
 * POST /api/graves/:id/autofix/apply
 * Applies proposed fixes to a single record.
 * Body: { fixTypes: string[] } — optional filter of fix actions to apply
 */
async function handleRecordAutoFixApply(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      recordId: safeId,
      applied: 0,
      message: 'GitHub not configured — no auto-fix available'
    }, 200, cors);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const allowedTypes = body && Array.isArray(body.fixTypes) ? body.fixTypes : null;

    const content = await readFile(`graves/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Record not found' }, 404, cors);
    }

    const record = JSON.parse(content);
    const fixes = generateAutoFixes(record);
    const filteredFixes = allowedTypes
      ? fixes.filter(f => allowedTypes.includes(f.action))
      : fixes;

    const safeFixes = filteredFixes.filter(f => f.confidence === 'high');
    const riskyFixes = filteredFixes.filter(f => f.confidence === 'medium');

    if (safeFixes.length === 0) {
      return jsonResponse({
        success: true,
        recordId: safeId,
        applied: 0,
        flagged: riskyFixes.length,
        message: 'No high-confidence fixes to apply. Medium-confidence fixes require manual review.',
        flaggedFixes: riskyFixes
      }, 200, cors);
    }

    const updatedRecord = { ...record };
    const appliedChanges = [];

    for (const fix of safeFixes) {
      appliedChanges.push({
        field: fix.field,
        action: fix.action,
        oldValue: fix.currentValue,
        newValue: fix.proposedValue,
        reason: fix.reason
      });
      updatedRecord[fix.field] = fix.proposedValue;
    }

    updatedRecord.updated_date = new Date().toISOString();
    await writeFile(`graves/${safeId}.json`, JSON.stringify(updatedRecord, null, 2), env);

    return jsonResponse({
      success: true,
      recordId: safeId,
      recordName: record.name || null,
      applied: safeFixes.length,
      flagged: riskyFixes.length,
      changes: appliedChanges,
      flaggedFixes: riskyFixes.length > 0 ? riskyFixes : undefined
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to apply auto-fixes',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.12: AI Smart Recommendations Handlers ──

/**
 * GET /api/cemeteries/:id/recommendations
 * Analyzes cemetery data and generates prioritized, actionable recommendations.
 *
 * Priority levels: critical, high, medium, low
 * Each recommendation includes:
 * - category: data_quality, anomalies, enrichment, duplicates, content, connections
 * - priority: critical, high, medium, low
 * - title: short actionable title
 * - description: detailed explanation
 * - affectedRecords: count of records affected
 * - estimatedEffort: low, medium, high
 * - actionEndpoint: API endpoint to address the issue
 */
async function handleCemeteryRecommendations(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      recommendations: [],
      message: 'GitHub not configured — no recommendations available'
    }, 200, cors);
  }

  try {
    // Gather all records for this cemetery
    const files = await listFiles('graves', env);
    const records = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        records.push(record);
      } catch (e) { /* skip */ }
    }

    const recordCount = records.length;
    if (recordCount === 0) {
      return jsonResponse({
        success: true,
        cemeteryId: safeId,
        recommendations: [{
          category: 'data_quality',
          priority: 'critical',
          title: 'No published records found',
          description: 'This cemetery has no published records. Import or publish records to begin building the dataset.',
          affectedRecords: 0,
          estimatedEffort: 'medium',
          actionEndpoint: '/api/import/score'
        }],
        summary: { total: 1, critical: 1, high: 0, medium: 0, low: 0 }
      }, 200, cors);
    }

    const recommendations = [];
    const currentYear = new Date().getFullYear();

    // ── Analyze data quality ──
    let missingBirthDate = 0, missingDeathDate = 0, missingName = 0, missingBothDates = 0;
    let missingPhotos = 0, missingInscriptions = 0, missingSources = 0, missingCoords = 0;
    let missingSectionPlot = 0;
    let needsEnrichment = 0;
    let criticalAnomalies = 0;
    let warningAnomalies = 0;
    let duplicateCount = 0;

    // Track for duplicate detection
    const nameDateMap = {};

    // Track surname groups for connections
    const surnameGroups = {};

    // Track death years for outliers
    const deathYears = [];

    for (const rec of records) {
      // Field completeness
      if (!rec.birthDate) missingBirthDate++;
      if (!rec.deathDate) missingDeathDate++;
      if (!rec.birthDate && !rec.deathDate) missingBothDates++;
      if (!rec.name && !rec.graveIdentifier) missingName++;
      if (!rec.photoRefs || rec.photoRefs.length === 0) missingPhotos++;
      if (!rec.inscription || !rec.inscription.trim()) missingInscriptions++;
      if (!rec.sourceRefs || rec.sourceRefs.length === 0) missingSources++;
      if (!rec.latitude || !rec.longitude) missingCoords++;
      if (!rec.section || !rec.plot) missingSectionPlot++;

      // Enrichment needs
      if (rec.name && !rec.givenNames && !rec.familyName) needsEnrichment++;
      if (rec.photoRefs && rec.photoRefs.length > 0 && (!rec.inscription || !rec.inscription.trim())) needsEnrichment++;

      // Anomaly detection
      if (rec.birthDate && rec.deathDate) {
        const by = parseInt(String(rec.birthDate).substring(0, 4));
        const dy = parseInt(String(rec.deathDate).substring(0, 4));
        if (!isNaN(by) && !isNaN(dy)) {
          if (by > dy) criticalAnomalies++;
          if (dy - by > 120) warningAnomalies++;
        }
      }
      if (rec.birthDate) {
        const by = parseInt(String(rec.birthDate).substring(0, 4));
        if (!isNaN(by) && by > currentYear) criticalAnomalies++;
        if (!isNaN(by) && by < 1700) warningAnomalies++;
      }
      if (rec.deathDate) {
        const dy = parseInt(String(rec.deathDate).substring(0, 4));
        if (!isNaN(dy) && dy > currentYear) criticalAnomalies++;
        if (!isNaN(dy)) deathYears.push(dy);
      }
      if (!rec.name && !rec.graveIdentifier) criticalAnomalies++;
      if (rec.latitude && (rec.latitude < -90 || rec.latitude > 90)) criticalAnomalies++;
      if (rec.longitude && (rec.longitude < -180 || rec.longitude > 180)) criticalAnomalies++;

      // Duplicate detection
      if (rec.name && rec.deathDate) {
        const key = (rec.name || '').toLowerCase().trim() + '|' + rec.deathDate;
        if (nameDateMap[key]) {
          duplicateCount++;
        } else {
          nameDateMap[key] = true;
        }
      }

      // Surname grouping for connections
      if (rec.name) {
        const parts = rec.name.trim().split(/\s+/);
        const surname = parts.length > 1 ? parts[parts.length - 1] : '';
        if (surname.length > 1) {
          const key = surname.toLowerCase();
          if (!surnameGroups[key]) surnameGroups[key] = 0;
          surnameGroups[key]++;
        }
      }
    }

    const photoPct = Math.round((missingPhotos / recordCount) * 100);
    const inscriptionPct = Math.round((missingInscriptions / recordCount) * 100);
    const sourcePct = Math.round((missingSources / recordCount) * 100);
    const coordPct = Math.round((missingCoords / recordCount) * 100);
    const birthPct = Math.round((missingBirthDate / recordCount) * 100);
    const enrichmentPct = Math.round((needsEnrichment / recordCount) * 100);

    // ── Generate recommendations ──

    // Critical: missing names
    if (missingName > 0) {
      recommendations.push({
        category: 'data_quality',
        priority: 'critical',
        title: `${missingName} records missing name or identifier`,
        description: `${missingName} record(s) have no name or grave identifier. These records cannot be properly searched, cited, or connected. Add names from inscriptions, photos, or source documents.`,
        affectedRecords: missingName,
        estimatedEffort: missingName > 10 ? 'high' : 'medium',
        actionEndpoint: `/api/graves/{id}/enrich`
      });
    }

    // Critical: date anomalies
    if (criticalAnomalies > 0) {
      recommendations.push({
        category: 'anomalies',
        priority: 'critical',
        title: `${criticalAnomalies} critical anomalies detected`,
        description: `${criticalAnomalies} critical anomaly/anomalies found (birth after death, future dates, invalid coordinates, missing names). These indicate data corruption and should be fixed immediately.`,
        affectedRecords: criticalAnomalies,
        estimatedEffort: criticalAnomalies > 10 ? 'high' : 'medium',
        actionEndpoint: `/api/cemeteries/${safeId}/anomalies`
      });
    }

    // Critical: missing both dates
    if (missingBothDates > 0) {
      const pct = Math.round((missingBothDates / recordCount) * 100);
      recommendations.push({
        category: 'data_quality',
        priority: pct > 30 ? 'critical' : 'high',
        title: `${missingBothDates} records have no birth or death date (${pct}%)`,
        description: `${missingBothDates} record(s) lack both birth and death dates. Without dates, records cannot appear in timeline views or be sorted chronologically. Check inscriptions and sources for date information.`,
        affectedRecords: missingBothDates,
        estimatedEffort: missingBothDates > 20 ? 'high' : 'medium',
        actionEndpoint: `/api/graves/{id}/enrich`
      });
    }

    // High: missing sources
    if (sourcePct > 50) {
      recommendations.push({
        category: 'content',
        priority: 'high',
        title: `${missingSources} records lack source attribution (${sourcePct}%)`,
        description: `${sourcePct}% of records have no source references. Without sources, data cannot be verified or trusted. Add source citations from available archives, transcripts, or official records.`,
        affectedRecords: missingSources,
        estimatedEffort: 'high',
        actionEndpoint: null
      });
    }

    // High: missing photos
    if (photoPct > 60) {
      recommendations.push({
        category: 'content',
        priority: 'high',
        title: `${missingPhotos} records have no photos (${photoPct}%)`,
        description: `${photoPct}% of records have no associated photographs. Photos help with verification and user engagement. Consider organizing a photo survey or importing from available image archives.`,
        affectedRecords: missingPhotos,
        estimatedEffort: 'high',
        actionEndpoint: null
      });
    }

    // High: duplicates
    if (duplicateCount > 0) {
      recommendations.push({
        category: 'duplicates',
        priority: 'high',
        title: `${duplicateCount} potential duplicate records detected`,
        description: `${duplicateCount} record(s) share the same name and death date. Duplicates create confusion and split information. Review and merge duplicate records.`,
        affectedRecords: duplicateCount,
        estimatedEffort: 'medium',
        actionEndpoint: `/api/cemeteries/${safeId}/duplicates`
      });
    }

    // Medium: missing inscriptions
    if (inscriptionPct > 40) {
      recommendations.push({
        category: 'content',
        priority: 'medium',
        title: `${missingInscriptions} records lack transcribed inscriptions (${inscriptionPct}%)`,
        description: `${inscriptionPct}% of records have no transcribed inscription. Inscriptions often contain biographical details, family relationships, and epitaphs valuable for research.`,
        affectedRecords: missingInscriptions,
        estimatedEffort: 'high',
        actionEndpoint: null
      });
    }

    // Medium: enrichment needed
    if (enrichmentPct > 30) {
      recommendations.push({
        category: 'enrichment',
        priority: 'medium',
        title: `${needsEnrichment} records could benefit from AI enrichment (${enrichmentPct}%)`,
        description: `${enrichmentPct}% of records have names that could be parsed into given/family names, or photos without transcribed inscriptions. Run AI enrichment to extract structured data.`,
        affectedRecords: needsEnrichment,
        estimatedEffort: 'low',
        actionEndpoint: `/api/graves/{id}/enrich`
      });
    }

    // Medium: missing coordinates
    if (coordPct > 50) {
      recommendations.push({
        category: 'data_quality',
        priority: 'medium',
        title: `${missingCoords} records lack GPS coordinates (${coordPct}%)`,
        description: `${coordPct}% of records have no coordinates. Coordinates enable map-based discovery and spatial search. Add coordinates from GPS survey or cemetery plot maps.`,
        affectedRecords: missingCoords,
        estimatedEffort: 'medium',
        actionEndpoint: null
      });
    }

    // Medium: missing section/plot
    if (missingSectionPlot > 0) {
      const pct = Math.round((missingSectionPlot / recordCount) * 100);
      if (pct > 50) {
        recommendations.push({
          category: 'data_quality',
          priority: 'medium',
          title: `${missingSectionPlot} records lack section/plot info (${pct}%)`,
          description: `${pct}% of records have no section or plot assignment. This information helps visitors locate graves physically within the cemetery.`,
          affectedRecords: missingSectionPlot,
          estimatedEffort: 'medium',
          actionEndpoint: null
        });
      }
    }

    // Low: family connections
    const familyGroups = Object.values(surnameGroups).filter(c => c >= 2).length;
    if (familyGroups > 0) {
      recommendations.push({
        category: 'connections',
        priority: 'low',
        title: `${familyGroups} potential family groups detected`,
        description: `${familyGroups} surname group(s) with 2+ records were found. Explore family connections to build relationship networks between records.`,
        affectedRecords: familyGroups,
        estimatedEffort: 'low',
        actionEndpoint: `/api/cemeteries/${safeId}/connections`
      });
    }

    // Low: warning anomalies
    if (warningAnomalies > 0) {
      recommendations.push({
        category: 'anomalies',
        priority: 'low',
        title: `${warningAnomalies} minor anomalies to review`,
        description: `${warningAnomalies} warning-level anomaly/anomalies detected (lifespan >120, pre-1700 dates, short names). These may be valid but should be reviewed.`,
        affectedRecords: warningAnomalies,
        estimatedEffort: 'low',
        actionEndpoint: `/api/cemeteries/${safeId}/anomalies`
      });
    }

    // Low: statistical outliers
    if (deathYears.length > 0) {
      const sorted = [...deathYears].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
      let outliers = 0;
      for (const y of deathYears) {
        if (Math.abs(y - median) > 100) outliers++;
      }
      if (outliers > 0) {
        recommendations.push({
          category: 'anomalies',
          priority: 'low',
          title: `${outliers} statistical outliers in death dates`,
          description: `${outliers} record(s) have death dates more than 100 years from the cemetery median (${median}). These may represent data entry errors or genuinely old records.`,
          affectedRecords: outliers,
          estimatedEffort: 'low',
          actionEndpoint: `/api/cemeteries/${safeId}/anomalies`
        });
      }
    }

    // Sort by priority: critical > high > medium > low
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Build summary
    const summary = {
      total: recommendations.length,
      critical: recommendations.filter(r => r.priority === 'critical').length,
      high: recommendations.filter(r => r.priority === 'high').length,
      medium: recommendations.filter(r => r.priority === 'medium').length,
      low: recommendations.filter(r => r.priority === 'low').length,
      recordsAnalyzed: recordCount
    };

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      recommendations: recommendations,
      summary: summary
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate recommendations',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/recommendations/global
 * Returns prioritized recommendations across all cemeteries.
 */
async function handleGlobalRecommendations(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      recommendations: [],
      message: 'GitHub not configured — no recommendations available'
    }, 200, cors);
  }

  try {
    // List all cemetery files
    const cemFiles = await listFiles('cemeteries', env);
    const cemeteryIds = [];
    for (const file of cemFiles) {
      try {
        const content = await readFile(`cemeteries/${file}`, env);
        if (!content) continue;
        const cem = JSON.parse(content);
        cemeteryIds.push({ id: cem.id || file.replace('.json', ''), name: cem.name || cem.id });
      } catch (e) { /* skip */ }
    }

    // Aggregate stats across all records
    const graveFiles = await listFiles('graves', env);
    let totalRecords = 0;
    let totalMissingSources = 0;
    let totalMissingPhotos = 0;
    let totalMissingDates = 0;
    let totalCriticalAnomalies = 0;
    let totalDuplicates = 0;
    const nameDateMap = {};
    const cemeteryRecordCounts = {};

    for (const file of graveFiles) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const rec = JSON.parse(content);
        if (rec.status !== 'published') continue;
        totalRecords++;

        const cemId = rec.cemeteryId || 'unknown';
        if (!cemeteryRecordCounts[cemId]) cemeteryRecordCounts[cemId] = 0;
        cemeteryRecordCounts[cemId]++;

        if (!rec.sourceRefs || rec.sourceRefs.length === 0) totalMissingSources++;
        if (!rec.photoRefs || rec.photoRefs.length === 0) totalMissingPhotos++;
        if (!rec.birthDate && !rec.deathDate) totalMissingDates++;

        // Quick anomaly check
        if (!rec.name && !rec.graveIdentifier) totalCriticalAnomalies++;
        if (rec.birthDate && rec.deathDate) {
          const by = parseInt(String(rec.birthDate).substring(0, 4));
          const dy = parseInt(String(rec.deathDate).substring(0, 4));
          if (!isNaN(by) && !isNaN(dy) && by > dy) totalCriticalAnomalies++;
        }

        // Duplicate check (global)
        if (rec.name && rec.deathDate) {
          const key = (rec.name || '').toLowerCase().trim() + '|' + rec.deathDate;
          if (nameDateMap[key]) totalDuplicates++;
          else nameDateMap[key] = true;
        }
      } catch (e) { /* skip */ }
    }

    const recommendations = [];

    if (totalCriticalAnomalies > 0) {
      recommendations.push({
        category: 'anomalies',
        priority: 'critical',
        title: `${totalCriticalAnomalies} critical anomalies across all cemeteries`,
        description: 'Critical anomalies detected globally (missing names, birth after death, invalid coordinates). These indicate data corruption requiring immediate attention.',
        affectedRecords: totalCriticalAnomalies,
        estimatedEffort: 'high',
        actionEndpoint: '/api/health/overview'
      });
    }

    if (totalDuplicates > 0) {
      recommendations.push({
        category: 'duplicates',
        priority: 'high',
        title: `${totalDuplicates} potential duplicates across all cemeteries`,
        description: 'Records sharing the same name and death date were found. These may be duplicates from overlapping imports or cross-cemetery burials that need review.',
        affectedRecords: totalDuplicates,
        estimatedEffort: 'medium',
        actionEndpoint: null
      });
    }

    const sourcePct = totalRecords > 0 ? Math.round((totalMissingSources / totalRecords) * 100) : 0;
    if (sourcePct > 50) {
      recommendations.push({
        category: 'content',
        priority: 'high',
        title: `${totalMissingSources} records globally lack source attribution (${sourcePct}%)`,
        description: 'More than half of all records have no source references. Source citations are essential for data trustworthiness and verifiability.',
        affectedRecords: totalMissingSources,
        estimatedEffort: 'high',
        actionEndpoint: null
      });
    }

    const photoPct = totalRecords > 0 ? Math.round((totalMissingPhotos / totalRecords) * 100) : 0;
    if (photoPct > 60) {
      recommendations.push({
        category: 'content',
        priority: 'medium',
        title: `${totalMissingPhotos} records have no photos (${photoPct}%)`,
        description: 'Photos improve record verification and user engagement. Consider organizing photo surveys for cemeteries with low photo coverage.',
        affectedRecords: totalMissingPhotos,
        estimatedEffort: 'high',
        actionEndpoint: null
      });
    }

    if (totalMissingDates > 0) {
      const pct = totalRecords > 0 ? Math.round((totalMissingDates / totalRecords) * 100) : 0;
      if (pct > 20) {
        recommendations.push({
          category: 'data_quality',
          priority: 'medium',
          title: `${totalMissingDates} records have no birth or death date (${pct}%)`,
          description: 'Records without dates cannot appear in timeline views. Check inscriptions and sources for date information.',
          affectedRecords: totalMissingDates,
          estimatedEffort: 'medium',
          actionEndpoint: null
        });
      }
    }

    // Recommend per-cemetery review for largest cemeteries
    const sortedCems = Object.entries(cemeteryRecordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [cemId, count] of sortedCems) {
      if (count > 50) {
        recommendations.push({
          category: 'data_quality',
          priority: 'low',
          title: `Review health for cemetery with ${count} records`,
          description: `Cemetery ${cemId} has ${count} published records. Run the health dashboard for a detailed quality assessment.`,
          affectedRecords: count,
          estimatedEffort: 'low',
          actionEndpoint: `/api/cemeteries/${cemId}/health`
        });
      }
    }

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const summary = {
      total: recommendations.length,
      critical: recommendations.filter(r => r.priority === 'critical').length,
      high: recommendations.filter(r => r.priority === 'high').length,
      medium: recommendations.filter(r => r.priority === 'medium').length,
      low: recommendations.filter(r => r.priority === 'low').length,
      totalCemeteries: cemeteryIds.length,
      totalRecords: totalRecords
    };

    return jsonResponse({
      success: true,
      recommendations: recommendations,
      summary: summary
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to generate global recommendations',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.11: AI Cemetery Health Dashboard Handlers ──

/**
 * GET /api/cemeteries/:id/health
 * Returns a composite health score for a cemetery combining all intelligence:
 * - Data quality % (completeness + coverage)
 * - Anomaly rate (critical/warning/info counts)
 * - Enrichment coverage (records with missing fields)
 * - Duplicate count
 * - Family connection density
 * - Record count, photo coverage, inscription coverage, source coverage
 * - Letter grade (A–F) with recommendation
 */
async function handleCemeteryHealth(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      health: null,
      message: 'GitHub not configured — no health data available'
    }, 200, cors);
  }

  try {
    // Gather all records for this cemetery
    const files = await listFiles('graves', env);
    const records = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        records.push(record);
      } catch (e) { /* skip */ }
    }

    // Read cemetery metadata
    let cemeteryName = safeId;
    let cemeteryLat = null, cemeteryLng = null;
    try {
      const cemContent = await readFile(`cemeteries/${safeId}.json`, env);
      if (cemContent) {
        const cem = JSON.parse(cemContent);
        cemeteryName = cem.name || safeId;
        cemeteryLat = cem.latitude || null;
        cemeteryLng = cem.longitude || null;
      }
    } catch (e) { /* skip */ }

    const recordCount = records.length;
    if (recordCount === 0) {
      return jsonResponse({
        success: true,
        cemeteryId: safeId,
        cemeteryName: cemeteryName,
        health: {
          grade: 'N/A',
          overallScore: 0,
          recordCount: 0,
          message: 'No published records found for this cemetery'
        }
      }, 200, cors);
    }

    // ── 1. Data Quality Score ──
    const essentialFields = ['name', 'birthDate', 'deathDate', 'cemeteryId'];
    const optionalFields = ['photoRefs', 'inscription', 'sourceRefs', 'latitude', 'longitude', 'section', 'plot'];
    let totalCompleteness = 0;
    let totalCoverage = 0;

    const fieldCoverage = {};
    for (const f of [...essentialFields, ...optionalFields]) {
      fieldCoverage[f] = 0;
    }

    for (const rec of records) {
      let completeness = 0;
      for (const field of essentialFields) {
        if (rec[field] !== undefined && rec[field] !== null && rec[field] !== '') {
          completeness += 25;
          fieldCoverage[field]++;
        }
      }
      totalCompleteness += completeness;

      let coverage = 0;
      for (const field of optionalFields) {
        if (rec[field] !== undefined && rec[field] !== null && rec[field] !== '') {
          if (Array.isArray(rec[field]) ? rec[field].length > 0 : true) {
            coverage += 100 / optionalFields.length;
            fieldCoverage[field]++;
          }
        }
      }
      totalCoverage += coverage;
    }

    const avgCompleteness = Math.round(totalCompleteness / recordCount);
    const avgCoverage = Math.round(totalCoverage / recordCount);
    const dataQualityScore = Math.round(avgCompleteness * 0.5 + avgCoverage * 0.5);

    // ── 2. Anomaly Detection ──
    let criticalCount = 0, warningCount = 0, infoCount = 0;
    const anomalyTypes = {};
    const currentYear = new Date().getFullYear();

    // Collect death years for median
    const deathYears = [];
    for (const r of records) {
      if (r.deathDate) {
        const y = parseInt(String(r.deathDate).substring(0, 4));
        if (!isNaN(y)) deathYears.push(y);
      }
    }
    let medianDeathYear = null;
    if (deathYears.length > 0) {
      const sorted = [...deathYears].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianDeathYear = sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        : sorted[mid];
    }

    for (const rec of records) {
      // Date anomalies
      if (rec.birthDate && rec.deathDate) {
        const by = parseInt(String(rec.birthDate).substring(0, 4));
        const dy = parseInt(String(rec.deathDate).substring(0, 4));
        if (!isNaN(by) && !isNaN(dy)) {
          if (by > dy) { criticalCount++; anomalyTypes.date_anomaly = (anomalyTypes.date_anomaly || 0) + 1; }
          if (dy - by > 120) { warningCount++; anomalyTypes.date_anomaly = (anomalyTypes.date_anomaly || 0) + 1; }
        }
      }
      if (rec.birthDate) {
        const by = parseInt(String(rec.birthDate).substring(0, 4));
        if (!isNaN(by) && by > currentYear) { criticalCount++; anomalyTypes.date_anomaly = (anomalyTypes.date_anomaly || 0) + 1; }
        if (!isNaN(by) && by < 1700) { warningCount++; anomalyTypes.date_anomaly = (anomalyTypes.date_anomaly || 0) + 1; }
      }
      if (rec.deathDate) {
        const dy = parseInt(String(rec.deathDate).substring(0, 4));
        if (!isNaN(dy) && dy > currentYear) { criticalCount++; anomalyTypes.date_anomaly = (anomalyTypes.date_anomaly || 0) + 1; }
      }

      // Name anomalies
      if (rec.name) {
        const name = rec.name.trim();
        if (name.length < 2) { warningCount++; anomalyTypes.name_anomaly = (anomalyTypes.name_anomaly || 0) + 1; }
        if (/^[0-9\s]+$/.test(name)) { warningCount++; anomalyTypes.name_anomaly = (anomalyTypes.name_anomaly || 0) + 1; }
      } else if (!rec.graveIdentifier) {
        criticalCount++; anomalyTypes.completeness_anomaly = (anomalyTypes.completeness_anomaly || 0) + 1;
      }

      // Coordinate anomalies
      if (rec.latitude !== undefined && rec.latitude !== null) {
        if (rec.latitude < -90 || rec.latitude > 90) { criticalCount++; anomalyTypes.coordinate_anomaly = (anomalyTypes.coordinate_anomaly || 0) + 1; }
      }
      if (rec.longitude !== undefined && rec.longitude !== null) {
        if (rec.longitude < -180 || rec.longitude > 180) { criticalCount++; anomalyTypes.coordinate_anomaly = (anomalyTypes.coordinate_anomaly || 0) + 1; }
      }

      // Completeness
      if (!rec.birthDate && !rec.deathDate) { warningCount++; anomalyTypes.completeness_anomaly = (anomalyTypes.completeness_anomaly || 0) + 1; }

      // Statistical outliers
      if (rec.deathDate && medianDeathYear) {
        const dy = parseInt(String(rec.deathDate).substring(0, 4));
        if (!isNaN(dy) && Math.abs(dy - medianDeathYear) > 100) { infoCount++; anomalyTypes.statistical_outlier = (anomalyTypes.statistical_outlier || 0) + 1; }
      }
    }

    const totalAnomalies = criticalCount + warningCount + infoCount;
    const anomalyRate = recordCount > 0 ? Math.round((totalAnomalies / recordCount) * 100) : 0;
    const anomalyScore = Math.max(0, 100 - anomalyRate);

    // ── 3. Enrichment Coverage ──
    let enrichableCount = 0;
    for (const rec of records) {
      let needsEnrichment = false;
      if (rec.name && !rec.givenNames && !rec.familyName) needsEnrichment = true;
      if (!rec.birthDate && rec.deathDate) needsEnrichment = true;
      if (!rec.sourceRefs || rec.sourceRefs.length === 0) needsEnrichment = true;
      if (!rec.inscription && rec.photoRefs && rec.photoRefs.length > 0) needsEnrichment = true;
      if (needsEnrichment) enrichableCount++;
    }
    const enrichmentRate = recordCount > 0 ? Math.round((enrichableCount / recordCount) * 100) : 0;
    const enrichmentScore = 100 - enrichmentRate;

    // ── 4. Duplicate Detection ──
    const nameMap = {};
    let duplicateCount = 0;
    for (const rec of records) {
      const key = (rec.name || '').toLowerCase().trim();
      if (!key) continue;
      if (nameMap[key]) {
        // Check if dates also match
        if (rec.deathDate && nameMap[key].deathDate && rec.deathDate === nameMap[key].deathDate) {
          duplicateCount++;
        }
      } else {
        nameMap[key] = rec;
      }
    }
    const duplicateRate = recordCount > 0 ? Math.round((duplicateCount / recordCount) * 100) : 0;
    const duplicateScore = Math.max(0, 100 - duplicateRate * 5);

    // ── 5. Family Connection Density ──
    const surnameGroups = {};
    for (const rec of records) {
      // Simple surname extraction
      const name = rec.name || '';
      const parts = name.trim().split(/\s+/);
      const surname = parts.length > 1 ? parts[parts.length - 1] : '';
      if (surname.length > 1) {
        const key = surname.toLowerCase();
        if (!surnameGroups[key]) surnameGroups[key] = 0;
        surnameGroups[key]++;
      }
    }
    const familyGroups = Object.values(surnameGroups).filter(c => c >= 2).length;
    const connectionDensity = recordCount > 0 ? Math.round((familyGroups / recordCount) * 100) : 0;

    // ── 6. Content Coverage ──
    let withPhotos = 0, withInscriptions = 0, withSources = 0, withCoordinates = 0;
    for (const rec of records) {
      if (rec.photoRefs && rec.photoRefs.length > 0) withPhotos++;
      if (rec.inscription && rec.inscription.trim()) withInscriptions++;
      if (rec.sourceRefs && rec.sourceRefs.length > 0) withSources++;
      if (rec.latitude && rec.longitude) withCoordinates++;
    }

    const photoCoverage = Math.round((withPhotos / recordCount) * 100);
    const inscriptionCoverage = Math.round((withInscriptions / recordCount) * 100);
    const sourceCoverage = Math.round((withSources / recordCount) * 100);
    const coordinateCoverage = Math.round((withCoordinates / recordCount) * 100);

    // ── 7. Overall Composite Score ──
    const overallScore = Math.round(
      dataQualityScore * 0.30 +
      anomalyScore * 0.25 +
      enrichmentScore * 0.15 +
      duplicateScore * 0.15 +
      (photoCoverage + inscriptionCoverage + sourceCoverage + coordinateCoverage) / 4 * 0.15
    );

    // ── 8. Letter Grade ──
    let grade, gradeColor, recommendation;
    if (overallScore >= 90) { grade = 'A'; gradeColor = 'green'; recommendation = 'Excellent data quality — ready for production'; }
    else if (overallScore >= 80) { grade = 'B'; gradeColor = 'green'; recommendation = 'Good data quality — minor improvements needed'; }
    else if (overallScore >= 70) { grade = 'C'; gradeColor = 'yellow'; recommendation = 'Acceptable quality — several issues to address'; }
    else if (overallScore >= 60) { grade = 'D'; gradeColor = 'orange'; recommendation = 'Below average — significant cleanup needed'; }
    else { grade = 'F'; gradeColor = 'red'; recommendation = 'Poor quality — major data issues require attention'; }

    // Build field coverage percentages
    const fieldCoveragePct = {};
    for (const [field, count] of Object.entries(fieldCoverage)) {
      fieldCoveragePct[field] = Math.round((count / recordCount) * 100);
    }

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      cemeteryName: cemeteryName,
      health: {
        grade: grade,
        gradeColor: gradeColor,
        overallScore: overallScore,
        recommendation: recommendation,
        recordCount: recordCount,
        scores: {
          dataQuality: dataQualityScore,
          anomalyFree: anomalyScore,
          enrichmentCoverage: enrichmentScore,
          duplicateFree: duplicateScore,
          contentCoverage: Math.round((photoCoverage + inscriptionCoverage + sourceCoverage + coordinateCoverage) / 4)
        },
        anomalies: {
          critical: criticalCount,
          warning: warningCount,
          info: infoCount,
          total: totalAnomalies,
          rate: anomalyRate,
          byType: anomalyTypes
        },
        enrichment: {
          recordsNeedingEnrichment: enrichableCount,
          enrichmentRate: enrichmentRate
        },
        duplicates: {
          count: duplicateCount,
          rate: duplicateRate
        },
        connections: {
          familyGroups: familyGroups,
          connectionDensity: connectionDensity
        },
        content: {
          photoCoverage: photoCoverage,
          inscriptionCoverage: inscriptionCoverage,
          sourceCoverage: sourceCoverage,
          coordinateCoverage: coordinateCoverage
        },
        completeness: avgCompleteness,
        coverage: avgCoverage,
        fieldCoverage: fieldCoveragePct,
        medianDeathYear: medianDeathYear
      }
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to compute cemetery health',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/health/overview
 * Returns a global health overview across all cemeteries.
 */
async function handleGlobalHealthOverview(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      overview: null,
      message: 'GitHub not configured — no health data available'
    }, 200, cors);
  }

  try {
    // List all cemetery files
    const cemFiles = await listFiles('cemeteries', env);
    const cemeteries = [];

    for (const file of cemFiles) {
      try {
        const content = await readFile(`cemeteries/${file}`, env);
        if (!content) continue;
        const cem = JSON.parse(content);
        cemeteries.push(cem);
      } catch (e) { /* skip */ }
    }

    // Quick aggregate stats across all records
    const graveFiles = await listFiles('graves', env);
    let totalRecords = 0;
    let totalWithPhotos = 0;
    let totalWithInscriptions = 0;
    let totalWithSources = 0;
    let totalWithCoords = 0;
    let totalCritical = 0;

    const currentYear = new Date().getFullYear();

    for (const file of graveFiles) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const rec = JSON.parse(content);
        if (rec.status !== 'published') continue;
        totalRecords++;

        if (rec.photoRefs && rec.photoRefs.length > 0) totalWithPhotos++;
        if (rec.inscription && rec.inscription.trim()) totalWithInscriptions++;
        if (rec.sourceRefs && rec.sourceRefs.length > 0) totalWithSources++;
        if (rec.latitude && rec.longitude) totalWithCoords++;

        // Quick critical anomaly check
        if (rec.birthDate && rec.deathDate) {
          const by = parseInt(String(rec.birthDate).substring(0, 4));
          const dy = parseInt(String(rec.deathDate).substring(0, 4));
          if (!isNaN(by) && !isNaN(dy) && by > dy) totalCritical++;
        }
        if (rec.birthDate) {
          const by = parseInt(String(rec.birthDate).substring(0, 4));
          if (!isNaN(by) && by > currentYear) totalCritical++;
        }
        if (!rec.name && !rec.graveIdentifier) totalCritical++;
      } catch (e) { /* skip */ }
    }

    const globalScores = {
      photoCoverage: totalRecords > 0 ? Math.round((totalWithPhotos / totalRecords) * 100) : 0,
      inscriptionCoverage: totalRecords > 0 ? Math.round((totalWithInscriptions / totalRecords) * 100) : 0,
      sourceCoverage: totalRecords > 0 ? Math.round((totalWithSources / totalRecords) * 100) : 0,
      coordinateCoverage: totalRecords > 0 ? Math.round((totalWithCoords / totalRecords) * 100) : 0
    };

    const contentAverage = Math.round(
      (globalScores.photoCoverage + globalScores.inscriptionCoverage +
       globalScores.sourceCoverage + globalScores.coordinateCoverage) / 4
    );

    // Global grade
    let grade;
    if (contentAverage >= 80) grade = 'B';
    else if (contentAverage >= 60) grade = 'C';
    else if (contentAverage >= 40) grade = 'D';
    else grade = 'F';

    return jsonResponse({
      success: true,
      overview: {
        totalCemeteries: cemeteries.length,
        totalRecords: totalRecords,
        criticalIssues: totalCritical,
        contentCoverage: globalScores,
        contentAverage: contentAverage,
        globalGrade: grade
      }
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to compute global health overview',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.10: AI Anomaly Detection Handlers ──

/**
 * GET /api/cemeteries/:id/anomalies
 * Scans all records in a cemetery and flags anomalies:
 * - Date anomalies: birth after death, lifespan > 120, future dates, pre-1700 dates
 * - Name anomalies: too short, all-caps, non-printable chars, numeric-only
 * - Coordinate anomalies: coordinates outside cemetery bounding box
 * - Plot anomalies: duplicate plot assignments, same plot different names
 * - Completeness anomalies: records missing name or both dates
 * - Statistical outliers: death dates far from cemetery median
 */
async function handleCemeteryAnomalies(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      anomalies: [],
      summary: { total: 0 },
      message: 'GitHub not configured — no anomaly detection available'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const records = [];
    const cemeteryData = null;

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        records.push(record);
      } catch (e) { /* skip */ }
    }

    // Also try to read cemetery metadata for coordinate bounds
    let cemeteryLat = null, cemeteryLng = null;
    try {
      const cemContent = await readFile(`cemeteries/${safeId}.json`, env);
      if (cemContent) {
        const cem = JSON.parse(cemContent);
        cemeteryLat = cem.latitude || null;
        cemeteryLng = cem.longitude || null;
      }
    } catch (e) { /* skip */ }

    const anomalies = [];
    const anomalyCounts = {
      date_anomaly: 0,
      name_anomaly: 0,
      coordinate_anomaly: 0,
      plot_anomaly: 0,
      completeness_anomaly: 0,
      statistical_outlier: 0
    };

    // Collect death years for statistical analysis
    const deathYears = [];
    for (const r of records) {
      if (r.deathDate) {
        const y = parseInt(String(r.deathDate).substring(0, 4));
        if (!isNaN(y)) deathYears.push(y);
      }
    }

    // Compute median death year
    let medianDeathYear = null;
    if (deathYears.length > 0) {
      const sorted = [...deathYears].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianDeathYear = sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        : sorted[mid];
    }

    // Track plot assignments for duplicate detection
    const plotAssignments = {};

    for (const record of records) {
      const recAnomalies = [];

      // ── Date anomalies ──
      if (record.birthDate && record.deathDate) {
        const birthYear = parseInt(String(record.birthDate).substring(0, 4));
        const deathYear = parseInt(String(record.deathDate).substring(0, 4));

        if (!isNaN(birthYear) && !isNaN(deathYear)) {
          if (birthYear > deathYear) {
            recAnomalies.push({
              type: 'date_anomaly',
              severity: 'critical',
              message: `Birth year (${birthYear}) is after death year (${deathYear})`,
              field: 'birthDate'
            });
          }

          const lifespan = deathYear - birthYear;
          if (lifespan > 120) {
            recAnomalies.push({
              type: 'date_anomaly',
              severity: 'warning',
              message: `Lifespan of ${lifespan} years exceeds 120 (verify dates)`,
              field: 'deathDate'
            });
          }
        }
      }

      // Future dates
      const currentYear = new Date().getFullYear();
      if (record.birthDate) {
        const birthYear = parseInt(String(record.birthDate).substring(0, 4));
        if (!isNaN(birthYear) && birthYear > currentYear) {
          recAnomalies.push({
            type: 'date_anomaly',
            severity: 'critical',
            message: `Birth date is in the future (${birthYear})`,
            field: 'birthDate'
          });
        }
      }
      if (record.deathDate) {
        const deathYear = parseInt(String(record.deathDate).substring(0, 4));
        if (!isNaN(deathYear) && deathYear > currentYear) {
          recAnomalies.push({
            type: 'date_anomaly',
            severity: 'critical',
            message: `Death date is in the future (${deathYear})`,
            field: 'deathDate'
          });
        }
      }

      // Pre-1700 dates (suspicious for most cemeteries)
      if (record.birthDate) {
        const birthYear = parseInt(String(record.birthDate).substring(0, 4));
        if (!isNaN(birthYear) && birthYear < 1700) {
          recAnomalies.push({
            type: 'date_anomaly',
            severity: 'warning',
            message: `Birth year before 1700 (${birthYear}) — verify historical accuracy`,
            field: 'birthDate'
          });
        }
      }

      // ── Name anomalies ──
      if (record.name) {
        const name = record.name.trim();
        if (name.length < 2) {
          recAnomalies.push({
            type: 'name_anomaly',
            severity: 'warning',
            message: 'Name is very short (less than 2 characters)',
            field: 'name'
          });
        }
        if (name.length > 3 && name === name.toUpperCase() && /[a-zA-Z]/.test(name)) {
          recAnomalies.push({
            type: 'name_anomaly',
            severity: 'info',
            message: 'Name is all uppercase (consider title case)',
            field: 'name'
          });
        }
        if (/^[0-9\s]+$/.test(name)) {
          recAnomalies.push({
            type: 'name_anomaly',
            severity: 'warning',
            message: 'Name contains only numbers',
            field: 'name'
          });
        }
        if (/[\x00-\x1f\x7f]/.test(name)) {
          recAnomalies.push({
            type: 'name_anomaly',
            severity: 'critical',
            message: 'Name contains non-printable characters',
            field: 'name'
          });
        }
      }

      // ── Coordinate anomalies ──
      if (record.latitude && record.longitude && cemeteryLat && cemeteryLng) {
        const latDiff = Math.abs(record.latitude - cemeteryLat);
        const lngDiff = Math.abs(record.longitude - cemeteryLng);
        // Flag if coordinates are more than 0.1 degrees (~11km) from cemetery center
        if (latDiff > 0.1 || lngDiff > 0.1) {
          recAnomalies.push({
            type: 'coordinate_anomaly',
            severity: 'warning',
            message: `Record coordinates are ${Math.round(Math.max(latDiff, lngDiff) * 111)}km from cemetery center`,
            field: 'latitude'
          });
        }
      }

      // Check for invalid coordinate ranges
      if (record.latitude !== undefined && record.latitude !== null) {
        if (record.latitude < -90 || record.latitude > 90) {
          recAnomalies.push({
            type: 'coordinate_anomaly',
            severity: 'critical',
            message: `Invalid latitude (${record.latitude}) — must be -90 to 90`,
            field: 'latitude'
          });
        }
      }
      if (record.longitude !== undefined && record.longitude !== null) {
        if (record.longitude < -180 || record.longitude > 180) {
          recAnomalies.push({
            type: 'coordinate_anomaly',
            severity: 'critical',
            message: `Invalid longitude (${record.longitude}) — must be -180 to 180`,
            field: 'longitude'
          });
        }
      }

      // ── Plot anomalies ──
      if (record.section && record.plot) {
        const plotKey = `${record.section}:${record.plot}`;
        if (!plotAssignments[plotKey]) {
          plotAssignments[plotKey] = [];
        }
        plotAssignments[plotKey].push({
          id: record.id,
          name: record.name
        });
      }

      // ── Completeness anomalies ──
      if (!record.name && !record.graveIdentifier) {
        recAnomalies.push({
          type: 'completeness_anomaly',
          severity: 'critical',
          message: 'Record has no name or grave identifier',
          field: 'name'
        });
      }
      if (!record.birthDate && !record.deathDate) {
        recAnomalies.push({
          type: 'completeness_anomaly',
          severity: 'warning',
          message: 'Record has no birth or death date',
          field: 'deathDate'
        });
      }

      // ── Statistical outliers ──
      if (record.deathDate && medianDeathYear) {
        const deathYear = parseInt(String(record.deathDate).substring(0, 4));
        if (!isNaN(deathYear)) {
          const deviation = Math.abs(deathYear - medianDeathYear);
          // Flag if more than 100 years from median
          if (deviation > 100) {
            recAnomalies.push({
              type: 'statistical_outlier',
              severity: 'info',
              message: `Death year (${deathYear}) is ${deviation} years from cemetery median (${medianDeathYear})`,
              field: 'deathDate'
            });
          }
        }
      }

      // Add anomalies to results
      for (const a of recAnomalies) {
        anomalyCounts[a.type]++;
        anomalies.push({
          recordId: record.id,
          recordName: record.name || 'Unknown',
          ...a
        });
      }
    }

    // Check for duplicate plot assignments
    for (const [plotKey, assignments] of Object.entries(plotAssignments)) {
      if (assignments.length > 1) {
        anomalyCounts.plot_anomaly++;
        anomalies.push({
          recordId: assignments[0].id,
          recordName: assignments[0].name || 'Unknown',
          type: 'plot_anomaly',
          severity: 'warning',
          message: `Plot ${plotKey} is assigned to ${assignments.length} records`,
          field: 'plot',
          duplicateRecords: assignments
        });
      }
    }

    // Sort anomalies by severity (critical first)
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Build summary
    const summary = {
      total: anomalies.length,
      critical: anomalies.filter(a => a.severity === 'critical').length,
      warning: anomalies.filter(a => a.severity === 'warning').length,
      info: anomalies.filter(a => a.severity === 'info').length,
      byType: anomalyCounts,
      recordsScanned: records.length,
      medianDeathYear: medianDeathYear
    };

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      anomalies: anomalies.slice(0, 100),
      anomalyCount: anomalies.length,
      summary: summary
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to detect anomalies',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/graves/:id/anomaly-check
 * Checks a single record for anomalies and returns detailed findings.
 */
async function handleRecordAnomalyCheck(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      recordId: safeId,
      anomalies: [],
      message: 'GitHub not configured — no anomaly check available'
    }, 200, cors);
  }

  try {
    const content = await readFile(`graves/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Record not found' }, 404, cors);
    }

    const record = JSON.parse(content);
    const anomalies = [];
    const currentYear = new Date().getFullYear();

    // Date checks
    if (record.birthDate && record.deathDate) {
      const birthYear = parseInt(String(record.birthDate).substring(0, 4));
      const deathYear = parseInt(String(record.deathDate).substring(0, 4));
      if (!isNaN(birthYear) && !isNaN(deathYear)) {
        if (birthYear > deathYear) {
          anomalies.push({ type: 'date_anomaly', severity: 'critical', message: 'Birth year is after death year', field: 'birthDate' });
        }
        const lifespan = deathYear - birthYear;
        if (lifespan > 120) {
          anomalies.push({ type: 'date_anomaly', severity: 'warning', message: `Lifespan of ${lifespan} years exceeds 120`, field: 'deathDate' });
        }
      }
    }

    if (record.birthDate) {
      const y = parseInt(String(record.birthDate).substring(0, 4));
      if (!isNaN(y) && y > currentYear) {
        anomalies.push({ type: 'date_anomaly', severity: 'critical', message: 'Birth date is in the future', field: 'birthDate' });
      }
      if (!isNaN(y) && y < 1700) {
        anomalies.push({ type: 'date_anomaly', severity: 'warning', message: `Birth year (${y}) is before 1700`, field: 'birthDate' });
      }
    }
    if (record.deathDate) {
      const y = parseInt(String(record.deathDate).substring(0, 4));
      if (!isNaN(y) && y > currentYear) {
        anomalies.push({ type: 'date_anomaly', severity: 'critical', message: 'Death date is in the future', field: 'deathDate' });
      }
    }

    // Name checks
    if (record.name) {
      const name = record.name.trim();
      if (name.length < 2) {
        anomalies.push({ type: 'name_anomaly', severity: 'warning', message: 'Name is very short', field: 'name' });
      }
      if (name.length > 3 && name === name.toUpperCase() && /[a-zA-Z]/.test(name)) {
        anomalies.push({ type: 'name_anomaly', severity: 'info', message: 'Name is all uppercase', field: 'name' });
      }
      if (/^[0-9\s]+$/.test(name)) {
        anomalies.push({ type: 'name_anomaly', severity: 'warning', message: 'Name contains only numbers', field: 'name' });
      }
    } else if (!record.graveIdentifier) {
      anomalies.push({ type: 'completeness_anomaly', severity: 'critical', message: 'No name or grave identifier', field: 'name' });
    }

    // Coordinate checks
    if (record.latitude !== undefined && record.latitude !== null) {
      if (record.latitude < -90 || record.latitude > 90) {
        anomalies.push({ type: 'coordinate_anomaly', severity: 'critical', message: `Invalid latitude: ${record.latitude}`, field: 'latitude' });
      }
    }
    if (record.longitude !== undefined && record.longitude !== null) {
      if (record.longitude < -180 || record.longitude > 180) {
        anomalies.push({ type: 'coordinate_anomaly', severity: 'critical', message: `Invalid longitude: ${record.longitude}`, field: 'longitude' });
      }
    }

    // Completeness
    if (!record.birthDate && !record.deathDate) {
      anomalies.push({ type: 'completeness_anomaly', severity: 'warning', message: 'No birth or death date', field: 'deathDate' });
    }

    const severityOrder = { critical: 0, warning: 1, info: 2 };
    anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return jsonResponse({
      success: true,
      recordId: safeId,
      recordName: record.name || null,
      anomalyCount: anomalies.length,
      anomalies: anomalies,
      hasCritical: anomalies.some(a => a.severity === 'critical')
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to check record for anomalies',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.9: AI Import Quality Scoring Handlers ──

/**
 * POST /api/import/score
 * Body: { records: [...], sourceName: string }
 * Evaluates a batch of records and returns quality scores.
 *
 * Scoring dimensions:
 * - Completeness: % of essential fields filled (name, dates, cemetery)
 * - Coverage: % of optional fields filled (photos, inscriptions, sources, coordinates)
 * - Consistency: date validity checks, name format, ID uniqueness
 * - Overall: weighted average
 * - Recommendation: accept / review / reject
 */
async function handleImportQualityScore(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400, cors);
  }

  const records = body.records;
  const sourceName = body.sourceName || 'Unknown source';

  if (!Array.isArray(records) || records.length === 0) {
    return jsonResponse({ success: false, error: 'No records provided for scoring' }, 400, cors);
  }

  if (records.length > 1000) {
    return jsonResponse({ success: false, error: 'Too many records (max 1000 per batch)' }, 413, cors);
  }

  // Scoring
  const essentialFields = ['name', 'birthDate', 'deathDate', 'cemeteryId'];
  const optionalFields = ['photoRefs', 'photoRefs', 'inscription', 'sourceRefs', 'latitude', 'longitude', 'section', 'plot'];

  let totalCompleteness = 0;
  let totalCoverage = 0;
  let totalConsistency = 0;
  const recordScores = [];
  const errors = [];
  const warnings = [];
  const fieldCoverage = {};

  // Initialize field coverage tracking
  for (const f of [...essentialFields, ...optionalFields]) {
    fieldCoverage[f] = { filled: 0, total: records.length };
  }

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    let recCompleteness = 0;
    let recCoverage = 0;
    let recConsistency = 100;
    const recErrors = [];
    const recWarnings = [];

    // Check essential fields
    for (const field of essentialFields) {
      if (rec[field] !== undefined && rec[field] !== null && rec[field] !== '') {
        recCompleteness += 100 / essentialFields.length;
        fieldCoverage[field].filled++;
      } else {
        recWarnings.push(`Missing essential field: ${field}`);
      }
    }

    // Check optional fields
    for (const field of optionalFields) {
      // Handle both photoRef and photoRefs
      const checkField = field === 'photoRef' ? 'photoRefs' : field;
      if (rec[checkField] !== undefined && rec[checkField] !== null && rec[checkField] !== '') {
        if (Array.isArray(rec[checkField]) ? rec[checkField].length > 0 : true) {
          recCoverage += 100 / optionalFields.length;
          fieldCoverage[checkField].filled++;
        }
      }
    }

    // Consistency checks
    // Date validity: birth before death
    if (rec.birthDate && rec.deathDate) {
      const birthYear = parseInt(String(rec.birthDate).substring(0, 4));
      const deathYear = parseInt(String(rec.deathDate).substring(0, 4));
      if (!isNaN(birthYear) && !isNaN(deathYear)) {
        if (birthYear > deathYear) {
          recConsistency -= 25;
          recErrors.push('Birth date is after death date');
        } else if (deathYear - birthYear > 120) {
          recConsistency -= 10;
          recWarnings.push('Lifespan exceeds 120 years (verify dates)');
        }
        // Check for future dates
        const currentYear = new Date().getFullYear();
        if (birthYear > currentYear) {
          recConsistency -= 15;
          recErrors.push('Birth date is in the future');
        }
        if (deathYear > currentYear) {
          recConsistency -= 15;
          recErrors.push('Death date is in the future');
        }
      }
    }

    // Name format check
    if (rec.name) {
      if (rec.name.trim().length < 2) {
        recConsistency -= 10;
        recWarnings.push('Name is very short (less than 2 characters)');
      }
      if (rec.name === rec.name.toUpperCase() && rec.name.length > 3) {
        recWarnings.push('Name is all uppercase (consider title case)');
      }
    }

    // ID uniqueness (within batch)
    if (rec.id) {
      // Will be checked in batch-level dedup below
    }

    recConsistency = Math.max(0, recConsistency);

    totalCompleteness += recCompleteness;
    totalCoverage += recCoverage;
    totalConsistency += recConsistency;

    recordScores.push({
      index: i,
      id: rec.id || null,
      name: rec.name || null,
      completeness: Math.round(recCompleteness),
      coverage: Math.round(recCoverage),
      consistency: Math.round(recConsistency),
      overall: Math.round(recCompleteness * 0.4 + recCoverage * 0.3 + recConsistency * 0.3),
      errors: recErrors,
      warnings: recWarnings
    });

    for (const e of recErrors) errors.push({ recordIndex: i, error: e });
    for (const w of recWarnings) warnings.push({ recordIndex: i, warning: w });
  }

  // Check for duplicate IDs within batch
  const idCounts = {};
  for (const rec of records) {
    if (rec.id) {
      idCounts[rec.id] = (idCounts[rec.id] || 0) + 1;
    }
  }
  const duplicateIds = Object.entries(idCounts).filter(([_, count]) => count > 1);
  for (const [id, count] of duplicateIds) {
    errors.push({ error: `Duplicate ID "${id}" appears ${count} times in batch` });
  }

  // Compute batch averages
  const batchCompleteness = Math.round(totalCompleteness / records.length);
  const batchCoverage = Math.round(totalCoverage / records.length);
  const batchConsistency = Math.round(totalConsistency / records.length);
  const batchOverall = Math.round(batchCompleteness * 0.4 + batchCoverage * 0.3 + batchConsistency * 0.3);

  // Recommendation
  let recommendation;
  if (batchOverall >= 80 && errors.length === 0) {
    recommendation = 'accept';
  } else if (batchOverall >= 50) {
    recommendation = 'review';
  } else {
    recommendation = 'reject';
  }

  // Compute field coverage percentages
  const fieldCoveragePct = {};
  for (const [field, data] of Object.entries(fieldCoverage)) {
    fieldCoveragePct[field] = Math.round((data.filled / data.total) * 100);
  }

  return jsonResponse({
    success: true,
    sourceName: sourceName,
    batchSize: records.length,
    scores: {
      completeness: batchCompleteness,
      coverage: batchCoverage,
      consistency: batchConsistency,
      overall: batchOverall
    },
    recommendation: recommendation,
    fieldCoverage: fieldCoveragePct,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors: errors.slice(0, 50),
    warnings: warnings.slice(0, 50),
    recordScores: recordScores
  }, 200, cors);
}

/**
 * POST /api/import/batch-report
 * Body: { records: [...], sourceName: string, license: string }
 * Returns a full batch report with quality score + metadata summary.
 */
async function handleImportBatchReport(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400, cors);
  }

  const records = body.records;
  const sourceName = body.sourceName || 'Unknown source';
  const license = body.license || 'Not specified';

  if (!Array.isArray(records) || records.length === 0) {
    return jsonResponse({ success: false, error: 'No records provided' }, 400, cors);
  }

  // Get quality scores by calling the scoring logic inline
  // (reuse the same scoring but return a different structure)
  let qualityResult;
  try {
    const scoreResponse = await handleImportQualityScore(request, env, cors);
    const scoreText = await scoreResponse.text();
    qualityResult = JSON.parse(scoreText);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Failed to compute quality scores' }, 500, cors);
  }

  if (!qualityResult.success) {
    return jsonResponse(qualityResult, 500, cors);
  }

  // Build batch metadata summary
  const cemeteries = new Set();
  const countries = new Set();
  let withPhotos = 0;
  let withInscriptions = 0;
  let withSources = 0;
  let withCoordinates = 0;
  let dateRangeStart = null;
  let dateRangeEnd = null;

  for (const rec of records) {
    if (rec.cemeteryId) cemeteries.add(rec.cemeteryId);
    if (rec.countryCode) countries.add(rec.countryCode);
    if (rec.photoRefs && rec.photoRefs.length > 0) withPhotos++;
    if (rec.inscription && rec.inscription.trim()) withInscriptions++;
    if (rec.sourceRefs && rec.sourceRefs.length > 0) withSources++;
    if (rec.latitude && rec.longitude) withCoordinates++;

    if (rec.birthDate) {
      const y = parseInt(String(rec.birthDate).substring(0, 4));
      if (!isNaN(y) && (dateRangeStart === null || y < dateRangeStart)) dateRangeStart = y;
    }
    if (rec.deathDate) {
      const y = parseInt(String(rec.deathDate).substring(0, 4));
      if (!isNaN(y) && (dateRangeEnd === null || y > dateRangeEnd)) dateRangeEnd = y;
    }
  }

  return jsonResponse({
    success: true,
    batchReport: {
      sourceName: sourceName,
      license: license,
      batchSize: records.length,
      generatedAt: new Date().toISOString(),
      quality: {
        completeness: qualityResult.scores.completeness,
        coverage: qualityResult.scores.coverage,
        consistency: qualityResult.scores.consistency,
        overall: qualityResult.scores.overall,
        recommendation: qualityResult.recommendation
      },
      metadata: {
        uniqueCemeteries: cemeteries.size,
        uniqueCountries: countries.size,
        recordsWithPhotos: withPhotos,
        recordsWithInscriptions: withInscriptions,
        recordsWithSources: withSources,
        recordsWithCoordinates: withCoordinates,
        dateRange: { start: dateRangeStart, end: dateRangeEnd }
      },
      fieldCoverage: qualityResult.fieldCoverage,
      errorCount: qualityResult.errorCount,
      warningCount: qualityResult.warningCount
    }
  }, 200, cors);
}

// ── Phase 16.8: AI Record Enrichment Handlers ──

/**
 * GET /api/graves/:id/enrich
 * Analyzes a grave record and suggests missing field values:
 * - Parses full name into given/family components
 * - Estimates birth year from death date + age at death (if inscription has age)
 * - Suggests family connections based on same surname + same cemetery
 * - Suggests source references if missing
 */
async function handleRecordEnrichment(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid record ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      recordId: safeId,
      suggestions: [],
      message: 'GitHub not configured — no enrichment available'
    }, 200, cors);
  }

  try {
    const content = await readFile(`graves/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Record not found' }, 404, cors);
    }

    const record = JSON.parse(content);
    const suggestions = [];

    // ── Name parsing ──
    if (record.name && !record.givenNames && !record.familyName) {
      const parsed = parseName(record.name);
      if (parsed.given || parsed.family) {
        suggestions.push({
          field: 'givenNames',
          suggestedValue: parsed.given,
          confidence: parsed.given ? 'medium' : 'low',
          reason: 'Parsed from full name field'
        });
        suggestions.push({
          field: 'familyName',
          suggestedValue: parsed.family,
          confidence: parsed.family ? 'medium' : 'low',
          reason: 'Parsed from full name field'
        });
      }
    }

    // ── Birth year estimation from death age ──
    if (!record.birthDate && record.deathDate && record.inscription) {
      const ageMatch = record.inscription.match(/(?:aged?|age|died at)\s+(\d{1,3})/i);
      if (ageMatch) {
        const age = parseInt(ageMatch[1]);
        if (age >= 0 && age <= 120) {
          const deathYear = parseInt(record.deathDate.substring(0, 4));
          if (!isNaN(deathYear)) {
            const birthYear = deathYear - age;
            suggestions.push({
              field: 'birthDate',
              suggestedValue: String(birthYear),
              confidence: 'high',
              reason: `Estimated from death date (${deathYear}) minus age at death (${age}) found in inscription`
            });
          }
        }
      }
    }

    // ── Birth year estimation from death date + typical lifespan ──
    if (!record.birthDate && record.deathDate && !record.inscription) {
      const deathYear = parseInt(record.deathDate.substring(0, 4));
      if (!isNaN(deathYear)) {
        // Use median life expectancy as rough estimate
        const estimatedBirth = deathYear - 70;
        suggestions.push({
          field: 'birthDate',
          suggestedValue: `~${estimatedBirth}`,
          confidence: 'low',
          reason: 'Rough estimate assuming ~70 year lifespan (no age data available)'
        });
      }
    }

    // ── Family connection suggestions ──
    if (record.cemeteryId && record.name) {
      const familyName = record.familyName || parseName(record.name).family;
      if (familyName) {
        const files = await listFiles('graves', env);
        const connections = [];

        for (const file of files) {
          if (file === `${safeId}.json`) continue;
          try {
            const otherContent = await readFile(`graves/${file}`, env);
            if (!otherContent) continue;
            const other = JSON.parse(otherContent);
          if (other.status !== 'published') continue;
            if (other.cemeteryId !== record.cemeteryId) continue;

            const otherFamily = other.familyName || parseName(other.name || '').family;
            if (otherFamily && otherFamily.toLowerCase() === familyName.toLowerCase()) {
              // Check for date proximity (within 50 years)
              let dateProximity = false;
              if (record.deathDate && other.deathDate) {
                const y1 = parseInt(record.deathDate.substring(0, 4));
                const y2 = parseInt(other.deathDate.substring(0, 4));
                if (!isNaN(y1) && !isNaN(y2) && Math.abs(y1 - y2) <= 50) {
                  dateProximity = true;
                }
              }

              // Check for adjacent plots
              let adjacentPlot = false;
              if (record.section && other.section && record.section === other.section) {
                if (record.plot && other.plot && record.plot !== other.plot) {
                  adjacentPlot = true; // Same section, different plot = potentially related
                }
              }

              connections.push({
                recordId: other.id || file.replace('.json', ''),
                name: other.name,
                relationship: 'Possible relative',
                confidence: dateProximity && adjacentPlot ? 'high' : dateProximity ? 'medium' : 'low',
                reasons: [
                  `Same surname: ${familyName}`,
                  dateProximity ? 'Death dates within 50 years' : null,
                  adjacentPlot ? 'Same cemetery section' : null
                ].filter(Boolean)
              });
            }
          } catch (e) { /* skip */ }
        }

        if (connections.length > 0) {
          // Sort by confidence then limit to 10
          const confOrder = { high: 0, medium: 1, low: 2 };
          connections.sort((a, b) => confOrder[a.confidence] - confOrder[b.confidence]);
          suggestions.push({
            field: 'familyConnections',
            suggestedValue: connections.slice(0, 10),
            confidence: connections[0].confidence,
            reason: `${connections.length} potential family connection${connections.length !== 1 ? 's' : ''} found by surname matching`
          });
        }
      }
    }

    // ── Source reference suggestion ──
    if ((!record.sourceRefs || record.sourceRefs.length === 0) && record.cemeteryId) {
      suggestions.push({
        field: 'sourceRefs',
        suggestedValue: ['community-attribution-needed'],
        confidence: 'low',
        reason: 'Record has no source references — consider adding attribution'
      });
    }

    // ── Inscription transcription suggestion ──
    if (!record.inscription && record.photoRefs && record.photoRefs.length > 0) {
      suggestions.push({
        field: 'inscription',
        suggestedValue: null,
        confidence: 'medium',
        reason: 'Record has photos but no transcribed inscription — consider transcribing'
      });
    }

    return jsonResponse({
      success: true,
      recordId: safeId,
      recordName: record.name || null,
      suggestionsCount: suggestions.length,
      suggestions: suggestions
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to enrich record',
      message: error.message
    }, 500, cors);
  }
}

/**
 * Parses a full name string into given names and family name.
 * Handles Western name order (given ... family) and Chinese name order
 * (family + given for 2-3 character names).
 */
function parseName(fullName) {
  if (!fullName || typeof fullName !== 'string') return { given: null, family: null };

  const name = fullName.trim();
  if (!name) return { given: null, family: null };

  // Check for Chinese characters (CJK Unified Ideographs)
  const isChinese = /[\u4e00-\u9fff]/.test(name);

  if (isChinese) {
    // Chinese names: typically 2-3 characters, family name is first 1-2 chars
    if (name.length <= 2) {
      return { given: name.substring(1), family: name.substring(0, 1) };
    } else if (name.length === 3) {
      // Could be 1+2 or 2+1 — most Chinese surnames are 1 char
      return { given: name.substring(1), family: name.substring(0, 1) };
    } else if (name.length === 4) {
      // Could be 2+2 (compound surname) or 1+3
      return { given: name.substring(2), family: name.substring(0, 2) };
    } else {
      // Longer names: assume first 2 chars are family name
      return { given: name.substring(2), family: name.substring(0, 2) };
    }
  }

  // Western names: split by spaces, last part is family name
  const parts = name.split(/\s+/);
  if (parts.length === 1) {
    return { given: null, family: parts[0] };
  } else if (parts.length === 2) {
    return { given: parts[0], family: parts[1] };
  } else {
    // Handle middle names: given = all but last, family = last
    // But handle suffixes like Jr., Sr., III
    const lastTwo = parts.slice(-2).join(' ');
    const suffixes = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'Jr', 'Sr'];
    if (suffixes.includes(parts[parts.length - 1])) {
      return { given: parts.slice(0, -2).join(' '), family: parts[parts.length - 2] };
    }
    return { given: parts.slice(0, -1).join(' '), family: parts[parts.length - 1] };
  }
}

/**
 * GET /api/cemeteries/:id/connections
 * Returns a network of family connections within a cemetery based on
 * surname matching, date proximity, and plot adjacency.
 */
async function handleCemeteryConnections(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      connections: [],
      familyGroups: [],
      message: 'GitHub not configured — no connections available'
    }, 200, cors);
  }

  try {
    const files = await listFiles('graves', env);
    const records = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId !== safeId && record.cemeteryId !== id) continue;
        records.push(record);
      } catch (e) { /* skip */ }
    }

    // Group by surname
    const surnameGroups = {};
    for (const rec of records) {
      const familyName = rec.familyName || parseName(rec.name || '').family;
      if (!familyName) continue;
      const key = familyName.toLowerCase();
      if (!surnameGroups[key]) surnameGroups[key] = [];
      surnameGroups[key].push(rec);
    }

    // Build connection pairs and family groups
    const connections = [];
    const familyGroups = [];

    for (const [surname, group] of Object.entries(surnameGroups)) {
      if (group.length < 2) continue;

      // Create family group
      const familyGroup = {
        surname: group[0].familyName || surname,
        memberCount: group.length,
        members: group.map(r => ({
          id: r.id,
          name: r.name,
          birthDate: r.birthDate || null,
          deathDate: r.deathDate || null,
          section: r.section || null,
          plot: r.plot || null
        })).sort((a, b) => {
          const aYear = a.deathDate ? parseInt(a.deathDate.substring(0, 4)) : 9999;
          const bYear = b.deathDate ? parseInt(b.deathDate.substring(0, 4)) : 9999;
          return aYear - bYear;
        })
      };
      familyGroups.push(familyGroup);

      // Build pairwise connections
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];

          let confidence = 'low';
          const reasons = [`Same surname: ${surname}`];

          // Date proximity
          if (a.deathDate && b.deathDate) {
            const y1 = parseInt(a.deathDate.substring(0, 4));
            const y2 = parseInt(b.deathDate.substring(0, 4));
            if (!isNaN(y1) && !isNaN(y2)) {
              const diff = Math.abs(y1 - y2);
              if (diff <= 10) {
                confidence = 'high';
                reasons.push(`Death dates within ${diff} years`);
              } else if (diff <= 30) {
                confidence = 'medium';
                reasons.push(`Death dates within ${diff} years`);
              }
            }
          }

          // Same section
          if (a.section && b.section && a.section === b.section) {
            if (confidence === 'low') confidence = 'medium';
            if (confidence === 'medium') confidence = 'high';
            reasons.push('Same cemetery section');
            if (a.plot && b.plot && a.plot === b.plot) {
              reasons.push('Same plot');
              confidence = 'high';
            }
          }

          connections.push({
            sourceId: a.id,
            targetId: b.id,
            sourceName: a.name,
            targetName: b.name,
            relationship: 'Possible relative (same surname)',
            confidence: confidence,
            reasons: reasons
          });
        }
      }
    }

    // Sort connections by confidence
    const confOrder = { high: 0, medium: 1, low: 2 };
    connections.sort((a, b) => confOrder[a.confidence] - confOrder[b.confidence]);

    // Sort family groups by member count
    familyGroups.sort((a, b) => b.memberCount - a.memberCount);

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      totalRecords: records.length,
      totalConnections: connections.length,
      totalFamilyGroups: familyGroups.length,
      connections: connections.slice(0, 50),
      familyGroups: familyGroups.slice(0, 20)
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to build connections',
      message: error.message
    }, 500, cors);
  }
}

// ── Phase 16.7: Cemetery Intelligence Handlers ──

/**
 * GET /api/cemeteries/:id/stats
 * Returns statistical summary of a cemetery's grave records.
 */
async function handleCemeteryStats(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    // Return placeholder stats when GitHub not configured
    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      totalRecords: 0,
      verifiedRecords: 0,
      communitySubmitted: 0,
      unverified: 0,
      withPhotos: 0,
      withInscriptions: 0,
      withSources: 0,
      dateRange: { earliest: null, latest: null },
      decadeBreakdown: {},
      topNames: [],
      typeBreakdown: {},
      message: 'GitHub not configured — showing empty stats'
    }, 200, cors);
  }

  try {
    // List all grave files
    const files = await listFiles('graves', env);
    const cemeteryRecords = [];

    // Filter and parse records belonging to this cemetery
    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId === safeId || record.cemeteryId === id) {
          cemeteryRecords.push(record);
        }
      } catch (e) { /* skip malformed records */ }
    }

    // Compute statistics
    const total = cemeteryRecords.length;
    let verified = 0, community = 0, unverified = 0;
    let withPhotos = 0, withInscriptions = 0, withSources = 0;
    let earliestDate = null, latestDate = null;
    const decadeCounts = {};
    const nameCounts = {};
    const typeCounts = {};

    for (const rec of cemeteryRecords) {
      // Verification status
      const vStatus = rec.verificationStatus || 'unverified';
      if (vStatus === 'verified') verified++;
      else if (vStatus === 'community_submitted') community++;
      else unverified++;

      // Content flags
      if (rec.photoRefs && rec.photoRefs.length > 0) withPhotos++;
      if (rec.inscription && rec.inscription.trim()) withInscriptions++;
      if (rec.sourceRefs && rec.sourceRefs.length > 0) withSources++;

      // Date range
      if (rec.birthDate) {
        const year = parseInt(rec.birthDate.substring(0, 4));
        if (!isNaN(year)) {
          if (earliestDate === null || year < earliestDate) earliestDate = year;
          if (latestDate === null || year > latestDate) latestDate = year;
          const decade = Math.floor(year / 10) * 10;
          decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
        }
      }
      if (rec.deathDate) {
        const year = parseInt(rec.deathDate.substring(0, 4));
        if (!isNaN(year)) {
          if (earliestDate === null || year < earliestDate) earliestDate = year;
          if (latestDate === null || year > latestDate) latestDate = year;
          const decade = Math.floor(year / 10) * 10;
          decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
        }
      }

      // Name frequency
      if (rec.name) {
        const name = rec.name.trim();
        nameCounts[name] = (nameCounts[name] || 0) + 1;
      }

      // Cemetery type (if available on record)
      if (rec.cemeteryType) {
        typeCounts[rec.cemeteryType] = (typeCounts[rec.cemeteryType] || 0) + 1;
      }
    }

    // Top 10 most common names
    const topNames = Object.entries(nameCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      totalRecords: total,
      verifiedRecords: verified,
      communitySubmitted: community,
      unverified: unverified,
      withPhotos: withPhotos,
      withInscriptions: withInscriptions,
      withSources: withSources,
      dateRange: { earliest: earliestDate, latest: latestDate },
      decadeBreakdown: decadeCounts,
      topNames: topNames,
      typeBreakdown: typeCounts
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to compute cemetery stats',
      message: error.message
    }, 500, cors);
  }
}

/**
 * GET /api/cemeteries/:id/summary
 * Returns an auto-generated narrative summary of a cemetery.
 */
async function handleCemeterySummary(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  // First get the cemetery record itself
 let cemeteryName = safeId;
  let cemeteryLocation = '';
  let cemeteryType = '';
  let establishedDate = '';

  if (env.GITHUB_APP_ID) {
    try {
      const cemContent = await readFile(`cemeteries/${safeId}.json`, env);
      if (cemContent) {
        const cem = JSON.parse(cemContent);
        cemeteryName = cem.name || cem.localName || safeId;
        cemeteryLocation = [cem.city, cem.region, cem.country].filter(Boolean).join(', ');
        cemeteryType = cem.cemeteryType || '';
        establishedDate = cem.establishedDate || '';
      }
    } catch (e) { /* use defaults */ }
  }

  // Get stats (reuse the stats handler logic)
  let stats = null;
  if (env.GITHUB_APP_ID) {
    try {
      const statsResponse = await handleCemeteryStats(safeId, request, env, cors);
      const statsText = await statsResponse.text();
      stats = JSON.parse(statsText);
    } catch (e) { /* stats unavailable */ }
  }

  // Generate narrative summary
  const parts = [];

  if (stats && stats.success && stats.totalRecords > 0) {
    parts.push(`${cemeteryName} contains ${stats.totalRecords} published grave record${stats.totalRecords !== 1 ? 's' : ''}.`);

    if (stats.verifiedRecords > 0) {
      parts.push(`${stats.verifiedRecords} record${stats.verifiedRecords !== 1 ? 's are' : ' is'} verified, ${stats.communitySubmitted} community-submitted, and ${stats.unverified} unverified.`);
    }

    if (stats.dateRange.earliest && stats.dateRange.latest) {
      if (stats.dateRange.earliest === stats.dateRange.latest) {
        parts.push(`All records date from ${stats.dateRange.earliest}.`);
      } else {
        parts.push(`Records span from ${stats.dateRange.earliest} to ${stats.dateRange.latest}.`);
      }
    }

    if (stats.withPhotos > 0) {
      parts.push(`${stats.withPhotos} record${stats.withPhotos !== 1 ? 's have' : ' has'} photos.`);
    }

    if (stats.withInscriptions > 0) {
      parts.push(`${stats.withInscriptions} record${stats.withInscriptions !== 1 ? 's include' : ' includes'} transcribed inscriptions.`);
    }

    if (stats.topNames && stats.topNames.length > 0) {
      const top3 = stats.topNames.slice(0, 3).map(t => t.name).join(', ');
      parts.push(`Common names include: ${top3}.`);
    }
  } else {
    parts.push(`${cemeteryName} is a cemetery${cemeteryLocation ? ' located in ' + cemeteryLocation : ''}.`);
    parts.push('No published records are available yet.');
  }

  if (cemeteryType) {
    parts.push(`It is classified as a ${cemeteryType} cemetery.`);
  }

  if (establishedDate) {
    parts.push(`Established in ${establishedDate}.`);
  }

  const summary = parts.join(' ');

  return jsonResponse({
    success: true,
    cemeteryId: safeId,
    cemeteryName: cemeteryName,
    location: cemeteryLocation,
    summary: summary,
    stats: stats && stats.success ? {
      totalRecords: stats.totalRecords,
      verifiedRecords: stats.verifiedRecords,
      dateRange: stats.dateRange
    } : null
  }, 200, cors);
}

/**
 * GET /api/cemeteries/:id/duplicates
 * Detects potential duplicate person records within a cemetery.
 * Uses name + birth/death date proximity matching.
 */
async function handleCemeteryDuplicates(id, request, env, cors) {
  const safeId = sanitizePathSegment(id);
  if (!safeId || safeId !== id) {
    return jsonResponse({ success: false, error: 'Invalid cemetery ID' }, 400, cors);
  }

  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      duplicates: [],
      message: 'GitHub not configured — no duplicates to check'
    }, 200, cors);
  }

  try {
    // List all grave files and filter to this cemetery
    const files = await listFiles('graves', env);
    const records = [];

    for (const file of files) {
      try {
        const content = await readFile(`graves/${file}`, env);
        if (!content) continue;
        const record = JSON.parse(content);
        if (record.status !== 'published') continue;
        if (record.cemeteryId === safeId || record.cemeteryId === id) {
          records.push(record);
        }
      } catch (e) { /* skip */ }
    }

    // Find potential duplicates
    const duplicates = [];
    const seen = new Set();

    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        const a = records[i];
        const b = records[j];

        // Skip if already paired
        const pairKey = [a.id, b.id].sort().join('|');
        if (seen.has(pairKey)) continue;

        let score = 0;
        let reasons = [];

        // Name similarity (exact match = high score)
        if (a.name && b.name) {
          if (a.name.toLowerCase() === b.name.toLowerCase()) {
            score += 50;
            reasons.push('Exact name match');
          } else {
            // Levenshtein distance check
            const dist = levenshtein(a.name.toLowerCase(), b.name.toLowerCase());
            const maxLen = Math.max(a.name.length, b.name.length);
            const similarity = maxLen > 0 ? (1 - dist / maxLen) : 0;
            if (similarity > 0.85) {
              score += 30;
              reasons.push(`Very similar name (${Math.round(similarity * 100)}% match)`);
            } else if (similarity > 0.7) {
              score += 15;
              reasons.push(`Similar name (${Math.round(similarity * 100)}% match)`);
            }
          }
        }

        // Birth date match
        if (a.birthDate && b.birthDate) {
          if (a.birthDate === b.birthDate) {
            score += 25;
            reasons.push('Same birth date');
          } else if (a.birthDate.substring(0, 4) === b.birthDate.substring(0, 4)) {
            score += 10;
            reasons.push('Same birth year');
          }
        }

        // Death date match
        if (a.deathDate && b.deathDate) {
          if (a.deathDate === b.deathDate) {
            score += 25;
            reasons.push('Same death date');
          } else if (a.deathDate.substring(0, 4) === b.deathDate.substring(0, 4)) {
            score += 10;
            reasons.push('Same death year');
          }
        }

        // Same plot/section
        if (a.section && b.section && a.section === b.section) {
          if (a.plot && b.plot && a.plot === b.plot) {
            score += 20;
            reasons.push('Same section and plot');
          } else {
            score += 5;
            reasons.push('Same section');
          }
        }

        // Only report if score is high enough
        if (score >= 40) {
          seen.add(pairKey);
          duplicates.push({
            recordA: { id: a.id, name: a.name, birthDate: a.birthDate, deathDate: a.deathDate },
            recordB: { id: b.id, name: b.name, birthDate: b.birthDate, deathDate: b.deathDate },
            score: score,
            reasons: reasons
          });
        }
      }
    }

    // Sort by score descending
    duplicates.sort((a, b) => b.score - a.score);

    return jsonResponse({
      success: true,
      cemeteryId: safeId,
      totalChecked: records.length,
      duplicatesFound: duplicates.length,
      duplicates: duplicates
    }, 200, cors);
  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to check duplicates',
      message: error.message
    }, 500, cors);
  }
}

/**
 * Simple Levenshtein distance for duplicate name matching.
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

function jsonResponse(data, status, cors = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...cors,
  };
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
        const content = await readFile(`users/${file.name}`, env);
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

  const draftAuth = await Phase6A.authorizeDraftAccess(env, id, userId);
  if (!draftAuth.authorized) return jsonResponse({ success: false, error: draftAuth.reason }, 403, cors);

  const draft = draftAuth.draft;

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
    // 1) Query internal GraveAtlas database (GitHub repo)
    const internalResult = await Phase7A.globalSearch(env, params);

    // 2) Query external official sources in parallel (NEA, OSM, Wikidata)
    const queryText = params.get('q') || '';
    let externalResults = [];
    let sourcesUsed = [];

    if (queryText.length >= 2) {
      try {
        const externalRaw = await queryAllSources(queryText, env);

        for (const source of externalRaw) {
          const sourceRecords = source.records || [];
          sourcesUsed.push({
            sourceId: source.sourceId,
            sourceName: source.sourceName,
            status: source.status || 'ok',
            recordCount: sourceRecords.length,
            fromCache: source.fromCache || false,
            reason: source.reason || null
          });

          // Convert external records to SearchResult format
          for (const record of sourceRecords) {
            // Bukit Brown returns person records, not cemetery records
            const isPersonRecord = record.personName && source.sourceId === 'bukit-brown';
            const recName = isPersonRecord ? record.personName : (record.cemetery || record.name || 'Unknown');
            const nameLower = recName.toLowerCase();
            const qLower = queryText.toLowerCase();

            // Score: exact substring match = 0.8, word match = 0.5, otherwise 0.3
            let score = 0.3;
            if (nameLower.includes(qLower) || qLower.includes(nameLower)) {
              score = 0.8;
            } else {
              const qWords = qLower.split(/\s+/).filter(function(w) { return w.length >= 3; });
              const matched = qWords.some(function(word) { return nameLower.includes(word); });
              if (matched) score = 0.5;
            }

            if (isPersonRecord) {
              // Person/grave record
              externalResults.push({
                type: 'person',
                category: 'people',
                id: 'ext-' + (record.externalRecordId || record.id || Math.random().toString(36).substr(2, 9)),
                name: recName,
                cemetery: record.cemetery || 'Bukit Brown Cemetery',
                cemeteryId: null,
                country: 'Singapore',
                region: null,
                city: 'Singapore',
                birthDate: record.birthDate || null,
                deathDate: record.deathDate || null,
                latitude: record.latitude || null,
                longitude: record.longitude || null,
                section: record.section || null,
                plot: record.plot || null,
                source: source.sourceId,
                sourceName: source.sourceName,
                sourceOrganization: record.sourceOrganization || null,
                verificationStatus: 'verified',
                license: record.license || null,
                isExternal: true,
                recordUrl: record.recordUrl || null,
                score: score
              });
            } else {
              // Cemetery/facility record
              externalResults.push({
                type: 'cemetery',
                category: 'cemeteries',
                id: 'ext-' + (record.externalRecordId || record.id || Math.random().toString(36).substr(2, 9)),
                name: recName,
                country: record.country || 'Singapore',
                region: record.region || null,
                city: record.city || null,
                latitude: record.latitude || null,
                longitude: record.longitude || null,
                source: source.sourceId,
                sourceName: source.sourceName,
                sourceOrganization: record.sourceOrganization || null,
                verificationStatus: 'verified',
                license: record.license || null,
                isExternal: true,
                recordUrl: record.recordUrl || null,
                score: score
              });
            }
          }
        }
      } catch (extError) {
        sourcesUsed.push({
          sourceId: 'external',
          sourceName: 'External Sources',
          status: 'error',
          recordCount: 0,
          reason: extError.message
        });
      }
    }

    // 3) Merge internal + external results
    const allResults = internalResult.results.concat(externalResults);

    // Sort: internal results (higher scores) first, then external by relevance
    allResults.sort(function(a, b) { return (b.score || 0) - (a.score || 0); });

    // Re-paginate merged results
    const page = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('pageSize') || '20', 10);
    const total = allResults.length;
    const offset = (page - 1) * pageSize;
    const paged = allResults.slice(offset, offset + pageSize);
    const hasMore = offset + pageSize < total;

    // Recalculate category counts across all results
    const categories = {};
    for (const r of allResults) {
      categories[r.category] = (categories[r.category] || 0) + 1;
    }

    return jsonResponse({
      success: true,
      results: paged,
      categories,
      count: paged.length,
      total,
      page,
      pageSize,
      hasMore,
      query: params.get('q') || '',
      sources: sourcesUsed
    }, 200, cors);
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
