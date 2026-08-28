/**
 * API Gateway (Part 15)
 *
 * Controlled GraveAtlas API gateway for external source queries.
 * Provides: authentication, authorization, rate limiting, logging,
 * source routing, connector isolation, caching, error normalization.
 *
 * Never exposes provider credentials to clients.
 */

import { getSource, getImplementedSources } from './registry.js';
import { OSMConnector } from './connectors/osm-connector.js';
import { WikidataConnector } from './connectors/wikidata-connector.js';
import { DataGovSgConnector } from './connectors/datagov-sg-connector.js';
import { BukitBrownConnector } from './connectors/bukit-brown-connector.js';
import { GitHubCommunityConnector } from './connectors/github-community-connector.js';
import { CWGCConnector } from './connectors/cwgc-connector.js';
import { FindAGraveConnector } from './connectors/findagrave-connector.js';
import { DeceasedOnlineConnector } from './connectors/deceased-online-connector.js';
import { KuburSGConnector } from './connectors/kubur-sg-connector.js';
import { evaluateLicense } from './licensing.js';
import { handleFailure, createFallbackResponse } from './failure-handler.js';
import { writeAuditEntry, createSuccessAudit, createFailureAudit } from './audit-log.js';

// Connector registry (only implemented sources)
const connectorInstances = new Map();

function getConnector(sourceId) {
  if (connectorInstances.has(sourceId)) {
    return connectorInstances.get(sourceId);
  }
  let connector = null;
  switch (sourceId) {
    case 'osm-overpass':
      connector = new OSMConnector();
      break;
    case 'wikidata-sparql':
      connector = new WikidataConnector();
      break;
    case 'datagov-sg':
      connector = new DataGovSgConnector();
      break;
    case 'bukit-brown':
      connector = new BukitBrownConnector();
      break;
    case 'github-community':
      connector = new GitHubCommunityConnector();
      break;
    case 'cwgc':
      connector = new CWGCConnector();
      break;
    case 'findagrave':
      connector = new FindAGraveConnector();
      break;
    case 'uk-deceased-online':
      connector = new DeceasedOnlineConnector();
      break;
    case 'kubur-sg':
      connector = new KuburSGConnector();
      break;
    default:
      return null;
  }
  connectorInstances.set(sourceId, connector);
  return connector;
}

/**
 * Query a single external source through the gateway.
 */
export async function querySource(sourceId, query, env) {
  const source = getSource(sourceId);
  if (!source) {
    return { status: 'error', reason: `Unknown source: ${sourceId}`, records: [] };
  }

  if (source.integrationStatus !== 'implemented') {
    return {
      status: 'not_implemented',
      reason: `Source "${source.sourceName}" is evaluated but not implemented`,
      records: []
    };
  }

  // License check
  const licenseResult = evaluateLicense(source);
  if (licenseResult.decision !== 'approved') {
    return {
      status: 'license_not_approved',
      reason: licenseResult.reason,
      records: []
    };
  }

  const connector = getConnector(sourceId);
  if (!connector) {
    return { status: 'error', reason: `No connector available for ${sourceId}`, records: [] };
  }

  const result = await connector.execute(query, env);
  return result;
}

/**
 * Query all implemented sources in parallel.
 * Returns results per source, never fails the entire batch.
 */
export async function queryAllSources(query, env) {
  const sources = getImplementedSources();
  const results = [];

  for (const source of sources) {
    try {
      const result = await querySource(source.sourceId, query, env);
      results.push({
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        ...result
      });
    } catch (error) {
      const failure = handleFailure(error, source.sourceId);
      results.push(createFallbackResponse(source.sourceId, failure.message));
    }
  }

  return results;
}

/**
 * Get source registry summary for the API health dashboard (Part 26).
 */
export function getSourceHealthSummary() {
  const sources = getImplementedSources();
  return sources.map(s => ({
    sourceId: s.sourceId,
    sourceName: s.sourceName,
    status: s.integrationStatus,
    license: s.licensing,
    lastVerification: s.lastVerificationDate
  }));
}

/**
 * Normalize errors from any connector into a uniform shape.
 */
export function normalizeError(error, sourceId) {
  const failure = handleFailure(error, sourceId);
  return {
    source: sourceId,
    error: failure.errorType,
    severity: failure.severity,
    message: failure.message,
    timestamp: failure.timestamp,
    canRetry: failure.canRetry
  };
}
