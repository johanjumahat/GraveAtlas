/**
 * Per-Connector Rate Limiter (Part 11)
 *
 * Every connector must respect:
 * - rate limits, quotas, request frequency
 * - retry-after headers, provider requirements
 *
 * Implements bounded retries. Never creates request storms.
 */

// In-memory rate limit state (per worker instance)
const rateLimitState = new Map();

/**
 * Rate limiter for a single connector.
 */
export class ConnectorRateLimiter {
  constructor(sourceId, config = {}) {
    this.sourceId = sourceId;
    this.minIntervalMs = config.minIntervalMs || 1000; // min time between requests
    this.maxRetries = config.maxRetries || 3;
    this.retryBackoffMs = config.retryBackoffMs || 2000;
    this.maxRetryBackoffMs = config.maxRetryBackoffMs || 30000;
    this.lastRequestTime = 0;
  }

  /**
   * Wait until it's safe to make the next request.
   */
  async waitForNextSlot() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      const wait = this.minIntervalMs - elapsed;
      await new Promise(resolve => setTimeout(resolve, wait));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Calculate delay for retry attempt (exponential backoff).
   */
  getRetryDelay(attempt) {
    const delay = this.retryBackoffMs * Math.pow(2, attempt);
    return Math.min(delay, this.maxRetryBackoffMs);
  }

  /**
   * Check if a retry should be attempted based on the error.
   */
  shouldRetry(error, attempt) {
    if (attempt >= this.maxRetries) return false;
    // Retry on: timeout, 429, 500-series
    if (error.status === 429 || error.status >= 500) return true;
    if (error.name === 'AbortError' || error.message?.includes('timeout')) return true;
    // Don't retry on: 401, 403, 404, malformed responses
    if (error.status === 401 || error.status === 403 || error.status === 404) return false;
    return false;
  }

  /**
   * Parse Retry-After header value in seconds.
   */
  parseRetryAfter(response) {
    const retryAfter = response.headers?.get('Retry-After');
    if (!retryAfter) return null;
    // Could be seconds or HTTP date
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) return seconds * 1000;
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) return Math.max(0, date.getTime() - Date.now());
    return null;
  }
}

/**
 * Get or create a rate limiter for a source.
 */
export function getRateLimiter(sourceId, config) {
  if (!rateLimitState.has(sourceId)) {
    rateLimitState.set(sourceId, new ConnectorRateLimiter(sourceId, config));
  }
  return rateLimitState.get(sourceId);
}
