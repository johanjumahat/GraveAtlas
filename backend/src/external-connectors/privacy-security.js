/**
 * Privacy Controls (Part 21) & Security Controls (Part 22)
 *
 * Privacy: Review external data for living persons, sensitive personal info,
 * private records, restricted burial info, institutional restrictions.
 *
 * Security: Protect API keys, OAuth tokens, service credentials, webhook secrets.
 * Never place credentials in: frontend code, GitHub commits, logs, screenshots,
 * generated PDFs, AI prompts.
 */

// ── Privacy ──

const SENSITIVE_DATA_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, type: 'SSN', action: 'block' },
  { pattern: /\b[A-Z]{2}\d{6,7}\b/, type: 'passport_number', action: 'block' },
  { pattern: /\b\d{16}\b/, type: 'credit_card', action: 'block' },
  { pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/, type: 'email', action: 'redact' },
  { pattern: /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/, type: 'phone', action: 'redact' }
];

/**
 * Check if a record may contain living person data.
 * Uses death date: if no death date and birth date is within last 100 years,
 * flag as potentially living person.
 */
export function checkLivingPerson(record) {
  if (!record) return false;
  if (record.deathDate) return false; // Has death date — deceased
  if (!record.birthDate) return false; // No birth date — can't determine
  const birthYear = parseInt(record.birthDate.substring(0, 4));
  if (isNaN(birthYear)) return false;
  const currentYear = new Date().getFullYear();
  return (currentYear - birthYear) < 100; // Potentially living
}

/**
 * Review an external record for privacy concerns.
 */
export function reviewPrivacy(record) {
  const concerns = [];

  // Living person check
  if (checkLivingPerson(record)) {
    concerns.push({
      type: 'living_person',
      severity: 'high',
      message: 'Record may pertain to a living person — do not publish without consent'
    });
  }

  // Sensitive data pattern matching
  const recordStr = JSON.stringify(record);
  for (const { pattern, type, action } of SENSITIVE_DATA_PATTERNS) {
    if (pattern.test(recordStr)) {
      concerns.push({
        type,
        severity: action === 'block' ? 'critical' : 'high',
        message: `${type} detected in record data — must ${action} before display`,
        action
      });
    }
  }

  return {
    passed: concerns.length === 0,
    concerns
  };
}

/**
 * Redact sensitive information from a record.
 */
export function redactSensitiveData(record) {
  const redacted = { ...record };
  for (const key of Object.keys(redacted)) {
    if (typeof redacted[key] === 'string') {
      let value = redacted[key];
      for (const { pattern, type, action } of SENSITIVE_DATA_PATTERNS) {
        if (action === 'redact' && pattern.test(value)) {
          value = value.replace(pattern, '[REDACTED]');
        }
      }
      redacted[key] = value;
    }
  }
  return redacted;
}

// ── Security ──

/**
 * Validate that no secrets are present in data before logging or storage.
 */
export function scanForSecrets(data) {
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  const secretPatterns = [
    { pattern: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"]?[\w-]{20,}/i, type: 'api_key' },
    { pattern: /(?:access[_-]?token|auth[_-]?token)\s*[:=]\s*['"]?[\w-]{20,}/i, type: 'access_token' },
    { pattern: /(?:secret)\s*[:=]\s*['"]?[\w-]{16,}/i, type: 'secret' },
    { pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, type: 'private_key' },
    { pattern: /Bearer\s+[\w-]{20,}/, type: 'bearer_token' }
  ];

  for (const { pattern, type } of secretPatterns) {
    if (pattern.test(dataStr)) {
      return { hasSecrets: true, type };
    }
  }
  return { hasSecrets: false };
}

/**
 * Ensure that credentials are never exposed in API responses.
 * Strips any known secret fields from a response object.
 */
export function sanitizeResponse(response) {
  if (!response || typeof response !== 'object') return response;
  const SECRET_FIELDS = ['apiKey', 'api_key', 'secret', 'token', 'password', 'credentials', 'authToken', 'accessToken', 'refreshToken'];
  const sanitized = { ...response };
  for (const field of SECRET_FIELDS) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }
  return sanitized;
}
