/**
 * Validates license JWT locally (RS256) + claim checks. No network.
 * Depends on: DEVLYNX_LICENSE_JWT_PUBLIC_PEM (from license-jwt-public.js), chrome.* in extension pages.
 */
(function (global) {
  const TOKEN_ISS = 'devlynx-license';
  const TOKEN_AUD = 'devlynx-extension';

  function base64UrlToUint8(str) {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = s.length % 4;
    if (pad) s += '='.repeat(4 - pad);
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function pemToSpkiBytes(pem) {
    const b64 = pem.replace(/-----.+-----/g, '').replace(/\s/g, '');
    return base64UrlToUint8(b64);
  }

  async function verifyRs256(jwt, publicKeyPem) {
    const parts = jwt.split('.');
    if (parts.length !== 3) return false;
    const enc = new TextEncoder();
    const data = enc.encode(parts[0] + '.' + parts[1]);
    const sig = base64UrlToUint8(parts[2] || '');
    const key = await crypto.subtle.importKey(
      'spki',
      pemToSpkiBytes(publicKeyPem),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, data);
  }

  function parsePayload(jwt) {
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) return null;
      const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '='));
      return JSON.parse(json);
    } catch (_) {
      return null;
    }
  }

  function readHeaderAlg(jwt) {
    try {
      const parts = jwt.split('.');
      const json = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parts[0].length / 4) * 4, '='));
      const h = JSON.parse(json);
      return h.alg || '';
    } catch (_) {
      return '';
    }
  }

  /**
   * @param {string} token
   * @param {string} runtimeExtensionId from chrome.runtime.id
   * @param {string} deviceId
   * @returns {Promise<{ ok: boolean, payload?: object, reason?: string }>}
   */
  async function devlynxValidateLicenseToken(token, runtimeExtensionId, deviceId) {
    const pem = global.DEVLYNX_LICENSE_JWT_PUBLIC_PEM || '';
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      return { ok: false, reason: 'missing_token' };
    }
    const alg = readHeaderAlg(token);
    if (alg === 'RS256') {
      if (!pem) return { ok: false, reason: 'no_public_key' };
      try {
        const okSig = await verifyRs256(token, pem);
        if (!okSig) return { ok: false, reason: 'bad_signature' };
      } catch (_) {
        return { ok: false, reason: 'verify_error' };
      }
    } else if (alg === 'HS256') {
      return { ok: false, reason: 'hs256_not_supported_locally' };
    } else {
      return { ok: false, reason: 'unknown_alg' };
    }

    const payload = parsePayload(token);
    if (!payload) return { ok: false, reason: 'bad_payload' };

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number' && payload.exp < now) {
      return { ok: false, reason: 'expired', payload };
    }
    if (payload.iss !== TOKEN_ISS) return { ok: false, reason: 'bad_iss', payload };
    if (payload.aud !== TOKEN_AUD) return { ok: false, reason: 'bad_aud', payload };

    if (payload.extension_id && String(payload.extension_id) !== String(runtimeExtensionId)) {
      return { ok: false, reason: 'extension_mismatch', payload };
    }
    if (payload.device_id && String(payload.device_id) !== String(deviceId)) {
      return { ok: false, reason: 'device_mismatch', payload };
    }
    if (payload.plan && payload.plan !== 'pro') {
      return { ok: false, reason: 'not_pro', payload };
    }

    return { ok: true, payload };
  }

  /**
   * Server-signed trial JWT (plan: trial, trial_remaining, device_id, extension_id).
   * @returns {Promise<{ ok: boolean, payload?: object, reason?: string }>}
   */
  async function devlynxValidateTrialToken(token, runtimeExtensionId, deviceId) {
    const pem = global.DEVLYNX_LICENSE_JWT_PUBLIC_PEM || '';
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      return { ok: false, reason: 'missing_token' };
    }
    const alg = readHeaderAlg(token);
    if (alg === 'RS256') {
      if (!pem) return { ok: false, reason: 'no_public_key' };
      try {
        const okSig = await verifyRs256(token, pem);
        if (!okSig) return { ok: false, reason: 'bad_signature' };
      } catch (_) {
        return { ok: false, reason: 'verify_error' };
      }
    } else if (alg === 'HS256') {
      return { ok: false, reason: 'hs256_not_supported_locally' };
    } else {
      return { ok: false, reason: 'unknown_alg' };
    }

    const payload = parsePayload(token);
    if (!payload) return { ok: false, reason: 'bad_payload' };

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number' && payload.exp < now) {
      return { ok: false, reason: 'expired', payload };
    }
    if (payload.iss !== TOKEN_ISS) return { ok: false, reason: 'bad_iss', payload };
    if (payload.aud !== TOKEN_AUD) return { ok: false, reason: 'bad_aud', payload };
    if (payload.extension_id && String(payload.extension_id) !== String(runtimeExtensionId)) {
      return { ok: false, reason: 'extension_mismatch', payload };
    }
    if (payload.device_id && String(payload.device_id) !== String(deviceId)) {
      return { ok: false, reason: 'device_mismatch', payload };
    }
    if (payload.plan !== 'trial') {
      return { ok: false, reason: 'not_trial', payload };
    }
    if (typeof payload.trial_remaining !== 'number' || payload.trial_remaining < 0) {
      return { ok: false, reason: 'bad_trial_remaining', payload };
    }

    return { ok: true, payload };
  }

  global.devlynxValidateLicenseToken = devlynxValidateLicenseToken;
  global.devlynxValidateTrialToken = devlynxValidateTrialToken;
})(typeof self !== 'undefined' ? self : globalThis);
