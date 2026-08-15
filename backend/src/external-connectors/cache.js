/**
 * Authorized Caching (Part 12)
 *
 * Cache external data only when permitted.
 * Records: retrieval time, expiry/TTL, source version, request/source identifier.
 *
 * Does NOT cache data when the provider prohibits it.
 */

import { canCache as licenseAllowsCaching } from './licensing.js';

// In-memory cache store (per worker instance)
const cacheStore = new Map();

export const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Cache entry structure.
 */
function createCacheEntry(key, data, sourceEntry, ttl) {
  return {
    key,
    data,
    sourceId: sourceEntry?.sourceId || 'unknown',
    retrievalTime: new Date().toISOString(),
    expiry: new Date(Date.now() + (ttl || DEFAULT_CACHE_TTL_MS)).toISOString(),
    sourceVersion: sourceEntry?.updateFrequency || 'unknown',
    requestIdentifier: key
  };
}

/**
 * Check if caching is permitted for a source.
 */
export function isCachingPermitted(sourceEntry) {
  if (!sourceEntry) return false;
  return licenseAllowsCaching(sourceEntry);
}

/**
 * Store data in cache if permitted.
 */
export function cacheData(key, data, sourceEntry, ttl) {
  if (!isCachingPermitted(sourceEntry)) {
    return null; // Provider prohibits caching
  }
  const entry = createCacheEntry(key, data, sourceEntry, ttl);
  cacheStore.set(key, entry);
  return entry;
}

/**
 * Retrieve data from cache if still valid.
 */
export function getCachedData(key) {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (new Date(entry.expiry) < new Date()) {
    cacheStore.delete(key);
    return null;
  }
  return entry;
}

/**
 * Clear cache for a specific source.
 */
export function clearCacheForSource(sourceId) {
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.sourceId === sourceId) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Clear all cached data.
 */
export function clearAllCache() {
  cacheStore.clear();
}

/**
 * Get cache stats for monitoring.
 */
export function getCacheStats() {
  let entries = 0;
  let expired = 0;
  const now = new Date();
  for (const entry of cacheStore.values()) {
    entries++;
    if (new Date(entry.expiry) < now) expired++;
  }
  return { totalEntries: entries, expiredEntries: expired };
}
