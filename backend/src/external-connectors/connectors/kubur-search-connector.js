/**
 * Kubur Search Connector — kubursearch.com
 *
 * Connects to kubursearch.com, Singapore's largest Muslim grave search
 * platform with 80,000+ records across Pusara Aman and Pusara Abadi
 * cemeteries. Founded by Ramzul Ihsan, a former cemetery worker who
 * mapped over 66,000 burial sites with 1-meter accuracy.
 *
 * Website: https://kubursearch.com
 * Search: https://kubursearch.com/search
 * Coverage: Pusara Aman, Pusara Abadi, Choa Chu Kang Muslim
 *
 * API Status: No public REST API. This connector provides:
 *   1. Deep-link search integration — constructs kubursearch.com search
 *      URLs from GraveAtlas queries so users can view results on the
 *      Kubur Search platform directly
 *   2. Cemetery coverage metadata — known cemeteries, block ranges,
 *      exhumed blocks, and coverage status
 *   3. Data attribution and linking — GraveAtlas records that match
 *      Kubur Search entries can link back with attribution
 *
 * License: Data © Kubur Search / kubursearch.com — displayed with
 *   attribution, not redistributed. GraveAtlas links to their platform
 *   rather than copying records.
 *
 * Attribution: "Kubur Search — kubursearch.com"
 *   Founder: Ramzul Ihsan
 *
 * Coverage: Singapore — Muslim cemeteries (Pusara Aman, Pusara Abadi,
 *   Choa Chu Kang Muslim section, Jalan Kubor Cemetery)
 */

import { BaseConnector } from '../connector-base.js';
import { createNormalizedRecord } from '../normalized-schema.js';

// ── Data Source Info ──

const KUBUR_SEARCH_SOURCES = {
  'kubur-search-web': {
    name: 'Kubur Search Web Platform',
    description: 'Singapore\'s largest Muslim grave database — 80,000+ records',
    sourceType: 'web-portal',
    license: '© Kubur Search — kubursearch.com',
    attribution: 'Kubur Search — kubursearch.com',
    portalUrl: 'https://kubursearch.com',
    searchUrl: 'https://kubursearch.com/search',
    coverage: 'Pusara Aman, Pusara Abadi, Choa Chu Kang Muslim, Jalan Kubor',
    recordCount: 80000,
    accuracy: 'up to 1 meter',
    founder: 'Ramzul Ihsan',
    features: [
      'Block and plot number search',
      'GPS navigation to exact grave plot',
      '1-meter accuracy coordinates',
      'Photo upload and review workflow',
      'Dapur Kubur (grave monument) services',
      'Cemetery stories',
      'Volunteer program',
      'Exhumed blocks tracking',
      'Coverage map',
      'Ziarah (visitation) transport service'
    ]
  },
  'kubur-search-exhumed': {
    name: 'Kubur Search — Exhumed Blocks',
    description: 'Records of exhumed blocks at Choa Chu Kang Muslim Cemetery',
    sourceType: 'web-portal',
    license: '© Kubur Search — kubursearch.com',
    attribution: 'Kubur Search — kubursearch.com',
    portalUrl: 'https://kubursearch.com/choa-chu-kang-muslim-cemetery-exhumed-blocks'
  },
  'kubur-search-makam': {
    name: 'Kubur Search — Makam (Historical Graves)',
    description: 'Historical and significant graves (Makam) in Singapore',
    sourceType: 'web-portal',
    license: '© Kubur Search — kubursearch.com',
    attribution: 'Kubur Search — kubursearch.com',
    portalUrl: 'https://kubursearch.com/makam'
  },
  'kubur-search-stories': {
    name: 'Kubur Search — Cemetery Stories',
    description: 'Community-contributed cemetery stories and histories',
    sourceType: 'web-portal',
    license: '© Kubur Search — kubursearch.com',
    attribution: 'Kubur Search — kubursearch.com',
    portalUrl: 'https://kubursearch.com/cemetery-stories'
  }
};

// Cemetery coverage from kubursearch.com
const KUBUR_SEARCH_CEMETERIES = [
  {
    name: 'Pusara Aman Muslim Cemetery',
    region: 'Lim Chu Kang, Singapore',
    latitude: 1.3828,
    longitude: 103.7090,
    type: 'muslim',
    status: 'active',
    coverageStatus: 'full',
    recordCount: '40000+',
    kuburSearchUrl: 'https://kubursearch.com/search?cemetery=pusara-aman',
    notes: 'Primary coverage — most blocks mapped with 1m accuracy'
  },
  {
    name: 'Pusara Abadi Muslim Cemetery',
    region: 'Lim Chu Kang, Singapore',
    latitude: 1.3835,
    longitude: 103.7085,
    type: 'muslim',
    status: 'active',
    coverageStatus: 'full',
    recordCount: '40000+',
    kuburSearchUrl: 'https://kubursearch.com/search?cemetery=pusara-abadi',
    notes: 'Primary coverage — most blocks mapped with 1m accuracy'
  },
  {
    name: 'Choa Chu Kang Muslim Cemetery',
    region: 'Choa Chu Kang, Singapore',
    latitude: 1.3740,
    longitude: 103.7560,
    type: 'muslim',
    status: 'partial',
    coverageStatus: 'partial',
    recordCount: 'unknown',
    kuburSearchUrl: 'https://kubursearch.com/search?cemetery=cck-muslim',
    notes: 'Some exhumed blocks — see kubursearch.com exhumed blocks page'
  },
  {
    name: 'Jalan Kubor Cemetery',
    region: 'Kampong Glam, Singapore',
    latitude: 1.3010,
    longitude: 103.8600,
    type: 'muslim',
    status: 'heritage',
    coverageStatus: 'partial',
    recordCount: 'unknown',
    kuburSearchUrl: 'https://kubursearch.com/search?cemetery=jalan-kubor',
    notes: 'Herage cemetery — limited records available'
  }
];

const BASE_URL = 'https://kubursearch.com';
const SEARCH_URL = BASE_URL + '/search';

export class KuburSearchConnector extends BaseConnector {
  constructor() {
    super('kubur-search', {
      rateLimit: { minIntervalMs: 2000, maxRetries: 1, retryBackoffMs: 5000 },
      cacheTTL: 24 * 60 * 60 * 1000 // 24 hours (static metadata)
    });
    this.sourceName = 'Kubur Search — kubursearch.com';
    this.websiteUrl = BASE_URL;
  }

  /**
   * Step 1: REQUEST — Build deep-link search results.
   * Since kubursearch.com has no public API, we construct search URLs
   * and return cemetery coverage metadata. Users click through to
   * kubursearch.com to view actual records.
   */
  async request(query, env) {
    const queryText = (query.search || query.query || '').toLowerCase().trim();
    const cemeteryFilter = (query.cemetery || '').toLowerCase().trim();
    const blockFilter = query.block || '';
    const plotFilter = query.plot || '';

    const results = {
      searchLinks: [],
      cemeteryRecords: [],
      sourcesQueried: [],
      attribution: 'Kubur Search — kubursearch.com',
      note: 'Kubur Search does not provide a public API. Results include deep links to kubursearch.com for viewing actual burial records.'
    };

    // 1. Build search deep-link
    let searchParams = new URLSearchParams();
    if (queryText) searchParams.set('q', queryText);
    if (cemeteryFilter) searchParams.set('cemetery', cemeteryFilter);
    if (blockFilter) searchParams.set('block', blockFilter);
    if (plotFilter) searchParams.set('plot', plotFilter);

    const searchLink = SEARCH_URL + (searchParams.toString() ? '?' + searchParams.toString() : '');
    results.searchLinks.push({
      url: searchLink,
      description: 'Search Kubur Search for: ' + (queryText || cemeteryFilter || blockFilter || plotFilter || 'all records'),
      type: 'search'
    });

    // 2. Add cemetery-specific deep links
    let cemeteries = KUBUR_SEARCH_CEMETERIES;
    if (cemeteryFilter) {
      cemeteries = KUBUR_SEARCH_CEMETERIES.filter(function(c) {
        return c.name.toLowerCase().includes(cemeteryFilter) ||
               c.region.toLowerCase().includes(cemeteryFilter);
      });
    } else if (queryText) {
      cemeteries = KUBUR_SEARCH_CEMETERIES.filter(function(c) {
        return c.name.toLowerCase().includes(queryText) ||
               c.region.toLowerCase().includes(queryText) ||
               c.type.includes(queryText);
      });
    }

    // If no text filter, return all cemeteries
    if (!queryText && !cemeteryFilter) {
      cemeteries = KUBUR_SEARCH_CEMETERIES;
    }

    for (const cemetery of cemeteries) {
      // Build per-cemetery search link
      let cemSearchUrl = SEARCH_URL + '?cemetery=' + encodeURIComponent(
        cemetery.name.toLowerCase().replace(/\s+/g, '-')
      );
      if (blockFilter) cemSearchUrl += '&block=' + encodeURIComponent(blockFilter);
      if (plotFilter) cemSearchUrl += '&plot=' + encodeURIComponent(plotFilter);
      if (queryText) cemSearchUrl += '&q=' + encodeURIComponent(queryText);

      results.cemeteryRecords.push({
        name: cemetery.name,
        region: cemetery.region,
        latitude: cemetery.latitude,
        longitude: cemetery.longitude,
        type: cemetery.type,
        status: cemetery.status,
        coverageStatus: cemetery.coverageStatus,
        recordCount: cemetery.recordCount,
        kuburSearchUrl: cemSearchUrl,
        notes: cemetery.notes,
        attribution: 'Kubur Search — kubursearch.com'
      });

      results.searchLinks.push({
        url: cemSearchUrl,
        description: 'Browse ' + cemetery.name + ' on Kubur Search',
        type: 'cemetery'
      });
    }

    // 3. Add special section links
    results.searchLinks.push({
      url: BASE_URL + '/choa-chu-kang-muslim-cemetery-exhumed-blocks',
      description: 'Exhumed blocks at Choa Chu Kang Muslim Cemetery',
      type: 'special'
    });
    results.searchLinks.push({
      url: BASE_URL + '/makam',
      description: 'Historical graves (Makam) in Singapore',
      type: 'special'
    });
    results.searchLinks.push({
      url: BASE_URL + '/cemetery-stories',
      description: 'Cemetery stories and community histories',
      type: 'special'
    });
    results.searchLinks.push({
      url: BASE_URL + '/coverage',
      description: 'Coverage map — see which blocks are mapped',
      type: 'special'
    });
    results.searchLinks.push({
      url: BASE_URL + '/report',
      description: 'Report a grave (community contribution)',
      type: 'special'
    });

    results.sourcesQueried.push('kubur-search-web');
    results.totalCount = results.cemeteryRecords.length;

    return results;
  }

  /**
   * Step 2: VALIDATE — Validate that we got meaningful results.
   */
  validate(data) {
    if (!data) return false;
    if (!data.searchLinks || data.searchLinks.length === 0) return false;
    return true;
  }

  /**
   * Step 3: NORMALIZE — Convert to GraveAtlas normalized record format.
   * Since we don't fetch individual records (no API), we return
   * link references instead of full normalized records.
   */
  normalize(data) {
    const links = [];
    for (const link of (data.searchLinks || [])) {
      links.push({
        sourceId: 'kubur-search',
        sourceName: 'Kubur Search',
        url: link.url,
        description: link.description,
        type: link.type,
        attribution: 'Kubur Search — kubursearch.com',
        license: '© Kubur Search — link with attribution'
      });
    }
    return links;
  }

  /**
   * List all available data sources.
   */
  listSources() {
    return Object.keys(KUBUR_SEARCH_SOURCES).map(function(key) {
      return {
        id: key,
        ...KUBUR_SEARCH_SOURCES[key]
      };
    });
  }

  /**
   * Get source info summary.
   */
  getSourceInfo() {
    return {
      connectorId: 'kubur-search',
      connectorName: 'Kubur Search',
      website: BASE_URL,
      description: 'Singapore\'s largest Muslim grave search platform — 80,000+ records with 1-meter accuracy',
      coverage: ['Pusara Aman', 'Pusara Abadi', 'Choa Chu Kang Muslim', 'Jalan Kubor'],
      recordCount: 80000,
      founder: 'Ramzul Ihsan',
      license: '© Kubur Search — kubursearch.com',
      attribution: 'Kubur Search — kubursearch.com',
      apiAvailable: false,
      integrationType: 'deep-link'
    };
  }

  /**
   * Build a search URL for a specific query.
   */
  buildSearchUrl(params) {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('q', params.query);
    if (params.cemetery) searchParams.set('cemetery', params.cemetery);
    if (params.block) searchParams.set('block', params.block);
    if (params.plot) searchParams.set('plot', params.plot);
    return SEARCH_URL + (searchParams.toString() ? '?' + searchParams.toString() : '');
  }

  /**
   * Get coverage status for a specific cemetery.
   */
  getCemeteryCoverage(cemeteryName) {
    const lower = cemeteryName.toLowerCase();
    const found = KUBUR_SEARCH_CEMETERIES.find(function(c) {
      return c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase());
    });
    return found || null;
  }
}
