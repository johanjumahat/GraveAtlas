/**
 * API Failure Handling (Part 13)
 *
 * Handles: timeout, 401, 403, 404, 429, 500-series, malformed responses,
 * schema changes, provider outage.
 *
 * Workflow: DETECT → CLASSIFY → RETRY IF SAFE → FALLBACK → LOG → ALERT
 *
 * Never endlessly retries.
 */

export const ERROR_TYPES = {
  TIMEOUT: 'timeout',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  RATE_LIMITED: 'rate_limited',
  SERVER_ERROR: 'server_error',
  MALFORMED_RESPONSE: 'malformed_response',
  SCHEMA_CHANGE: 'schema_change',
  PROVIDER_OUTAGE: 'provider_outage',
  NETWORK_ERROR: 'network_error',
  UNKNOWN: 'unknown'
};

export const ERROR_SEVERITY = {
  TRANSIENT: 'transient',   // retry-safe
  PERMANENT: 'permanent',   // won't fix with retry
  CRITICAL: 'critical'      // source is down
};

/**
 * Classify an error from an HTTP response or exception.
 */
export function classifyError(error) {
  if (!error) return { type: ERROR_TYPES.UNKNOWN, severity: ERROR_SEVERITY.PERMANENT };

  // Timeout
  if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('Timeout')) {
    return { type: ERROR_TYPES.TIMEOUT, severity: ERROR_SEVERITY.TRANSIENT };
  }

  // Network error
  if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('ECONNREFUSED')) {
    return { type: ERROR_TYPES.NETWORK_ERROR, severity: ERROR_SEVERITY.TRANSIENT };
  }

  // HTTP status-based
  const status = error.status || error.statusCode;
  switch (status) {
    case 401: return { type: ERROR_TYPES.UNAUTHORIZED, severity: ERROR_SEVERITY.PERMANENT };
    case 403: return { type: ERROR_TYPES.FORBIDDEN, severity: ERROR_SEVERITY.PERMANENT };
    case 404: return { type: ERROR_TYPES.NOT_FOUND, severity: ERROR_SEVERITY.PERMANENT };
    case 429: return { type: ERROR_TYPES.RATE_LIMITED, severity: ERROR_SEVERITY.TRANSIENT };
    case 500: case 502: case 503: case 504:
      return { type: ERROR_TYPES.SERVER_ERROR, severity: ERROR_SEVERITY.TRANSIENT };
  }

  // Malformed response
  if (error.message?.includes('JSON') || error.message?.includes('parse') || error.message?.includes('Unexpected token')) {
    return { type: ERROR_TYPES.MALFORMED_RESPONSE, severity: ERROR_SEVERITY.PERMANENT };
  }

  // Schema change
  if (error.message?.includes('schema') || error.message?.includes('field') || error.message?.includes('missing required')) {
    return { type: ERROR_TYPES.SCHEMA_CHANGE, severity: ERROR_SEVERITY.PERMANENT };
  }

  return { type: ERROR_TYPES.UNKNOWN, severity: ERROR_SEVERITY.PERMANENT };
}

/**
 * Handle a failed request — classify, decide on retry, return actionable info.
 */
export function handleFailure(error, sourceId, attempt = 0) {
  const classification = classifyError(error);
  const canRetry = classification.severity === ERROR_SEVERITY.TRANSIENT;

  return {
    sourceId,
    errorType: classification.type,
    severity: classification.severity,
    canRetry,
    attempt,
    message: error.message || String(error),
    timestamp: new Date().toISOString(),
    action: canRetry && attempt < 3 ? 'RETRY' : 'FALLBACK'
  };
}

/**
 * Create a fallback response when an external source is unavailable.
 * NEVER fabricates data. Returns an explicit "unavailable" status.
 */
export function createFallbackResponse(sourceId, reason) {
  return {
    sourceId,
    status: 'unavailable',
    reason,
    records: [],
    cached: false,
    timestamp: new Date().toISOString(),
    message: `Source "${sourceId}" is unavailable: ${reason}. Showing GraveAtlas internal data only.`
  };
}
