/**
 * GraveAtlas Phase 4A — Publication Pipeline, Retry, Change Diff
 *
 * Adds:
 * - Publication states: QUEUED, PUBLISHING, PUBLISHED, FAILED, RETRYING
 * - Safe retry policy (max 3 attempts, exponential backoff)
 * - Change diff generation (before/after comparison)
 * - GitHub rate limit detection and handling
 * - Data merge safety (conflict detection before write)
 * - Mass change protection (batch size limits)
 * - Publication queue tracking
 * - Dataset versioning (schema version field)
 */

import { readFile, writeFile, deleteFile } from './github.js';

// ── Publication states ──

const PUB_STATE_QUEUED = 'QUEUED';
const PUB_STATE_PUBLISHING = 'PUBLISHING';
const PUB_STATE_PUBLISHED = 'PUBLISHED';
const PUB_STATE_FAILED = 'FAILED';
const PUB_STATE_RETRYING = 'RETRYING';

const VALID_PUB_STATES = [
  PUB_STATE_QUEUED,
  PUB_STATE_PUBLISHING,
  PUB_STATE_PUBLISHED,
  PUB_STATE_FAILED,
  PUB_STATE_RETRYING,
];

const PUB_TRANSITIONS = {
  [PUB_STATE_QUEUED]: [PUB_STATE_PUBLISHING, PUB_STATE_FAILED],
  [PUB_STATE_PUBLISHING]: [PUB_STATE_PUBLISHED, PUB_STATE_FAILED],
  [PUB_STATE_PUBLISHED]: [],
  [PUB_STATE_FAILED]: [PUB_STATE_RETRYING, PUB_STATE_QUEUED],
  [PUB_STATE_RETRYING]: [PUB_STATE_PUBLISHING, PUB_STATE_FAILED],
};

// ── Retry policy ──

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000; // 1s, 2s, 4s

// ── Mass change protection ──

const MAX_PUBLICATION_BATCH_SIZE = 50;

// ── Schema versioning ──

const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * Generates a change diff between old and new record states.
 * Returns a structured diff showing what fields changed.
 */
function generateChangeDiff(oldRecord, newRecord) {
  const diff = {
    added: {},
    modified: {},
    removed: {},
    unchanged: [],
  };

  const allKeys = new Set([
    ...Object.keys(oldRecord || {}),
    ...Object.keys(newRecord || {}),
  ]);

  for (const key of allKeys) {
    const oldVal = oldRecord?.[key];
    const newVal = newRecord?.[key];

    if (oldVal === undefined && newVal !== undefined) {
      diff.added[key] = newVal;
    } else if (oldVal !== undefined && newVal === undefined) {
      diff.removed[key] = oldVal;
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff.modified[key] = { from: oldVal, to: newVal };
    } else {
      diff.unchanged.push(key);
    }
  }

  return diff;
}

/**
 * Summarizes a change diff for human-readable commit messages and audit logs.
 */
function summarizeDiff(diff) {
  const parts = [];
  if (Object.keys(diff.added).length > 0) {
    parts.push(`added: ${Object.keys(diff.added).join(', ')}`);
  }
  if (Object.keys(diff.modified).length > 0) {
    parts.push(`modified: ${Object.keys(diff.modified).join(', ')}`);
  }
  if (Object.keys(diff.removed).length > 0) {
    parts.push(`removed: ${Object.keys(diff.removed).join(', ')}`);
  }
  return parts.length > 0 ? parts.join('; ') : 'no changes';
}

/**
 * Detects GitHub API rate limiting from a response.
 * Returns { rateLimited, retryAfterSec, remaining }.
 */
function detectRateLimit(response) {
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '999', 10);
  const reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0', 10);

  if (response.status === 403 && remaining === 0) {
    const retryAfterSec = reset > 0 ? Math.max(1, reset - Math.floor(Date.now() / 1000)) : 60;
    return { rateLimited: true, retryAfterSec, remaining: 0 };
  }

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
    return { rateLimited: true, retryAfterSec: retryAfter, remaining };
  }

  return { rateLimited: false, retryAfterSec: 0, remaining };
}

/**
 * Categorizes GitHub API errors for appropriate handling.
 */
function categorizeGithubError(status, response) {
  if (status === 404) return { type: 'not_found', retryable: false, message: 'Resource not found' };
  if (status === 403) {
    const rl = detectRateLimit(response);
    if (rl.rateLimited) return { type: 'rate_limited', retryable: true, message: `Rate limited. Retry after ${rl.retryAfterSec}s`, retryAfterSec: rl.retryAfterSec };
    return { type: 'permission_denied', retryable: false, message: 'Permission denied' };
  }
  if (status === 409) return { type: 'conflict', retryable: true, message: 'Conflict — file changed since last read' };
  if (status === 422) return { type: 'validation', retryable: false, message: 'GitHub validation error' };
  if (status >= 500) return { type: 'server_error', retryable: true, message: 'GitHub server error' };
  return { type: 'unknown', retryable: false, message: `GitHub API error: ${status}` };
}

/**
 * Checks for merge conflicts before writing.
 * Reads the current file, compares with expected state, returns conflict info.
 */
async function checkMergeConflict(env, filePath, expectedRecord) {
  try {
    const existingContent = await readFile(filePath, env);
    if (!existingContent) return { hasConflict: false, existing: null };

    const existing = JSON.parse(existingContent);

    // If the existing record has a newer updatedAt, it's a potential conflict
    if (expectedRecord.updatedAt && existing.updatedAt) {
      const expectedTime = new Date(expectedRecord.updatedAt).getTime();
      const existingTime = new Date(existing.updatedAt).getTime();
      if (existingTime > expectedTime) {
        return {
          hasConflict: true,
          existing,
          reason: 'Existing record is newer than expected — possible concurrent modification',
        };
      }
    }

    // Check if the content is identical (idempotent write)
    if (JSON.stringify(existing) === JSON.stringify(expectedRecord)) {
      return { hasConflict: false, existing, isIdentical: true };
    }

    return { hasConflict: false, existing, isIdentical: false };
  } catch (e) {
    // File doesn't exist — no conflict
    return { hasConflict: false, existing: null };
  }
}

/**
 * Publication queue record.
 * Stored in publication-queue/{publicationId}.json
 */
async function createPublicationRecord(env, submissionId, recordType, recordData) {
  const pubId = `pub_${submissionId.replace('sub_', '').replace('contrib_', '')}`;
  const now = new Date().toISOString();

  const pubRecord = {
    id: pubId,
    submissionId,
    recordType,
    state: PUB_STATE_QUEUED,
    attempts: 0,
    maxAttempts: MAX_RETRY_ATTEMPTS,
    createdAt: now,
    updatedAt: now,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    recordData,
    lastError: null,
    publishedAt: null,
    commitSha: null,
  };

  await writeFile(env, `publication-queue/${pubId}.json`, JSON.stringify(pubRecord, null, 2), `queue: ${pubId} queued for publication`);
  return pubRecord;
}

/**
 * Updates a publication record's state.
 */
async function updatePublicationState(env, pubId, newState, extra = {}) {
  const filePath = `publication-queue/${pubId}.json`;

  let pubRecord;
  try {
    const content = await readFile(filePath, env);
    if (!content) return null;
    pubRecord = JSON.parse(content);
  } catch (e) {
    return null;
  }

  // Validate transition
  const allowed = PUB_TRANSITIONS[pubRecord.state];
  if (!allowed || !allowed.includes(newState)) {
    return { ...pubRecord, transitionError: `Invalid: ${pubRecord.state} → ${newState}` };
  }

  pubRecord.state = newState;
  pubRecord.updatedAt = new Date().toISOString();
  Object.assign(pubRecord, extra);

  await writeFile(env, filePath, JSON.stringify(pubRecord, null, 2), `pub: ${pubId} ${newState}`);
  return pubRecord;
}

/**
 * Safe publication with retry.
 * Attempts to publish a record, retrying on transient failures.
 * Preserves approved state on failure — never silently loses data.
 *
 * @param {Object} env - Worker env
 * @param {string} filePath - Target path in repo (e.g., "graves/grave_abc.json")
 * @param {Object} record - Record to publish
 * @param {string} commitMessage - Git commit message
 * @param {Object} pubRecord - Publication queue record (optional, for tracking)
 * @returns {Object} { success, attempts, error, commitSha }
 */
async function safePublish(env, filePath, record, commitMessage, pubRecord = null) {
  let attempts = 0;
  let lastError = null;

  while (attempts < MAX_RETRY_ATTEMPTS) {
    attempts++;
    const delay = attempts > 1 ? RETRY_BASE_DELAY_MS * Math.pow(2, attempts - 2) : 0;

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      // Update publication state if tracking
      if (pubRecord) {
        const state = attempts > 1 ? PUB_STATE_RETRYING : PUB_STATE_PUBLISHING;
        await updatePublicationState(env, pubRecord.id, state, { attempts });
      }

      // Check for merge conflict
      const mergeCheck = await checkMergeConflict(env, filePath, record);
      if (mergeCheck.hasConflict) {
        lastError = { type: 'conflict', message: mergeCheck.reason };
        // Conflicts are not retryable — need moderator intervention
        if (pubRecord) {
          await updatePublicationState(env, pubRecord.id, PUB_STATE_FAILED, {
            lastError: lastError.message,
          });
        }
        return { success: false, attempts, error: lastError, commitSha: null };
      }

      // Add schema version if not present
      if (!record.schemaVersion) {
        record.schemaVersion = CURRENT_SCHEMA_VERSION;
      }

      // Write the file
      await writeFile(filePath, JSON.stringify(record, null, 2), env, commitMessage);

      // Success
      if (pubRecord) {
        await updatePublicationState(env, pubRecord.id, PUB_STATE_PUBLISHED, {
          publishedAt: new Date().toISOString(),
        });
      }

      return { success: true, attempts, error: null, commitSha: null };
    } catch (error) {
      lastError = { type: 'exception', message: error.message || String(error) };

      // Check if it's a GitHub error we can parse
      const statusMatch = error.message?.match(/GitHub API error: (\d+)/);
      if (statusMatch) {
        const status = parseInt(statusMatch[1], 10);
        const categorized = categorizeGithubError(status, { headers: new Map(), status });

        lastError = { type: categorized.type, message: categorized.message };

        if (!categorized.retryable) {
          // Non-retryable — fail immediately
          if (pubRecord) {
            await updatePublicationState(env, pubRecord.id, PUB_STATE_FAILED, {
              lastError: lastError.message,
            });
          }
          return { success: false, attempts, error: lastError, commitSha: null };
        }

        // Rate limited — wait longer
        if (categorized.type === 'rate_limited' && categorized.retryAfterSec) {
          await new Promise(resolve => setTimeout(resolve, categorized.retryAfterSec * 1000));
        }
      }
    }
  }

  // All attempts exhausted
  if (pubRecord) {
    await updatePublicationState(env, pubRecord.id, PUB_STATE_FAILED, {
      lastError: lastError?.message || 'Max retries exhausted',
    });
  }

  return { success: false, attempts, error: lastError, commitSha: null };
}

/**
 * Validates batch size for mass changes.
 * Returns { allowed, reason }.
 */
function validateBatchSize(itemCount) {
  if (itemCount <= 0) return { allowed: false, reason: 'Empty batch' };
  if (itemCount > MAX_PUBLICATION_BATCH_SIZE) {
    return { allowed: false, reason: `Batch size ${itemCount} exceeds max ${MAX_PUBLICATION_BATCH_SIZE}` };
  }
  return { allowed: true, reason: null };
}

// ── Export ──

export {
  // Publication states
  PUB_STATE_QUEUED, PUB_STATE_PUBLISHING, PUB_STATE_PUBLISHED,
  PUB_STATE_FAILED, PUB_STATE_RETRYING,
  VALID_PUB_STATES, PUB_TRANSITIONS,
  // Retry policy
  MAX_RETRY_ATTEMPTS, RETRY_BASE_DELAY_MS,
  // Mass change protection
  MAX_PUBLICATION_BATCH_SIZE,
  // Schema versioning
  CURRENT_SCHEMA_VERSION,
  // Functions
  generateChangeDiff, summarizeDiff,
  detectRateLimit, categorizeGithubError,
  checkMergeConflict,
  createPublicationRecord, updatePublicationState,
  safePublish, validateBatchSize,
};
