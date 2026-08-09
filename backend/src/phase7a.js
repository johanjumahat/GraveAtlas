/**
 * GraveAtlas Phase 7A — Advanced Search & Global Discovery
 *
 * Extends the existing search system with:
 * - Unified global search across people, cemeteries, memorials, locations
 * - Category-specific search (person, cemetery, location)
 * - Geographic directory (countries → regions → cities → cemeteries)
 * - Advanced filters (country, region, city, birth/death year, date range, record type)
 * - Sorting (relevance, name, date, distance)
 * - Server-side pagination, caching, and rate limiting
 *
 * Does NOT modify source data. All normalization is read-only.
 */

import { listFiles, readFile } from './github.js';

// ── Constants ──

export const SEARCH_CATEGORIES = ['people', 'cemeteries', 'memorials', 'locations', 'all'];
export const SORT_OPTIONS = ['relevance', 'name', 'date', 'distance'];
export const MAX_QUERY_LENGTH = 200;
export const MIN_QUERY_LENGTH = 2;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DIRECTORY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
export const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Name Normalization (Part 85) ──

export function normalizeName(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strip accents
    .replace(/[^\p{L}\p{N}\s\-']/gu, ' ') // Keep letters, numbers, spaces, hyphens, apostrophes
    .replace(/\s+/g, ' ')
    .trim();
}

// Preserve original but create a search-optimized version
export function createSearchableName(record) {
  const parts = [];
  if (record.name) parts.push(normalizeName(record.name));
  if (record.altNames) {
    if (Array.isArray(record.altNames)) {
      record.altNames.forEach(a => parts.push(normalizeName(a)));
    }
  }
  if (record.localName) parts.push(normalizeName(record.localName));
  if (record.transliteration) parts.push(normalizeName(record.transliteration));
  return parts.join(' ');
}

// ── Search Scoring ──

export function scoreMatch(query, target, record) {
  if (!target || !query) return 0;

  // Exact match = 100
  if (target === query) return 100;

  // Prefix match = 80
  if (target.startsWith(query)) return 80;

  // Word boundary match = 70
  const words = target.split(/\s+/);
  for (const word of words) {
    if (word === query) return 70;
    if (word.startsWith(query)) return 60;
  }

  // Partial/contains match = 40
  if (target.includes(query)) return 40;

  // Check alt names
  if (record && record.altNames && Array.isArray(record.altNames)) {
    for (const alt of record.altNames) {
      const altNorm = normalizeName(alt);
      if (altNorm === query) return 85;
      if (altNorm.startsWith(query)) return 65;
      if (altNorm.includes(query)) return 45;
    }
  }

  // Check local name
  if (record && record.localName) {
    const localNorm = normalizeName(record.localName);
    if (localNorm === query) return 85;
    if (localNorm.startsWith(query)) return 65;
    if (localNorm.includes(query)) return 45;
  }

  // Check transliteration
  if (record && record.transliteration) {
    const translNorm = normalizeName(record.transliteration);
    if (translNorm === query) return 85;
    if (translNorm.startsWith(query)) return 65;
    if (translNorm.includes(query)) return 45;
  }

  // Check city, country, region
  if (record && record.city) {
    if (normalizeName(record.city).includes(query)) return 30;
  }
  if (record && record.country) {
    if (normalizeName(record.country).includes(query)) return 25;
  }
  if (record && record.region) {
    if (normalizeName(record.region).includes(query)) return 25;
  }

  return 0;
}

// ── Date Parsing (Part 92) ──

export function parseDateYear(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  // Extract year from various formats: "1950", "1950-06", "1950-06-15", "approx_1950", "unknown"
  if (dateStr === 'unknown') return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

export function matchesDateFilter(dateStr, filter) {
  if (!filter) return true;
  const year = parseDateYear(dateStr);
  if (year === null) return false;

  if (filter.exactYear) return year === filter.exactYear;
  if (filter.yearStart && filter.yearEnd) return year >= filter.yearStart && year <= filter.yearEnd;
  if (filter.yearStart) return year >= filter.yearStart;
  if (filter.yearEnd) return year <= filter.yearEnd;
  return true;
}

// ── Haversine Distance ──

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Data Loading ──

async function loadAllCemeteries(env) {
  const cacheKey = 'all_cemeteries';
  const cached = getDirectoryCache(cacheKey);
  if (cached) return cached;

  const cemeteries = [];
  try {
    const files = await listFiles('cemeteries', env);
    if (files) {
      for (const file of files) {
        const fileName = typeof file === 'string' ? file : (file.name || file);
        if (!fileName.endsWith('.json')) continue;
        const content = await readFile(`cemeteries/${fileName}`, env);
        if (!content) continue;
        try {
          const record = JSON.parse(content);
          if (record.status === 'published') cemeteries.push(record);
        } catch (e) { /* skip */ }
      }
    }
  } catch (e) { /* no data */ }

  setDirectoryCache(cacheKey, cemeteries);
  return cemeteries;
}

async function loadAllGraves(env) {
  const cacheKey = 'all_graves';
  const cached = getDirectoryCache(cacheKey);
  if (cached) return cached;

  const graves = [];
  try {
    const files = await listFiles('graves', env);
    if (files) {
      for (const file of files) {
        const fileName = typeof file === 'string' ? file : (file.name || file);
        if (!fileName.endsWith('.json')) continue;
        const content = await readFile(`graves/${fileName}`, env);
        if (!content) continue;
        try {
          const record = JSON.parse(content);
          if (record.status === 'published') graves.push(record);
        } catch (e) { /* skip */ }
      }
    }
  } catch (e) { /* no data */ }

  setDirectoryCache(cacheKey, graves);
  return graves;
}

// ── Directory Cache ──

const directoryCache = new Map();

function getDirectoryCache(key) {
  const entry = directoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > DIRECTORY_CACHE_TTL) {
    directoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setDirectoryCache(key, data) {
  if (directoryCache.size > 20) {
    const oldestKey = directoryCache.keys().next().value;
    directoryCache.delete(oldestKey);
  }
  directoryCache.set(key, { data, timestamp: Date.now() });
}

export function clearDirectoryCache() {
  directoryCache.clear();
}

// ── Search Response Cache ──

const searchCache = new Map();

function getSearchCache(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > SEARCH_CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setSearchCache(key, data) {
  if (searchCache.size > 100) {
    const oldestKey = searchCache.keys().next().value;
    searchCache.delete(oldestKey);
  }
  searchCache.set(key, { data, timestamp: Date.now() });
}

export function clearSearchCache() {
  searchCache.clear();
}

// ── Validation (Part 96) ──

export function validateSearchQuery(params) {
  const errors = [];

  const q = params.get('q') || '';
  if (q.length > MAX_QUERY_LENGTH) errors.push(`Query must be ${MAX_QUERY_LENGTH} characters or fewer`);

  const page = parseInt(params.get('page') || '1', 10);
  if (isNaN(page) || page < 1) errors.push('page must be a positive integer');

  const pageSize = parseInt(params.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10);
  if (isNaN(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    errors.push(`pageSize must be between 1 and ${MAX_PAGE_SIZE}`);
  }

  const sort = params.get('sort');
  if (sort && !SORT_OPTIONS.includes(sort)) {
    errors.push(`sort must be one of: ${SORT_OPTIONS.join(', ')}`);
  }

  const type = params.get('type');
  if (type && !SEARCH_CATEGORIES.includes(type)) {
    errors.push(`type must be one of: ${SEARCH_CATEGORIES.join(', ')}`);
  }

  const birthYear = params.get('birthYear');
  if (birthYear && (!/^\d{4}$/.test(birthYear) || parseInt(birthYear) < 1700 || parseInt(birthYear) > 2030)) {
    errors.push('birthYear must be a 4-digit year between 1700 and 2030');
  }

  const deathYear = params.get('deathYear');
  if (deathYear && (!/^\d{4}$/.test(deathYear) || parseInt(deathYear) < 1700 || parseInt(deathYear) > 2030)) {
    errors.push('deathYear must be a 4-digit year between 1700 and 2030');
  }

  const yearStart = params.get('yearStart');
  if (yearStart && (!/^\d{4}$/.test(yearStart))) errors.push('yearStart must be a 4-digit year');

  const yearEnd = params.get('yearEnd');
  if (yearEnd && (!/^\d{4}$/.test(yearEnd))) errors.push('yearEnd must be a 4-digit year');

  return errors;
}

export function buildDateFilter(params) {
  const birthYear = params.get('birthYear');
  const deathYear = params.get('deathYear');
  const yearStart = params.get('yearStart');
  const yearEnd = params.get('yearEnd');

  if (birthYear) return { field: 'birthDate', exactYear: parseInt(birthYear, 10) };
  if (deathYear) return { field: 'deathDate', exactYear: parseInt(deathYear, 10) };
  if (yearStart || yearEnd) {
    return {
      field: 'any',
      yearStart: yearStart ? parseInt(yearStart, 10) : null,
      yearEnd: yearEnd ? parseInt(yearEnd, 10) : null
    };
  }
  return null;
}

// ── Global Search (Part 82) ──

export async function globalSearch(env, params) {
  const query = normalizeName(params.get('q') || '');
  const type = params.get('type') || 'all';
  const page = parseInt(params.get('page') || '1', 10);
  const pageSize = parseInt(params.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10);
  const sort = params.get('sort') || 'relevance';
  const country = params.get('country');
  const region = params.get('region');
  const city = params.get('city');
  const birthYear = params.get('birthYear');
  const deathYear = params.get('deathYear');
  const yearStart = params.get('yearStart');
  const yearEnd = params.get('yearEnd');
  const lat = params.get('lat');
  const lon = params.get('lon');

  if (query.length < MIN_QUERY_LENGTH) {
    return { results: [], categories: {}, count: 0, total: 0, page, pageSize, hasMore: false };
  }

  // Build cache key
  const cacheKey = `search:${query}:${type}:${page}:${pageSize}:${sort}:${country || ''}:${region || ''}:${city || ''}:${birthYear || ''}:${deathYear || ''}:${yearStart || ''}:${yearEnd || ''}:${lat || ''}:${lon || ''}`;
  const cached = getSearchCache(cacheKey);
  if (cached) return cached;

  const results = [];

  // Search cemeteries
  if (type === 'all' || type === 'cemeteries') {
    const cemeteries = await loadAllCemeteries(env);
    for (const record of cemeteries) {
      if (country && normalizeName(record.country) !== normalizeName(country)) continue;
      if (region && normalizeName(record.region) !== normalizeName(region)) continue;
      if (city && normalizeName(record.city) !== normalizeName(city)) continue;

      const searchableText = createSearchableName(record);
      const score = scoreMatch(query, searchableText, record);
      if (score > 0) {
        results.push({
          type: 'cemetery',
          category: 'cemeteries',
          id: record.id,
          name: record.name,
          altNames: record.altNames || null,
          country: record.country || null,
          region: record.region || null,
          city: record.city || null,
          latitude: record.latitude || null,
          longitude: record.longitude || null,
          cemeteryType: record.cemeteryType || null,
          score
        });
      }
    }
  }

  // Search graves/memorials/people
  if (type === 'all' || type === 'people' || type === 'memorials') {
    const graves = await loadAllGraves(env);
    for (const record of graves) {
      // Apply geographic filters
      if (country) {
        const recCountry = record.country || record.cemeteryCountry;
        if (!recCountry || normalizeName(recCountry) !== normalizeName(country)) continue;
      }
      if (region) {
        const recRegion = record.region || record.cemeteryRegion;
        if (!recRegion || normalizeName(recRegion) !== normalizeName(region)) continue;
      }
      if (city) {
        const recCity = record.city || record.cemeteryCity;
        if (!recCity || normalizeName(recCity) !== normalizeName(city)) continue;
      }

      // Date filters (Part 92)
      if (birthYear) {
        const year = parseDateYear(record.birthDate);
        if (year !== parseInt(birthYear, 10)) continue;
      }
      if (deathYear) {
        const year = parseDateYear(record.deathDate);
        if (year !== parseInt(deathYear, 10)) continue;
      }
      if (yearStart || yearEnd) {
        const birthYearVal = parseDateYear(record.birthDate);
        const deathYearVal = parseDateYear(record.deathDate);
        const relevantYear = deathYearVal || birthYearVal;
        if (relevantYear === null) continue;
        if (yearStart && relevantYear < parseInt(yearStart, 10)) continue;
        if (yearEnd && relevantYear > parseInt(yearEnd, 10)) continue;
      }

      const searchName = record.name || record.graveIdentifier || '';
      const searchableText = createSearchableName(record);
      const score = scoreMatch(query, searchableText, record);

      if (score > 0) {
        const isMemorial = record.type === 'memorial' || record.cemeteryType === 'memorial';
        results.push({
          type: isMemorial ? 'memorial' : 'person',
          category: isMemorial ? 'memorials' : 'people',
          id: record.id,
          name: searchName,
          cemetery: record.cemeteryName || record.cemetery || null,
          cemeteryId: record.cemeteryId || null,
          country: record.country || record.cemeteryCountry || null,
          region: record.region || record.cemeteryRegion || null,
          city: record.city || record.cemeteryCity || null,
          birthDate: record.birthDate || null,
          deathDate: record.deathDate || null,
          latitude: record.latitude || record.graveLatitude || null,
          longitude: record.longitude || record.graveLongitude || null,
          score
        });
      }
    }
  }

  // Search locations (Part 87)
  if (type === 'all' || type === 'locations') {
    const cemeteries = await loadAllCemeteries(env);
    const locationSet = new Map();

    for (const record of cemeteries) {
      if (country && normalizeName(record.country) !== normalizeName(country)) continue;
      if (region && normalizeName(record.region) !== normalizeName(region)) continue;
      if (city && normalizeName(record.city) !== normalizeName(city)) continue;

      // Match country
      if (record.country) {
        const countryNorm = normalizeName(record.country);
        if (countryNorm.includes(query) || query.includes(countryNorm)) {
          const key = `country:${record.country}`;
          if (!locationSet.has(key)) {
            locationSet.set(key, {
              type: 'location',
              category: 'locations',
              subtype: 'country',
              name: record.country,
              country: record.country,
              score: scoreMatch(query, countryNorm, null),
              cemeteryCount: 0
            });
          }
          locationSet.get(key).cemeteryCount++;
        }
      }

      // Match region
      if (record.region) {
        const regionNorm = normalizeName(record.region);
        if (regionNorm.includes(query)) {
          const key = `region:${record.country}:${record.region}`;
          if (!locationSet.has(key)) {
            locationSet.set(key, {
              type: 'location',
              category: 'locations',
              subtype: 'region',
              name: record.region,
              country: record.country,
              region: record.region,
              score: scoreMatch(query, regionNorm, null),
              cemeteryCount: 0
            });
          }
          locationSet.get(key).cemeteryCount++;
        }
      }

      // Match city
      if (record.city) {
        const cityNorm = normalizeName(record.city);
        if (cityNorm.includes(query)) {
          const key = `city:${record.country}:${record.region}:${record.city}`;
          if (!locationSet.has(key)) {
            locationSet.set(key, {
              type: 'location',
              category: 'locations',
              subtype: 'city',
              name: record.city,
              country: record.country,
              region: record.region,
              city: record.city,
              score: scoreMatch(query, cityNorm, null),
              cemeteryCount: 0
            });
          }
          locationSet.get(key).cemeteryCount++;
        }
      }
    }

    for (const loc of locationSet.values()) {
      if (loc.score > 0) results.push(loc);
    }
  }

  // Sort (Part 93)
  sortResults(results, sort, lat, lon);

  // Paginate (Part 94)
  const total = results.length;
  const offset = (page - 1) * pageSize;
  const paged = results.slice(offset, offset + pageSize);
  const hasMore = offset + pageSize < total;

  // Category counts
  const categories = {};
  for (const r of results) {
    categories[r.category] = (categories[r.category] || 0) + 1;
  }

  const response = {
    success: true,
    results: paged,
    categories,
    count: paged.length,
    total,
    page,
    pageSize,
    hasMore,
    query: params.get('q') || ''
  };

  setSearchCache(cacheKey, response);
  return response;
}

// ── Sorting (Part 93) ──

export function sortResults(results, sort, lat, lon) {
  switch (sort) {
    case 'name':
      results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    case 'date':
      results.sort((a, b) => {
        const yearA = parseDateYear(a.deathDate || a.birthDate) || 0;
        const yearB = parseDateYear(b.deathDate || b.birthDate) || 0;
        return yearB - yearA; // Most recent first
      });
      break;
    case 'distance':
      if (lat && lon) {
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        results.sort((a, b) => {
          if (!a.latitude || !a.longitude) return 1;
          if (!b.latitude || !b.longitude) return -1;
          const distA = haversineDistance(latNum, lonNum, a.latitude, a.longitude);
          const distB = haversineDistance(latNum, lonNum, b.latitude, b.longitude);
          return distA - distB;
        });
      } else {
        // Fall back to relevance if no coordinates
        results.sort((a, b) => b.score - a.score);
      }
      break;
    case 'relevance':
    default:
      results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.name || '').localeCompare(b.name || '');
      });
      break;
  }
}

// ── Country Directory (Part 88) ──

export async function getCountryDirectory(env) {
  const cacheKey = 'country_directory';
  const cached = getDirectoryCache(cacheKey);
  if (cached) return cached;

  const cemeteries = await loadAllCemeteries(env);
  const graves = await loadAllGraves(env);

  const countryMap = new Map();

  for (const c of cemeteries) {
    if (!c.country) continue;
    const key = c.country;
    if (!countryMap.has(key)) {
      countryMap.set(key, {
        name: c.country,
        countryCode: c.countryCode || null,
        cemeteryCount: 0,
        memorialCount: 0
      });
    }
    countryMap.get(key).cemeteryCount++;
  }

  // Count memorials/people per country
  for (const g of graves) {
    const country = g.country || g.cemeteryCountry;
    if (!country) continue;
    if (!countryMap.has(country)) {
      countryMap.set(country, {
        name: country,
        countryCode: g.countryCode || g.cemeteryCountryCode || null,
        cemeteryCount: 0,
        memorialCount: 0
      });
    }
    countryMap.get(country).memorialCount++;
  }

  const countries = Array.from(countryMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  const result = { success: true, countries, count: countries.length };
  setDirectoryCache(cacheKey, result);
  return result;
}

// ── Region Directory (Part 89) ──

export async function getRegionDirectory(env, country) {
  if (!country) return { success: false, error: 'Country parameter is required' };

  const cacheKey = `regions:${country}`;
  const cached = getDirectoryCache(cacheKey);
  if (cached) return cached;

  const cemeteries = await loadAllCemeteries(env);
  const regionMap = new Map();

  for (const c of cemeteries) {
    if (normalizeName(c.country) !== normalizeName(country)) continue;
    if (!c.region) continue;
    const key = c.region;
    if (!regionMap.has(key)) {
      regionMap.set(key, {
        name: c.region,
        country: c.country,
        cemeteryCount: 0
      });
    }
    regionMap.get(key).cemeteryCount++;
  }

  const regions = Array.from(regionMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  const result = { success: true, regions, count: regions.length };
  setDirectoryCache(cacheKey, result);
  return result;
}

// ── City Directory (Part 90) ──

export async function getCityDirectory(env, country, region) {
  if (!country) return { success: false, error: 'Country parameter is required' };

  const cacheKey = `cities:${country}:${region || ''}`;
  const cached = getDirectoryCache(cacheKey);
  if (cached) return cached;

  const cemeteries = await loadAllCemeteries(env);
  const cityMap = new Map();

  for (const c of cemeteries) {
    if (normalizeName(c.country) !== normalizeName(country)) continue;
    if (region && normalizeName(c.region) !== normalizeName(region)) continue;
    if (!c.city) continue;
    const key = c.city;
    if (!cityMap.has(key)) {
      cityMap.set(key, {
        name: c.city,
        country: c.country,
        region: c.region || null,
        cemeteryCount: 0,
        latitude: c.latitude || null,
        longitude: c.longitude || null
      });
    }
    cityMap.get(key).cemeteryCount++;
  }

  const cities = Array.from(cityMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  const result = { success: true, cities, count: cities.length };
  setDirectoryCache(cacheKey, result);
  return result;
}

// ── Related Records (Part 101) ──

export async function getRelatedRecords(env, recordId, recordType) {
  const results = { nearby: [], sameCemetery: [], sameRegion: [] };

  if (recordType === 'cemetery') {
    // Find nearby cemeteries
    const cemeteries = await loadAllCemeteries(env);
    const target = cemeteries.find(c => c.id === recordId);
    if (!target || !target.latitude || !target.longitude) return results;

    const nearby = [];
    for (const c of cemeteries) {
      if (c.id === recordId) continue;
      if (!c.latitude || !c.longitude) continue;
      const dist = haversineDistance(target.latitude, target.longitude, c.latitude, c.longitude);
      if (dist < 50) { // within 50km
        nearby.push({
          id: c.id,
          name: c.name,
          country: c.country,
          city: c.city,
          distance: Math.round(dist * 10) / 10,
          latitude: c.latitude,
          longitude: c.longitude
        });
      }
    }
    nearby.sort((a, b) => a.distance - b.distance);
    results.nearby = nearby.slice(0, 5);

    // Graves in this cemetery
    const graves = await loadAllGraves(env);
    const sameCemetery = graves
      .filter(g => g.cemeteryId === recordId)
      .slice(0, 10)
      .map(g => ({
        id: g.id,
        name: g.name,
        birthDate: g.birthDate,
        deathDate: g.deathDate
      }));
    results.sameCemetery = sameCemetery;
  } else if (recordType === 'grave' || recordType === 'person') {
    const graves = await loadAllGraves(env);
    const target = graves.find(g => g.id === recordId);
    if (!target) return results;

    // People in same cemetery
    if (target.cemeteryId) {
      const sameCemetery = graves
        .filter(g => g.cemeteryId === target.cemeteryId && g.id !== recordId)
        .slice(0, 10)
        .map(g => ({
          id: g.id,
          name: g.name,
          birthDate: g.birthDate,
          deathDate: g.deathDate
        }));
      results.sameCemetery = sameCemetery;
    }

    // Nearby in same region
    if (target.country) {
      const cemeteries = await loadAllCemeteries(env);
      const sameRegion = cemeteries
        .filter(c => normalizeName(c.country) === normalizeName(target.country) && c.id !== target.cemeteryId)
        .slice(0, 5)
        .map(c => ({
          id: c.id,
          name: c.name,
          city: c.city,
          region: c.region
        }));
      results.sameRegion = sameRegion;
    }
  }

  return results;
}

// ── Browse by Location (Part 87) ──

export async function browseByLocation(env, country, region, city) {
  const cemeteries = await loadAllCemeteries(env);

  let filtered = cemeteries;
  if (country) filtered = filtered.filter(c => normalizeName(c.country) === normalizeName(country));
  if (region) filtered = filtered.filter(c => normalizeName(c.region) === normalizeName(region));
  if (city) filtered = filtered.filter(c => normalizeName(c.city) === normalizeName(city));

  return {
    success: true,
    cemeteries: filtered.map(c => ({
      id: c.id,
      name: c.name,
      city: c.city || null,
      region: c.region || null,
      country: c.country || null,
      latitude: c.latitude || null,
      longitude: c.longitude || null,
      cemeteryType: c.cemeteryType || null
    })),
    count: filtered.length
  };
}
