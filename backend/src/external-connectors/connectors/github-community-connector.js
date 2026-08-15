/**
 * GitHub Community Data Connector
 *
 * Fetches community-contributed cemetery and grave records stored in the
 * GraveAtlas GitHub repository. This serves as a fallback data source
 * where official APIs (OSM, Wikidata, data.gov.sg) don't have data.
 *
 * Users contribute via:
 * - GitHub Issues with structured cemetery/grave info
 * - Pull Requests adding JSON files to /community-data/
 * - Photos uploaded to /community-data/photos/
 *
 * The connector reads from the GitHub Contents API, so community data
 * is always live — no caching needed beyond the standard connector cache.
 *
 * License: CC BY-SA 4.0 (community-contributed, same as GraveAtlas)
 */

import { BaseConnector } from '../connector-base.js';
import { createNormalizedRecord } from '../normalized-schema.js';

const REPO_OWNER = 'johanjumahat';
const REPO_NAME = 'GraveAtlas';
const COMMUNITY_DATA_PATH = 'community-data';
const GITHUB_API = 'https://api.github.com/repos';

export class GitHubCommunityConnector extends BaseConnector {
  constructor() {
    super('github-community', {
      rateLimit: { minIntervalMs: 2000, maxRetries: 2, retryBackoffMs: 5000 },
      cacheTTL: 10 * 60 * 1000 // 10 min cache
    });
    this.sourceName = 'GitHub Community Data (GraveAtlas repo)';
  }

  /**
   * List community data files in the repo.
   */
  async listCommunityFiles() {
    const url = `${GITHUB_API}/${REPO_OWNER}/${REPO_NAME}/contents/${COMMUNITY_DATA_PATH}`;
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GraveAtlas/1.0'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (resp.status === 404) {
      // Directory doesn't exist yet — no community data
      return [];
    }
    if (!resp.ok) {
      throw new Error(`GitHub API returned ${resp.status}`);
    }

    const items = await resp.json();
    // Filter for .json files only
    return items.filter(item => item.name.endsWith('.json'));
  }

  /**
   * Fetch a single community data file's content.
   */
  async fetchCommunityFile(fileInfo) {
    // Use raw.githubusercontent.com for the actual file content
    const rawUrl = fileInfo.download_url;
    if (!rawUrl) {
      // Fallback: use the API to get content
      const apiResp = await fetch(fileInfo.url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GraveAtlas/1.0'
        }
      });
      if (!apiResp.ok) throw new Error(`GitHub API ${apiResp.status}`);
      const apiData = await apiResp.json();
      const content = Buffer.from(apiData.content, 'base64').toString('utf-8');
      return JSON.parse(content);
    }

    const resp = await fetch(rawUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'GraveAtlas/1.0' },
      signal: AbortSignal.timeout(15000)
    });
    if (!resp.ok) throw new Error(`Raw download failed: ${resp.status}`);
    const text = await resp.text();
    return JSON.parse(text);
  }

  // ── BaseConnector pipeline ──

  async request(query) {
    const searchTerm = (query.search || query.query || '').toLowerCase().trim();

    const cacheKey = 'github-community:files';
    const cached = this.getCached(cacheKey);
    let files;
    if (cached) {
      files = cached.data;
    } else {
      files = await this.listCommunityFiles();
      this.tryCache(cacheKey, files);
    }

    const allRecords = [];
    for (const file of files) {
      try {
        const data = await this.fetchCommunityFile(file);
        // Each file can be a single record or an array of records
        const records = Array.isArray(data) ? data : [data];
        for (const r of records) {
          allRecords.push(r);
        }
      } catch (err) {
        console.warn(`[github-community] Failed to fetch ${file.name}: ${err.message}`);
      }
    }

    return { records: allRecords, searchTerm: searchTerm };
  }

  validate(rawResponse) {
    if (!rawResponse || !Array.isArray(rawResponse.records)) {
      throw new Error('Invalid GitHub community response');
    }
    return true;
  }

  normalize(rawResponse) {
    const { records, searchTerm } = rawResponse;
    const normalized = [];

    for (const raw of records) {
      // Filter by search term if provided
      if (searchTerm) {
        const searchText = [
          raw.name, raw.cemetery, raw.personName, raw.givenNames,
          raw.familyName, raw.country, raw.city, raw.description
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchText.includes(searchTerm)) continue;
      }

      const record = createNormalizedRecord({
        externalRecordId: raw.id || `github-${raw.name || 'unknown'}`,
        personName: raw.personName || raw.name,
        givenNames: raw.givenNames,
        familyName: raw.familyName,
        cemetery: raw.cemetery,
        burialDate: raw.burialDate,
        deathDate: raw.deathDate,
        birthDate: raw.birthDate,
        gravePlot: raw.gravePlot,
        section: raw.section,
        latitude: raw.latitude ? parseFloat(raw.latitude) : null,
        longitude: raw.longitude ? parseFloat(raw.longitude) : null,
        recordUrl: raw.photoUrl || raw.recordUrl || null,
        sourceOrganization: 'GraveAtlas Community',
        sourceId: 'github-community',
        sourceTimestamp: raw.contributedDate || new Date().toISOString(),
        sourceVersion: 'community',
        license: 'CC BY-SA 4.0',
        confidence: raw.verificationStatus === 'verified' ? 'medium' : 'low',
        status: 'community'
      });

      // Attach photo URL if available
      if (raw.photoUrl) {
        record.photoUrl = raw.photoUrl;
      }

      normalized.push(record);
    }

    return normalized;
  }
}
