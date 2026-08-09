/**
 * GraveAtlas GitHub Integration
 *
 * Handles GitHub App authentication (JWT → installation token)
 * and read/write operations to the graveatlas-data repository.
 *
 * Secrets are loaded from Cloudflare Worker environment — never hardcoded.
 */

/**
 * Generate a JWT from the GitHub App's private key.
 * Used to authenticate as the GitHub App.
 */
async function generateJWT(appId, privateKey) {
  // RSA sign the JWT using Web Crypto API (available in Cloudflare Workers)
  const encoder = new TextEncoder();

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,      // issued 1 minute ago (clock skew tolerance)
    exp: now + 10 * 60, // expires in 10 minutes
    iss: appId.toString(),
  };

  // Encode header and payload
  const header = { alg: 'RS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import the private key
  const keyData = pemToDer(privateKey);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign
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
        'Authorization': `Bearer ${jwt}`,
        'Accept': 'application/vnd.github+json',
      },
    }
  );

  if (!resp.ok) {
    throw new Error(`Failed to get installation token: ${resp.status}`);
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
  cachedTokenExpiry = Date.now() + 50 * 60 * 1000; // tokens last 1 hour, refresh at 50 min
  return token;
}

/**
 * Write a file to the GitHub repository.
 */
async function writeFile(path, content, env, commitMessage) {
  const token = await getToken(env);
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;

  // Check if file exists (need SHA to update)
  let sha = null;
  try {
    const resp = await fetch(url, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
    });
    if (resp.ok) {
      const data = await resp.json();
      sha = data.sha;
    }
  } catch (e) { /* file doesn't exist yet */ }

  const body = {
    message: commitMessage || `Write ${path}`,
    content: btoa(content),
  };
  if (sha) body.sha = sha;

  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GitHub API error: ${resp.status} — ${err}`);
  }

  return resp.json();
}

/**
 * Read a file from the GitHub repository.
 */
async function readFile(path, env) {
  const token = await getToken(env);
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;

  const resp = await fetch(url, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
  });

  if (!resp.ok) return null;

  const data = await resp.json();
  // Content is base64 encoded
  return atob(data.content);
}

/**
 * List files in a directory.
 */
async function listFiles(dirPath, env) {
  const token = await getToken(env);
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${dirPath}`;

  const resp = await fetch(url, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
  });

  if (!resp.ok) return [];

  const data = await resp.json();
  if (!Array.isArray(data)) return [];
  return data.filter(f => f.type === 'file').map(f => f.name);
}

/**
 * Move a file from one location to another (delete old, write new).
 */
async function moveFile(oldPath, newPath, env, commitMessage) {
  const content = await readFile(oldPath, env);
  if (!content) throw new Error(`Source file not found: ${oldPath}`);

  await writeFile(newPath, content, env, commitMessage);

  // Delete old file
  const token = await getToken(env);
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${oldPath}`;
  const getResp = await fetch(url, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
  });
  if (getResp.ok) {
    const data = await getResp.json();
    await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: `Delete ${oldPath}`, sha: data.sha }),
    });
  }
}

// ── Utility functions ──

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

function pemToDer(pem) {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(pemContents);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Export functions for use in Worker
export {
  generateJWT,
  getInstallationToken,
  getToken,
  writeFile,
  readFile,
  listFiles,
  moveFile,
};
