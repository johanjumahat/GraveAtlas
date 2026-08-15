/**
 * OpenStreetMap Overpass Connector
 *
 * Connects to the OpenStreetMap Overpass API to fetch cemetery locations.
 * This wraps the existing osm-overpass importer with the standardized
 * BaseConnector interface (Part 3).
 *
 * License: ODbL 1.0 — requires attribution "© OpenStreetMap contributors"
 * Data type: Cemetery boundaries/points (not individual burial records)
 */

import { BaseConnector } from '../connector-base.js';
import { buildOverpassQuery } from '../../importers/osm-overpass.js';
import { createNormalizedRecord } from '../normalized-schema.js';

export class OSMConnector extends BaseConnector {
  constructor() {
    super('osm-overpass', {
      rateLimit: { minIntervalMs: 5000, maxRetries: 2, retryBackoffMs: 10000 },
      cacheTTL: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  async request(query) {
    const overpassQuery = buildOverpassQuery({
      area: query.area,
      includeHistoric: true,
      includeGraveYard: true,
      includeGraves: false,
      timeout: 180
    });

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GraveAtlas/1.0 (cemetery mapping app; https://github.com/johanjumahat/GraveAtlas)'
      },
      body: 'data=' + encodeURIComponent(overpassQuery),
      signal: AbortSignal.timeout(180000) // 3 min timeout
    });

    if (!response.ok) {
      const error = new Error(`Overpass API returned ${response.status}`);
      error.status = response.status;
      if (response.status === 429) {
        const retryAfter = this.rateLimiter.parseRetryAfter(response);
        if (retryAfter) error.retryAfterMs = retryAfter;
      }
      throw error;
    }

    const data = await response.json();
    return data;
  }

  validate(rawResponse) {
    if (!rawResponse || !rawResponse.elements) {
      throw new Error('Invalid Overpass response: missing elements array');
    }
    return true;
  }

  normalize(rawResponse) {
    const records = [];
    const elements = rawResponse.elements || [];

    for (const el of elements) {
      const tags = el.tags || {};
      let lat, lon;

      if (el.type === 'node') {
        lat = el.lat;
        lon = el.lon;
      } else if (el.type === 'way' || el.type === 'relation') {
        // Use center if available, otherwise skip coordinates
        lat = el.center?.lat || el.lat || null;
        lon = el.center?.lon || el.lon || null;
      }

      const name = tags.name || tags['name:en'] || 'Unnamed Cemetery';

      records.push(createNormalizedRecord({
        externalRecordId: `osm-${el.type}-${el.id}`,
        cemetery: name,
        latitude: lat,
        longitude: lon,
        sourceOrganization: 'OpenStreetMap Foundation',
        sourceId: 'osm-overpass',
        sourceTimestamp: new Date().toISOString(),
        sourceVersion: 'live',
        license: 'ODbL 1.0',
        confidence: 'high',
        status: 'external',
        recordUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`
      }));
    }

    return records;
  }
}
