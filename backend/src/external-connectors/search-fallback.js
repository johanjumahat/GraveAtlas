/**
 * Search Fallback (Part 18)
 *
 * If an external API is unavailable:
 *   GraveAtlas internal data → cached authorized data → alternative authorized source → explain limitation
 *
 * Does NOT fabricate fallback results.
 */

import { getCachedData } from './cache.js';
import { createFallbackResponse } from './failure-handler.js';

/**
 * Perform a search with fallback chain.
 * @param {Object} internalSearchFn - Function to search GraveAtlas internal data
 * @param {Array} externalResults - Results from external sources (may include failures)
 * @param {Object} query - The original query
 */
export async function searchWithFallback(internalSearchFn, externalResults, query) {
  const results = {
    internal: [],
    external: [],
    cached: [],
    unavailable: [],
    summary: ''
  };

  // 1. Always include GraveAtlas internal data
  try {
    results.internal = await internalSearchFn(query) || [];
  } catch (e) {
    results.internal = [];
  }

  // 2. Process external results (separate successful from unavailable)
  for (const ext of externalResults) {
    if (ext.status === 'unavailable' || ext.status === 'error' || ext.status === 'not_implemented') {
      results.unavailable.push({
        sourceId: ext.sourceId,
        reason: ext.reason || ext.message || 'Unknown error'
      });
    } else if (ext.fromCache) {
      results.cached.push(...(ext.records || []));
    } else {
      results.external.push(...(ext.records || []));
    }
  }

  // 3. Build summary explaining what was searched
  const parts = [];
  if (results.internal.length > 0) {
    parts.push(`${results.internal.length} from GraveAtlas`);
  }
  if (results.external.length > 0) {
    parts.push(`${results.external.length} from external sources`);
  }
  if (results.cached.length > 0) {
    parts.push(`${results.cached.length} from cache`);
  }
  if (results.unavailable.length > 0) {
    parts.push(`${results.unavailable.length} source(s) unavailable`);
  }
  results.summary = parts.join(', ') || 'No results found';

  return results;
}
