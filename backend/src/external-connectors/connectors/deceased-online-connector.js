/**
 * UK Deceased Online Connector
 *
 * Connects to Deceased Online (deceasedonline.com), the UK's leading
 * burial and cremation records database, covering councils and
 * cemeteries across the United Kingdom.
 *
 * API: Deceased Online does not provide an official API.
 *   Public search is available at https://www.deceasedonline.com/
 *   Search results return basic record metadata; full records require
 *   registration/payment. GraveAtlas only uses the free public search
 *   preview data (name, cemetery, year range).
 *
 * License: © Deceased Online / Tablet Infotec Ltd.
 *   Free public search preview data may be displayed with attribution.
 *   Full records require a subscription — GraveAtlas does NOT access paid data.
 *   Attribution required: "Deceased Online"
 *
 * Data type: Individual burial/cremation records (name, dates, cemetery)
 * Coverage: UK — millions of records from 200+ cemeteries and crematoria
 */

import { BaseConnector } from '../connector-base.js';
import { createNormalizedRecord } from '../normalized-schema.js';

const DO_SEARCH_URL = 'https://www.deceasedonline.com/search';

export class DeceasedOnlineConnector extends BaseConnector {
  constructor() {
    super('uk-deceased-online', {
      rateLimit: { minIntervalMs: 3000, maxRetries: 1, retryBackoffMs: 10000 },
      cacheTTL: 12 * 60 * 60 * 1000 // 12 hours
    });
  }

  async request(query) {
    const searchTerms = query.search || query.name || '';
    const page = query.page || 1;

    // Deceased Online uses POST form data for search
    const formData = new URLSearchParams({
      'ctl00$MainContent$ctl_txtName': searchTerms,
      'ctl00$MainContent$ctl_ddlArea': 'all',
      'ctl00$MainContent$ctl_ddlYear': '',
      'ctl00$MainContent$btnSearch': 'Search'
    });

    const response = await fetch(DO_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GraveAtlas/1.0 (cemetery mapping app; https://github.com/johanjumahat/GraveAtlas)',
        'Accept': 'text/html',
        'Accept-Language': 'en-GB,en;q=0.9'
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const error = new Error(`Deceased Online returned ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const html = await response.text();
    return this.parseSearchHTML(html);
  }

  /**
   * Parse Deceased Online HTML search results.
   * The site returns an ASP.NET page with result tables/divs.
   */
  parseSearchHTML(html) {
    const results = [];

    // Deceased Online results are in table rows with class "result-row"
    // or divs with class "search-result"
    const resultBlockRegex = /<(?:tr|div)[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/(?:tr|div)>/gi;
    const nameRegex = /(?:class="[^"]*name[^"]*"[^>]*>|<strong>)([^<]+)/i;
    const cemeteryRegex = /(?:class="[^"]*cemetery[^"]*"[^>]*>|Cemetery:\s*)([^<]+)/i;
    const datesRegex = /(\d{4})\s*[–\-]\s*(\d{4})/;

    let blockMatch;
    while ((blockMatch = resultBlockRegex.exec(html)) !== null) {
      const block = blockMatch[1];
      const nameMatch = block.match(nameRegex);
      const cemMatch = block.match(cemeteryRegex);
      const datesMatch = block.match(datesRegex);

      if (nameMatch) {
        results.push({
          name: nameMatch[1].trim(),
          cemetery: cemMatch ? cemMatch[1].trim() : '',
          birthYear: datesMatch ? datesMatch[1] : null,
          deathYear: datesMatch ? datesMatch[2] : null,
          id: `do-${results.length}-${Date.now()}`
        });
      }
    }

    return { results };
  }

  validate(rawResponse) {
    if (!rawResponse || !rawResponse.results) {
      throw new Error('Invalid Deceased Online response: missing results');
    }
    return true;
  }

  normalize(rawResponse) {
    const records = [];
    const entries = rawResponse.results || [];

    for (const entry of entries) {
      records.push(createNormalizedRecord({
        externalRecordId: entry.id || `do-${entry.name}-${entry.deathYear || ''}`,
        personName: entry.name || 'Unknown',
        cemetery: entry.cemetery || null,
        deathDate: entry.deathYear || null,
        birthDate: entry.birthYear || null,
        sourceOrganization: 'Deceased Online / Tablet Infotec Ltd',
        sourceId: 'uk-deceased-online',
        sourceTimestamp: new Date().toISOString(),
        sourceVersion: 'live',
        license: '© Deceased Online (free preview only)',
        confidence: 'low',
        status: 'external',
        recordUrl: 'https://www.deceasedonline.com/search'
      }));
    }

    return records;
  }

  getSourceInfo() {
    return {
      sourceId: 'uk-deceased-online',
      sourceName: 'Deceased Online (UK)',
      coverage: 'UK — millions of burial/cremation records from 200+ cemeteries',
      license: '© Deceased Online — free public preview data only, attribution required',
      attribution: 'Deceased Online'
    };
  }
}
