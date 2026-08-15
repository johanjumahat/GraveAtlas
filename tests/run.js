const { execSync } = require('child_process');
try {
  execSync('node tests/backend.test.js', { stdio: 'inherit' });
  execSync('node tests/phase5.test.js', { stdio: 'inherit' });
  execSync('node tests/phase5-import-pipeline.test.js', { stdio: 'inherit' });
  execSync('node tests/phase55-e2e.test.js', { stdio: 'inherit' });
  execSync('node tests/phase6a.test.js', { stdio: 'inherit' });
  execSync('node tests/phase7a.test.js', { stdio: 'inherit' });
  execSync('node tests/phase7b.test.js', { stdio: 'inherit' });
  execSync('node tests/phase16.test.js', { stdio: 'inherit' });
  execSync('node tests/nea-importer.test.js', { stdio: 'inherit' });
  execSync('node tests/osm-importer.test.js', { stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}
