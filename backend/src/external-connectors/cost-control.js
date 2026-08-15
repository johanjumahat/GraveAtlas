/**
 * API Cost Control (Part 24)
 *
 * Prefer: free APIs, open datasets, cached results, incremental sync, local processing.
 * Before using a paid service: STOP and request explicit approval.
 */

let monthlyRequestCounts = new Map(); // sourceId → count
let monthlyResetDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

function resetIfNewMonth() {
  const now = new Date();
  if (now.getMonth() !== monthlyResetDate.getMonth() || now.getFullYear() !== monthlyResetDate.getFullYear()) {
    monthlyRequestCounts = new Map();
    monthlyResetDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

/**
 * Check if a request to a source is within cost limits.
 */
export function checkCostLimit(sourceId, sourceEntry) {
  resetIfNewMonth();

  // Free sources have no limits
  if (sourceEntry?.commercialUseStatus?.includes('free') ||
      sourceEntry?.licensing?.includes('CC0') ||
      sourceEntry?.licensing?.includes('ODbL') ||
      sourceEntry?.licensing?.includes('Public Domain')) {
    return { allowed: true, reason: 'Free/open source' };
  }

  // Paid sources need explicit approval
  if (sourceEntry?.commercialUseStatus?.includes('paid') ||
      sourceEntry?.commercialUseStatus?.includes('subscription')) {
    return {
      allowed: false,
      reason: 'PAID SOURCE — explicit approval required before use',
      action: 'STOP_AND_REQUEST_APPROVAL'
    };
  }

  // Default: allow but track
  const count = monthlyRequestCounts.get(sourceId) || 0;
  const MAX_FREE_TIER = 10000; // conservative monthly limit
  if (count >= MAX_FREE_TIER) {
    return { allowed: false, reason: `Monthly request limit reached (${MAX_FREE_TIER})` };
  }

  return { allowed: true, reason: 'Within limits' };
}

/**
 * Record a request for cost tracking.
 */
export function recordRequest(sourceId) {
  resetIfNewMonth();
  monthlyRequestCounts.set(sourceId, (monthlyRequestCounts.get(sourceId) || 0) + 1);
}

/**
 * Get cost statistics for the API health dashboard.
 */
export function getCostStats() {
  resetIfNewMonth();
  const stats = [];
  for (const [sourceId, count] of monthlyRequestCounts.entries()) {
    stats.push({ sourceId, monthlyRequests: count });
  }
  return { period: monthlyResetDate.toISOString().substring(0, 7), sources: stats };
}
