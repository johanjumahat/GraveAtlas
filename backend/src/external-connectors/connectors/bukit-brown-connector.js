/**
 * Bukit Brown Cemetery Connector
 *
 * Queries 70,000+ burial records (1922-1972) from the Bukit Brown Burial
 * Record Transcription Project (Prof Kenneth Dean, NHB-supported).
 *
 * Data source: Published Google Sheets CSV (public, no API key required)
 * License: Data courtesy of Bukit Brown Burial Record Transcription Project
 * Attribution: Dean, K. (Bukit Brown Burial Record Transcription Project).
 *   National Heritage Board (NHB). National Archives of Singapore.
 *
 * Records are transcribed from original NAS burial registers.
 * Japanese Occupation period (June 1942-1944) not transcribed.
 */

import { BaseConnector } from '../connector-base.js';
import { createNormalizedRecord } from '../normalized-schema.js';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXqaQA_GRHRMjwpAkl3Z7jOnMZQLAwc26sbtvYsZv2kN9bIDCey9etC8Znc0CBVDmvNx0VXjg8p83y/pub?gid=1777942150&single=true&output=csv';

export class BukitBrownConnector extends BaseConnector {
  constructor() {
    super('bukit-brown');
    this.sourceName = 'Bukit Brown Burial Records (NAS/NHB)';
  }

  /**
   * Download CSV and parse burial records.
   * Filters by name if query text is provided.
   */
  async request(query) {
    const queryText = (typeof query === 'string' ? query :
      (query && (query.q || query.name || query.query)) || '').toLowerCase();

    const resp = await fetch(CSV_URL, {
      headers: {
        'Accept': 'text/csv',
        'User-Agent': 'GraveAtlas/1.0 (cemetery research app)'
      }
    });

    if (!resp.ok) {
      throw new Error('Bukit Brown CSV fetch failed: HTTP ' + resp.status);
    }

    const csvText = await resp.text();
    const records = this.parseCSV(csvText);

    // Filter by name if query provided
    let matched = records;
    if (queryText && queryText.length >= 2) {
      // Exact substring match first
      matched = records.filter(function(r) {
        const name = (r['Name of Deceased'] || '').toLowerCase();
        return name.includes(queryText);
      });

      // Fallback: word-level matching
      if (matched.length === 0) {
        const queryWords = queryText.split(/\s+/).filter(function(w) { return w.length >= 3; });
        matched = records.filter(function(r) {
          const name = (r['Name of Deceased'] || '').toLowerCase();
          return queryWords.some(function(word) { return name.includes(word); });
        });
      }
    }

    return {
      sourceId: this.sourceId,
      records: matched,
      totalRecords: records.length,
      matchedCount: matched.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Simple CSV parser (handles quoted fields with commas)
   */
  parseCSV(text) {
    const lines = text.split('\n');
    if (lines.length < 2) return [];

    const headers = this.parseCSVLine(lines[0]);
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = this.parseCSVLine(line);
      const record = {};
      for (let j = 0; j < headers.length && j < values.length; j++) {
        record[headers[j]] = values[j];
      }
      if (record['Name of Deceased']) {
        records.push(record);
      }
    }

    return records;
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  validate(rawResponse) {
    if (!rawResponse || !Array.isArray(rawResponse.records)) {
      throw new Error('Invalid Bukit Brown response: missing records array');
    }
    return true;
  }

  /**
   * Convert CSV records to normalized GraveAtlas records.
   */
  normalize(rawResponse) {
    const records = [];
    for (const row of rawResponse.records) {
      const name = row['Name of Deceased'] || 'Unknown';
      const block = row['Block'] || '';
      const division = row['Division'] || '';
      const graveNumber = row['Grave Number'] || '';
      const sex = row['Sex'] || '';
      const age = row['Age'] || '';
      const dateOfDeath = row['Date of Death'] || '';
      const dateOfInternment = row['Date of Internment'] || '';
      const isPauper = row['Is Pauper Section'] === 'Yes';

      // Build plot location
      const plot = [block, division, graveNumber].filter(function(s) { return s; }).join(' / ');

      // Build external record ID
      const externalRecordId = 'bb-' + block + '-' + division + '-' + graveNumber;

      // Parse dates to ISO format if possible
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

  /**
   * Parse DD/MM/YYYY date to ISO format
   */
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
