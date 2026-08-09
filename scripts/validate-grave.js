#!/usr/bin/env node
/**
 * Validate a single grave record JSON file.
 * Usage: node scripts/validate-grave.js <path-to-json>
 */

const fs = require('fs');
const path = process.argv[2];

if (!path) {
  console.error('Usage: node scripts/validate-grave.js <path-to-json>');
  process.exit(1);
}

try {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));

  const errors = [];

  if (!data.id) errors.push('Missing required field: id');
  if (!data.name) errors.push('Missing required field: name');
  if (!data.status) errors.push('Missing required field: status');
  if (!data.submittedAt) errors.push('Missing required field: submittedAt');

  if (data.latitude !== undefined && data.latitude !== null) {
    if (data.latitude < -90 || data.latitude > 90) {
      errors.push(`Invalid latitude: ${data.latitude} (must be -90 to 90)`);
    }
  }

  if (data.longitude !== undefined && data.longitude !== null) {
    if (data.longitude < -180 || data.longitude > 180) {
      errors.push(`Invalid longitude: ${data.longitude} (must be -180 to 180)`);
    }
  }

  if (data.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.birthDate)) {
    errors.push(`Invalid birthDate: ${data.birthDate} (must be YYYY-MM-DD)`);
  }

  if (data.deathDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.deathDate)) {
    errors.push(`Invalid deathDate: ${data.deathDate} (must be YYYY-MM-DD)`);
  }

  if (!['published', 'pending', 'rejected', 'reported'].includes(data.status)) {
    errors.push(`Invalid status: ${data.status}`);
  }

  if (errors.length > 0) {
    console.error(`✗ ${path}`);
    errors.forEach(e => console.error(`  ${e}`));
    process.exit(1);
  }

  console.log(`✓ ${path} — valid`);
} catch (e) {
  console.error(`✗ ${path} — ${e.message}`);
  process.exit(1);
}
