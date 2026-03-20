/**
 * DevLynx AI feed server — OpenAI + HTTP API.
 * Run from feed-server: node server-with-ai.js
 * Railway: OPENAI_API_KEY + PORT.
 * Vercel: OPENAI_API_KEY + BLOB_READ_WRITE_TOKEN (screenshots); see vercel.json + api/server/[[...slug]].js.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const licenseJwt = require('./license-jwt');
const trialStore = require('./trial-store');
const LICENSE_JWT_ISSUER = licenseJwt.TOKEN_ISSUER;
const LICENSE_JWT_AUDIENCE = licenseJwt.TOKEN_AUDIENCE;

// Load .env: use dotenv if available, else read file manually
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '.env') });
} catch (_) {}

const envPath = path.join(__dirname, '.env');
function stripEnvValue(s) {
  if (!s || typeof s !== 'string') return '';
  s = s.trim().replace(/\r$/, '');
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  return s.trim();
}

let OPENAI_API_KEY = stripEnvValue(process.env.OPENAI_API_KEY || '');
let OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
let GUMROAD_PRODUCT_ID = (process.env.GUMROAD_PRODUCT_ID || '').trim().replace(/\r$/, '');
let DEV_CODES = (process.env.DEV_CODES || '').split(',').map((s) => s.trim()).filter(Boolean);

/** Local default; Railway overrides via process.env.PORT. */
const DEFAULT_PORT = 8080;
let PORT = DEFAULT_PORT;
try {
  const envFile = fs.readFileSync(envPath, 'utf8');
  let envContent = envFile;
  if (envContent.charCodeAt(0) === 0xFEFF) envContent = envContent.slice(1);
  const keyMatch = envContent.match(/OPENAI_API_KEY=(.*?)(?:\r?\n|$)/);
  if (keyMatch && keyMatch[1]) OPENAI_API_KEY = stripEnvValue(keyMatch[1]);
  const modelMatch = envContent.match(/OPENAI_MODEL=(.*?)(?:\r?\n|$)/);
  if (modelMatch && modelMatch[1]) OPENAI_MODEL = modelMatch[1].trim();
  if (!GUMROAD_PRODUCT_ID) {
    const gMatch = envContent.match(/GUMROAD_PRODUCT_ID=(.*?)(?:\r?\n|$)/);
    if (gMatch && gMatch[1]) GUMROAD_PRODUCT_ID = gMatch[1].trim().replace(/\r$/, '');
  }
  if (DEV_CODES.length === 0) {
    const dMatch = envContent.match(/DEV_CODES=(.*?)(?:\r?\n|$)/);
    if (dMatch && dMatch[1]) DEV_CODES = dMatch[1].trim().split(',').map((s) => s.trim()).filter(Boolean);
  }
  const portMatch = envContent.match(/PORT=(.*?)(?:\r?\n|$)/);
  if (portMatch && portMatch[1]) PORT = parseInt(portMatch[1].trim(), 10) || DEFAULT_PORT;
} catch (_) {}
if (process.env.PORT) PORT = parseInt(process.env.PORT, 10) || DEFAULT_PORT;
if (!Number.isFinite(PORT)) PORT = DEFAULT_PORT;

/** PKCS8 PEM for RS256 (trial + optional license JWT). See developer/LICENSE-JWT-KEYS.md */
function normalizePemEnv(val) {
  if (!val || typeof val !== 'string') return '';
  let s = val.trim();
  if (s.includes('\\n')) s = s.replace(/\\n/g, '\n');
  return s;
}

let LICENSE_JWT_PRIVATE_KEY_PEM = normalizePemEnv(process.env.LICENSE_JWT_PRIVATE_KEY || '');

let TRIAL_DEFAULT_LIMIT = parseInt(process.env.DEVLYNX_TRIAL_LIMIT || '20', 10);
if (!Number.isFinite(TRIAL_DEFAULT_LIMIT) || TRIAL_DEFAULT_LIMIT < 0) TRIAL_DEFAULT_LIMIT = 20;
TRIAL_DEFAULT_LIMIT = Math.min(TRIAL_DEFAULT_LIMIT, 100000);

function publicPemFromPrivate(privatePem) {
  return crypto.createPublicKey(privatePem).export({ type: 'spki', format: 'pem' });
}

function signTrialJwt(deviceId, extensionId, remaining) {
  return licenseJwt.signTrialToken(LICENSE_JWT_PRIVATE_KEY_PEM, {
    device_id: deviceId,
    extension_id: extensionId,
    trial_remaining: remaining
  });
}

function readQueryParam(req, name) {
  try {
    const u = new URL(req.url || '/', 'http://feed.local');
    return (u.searchParams.get(name) || '').trim();
  } catch (_) {
    return '';
  }
}

console.log('OpenAI key loaded:', OPENAI_API_KEY ? 'YES' : 'NO');
console.log('License JWT private key (trial / license signing):', LICENSE_JWT_PRIVATE_KEY_PEM ? 'YES' : 'NO');
if (!OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY not configured. Set it in feed-server/.env to enable AI.');
}

let openai = null;
try {
  const OpenAI = require('openai').default || require('openai');
  if (OPENAI_API_KEY) openai = new OpenAI({ apiKey: OPENAI_API_KEY });
} catch (_) {
  openai = null;
}

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
try { fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }); } catch (_) {}

/**
 * Pathname for routing (extension uses `/health`, `/projects`, `POST /`, etc.).
 * - Vercel: public URL is rewritten to `/api/server` or `/api/server/...`; `req.url` keeps that path — strip the prefix.
 * - Legacy: query `?p=` from older vercel.json rewrites (optional).
 */
function getRequestPathname(req) {
  try {
    const raw = req.url || '/';
    const u = new URL(raw, 'http://feed.local');
    let pathOnly = u.pathname || '/';

    const apiPrefix = '/api/server';
    if (pathOnly === apiPrefix || pathOnly.startsWith(apiPrefix + '/')) {
      const rest = pathOnly === apiPrefix ? '' : pathOnly.slice((apiPrefix + '/').length);
      if (!rest) return '/';
      return '/' + rest.replace(/^\/+/, '').replace(/\/+/g, '/');
    }

    const fromQuery = u.searchParams.get('p');
    if (fromQuery !== null) {
      if (fromQuery === '' || fromQuery === '/') return '/';
      const norm = fromQuery.replace(/^\/+/, '');
      return '/' + norm;
    }

    return pathOnly;
  } catch (_) {
    return '/';
  }
}

/** Screenshots: Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set; otherwise local `screenshots/`. */
async function persistScreenshot(baseFilename, imageBase64) {
  const buf = Buffer.from(imageBase64, 'base64');
  const token = !!(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
  if (token) {
    const { put } = require('@vercel/blob');
    const objectPathname = `screenshots/${Date.now()}_${baseFilename}`;
    const blob = await put(objectPathname, buf, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN.trim(),
      contentType: 'image/png',
      addRandomSuffix: true
    });
    return { filepath: blob.url };
  }
  const filepath = path.join(SCREENSHOTS_DIR, baseFilename);
  fs.writeFileSync(filepath, buf);
  return { filepath };
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2 MB

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let total = 0;
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (_) {
        resolve({});
      }
    }
    req.on('data', (chunk) => {
      if (done) return;
      const len = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk), 'utf8');
      total += len;
      if (total > MAX_BODY_SIZE) {
        done = true;
        req.destroy();
        const err = new Error('Payload too large');
        err.code = 'PAYLOAD_TOO_LARGE';
        reject(err);
        return;
      }
      body += chunk;
    });
    req.on('end', () => { finish(); });
    req.on('error', (e) => {
      if (!done) {
        done = true;
        reject(e);
      }
    });
  });
}

/** Verify a Gumroad license key. Returns { valid: true } or { valid: false, error: string }. */
function verifyGumroadLicense(licenseKey) {
  if (!GUMROAD_PRODUCT_ID || !licenseKey || typeof licenseKey !== 'string') {
    return Promise.resolve({ valid: false, error: 'License verification not configured or no key provided.' });
  }
  const key = licenseKey.trim();
  if (!key) return Promise.resolve({ valid: false, error: 'License key is empty.' });

  const form = new URLSearchParams();
  form.append('product_id', GUMROAD_PRODUCT_ID);
  form.append('license_key', key);
  form.append('increment_uses_count', 'false');
  const body = form.toString();

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.gumroad.com',
      port: 443,
      path: '/v2/licenses/verify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success === true) {
            resolve({ valid: true, uses: json.uses });
          } else {
            resolve({ valid: false, error: json.message || 'License key invalid or expired.' });
          }
        } catch (e) {
          resolve({ valid: false, error: 'Invalid response from license server.' });
        }
      });
    });
    req.on('error', (e) => {
      resolve({ valid: false, error: 'Could not reach license server: ' + e.message });
    });
    req.write(body);
    req.end();
  });
}

/** AI request types that require a valid Gumroad license when GUMROAD_PRODUCT_ID is set. */
const AI_TYPES_REQUIRING_LICENSE = ['devQuestion', 'aiContext', 'generateMod'];

async function requireLicenseForAI(body) {
  if (!GUMROAD_PRODUCT_ID) return null;
  const key = (body && body.license_key) ? String(body.license_key).trim() : '';
  const result = await verifyGumroadLicense(key);
  if (result.valid) return null;
  return result.error || 'Valid license required. Add your Gumroad license key in extension Options.';
}

/** Returns { ok: true, content } on success, or { ok: false, error } on failure (error is user-facing message). */
async function chat(systemPrompt, userContent) {
  if (!OPENAI_API_KEY) {
    return { ok: false, error: 'AI is disabled. Set OPENAI_API_KEY in feed-server/.env to enable.' };
  }

  const model = OPENAI_MODEL || 'gpt-4o-mini';

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: 1024
      });
      const raw = completion.choices && completion.choices[0] && completion.choices[0].message;
      const content = raw && typeof raw.content === 'string' ? raw.content.trim() : '';
      if (content) return { ok: true, content };
      return { ok: false, error: 'OpenAI returned empty content.' };
    } catch (error) {
      console.error('OpenAI error:', error);
      const message = (error && (error.message || error.statusText)) ? String(error.message || error.statusText) : 'OpenAI request failed.';
      return { ok: false, error: message };
    }
  }

  return new Promise((resolve) => {
    const payload = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      max_tokens: 1024
    });
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const msg = json.choices && json.choices[0] && json.choices[0].message;
          const raw = msg && msg.content;
          const content = typeof raw === 'string' ? raw.trim() : (Array.isArray(raw) ? raw.map((p) => (p && p.text) || '').join('').trim() : '');
          if (content) {
            resolve({ ok: true, content });
            return;
          }
          if (json.error && json.error.message) {
            console.error('OpenAI API error:', res.statusCode, json.error.message);
            resolve({ ok: false, error: String(json.error.message) });
            return;
          }
          resolve({ ok: false, error: 'OpenAI returned empty content.' });
        } catch (e) {
          console.error('OpenAI parse error:', e.message);
          resolve({ ok: false, error: 'Invalid response from OpenAI. Check feed-server console.' });
        }
      });
    });
    req.on('error', (e) => {
      console.error('OpenAI request error:', e.message);
      resolve({ ok: false, error: 'Network error: cannot reach OpenAI. Check internet and firewall.' });
    });
    req.write(payload);
    req.end();
  });
}

async function feedServerHandler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const pathname = getRequestPathname(req);

  try {
  // Root URL (e.g. opening the Vercel deployment in a browser)
  if (req.method === 'GET' && (pathname === '/' || pathname === '')) {
    send(res, 200, {
      ok: true,
      service: 'devlens-feed',
      message: 'DevLynx AI feed server is running.',
      docs: 'GET /health for status; POST / with JSON body for API.'
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/projects') {
    send(res, 200, { ok: true, projects: [{ index: 0, name: 'Default workspace' }] });
    return;
  }

  if (req.method === 'GET' && pathname === '/extensions') {
    send(res, 200, { ok: true, extensions: [{ index: 0, name: 'DevLynx AI (this extension)' }] });
    return;
  }

  if (req.method === 'GET' && pathname === '/health') {
    send(res, 200, {
      ok: true,
      connected: true,
      service: 'devlens-feed',
      version: '1.1.3',
      serverVersion: '1.1.3',
      ai: !!OPENAI_API_KEY,
      apiKeyConfigured: !!OPENAI_API_KEY,
      model: OPENAI_MODEL || 'gpt-4o-mini',
      licenseCheck: !!GUMROAD_PRODUCT_ID,
      licenseJwtIssuer: LICENSE_JWT_ISSUER,
      licenseJwtAudience: LICENSE_JWT_AUDIENCE,
      trialJwt: !!LICENSE_JWT_PRIVATE_KEY_PEM,
      trialDefaultLimit: TRIAL_DEFAULT_LIMIT,
      trialPersistence: trialStore.getTrialPersistenceMode(),
      blobStorage: !!(process.env.BLOB_READ_WRITE_TOKEN || '').trim(),
      runtime: process.env.VERCEL ? 'vercel' : 'node'
    });
    return;
  }

  // GET /trial-token?device_id=&extension_id= — server-signed trial JWT (RS256)
  if (req.method === 'GET' && pathname === '/trial-token') {
    if (!LICENSE_JWT_PRIVATE_KEY_PEM) {
      send(res, 200, {
        ok: false,
        error: 'Trial signing not configured. Set LICENSE_JWT_PRIVATE_KEY on the feed server (see developer/LICENSE-JWT-KEYS.md).'
      });
      return;
    }
    const deviceId = readQueryParam(req, 'device_id');
    const extensionId = readQueryParam(req, 'extension_id');
    if (!deviceId || !extensionId) {
      send(res, 200, { ok: false, error: 'Missing device_id or extension_id.' });
      return;
    }
    try {
      const rem = await trialStore.ensureTrialRemaining(deviceId, extensionId, TRIAL_DEFAULT_LIMIT);
      const token = signTrialJwt(deviceId, extensionId, rem);
      send(res, 200, { ok: true, token, trial_remaining: rem });
    } catch (err) {
      console.error('trial-token error:', err);
      send(res, 200, { ok: false, error: err.message || 'trial_token_failed' });
    }
    return;
  }

  // Debug: GET http://localhost:<PORT>/test-openai — verify OpenAI connection
  if (req.method === 'GET' && pathname === '/test-openai') {
    if (!OPENAI_API_KEY) {
      send(res, 200, { status: 'error', ok: false, message: 'OPENAI_API_KEY not set in .env. Add: OPENAI_API_KEY=sk-...' });
      return;
    }
    try {
      const result = await chat('You are a helpful assistant.', 'Reply with only: OK');
      if (result.ok) {
        send(res, 200, { status: 'ok', ok: true, message: 'OpenAI works.', response: result.content, reply: result.content });
      } else {
        console.error('OpenAI test-openai error:', result.error);
        send(res, 200, { status: 'error', ok: false, message: result.error, error: result.error });
      }
    } catch (err) {
      console.error('OpenAI error:', err);
      send(res, 500, { status: 'error', ok: false, message: err.message || String(err) });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/verify-license') {
    const body = await parseBody(req);
    const licenseKey = (body && body.license_key != null) ? String(body.license_key).trim() : '';

    // 1) Developer bypass: from localhost with no license key → Pro for local development
    const remote = req.socket.remoteAddress || '';
    const isLocalhost = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
    if (isLocalhost && !licenseKey) {
      send(res, 200, { valid: true, ok: true, type: 'developer' });
      return;
    }

    // 2) Dev/friend codes (server-only; not in extension)
    if (licenseKey && DEV_CODES.length > 0 && DEV_CODES.includes(licenseKey)) {
      send(res, 200, { valid: true, ok: true, type: 'dev' });
      return;
    }

    // 3) Gumroad license keys
    if (!licenseKey) {
      send(res, 200, { ok: false, error: 'No license key provided.' });
      return;
    }
    if (!GUMROAD_PRODUCT_ID) {
      send(res, 200, { ok: false, error: 'License verification not configured on server. Set GUMROAD_PRODUCT_ID in feed-server/.env.' });
      return;
    }
    const result = await verifyGumroadLicense(licenseKey);
    if (result.valid) {
      send(res, 200, { ok: true, valid: true, type: 'gumroad', message: 'License valid.' });
    } else {
      send(res, 200, { ok: false, error: result.error || 'Invalid license.' });
    }
    return;
  }

  // POST /trial-consume — verify trial JWT, decrement authoritative count, return refreshed JWT
  if (req.method === 'POST' && pathname === '/trial-consume') {
    if (!LICENSE_JWT_PRIVATE_KEY_PEM) {
      send(res, 200, {
        ok: false,
        error: 'Trial signing not configured. Set LICENSE_JWT_PRIVATE_KEY on the feed server.'
      });
      return;
    }
    const body = await parseBody(req);
    const rawTok = body && body.token != null ? String(body.token).trim() : '';
    if (!rawTok) {
      send(res, 200, { ok: false, error: 'Missing token.' });
      return;
    }
    let pub;
    try {
      pub = publicPemFromPrivate(LICENSE_JWT_PRIVATE_KEY_PEM);
    } catch (e) {
      console.error('trial-consume: invalid LICENSE_JWT_PRIVATE_KEY', e.message);
      send(res, 200, { ok: false, error: 'Server misconfigured: invalid LICENSE_JWT_PRIVATE_KEY.' });
      return;
    }
    const v = licenseJwt.verifyLicenseTokenServer(rawTok, pub, { algorithm: 'RS256' });
    if (!v.ok || !v.payload) {
      send(res, 200, { ok: false, error: 'invalid_token', detail: v.error || '' });
      return;
    }
    const pl = v.payload;
    if (pl.plan !== 'trial') {
      send(res, 200, { ok: false, error: 'not_trial_token' });
      return;
    }
    const deviceId = String(pl.device_id || '').trim();
    const extensionId = String(pl.extension_id || '').trim();
    if (!deviceId || !extensionId) {
      send(res, 200, { ok: false, error: 'bad_claims' });
      return;
    }
    try {
      const result = await trialStore.consumeTrial(deviceId, extensionId, pl.trial_remaining);
      const newTok = signTrialJwt(deviceId, extensionId, result.trial_remaining);
      if (result.kind === 'empty') {
        send(res, 200, {
          ok: false,
          error: 'trial_exhausted',
          token: newTok,
          trial_remaining: 0
        });
        return;
      }
      send(res, 200, { ok: true, token: newTok, trial_remaining: result.trial_remaining });
    } catch (err) {
      console.error('trial-consume error:', err);
      send(res, 200, { ok: false, error: err.message || 'trial_consume_failed' });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/') {
    const body = await parseBody(req);
    const type = body.type;
    if (!type) {
      send(res, 400, { ok: false, error: 'Missing type' });
      return;
    }

    const licenseError = AI_TYPES_REQUIRING_LICENSE.includes(type) ? await requireLicenseForAI(body) : null;
    if (licenseError) {
      send(res, 200, {
        ok: false,
        error: licenseError,
        answer: licenseError
      });
      return;
    }

    switch (type) {
      case 'screenshot': {
        const { image, filename } = body;
        if (!image || !filename) {
          send(res, 200, { ok: false, error: 'Missing image or filename' });
          return;
        }
        const base = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').trim();
        if (!base || base === '.' || base === '..' || base.includes('..')) {
          send(res, 400, { ok: false, error: 'Invalid filename' });
          return;
        }
        try {
          const { filepath } = await persistScreenshot(base, image);
          send(res, 200, { ok: true, path: filepath });
        } catch (err) {
          send(res, 200, { ok: false, error: err.message });
        }
        return;
      }
      case 'quickPrompt':
        console.log('quickPrompt', body.promptKey, body.targetFolder);
        send(res, 200, { ok: true, message: 'Sent' });
        return;
      case 'addCommand':
        console.log('addCommand', body);
        send(res, 200, { ok: true });
        return;
      case 'devQuestion': {
        const question = body.question || '';
        if (!question.trim()) {
          send(res, 200, { ok: false, error: 'Empty question' });
          return;
        }
        const systemPrompt = 'You are a developer assistant. Only answer questions about programming, browser extensions, debugging, and development. Be concise.';
        const result = await chat(systemPrompt, question);
        if (result.ok) {
          send(res, 200, { ok: true, success: true, answer: result.content });
        } else {
          send(res, 200, { ok: true, success: false, answer: result.error });
        }
        return;
      }
      case 'aiContext': {
        const { action, text, url: pageUrl, title: pageTitle, explainMode } = body;
        const t = (text || '').trim();
        if (!t) {
          send(res, 200, { ok: false, error: 'Empty text' });
          return;
        }
        let userContent = `Context:\nURL: ${pageUrl || 'unknown'}\nTitle: ${pageTitle || 'unknown'}\n\nInput:\n${t}`;
        
        const explainElementSimple = 'Explain this HTML element for a beginner (ELI5). Focus on: what this element is, why it exists, and what it does for the user. Use friendly language. Structure: (1) One sentence — what it is (e.g. "This is a call-to-action button"). (2) Why it\'s there — one short paragraph. (3) Tips — e.g. "Often used for sign-up forms" or "The bright color helps attract clicks." Be concise; use **bold** for key terms.';
        const explainElementTechnical = 'Explain this HTML element for an experienced developer. Use this structure in markdown: (1) Component/selector — tag and main classes. (2) Layout — flexbox/grid/position. (3) Key CSS — rules that matter (code block). (4) Behaviour — animations, JS hooks if visible. (5) Performance/accessibility hints if relevant. Be concise; use **bold** and code blocks.';
        const prompts = {
          ask: 'Explain or fix this (code/JSON/error). Be concise.',
          explainError: 'Short explanation of this error and one concrete fix. No preamble.',
          generateRequestCode: 'Return only code: one block with fetch(), one with axios, one with Python requests for this URL/method. No prose.',
          explainEndpoint: 'In one short paragraph, explain what this API endpoint does and the meaning of the response.'
        };
        const systemPrompt = action === 'explainElement'
          ? (explainMode === 'technical' ? explainElementTechnical : explainElementSimple)
          : (prompts[action] || prompts.ask);
        const result = await chat(systemPrompt, userContent);
        if (result.ok) {
          send(res, 200, { ok: true, success: true, answer: result.content });
        } else {
          send(res, 200, { ok: true, success: false, error: result.error, answer: result.error });
        }
        return;
      }
      case 'generateMod': {
        const { prompt, url: pageUrl } = body;
        if (!(prompt || '').trim()) {
          send(res, 200, { ok: false, error: 'Empty prompt' });
          return;
        }
        const systemPrompt = 'Return ONLY one code block, no other text. For CSS: start with ```css on its own line, then the CSS, then ``` on its own line. For JavaScript use ```js. Example:\n```css\n.header { background: blue; }\n```';
        const userContent = `Page URL: ${pageUrl || 'unknown'}\nUser request: ${prompt}`;
        const chatResult = await chat(systemPrompt, userContent);
        if (!chatResult.ok) {
          send(res, 200, { ok: true, success: false, css: '', js: '', error: chatResult.error });
          return;
        }
        const raw = chatResult.content;
        let cssText = '';
        let jsText = '';
        const blockRe = /```\s*(?:css|js|javascript)?\s*([\s\S]*?)```/g;
        let m;
        while ((m = blockRe.exec(raw)) !== null) {
          const openTag = m[0].slice(0, 20).toLowerCase();
          let lang = null;
          if (openTag.includes('css')) lang = 'css';
          else if (openTag.includes('javascript')) lang = 'javascript';
          else if (openTag.includes('js')) lang = 'js';
          const code = m[1].trim();
          if (lang === 'css') cssText = cssText ? cssText + '\n' + code : code;
          else if (lang === 'js' || lang === 'javascript') jsText = jsText ? jsText + '\n' + code : code;
          else if (code.includes('{') && code.includes('}') && !code.includes('function') && !code.includes('=>')) cssText = cssText ? cssText + '\n' + code : code;
          else if (code.includes('function') || code.includes('=>') || code.includes('document.')) jsText = jsText ? jsText + '\n' + code : code;
        }
        if (!cssText && !jsText) {
          const lines = raw.split('\n');
          for (const line of lines) {
            const t = line.trim();
            if (t.startsWith('body') || t.startsWith('.') || t.startsWith('#') || (t.includes('{') && t.includes('}'))) cssText = cssText ? cssText + '\n' + line : line;
            else if (t.includes('function') || t.includes('=>') || t.includes('document.')) jsText = jsText ? jsText + '\n' + line : line;
          }
          cssText = cssText.trim();
          jsText = jsText.trim();
        }
        if (!cssText && !jsText && raw.includes('{') && raw.includes('}')) {
          const stripped = raw.replace(/^[\s\S]*?```\/?\s*/, '').replace(/```\s*[\s\S]*$/, '').trim();
          if (stripped.length > 0) cssText = stripped;
        }
        const noCode = !cssText && !jsText;
        send(res, 200, {
          ok: true,
          success: !noCode,
          css: cssText,
          js: jsText,
          error: noCode ? 'AI returned no parseable code. Try: "make the header blue" or "hide the footer". Use server-with-ai.js and OPENAI_API_KEY in .env.' : undefined
        });
        return;
      }
      default:
        send(res, 400, { ok: false, error: `Unknown type: ${type}` });
    }
    return;
  }

  send(res, 404, { ok: false, error: 'Not found' });
  } catch (err) {
    if (err.code === 'PAYLOAD_TOO_LARGE') {
      if (!res.headersSent) {
        res.writeHead(413, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Payload too large');
      }
      return;
    }
    if (!res.headersSent) send(res, 500, { ok: false, error: err.message || 'Server error' });
  }
}

const server = http.createServer(feedServerHandler);

// 0.0.0.0 = alle IPv4-interfaces, zodat 127.0.0.1 en localhost werken voor de extensie
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`DevLynx AI feed server http://127.0.0.1:${PORT}`);
    if (!OPENAI_API_KEY) {
      console.log('  OpenAI: NOT SET. Add OPENAI_API_KEY=sk-... to feed-server/.env and restart.');
    } else {
      console.log('  OpenAI: key loaded, model:', OPENAI_MODEL);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Close the other program or set PORT= elsewhere in .env`);
    } else {
      console.error('Server error:', err.message);
    }
    process.exit(1);
  });
}

module.exports = { feedServerHandler, getRequestPathname, persistScreenshot };
