/**
 * Pro license device activations (per license key, max N devices in rolling window).
 * - Local: feed-server/activations.json (see .gitignore)
 * - Vercel: Blob internal/devlynx-license-activations.json when BLOB_READ_WRITE_TOKEN is set
 * - Without Blob on Vercel: in-memory (resets on cold start; not recommended for enforcement)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { blobStoreAccess } = require('./blob-access');

const FILE_PATH = path.join(__dirname, 'activations.json');
const BLOB_PATHNAME = 'internal/devlynx-license-activations.json';

function blobToken() {
  return (process.env.BLOB_READ_WRITE_TOKEN || '').trim();
}

function activeWindowMs() {
  let d = parseInt(process.env.LICENSE_DEVICE_ACTIVE_DAYS || '90', 10);
  if (!Number.isFinite(d) || d < 1) d = 90;
  d = Math.min(d, 3650);
  return d * 24 * 60 * 60 * 1000;
}

function maxDevices() {
  let n = parseInt(process.env.LICENSE_MAX_ACTIVE_DEVICES || '3', 10);
  if (!Number.isFinite(n) || n < 1) n = 3;
  return Math.min(n, 1000);
}

function licenseKeyHash(licenseKey) {
  return crypto.createHash('sha256').update(String(licenseKey || '').trim(), 'utf8').digest('hex');
}

/** @returns {'file'|'blob'|'memory'} */
function getActivationPersistenceMode() {
  if (process.env.VERCEL) {
    return blobToken() ? 'blob' : 'memory';
  }
  return 'file';
}

async function loadStoreFromBlob() {
  const { list, get } = require('@vercel/blob');
  const token = blobToken();
  const access = blobStoreAccess();
  const r = await list({ prefix: 'internal/devlynx-license-activations', token, limit: 20 });
  const hit = r.blobs.find((b) => b.pathname === BLOB_PATHNAME);
  if (!hit) return {};
  try {
    let text = '';
    if (access === 'public') {
      const res = await fetch(hit.downloadUrl);
      if (!res.ok) return {};
      text = await res.text();
    } else {
      const got = await get(hit.url, { access: 'private', token });
      if (!got || got.statusCode !== 200 || !got.stream) return {};
      text = await new Response(got.stream).text();
    }
    const o = JSON.parse(text);
    return o && typeof o === 'object' ? o : {};
  } catch (_) {
    return {};
  }
}

async function saveStoreToBlob(obj) {
  const { put } = require('@vercel/blob');
  await put(BLOB_PATHNAME, JSON.stringify(obj), {
    access: blobStoreAccess(),
    token: blobToken(),
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true
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

function parseTime(isoOrMs) {
  if (isoOrMs == null) return 0;
  if (typeof isoOrMs === 'number' && Number.isFinite(isoOrMs)) return isoOrMs;
  const t = Date.parse(String(isoOrMs));
  return Number.isFinite(t) ? t : 0;
}

function countActiveDevices(devices, nowMs, windowMs) {
  let n = 0;
  for (const id of Object.keys(devices)) {
    const rec = devices[id];
    if (!rec || typeof rec !== 'object') continue;
    const lu = parseTime(rec.lastUsed != null ? rec.lastUsed : rec.last_used);
    if (lu && nowMs - lu <= windowMs) n += 1;
  }
  return n;
}

/**
 * @param {string} licenseKey
 * @param {string} deviceId
 * @returns {Promise<
 *   | { ok: true, devices_used: number }
 *   | { ok: false, error: string, error_code: string }
 * >}
 */
function tryActivate(licenseKey, deviceId) {
  const lk = String(licenseKey || '').trim();
  const did = String(deviceId || '').trim();
  if (!lk || !did) {
    return Promise.resolve({
      ok: false,
      error: 'Missing license key or device id.',
      error_code: 'bad_request'
    });
  }
  const hash = licenseKeyHash(lk);
  const windowMs = activeWindowMs();
  const cap = maxDevices();

  return locked(async () => {
    const store = await loadStore();
    const bucket = store[hash] && typeof store[hash] === 'object' ? store[hash] : { devices: {} };
    const devices =
      bucket.devices && typeof bucket.devices === 'object' ? { ...bucket.devices } : {};
    const nowMs = Date.now();
    const existing = devices[did];

    if (existing && typeof existing === 'object') {
      const createdAt = existing.createdAt || existing.created_at || new Date(nowMs).toISOString();
      devices[did] = { createdAt, lastUsed: new Date(nowMs).toISOString() };
      bucket.devices = devices;
      store[hash] = bucket;
      await saveStore(store);
      const used = countActiveDevices(devices, nowMs, windowMs);
      return { ok: true, devices_used: used };
    }

    const activeCount = countActiveDevices(devices, nowMs, windowMs);
    if (activeCount >= cap) {
      return {
        ok: false,
        error: `License active on ${cap} devices. Wait for unused devices to expire (${Math.ceil(
          windowMs / (24 * 60 * 60 * 1000)
        )} day window), or contact support for a reset.`,
        error_code: 'device_limit'
      };
    }

    devices[did] = { createdAt: new Date(nowMs).toISOString(), lastUsed: new Date(nowMs).toISOString() };
    bucket.devices = devices;
    store[hash] = bucket;
    await saveStore(store);
    const used = countActiveDevices(devices, nowMs, windowMs);
    return { ok: true, devices_used: used };
  });
}

module.exports = {
  getActivationPersistenceMode,
  tryActivate,
  licenseKeyHash,
  maxDevices,
  activeWindowMs
};
