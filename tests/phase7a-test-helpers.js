/**
 * Phase 7A test helpers — exports pure functions for CommonJS testing.
 */

// ── Constants ──
const SEARCH_CATEGORIES = ['people', 'cemeteries', 'memorials', 'locations', 'all'];
const SORT_OPTIONS = ['relevance', 'name', 'date', 'distance'];
const MAX_QUERY_LENGTH = 200;
const MIN_QUERY_LENGTH = 2;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ── Name Normalization (Part 85) ──

function normalizeName(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s\-']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createSearchableName(record) {
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

function scoreMatch(query, target, record) {
  if (!target || !query) return 0;
  if (target === query) return 100;
  if (target.startsWith(query)) return 80;
  const words = target.split(/\s+/);
  for (const word of words) {
    if (word === query) return 70;
    if (word.startsWith(query)) return 60;
  }
  if (target.includes(query)) return 40;
  if (record && record.altNames && Array.isArray(record.altNames)) {
    for (const alt of record.altNames) {
      const altNorm = normalizeName(alt);
      if (altNorm === query) return 85;
      if (altNorm.startsWith(query)) return 65;
      if (altNorm.includes(query)) return 45;
    }
  }
  if (record && record.localName) {
    const localNorm = normalizeName(record.localName);
    if (localNorm === query) return 85;
    if (localNorm.startsWith(query)) return 65;
    if (localNorm.includes(query)) return 45;
  }
  if (record && record.transliteration) {
    const translNorm = normalizeName(record.transliteration);
    if (translNorm === query) return 85;
    if (translNorm.startsWith(query)) return 65;
    if (translNorm.includes(query)) return 45;
  }
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

function parseDateYear(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  if (dateStr === 'unknown') return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

function matchesDateFilter(dateStr, filter) {
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

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Validation (Part 96) ──

function validateSearchQuery(params) {
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

function buildDateFilter(params) {
  const birthYear = params.get('birthYear');
  const deathYear = params.get('deathYear');
  const yearStart = params.get('yearStart');
  const yearEnd = params.get('yearEnd');
  if (birthYear) return { field: 'birthDate', exactYear: parseInt(birthYear, 10) };
  if (deathYear) return { field: 'deathDate', exactYear: parseInt(deathYear, 10) };
  if (yearStart || yearEnd) {
    return { field: 'any', yearStart: yearStart ? parseInt(yearStart, 10) : null, yearEnd: yearEnd ? parseInt(yearEnd, 10) : null };
  }
  return null;
}

// ── Sorting (Part 93) ──

function sortResults(results, sort, lat, lon) {
  switch (sort) {
    case 'name':
      results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    case 'date':
      results.sort((a, b) => {
        const yearA = parseDateYear(a.deathDate || a.birthDate) || 0;
        const yearB = parseDateYear(b.deathDate || b.birthDate) || 0;
        return yearB - yearA;
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

module.exports = {
  SEARCH_CATEGORIES, SORT_OPTIONS, MAX_QUERY_LENGTH, MIN_QUERY_LENGTH,
  DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE,
  normalizeName, createSearchableName, scoreMatch,
  parseDateYear, matchesDateFilter,
  haversineDistance,
  validateSearchQuery, buildDateFilter,
  sortResults,
};
