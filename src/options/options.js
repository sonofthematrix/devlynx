const PLAN_STORAGE_KEY = 'devlens_plan';
/** UI mirror only; Pro entitlement uses `devlynx_license_token`. */
const PLAN_MIRROR_KEY = 'devlynx_plan';
const LICENSE_KEY_STORAGE_KEY = 'devlens_license_key';
const LICENSE_KEY_USER_STORAGE_KEY = 'devlynx_license_key';
const LICENSE_VERIFIED_AT_KEY = 'devlens_license_verified_at';
const LICENSE_EMAIL_STORAGE_KEY = 'devlynx_license_email';
const LICENSE_TOKEN_STORAGE_KEY = 'devlynx_license_token';
const LICENSE_STATUS_CHECKED_AT_KEY = 'devlynx_license_status_checked_at';
const DEVICE_ID_STORAGE_KEY = 'devlynx_device_id';
const FEED_SERVER_PORT = 2847;
/** Replaced at build (`npm run build:prod` → https://api.devlynx.ai) */
const DEVLYNX_API_BASE = '__DEVLYNX_API_BASE__';

function apiBaseTrim() {
  let s = typeof DEVLYNX_API_BASE === 'string' ? DEVLYNX_API_BASE.trim() : '';
  if (!s || s.indexOf('__DEVLYNX_API_BASE__') !== -1) {
    s = 'http://localhost:' + FEED_SERVER_PORT;
  }
  return s.replace(/\/$/, '');
}

function licenseUrlCandidates(pathSuffix) {
  const suf = pathSuffix.charAt(0) === '/' ? pathSuffix : '/' + pathSuffix;
  const b = apiBaseTrim();
  if (b.indexOf('api.devlynx.ai') !== -1) {
    return [b + suf];
  }
  const alt =
    b.indexOf('127.0.0.1') !== -1
      ? b.replace('127.0.0.1', 'localhost')
      : b.replace('localhost', '127.0.0.1');
  return [b + suf, alt + suf];
}

function optionsIsLocalFeedServer() {
  const b = apiBaseTrim();
  return b.indexOf('localhost') !== -1 || b.indexOf('127.0.0.1') !== -1;
}

function serverOfflineMsg() {
  if (!optionsIsLocalFeedServer()) {
    const b = apiBaseTrim();
    return "Can't reach the DevLynx API (" + b + '). Check deployment and /health.';
  }
  return "DevLynx feed server isn't running. In the feed-server folder run npm start.";
}

function setStatus(message, type) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = message || '';
  el.className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
}

function setLicenseStatus(message, type) {
  const el = document.getElementById('license-status');
  if (!el) return;
  el.textContent = message || '';
  el.className = 'license-status' + (type === 'success' ? ' success' : type === 'error' ? ' error' : '');
}

function updatePlanDisplay(plan) {
  const el = document.getElementById('plan-value');
  if (!el) return;
  el.textContent = plan === 'pro' ? 'Pro' : 'Free';
  el.className = 'plan-badge ' + (plan === 'pro' ? 'pro' : 'free');
}

function getOrCreateDeviceId() {
  return new Promise((resolve) => {
    chrome.storage.local.get([DEVICE_ID_STORAGE_KEY], (data) => {
      if (chrome.runtime.lastError) {
        resolve('');
        return;
      }
      const existing = data[DEVICE_ID_STORAGE_KEY];
      if (existing && String(existing).trim()) {
        resolve(String(existing).trim());
        return;
      }
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'devlynx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12);
      chrome.storage.local.set({ [DEVICE_ID_STORAGE_KEY]: id }, () => resolve(id));
    });
  });
}

function resolvePlanFromToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get([LICENSE_TOKEN_STORAGE_KEY], (r) => {
      const token =
        (r && r[LICENSE_TOKEN_STORAGE_KEY] && String(r[LICENSE_TOKEN_STORAGE_KEY]).trim()) || '';
      if (!token || typeof devlynxValidateLicenseToken !== 'function') {
        resolve('free');
        return;
      }
      getOrCreateDeviceId()
        .then((deviceId) => devlynxValidateLicenseToken(token, chrome.runtime.id, deviceId))
        .then((v) => resolve(v.ok ? 'pro' : 'free'))
        .catch(() => resolve('free'));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get([LICENSE_KEY_USER_STORAGE_KEY, LICENSE_KEY_STORAGE_KEY], async (r) => {
    const key =
      (r && r[LICENSE_KEY_USER_STORAGE_KEY] && String(r[LICENSE_KEY_USER_STORAGE_KEY]).trim()) ||
      (r && r[LICENSE_KEY_STORAGE_KEY] && String(r[LICENSE_KEY_STORAGE_KEY]).trim()) ||
      '';
    const plan = await resolvePlanFromToken();
    updatePlanDisplay(plan);
    const input = document.getElementById('license-key-input');
    if (input) input.value = key;
    const upgradeHint = document.getElementById('options-upgrade-link');
    if (upgradeHint) upgradeHint.style.display = plan === 'pro' ? 'none' : '';
  });

  document.getElementById('save-btn').addEventListener('click', () => {
    const input = document.getElementById('license-key-input');
    const key = (input && input.value && input.value.trim()) || '';
    if (!key) {
      chrome.storage.local.remove([LICENSE_TOKEN_STORAGE_KEY], () => {
        chrome.storage.local.set(
          {
            [PLAN_STORAGE_KEY]: 'free',
            [PLAN_MIRROR_KEY]: 'free',
            [LICENSE_KEY_USER_STORAGE_KEY]: '',
            [LICENSE_KEY_STORAGE_KEY]: '',
            [LICENSE_VERIFIED_AT_KEY]: null,
            [LICENSE_EMAIL_STORAGE_KEY]: '',
            [LICENSE_STATUS_CHECKED_AT_KEY]: null
          },
          () => {
            updatePlanDisplay('free');
            const upgradeHint = document.getElementById('options-upgrade-link');
            if (upgradeHint) upgradeHint.style.display = '';
            setLicenseStatus('', '');
            setStatus('Cleared. You are on the Free plan.', 'success');
          }
        );
      });
      return;
    }
    chrome.storage.local.set(
      { [LICENSE_KEY_USER_STORAGE_KEY]: key, [LICENSE_KEY_STORAGE_KEY]: key },
      () => {
        setStatus('Key saved. Click "Verify with server" to enable Pro.', 'success');
      }
    );
  });

  document.getElementById('verify-license-btn').addEventListener('click', async () => {
    const input = document.getElementById('license-key-input');
    const key = (input && input.value && input.value.trim()) || '';
    if (!key) {
      setLicenseStatus('Please enter a license key.', 'error');
      return;
    }

    setLicenseStatus('Verifying…', '');
    try {
      const deviceId = await getOrCreateDeviceId();
      let data = {};
      let okFetch = false;
      const verifyBody = JSON.stringify({
        license_key: key,
        device_id: deviceId,
        extension_id: chrome.runtime.id
      });
      const verifySignal =
        typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(5000)
          : undefined;
      for (const vUrl of licenseUrlCandidates('/verify-license')) {
        try {
          const res = await fetch(vUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: verifyBody,
            signal: verifySignal
          });
          const text = await res.text();
          if (!res.ok) {
            console.warn('[devlynx-debug] verify response status:', res.status);
            console.warn('[devlynx-debug] verify response body:', text.slice(0, 800));
          }
          try {
            data = text ? JSON.parse(text) : {};
          } catch (parseErr) {
            console.warn('[devlynx-debug] verify JSON parse error:', parseErr.message, text.slice(0, 800));
            data = {};
          }
          okFetch = true;
          break;
        } catch (_) {}
      }
      if (!okFetch) {
        setLicenseStatus('Server error during verification.', 'error');
        setStatus(serverOfflineMsg(), 'error');
        return;
      }

      const valid = data.valid === true || data.ok === true;
      const token =
        (data.license_token && String(data.license_token).trim()) ||
        (data.token && String(data.token).trim()) ||
        '';

      if (valid && !token) {
        setLicenseStatus('No license token from server. Configure LICENSE_JWT_PRIVATE_KEY on feed-server.', 'error');
        setStatus('Verification succeeded but token missing.', 'error');
        return;
      }

      if (valid) {
        const payload = {
          [PLAN_STORAGE_KEY]: 'pro',
          [PLAN_MIRROR_KEY]: 'pro',
          [LICENSE_KEY_USER_STORAGE_KEY]: key,
          [LICENSE_KEY_STORAGE_KEY]: key,
          [LICENSE_VERIFIED_AT_KEY]: Date.now(),
          [LICENSE_TOKEN_STORAGE_KEY]: token,
          [LICENSE_STATUS_CHECKED_AT_KEY]: Date.now()
        };
        if (data.email) payload[LICENSE_EMAIL_STORAGE_KEY] = String(data.email).trim();
        chrome.storage.local.set(payload, () => {
          updatePlanDisplay('pro');
          const upgradeHint = document.getElementById('options-upgrade-link');
          if (upgradeHint) upgradeHint.style.display = 'none';
          setLicenseStatus('✅ Pro activated!', 'success');
          setStatus('License valid. Pro features are now enabled.', 'success');
        });
      } else {
        const msg = data.error || '❌ Invalid license key.';
        setLicenseStatus(msg.startsWith('❌') ? msg : '❌ ' + (data.error || 'Invalid license key.'), 'error');
        setStatus(data.error || 'Verification failed.', 'error');
      }
    } catch (err) {
      setLicenseStatus('Server error during verification.', 'error');
      setStatus(serverOfflineMsg(), 'error');
    }
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    const input = document.getElementById('license-key-input');
    if (input) input.value = '';
    chrome.storage.local.remove([LICENSE_TOKEN_STORAGE_KEY], () => {
      chrome.storage.local.set(
        {
          [PLAN_STORAGE_KEY]: 'free',
          [PLAN_MIRROR_KEY]: 'free',
          [LICENSE_KEY_USER_STORAGE_KEY]: '',
          [LICENSE_KEY_STORAGE_KEY]: '',
          [LICENSE_VERIFIED_AT_KEY]: null,
          [LICENSE_EMAIL_STORAGE_KEY]: '',
          [LICENSE_STATUS_CHECKED_AT_KEY]: null
        },
        () => {
          updatePlanDisplay('free');
          const upgradeHint = document.getElementById('options-upgrade-link');
          if (upgradeHint) upgradeHint.style.display = '';
          setLicenseStatus('', '');
          setStatus('Cleared. You are on the Free plan.', 'success');
        }
      );
    });
  });
});
