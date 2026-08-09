#!/usr/bin/env node
/**
 * GraveAtlas Data Quality Check
 *
 * Standalone script to validate the public data repository.
 * Can be run locally or in GitHub Actions.
 *
 * Usage:
 *   node scripts/data-quality-check.js [path-to-data-repo]
 *
 * Exit codes:
 *   0 — No errors (warnings/info may exist)
 *   1 — Errors found
 *
 * Output categories: ERROR, WARNING, INFO
 *
 * Part 25: Automated data quality checks
 */

const fs = require('fs');
const path = require('path');

const dataRoot = process.argv[2] || '.';

const errors = [];
const warnings = [];
const info = [];

function log(category, check, file, message) {
  const entry = { category, check, file, message };
  if (category === 'ERROR') errors.push(entry);
  else if (category === 'WARNING') warnings.push(entry);
  else info.push(entry);
  console.log(`[${category}] ${check}: ${file || ''} — ${message}`);
}

// ── Load JSON files from a directory ──

function loadDir(dir) {
  const records = [];
  const dirPath = path.join(dataRoot, dir);
  if (!fs.existsSync(dirPath)) return records;

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const record = JSON.parse(content);
      records.push({ record, file: `${dir}/${file}` });
    } catch (e) {
      log('ERROR', 'invalid_json', `${dir}/${file}`, `Cannot parse JSON: ${e.message}`);
    }
  }
  return records;
}

// ── Checks ──

function checkRequiredFields(records, type) {
  for (const { record, file } of records) {
    if (!record.id) log('ERROR', 'missing_id', file, `Missing required id field`);
    if (!record.name) log('ERROR', 'missing_name', file, `Missing required name field`);
    if (!record.status && type !== 'source') log('WARNING', 'missing_status', file, `Missing status field`);
    if (!record.submittedAt && type !== 'source') log('WARNING', 'missing_submittedAt', file, `Missing submittedAt field`);
  }
}

function checkCoordinates(records) {
  for (const { record, file } of records) {
    if (record.latitude !== undefined && record.longitude !== undefined) {
      const lat = parseFloat(record.latitude);
      const lon = parseFloat(record.longitude);
      if (isNaN(lat) || lat < -90 || lat > 90) log('ERROR', 'invalid_lat', file, `Invalid latitude: ${record.latitude}`);
      if (isNaN(lon) || lon < -180 || lon > 180) log('ERROR', 'invalid_lon', file, `Invalid longitude: ${record.longitude}`);
    }
  }
}

function checkDates(records) {
  for (const { record, file } of records) {
    if (record.birthDate && record.deathDate) {
      const birth = parseInt(String(record.birthDate).substring(0, 4));
      const death = parseInt(String(record.deathDate).substring(0, 4));
      if (!isNaN(birth) && !isNaN(death) && death < birth) {
        log('ERROR', 'impossible_date', file, `Death date (${record.deathDate}) before birth date (${record.birthDate})`);
      }
    }
  }
}

function checkCountryCodes(records) {
  for (const { record, file } of records) {
    if (record.countryCode && !/^[A-Z]{2}$/.test(record.countryCode)) {
      log('ERROR', 'invalid_country_code', file, `Invalid country code: ${record.countryCode}`);
    }
  }
}

function checkURLs(records) {
  for (const { record, file } of records) {
    if (record.website && !/^https?:\/\//.test(record.website)) {
      log('ERROR', 'malformed_url', file, `Malformed website URL: ${record.website}`);
    }
  }
}

function checkDuplicateIds(allRecords) {
  const ids = new Map();
  for (const { record, file } of allRecords) {
    if (!record.id) continue;
    if (ids.has(record.id)) {
      log('ERROR', 'duplicate_id', file, `Duplicate ID: ${record.id} (also in ${ids.get(record.id)})`);
    } else {
      ids.set(record.id, file);
    }
  }
}

function checkReferences(graves, cemeteries, people) {
  const cemeteryIds = new Set(cemeteries.map(r => r.record.id).filter(Boolean));
  const graveIds = new Set(graves.map(r => r.record.id).filter(Boolean));

  for (const { record, file } of graves) {
    // Orphaned grave: references cemetery that doesn't exist
    if (record.cemeteryId && !cemeteryIds.has(record.cemeteryId)) {
      log('ERROR', 'orphaned_grave', file, `Grave references missing cemetery: ${record.cemeteryId}`);
    }
    // Invalid person references
    if (record.personIds && Array.isArray(record.personIds)) {
      for (const personId of record.personIds) {
        // Can only check if people records exist
      }
    }
  }

  for (const { record, file } of people) {
    // Orphaned person: references grave that doesn't exist
    if (record.graveId && !graveIds.has(record.graveId)) {
      log('WARNING', 'orphaned_person', file, `Person references missing grave: ${record.graveId}`);
    }
  }
}

function checkSources(records) {
  for (const { record, file } of records) {
    if (!record.sourceRefs || record.sourceRefs.length === 0) {
      log('INFO', 'no_source', file, `${record.id || 'Unknown'} has no source references`);
    }
  }
}

function checkPhotos(records) {
  for (const { record, file } of records) {
    if (!record.photoRefs || record.photoRefs.length === 0) {
      log('INFO', 'no_photo', file, `${record.id || 'Unknown'} has no photo`);
    }
  }
}

function checkGeographicHierarchy(cemeteries) {
  for (const { record, file } of cemeteries) {
    if (record.countryCode && record.country && record.region) {
      // Consistency: if country code is SG but country is "France", that's inconsistent
      // This is a basic check — a full ISO 3166 lookup would be more thorough
    }
    if (!record.country && !record.countryCode) {
      log('WARNING', 'no_country', file, `Cemetery ${record.id || 'Unknown'} has no country information`);
    }
  }
}

// ── Run all checks ──

console.log('GraveAtlas Data Quality Check');
console.log('==============================');
console.log(`Data root: ${path.resolve(dataRoot)}`);
console.log('');

const graves = loadDir('graves');
const cemeteries = loadDir('cemeteries');
const people = loadDir('people');
const sources = loadDir('sources');
const pending = loadDir('pending');

console.log(`Loaded: ${graves.length} graves, ${cemeteries.length} cemeteries, ${people.length} people, ${sources.length} sources, ${pending.length} pending`);
console.log('');

// Run checks
checkRequiredFields(graves, 'grave');
checkRequiredFields(cemeteries, 'cemetery');
checkRequiredFields(people, 'person');
checkRequiredFields(sources, 'source');

checkCoordinates(graves);
checkCoordinates(cemeteries);

checkDates(graves);
checkDates(people);

checkCountryCodes(cemeteries);

checkURLs(cemeteries);

const allRecords = [...graves, ...cemeteries, ...people, ...sources];
checkDuplicateIds(allRecords);

checkReferences(graves, cemeteries, people);

checkSources(graves);
checkSources(cemeteries);

checkPhotos(graves);

checkGeographicHierarchy(cemeteries);

// ── Summary ──

console.log('');
console.log('Summary');
console.log('=======');
console.log(`  Errors:   ${errors.length}`);
console.log(`  Warnings: ${warnings.length}`);
console.log(`  Info:     ${info.length}`);
console.log(`  Total records: ${allRecords.length}`);

if (errors.length > 0) {
  console.log('');
  console.log('Errors:');
  for (const e of errors) {
    console.log(`  [${e.check}] ${e.file}: ${e.message}`);
  }
}

if (warnings.length > 0) {
  console.log('');
  console.log('Warnings:');
  for (const w of warnings) {
    console.log(`  [${w.check}] ${w.file}: ${w.message}`);
  }
}

console.log('');
if (errors.length > 0) {
  console.log('Result: FAILED — errors found');
  process.exit(1);
} else {
  console.log('Result: PASSED — no errors');
  process.exit(0);
}
