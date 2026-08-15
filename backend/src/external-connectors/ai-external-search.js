/**
 * AI External Search (Parts 16 & 17)
 *
 * Allows the GraveAtlas AI layer to search external sources only when:
 * - integration is authorized
 * - provider terms permit it
 * - data is accessible
 * - rate limits are respected
 *
 * AI results always identify the source (Part 17 — AI Source Transparency).
 * The AI never implies it searched a source that it did not actually query.
 */

import { queryAllSources } from './gateway.js';
import { searchWithFallback } from './search-fallback.js';
import { reviewPrivacy, redactSensitiveData } from './privacy-security.js';
import { formatSourceBadge } from './provenance.js';

/**
 * Detect if a natural language query asks for external sources.
 */
export function wantsExternalSearch(query) {
  if (!query) return false;
  const lower = query.toLowerCase();
  const externalKeywords = [
    'external', 'other sources', 'external sources',
    'government', 'openstreetmap', 'osm', 'wikidata',
    'compare', 'cross-reference', 'cross reference',
    'find burial records', 'search external',
    'nea', 'nhb', 'data.gov.sg', 'datagov', 'singapore government',
    'bukit brown', 'choa chu kang', 'chua chu kang', 'kranji',
    'national environment agency', 'national heritage board',
    'columbarium', 'crematorium'
  ];
  return externalKeywords.some(kw => lower.includes(kw));
}

/**
 * Parse a natural language query into external source query parameters.
 */
export function parseExternalQuery(query) {
  if (!query) return {};
  const params = {};

  // Area/country extraction
  const areaMatch = query.match(/(?:in|near|for|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (areaMatch) {
    params.area = areaMatch[1];
  }

  // Cemetery name extraction
  const cemeteryMatch = query.match(/cemetery\s+(?:called\s+|named\s+)?["']?([^"']+?)["']?\s*(?:\?|$|\.|,)/i);
  if (cemeteryMatch) {
    params.cemetery = cemeteryMatch[1].trim();
  }

  // Type: burial vs cemetery
  if (/burial|grave|interred|buried/i.test(query)) {
    params.type = 'burial';
  } else {
    params.type = 'cemetery';
  }

  // Search term
  const searchTerm = query.replace(/(?:find|search|show|query|look\s+up|get)\s+/i, '')
    .replace(/(?:burial\s+records?|cemetery\s+data|external\s+sources?|records?)\s*(?:for|from|in|near)?/gi, '')
    .trim();
  if (searchTerm && searchTerm.length > 2) {
    params.search = searchTerm;
  }

  return params;
}

/**
 * Execute an AI external search across all implemented sources.
 * Returns results with full source transparency.
 */
export async function executeExternalSearch(query, env) {
  const parsedQuery = parseExternalQuery(query);
  const externalResults = await queryAllSources(parsedQuery, env);

  // Build source-transparency report (Part 17)
  const sourcesUsed = [];
  const allRecords = [];

  for (const result of externalResults) {
    if (result.status === 'unavailable' || result.status === 'error' || result.status === 'not_implemented') {
      sourcesUsed.push({
        sourceId: result.sourceId,
        sourceName: result.sourceName || result.sourceId,
        searched: false,
        reason: result.reason || result.message || 'Unavailable'
      });
    } else {
      sourcesUsed.push({
        sourceId: result.sourceId,
        sourceName: result.sourceName,
        searched: true,
        recordCount: result.count || (result.records || []).length,
        fromCache: result.fromCache || false
      });

      // Process each record: privacy review + source badge
      for (const record of (result.records || [])) {
        const privacy = reviewPrivacy(record);
        const safeRecord = privacy.passed ? record : redactSensitiveData(record);
        const badge = formatSourceBadge(safeRecord);
        allRecords.push({
          ...safeRecord,
          sourceBadge: badge
        });
      }
    }
  }

  // Generate summary (Part 16 format)
  const searchedSources = sourcesUsed.filter(s => s.searched);
  const totalRecords = allRecords.length;

  let summary;
  if (totalRecords > 0) {
    summary = `${totalRecords} possible record${totalRecords !== 1 ? 's' : ''} found from ${searchedSources.length} external source${searchedSources.length !== 1 ? 's' : ''}.`;
    for (const s of searchedSources) {
      summary += `\n${s.sourceName}: ${s.recordCount} record${s.recordCount !== 1 ? 's' : ''}`;
    }
  } else {
    summary = 'No external records found. Showing GraveAtlas internal data only.';
  }

  // Add unavailable sources to summary
  const unavailable = sourcesUsed.filter(s => !s.searched);
  if (unavailable.length > 0) {
    summary += `\n${unavailable.length} source(s) unavailable: ${unavailable.map(s => s.sourceName).join(', ')}`;
  }

  return {
    records: allRecords,
    sourcesUsed,
    summary,
    query: parsedQuery,
    timestamp: new Date().toISOString()
  };
}

/**
 * Combined search: internal GraveAtlas data + external sources.
 * Falls back to internal-only if external sources are unavailable (Part 18).
 */
export async function combinedSearch(internalSearchFn, query, env) {
  const externalResults = await queryAllSources(parseExternalQuery(query), env);
  const result = await searchWithFallback(internalSearchFn, externalResults, query);

  // Add source transparency info
  result.sourcesUsed = externalResults.map(r => ({
    sourceId: r.sourceId,
    sourceName: r.sourceName,
    status: r.status || 'ok',
    recordCount: (r.records || []).length,
    fromCache: r.fromCache || false
  }));

  return result;
}
