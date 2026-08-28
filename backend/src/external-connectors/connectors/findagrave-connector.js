/**
 * Find a Grave Connector
 *
 * Connects to Find a Grave's public memorial search to fetch
 * burial/memorial records worldwide.
 *
 * API: Find a Grave does not provide an official public API.
 * However, memorial pages are publicly accessible and searchable.
 * This connector uses the public search endpoint that the website
 * itself uses for its search functionality.
 *
 * License: Find a Grave data is © Ancestry/Find a Grave.
 *   Memorial data is contributed by community volunteers.
 *   Attribution required: "Find a Grave"
 *   GraveAtlas uses this for read-only search/enrichment — we do NOT
 *   store or redistribute Find a Grave data; we only display results
 *   with attribution in real-time.
 *
 * Data type: Individual memorial/burial records (name, dates, cemetery, plot, GPS)
 * Coverage: 200M+ memorials worldwide, primarily US/Europe
 */

import { BaseConnector } from '../connector-base.js';
import { createNormalizedRecord } from '../normalized-schema.js';

const FAG_SEARCH_URL = 'https://www.findagrave.com/memorial/search';

export class FindAGraveConnector extends BaseConnector {
  constructor() {
    super('findagrave', {
      rateLimit: { minIntervalMs: 3000, maxRetries: 1, retryBackoffMs: 10000 },
      cacheTTL: 6 * 60 * 60 * 1000 // 6 hours (shorter — FAG data changes often)
    });
  }

  async request(query) {
    const searchTerms = query.search || query.name || '';
    const page = query.page || 1;
    const pageSize = query.limit || 50;

    // Find a Grave public search uses query params
    const params = new URLSearchParams({
      'firstname': searchTerms,
      'lastname': '',
      'birthyear': '',
      'deathyear': '',
      'location': query.location || '',
      'page': String(page),
      'pagesize': String(pageSize)
    });

    // Try the JSON search API endpoint
    const url = `https://www.findagrave.com/memorial/search?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GraveAtlas/1.0 (cemetery mapping app; https://github.com/johanjumahat/GraveAtlas)',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const error = new Error(`Find a Grave returned ${response.status}`);
      error.status = response.status;
      if (response.status === 429) {
        error.retryAfterMs = 30000;
      }
      throw error;
    }

    // Find a Grave returns HTML, not JSON. We parse the memorial listings.
    const html = await response.text();
    return this.parseSearchHTML(html);
  }

  /**
   * Parse Find a Grave HTML search results into structured data.
   */
  parseSearchHTML(html) {
    const results = [];

    // Extract memorial cards from HTML
    // Find a Grave uses data attributes and structured divs
    const memorialRegex = /data-memorial-id="(\d+)"[^>]*>/g;
    const nameRegex = /class="memorial-name"[^>]*>([^<]+)</g;
    const datesRegex = /class="birth-death"[^>]*>([^<]+)</g;
    const cemeteryRegex = /class="cemetery-name"[^>]*>([^<]+)</g;
    const coordsRegex = /data-latitude="([0-9.-]+)"\s+data-longitude="([0-9.-]+)"/g;

    let memorialMatch;
    while ((memorialMatch = memorialRegex.exec(html)) !== null) {
      results.push({
        id: memorialMatch[1],
        name: '',
        dates: '',
        cemetery: '',
        latitude: null,
        longitude: null
      });
    }

    let nameMatch;
    let idx = 0;
    while ((nameMatch = nameRegex.exec(html)) !== null && idx < results.length) {
      results[idx].name = nameMatch[1].trim();
      idx++;
    }

    let datesMatch;
    idx = 0;
    while ((datesMatch = datesRegex.exec(html)) !== null && idx < results.length) {
      results[idx].dates = datesMatch[1].trim();
      idx++;
    }

    let cemMatch;
    idx = 0;
    while ((cemMatch = cemeteryRegex.exec(html)) !== null && idx < results.length) {
      results[idx].cemetery = cemMatch[1].trim();
      idx++;
    }

    let coordsMatch;
    idx = 0;
    while ((coordsMatch = coordsRegex.exec(html)) !== null && idx < results.length) {
      results[idx].latitude = parseFloat(coordsMatch[1]);
      results[idx].longitude = parseFloat(coordsMatch[2]);
      idx++;
    }

    return { results };
  }

  validate(rawResponse) {
    if (!rawResponse || !rawResponse.results) {
      throw new Error('Invalid Find a Grave response: missing results');
    }
    return true;
  }

  normalize(rawResponse) {
    const records = [];
    const memorials = rawResponse.results || [];

    for (const memorial of memorials) {
      const name = memorial.name || 'Unknown';
      const dateStr = memorial.dates || '';

      // Parse dates like "1920–1985" or "1920-1985"
      let birthYear = null, deathYear = null;
      const dateMatch = dateStr.match(/(\d{4})\s*[–\-]\s*(\d{4})/);
      if (dateMatch) {
        birthYear = dateMatch[1];
        deathYear = dateMatch[2];
      }

      records.push(createNormalizedRecord({
        externalRecordId: `fag-${memorial.id}`,
        personName: name,
        cemetery: memorial.cemetery || null,
        deathDate: deathYear || null,
        birthDate: birthYear || null,
        latitude: memorial.latitude || null,
        longitude: memorial.longitude || null,
        sourceOrganization: 'Find a Grave / Ancestry',
        sourceId: 'findagrave',
        sourceTimestamp: new Date().toISOString(),
        sourceVersion: 'live',
        license: '© Find a Grave (display only, not stored)',
        confidence: 'medium',
        status: 'external',
        recordUrl: memorial.id ? `https://www.findagrave.com/memorial/${memorial.id}` : null
      }));
    }

    return records;
  }

  getSourceInfo() {
    return {
      sourceId: 'findagrave',
      sourceName: 'Find a Grave',
      coverage: '200M+ memorials worldwide, primarily US and Europe',
      license: '© Find a Grave / Ancestry — display only with attribution, no storage/redistribution',
      attribution: 'Find a Grave'
    };
  }
}
