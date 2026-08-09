#!/usr/bin/env node
/**
 * Check for duplicate grave IDs across graves/ and pending/ directories.
 * Usage: node scripts/check-duplicates.js [repo-path]
 */

const fs = require('fs');
const path = require('path');

const repoPath = process.argv[2] || '.';
const dirs = ['graves', 'pending'];

let ids = {};
let duplicates = [];

for (const dir of dirs) {
  const dirPath = path.join(repoPath, dir);
  if (!fs.existsSync(dirPath)) continue;

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf8'));
      const id = data.id;
      if (!id) continue;

      if (ids[id]) {
        duplicates.push({ id, file1: ids[id], file2: path.join(dir, file) });
      } else {
        ids[id] = path.join(dir, file);
      }
    } catch (e) {
      console.error(`Error reading ${file}: ${e.message}`);
    }
  }
}

if (duplicates.length > 0) {
  console.error(`✗ Found ${duplicates.length} duplicate(s):`);
  duplicates.forEach(d => console.error(`  ID "${d.id}" in ${d.file1} and ${d.file2}`));
  process.exit(1);
}

console.log(`✓ No duplicates found (${Object.keys(ids).length} unique records)`);
