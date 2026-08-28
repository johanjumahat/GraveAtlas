/**
 * CWGC (Commonwealth War Graves Commission) Connector
 *
 * Connects to the CWGC public casualty database API to fetch
 * Commonwealth war casualty burial records.
 *
 * API: https://www.cwgc.org/find-records/find-war-dead/
 * The CWGC website provides a search interface backed by an internal API.
 * No official API key required for read-only public searches.
 *
 * License: CWGC data is © Commonwealth War Graves Commission.
 *   Public search results are freely accessible for personal/research use.
 *   Attribution required: "Commonwealth War Graves Commission"
 * Data type: Individual war casualty burial records (name, dates, cemetery, plot)
 *
 * Coverage: 1.7M+ Commonwealth war dead from WW1 and WW2 across 150+ countries.
 */

import { BaseConnector } from '../connector-base.js';
import { createNormalizedRecord } from '../normalized-schema.js';

const CWGC_SEARCH_URL = 'https://www.cwgc.org/api/casualty/search';

export class CWGCConnector extends BaseConnector {
  constructor() {
    super('cwgc', {
      rateLimit: { minIntervalMs: 1500, maxRetries: 2, retryBackoffMs: 5000 },
      cacheTTL: 12 * 60 * 60 * 1000 // 12 hours
    });
  }

  async request(query) {
    const searchTerms = query.search || query.name || '';
    const page = query.page || 1;
    const pageSize = query.limit || 50;

    // CWGC internal API expects JSON POST
    const body = {
      search: searchTerms,
      page: page,
      pageSize: pageSize,
      sort: 'name-asc'
    };

    const response = await fetch(CWGC_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GraveAtlas/1.0 (cemetery mapping app; https://github.com/johanjumahat/GraveAtlas)',
        'Accept': 'application/json',
        'Referer': 'https://www.cwgc.org/find-records/find-war-dead/'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const error = new Error(`CWGC API returned ${response.status}`);
      error.status = response.status;
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) error.retryAfterMs = parseInt(retryAfter) * 1000;
      }
      throw error;
    }

    return await response.json();
  }

  validate(rawResponse) {
    if (!rawResponse) {
      throw new Error('Invalid CWGC response: empty body');
    }
    // CWGC returns either { results: [...] } or { casualties: [...] }
    const records = rawResponse.results || rawResponse.casualties || rawResponse.items || [];
    if (!Array.isArray(records)) {
      throw new Error('Invalid CWGC response: results is not an array');
    }
    return true;
  }

  normalize(rawResponse) {
    const records = [];
    const casualties = rawResponse.results || rawResponse.casualties || rawResponse.items || [];

    for (const casualty of casualties) {
      const cem = casualty.cemetery || casualty.cemeteryMemorial || {};
      const name = [
        casualty.forename || casualty.givenName,
        casualty.surname || casualty.familyName || casualty.initials
      ].filter(Boolean).join(' ') || casualty.name || 'Unknown';

      const birthYear = casualty.dateOfBirth || casualty.yearOfBirth;
      const deathYear = casualty.dateOfDeath || casualty.dateOfDeath || casualty.yearOfDeath;
      const burialDate = casualty.burialDate || casualty.dateOfBurial;

      records.push(createNormalizedRecord({
        externalRecordId: casualty.id || casualty.casualtyId || `cwgc-${name}-${deathYear || ''}`,
        personName: name,
        givenNames: casualty.forename || casualty.givenName || null,
        familyName: casualty.surname || casualty.familyName || null,
        cemetery: cem.name || cem.cemeteryName || cem.cemetery || null,
        cemeteryId: cem.id || cem.cemeteryId || null,
        burialDate: burialDate || null,
        deathDate: deathYear || null,
        birthDate: birthYear || null,
        gravePlot: casualty.grave || casualty.plot || casualty.graveReference || null,
        section: casualty.section || cem.section || null,
        row: casualty.row || cem.row || null,
        latitude: parseFloat(cem.latitude || cem.lat) || null,
        longitude: parseFloat(cem.longitude || cem.lon) || null,
        sourceOrganization: 'Commonwealth War Graves Commission',
        sourceId: 'cwgc',
        sourceTimestamp: new Date().toISOString(),
        sourceVersion: 'live',
        license: '© CWGC (personal/research use)',
        confidence: 'high',
        status: 'external',
        recordUrl: casualty.url || (casualty.id ? `https://www.cwgc.org/find-records/find-war-dead/casualty-details/${casualty.id}/` : null)
      }));
    }

    return records;
  }

  /**
   * Fetch cemetery details from CWGC.
   */
  async fetchCemeteryDetails(cemeteryId) {
    const url = `https://www.cwgc.org/api/cemetery/${cemeteryId}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GraveAtlas/1.0 (cemetery mapping app; https://github.com/johanjumahat/GraveAtlas)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`CWGC cemetery API returned ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get CWGC source metadata.
   */
  getSourceInfo() {
    return {
      sourceId: 'cwgc',
      sourceName: 'Commonwealth War Graves Commission',
      coverage: '1.7M+ Commonwealth war dead (WW1, WW2) across 150+ countries',
      license: '© CWGC — personal/research use, attribution required',
      attribution: 'Commonwealth War Graves Commission'
    };
  }
}
