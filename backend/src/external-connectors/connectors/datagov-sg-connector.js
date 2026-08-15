/**
 * data.gov.sg Connector — Singapore Government Open Data
 *
 * Provides unified access to Singapore government cemetery, burial, and
 * after-death facility datasets via the data.gov.sg public API.
 *
 * Supported datasets:
 *   1. NEA Active Cemeteries (GEOJSON)      — d_4a9b83ee745c10c3aa5829fb80e09d9c
 *   2. NEA After Death Facilities            — d_8057b4f4c7eca22c3c51c4ac05440f21
 *   3. NEA Dedicated Columbaria (GEOJSON)    — d_9b0752e9d3f1f9d957d5d8be2b58dfff
 *   4. NHB National Monuments (GEOJSON)      — d_b29c230ec6b609e29ed42f71ca9a8767
 *
 * API docs: https://guide.data.gov.sg/developer-guide/dataset-apis/download-dataset
 * License: Singapore Open Data Licence (free for personal and commercial use)
 *
 * Rate limit: 5 requests/minute (public, no API key). Higher with API key.
 * For GraveAtlas use, we treat this as a low-volume, cached connector.
 */

import { BaseConnector } from '../connector-base.js';
import { createNormalizedRecord } from '../normalized-schema.js';

// ── Dataset Registry ──

const SG_DATASETS = {
  'nea-active-cemeteries': {
    datasetId: 'd_4a9b83ee745c10c3aa5829fb80e09d9c',
    name: 'NEA Active Cemeteries',
    agency: 'NEA',
    description: 'Active government-managed cemeteries in Singapore (GEOJSON)',
    recordType: 'cemetery',
    license: 'Singapore Open Data Licence',
    attribution: 'National Environment Agency. (2020). Active Cemeteries (GEOJSON) [Dataset]. data.gov.sg.'
  },
  'nea-after-death-facilities': {
    datasetId: 'd_8057b4f4c7eca22c3c51c4ac05440f21',
    name: 'NEA After Death Facilities',
    agency: 'NEA',
    description: 'Government-managed crematoria, cemeteries, and columbaria (GEOJSON, 2015)',
    recordType: 'facility',
    license: 'Singapore Open Data Licence',
    attribution: 'National Environment Agency. (2015). After Death Facilities [Dataset]. data.gov.sg.'
  },
  'nea-dedicated-columbaria': {
    datasetId: 'd_9b0752e9d3f1f9d957d5d8be2b58dfff',
    name: 'NEA Dedicated Columbaria',
    agency: 'NEA',
    description: 'Government and private dedicated columbaria (GEOJSON)',
    recordType: 'columbarium',
    license: 'Singapore Open Data Licence',
    attribution: 'National Environment Agency. (2020). Dedicated Columbaria (GEOJSON) [Dataset]. data.gov.sg.'
  },
  'nhb-national-monuments': {
    datasetId: 'd_b29c230ec6b609e29ed42f71ca9a8767',
    name: 'NHB National Monuments',
    agency: 'NHB',
    description: 'Singapore National Monuments — may include memorial/heritage cemetery sites (GEOJSON)',
    recordType: 'monument',
    license: 'Singapore Open Data Licence',
    attribution: 'National Heritage Board. (2021). Monuments (GEOJSON) [Dataset]. data.gov.sg.'
  }
};

// ── Connector ──

export class DataGovSgConnector extends BaseConnector {
  constructor() {
    super('datagov-sg');
    this.sourceName = 'Singapore Government Open Data (data.gov.sg)';
    this.apiBaseUrl = 'https://api-open.data.gov.sg/v1/public/api/datasets';
    this.datastoreBaseUrl = 'https://data.gov.sg/api/action/datastore_search';
  }

  /**
   * Fetch a dataset from data.gov.sg using poll-download API.
   * @param {string} datasetKey — key in SG_DATASETS
   * @returns {Promise<Object>} — { dataset, data }
   */
  async fetchDataset(datasetKey) {
    const ds = SG_DATASETS[datasetKey];
    if (!ds) throw new Error('Unknown dataset: ' + datasetKey);

    const pollUrl = this.apiBaseUrl + '/' + ds.datasetId + '/poll-download';

    // Step 1: Poll for download URL
    const pollResp = await fetch(pollUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GraveAtlas/1.0 (cemetery research app; contact: graveatlas@example.com)'
      }
    });

    if (!pollResp.ok) {
      throw new Error('data.gov.sg poll failed for ' + datasetKey + ': HTTP ' + pollResp.status);
    }

    const pollData = await pollResp.json();
    if (pollData.code !== 0) {
      throw new Error('data.gov.sg API error: ' + (pollData.errMsg || 'Unknown error'));
    }

    const downloadUrl = pollData.data && pollData.data.url;
    if (!downloadUrl) {
      throw new Error('data.gov.sg returned no download URL for ' + datasetKey);
    }

    // Step 2: Download the dataset
    const dataResp = await fetch(downloadUrl, {
      headers: { 'Accept': 'application/json' }
    });

    if (!dataResp.ok) {
      throw new Error('data.gov.sg download failed for ' + datasetKey + ': HTTP ' + dataResp.status);
    }

    const text = await dataResp.text();
    const data = JSON.parse(text);

    return { dataset: ds, data: data };
  }

  /**
   * Normalize a GeoJSON Feature from any SG dataset into a GraveAtlas record.
   */
  normalizeFeature(feature, datasetKey) {
    const ds = SG_DATASETS[datasetKey];
    const props = feature.properties || {};
    const coords = feature.geometry ? feature.geometry.coordinates : [null, null];

    const name = props.NAME || props.DESCRIPTION || 'Unnamed';
    const objectId = props.OBJECTID || props.INC_CRC || 'unknown';
    const id = 'SG-' + ds.agency + '-' + String(objectId).replace(/[^a-zA-Z0-9]/g, '');

    const longitude = coords[0];
    const latitude = coords[1];
    if (latitude === null || longitude === null) {
      return { valid: false, error: 'Missing coordinates' };
    }

    const description = props.DESCRIPTION || '';
    const streetName = props.ADDRESSSTREETNAME || '';
    const fullDescription = [description, streetName ? ('Address: ' + streetName) : '']
      .filter(function(s) { return s; }).join('. ');

    // Determine facility type
    const nameLower = (name + ' ' + description).toLowerCase();
    const isCemetery = nameLower.includes('cemetery') || nameLower.includes('grave');
    const isColumbarium = nameLower.includes('columbarium');
    const isCrematorium = nameLower.includes('crematorium');
    const isMonument = datasetKey === 'nhb-national-monuments';

    return {
      valid: true,
      record: {
        id: id,
        name: name,
        country: 'Singapore',
        countryCode: 'SG',
        region: 'Singapore',
        city: streetName || 'Singapore',
        latitude: latitude,
        longitude: longitude,
        description: fullDescription,
        source: ds.name,
        sourceType: 'open_government_dataset',
        sourceAgency: ds.agency,
        attribution: ds.attribution,
        license: ds.license,
        verificationStatus: 'verified',
        facilityType: isCemetery ? 'cemetery' : isColumbarium ? 'columbarium' : isCrematorium ? 'crematorium' : isMonument ? 'monument' : 'other',
        hyperlink: props.HYPERLINK || null,
        photoUrl: props.PHOTOURL || null,
        postalCode: props.ADDRESSPOSTALCODE || null,
        neaObjectId: objectId,
        neaIncCrc: props.INC_CRC || null,
        neaUpdatedDate: props.FMEL_UPD_D || null
      }
    };
  }

  /**
   * Search across all SG datasets for cemetery/facility records matching a query.
   * @param {string} query — free-text search
   * @param {Object} options — { datasets, limit }
   * @returns {Promise<Object>} — { results, sources, errors }
   */
  async search(query, options) {
    options = options || {};
    const datasetsToSearch = options.datasets || Object.keys(SG_DATASETS);
    const results = [];
    const sources = [];
    const errors = [];

    for (const key of datasetsToSearch) {
      const ds = SG_DATASETS[key];
      sources.push({
        sourceId: this.sourceId + ':' + key,
        sourceName: ds.name,
        agency: ds.agency,
        searched: false
      });

      try {
        const fetched = await this.fetchDataset(key);
        const features = fetched.data.features || [];

        const queryLower = query.toLowerCase();
        const matched = features.filter(function(f) {
          const props = f.properties || {};
          const searchText = [
            props.NAME, props.DESCRIPTION, props.ADDRESSSTREETNAME,
            props.ADDRESSBUILDINGNAME
          ].filter(Boolean).join(' ').toLowerCase();
          return searchText.includes(queryLower);
        });

        const normalized = matched
          .map(f => this.normalizeFeature(f, key))
          .filter(r => r.valid);

        for (const r of normalized) {
          results.push(r.record);
        }

        const srcEntry = sources.find(s => s.sourceId === (this.sourceId + ':' + key));
        srcEntry.searched = true;
        srcEntry.resultCount = normalized.length;
      } catch (err) {
        errors.push({ dataset: key, error: err.message });
        const srcEntry = sources.find(s => s.sourceId === (this.sourceId + ':' + key));
        srcEntry.searched = false;
        srcEntry.error = err.message;
      }
    }

    return {
      results: results,
      sources: sources,
      errors: errors,
      totalFound: results.length,
      query: query
    };
  }

  /**
   * Get health/status for this connector.
   */
  async health() {
    try {
      const fetched = await this.fetchDataset('nea-dedicated-columbaria');
      const featureCount = fetched.data.features ? fetched.data.features.length : 0;
      return {
        healthy: true,
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        datasets: Object.keys(SG_DATASETS).map(k => ({
          key: k,
          name: SG_DATASETS[k].name,
          agency: SG_DATASETS[k].agency,
          recordType: SG_DATASETS[k].recordType
        })),
        testResult: 'OK — ' + featureCount + ' features from Dedicated Columbaria dataset',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      return {
        healthy: false,
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        error: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }


  // ── BaseConnector pipeline methods (required by execute()) ──

  /**
   * Step 5: REQUEST — Fetch data from all SG datasets.
   * Downloads every dataset via poll-download API, then filters
   * features by the query string (name/description/address match).
   * Returns a raw response object for validate() and normalize().
   */
  async request(query) {
    const queryText = (typeof query === 'string' ? query :
      (query && (query.q || query.name || query.query)) || '').toLowerCase();
    const allFeatures = [];

    for (const datasetKey of Object.keys(SG_DATASETS)) {
      try {
        const fetched = await this.fetchDataset(datasetKey);
        const features = (fetched.data.features || []).map(function(f) {
          f._datasetKey = datasetKey;
          return f;
        });
        allFeatures.push.apply(allFeatures, features);
      } catch (err) {
        // Continue with other datasets even if one fails
        console.warn('data.gov.sg: failed to fetch ' + datasetKey + ': ' + err.message);
      }
    }

    // If no query text, return all features (browse mode)
    let matched = allFeatures;
    if (queryText) {
      matched = allFeatures.filter(function(f) {
        const props = f.properties || {};
        const searchText = [
          props.NAME, props.DESCRIPTION, props.ADDRESSSTREETNAME,
          props.ADDRESSBUILDINGNAME
        ].filter(Boolean).join(' ').toLowerCase();
        return searchText.includes(queryText);
      });
    }

    return {
      sourceId: this.sourceId,
      features: matched,
      totalFeatures: allFeatures.length,
      matchedCount: matched.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Step 6: VALIDATE — Check raw response structure.
   */
  validate(rawResponse) {
    if (!rawResponse || typeof rawResponse !== 'object') {
      throw new Error('Invalid data.gov.sg response: not an object');
    }
    if (!Array.isArray(rawResponse.features)) {
      throw new Error('Invalid data.gov.sg response: missing features array');
    }
    return true;
  }

  /**
   * Step 7: NORMALIZE — Convert SG GeoJSON features to normalized records.
   */
  normalize(rawResponse) {
    const records = [];
    const features = rawResponse.features || [];

    for (const feature of features) {
      const datasetKey = feature._datasetKey;
      const ds = datasetKey ? SG_DATASETS[datasetKey] : null;
      if (!ds) continue;

      const props = feature.properties || {};
      const coords = feature.geometry ? feature.geometry.coordinates : [null, null];

      const name = props.NAME || props.DESCRIPTION || 'Unnamed';
      const objectId = props.OBJECTID || props.INC_CRC || 'unknown';
      const externalRecordId = 'sg-' + ds.agency.toLowerCase() + '-' + String(objectId).replace(/[^a-zA-Z0-9]/g, '');

      const latitude = coords[1] !== undefined ? coords[1] : null;
      const longitude = coords[0] !== undefined ? coords[0] : null;

      records.push(createNormalizedRecord({
        externalRecordId: externalRecordId,
        cemetery: name,
        latitude: latitude,
        longitude: longitude,
        sourceOrganization: ds.agency === 'NEA' ? 'National Environment Agency' : 'National Heritage Board',
        sourceId: this.sourceId,
        sourceTimestamp: rawResponse.timestamp || new Date().toISOString(),
        sourceVersion: 'live',
        license: ds.license,
        confidence: 'high',
        status: 'external',
        recordUrl: props.HYPERLINK || ('https://data.gov.sg/datasets/' + ds.datasetId + '/view')
      }));
    }

    return records;
  }

  /**
   * List all available datasets from this connector.
   */
  listDatasets() {
    return Object.entries(SG_DATASETS).map(function(entry) {
      const key = entry[0];
      const ds = entry[1];
      return {
        key: key,
        datasetId: ds.datasetId,
        name: ds.name,
        agency: ds.agency,
        description: ds.description,
        recordType: ds.recordType,
        license: ds.license,
        attribution: ds.attribution,
        url: 'https://data.gov.sg/datasets/' + ds.datasetId + '/view'
      };
    });
  }
}

export { SG_DATASETS };
