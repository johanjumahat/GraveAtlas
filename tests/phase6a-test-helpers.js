/**
 * Phase 6A test helpers — exports pure functions for CommonJS testing.
 * These mirror the exports from phase6a.js but are directly accessible
 * without ES module import complexity.
 */

const crypto = require('crypto');

// ── Constants ──

const ACCOUNT_STATUS_ACTIVE = 'ACTIVE';
const ACCOUNT_STATUS_SUSPENDED = 'SUSPENDED';
const ACCOUNT_STATUS_DEACTIVATED = 'DEACTIVATED';

const SUBMISSION_STATUS_DRAFT = 'DRAFT';
const SUBMISSION_STATUS_PENDING_REVIEW = 'PENDING_REVIEW';
const SUBMISSION_STATUS_CHANGES_REQUESTED = 'CHANGES_REQUESTED';
const SUBMISSION_STATUS_APPROVED = 'APPROVED';
const SUBMISSION_STATUS_REJECTED = 'REJECTED';
const SUBMISSION_STATUS_CANCELLED = 'CANCELLED';

const VALID_SUBMISSION_STATUSES = [
  SUBMISSION_STATUS_DRAFT,
  SUBMISSION_STATUS_PENDING_REVIEW,
  SUBMISSION_STATUS_CHANGES_REQUESTED,
  SUBMISSION_STATUS_APPROVED,
  SUBMISSION_STATUS_REJECTED,
  SUBMISSION_STATUS_CANCELLED,
];

const VALID_SUBMISSION_TRANSITIONS = {
  [SUBMISSION_STATUS_DRAFT]: [SUBMISSION_STATUS_PENDING_REVIEW, SUBMISSION_STATUS_CANCELLED],
  [SUBMISSION_STATUS_PENDING_REVIEW]: [SUBMISSION_STATUS_CHANGES_REQUESTED, SUBMISSION_STATUS_APPROVED, SUBMISSION_STATUS_REJECTED, SUBMISSION_STATUS_CANCELLED],
  [SUBMISSION_STATUS_CHANGES_REQUESTED]: [SUBMISSION_STATUS_PENDING_REVIEW, SUBMISSION_STATUS_CANCELLED],
  [SUBMISSION_STATUS_APPROVED]: [],
  [SUBMISSION_STATUS_REJECTED]: [],
  [SUBMISSION_STATUS_CANCELLED]: [],
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
};

const MAX_DISPLAY_NAME_LENGTH = 100;
const MAX_PROFILE_BIO_LENGTH = 500;
const MAX_PHOTO_DESC_LENGTH = 500;
const USER_RATE_LIMIT_MAX = 30;
const USER_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// ── ID generation ──

function generateUserId() {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(8).toString('hex');
  return `user_${ts}${rand}`;
}

function generateDraftId() {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(6).toString('hex');
  return `draft_${ts}${rand}`;
}

function generateContributionId() {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(6).toString('hex');
  return `contrib_${ts}${rand}`;
}

function generatePhotoId() {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(6).toString('hex');
  return `photo_${ts}${rand}`;
}

// ── Validation ──

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

function isValidStatusTransition(from, to) {
  const allowed = VALID_SUBMISSION_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

function sanitizePathSegment(segment) {
  if (!segment || typeof segment !== 'string') return null;
  if (segment.includes('..')) return null;
  if (segment.includes('/')) return null;
  if (segment.includes('\\')) return null;
  if (segment.includes('\0')) return null;
  if (segment === '.git' || segment === '.github') return null;
  return segment;
}

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

// ── Duplicate check ──

function checkDuplicateSubmission(existingRecords, newRecord) {
  if (!existingRecords || existingRecords.length === 0) {
    return { status: 'NO_MATCH', match: null };
  }
  let bestMatch = null;
  let bestScore = 0;
  for (const existing of existingRecords) {
    let score = 0;
    if (newRecord.name && existing.name) {
      if (newRecord.name.toLowerCase() === existing.name.toLowerCase()) {
        score += 40;
      } else if (existing.name.toLowerCase().includes(newRecord.name.toLowerCase()) ||
                 newRecord.name.toLowerCase().includes(existing.name.toLowerCase())) {
        score += 25;
      }
    }
    if (newRecord.cemetery && existing.cemetery) {
      if (newRecord.cemetery.toLowerCase() === existing.cemetery.toLowerCase()) {
        score += 20;
      }
    }
    if (newRecord.latitude && newRecord.longitude && existing.latitude && existing.longitude) {
      const dist = haversineDistance(
        parseFloat(newRecord.latitude), parseFloat(newRecord.longitude),
        parseFloat(existing.latitude), parseFloat(existing.longitude)
      );
      if (dist < 0.01) score += 20;
      else if (dist < 0.5) score += 10;
    }
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
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Rate limiting ──

const userRateLimitStore = new Map();

function checkUserRateLimit(userId) {
  const now = Date.now();
  const key = `user_rl_${userId}`;
  const entries = userRateLimitStore.get(key) || [];
  const validEntries = entries.filter(ts => now - ts < USER_RATE_LIMIT_WINDOW_MS);
  if (validEntries.length >= USER_RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }
  validEntries.push(now);
  userRateLimitStore.set(key, validEntries);
  return { allowed: true, remaining: USER_RATE_LIMIT_MAX - validEntries.length };
}

module.exports = {
  ACCOUNT_STATUS_ACTIVE, ACCOUNT_STATUS_SUSPENDED, ACCOUNT_STATUS_DEACTIVATED,
  SUBMISSION_STATUS_DRAFT, SUBMISSION_STATUS_PENDING_REVIEW, SUBMISSION_STATUS_CHANGES_REQUESTED,
  SUBMISSION_STATUS_APPROVED, SUBMISSION_STATUS_REJECTED, SUBMISSION_STATUS_CANCELLED,
  VALID_SUBMISSION_STATUSES, VALID_SUBMISSION_TRANSITIONS,
  IMAGE_RIGHTS_OWN_WORK, IMAGE_RIGHTS_PERMISSION_GRANTED, IMAGE_RIGHTS_OPEN_LICENSE,
  IMAGE_RIGHTS_PUBLIC_DOMAIN, IMAGE_RIGHTS_UNKNOWN, VALID_IMAGE_RIGHTS,
  CONTRIBUTION_TYPES, AUDIT_ACTIONS,
  generateUserId, generateDraftId, generateContributionId, generatePhotoId,
  validateDisplayName, validateProfileBio, validateAccountStatus, validateSubmissionStatus,
  validateImageRights, validateContributionType, isValidStatusTransition,
  validateCemeteryContribution, validateGraveContribution, validateCorrectionContribution,
  validatePhotoSubmission, isValidDate,
  checkDuplicateSubmission, haversineDistance,
  checkUserRateLimit,
};
