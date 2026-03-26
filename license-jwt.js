/**
 * License JWT: RS256 signed payload. Private key from env (PEM).
 * Client verifies with embedded public key (extension).
 */

const jwt = require('jsonwebtoken');

const TOKEN_ISSUER = 'devlynx-license';
const TOKEN_AUDIENCE = 'devlynx-extension';

/**
 * @param {string} privateKeyPem PKCS8 PEM
 * @param {object} payload license_key, device_id, extension_id, plan
 * @param {{ useSecret?: string }} [opts] If useSecret (HS256), signs with HMAC for dev-only; prefer RS256 PEM.
 * @returns {string}
 */
function signLicenseToken(privateKeyPem, payload, opts) {
  const secret = opts && opts.useSecret;
  const nowSec = Math.floor(Date.now() / 1000);
  const body = {
    license_key: payload.license_key,
    device_id: payload.device_id,
    extension_id: payload.extension_id,
    plan: payload.plan || 'pro',
    issued_at: nowSec
  };
  if (secret && !privateKeyPem) {
    return jwt.sign(body, secret, {
      algorithm: 'HS256',
      expiresIn: '30d',
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE
    });
  }
  if (!privateKeyPem || typeof privateKeyPem !== 'string') {
    throw new Error('LICENSE_JWT_PRIVATE_KEY (PEM) or LICENSE_SECRET required for signing');
  }
  return jwt.sign(body, privateKeyPem, {
    algorithm: 'RS256',
    expiresIn: '30d',
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE
  });
}

/**
 * Trial entitlement JWT (server-authoritative remaining count in payload).
 * @param {string|null} privateKeyPem
 * @param {{ device_id: string, extension_id: string, trial_remaining: number }} payload
 * @param {{ useSecret?: string }} [opts]
 */
function signTrialToken(privateKeyPem, payload, opts) {
  const secret = opts && opts.useSecret;
  const body = {
    device_id: String(payload.device_id || '').trim(),
    extension_id: String(payload.extension_id || '').trim(),
    trial_remaining: Math.max(0, Math.floor(Number(payload.trial_remaining) || 0)),
    plan: 'trial'
  };
  if (secret && !privateKeyPem) {
    return jwt.sign(body, secret, {
      algorithm: 'HS256',
      expiresIn: '3d',
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE
    });
  }
  if (!privateKeyPem || typeof privateKeyPem !== 'string') {
    throw new Error('LICENSE_JWT_PRIVATE_KEY (PEM) or LICENSE_SECRET required for trial token signing');
  }
  return jwt.sign(body, privateKeyPem, {
    algorithm: 'RS256',
    expiresIn: '3d',
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE
  });
}

/**
 * Verify JWT (server-side refresh).
 * @param {string} token
 * @param {string} publicKeyPemOrSecret — RS256 public PEM, or HS256 secret (same as sign)
 * @param {{ algorithm: 'RS256'|'HS256' }} alg
 */
function verifyLicenseTokenServer(token, keyMaterial, alg) {
  if (!token || !keyMaterial) return { ok: false, error: 'missing_token_or_key' };
  try {
    const decoded = jwt.verify(token, keyMaterial, {
      algorithms: [alg.algorithm || 'RS256'],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE
    });
    return { ok: true, payload: decoded };
  } catch (e) {
    return { ok: false, error: e.message || 'invalid_token' };
  }
}

module.exports = {
  signLicenseToken,
  signTrialToken,
  verifyLicenseTokenServer,
  TOKEN_ISSUER,
  TOKEN_AUDIENCE
};
