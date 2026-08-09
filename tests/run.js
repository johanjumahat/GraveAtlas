const { execSync } = require('child_process');
try {
  execSync('node tests/backend.test.js', { stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}
