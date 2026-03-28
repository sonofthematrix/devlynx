'use strict';

/**
 * Vercel Blob read-write token. Official name from dashboard / `vercel env pull`:
 * `BLOB_READ_WRITE_TOKEN`. Some setups only expose the legacy alias — we accept both.
 */
function blobReadWriteToken() {
  const primary = (process.env.BLOB_READ_WRITE_TOKEN || '').trim();
  if (primary) return primary;
  return (process.env.VERCEL_BLOB_READ_WRITE_TOKEN || '').trim();
}

/**
 * Moet overeenkomen met je Vercel Blob store (Storage → deze store → Access).
 * - private (default): voorkomt "Cannot use public access on a private store"
 * - public: alleen als je store expliciet public is
 */
function blobStoreAccess() {
  const v = (process.env.BLOB_STORE_ACCESS || '').trim().toLowerCase();
  if (v === 'public') return 'public';
  return 'private';
}

module.exports = { blobStoreAccess, blobReadWriteToken };
