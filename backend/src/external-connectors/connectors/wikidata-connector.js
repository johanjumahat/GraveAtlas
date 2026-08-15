/**
 * Wikidata SPARQL Connector
 *
 * Connects to the Wikidata Query Service to fetch cemetery entities
 * and notable burial information.
 *
 * License: CC0 (public domain dedication)
 * Data type: Structured facts (cemetery entities, notable burial places)
 */

import { BaseConnector } from '../connector-base.js';
import { createNormalizedRecord } from '../normalized-schema.js';

export class WikidataConnector extends BaseConnector {
  constructor() {
    super('wikidata-sparql', {
      rateLimit: { minIntervalMs: 2000, maxRetries: 2, retryBackoffMs: 5000 },
      cacheTTL: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  async request(query) {
    let sparqlQuery;
    if (query.type === 'cemetery') {
      sparqlQuery = this.buildCemeteryQuery(query.search);
    } else if (query.type === 'burial') {
      sparqlQuery = this.buildBurialQuery(query.search);
    } else {
      sparqlQuery = this.buildCemeteryQuery(query.search || '');
    }

    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparqlQuery)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GraveAtlas/1.0 (cemetery mapping app; https://github.com/johanjumahat/GraveAtlas)',
        'Accept': 'application/sparql-results+json'
      },
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      const error = new Error(`Wikidata SPARQL returned ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  }

  validate(rawResponse) {
    if (!rawResponse || !rawResponse.results || !rawResponse.results.bindings) {
      throw new Error('Invalid Wikidata response: missing results.bindings');
    }
    return true;
  }

  normalize(rawResponse) {
    const records = [];
    const bindings = rawResponse.results.bindings || [];

    for (const binding of bindings) {
      records.push(createNormalizedRecord({
        externalRecordId: binding.cemetery?.value || binding.item?.value || null,
        cemetery: binding.cemeteryLabel?.value || binding.cemeteryName?.value || null,
        personName: binding.personLabel?.value || null,
        birthDate: binding.birthDate?.value || null,
        deathDate: binding.deathDate?.value || null,
        burialDate: binding.burialDate?.value || null,
        latitude: parseFloat(binding.lat?.value) || null,
        longitude: parseFloat(binding.lon?.value) || null,
        sourceOrganization: 'Wikimedia Foundation',
        sourceId: 'wikidata-sparql',
        sourceTimestamp: new Date().toISOString(),
        sourceVersion: 'live',
        license: 'CC0',
        confidence: 'medium',
        status: 'external',
        recordUrl: binding.cemetery?.value || binding.item?.value || null
      }));
    }

    return records;
  }

  buildCemeteryQuery(searchTerm) {
    const label = searchTerm ? `"${searchTerm}"` : '';
    return `
      SELECT ?cemetery ?cemeteryLabel ?lat ?lon WHERE {
        ?cemetery wdt:P31/wdt:P279* wd:Q39614.
        ${searchTerm ? `?cemetery rdfs:label ${label}@en.` : ''}
        OPTIONAL { ?cemetery wdt:P625 ?coord.
                   BIND(geof:latitude(?coord) AS ?lat)
                   BIND(geof:longitude(?coord) AS ?lon) }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      } LIMIT 100
    `;
  }

  buildBurialQuery(searchTerm) {
    return `
      SELECT ?person ?personLabel ?cemetery ?cemeteryLabel ?birthDate ?deathDate ?lat ?lon WHERE {
        ?person wdt:P119 ?cemetery.
        ${searchTerm ? `?person rdfs:label "${searchTerm}"@en.` : ''}
        OPTIONAL { ?person wdt:P569 ?birthDate. }
        OPTIONAL { ?person wdt:P570 ?deathDate. }
        OPTIONAL { ?cemetery wdt:P625 ?coord.
                   BIND(geof:latitude(?coord) AS ?lat)
                   BIND(geof:longitude(?coord) AS ?lon) }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      } LIMIT 50
    `;
  }
}
