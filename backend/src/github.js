/**
 * GraveAtlas GitHub Integration
 *
 * Handles GitHub App authentication (JWT → installation token)
 * and read/write/delete operations to the graveatlas-data repository.
 *
 * Secrets are loaded from Cloudflare Worker environment — never hardcoded.
 */
// ── Unicode-safe base64 helpers ──
// Cloudflare Workers' btoa() throws DOMException on non-ASCII characters.
// Cemetery names, descriptions, and metadata frequently contain Unicode
// (em-dashes, accented names, Arabic/Chinese script, etc.), so we must
// encode via UTF-8 bytes before base64.

function unicodeBtoa(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function unicodeAtob(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// ── Country prefix for multi-country data structure ──
const DEFAULT_COUNTRY = 'sg';

// Directories that contain country-specific data and need country prefixing.
const COUNTRY_DATA_DIRS = new Set([
  'graves', 'cemeteries', 'pending', 'photos', 'bukit-brown',
  'schema', 'index', 'community-data', 'people'
]);

/**
 * Prefix a data path with the default country code.
 * Only known data directories are prefixed (graves/, cemeteries/, etc.).
 * Operational directories (publication-queue/, audit/, users/, etc.) are left as-is.
 * Paths that already start with a 2-letter country code followed by / are left as-is.
 */
function prefixPath(path) {
  if (!path) return path;
  // Already starts with a 2-letter country prefix followed by /
  if (/^[a-z]{2}\//.test(path)) return path;
  // Extract the top-level directory name
  const topDir = path.split('/')[0];
  // Only prefix known data directories
  if (!COUNTRY_DATA_DIRS.has(topDir)) return path;
  return DEFAULT_COUNTRY + '/' + path;
}


/**
 * Generate a JWT from the GitHub App's private key.
 * Used to authenticate as the GitHub App.
 */
async function generateJWT(appId, privateKey) {
  const encoder = new TextEncoder();

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,      // issued 1 minute ago (clock skew tolerance)
    exp: now + 10 * 60, // expires in 10 minutes
    iss: appId.toString(),
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import the private key (handles both PKCS#1 and PKCS#8 formats)
  const keyData = pemToDer(privateKey);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(signingInput)
  );

  const sigB64 = base64UrlEncodeBytes(new Uint8Array(signature));
  return `${signingInput}.${sigB64}`;
}

/**
 * Exchange JWT for installation access token.
 */
async function getInstallationToken(jwt, installationId) {
  const resp = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        'User-Agent': 'GraveAtlas-Worker',
        'Authorization': `Bearer ${jwt}`,
        'Accept': 'application/vnd.github+json',
      },
    }
  );

  if (!resp.ok) {
    throw new Error(`GitHub auth failed: ${resp.status}`);
  }

  const data = await resp.json();
  return data.token;
}

/**
 * Get a valid installation token. Caches until near expiry.
 */
let cachedToken = null;
let cachedTokenExpiry = 0;

async function getToken(env) {
  if (cachedToken && Date.now() < cachedTokenExpiry - 60000) {
    return cachedToken;
  }

  const jwt = await generateJWT(env.GITHUB_APP_ID, env.GITHUB_PRIVATE_KEY);
  const token = await getInstallationToken(jwt, env.GITHUB_INSTALLATION_ID);

  cachedToken = token;
  cachedTokenExpiry = Date.now() + 50 * 60 * 1000;
  return token;
}

/**
 * Get the repository ref parameter for API calls.
 */
function getRefParam(env) {
  const branch = env.GITHUB_BRANCH || 'main';
  return `?ref=${encodeURIComponent(branch)}`;
}

/**
 * Build the base API URL for the configured repository.
 */
function getRepoUrl(env) {
  const owner = encodeURIComponent(env.GITHUB_OWNER);
  const repo = encodeURIComponent(env.GITHUB_REPO || 'graveatlas-data');
  return `https://api.github.com/repos/${owner}/${repo}/contents`;
}

/**
 * Sanitize a file path segment to prevent traversal attacks.
 * Only allows alphanumeric, dash, underscore, and dot.
 */
function sanitizePathSegment(segment) {
  if (typeof segment !== 'string') return '';
  const cleaned = segment.replace(/[^a-zA-Z0-9._-]/g, '');
  if (cleaned.includes('..') || cleaned.startsWith('.')) {
    return '';
  }
  return cleaned;
}

/**
 * Build a safe file path from a directory and a sanitized ID.
 */
function buildSafePath(dir, id) {
  const safeDir = sanitizePathSegment(dir);
  const safeId = sanitizePathSegment(id);
  if (!safeDir || !safeId) {
    throw new Error('Invalid path');
  }
  return `${safeDir}/${safeId}.json`;
}

/**
 * Write a file to the GitHub repository.
 */
async function writeFile(path, content, env, commitMessage) {
  path = prefixPath(path);
  const token = await getToken(env);
  const ref = getRefParam(env);
  const base = getRepoUrl(env);
  const url = `${base}/${encodePath(path)}${ref}`;

  let sha = null;
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'GraveAtlas-Worker', 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
    });
    if (resp.ok) {
      const data = await resp.json();
      sha = data.sha;
    }
  } catch (e) { /* file doesn't exist yet */ }

  const body = {
    message: commitMessage || `Write ${path}`,
    content: unicodeBtoa(content),
    branch: env.GITHUB_BRANCH || 'main',
  };
  if (sha) body.sha = sha;

  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      'User-Agent': 'GraveAtlas-Worker',
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    // Check for rate limiting
    const remaining = resp.headers.get('X-RateLimit-Remaining');
    const reset = resp.headers.get('X-RateLimit-Reset');
    if (resp.status === 403 && remaining === '0') {
      const retryAfter = reset ? Math.max(1, parseInt(reset, 10) - Math.floor(Date.now() / 1000)) : 60;
      throw new Error(`GitHub API error: 403 (rate limited, retry after ${retryAfter}s)`);
    }
    if (resp.status === 429) {
      const retryAfter = resp.headers.get('Retry-After') || '60';
      throw new Error(`GitHub API error: 429 (rate limited, retry after ${retryAfter}s)`);
    }
    if (resp.status === 404) {
      throw new Error(`GitHub API error: 404 (not found: ${path})`);
    }
    if (resp.status === 403) {
      throw new Error(`GitHub API error: 403 (permission denied)`);
    }
    if (resp.status === 409) {
      throw new Error(`GitHub API error: 409 (conflict — file changed)`);
    }
    throw new Error(`GitHub API error: ${resp.status}`);
  }

  return resp.json();
}

/**
 * Read a file from the GitHub repository.
 */
async function readFile(path, env) {
  path = prefixPath(path);
  const token = await getToken(env);
  const ref = getRefParam(env);
  const base = getRepoUrl(env);
  const url = `${base}/${encodePath(path)}${ref}`;

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'GraveAtlas-Worker', 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
  });

  if (!resp.ok) return null;

  const data = await resp.json();
  return unicodeAtob(data.content);
}

/**
 * List files in a directory.
 */
async function listFiles(dirPath, env) {
  dirPath = prefixPath(dirPath);
  const token = await getToken(env);
  const ref = getRefParam(env);
  const base = getRepoUrl(env);
  const url = `${base}/${encodePath(dirPath)}${ref}`;

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'GraveAtlas-Worker', 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
  });

  if (!resp.ok) return [];

  const data = await resp.json();
  if (!Array.isArray(data)) return [];
  return data.filter(f => f.type === 'file').map(f => f.name);
}

/**
 * Delete a file from the GitHub repository.
 */
async function deleteFile(path, env, commitMessage) {
  path = prefixPath(path);
  const token = await getToken(env);
  const ref = getRefParam(env);
  const base = getRepoUrl(env);
  const url = `${base}/${encodePath(path)}${ref}`;

  const getResp = await fetch(url, {
    headers: { 'User-Agent': 'GraveAtlas-Worker', 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
  });

  if (!getResp.ok) {
    if (getResp.status === 404) {
      throw new Error(`GitHub API error: 404 (file not found for deletion: ${path})`);
    }
    if (getResp.status === 403) {
      throw new Error(`GitHub API error: 403 (permission denied for deletion)`);
    }
    throw new Error(`GitHub API error: ${getResp.status} (deletion lookup failed)`);
  }

  const data = await getResp.json();

  const deleteResp = await fetch(url, {
    method: 'DELETE',
    headers: {
      'User-Agent': 'GraveAtlas-Worker',
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: commitMessage || `Delete ${path}`,
      sha: data.sha,
      branch: env.GITHUB_BRANCH || 'main',
    }),
  });

  if (!deleteResp.ok) {
    if (deleteResp.status === 403) {
      throw new Error(`GitHub API error: 403 (permission denied for delete)`);
    }
    if (deleteResp.status === 409) {
      throw new Error(`GitHub API error: 409 (conflict during delete)`);
    }
    throw new Error(`GitHub API error: ${deleteResp.status} (delete failed)`);
  }

  return true;
}

/**
 * Move a file from one location to another (write new, delete old).
 */
async function moveFile(oldPath, newPath, env, commitMessage) {
  const content = await readFile(oldPath, env);
  if (!content) throw new Error('Source file not found');

  await writeFile(newPath, content, env, commitMessage || `Move ${oldPath}`);
  await deleteFile(oldPath, env, `Remove moved file ${oldPath}`);
}

/**
 * Creates a pull request for review-based publication.
 * Creates a branch, commits changes, then opens a PR to main.
 * Returns { prNumber, prUrl, branchName }.
 */
async function createPullRequest(env, branchName, title, body, changes) {
  const token = await getToken(env);
  const base = getRepoUrl(env).replace('/contents', '');
  const prUrl = `${base}/pulls`;

  // Create the branch from main
  const mainRef = await fetch(`${base}/git/refs/heads/${env.GITHUB_BRANCH || 'main'}`, {
    headers: { 'User-Agent': 'GraveAtlas-Worker', 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
  });

  if (!mainRef.ok) throw new Error(`Failed to get main ref: ${mainRef.status}`);
  const mainData = await mainRef.json();

  const createBranchResp = await fetch(`${base}/git/refs`, {
    method: 'POST',
    headers: {
      'User-Agent': 'GraveAtlas-Worker',
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: mainData.object.sha,
    }),
  });

  if (!createBranchResp.ok) {
    // Branch may already exist — continue
  }

  // Write all changes to the new branch
  const branchEnv = { ...env, GITHUB_BRANCH: branchName };
  for (const change of changes) {
    await writeFile(change.path, change.content, branchEnv, change.commitMessage);
  }

  // Create the PR
  const prResp = await fetch(prUrl, {
    method: 'POST',
    headers: {
      'User-Agent': 'GraveAtlas-Worker',
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body,
      head: branchName,
      base: env.GITHUB_BRANCH || 'main',
    }),
  });

  if (!prResp.ok) {
    const errText = await prResp.text();
    throw new Error(`Failed to create PR: ${prResp.status} ${errText}`);
  }

  const prData = await prResp.json();
  return {
    prNumber: prData.number,
    prUrl: prData.html_url,
    branchName,
  };
}

// ── Utility functions ──

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlEncodeBytes(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Convert a PEM private key to DER bytes.
 * Handles both PKCS#1 and PKCS#8 formats.
 */
function pemToDer(pem) {
  const isPkcs1 = pem.includes('-----BEGIN RSA PRIVATE KEY-----');

  const pemContents = pem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, '')
    .replace(/-----END (RSA )?PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binary = atob(pemContents);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  if (isPkcs1) {
    return wrapPkcs1InPkcs8(bytes);
  }

  return bytes;
}

/**
 * Wrap a PKCS#1 RSAPrivateKey DER in a PKCS#8 PrivateKeyInfo DER.
 */
function wrapPkcs1InPkcs8(pkcs1Key) {
  const algId = new Uint8Array([
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00
  ]);

  const version = new Uint8Array([0x02, 0x01, 0x00]);

  const keyLen = pkcs1Key.length;
  let octetHeader;
  if (keyLen < 0x80) {
    octetHeader = new Uint8Array([0x04, keyLen]);
  } else if (keyLen < 0x100) {
    octetHeader = new Uint8Array([0x04, 0x81, keyLen]);
  } else {
    octetHeader = new Uint8Array([0x04, 0x82, (keyLen >> 8) & 0xff, keyLen & 0xff]);
  }

  const innerLen = version.length + algId.length + octetHeader.length + keyLen;

  let seqHeader;
  if (innerLen < 0x80) {
    seqHeader = new Uint8Array([0x30, innerLen]);
  } else if (innerLen < 0x100) {
    seqHeader = new Uint8Array([0x30, 0x81, innerLen]);
  } else {
    seqHeader = new Uint8Array([0x30, 0x82, (innerLen >> 8) & 0xff, innerLen & 0xff]);
  }

  const result = new Uint8Array(seqHeader.length + innerLen);
  let offset = 0;
  result.set(seqHeader, offset); offset += seqHeader.length;
  result.set(version, offset); offset += version.length;
  result.set(algId, offset); offset += algId.length;
  result.set(octetHeader, offset); offset += octetHeader.length;
  result.set(pkcs1Key, offset);

  return result;
}

// Export functions for use in Worker
export {
  prefixPath,
  generateJWT,
  getInstallationToken,
  getToken,
  writeFile,
  readFile,
  listFiles,
  deleteFile,
  moveFile,
  sanitizePathSegment,
  buildSafePath,
};
