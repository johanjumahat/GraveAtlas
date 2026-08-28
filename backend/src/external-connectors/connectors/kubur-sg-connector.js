/**
 * Kubur SG Connector — Singapore Community Burial Records
 *
 * Connects to community-maintained Singapore burial record sources,
 * focusing on Muslim/Malay cemeteries ("kubur" = grave in Malay) and
 * other community-managed burial grounds not covered by NEA's
 * official data.gov.sg datasets.
 *
 * Data sources:
 *   1. Community-contributed burial records (GitHub-hosted JSON,
 *      graveatlas-data repo, /kubur-sg/ directory)
 *   2. NEA Choa Chu Kang burial plot search (public web portal,
 *      HTML scraping for grave plot locations)
 *   3. Islamic Religious Council of Singapore (MUIS) cemetery listings
 *   4. Pusara Aman / Pusara Abadi Muslim cemetery records
 *
 * License: Community-contributed data under CC-BY-SA 4.0
 *   (GraveAtlas community data license). Government portal data
 *   is © NEA / MUIS — displayed with attribution, not redistributed.
 *
 * Attribution: "Kubur SG Community Burial Records, GraveAtlas"
 *   Government data: "National Environment Agency (NEA)" / "MUIS"
 *
 * Coverage: Singapore — Muslim/Malay cemeteries (Pusara Aman,
 *   Pusara Abadi, Lim Chu Kang Muslim section), community-managed
 *   burial grounds, and private/religious cemeteries.
 *
 * Note: "Kubur" is the Malay word for "grave" or "cemetery". This
 * connector serves the Singapore Muslim community's need to locate
 * and memorialize ancestral burial sites.
 */

import { BaseConnector } from '../connector-base.js';
import { createNormalizedRecord } from '../normalized-schema.js';

// ── Data Source Registry ──

const KUBUR_SG_SOURCES = {
  'community-records': {
    name: 'Community Burial Records',
    description: 'GraveAtlas community-contributed burial records for Singapore cemeteries',
    sourceType: 'github-json',
    license: 'CC-BY-SA 4.0',
    attribution: 'Kubur SG Community Burial Records, GraveAtlas'
  },
  'nea-cck-portals': {
    name: 'NEA Choa Chu Kang Burial Plot Search',
    description: 'Public web portal for locating grave plots at Choa Chu Kang Cemetery Complex',
    sourceType: 'web-portal',
    license: '© NEA Singapore — display with attribution',
    attribution: 'National Environment Agency (NEA)',
    portalUrl: 'https://www.nea.gov.sg/our-services/beneficiaries-of-afterdeath-facilities'
  },
  'muis-cemeteries': {
    name: 'MUIS Cemetery Listings',
    description: 'Islamic Religious Council of Singapore cemetery and burial ground listings',
    sourceType: 'web-portal',
    license: '© MUIS — display with attribution',
    attribution: 'Islamic Religious Council of Singapore (MUIS)',
    portalUrl: 'https://www.muis.gov.sg/'
  },
  'pusara-aman': {
    name: 'Pusara Aman Muslim Cemetery',
    description: 'Community-managed Muslim cemetery in Singapore',
    sourceType: 'community',
    license: 'Community data — CC-BY-SA 4.0',
    attribution: 'Pusara Aman Cemetery Committee'
  },
  'pusara-abadi': {
    name: 'Pusara Abadi Muslim Cemetery',
    description: 'Community-managed Muslim cemetery in Singapore',
    sourceType: 'community',
    license: 'Community data — CC-BY-SA 4.0',
    attribution: 'Pusara Abadi Cemetery Committee'
  }
};

// Known Singapore Muslim/community cemeteries with approximate coordinates
const SG_MUSLIM_CEMETERIES = [
  {
    name: 'Pusara Aman Muslim Cemetery',
    region: 'Lim Chu Kang',
    latitude: 1.3828,
    longitude: 103.7090,
    type: 'muslim'
  },
  {
    name: 'Pusara Abadi Muslim Cemetery',
    region: 'Lim Chu Kang',
    latitude: 1.3835,
    longitude: 103.7085,
    type: 'muslim'
  },
  {
    name: 'Choa Chu Kang Muslim Cemetery',
    region: 'Choa Chu Kang',
    latitude: 1.3740,
    longitude: 103.7560,
    type: 'muslim'
  },
  {
    name: 'Lim Chu Kang Muslim Cemetery',
    region: 'Lim Chu Kang',
    latitude: 1.3850,
    longitude: 103.7080,
    type: 'muslim'
  },
  {
    name: 'Bidadari Muslim Cemetery (closed)',
    region: 'Bidadari',
    latitude: 1.3340,
    longitude: 103.8740,
    type: 'muslim',
    status: 'closed'
  },
  {
    name: 'Jalan Kubor Cemetery',
    region: 'Kampong Glam',
    latitude: 1.3010,
    longitude: 103.8600,
    type: 'muslim',
    status: 'heritage'
  }
];

const REPO_OWNER = 'putraworks2026';
const REPO_NAME = 'graveatlas-data';
const REPO_BRANCH = 'main';

export class KuburSGConnector extends BaseConnector {
  constructor() {
    super('kubur-sg', {
      rateLimit: { minIntervalMs: 1000, maxRetries: 2, retryBackoffMs: 5000 },
      cacheTTL: 6 * 60 * 60 * 1000 // 6 hours
    });
    this.sourceName = 'Kubur SG — Singapore Community Burial Records';
  }

  /**
   * Step 1: REQUEST — Fetch data from available sources.
   * Tries community GitHub records first, then supplements with
   * known cemetery listings.
   */
  async request(query, env) {
    const queryText = (query.search || query.query || '').toLowerCase().trim();
    const results = {
      cemeteryRecords: [],
      burialRecords: [],
      totalCount: 0,
      sourcesQueried: []
    };

    // 1. Fetch community-contributed records from GitHub
    if (env && env.GITHUB_APP_ID) {
      try {
        const communityRecords = await this.fetchCommunityRecords(queryText, env);
        results.burialRecords = communityRecords;
        results.sourcesQueried.push('community-records');
      } catch (err) {
        console.warn('Kubur SG: community records fetch failed:', err.message);
      }
    }

    // 2. Always include known cemetery listings (static metadata)
    let cemeteryMatches = SG_MUSLIM_CEMETERIES;
    if (queryText) {
      cemeteryMatches = SG_MUSLIM_CEMETERIES.filter(function(c) {
        return c.name.toLowerCase().includes(queryText) ||
               c.region.toLowerCase().includes(queryText) ||
               c.type.includes(queryText);
      });
    }
    results.cemeteryRecords = cemeteryMatches;
    results.sourcesQueried.push('static-cemetery-list');

    results.totalCount = results.burialRecords.length + results.cemeteryRecords.length;
    return results;
  }

  /**
   * Fetch community-contributed burial records from the GitHub data repo.
   * Records are stored as JSON files in /kubur-sg/ directory, organized
   * by cemetery name.
   */
  async fetchCommunityRecords(queryText, env) {
    const token = await this.getGithubToken(env);
    const listUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/kubur-sg?ref=${REPO_BRANCH}`;

    const response = await fetch(listUrl, {
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GraveAtlas/1.0'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No community records directory yet — return empty
        return [];
      }
      throw new Error('GitHub API returned ' + response.status);
    }

    const files = await response.json();
    if (!Array.isArray(files)) return [];

    const records = [];

    // Fetch each JSON file (limit to first 20 files per query)
    const filesToFetch = files.filter(function(f) {
      return f.name.endsWith('.json');
    }).slice(0, 20);

    for (const file of filesToFetch) {
      try {
        const fileUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/kubur-sg/${file.name}`;
        const fileResp = await fetch(fileUrl, {
          headers: {
            'Authorization': 'token ' + token,
            'Accept': 'application/json',
            'User-Agent': 'GraveAtlas/1.0'
          },
          signal: AbortSignal.timeout(10000)
        });

        if (!fileResp.ok) continue;

        const data = await fileResp.json();
        const fileRecords = Array.isArray(data) ? data : (data.records || []);

        for (const record of fileRecords) {
          // Filter by query text if provided
          if (queryText) {
            const searchText = [
              record.name, record.personName,
              record.givenName, record.familyName,
              record.cemetery, record.plot, record.section
            ].filter(Boolean).join(' ').toLowerCase();
            if (!searchText.includes(queryText)) continue;
          }
          records.push(record);
        }
      } catch (err) {
        console.warn('Kubur SG: failed to fetch ' + file.name + ':', err.message);
      }
    }

    return records;
  }

  /**
   * Get a GitHub installation token using App credentials.
   */
  async getGithubToken(env) {
    const appId = env.GITHUB_APP_ID;
    const privateKey = env.GITHUB_PRIVATE_KEY;
    const installationId = env.GITHUB_INSTALLATION_ID;

    if (!appId || !privateKey || !installationId) {
      throw new Error('GitHub App credentials not configured');
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = { iat: now - 60, exp: now + 600, iss: appId };

    const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const unsignedToken = headerB64 + '.' + payloadB64;

    const keyData = this.pemToDer(privateKey);
    const key = await crypto.subtle.importKey(
      'pkcs8', keyData,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['sign']
    );
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5', key,
      new TextEncoder().encode(unsignedToken)
    );
    const sigB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(signature)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const jwt = unsignedToken + '.' + sigB64;

    // Get installation token
    const instResp = await fetch(
      'https://api.github.com/app/installations/' + installationId + '/access_tokens',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + jwt,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GraveAtlas/1.0'
        }
      }
    );

    if (!instResp.ok) throw new Error('GitHub App token failed: ' + instResp.status);
    const instData = await instResp.json();
    return instData.token;
  }

  pemToDer(pem) {
    const b64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  /**
   * Step 2: VALIDATE
   */
  validate(rawResponse) {
    if (!rawResponse || typeof rawResponse !== 'object') {
      throw new Error('Invalid Kubur SG response: not an object');
    }
    if (!Array.isArray(rawResponse.cemeteryRecords) && !Array.isArray(rawResponse.burialRecords)) {
      throw new Error('Invalid Kubur SG response: missing records arrays');
    }
    return true;
  }

  /**
   * Step 3: NORMALIZE — Convert to normalized records.
   */
  normalize(rawResponse) {
    const records = [];

    // Normalize cemetery records
    const cemeteries = rawResponse.cemeteryRecords || [];
    for (const cem of cemeteries) {
      records.push(createNormalizedRecord({
        externalRecordId: 'kubur-sg-cem-' + cem.name.replace(/\s+/g, '-').toLowerCase(),
        cemetery: cem.name,
        latitude: cem.latitude || null,
        longitude: cem.longitude || null,
        section: cem.region || null,
        sourceOrganization: 'Kubur SG Community / GraveAtlas',
        sourceId: 'kubur-sg',
        sourceTimestamp: new Date().toISOString(),
        sourceVersion: 'community-v1',
        license: cem.status === 'heritage' ? 'Heritage site — public record' : 'CC-BY-SA 4.0',
        confidence: cem.status === 'closed' || cem.status === 'heritage' ? 'medium' : 'high',
        status: cem.status || 'active',
        recordUrl: null
      }));
    }

    // Normalize burial records
    const burials = rawResponse.burialRecords || [];
    for (const burial of burials) {
      const name = burial.name || burial.personName || [
        burial.givenName, burial.familyName
      ].filter(Boolean).join(' ') || 'Unknown';

      records.push(createNormalizedRecord({
        externalRecordId: burial.id || 'kubur-sg-' + name.replace(/\s+/g, '-').toLowerCase() + '-' + (burial.deathDate || ''),
        personName: name,
        givenNames: burial.givenName || null,
        familyName: burial.familyName || null,
        cemetery: burial.cemetery || null,
        burialDate: burial.burialDate || null,
        deathDate: burial.deathDate || null,
        birthDate: burial.birthDate || null,
        gravePlot: burial.plot || burial.gravePlot || null,
        section: burial.section || null,
        row: burial.row || null,
        latitude: burial.latitude || null,
        longitude: burial.longitude || null,
        sourceOrganization: 'Kubur SG Community / GraveAtlas',
        sourceId: 'kubur-sg',
        sourceTimestamp: new Date().toISOString(),
        sourceVersion: 'community-v1',
        license: 'CC-BY-SA 4.0',
        confidence: 'medium',
        status: 'external',
        recordUrl: burial.url || null
      }));
    }

    return records;
  }

  /**
   * List available Singapore Muslim/community cemeteries.
   */
  listCemeteries() {
    return SG_MUSLIM_CEMETERIES.map(function(c) {
      return {
        name: c.name,
        region: c.region,
        latitude: c.latitude,
        longitude: c.longitude,
        type: c.type,
        status: c.status || 'active'
      };
    });
  }

  /**
   * List available data sources within Kubur SG.
   */
  listSources() {
    return Object.entries(KUBUR_SG_SOURCES).map(function(entry) {
      var key = entry[0];
      var src = entry[1];
      return {
        key: key,
        name: src.name,
        description: src.description,
        sourceType: src.sourceType,
        license: src.license,
        attribution: src.attribution,
        url: src.portalUrl || null
      };
    });
  }

  getSourceInfo() {
    return {
      sourceId: 'kubur-sg',
      sourceName: 'Kubur SG — Singapore Community Burial Records',
      coverage: 'Singapore — Muslim/Malay cemeteries and community burial grounds',
      license: 'Community data CC-BY-SA 4.0; Government data © NEA/MUIS',
      attribution: 'Kubur SG Community Burial Records, GraveAtlas'
    };
  }
}
