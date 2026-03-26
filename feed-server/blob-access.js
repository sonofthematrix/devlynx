'use strict';

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

module.exports = { blobStoreAccess };
