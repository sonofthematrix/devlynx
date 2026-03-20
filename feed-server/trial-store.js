/**
 * Authoritative free-trial remaining counts (per device_id + extension_id).
 * - Local / Railway: persist to feed-server/trials.json (see .gitignore).
 * - Vercel: persist to Blob at internal/devlynx-trials.json when BLOB_READ_WRITE_TOKEN is set.
 * - Vercel without Blob: in-memory only (resets on cold start; not recommended for enforcement).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, 'trials.json');
const BLOB_PATHNAME = 'internal/devlynx-trials.json';

function defaultTrialCap() {
  let n = parseInt(process.env.DEVLYNX_TRIAL_LIMIT || '20', 10);
  if (!Number.isFinite(n) || n < 0) n = 20;
  return Math.min(n, 100000);
}

function compositeKey(deviceId, extensionId) {
  const d = String(deviceId || '').trim().slice(0, 200);
  const e = String(extensionId || '').trim().slice(0, 200);
  return `${d}|${e}`;
}

function blobToken() {
  return (process.env.BLOB_READ_WRITE_TOKEN || '').trim();
}

/** @returns {'file'|'blob'|'memory'} */
function getTrialPersistenceMode() {
  if (process.env.VERCEL) {
    return blobToken() ? 'blob' : 'memory';
  }
  return 'file';
}

async function loadStoreFromBlob() {
  const { list } = require('@vercel/blob');
  const token = blobToken();
  const r = await list({ prefix: 'internal/devlynx-trials', token, limit: 20 });
  const hit = r.blobs.find((b) => b.pathname === BLOB_PATHNAME);
  if (!hit) return {};
  const res = await fetch(hit.downloadUrl);
  if (!res.ok) return {};
  try {
    const o = JSON.parse(await res.text());
    return o && typeof o === 'object' ? o : {};
  } catch (_) {
    return {};
  }
}

async function saveStoreToBlob(obj) {
  const { put } = require('@vercel/blob');
  await put(BLOB_PATHNAME, JSON.stringify(obj), {
    access: 'public',
    token: blobToken(),
    contentType: 'application/json',
    addRandomSuffix: false
  });
}

function loadStoreFromFile() {
  try {
    const o = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    return o && typeof o === 'object' ? o : {};
  } catch (_) {
    return {};
  }
}

function saveStoreToFile(obj) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(obj), 'utf8');
}

let memFallback = {};

async function loadStore() {
  if (process.env.VERCEL) {
    if (blobToken()) return loadStoreFromBlob();
    return memFallback;
  }
  return loadStoreFromFile();
}

async function saveStore(obj) {
  if (process.env.VERCEL) {
    if (blobToken()) {
      await saveStoreToBlob(obj);
      return;
    }
    memFallback = obj;
    return;
  }
  saveStoreToFile(obj);
}

let chain = Promise.resolve();

function locked(task) {
  chain = chain.then(task, task);
  return chain;
}

/**
 * Ensure store has an entry; new clients get defaultLimit uses.
 */
function ensureTrialRemaining(deviceId, extensionId, defaultLimit) {
  const key = compositeKey(deviceId, extensionId);
  return locked(async () => {
    const store = await loadStore();
    let rem = store[key];
    if (typeof rem !== 'number' || rem < 0) {
      rem = defaultLimit;
      store[key] = rem;
      await saveStore(store);
    }
    return rem;
  });
}

/**
 * Decrement trial after verified JWT. Server store is authoritative.
 * @param {string} deviceId
 * @param {string} extensionId
 * @param {number} jwtRemaining trial_remaining claim from the consumed JWT
 * @returns {Promise<{ kind: 'ok'|'sync'|'empty', trial_remaining: number }>}
 */
function consumeTrial(deviceId, extensionId, jwtRemaining) {
  const key = compositeKey(deviceId, extensionId);
  const p = Math.max(0, Math.floor(Number(jwtRemaining) || 0));
  return locked(async () => {
    const store = await loadStore();
    let s = store[key];
    const cap = defaultTrialCap();
    if (typeof s !== 'number' || s < 0) {
      s = Math.min(p, cap);
      store[key] = s;
      await saveStore(store);
    }
    if (p !== s) {
      return { kind: 'sync', trial_remaining: s };
    }
    if (s <= 0) {
      return { kind: 'empty', trial_remaining: 0 };
    }
    s -= 1;
    store[key] = s;
    await saveStore(store);
    return { kind: 'ok', trial_remaining: s };
  });
}

module.exports = {
  compositeKey,
  getTrialPersistenceMode,
  ensureTrialRemaining,
  consumeTrial
};
