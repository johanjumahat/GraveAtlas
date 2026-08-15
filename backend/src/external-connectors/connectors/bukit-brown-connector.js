/**
 * Bukit Brown Cemetery Connector
 *
 * Queries 67,000+ burial records (1922-1972) from the Bukit Brown Burial
 * Record Transcription Project (Prof Kenneth Dean, NHB-supported).
 *
 * Data source: Pre-processed JSON files in the graveatlas-data GitHub repo,
 * split by first letter of name for fast loading.
 * Original data: Published Google Sheets CSV from NAS digitised burial registers.
 *
 * License: Bukit Brown Burial Record Transcription Project (NHB-supported)
 * Attribution: Dean, K. (Bukit Brown Burial Record Transcription Project).
 *   National Heritage Board (NHB). National Archives of Singapore.
 */

import { BaseConnector } from '../connector-base.js';
import { createNormalizedRecord } from '../normalized-schema.js';

const REPO_OWNER = 'putraworks2026';
const REPO_NAME = 'graveatlas-data';
const REPO_BRANCH = 'main';

export class BukitBrownConnector extends BaseConnector {
  constructor() {
    super('bukit-brown');
    this.sourceName = 'Bukit Brown Burial Records (NAS/NHB)';
  }

  /**
   * Get a GitHub installation token using the App credentials in env.
   */
  async getGithubToken(env) {
    // Use the existing getToken function from github.js if available
    // Otherwise, use the GitHub API directly
    const appId = env.GITHUB_APP_ID;
    const privateKey = env.GITHUB_PRIVATE_KEY;
    const installationId = env.GITHUB_INSTALLATION_ID;

    if (!appId || !privateKey || !installationId) {
      throw new Error('GitHub App credentials not configured');
    }

    // Generate JWT
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = { iat: now - 60, exp: now + 600, iss: appId };

    // Base64url encode (using Web Crypto API for RS256)
    const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const unsignedToken = headerB64 + '.' + payloadB64;

    // Sign with private key using Web Crypto
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
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const jwt = unsignedToken + '.' + signatureB64;

    // Get installation token
    const tokenResp = await fetch('https://api.github.com/app/installations/' + installationId + '/access_tokens', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + jwt,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'GraveAtlas/1.0'
      }
    });

    if (!tokenResp.ok) {
      throw new Error('Failed to get GitHub installation token: HTTP ' + tokenResp.status);
    }

    const tokenData = await tokenResp.json();
    return tokenData.token;
  }

  /**
   * Convert PEM private key to DER for Web Crypto API.
   */
  pemToDer(pem) {
    const pemContents = pem
      .replace(/-----BEGIN.*?PRIVATE KEY-----/g, '')
      .replace(/-----END.*?PRIVATE KEY-----/g, '')
      .replace(/\s/g, '');
    const binaryDer = atob(pemContents);
    const derBytes = new Uint8Array(binaryDer.length);
    for (let i = 0; i < binaryDer.length; i++) {
      derBytes[i] = binaryDer.charCodeAt(i);
    }
    return derBytes;
  }

  /**
   * Read a JSON file from the graveatlas-data repo via GitHub API.
   */
  async readRepoFile(path, env) {
    const token = await this.getGithubToken(env);
    const url = 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + path + '?ref=' + REPO_BRANCH;

    const resp = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'GraveAtlas/1.0'
      }
    });

    if (!resp.ok) {
      throw new Error('GitHub API failed for ' + path + ': HTTP ' + resp.status);
    }

    const data = await resp.json();
    const content = atob(data.content);
    return JSON.parse(content);
  }

  /**
   * Search burial records by name.
   * Loads only the relevant letter file(s) from the repo.
   */
  async request(query, env) {
    const queryText = (typeof query === 'string' ? query :
      (query && (query.q || query.name || query.query)) || '').toLowerCase();

    // Determine which letter files to load
    const lettersToLoad = new Set();
    if (queryText && queryText.length >= 1) {
      const firstChar = queryText[0].toUpperCase();
      if (firstChar.match(/[A-Z]/)) {
        lettersToLoad.add(firstChar);
      } else {
        lettersToLoad.add('0'); // non-alpha
      }
    } else {
      // No query — load a sample (first few letters)
      ['A', 'B', 'C'].forEach(l => lettersToLoad.add(l));
    }

    const allRecords = [];
    for (const letter of lettersToLoad) {
      try {
        const records = await this.readRepoFile('bukit-brown/' + letter + '.json', env);
        allRecords.push.apply(allRecords, records);
      } catch (err) {
        console.warn('Bukit Brown: failed to load ' + letter + '.json: ' + err.message);
      }
    }

    // Filter by name if query provided
    let matched = allRecords;
    if (queryText && queryText.length >= 2) {
      // Exact substring match first
      matched = allRecords.filter(function(r) {
        return (r.n || '').toLowerCase().includes(queryText);
      });

      // Fallback: word-level matching
      if (matched.length === 0) {
        const queryWords = queryText.split(/\s+/).filter(function(w) { return w.length >= 3; });
        matched = allRecords.filter(function(r) {
          const name = (r.n || '').toLowerCase();
          return queryWords.some(function(word) { return name.includes(word); });
        });
      }
    }

    return {
      sourceId: this.sourceId,
      records: matched,
      totalRecords: allRecords.length,
      matchedCount: matched.length,
      timestamp: new Date().toISOString()
    };
  }

  validate(rawResponse) {
    if (!rawResponse || !Array.isArray(rawResponse.records)) {
      throw new Error('Invalid Bukit Brown response: missing records array');
    }
    return true;
  }

  /**
   * Convert compact records to normalized GraveAtlas records.
   */
  normalize(rawResponse) {
    const records = [];
    for (const row of rawResponse.records) {
      const name = row.n || 'Unknown';
      const block = row.b || '';
      const division = row.d || '';
      const graveNumber = row.g || '';
      const sex = row.s || '';
      const age = row.a || '';
      const dateOfDeath = row.dd || '';
      const dateOfInternment = row.di || '';
      const isPauper = row.p === true;

      const plot = [block, division, graveNumber].filter(function(s) { return s; }).join(' / ');
      const externalRecordId = 'bb-' + block + '-' + division + '-' + graveNumber;

      const deathDate = this.parseDate(dateOfDeath);
      const internmentDate = this.parseDate(dateOfInternment);

      records.push(createNormalizedRecord({
        externalRecordId: externalRecordId,
        personName: name,
        cemetery: 'Bukit Brown Cemetery',
        section: block ? 'Block ' + block : null,
        plot: plot,
        sex: sex,
        age: age,
        deathDate: deathDate,
        birthDate: null,
        internmentDate: internmentDate,
        latitude: null,
        longitude: null,
        sourceOrganization: 'National Archives of Singapore',
        sourceId: this.sourceId,
        sourceTimestamp: rawResponse.timestamp || new Date().toISOString(),
        sourceVersion: 'live',
        license: 'Bukit Brown Burial Record Transcription Project (NHB)',
        confidence: 'high',
        status: 'external',
        recordUrl: 'https://tombs.bukitbrown.org/p/bukit-brown-burial-records-search.html',
        notes: isPauper ? 'Pauper section' : null
      }));
    }
    return records;
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return year + '-' + month + '-' + day;
    }
    return dateStr;
  }
}
