/**
 * GraveAtlas Phase 6A — Community Accounts & Contribution System
 *
 * Adds:
 * - User account foundation (user ID, display name, profile, status)
 * - User-scoped contributions (cemetery, grave, correction, photo)
 * - Drafts (save incomplete contributions)
 * - Contribution history with pagination
 * - Photo contribution workflow with rights declaration
 * - Authorization (users can only access their own data)
 * - Audit events for contribution actions
 * - Per-user rate limiting
 */

import { getToken, writeFile, readFile, listFiles, deleteFile, sanitizePathSegment } from './github.js';

// ── Constants ──

const USER_ID_PREFIX = 'user_';
const DRAFT_ID_PREFIX = 'draft_';
const CONTRIBUTION_ID_PREFIX = 'contrib_';
const PHOTO_ID_PREFIX = 'photo_';

const ACCOUNT_STATUS_ACTIVE = 'ACTIVE';
const ACCOUNT_STATUS_SUSPENDED = 'SUSPENDED';
const ACCOUNT_STATUS_DEACTIVATED = 'DEACTIVATED';

const SUBMISSION_STATUS_DRAFT = 'DRAFT';
const SUBMISSION_STATUS_PENDING_REVIEW = 'PENDING_REVIEW';
const SUBMISSION_STATUS_CHANGES_REQUESTED = 'CHANGES_REQUESTED';
const SUBMISSION_STATUS_APPROVED = 'APPROVED';
const SUBMISSION_STATUS_REJECTED = 'REJECTED';
const SUBMISSION_STATUS_CANCELLED = 'CANCELLED';
const SUBMISSION_STATUS_UNDER_REVIEW = 'UNDER_REVIEW';
const SUBMISSION_STATUS_PUBLISHED = 'PUBLISHED';
const SUBMISSION_STATUS_FAILED = 'FAILED';

const VALID_SUBMISSION_STATUSES = [
  SUBMISSION_STATUS_DRAFT,
  SUBMISSION_STATUS_PENDING_REVIEW,
  SUBMISSION_STATUS_UNDER_REVIEW,
  SUBMISSION_STATUS_CHANGES_REQUESTED,
  SUBMISSION_STATUS_APPROVED,
  SUBMISSION_STATUS_PUBLISHED,
  SUBMISSION_STATUS_REJECTED,
  SUBMISSION_STATUS_CANCELLED,
  SUBMISSION_STATUS_FAILED,
];

const VALID_SUBMISSION_TRANSITIONS = {
  [SUBMISSION_STATUS_DRAFT]: [SUBMISSION_STATUS_PENDING_REVIEW, SUBMISSION_STATUS_CANCELLED],
  [SUBMISSION_STATUS_PENDING_REVIEW]: [SUBMISSION_STATUS_UNDER_REVIEW, SUBMISSION_STATUS_CHANGES_REQUESTED, SUBMISSION_STATUS_APPROVED, SUBMISSION_STATUS_REJECTED, SUBMISSION_STATUS_CANCELLED],
  [SUBMISSION_STATUS_UNDER_REVIEW]: [SUBMISSION_STATUS_CHANGES_REQUESTED, SUBMISSION_STATUS_APPROVED, SUBMISSION_STATUS_REJECTED, SUBMISSION_STATUS_CANCELLED],
  [SUBMISSION_STATUS_CHANGES_REQUESTED]: [SUBMISSION_STATUS_PENDING_REVIEW, SUBMISSION_STATUS_CANCELLED],
  [SUBMISSION_STATUS_APPROVED]: [SUBMISSION_STATUS_PUBLISHED, SUBMISSION_STATUS_FAILED],
  [SUBMISSION_STATUS_PUBLISHED]: [],
  [SUBMISSION_STATUS_REJECTED]: [],
  [SUBMISSION_STATUS_CANCELLED]: [],
  [SUBMISSION_STATUS_FAILED]: [SUBMISSION_STATUS_PENDING_REVIEW], // retry after failure
};

const IMAGE_RIGHTS_OWN_WORK = 'OWN_WORK';
const IMAGE_RIGHTS_PERMISSION_GRANTED = 'PERMISSION_GRANTED';
const IMAGE_RIGHTS_OPEN_LICENSE = 'OPEN_LICENSE';
const IMAGE_RIGHTS_PUBLIC_DOMAIN = 'PUBLIC_DOMAIN';
const IMAGE_RIGHTS_UNKNOWN = 'UNKNOWN';

const VALID_IMAGE_RIGHTS = [
  IMAGE_RIGHTS_OWN_WORK,
  IMAGE_RIGHTS_PERMISSION_GRANTED,
  IMAGE_RIGHTS_OPEN_LICENSE,
  IMAGE_RIGHTS_PUBLIC_DOMAIN,
  IMAGE_RIGHTS_UNKNOWN,
];

const CONTRIBUTION_TYPES = ['cemetery', 'grave', 'correction', 'photo', 'report'];

const MAX_DISPLAY_NAME_LENGTH = 100;
const MAX_PROFILE_BIO_LENGTH = 500;
const MAX_DRAFT_TITLE_LENGTH = 200;
const MAX_PHOTO_DESC_LENGTH = 500;
const MAX_CONTRIBUTION_PAGE_SIZE = 50;
const DEFAULT_CONTRIBUTION_PAGE_SIZE = 20;

const USER_RATE_LIMIT_MAX = 30; // per user per hour
const USER_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// ── Audit event actions ──

const AUDIT_ACTIONS = {
  CONTRIBUTION_CREATED: 'CONTRIBUTION_CREATED',
  DRAFT_UPDATED: 'DRAFT_UPDATED',
  SUBMISSION_CREATED: 'SUBMISSION_CREATED',
  CORRECTION_CREATED: 'CORRECTION_CREATED',
  PHOTO_SUBMITTED: 'PHOTO_SUBMITTED',
  SUBMISSION_CANCELLED: 'SUBMISSION_CANCELLED',
  USER_REGISTERED: 'USER_REGISTERED',
  USER_PROFILE_UPDATED: 'USER_PROFILE_UPDATED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_REVOKED: 'SESSION_REVOKED',
  MODERATION_DECISION: 'MODERATION_DECISION',
  MODERATION_NOTE_ADDED: 'MODERATION_NOTE_ADDED',
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
};

// ── User roles ──

const USER_ROLE_USER = 'user';
const USER_ROLE_MODERATOR = 'moderator';
const USER_ROLE_ADMIN = 'admin';
const VALID_USER_ROLES = [USER_ROLE_USER, USER_ROLE_MODERATOR, USER_ROLE_ADMIN];

// ── Session management ──

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_ID_PREFIX = 'sess_';

// ── ID generation ──

function generateUserId() {
  const ts = Date.now().toString(36);
  const rand = crypto.getRandomValues(new Uint8Array(8));
  const randStr = Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${USER_ID_PREFIX}${ts}${randStr}`;
}

function generateDraftId() {
  const ts = Date.now().toString(36);
  const rand = crypto.getRandomValues(new Uint8Array(6));
  const randStr = Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${DRAFT_ID_PREFIX}${ts}${randStr}`;
}

function generateContributionId() {
  const ts = Date.now().toString(36);
  const rand = crypto.getRandomValues(new Uint8Array(6));
  const randStr = Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${CONTRIBUTION_ID_PREFIX}${ts}${randStr}`;
}

function generatePhotoId() {
  const ts = Date.now().toString(36);
  const rand = crypto.getRandomValues(new Uint8Array(6));
  const randStr = Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${PHOTO_ID_PREFIX}${ts}${randStr}`;
}

function generateAuditEventId() {
  const ts = Date.now().toString(36);
  const rand = crypto.getRandomValues(new Uint8Array(4));
  const randStr = Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('');
  return `audit_${ts}${randStr}`;
}

// ── User account validation ──

function validateDisplayName(name) {
  if (!name || typeof name !== 'string') return 'Display name is required';
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Display name cannot be empty';
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) return `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`;
  if (!/^[\p{L}\p{N}\p{P}\p{Z}\p{M}_\-. ]+$/u.test(trimmed)) return 'Display name contains invalid characters';
  return null;
}

function validateProfileBio(bio) {
  if (bio === undefined || bio === null) return null;
  if (typeof bio !== 'string') return 'Bio must be a string';
  if (bio.length > MAX_PROFILE_BIO_LENGTH) return `Bio must be ${MAX_PROFILE_BIO_LENGTH} characters or fewer`;
  return null;
}

function validateAccountStatus(status) {
  if (!status || typeof status !== 'string') return 'Account status is required';
  if (![ACCOUNT_STATUS_ACTIVE, ACCOUNT_STATUS_SUSPENDED, ACCOUNT_STATUS_DEACTIVATED].includes(status)) {
    return 'Invalid account status';
  }
  return null;
}

function validateSubmissionStatus(status) {
  if (!status || typeof status !== 'string') return 'Status is required';
  if (!VALID_SUBMISSION_STATUSES.includes(status)) return 'Invalid submission status';
  return null;
}

function validateImageRights(rights) {
  if (!rights || typeof rights !== 'string') return 'Image rights declaration is required';
  if (!VALID_IMAGE_RIGHTS.includes(rights)) return 'Invalid image rights declaration';
  return null;
}

function validateContributionType(type) {
  if (!type || typeof type !== 'string') return 'Contribution type is required';
  if (!CONTRIBUTION_TYPES.includes(type)) return 'Invalid contribution type';
  return null;
}

// ── Status transition validation ──

function isValidStatusTransition(from, to) {
  const allowed = VALID_SUBMISSION_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

// ── User account operations ──

async function createOrUpdateUser(env, userId, displayName, bio, authMethod) {
  const userDir = 'users';
  const userFile = `${userDir}/${userId}.json`;

  // Check if user already exists
  let existing = null;
  try {
    const content = await readFile(env, userFile);
    if (content) {
      existing = JSON.parse(content);
    }
  } catch (e) {
    // User doesn't exist yet
  }

  const now = new Date().toISOString();

  if (existing) {
    // Update existing user
    const updated = {
      ...existing,
      displayName: displayName || existing.displayName,
      bio: bio !== undefined ? bio : existing.bio,
      updatedAt: now,
    };
    await writeFile(env, userFile, JSON.stringify(updated, null, 2));
    return { user: updated, isNew: false };
  }

  // Create new user
  const user = {
    id: userId,
    displayName: displayName || 'Anonymous',
    bio: bio || '',
    authMethod: authMethod || 'anonymous',
    accountStatus: ACCOUNT_STATUS_ACTIVE,
    createdAt: now,
    updatedAt: now,
    contributionCount: 0,
    acceptedCount: 0,
  };

  await writeFile(env, userFile, JSON.stringify(user, null, 2));
  return { user, isNew: true };
}

async function getUser(env, userId) {
  try {
    const content = await readFile(env, `users/${userId}.json`);
    if (!content) return null;
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

function getPublicProfile(user) {
  if (!user) return null;
  return {
    id: user.id,
    displayName: user.displayName,
    bio: user.bio || '',
    joinedDate: user.createdAt,
    contributionCount: user.contributionCount || 0,
    acceptedCount: user.acceptedCount || 0,
  };
}

async function updateUserStats(env, userId, accepted) {
  const user = await getUser(env, userId);
  if (!user) return;

  user.contributionCount = (user.contributionCount || 0) + 1;
  if (accepted) {
    user.acceptedCount = (user.acceptedCount || 0) + 1;
  }
  user.updatedAt = new Date().toISOString();

  await writeFile(env, `users/${userId}.json`, JSON.stringify(user, null, 2));
}

async function setUserStatus(env, userId, newStatus) {
  const user = await getUser(env, userId);
  if (!user) return null;

  user.accountStatus = newStatus;
  user.updatedAt = new Date().toISOString();

  await writeFile(env, `users/${userId}.json`, JSON.stringify(user, null, 2));
  return user;
}

// ── Contribution operations ──

async function createContribution(env, userId, type, data, status = SUBMISSION_STATUS_PENDING_REVIEW) {
  const contributionId = generateContributionId();
  const now = new Date().toISOString();

  const contribution = {
    id: contributionId,
    userId,
    type,
    status,
    data,
    createdAt: now,
    updatedAt: now,
  };

  const filePath = `contributions/${contributionId}.json`;
  await writeFile(env, filePath, JSON.stringify(contribution, null, 2));

  return contribution;
}

async function getContribution(env, contributionId) {
  try {
    const content = await readFile(env, `contributions/${contributionId}.json`);
    if (!content) return null;
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

async function updateContribution(env, contributionId, updates) {
  const contribution = await getContribution(env, contributionId);
  if (!contribution) return null;

  const updated = {
    ...contribution,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await writeFile(env, `contributions/${contributionId}.json`, JSON.stringify(updated, null, 2));
  return updated;
}

async function listUserContributions(env, userId, options = {}) {
  const { page = 1, pageSize = DEFAULT_CONTRIBUTION_PAGE_SIZE, type, status } = options;
  const limit = Math.min(Math.max(pageSize, 1), MAX_CONTRIBUTION_PAGE_SIZE);
  const offset = (page - 1) * limit;

  try {
    const files = await listFiles(env, 'contributions/');
    if (!files || files.length === 0) {
      return { contributions: [], total: 0, page, pageSize: limit, hasMore: false };
    }

    const allContributions = [];
    for (const file of files) {
      try {
        const content = await readFile(env, `contributions/${file.name || file}`);
        if (content) {
          allContributions.push(JSON.parse(content));
        }
      } catch (e) {
        // Skip unreadable files
      }
    }

    // Filter by user
    let userContributions = allContributions.filter(c => c.userId === userId);

    // Filter by type
    if (type) {
      userContributions = userContributions.filter(c => c.type === type);
    }

    // Filter by status
    if (status) {
      userContributions = userContributions.filter(c => c.status === status);
    }

    // Sort by createdAt descending
    userContributions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = userContributions.length;
    const paginated = userContributions.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      contributions: paginated.map(c => ({
        id: c.id,
        type: c.type,
        status: c.status,
        title: c.data?.name || c.data?.cemeteryName || c.data?.targetId || 'Untitled',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        reviewerMessage: c.reviewerMessage || null,
      })),
      total,
      page,
      pageSize: limit,
      hasMore,
    };
  } catch (e) {
    return { contributions: [], total: 0, page, pageSize: limit, hasMore: false };
  }
}

// ── Draft operations ──

async function createDraft(env, userId, type, data) {
  const draftId = generateDraftId();
  const now = new Date().toISOString();

  const draft = {
    id: draftId,
    userId,
    type,
    status: SUBMISSION_STATUS_DRAFT,
    data,
    createdAt: now,
    updatedAt: now,
  };

  await writeFile(env, `drafts/${draftId}.json`, JSON.stringify(draft, null, 2));
  return draft;
}

async function getDraft(env, draftId) {
  try {
    const content = await readFile(env, `drafts/${draftId}.json`);
    if (!content) return null;
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

async function updateDraft(env, draftId, data) {
  const draft = await getDraft(env, draftId);
  if (!draft) return null;

  const updated = {
    ...draft,
    data,
    updatedAt: new Date().toISOString(),
  };

  await writeFile(env, `drafts/${draftId}.json`, JSON.stringify(updated, null, 2));
  return updated;
}

async function deleteDraft(env, draftId) {
  try {
    await deleteFile(env, `drafts/${draftId}.json`);
    return true;
  } catch (e) {
    return false;
  }
}

async function listUserDrafts(env, userId) {
  try {
    const files = await listFiles(env, 'drafts/');
    if (!files || files.length === 0) return { drafts: [] };

    const allDrafts = [];
    for (const file of files) {
      try {
        const content = await readFile(env, `drafts/${file.name || file}`);
        if (content) {
          const draft = JSON.parse(content);
          if (draft.userId === userId) {
            allDrafts.push(draft);
          }
        }
      } catch (e) {
        // Skip
      }
    }

    allDrafts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return {
      drafts: allDrafts.map(d => ({
        id: d.id,
        type: d.type,
        title: d.data?.name || d.data?.cemeteryName || 'Untitled Draft',
        updatedAt: d.updatedAt,
        createdAt: d.createdAt,
      })),
    };
  } catch (e) {
    return { drafts: [] };
  }
}

// ── Photo contribution operations ──

async function createPhotoContribution(env, userId, targetId, targetType, photoUrl, rights, description, sourceRef) {
  const photoId = generatePhotoId();
  const now = new Date().toISOString();

  const photo = {
    id: photoId,
    userId,
    targetId,
    targetType,
    photoUrl,
    rights,
    description: description || '',
    sourceRef: sourceRef || '',
    status: SUBMISSION_STATUS_PENDING_REVIEW,
    createdAt: now,
    updatedAt: now,
  };

  // If rights are UNKNOWN, force to review (already pending, but note it)
  if (rights === IMAGE_RIGHTS_UNKNOWN) {
    photo.rightsNote = 'Rights unknown — requires manual review';
  }

  await writeFile(env, `contributions/${photoId}.json`, JSON.stringify(photo, null, 2));
  return photo;
}

function validatePhotoSubmission(body) {
  const errors = [];

  if (!body.targetId || typeof body.targetId !== 'string') {
    errors.push('targetId is required');
  } else if (body.targetId.length > 200) {
    errors.push('targetId is too long');
  } else if (!sanitizePathSegment(body.targetId)) {
    errors.push('targetId contains invalid characters');
  }

  if (!body.targetType || typeof body.targetType !== 'string') {
    errors.push('targetType is required');
  } else if (!['cemetery', 'grave', 'memorial'].includes(body.targetType)) {
    errors.push('targetType must be cemetery, grave, or memorial');
  }

  if (!body.photoUrl || typeof body.photoUrl !== 'string') {
    errors.push('photoUrl is required');
  } else if (body.photoUrl.length > 2000) {
    errors.push('photoUrl is too long');
  } else if (!/^https?:\/\//.test(body.photoUrl)) {
    errors.push('photoUrl must be a valid HTTP(S) URL');
  }

  const rightsError = validateImageRights(body.rights);
  if (rightsError) errors.push(rightsError);

  if (body.description && typeof body.description === 'string' && body.description.length > MAX_PHOTO_DESC_LENGTH) {
    errors.push(`Description must be ${MAX_PHOTO_DESC_LENGTH} characters or fewer`);
  }

  return errors;
}

// ── Audit events ──

async function createContributionAuditEvent(env, action, userId, targetId, details = {}) {
  const eventId = generateAuditEventId();
  const now = new Date().toISOString();

  const event = {
    id: eventId,
    action,
    userId,
    targetId,
    timestamp: now,
    details,
  };

  const filePath = `audit/${eventId}.json`;
  try {
    await writeFile(env, filePath, JSON.stringify(event, null, 2));
  } catch (e) {
    // Best-effort audit logging
  }

  return event;
}

// ── Per-user rate limiting ──

const userRateLimitStore = new Map();

function checkUserRateLimit(userId) {
  const now = Date.now();
  const key = `user_rl_${userId}`;
  const entries = userRateLimitStore.get(key) || [];

  // Remove entries outside the window
  const validEntries = entries.filter(ts => now - ts < USER_RATE_LIMIT_WINDOW_MS);

  if (validEntries.length >= USER_RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  validEntries.push(now);
  userRateLimitStore.set(key, validEntries);

  return { allowed: true, remaining: USER_RATE_LIMIT_MAX - validEntries.length };
}

// ── Authorization helpers ──

async function authorizeContributionAccess(env, contributionId, userId) {
  const contribution = await getContribution(env, contributionId);
  if (!contribution) return { authorized: false, reason: 'Contribution not found', contribution: null };
  if (contribution.userId !== userId) return { authorized: false, reason: 'Not your contribution', contribution: null };
  return { authorized: true, reason: null, contribution };
}

async function authorizeDraftAccess(env, draftId, userId) {
  const draft = await getDraft(env, draftId);
  if (!draft) return { authorized: false, reason: 'Draft not found', draft: null };
  if (draft.userId !== userId) return { authorized: false, reason: 'Not your draft', draft: null };
  return { authorized: true, reason: null, draft };
}

// ── Duplicate check for user submissions ──

function checkDuplicateSubmission(existingRecords, newRecord) {
  if (!existingRecords || existingRecords.length === 0) {
    return { status: 'NO_MATCH', match: null };
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const existing of existingRecords) {
    let score = 0;

    // Name match
    if (newRecord.name && existing.name) {
      if (newRecord.name.toLowerCase() === existing.name.toLowerCase()) {
        score += 40;
      } else if (existing.name.toLowerCase().includes(newRecord.name.toLowerCase()) ||
                 newRecord.name.toLowerCase().includes(existing.name.toLowerCase())) {
        score += 25;
      }
    }

    // Cemetery match
    if (newRecord.cemetery && existing.cemetery) {
      if (newRecord.cemetery.toLowerCase() === existing.cemetery.toLowerCase()) {
        score += 20;
      }
    }

    // Coordinate proximity
    if (newRecord.latitude && newRecord.longitude && existing.latitude && existing.longitude) {
      const dist = haversineDistance(
        parseFloat(newRecord.latitude), parseFloat(newRecord.longitude),
        parseFloat(existing.latitude), parseFloat(existing.longitude)
      );
      if (dist < 0.01) score += 20; // ~1km
      else if (dist < 0.5) score += 10;
    }

    // Date match
    if (newRecord.birthDate && existing.birthDate) {
      if (newRecord.birthDate === existing.birthDate) score += 10;
    }
    if (newRecord.deathDate && existing.deathDate) {
      if (newRecord.deathDate === existing.deathDate) score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = existing;
    }
  }

  if (bestScore >= 85) return { status: 'EXACT_DUPLICATE', match: bestMatch };
  if (bestScore >= 55) return { status: 'HIGH_CONFIDENCE_MATCH', match: bestMatch };
  if (bestScore >= 25) return { status: 'POSSIBLE_DUPLICATE', match: bestMatch };

  return { status: 'NO_MATCH', match: null };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Contribution validation ──

function validateCemeteryContribution(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Cemetery name is required');
  } else if (data.name.length > 500) {
    errors.push('Cemetery name is too long');
  }

  if (data.latitude !== undefined && data.latitude !== null) {
    const lat = parseFloat(data.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) errors.push('Invalid latitude');
  }

  if (data.longitude !== undefined && data.longitude !== null) {
    const lon = parseFloat(data.longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) errors.push('Invalid longitude');
  }

  if (data.countryCode && !/^[A-Z]{2}$/.test(data.countryCode)) {
    errors.push('Country code must be ISO 3166-1 alpha-2');
  }

  if (data.website && !/^https?:\/\//.test(data.website)) {
    errors.push('Website must be a valid URL');
  }

  if (data.description && data.description.length > 2000) {
    errors.push('Description is too long');
  }

  // Path traversal check
  if (data.name && !sanitizePathSegment(data.name)) {
    errors.push('Cemetery name contains invalid characters');
  }

  return errors;
}

function validateGraveContribution(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Person name is required');
  } else if (data.name.length > 500) {
    errors.push('Name is too long');
  }

  if (!data.cemetery && !data.cemeteryId) {
    errors.push('Cemetery is required');
  }

  if (data.latitude !== undefined && data.latitude !== null) {
    const lat = parseFloat(data.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) errors.push('Invalid latitude');
  }

  if (data.longitude !== undefined && data.longitude !== null) {
    const lon = parseFloat(data.longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) errors.push('Invalid longitude');
  }

  if (data.birthDate && !isValidDate(data.birthDate)) {
    errors.push('Invalid birth date format');
  }

  if (data.deathDate && !isValidDate(data.deathDate)) {
    errors.push('Invalid death date format');
  }

  if (data.biography && data.biography.length > 2000) {
    errors.push('Biography is too long');
  }

  return errors;
}

function validateCorrectionContribution(data) {
  const errors = [];

  if (!data.targetId || typeof data.targetId !== 'string') {
    errors.push('Target record ID is required');
  }

  if (!data.targetType || !['grave', 'cemetery', 'person'].includes(data.targetType)) {
    errors.push('Target type must be grave, cemetery, or person');
  }

  if (!data.corrections || typeof data.corrections !== 'object' || Object.keys(data.corrections).length === 0) {
    errors.push('Corrections must include at least one field to change');
  }

  if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length === 0) {
    errors.push('Reason/explanation is required');
  }

  return errors;
}

function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (dateStr === 'unknown') return true;
  if (/^\d{4}$/.test(dateStr)) return true;
  if (/^\d{4}-\d{2}$/.test(dateStr)) return true;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  }
  if (/^approx_\d{4}$/.test(dateStr)) return true;
  return false;
}

// ── Session management ──

function generateSessionId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return SESSION_ID_PREFIX + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates a session for a user. Stores session file in sessions/ directory.
 * Session contains: id, userId, role, createdAt, expiresAt.
 * Returns the session object (without internal metadata).
 */
async function createSession(env, userId, role = USER_ROLE_USER) {
  const sessionId = generateSessionId();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  const session = {
    id: sessionId,
    userId,
    role,
    createdAt: now,
    expiresAt,
    revoked: false,
  };

  await writeFile(env, `sessions/${sessionId}.json`, JSON.stringify(session, null, 2));

  return {
    sessionId,
    userId,
    role,
    expiresAt,
  };
}

/**
 * Validates a session token. Returns { valid, userId, role } or { valid: false }.
 * Checks: session exists, not revoked, not expired.
 * Expired sessions are marked as revoked.
 */
async function validateSession(env, sessionId) {
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith(SESSION_ID_PREFIX)) {
    return { valid: false };
  }

  try {
    const content = await readFile(env, `sessions/${sessionId}.json`);
    if (!content) return { valid: false };

    const session = JSON.parse(content);
    if (session.revoked) return { valid: false };

    const now = Date.now();
    const expiresAt = new Date(session.expiresAt).getTime();
    if (now > expiresAt) {
      // Mark as revoked (expired)
      session.revoked = true;
      await writeFile(env, `sessions/${sessionId}.json`, JSON.stringify(session, null, 2));
      return { valid: false, reason: 'expired' };
    }

    return {
      valid: true,
      userId: session.userId,
      role: session.role || USER_ROLE_USER,
      sessionId: session.id,
    };
  } catch (e) {
    return { valid: false };
  }
}

/**
 * Revokes a session (sign-out). Marks the session as revoked.
 */
async function revokeSession(env, sessionId) {
  try {
    const content = await readFile(env, `sessions/${sessionId}.json`);
    if (!content) return false;

    const session = JSON.parse(content);
    session.revoked = true;
    session.revokedAt = new Date().toISOString();
    await writeFile(env, `sessions/${sessionId}.json`, JSON.stringify(session, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// ── Role management ──

/**
 * Gets the user's role from their user record.
 * Defaults to 'user' if no role is set.
 */
async function getUserRole(env, userId) {
  const user = await getUser(env, userId);
  if (!user) return USER_ROLE_USER;
  return user.role || USER_ROLE_USER;
}

/**
 * Checks if a user has at least moderator privileges.
 */
async function isModerator(env, userId) {
  const role = await getUserRole(env, userId);
  return role === USER_ROLE_MODERATOR || role === USER_ROLE_ADMIN;
}

/**
 * Checks if a user has admin privileges.
 */
async function isAdmin(env, userId) {
  const role = await getUserRole(env, userId);
  return role === USER_ROLE_ADMIN;
}

/**
 * Assigns a role to a user. Only admins can assign roles.
 */
async function setUserRole(env, userId, newRole) {
  if (!VALID_USER_ROLES.includes(newRole)) {
    return { success: false, error: 'Invalid role' };
  }

  const user = await getUser(env, userId);
  if (!user) return { success: false, error: 'User not found' };

  user.role = newRole;
  user.updatedAt = new Date().toISOString();
  await writeFile(env, `users/${userId}.json`, JSON.stringify(user, null, 2));

  return { success: true, role: newRole };
}

// ── Moderation notes ──

/**
 * Adds a moderation note to a contribution.
 * Moderation notes are stored separately from the contribution data,
 * in moderation-notes/{contributionId}.json as an array.
 * Notes are private — never exposed through public endpoints.
 */
async function addModerationNote(env, contributionId, moderatorId, note) {
  if (!note || typeof note !== 'string' || note.length > 2000) {
    return { success: false, error: 'Note must be 1-2000 characters' };
  }

  const noteFile = `moderation-notes/${contributionId}.json`;
  let notes = [];
  try {
    const content = await readFile(env, noteFile);
    if (content) notes = JSON.parse(content);
  } catch (e) {
    // No existing notes
  }

  const noteEntry = {
    id: generateAuditEventId(),
    moderatorId,
    note,
    timestamp: new Date().toISOString(),
  };

  notes.push(noteEntry);
  await writeFile(env, noteFile, JSON.stringify(notes, null, 2));

  return { success: true, noteId: noteEntry.id };
}

/**
 * Lists moderation notes for a contribution.
 * Only accessible by moderators/admins.
 */
async function getModerationNotes(env, contributionId) {
  try {
    const content = await readFile(env, `moderation-notes/${contributionId}.json`);
    if (!content) return [];
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

// ── Export all ──

export {
  // Constants
  ACCOUNT_STATUS_ACTIVE, ACCOUNT_STATUS_SUSPENDED, ACCOUNT_STATUS_DEACTIVATED,
  SUBMISSION_STATUS_DRAFT, SUBMISSION_STATUS_PENDING_REVIEW, SUBMISSION_STATUS_CHANGES_REQUESTED,
  SUBMISSION_STATUS_APPROVED, SUBMISSION_STATUS_REJECTED, SUBMISSION_STATUS_CANCELLED,
  VALID_SUBMISSION_STATUSES, VALID_SUBMISSION_TRANSITIONS,
  IMAGE_RIGHTS_OWN_WORK, IMAGE_RIGHTS_PERMISSION_GRANTED, IMAGE_RIGHTS_OPEN_LICENSE,
  IMAGE_RIGHTS_PUBLIC_DOMAIN, IMAGE_RIGHTS_UNKNOWN, VALID_IMAGE_RIGHTS,
  CONTRIBUTION_TYPES, AUDIT_ACTIONS,
  MAX_DISPLAY_NAME_LENGTH, MAX_PROFILE_BIO_LENGTH, MAX_PHOTO_DESC_LENGTH,
  USER_RATE_LIMIT_MAX, USER_RATE_LIMIT_WINDOW_MS,
  // ID generation
  generateUserId, generateDraftId, generateContributionId, generatePhotoId, generateAuditEventId,
  // Validation
  validateDisplayName, validateProfileBio, validateAccountStatus, validateSubmissionStatus,
  validateImageRights, validateContributionType, isValidStatusTransition,
  validateCemeteryContribution, validateGraveContribution, validateCorrectionContribution,
  validatePhotoSubmission, isValidDate,
  // User operations
  createOrUpdateUser, getUser, getPublicProfile, updateUserStats, setUserStatus,
  // Contribution operations
  createContribution, getContribution, updateContribution, listUserContributions,
  // Draft operations
  createDraft, getDraft, updateDraft, deleteDraft, listUserDrafts,
  // Photo operations
  createPhotoContribution,
  // Audit
  createContributionAuditEvent,
  // Rate limiting
  checkUserRateLimit,
  // Authorization
  authorizeContributionAccess, authorizeDraftAccess,
  // Duplicate check
  checkDuplicateSubmission, haversineDistance,
  // Session management
  createSession, validateSession, revokeSession, generateSessionId,
  // Role management
  getUserRole, isModerator, isAdmin, setUserRole,
  USER_ROLE_USER, USER_ROLE_MODERATOR, USER_ROLE_ADMIN, VALID_USER_ROLES,
  // Moderation notes
  addModerationNote, getModerationNotes,
  // New statuses
  SUBMISSION_STATUS_UNDER_REVIEW, SUBMISSION_STATUS_PUBLISHED, SUBMISSION_STATUS_FAILED,
};
