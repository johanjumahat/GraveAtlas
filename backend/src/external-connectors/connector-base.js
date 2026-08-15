/**
 * Connector Architecture (Part 3)
 *
 * Standardized connector interface:
 *   DISCOVER → CONNECT → AUTHENTICATE → REQUEST → VALIDATE → NORMALIZE
 *   → PROVENANCE → CACHE → STORE/REFERENCE → DISPLAY
 *
 * Each connector is isolated from the core system.
 * A failed external API must not bring down GraveAtlas.
 */

import { createNormalizedRecord, validateNormalizedRecord } from './normalized-schema.js';
import { createProvenance, attachProvenance } from './provenance.js';
import { evaluateLicense } from './licensing.js';
import { getRateLimiter } from './rate-limiter.js';
import { cacheData, getCachedData, isCachingPermitted } from './cache.js';
import { handleFailure, createFallbackResponse } from './failure-handler.js';
import { recordSchema, inferSchema, shouldQuarantine } from './schema-detector.js';
import { writeAuditEntry, createSuccessAudit, createFailureAudit } from './audit-log.js';
import { getSource } from './registry.js';

export class BaseConnector {
  constructor(sourceId, config = {}) {
    this.sourceId = sourceId;
    this.sourceEntry = getSource(sourceId);
    this.config = config;
    this.rateLimiter = getRateLimiter(sourceId, config.rateLimit);
    this.connected = false;
    this.authenticated = false;
  }

  /**
   * Step 1: DISCOVER — Check if the source is available and get metadata.
   */
  async discover() {
    if (!this.sourceEntry) {
      throw new Error(`Unknown source: ${this.sourceId}`);
    }
    return {
      sourceId: this.sourceId,
      sourceName: this.sourceEntry.sourceName,
      dataType: this.sourceEntry.dataType,
      integrationStatus: this.sourceEntry.integrationStatus,
      licensing: this.sourceEntry.licensing
    };
  }

  /**
   * Step 2: CONNECT — Establish connection to the external API.
   * Override in subclass for source-specific connection logic.
   */
  async connect() {
    if (!this.sourceEntry) throw new Error(`No source entry for ${this.sourceId}`);
    this.connected = true;
    return true;
  }

  /**
   * Step 3: AUTHENTICATE — Handle authentication if required.
   * Override in subclass for source-specific auth.
   */
  async authenticate() {
    if (!this.sourceEntry) throw new Error(`No source entry for ${this.sourceId}`);
    if (this.sourceEntry.authenticationRequirement === 'None — public read-only API.') {
      this.authenticated = true;
      return true;
    }
    // Subclasses must implement their own auth
    this.authenticated = true;
    return true;
  }

  /**
   * Step 4: REQUEST — Make a request to the external API.
   * Must be overridden in subclass.
   */
  async request(params) {
    throw new Error(`request() not implemented for connector: ${this.sourceId}`);
  }

  /**
   * Step 5: VALIDATE — Validate the raw response.
   * Override for source-specific validation.
   */
  validate(rawResponse) {
    if (!rawResponse) {
      throw new Error('Empty response from external API');
    }
    return true;
  }

  /**
   * Step 6: NORMALIZE — Convert raw response to normalized records.
   * Must be overridden in subclass.
   */
  normalize(rawResponse) {
    throw new Error(`normalize() not implemented for connector: ${this.sourceId}`);
  }

  /**
   * Step 7: PROVENANCE — Attach provenance to each record.
   */
  attachProvenance(records, apiEndpoint) {
    const retrievalTime = new Date().toISOString();
    return records.map(record => {
      const provenance = createProvenance({
        sourceId: this.sourceId,
        sourceName: this.sourceEntry?.sourceName || this.sourceId,
        apiEndpoint,
        externalRecordId: record.externalRecordId,
        retrievalTime,
        transformation: 'normalized'
      });
      return attachProvenance(record, provenance);
    });
  }

  /**
   * Step 8: CACHE — Cache results if permitted by license.
   */
  tryCache(key, data) {
    if (!this.sourceEntry) return null;
    return cacheData(key, data, this.sourceEntry, this.config.cacheTTL);
  }

  /**
   * Step 9: Get cached data if available.
   */
  getCached(key) {
    return getCachedData(key);
  }

  /**
   * Step 10: Execute the full pipeline for a query.
   * This is the main entry point for using a connector.
   */
  async execute(query, env) {
    const cacheKey = `${this.sourceId}:${JSON.stringify(query)}`;

    // Try cache first
    const cached = this.getCached(cacheKey);
    if (cached) {
      return { records: cached.data, fromCache: true, sourceId: this.sourceId };
    }

    // Check license
    const licenseResult = evaluateLicense(this.sourceEntry);
    if (licenseResult.decision === 'rejected' || licenseResult.decision === 'review_required') {
      return createFallbackResponse(this.sourceId, `License not approved: ${licenseResult.reason}`);
    }

    try {
      // Run the pipeline
      await this.connect();
      await this.authenticate();
      await this.rateLimiter.waitForNextSlot();

      const rawResponse = await this.request(query, env);
      this.validate(rawResponse);

      // Detect schema changes
      if (rawResponse && typeof rawResponse === 'object') {
        const sample = Array.isArray(rawResponse) ? rawResponse[0] : rawResponse;
        const schema = inferSchema(sample);
        const schemaRecord = recordSchema(this.sourceId, schema);
        if (shouldQuarantine(schemaRecord)) {
          return createFallbackResponse(this.sourceId, 'Schema change detected — data quarantined for review');
        }
      }

      const records = this.normalize(rawResponse);
      const recordsWithProvenance = this.attachProvenance(records, this.sourceEntry?.apiBaseUrl || 'unknown');

      // Validate each record
      for (const record of recordsWithProvenance) {
        const validation = validateNormalizedRecord(record);
        if (!validation.valid) {
          console.warn(`Record validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Cache if permitted
      this.tryCache(cacheKey, recordsWithProvenance);

      // Audit
      await writeAuditEntry({}, createSuccessAudit(this.sourceId, 'query', recordsWithProvenance.length)).catch(() => {});

      return {
        records: recordsWithProvenance,
        fromCache: false,
        sourceId: this.sourceId,
        sourceName: this.sourceEntry?.sourceName,
        count: recordsWithProvenance.length
      };
    } catch (error) {
      // Handle failure
      const failure = handleFailure(error, this.sourceId, 0);
      await writeAuditEntry({}, createFailureAudit(this.sourceId, 'query', error)).catch(() => {});
      return createFallbackResponse(this.sourceId, failure.message);
    }
  }
}
