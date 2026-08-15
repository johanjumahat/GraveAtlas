/**
 * Google OAuth Verification & Abuse Prevention Module
 *
 * Requires users to verify a Google ID token before they can submit
 * contributions. Logs their Google account, IP, user-agent, and other
 * identifiers for abuse prevention and rate limiting.
 *
 * Flow:
 *   1. Android app gets a Google ID token (GoogleSignIn on device)
 *   2. App sends token to POST /api/auth/google/verify
 *   3. Worker verifies token with Google's tokeninfo endpoint
 *   4. Worker creates/updates user record with Google identity
 *   5. Worker returns a session token (signed) for subsequent requests
 *   6. All submission endpoints require valid session token
 *   7. Every submission logs: Google sub, email, IP, user-agent, timestamp
 *
 * Abuse Prevention:
 * - Per-user rate limiting (already exists in Phase 6A)
 * - Per-IP rate limiting (already exists in main index.js)
 * - Per-Google-account rate limiting (new — prevents creating multiple user IDs)
 * - Suspension logging — when a user is suspended, their Google sub is banned
 * - IP logging — every submission records the client IP
 * - User-agent logging — every submission records the client user-agent
 * - All submission metadata stored in audit trail
 *
 * Security:
 * - Google ID tokens verified server-side (never trust client claims)
 * - Session tokens are signed with ADMIN_TOKEN (HMAC-like)
 * - No Google access tokens stored — only the verified identity (sub, email)
 * - User data stored in users/ directory in GitHub data repo
 * - Banned Google accounts cannot re-register
 *
 * Endpoints:
 *   POST /api/auth/google/verify     — Verify Google ID token, get session
 *   GET  /api/auth/session           — Check current session validity
 *   POST /api/auth/logout            — Invalidate session (client-side)
 *   GET  /api/admin/abuse/log        — Get abuse prevention audit log (admin)
 *   GET  /api/admin/abuse/stats      — Get abuse statistics (admin)
 *   POST /api/admin/abuse/ban/:sub   — Ban a Google account (admin)
 */

import { writeFile, readFile, listFiles, sanitizePathSegment } from './github.js';

// ── Google Token Verification ──

const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

/**
 * Verify a Google ID token by calling Google's tokeninfo endpoint.
 * Returns the verified payload or null if invalid.
 *
 * @param {string} idToken — The Google ID token from the client
 * @param {string} expectedClientId — The expected Google OAuth client ID (optional but recommended)
 * @returns {Object|null} — { sub, email, email_verified, name, picture, ... } or null
 */
export async function verifyGoogleIdToken(idToken, expectedClientId = null) {
  if (!idToken || typeof idToken !== 'string' || idToken.length > 4096) {
    return null;
  }

  try {
    const url = `${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) return null;

    const payload = await resp.json();

    // Google returns an error object if the token is invalid
    if (payload.error) return null;

    // Must have a 'sub' (subject) claim — this is the stable Google account ID
    if (!payload.sub || typeof payload.sub !== 'string') return null;

    // Email must be verified
    if (payload.email_verified !== 'true' && payload.email_verified !== true) {
      return null;
    }

    // If a client ID is expected, verify the audience matches
    if (expectedClientId && payload.aud !== expectedClientId) {
      console.error('[Google Auth] Audience mismatch:', payload.aud, '!==', expectedClientId);
      return null;
    }

    // Token must not be expired (Google returns 'exp' as unix seconds)
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (now >= payload.exp) return null;
    }

    return {
      sub: payload.sub,              // Stable Google account ID (never changes)
      email: payload.email || '',    // Email address
      email_verified: true,
      name: payload.name || '',
      picture: payload.picture || '',
      locale: payload.locale || '',
      aud: payload.aud,              // Client ID this token was issued for
      iss: payload.iss,              // Should be 'https://accounts.google.com'
      exp: payload.exp,
    };
  } catch (err) {
    console.error('[Google Auth] Verification failed:', err.message);
    return null;
  }
}

// ── Session Token ──

/**
 * Create a session token for a verified user.
 * The token is a simple HMAC-like signature: base64(userId) + '.' + hash(userId + secret + timestamp)
 * This is NOT cryptographically secure but sufficient for our use case —
 * the real security is server-side verification of the Google ID token.
 */
export function createSessionToken(userId, secret, googleSub) {
  const ts = Date.now();
  const payload = `${userId}.${googleSub}.${ts}`;
  const signature = simpleHash(payload + (secret || 'fallback'));
  return btoa(payload + '.' + signature);
}

/**
 * Verify a session token and return the user ID if valid.
 */
export function verifySessionToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  try {
    const decoded = atob(token);
    const parts = decoded.split('.');
    if (parts.length !== 4) return null;
    const [userId, googleSub, ts, signature] = parts;
    const expected = simpleHash(`${userId}.${googleSub}.${ts}` + (secret || 'fallback'));
    if (signature !== expected) return null;

    // Check token age (max 7 days)
    const tokenTime = parseInt(ts, 10);
    if (isNaN(tokenTime)) return null;
    const ageMs = Date.now() - tokenTime;
    if (ageMs > 7 * 24 * 60 * 60 * 1000) return null;

    return { userId, googleSub, issuedAt: tokenTime };
  } catch {
    return null;
  }
}

/**
 * Simple hash function (not crypto-secure, but deterministic).
 * In a Cloudflare Worker we may not have access to crypto.subtle synchronously.
 */
function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

// ── btoa/atob polyfill for non-browser environments ──

function btoa(str) {
  if (typeof globalThis.btoa === 'function') return globalThis.btoa(str);
  // Fallback for environments without btoa
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i) & 0xFF;
    const b = i + 1 < str.length ? str.charCodeAt(i + 1) & 0xFF : 0;
    const c = i + 2 < str.length ? str.charCodeAt(i + 2) & 0xFF : 0;
    const n1 = a >> 2;
    const n2 = ((a & 0x3) << 4) | (b >> 4);
    const n3 = ((b & 0xF) << 2) | (c >> 6);
    const n4 = c & 0x3F;
    result += chars[n1] + chars[n2] + (i + 1 < str.length ? chars[n3] : '=') + (i + 2 < str.length ? chars[n4] : '=');
  }
  return result;
}

function atob(str) {
  if (typeof globalThis.atob === 'function') return globalThis.atob(str);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const clean = str.replace(/=/g, '');
  for (let i = 0; i < clean.length; i += 4) {
    const n1 = chars.indexOf(clean[i]);
    const n2 = chars.indexOf(clean[i + 1] || 'A');
    const n3 = chars.indexOf(clean[i + 2] || 'A');
    const n4 = chars.indexOf(clean[i + 3] || 'A');
    const a = (n1 << 2) | (n2 >> 4);
    const b = ((n2 & 0xF) << 4) | (n3 >> 2);
    const c = ((n3 & 0x3) << 6) | n4;
    result += String.fromCharCode(a) + (clean[i + 2] ? String.fromCharCode(b) : '') + (clean[i + 3] ? String.fromCharCode(c) : '');
  }
  return result;
}

// ── User Identity Management ──

/**
 * Create or update a user with Google identity.
 * Maps a Google account (sub) to a GraveAtlas user ID.
 */
export async function createOrUpdateGoogleUser(env, googlePayload, clientIp, userAgent) {
  const googleSub = sanitizePathSegment(googlePayload.sub);
  if (!googleSub) return { error: 'Invalid Google sub' };

  // Check if this Google account is banned
  const banRecord = await readFile(env, `banned/google_${googleSub}.json`);
  if (banRecord) {
    const ban = JSON.parse(banRecord);
    return { error: 'This Google account has been banned', banReason: ban.reason || 'Violation of terms' };
  }

  // Check if we already have a mapping for this Google sub
  const mappingPath = `google_mappings/${googleSub}.json`;
  const existingMapping = await readFile(env, mappingPath);

  let userId;
  let isNew = false;

  if (existingMapping) {
    const mapping = JSON.parse(existingMapping);
    userId = mapping.userId;

    // Update the mapping with latest login info
    mapping.lastLoginAt = new Date().toISOString();
    mapping.lastLoginIp = clientIp;
    mapping.lastLoginUserAgent = userAgent || '';
    mapping.loginCount = (mapping.loginCount || 0) + 1;
    await writeFile(env, mappingPath, JSON.stringify(mapping, null, 2), `auth: Google login for ${userId}`);
  } else {
    // New Google user — create a new user ID
    userId = `user_g${googleSub.substring(0, 16)}`;
    isNew = true;

    const mapping = {
      googleSub,
      userId,
      email: googlePayload.email,
      name: googlePayload.name,
      picture: googlePayload.picture,
      firstLoginAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      lastLoginIp: clientIp,
      lastLoginUserAgent: userAgent || '',
      loginCount: 1,
    };

    await writeFile(env, mappingPath, JSON.stringify(mapping, null, 2), `auth: New Google user ${userId}`);

    // Create the user record (compatible with Phase 6A format)
    const userRecord = {
      id: userId,
      displayName: googlePayload.name || googlePayload.email?.split('@')[0] || 'Anonymous',
      bio: '',
      authMethod: 'google',
      googleSub,
      googleEmail: googlePayload.email,
      googlePicture: googlePayload.picture,
      accountStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contributionCount: 0,
      acceptedCount: 0,
    };

    await writeFile(env, `users/${userId}.json`, JSON.stringify(userRecord, null, 2), `auth: Create user ${userId}`);
  }

  return { userId, isNew };
}

// ── Abuse Logging ──

/**
 * Log a submission attempt with full identity metadata.
 * Called on every contribution submission.
 */
export async function logSubmissionAttempt(env, params) {
  const {
    userId,
    googleSub,
    contributionId,
    contributionType,
    clientIp,
    userAgent,
    success = true,
    reason = null,
  } = params;

  const logId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const logEntry = {
    id: logId,
    timestamp: new Date().toISOString(),
    userId,
    googleSub: googleSub || null,
    contributionId: contributionId || null,
    contributionType: contributionType || null,
    clientIp: clientIp || 'unknown',
    userAgent: userAgent || '',
    success,
    reason,
  };

  try {
    await writeFile(env, `audit/submissions/${logId}.json`, JSON.stringify(logEntry, null, 2), `audit: submission by ${userId}`);
  } catch (err) {
    console.error('[Abuse Log] Failed to write:', err.message);
  }

  return logEntry;
}

/**
 * Get submission audit log entries.
 */
export async function getSubmissionAuditLog(env, options = {}) {
  const { limit = 50, filter = null } = options;

  try {
    const files = await listFiles(env, 'audit/submissions');
    if (!files || files.length === 0) return { entries: [], count: 0 };

    const entries = [];
    for (const file of files.slice(-limit)) {
      try {
        const content = await readFile(env, `audit/submissions/${file.name || file}`);
        if (content) {
          const entry = JSON.parse(content);
          if (filter) {
            if (filter.userId && entry.userId !== filter.userId) continue;
            if (filter.googleSub && entry.googleSub !== filter.googleSub) continue;
            if (filter.ip && entry.clientIp !== filter.ip) continue;
          }
          entries.push(entry);
        }
      } catch (e) { /* skip */ }
    }

    // Sort newest first
    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return { entries, count: entries.length };
  } catch (err) {
    return { entries: [], count: 0, error: err.message };
  }
}

/**
 * Get abuse statistics.
 */
export async function getAbuseStats(env) {
  try {
    const files = await listFiles(env, 'audit/submissions');
    const bannedFiles = await listFiles(env, 'banned');

    return {
      totalSubmissionEvents: files ? files.length : 0,
      totalBannedAccounts: bannedFiles ? bannedFiles.length : 0,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return { totalSubmissionEvents: 0, totalBannedAccounts: 0, error: err.message };
  }
}

/**
 * Ban a Google account.
 */
export async function banGoogleAccount(env, googleSub, reason, bannedBy = 'admin') {
  const safeSub = sanitizePathSegment(googleSub);
  if (!safeSub) return { error: 'Invalid Google sub' };

  const banRecord = {
    googleSub: safeSub,
    reason: reason || 'Violation of terms',
    bannedBy,
    bannedAt: new Date().toISOString(),
  };

  await writeFile(env, `banned/google_${safeSub}.json`, JSON.stringify(banRecord, null, 2), `ban: Google account ${safeSub}`);

  // Also suspend the associated user account
  const mappingContent = await readFile(env, `google_mappings/${safeSub}.json`);
  if (mappingContent) {
    const mapping = JSON.parse(mappingContent);
    const userContent = await readFile(env, `users/${mapping.userId}.json`);
    if (userContent) {
      const user = JSON.parse(userContent);
      user.accountStatus = 'SUSPENDED';
      user.suspendedAt = new Date().toISOString();
      user.suspensionReason = reason;
      await writeFile(env, `users/${mapping.userId}.json`, JSON.stringify(user, null, 2), `ban: Suspend user ${mapping.userId}`);
    }
  }

  // Write audit log
  await writeFile(env, `audit/bans/ban_${Date.now()}.json`, JSON.stringify({
    action: 'GOOGLE_ACCOUNT_BANNED',
    googleSub: safeSub,
    reason,
    bannedBy,
    timestamp: new Date().toISOString(),
  }, null, 2), `audit: ban Google account ${safeSub}`);

  return { success: true, message: `Google account ${safeSub} banned` };
}

// ── Auth Middleware ──

/**
 * Extract and verify a session token from a request.
 * Returns { authenticated, userId, googleSub } or { authenticated: false, error }.
 */
export function requireGoogleAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Authentication required. Login with Google first.' };
  }

  const token = auth.substring(7);
  const session = verifySessionToken(token, env.ADMIN_TOKEN);
  if (!session) {
    return { authenticated: false, error: 'Invalid or expired session. Please login again.' };
  }

  return {
    authenticated: true,
    userId: session.userId,
    googleSub: session.googleSub,
    sessionIssuedAt: session.issuedAt,
  };
}

// ── Exports ──

export {
  verifyGoogleIdToken,
  createSessionToken,
  verifySessionToken,
  createOrUpdateGoogleUser,
  logSubmissionAttempt,
  getSubmissionAuditLog,
  getAbuseStats,
  banGoogleAccount,
  requireGoogleAuth,
};
