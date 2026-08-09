#!/usr/bin/env node
/**
 * Generate a cryptographically secure ADMIN_TOKEN for GraveAtlas.
 *
 * Usage:
 *   node scripts/generate-admin-token.js
 *
 * The token is printed to stdout — copy it to your password manager,
 * then set it as a Cloudflare Worker secret:
 *   npx wrangler secret put ADMIN_TOKEN
 *
 * Security:
 *   - 64 bytes of cryptographic randomness (512 bits)
 *   - Encoded as base64url
 *   - Never committed to the repository
 *   - Never written to any file by this script
 */

const crypto = require('crypto');

const bytes = crypto.randomBytes(64);
const token = bytes.toString('base64url');

console.log('=== GraveAtlas ADMIN_TOKEN ===');
console.log('');
console.log('Token generated (64 bytes, base64url):');
console.log('');
console.log(token);
console.log('');
console.log('IMPORTANT:');
console.log('  1. Save this token in a password manager NOW.');
console.log('  2. Set it as a Cloudflare Worker secret:');
console.log('     cd backend && npx wrangler secret put ADMIN_TOKEN');
console.log('  3. Paste the token when prompted.');
console.log('  4. This token will NOT be shown again.');
console.log('  5. Never commit this token to the repository.');
console.log('  6. Never put this token in the Android app.');
