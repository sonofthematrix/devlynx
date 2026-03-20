/** Replaced at build; keep in sync with scripts/build.js `HOSTED_FEED_API`. */
const DEVLYNX_HOSTED_API_DEFAULT = 'https://devlynx-black.vercel.app';
/** Replaced at build; placeholder → hosted API so local/dev loads work without npm start in feed-server. */
const DEVLYNX_API_BASE = '__DEVLYNX_API_BASE__';

function panelApiBaseTrim() {
  let s = typeof DEVLYNX_API_BASE === 'string' ? DEVLYNX_API_BASE.trim() : '';
  if (!s || s.indexOf('__DEVLYNX_API_BASE__') !== -1) {
    s = DEVLYNX_HOSTED_API_DEFAULT;
  }
  return s.replace(/\/$/, '');
}

function panelIsLocalFeedServer() {
  const b = panelApiBaseTrim();
  return b.indexOf('localhost') !== -1 || b.indexOf('127.0.0.1') !== -1;
}

/** Shown when /projects or /health fails — text depends on local vs hosted API */
function serverOfflineMsg() {
  if (!panelIsLocalFeedServer()) {
    const b = panelApiBaseTrim();
    return (
      "Can't reach the DevLynx API (" +
      b +
      '). Check deployment (try /health in a browser), DNS, and your connection. Click status above to retry.'
    );
  }
  return (
    "DevLynx feed server isn't running. In the feed-server folder run npm install, then npm start. " +
    'Click status above to retry.'
  );
}

const PANEL_API_BASE = panelApiBaseTrim();
const feedUrl = PANEL_API_BASE + '/';
const projectsUrl = PANEL_API_BASE + '/projects';
const extensionsUrl = PANEL_API_BASE + '/extensions';
const healthUrl = PANEL_API_BASE + '/health';

// Debug: set true in dev build (npm run build:dev). Logs only when true; obfuscation keeps logs intact.
const DEBUG_MODE = false;
function log(tag, ...args) {
  if (DEBUG_MODE && typeof console !== 'undefined' && console.log) {
    console.log('[DevLynx][' + tag + ']', ...args);
  }
}
const USER_OPENAI_STORAGE_KEY = 'devlynx_openai_api_key';
const API_KEY_NOT_CONFIGURED_MSG = 'Please add your OpenAI API key to use AI features.';

/** True when user saved a key starting with sk- (OpenAI calls go directly to OpenAI from the extension). */
let userOpenAiReady = false;
let serverConnected = false;
let currentLoadId = 0;

// Freemium: plan stored in chrome.storage.local; 'free' | 'pro'
const PLAN_STORAGE_KEY = 'devlens_plan';
const PLAN_MIRROR_KEY = 'devlynx_plan';
const LICENSE_KEY_STORAGE_KEY = 'devlens_license_key';
const LICENSE_KEY_USER_STORAGE_KEY = 'devlynx_license_key';
const LICENSE_VERIFIED_AT_KEY = 'devlens_license_verified_at';
const LICENSE_EMAIL_STORAGE_KEY = 'devlynx_license_email';
const DEVICE_ID_STORAGE_KEY = 'devlynx_device_id';
const LICENSE_TOKEN_STORAGE_KEY = 'devlynx_license_token';
const LICENSE_STATUS_CHECKED_AT_KEY = 'devlynx_license_status_checked_at';
const LICENSE_CACHE_MS = 6 * 60 * 60 * 1000; // refresh license status after 6h (match background verify cache)
function panelLicenseUrlCandidates(pathSuffix) {
  const suf = pathSuffix.charAt(0) === '/' ? pathSuffix : '/' + pathSuffix;
  const b = panelApiBaseTrim();
  if (!panelIsLocalFeedServer()) {
    return [b + suf];
  }
  const alt =
    b.indexOf('127.0.0.1') !== -1
      ? b.replace('127.0.0.1', 'localhost')
      : b.replace('localhost', '127.0.0.1');
  return [b + suf, alt + suf];
}
const DEFAULT_PLAN = 'free';

// Free trial: shared pool of AI uses (Dev assistant, Mod Generator, API tester AI, Explain Element, Error Explainer) — extension-side limit only
const TRIAL_LIMIT = 20;
const TRIAL_STORAGE_KEY = 'trialUsesRemaining';
const TRIAL_INSTALL_ID_KEY = 'trialInstallId';
const TRIAL_ENDED_MESSAGE =
  'Your free AI trial has ended.\nUpgrade to DevLynx Pro to continue using AI tools.';
const GUMROAD_URL = 'https://jcdreamz.gumroad.com/l/devlynx-ai';

/** After this many successful AI responses, show “Rate on Chrome Web Store” (growth). */
const RATE_PROMPT_USES_KEY = 'devlynx_successful_ai_uses';
const RATE_PROMPT_DISMISSED_KEY = 'devlynx_chrome_store_rate_dismissed';
const RATE_PROMPT_THRESHOLD = 10;
/** Replace with your listing ID from the Chrome Web Store URL after publish (then review link works). */
const CHROME_WEB_STORE_EXTENSION_ID = 'REPLACE_WITH_EXTENSION_ID';

function getChromeStoreReviewUrl() {
  if (!CHROME_WEB_STORE_EXTENSION_ID || CHROME_WEB_STORE_EXTENSION_ID === 'REPLACE_WITH_EXTENSION_ID') {
    return 'https://chromewebstore.google.com/search/DevLynx%20AI';
  }
  return `https://chromewebstore.google.com/detail/devlynx-ai/${CHROME_WEB_STORE_EXTENSION_ID}/reviews`;
}

function openChromeStoreReview() {
  const url = getChromeStoreReviewUrl();
  try {
    chrome.tabs.create({ url });
  } catch (_) {
    window.open(url, '_blank');
  }
}

function updateRatePromptUI() {
  const banner = document.getElementById('chrome-store-rate-banner');
  if (!banner) return;
  chrome.storage.local.get([RATE_PROMPT_USES_KEY, RATE_PROMPT_DISMISSED_KEY], (r) => {
    if (chrome.runtime.lastError) return;
    if (r[RATE_PROMPT_DISMISSED_KEY]) {
      banner.hidden = true;
      return;
    }
    const n = typeof r[RATE_PROMPT_USES_KEY] === 'number' ? r[RATE_PROMPT_USES_KEY] : 0;
    banner.hidden = n < RATE_PROMPT_THRESHOLD;
  });
}

function ref(id) {
  return document.getElementById(id);
}

function getLicenseKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get([LICENSE_KEY_USER_STORAGE_KEY, LICENSE_KEY_STORAGE_KEY], (r) => {
      if (chrome.runtime.lastError) {
        resolve('');
        return;
      }
      const a = r && r[LICENSE_KEY_USER_STORAGE_KEY] ? String(r[LICENSE_KEY_USER_STORAGE_KEY]).trim() : '';
      const b = r && r[LICENSE_KEY_STORAGE_KEY] ? String(r[LICENSE_KEY_STORAGE_KEY]).trim() : '';
      resolve(a || b || '');
    });
  });
}

/** Persistent per-browser-profile device id for license binding (max devices enforced server-side). */
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

function apiPost(body) {
  const t = body && body.type;
  if (t === 'devQuestion' || t === 'aiContext' || t === 'generateMod') {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'OPENAI_AI', body }, (response) => {
        if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
        else if (!response) resolve({ error: 'No response from background' });
        else if (response.error) resolve({ error: response.error });
        else resolve({ data: response.data });
      });
    });
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'API_REQUEST', payload: { url: feedUrl, method: 'POST', body } }, (response) => {
      if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
      else if (!response) resolve({ error: 'No response from background' });
      else resolve(response);
    });
  });
}

function apiGet(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'API_REQUEST', payload: { url, method: 'GET' } }, (response) => {
      if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
      else if (!response) resolve({ error: 'No response from background' });
      else resolve(response);
    });
  });
}

async function loadProjects() {
  const loadId = ++currentLoadId;
  const sel = document.getElementById('project-select');
  const hint = document.getElementById('project-hint');
  if (sel) sel.innerHTML = '<option value="">Loading…</option>';
  if (hint) hint.textContent = 'Loading…';
  let result;
  try {
    result = await apiGet(projectsUrl);
  } catch (e) {
    if (loadId !== currentLoadId) return;
    serverConnected = false;
    setFeedServerStatus(false, 'Error');
    if (hint) hint.textContent = 'Error: ' + (e && e.message ? e.message : 'unknown');
    if (sel) sel.innerHTML = '<option value="">Error</option>';
    updateStatusBar();
    return;
  }
  if (loadId !== currentLoadId) return;
  if (!result || result.error) {
    serverConnected = false;
    setFeedServerStatus(false, 'Disconnected');
    if (sel) sel.innerHTML = '<option value="0">Default (no server)</option>';
    if (hint) hint.textContent = serverOfflineMsg();
    updateStatusBar();
    return;
  }
  serverConnected = true;
  const data = result.data;
  let statusMessage = 'Connected';
  if (loadId !== currentLoadId) return;
  setFeedServerStatus(true, statusMessage);
  updateStatusBar();
  if (!sel && !hint) return;
  if (!data || !data.ok || !Array.isArray(data.projects)) {
    if (sel) sel.innerHTML = '<option value="0">Default workspace</option>';
    if (hint && statusMessage === 'Connected') hint.textContent = 'Feed server connected.';
    return;
  }
  if (data.projects.length === 0) {
    if (sel) sel.innerHTML = '<option value="0">No workspace</option>';
    if (hint) hint.textContent = statusMessage === 'Connected' ? 'No workspace configured.' : hint.textContent;
    return;
  }
  if (sel) sel.innerHTML = data.projects.map((p) => `<option value="${p.index}">${p.name}</option>`).join('');
  if (hint) hint.textContent = statusMessage === 'Connected' ? 'Choose project for screenshot and tasks.' : hint.textContent;
}

function setFeedServerStatus(connected, message, titleOverride) {
  const el = document.getElementById('feed-server-status');
  const badge = el && el.querySelector('.badge');
  const hintEl = document.getElementById('disconnect-hint');
  if (!el) return;
  el.classList.toggle('error', !connected);
  el.classList.toggle('ok', connected);
  el.title = titleOverride != null ? titleOverride : (connected ? 'Click to retry connection' : 'Click to retry connection');
  if (badge) {
    if (connected) badge.textContent = message || 'Connected';
    else badge.textContent = message || 'Disconnected';
  } else {
    el.textContent = connected ? (message || 'Connected') : (message || 'Disconnected');
  }
  if (hintEl) {
    hintEl.hidden = !!connected;
    if (!connected) hintEl.textContent = serverOfflineMsg();
  }
}

function updateStatusBar() {
  const serverEl = document.getElementById('status-bar-server');
  const openaiEl = document.getElementById('status-bar-openai');
  const planEl = document.getElementById('status-bar-plan');
  if (serverEl) {
    serverEl.textContent = serverConnected ? '● DevLynx Server: Connected' : '● DevLynx Server: Disconnected';
    serverEl.className = 'status-bar-item' + (serverConnected ? ' ok' : ' error');
    serverEl.title = serverConnected ? 'Server is running' : 'Click to retry connection';
  }
  if (openaiEl) {
    openaiEl.textContent = userOpenAiReady ? '● OpenAI: Your API key' : '● OpenAI: Add your key';
    openaiEl.className = 'status-bar-item' + (userOpenAiReady ? ' ok' : ' warn');
    openaiEl.title = userOpenAiReady ? 'Calls go directly to OpenAI from this extension.' : API_KEY_NOT_CONFIGURED_MSG;
  }
  if (planEl) {
    planEl.className = 'status-bar-item';
    getPlan().then((plan) => {
      const emailRow = document.getElementById('status-bar-license-email');
      if (plan === 'pro') {
        planEl.textContent = '● Plan: Pro ✓';
        planEl.classList.add('ok');
        chrome.storage.local.get([LICENSE_EMAIL_STORAGE_KEY], (r) => {
          const em = (r && r[LICENSE_EMAIL_STORAGE_KEY]) ? String(r[LICENSE_EMAIL_STORAGE_KEY]).trim() : '';
          if (emailRow) {
            if (em) {
              emailRow.textContent = 'Licensed to: ' + em;
              emailRow.hidden = false;
              emailRow.className = 'status-bar-item status-license-email ok';
            } else {
              emailRow.textContent = '';
              emailRow.hidden = true;
              emailRow.className = 'status-bar-item status-license-email';
            }
          }
        });
      } else {
        if (emailRow) {
          emailRow.textContent = '';
          emailRow.hidden = true;
          emailRow.className = 'status-bar-item status-license-email';
        }
        getTrialUsesRemaining().then((remaining) => {
          if (remaining !== null && remaining > 0) {
            planEl.textContent = `● Plan: Free (${remaining} AI use${remaining === 1 ? '' : 's'} left)`;
            planEl.classList.add('warn');
          } else {
            planEl.textContent = '● Plan: Free (trial ended)';
            planEl.classList.add('error');
          }
        });
      }
    });
  }
}

function getSelectedProject() {
  const el = document.getElementById('project-select');
  if (!el) return undefined;
  const v = el.value;
  if (v === '') return undefined;
  const n = parseInt(v, 10);
  return isNaN(n) ? undefined : n;
}

async function loadExtensions() {
  const sel = document.getElementById('extensions-list');
  if (!sel) return;
  const project = getSelectedProject();
  sel.innerHTML = '<option value="">Loading…</option>';
  const url = extensionsUrl + (project !== undefined ? '?targetFolder=' + project : '');
  try {
    const result = await apiGet(url);
    const data = result.data;
    if (result.error || !data || !data.ok || !Array.isArray(data.extensions)) {
      sel.innerHTML = '<option value="">No extensions</option>';
      return;
    }
    if (data.extensions.length === 0) {
      sel.innerHTML = '<option value="">No extensions in project</option>';
      return;
    }
    sel.innerHTML = data.extensions.map((e) => `<option value="${e.index}">${e.name}</option>`).join('');
  } catch (e) {
    sel.innerHTML = '<option value="">Error</option>';
  }
}

function setStatus(id, text, isError) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || '';
  el.classList.toggle('error', !!isError);
  if (isError && text) saveLastError(id, text);
}

const AI_RESULT_STORAGE_KEY = 'devlens_ai_result';
const DEBUG_LAST_ERROR_KEY = 'devlens_last_error';

function getVersion() {
  try {
    const manifest = chrome.runtime.getManifest();
    return (manifest && manifest.version) ? manifest.version : '1.1.2';
  } catch (_) { return '1.1.2'; }
}

/** Pro is derived from signed JWT + local validation (not from plan flags). */
function getPlan() {
  return new Promise((resolve) => {
    chrome.storage.local.get([LICENSE_TOKEN_STORAGE_KEY], (r) => {
      if (chrome.runtime.lastError) {
        resolve('free');
        return;
      }
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

/** True when user has a valid Pro license (plan === 'pro'). Use to enable Explain Element and Error Explainer. */
async function licenseValid() {
  return (await getPlan()) === 'pro';
}

function setPlan(plan) {
  const v = plan === 'pro' ? 'pro' : 'free';
  return new Promise((resolve) => {
    if (v === 'free') {
      chrome.storage.local.remove([LICENSE_TOKEN_STORAGE_KEY], () => {
        chrome.storage.local.set(
          {
            [PLAN_STORAGE_KEY]: 'free',
            [PLAN_MIRROR_KEY]: 'free',
            [LICENSE_STATUS_CHECKED_AT_KEY]: null
          },
          resolve
        );
      });
      return;
    }
    chrome.storage.local.set({ [PLAN_STORAGE_KEY]: v, [PLAN_MIRROR_KEY]: v }, resolve);
  });
}

/** Refresh: GET /license-status when token present and last check older than LICENSE_CACHE_MS. */
function refreshLicenseIfStale() {
  chrome.storage.local.get([LICENSE_TOKEN_STORAGE_KEY, LICENSE_STATUS_CHECKED_AT_KEY], (r) => {
    const token =
      (r[LICENSE_TOKEN_STORAGE_KEY] && String(r[LICENSE_TOKEN_STORAGE_KEY]).trim()) || '';
    if (!token) return;
    const last = typeof r[LICENSE_STATUS_CHECKED_AT_KEY] === 'number' ? r[LICENSE_STATUS_CHECKED_AT_KEY] : 0;
    const now = Date.now();
    if (last > 0 && now - last < LICENSE_CACHE_MS) return;
    (async () => {
      const q = '?token=' + encodeURIComponent(token);
      let data = {};
      try {
        for (const url of panelLicenseUrlCandidates('/license-status')) {
          try {
            const res = await fetch(url + q);
            data = await res.json().catch(() => ({}));
            break;
          } catch (_) {}
        }
        if (data.ok === true && data.valid === true) {
          chrome.storage.local.set({ [LICENSE_STATUS_CHECKED_AT_KEY]: Date.now() }, () => {
            log('License', 'license-status OK');
            updateStatusBar();
          });
        } else {
          chrome.storage.local.remove([LICENSE_TOKEN_STORAGE_KEY], () => {
            chrome.storage.local.set(
              {
                [PLAN_STORAGE_KEY]: 'free',
                [PLAN_MIRROR_KEY]: 'free',
                [LICENSE_VERIFIED_AT_KEY]: null,
                [LICENSE_EMAIL_STORAGE_KEY]: '',
                [LICENSE_STATUS_CHECKED_AT_KEY]: null
              },
              () => {
                applyPlanUI('free');
                updateTrialUI();
                updateStatusBar();
              }
            );
          });
        }
      } catch (_) {}
    })();
  });
}

function getTrialUsesRemaining() {
  return new Promise((resolve) => {
    chrome.storage.local.get([TRIAL_STORAGE_KEY], (r) => {
      const v = r[TRIAL_STORAGE_KEY];
      resolve(typeof v === 'number' && v >= 0 ? v : null);
    });
  });
}

function setTrialUsesRemaining(n) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [TRIAL_STORAGE_KEY]: Math.max(0, n) }, () => {
      resolve();
    });
  });
}

/** Returns { installId, remaining }. Used to detect simple reset (installId present but remaining wiped). */
function getTrialState() {
  return new Promise((resolve) => {
    chrome.storage.local.get([TRIAL_INSTALL_ID_KEY, TRIAL_STORAGE_KEY], (r) => {
      const installId = (r[TRIAL_INSTALL_ID_KEY] && String(r[TRIAL_INSTALL_ID_KEY]).trim()) || null;
      const v = r[TRIAL_STORAGE_KEY];
      const remaining = typeof v === 'number' && v >= 0 ? v : null;
      resolve({ installId, remaining });
    });
  });
}

/** On extension start: initialize trial. Uses trialInstallId to avoid simple reset (e.g. only clearing trialUsesRemaining). */
async function ensureTrialInitialized() {
  const { installId, remaining } = await getTrialState();
  if (!installId) {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'trial-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
    await new Promise((resolve) => {
      chrome.storage.local.set(
        { [TRIAL_INSTALL_ID_KEY]: newId, [TRIAL_STORAGE_KEY]: TRIAL_LIMIT },
        () => { resolve(); }
      );
    });
    log('Trial', 'initialized to', TRIAL_LIMIT, 'installId:', newId);
    return;
  }
  if (remaining === null) {
    await setTrialUsesRemaining(0);
    log('Trial', 'reset detected (same installId), remaining set to 0');
  }
}

/**
 * Check if user can use an AI feature on Free (shared trial) or unlimited on Pro.
 * - licenseValid (pro) → allow (UI only; background re-verifies license before each AI call).
 * - trialUsesRemaining > 0 → allow (trial decremented in background after successful OpenAI calls).
 * - else → block with TRIAL_ENDED_MESSAGE.
 * @returns {Promise<{ allow: boolean, message?: string }>}
 */
async function canUseProTrialFeature() {
  const valid = await licenseValid();
  if (valid) {
    log('License', 'pro – feature allowed');
    return { allow: true };
  }
  await ensureTrialInitialized();
  const remaining = await getTrialUsesRemaining();
  log('Trial', 'remaining:', remaining);
  if (remaining !== null && remaining > 0) {
    log('Gate', 'allowed (trial)');
    return { allow: true };
  }
  log('Gate', 'blocked – trial ended');
  return { allow: false, message: TRIAL_ENDED_MESSAGE };
}

function showUpgradeModal() {
  const modal = document.getElementById('upgrade-modal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function hideUpgradeModal() {
  const modal = document.getElementById('upgrade-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function showApiKeyModal() {
  const modal = document.getElementById('api-key-modal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function hideApiKeyModal() {
  const modal = document.getElementById('api-key-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function openPricingUrl() {
  try {
    chrome.tabs.create({ url: GUMROAD_URL, active: true });
  } catch (_) {
    window.open(GUMROAD_URL, '_blank', 'noopener,noreferrer');
  }
  hideUpgradeModal();
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function markdownToHtml(text) {
  if (!text || typeof text !== 'string') return '';
  let out = escapeHtml(text);
  out = out.replace(/```([\s\S]*?)```/g, '<pre class="md-code-block"><code>$1</code></pre>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\n/g, '<br>');
  return out;
}

function setAnswerWithMarkdown(el, rawText, options) {
  if (!el) return;
  const useMarkdown = options?.markdown !== false;
  if (useMarkdown && rawText) {
    el.innerHTML = markdownToHtml(rawText);
    el.classList.remove('empty');
  } else if (rawText) {
    el.textContent = rawText;
    el.classList.remove('empty');
  } else {
    el.textContent = '';
    el.classList.add('empty');
  }
}

function saveLastError(feature, message) {
  const payload = { feature: feature || 'Panel', message: message || 'Unknown error', at: Date.now() };
  try {
    chrome.storage.local.set({ [DEBUG_LAST_ERROR_KEY]: payload });
    showLastErrorInPanel(payload.message, payload.feature);
  } catch (_) {}
}

function showLastErrorInPanel(message, feature) {
  const block = document.getElementById('last-error-block');
  const textEl = document.getElementById('last-error-text');
  if (!block || !textEl) return;
  textEl.textContent = (feature ? `[${feature}] ` : '') + (message || '');
  block.hidden = false;
}

// Pro: unlimited AI (Dev assistant, Mod Generator, API tester AI helpers, Explain Element, Error Explainer).
// Free: core tools + shared trial (TRIAL_LIMIT AI uses across all AI features above).
function applyPlanUI(plan) {
  const isPro = plan === 'pro';
  document.body.classList.toggle('plan-free', !isPro);
  document.body.classList.toggle('plan-pro', isPro);
  document.querySelectorAll('[data-upgrade-link], [data-upgrade-anchor]').forEach((el) => {
    el.style.display = isPro ? 'none' : '';
  });
  updateTrialUI();
}

function setPanelLicenseInlineStatus(message, type) {
  const statusEl = document.getElementById('license-status');
  if (!statusEl) return;
  statusEl.textContent = message || '';
  statusEl.classList.remove('success', 'error');
  if (type === 'success') statusEl.classList.add('success');
  else if (type === 'error') statusEl.classList.add('error');
}

/** Update trial status line (Free trial: X AI uses / Trial ended). Only visible when plan is free. */
async function updateTrialUI() {
  const el = document.getElementById('trial-status');
  if (!el) return;
  const plan = await getPlan();
  if (plan === 'pro') {
    el.textContent = '';
    el.hidden = true;
    el.classList.remove('low-uses', 'trial-ended');
    updateStatusBar();
    return;
  }
  await ensureTrialInitialized();
  const remaining = await getTrialUsesRemaining();
  el.hidden = false;
  el.classList.remove('low-uses', 'trial-ended');
  if (remaining !== null && remaining > 0) {
    el.textContent = `Free trial: ${remaining} AI uses left\nUpgrade for unlimited AI tools.`;
    if (remaining < 5) el.classList.add('low-uses');
  } else {
    el.textContent = TRIAL_ENDED_MESSAGE;
    el.classList.add('trial-ended');
  }
  updateStatusBar();
}

document.addEventListener('DOMContentLoaded', async () => {
  await ensureTrialInitialized();
  refreshLicenseIfStale();
  const plan = await getPlan();
  applyPlanUI(plan);
  updateTrialUI();

  // Initial connection check; retry once after short delay (background/service worker may not be ready yet)
  loadProjects().catch(() => {});
  setTimeout(() => { if (!serverConnected) loadProjects().catch(() => {}); }, 800);

  // When user opens or returns to the panel, retry if still disconnected
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !serverConnected) loadProjects().catch(() => {});
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (
      changes[PLAN_STORAGE_KEY] ||
      changes[PLAN_MIRROR_KEY] ||
      changes[LICENSE_KEY_STORAGE_KEY] ||
      changes[LICENSE_KEY_USER_STORAGE_KEY] ||
      changes[LICENSE_TOKEN_STORAGE_KEY] ||
      changes[LICENSE_STATUS_CHECKED_AT_KEY]
    ) {
      getPlan().then(applyPlanUI);
      updateTrialUI();
      updateStatusBar();
    }
    if (changes[TRIAL_STORAGE_KEY]) {
      updateTrialUI();
    }
    if (changes[RATE_PROMPT_USES_KEY] || changes[RATE_PROMPT_DISMISSED_KEY]) {
      updateRatePromptUI();
    }
    if (changes[LICENSE_KEY_STORAGE_KEY] || changes[LICENSE_KEY_USER_STORAGE_KEY]) {
      const inp = document.getElementById('license-key-input');
      const v =
        (changes[LICENSE_KEY_USER_STORAGE_KEY] && changes[LICENSE_KEY_USER_STORAGE_KEY].newValue) !== undefined
          ? changes[LICENSE_KEY_USER_STORAGE_KEY].newValue
          : changes[LICENSE_KEY_STORAGE_KEY] && changes[LICENSE_KEY_STORAGE_KEY].newValue;
      if (inp && v !== undefined) inp.value = (v && String(v)) || '';
    }
  });

  // Debug: run window.devlensDebug() in DevTools (Console) when sidepanel is open
  window.devlensDebug = async function () {
    await ensureTrialInitialized();
    const plan = await getPlan();
    const remaining = await getTrialUsesRemaining();
    const state = await getTrialState();
    const installIdShort = state.installId ? state.installId.slice(0, 8) + '…' : null;
    const verifiedAt = await new Promise((resolve) => {
      chrome.storage.local.get([LICENSE_VERIFIED_AT_KEY], (r) => resolve(r[LICENSE_VERIFIED_AT_KEY] ?? null));
    });
    let serverStatus = 'unknown';
    let apiKeyConfigured = null;
    try {
      const r = await apiGet(projectsUrl);
      serverStatus = (r && !r.error && r.data && r.data.ok) ? 'connected' : 'disconnected';
      if (serverStatus === 'connected') {
        const h = await apiGet(healthUrl);
        if (h && !h.error && h.data) apiKeyConfigured = !!h.data.apiKeyConfigured;
      }
    } catch (_) {
      serverStatus = 'error';
    }
    const info = {
      trialUsesRemaining: remaining,
      trialInstallId: installIdShort,
      plan,
      licenseState: plan,
      licenseVerifiedAt: verifiedAt ? new Date(verifiedAt).toISOString() : null,
      serverStatus,
      userOpenAiKeyInBrowser: userOpenAiReady,
      feedServerOpenAiConfigured: apiKeyConfigured
    };
    console.log('[DevLynx][Debug]', info);
    return info;
  };

  // Upgrade modal: close and upgrade buttons; backdrop click closes upgrade modal
  ref('upgrade-modal-close')?.addEventListener('click', hideUpgradeModal);
  ref('upgrade-modal-btn')?.addEventListener('click', openPricingUrl);
  document.getElementById('upgrade-modal')?.querySelector('.upgrade-modal-backdrop')?.addEventListener('click', hideUpgradeModal);
  ref('api-key-modal-close')?.addEventListener('click', hideApiKeyModal);
  document.getElementById('api-key-modal')?.querySelector('.upgrade-modal-backdrop')?.addEventListener('click', hideApiKeyModal);
  ref('buy-pro-btn')?.addEventListener('click', openPricingUrl);

  chrome.storage.local.get([LICENSE_KEY_USER_STORAGE_KEY, LICENSE_KEY_STORAGE_KEY], (r) => {
    const inp = document.getElementById('license-key-input');
    const key =
      (r && r[LICENSE_KEY_USER_STORAGE_KEY] && String(r[LICENSE_KEY_USER_STORAGE_KEY]).trim()) ||
      (r && r[LICENSE_KEY_STORAGE_KEY] && String(r[LICENSE_KEY_STORAGE_KEY]).trim()) ||
      '';
    if (inp && key) inp.value = key;
  });

  const activateLicenseToggle = document.getElementById('activate-license-toggle');
  const licensePanel = document.getElementById('license-panel');

  function openFooterLicensePanelFromModal() {
    if (!licensePanel || !activateLicenseToggle) return;
    licensePanel.classList.add('open');
    licensePanel.setAttribute('aria-hidden', 'false');
    activateLicenseToggle.setAttribute('aria-expanded', 'true');
    try {
      licensePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (_) {}
    document.getElementById('license-key-input')?.focus();
  }

  ref('upgrade-modal-activate-license')?.addEventListener('click', () => {
    hideUpgradeModal();
    openFooterLicensePanelFromModal();
  });

  activateLicenseToggle?.addEventListener('click', () => {
    if (!licensePanel) return;
    licensePanel.classList.toggle('open');
    const open = licensePanel.classList.contains('open');
    licensePanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    activateLicenseToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open) setPanelLicenseInlineStatus('', '');
  });

  let licenseVerifyInFlight = false;
  async function verifyLicenseFromPanel() {
    const input = document.getElementById('license-key-input');
    const key = (input && input.value && input.value.trim()) || '';
    if (!key) {
      setPanelLicenseInlineStatus('Please enter a license key.', 'error');
      return;
    }
    if (licenseVerifyInFlight) return;
    licenseVerifyInFlight = true;
    setPanelLicenseInlineStatus('Verifying…', '');
    try {
      const deviceId = await getOrCreateDeviceId();
      let data = {};
      let httpOk = false;
      const verifyBody = JSON.stringify({
        license_key: key,
        device_id: deviceId,
        extension_id: chrome.runtime.id
      });
      const verifySignal =
        typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(5000)
          : undefined;
      for (const vUrl of panelLicenseUrlCandidates('/verify-license')) {
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
          httpOk = true;
          break;
        } catch (_) {}
      }
      if (!httpOk) {
        setPanelLicenseInlineStatus(serverOfflineMsg(), 'error');
        return;
      }
      const valid = data.valid === true || data.ok === true;
      const token =
        (data.license_token && String(data.license_token).trim()) ||
        (data.token && String(data.token).trim()) ||
        '';
      if (valid && !token) {
        setPanelLicenseInlineStatus(
          'Server did not return a license token. Set LICENSE_JWT_PRIVATE_KEY (or LICENSE_SECRET) on the feed-server.',
          'error'
        );
        return;
      }
      if (valid) {
        const storagePayload = {
          [PLAN_STORAGE_KEY]: 'pro',
          [PLAN_MIRROR_KEY]: 'pro',
          [LICENSE_KEY_USER_STORAGE_KEY]: key,
          [LICENSE_KEY_STORAGE_KEY]: key,
          [LICENSE_VERIFIED_AT_KEY]: Date.now(),
          [LICENSE_TOKEN_STORAGE_KEY]: token,
          [LICENSE_STATUS_CHECKED_AT_KEY]: Date.now()
        };
        if (data.email) storagePayload[LICENSE_EMAIL_STORAGE_KEY] = String(data.email).trim();
        await new Promise((resolve) => {
          chrome.storage.local.set(storagePayload, resolve);
        });
        const plan = await getPlan();
        applyPlanUI(plan);
        await updateTrialUI();
        updateStatusBar();
        setPanelLicenseInlineStatus('Pro activated.', 'success');
        if (licensePanel) {
          licensePanel.classList.remove('open');
          licensePanel.setAttribute('aria-hidden', 'true');
          activateLicenseToggle?.setAttribute('aria-expanded', 'false');
        }
      } else {
        setPanelLicenseInlineStatus(data.error || 'Invalid license key.', 'error');
      }
    } catch (err) {
      setPanelLicenseInlineStatus(serverOfflineMsg(), 'error');
    } finally {
      licenseVerifyInFlight = false;
    }
  }

  ref('verify-license-btn')?.addEventListener('click', () => {
    verifyLicenseFromPanel();
  });

  document.getElementById('license-key-input')?.addEventListener('paste', () => {
    setTimeout(() => {
      verifyLicenseFromPanel();
    }, 200);
  });

  updateRatePromptUI();
  ref('chrome-store-rate-btn')?.addEventListener('click', openChromeStoreReview);
  ref('chrome-store-rate-dismiss')?.addEventListener('click', () => {
    chrome.storage.local.set({ [RATE_PROMPT_DISMISSED_KEY]: true }, () => updateRatePromptUI());
  });

  // Auto-retry connection every 5s while panel is open so Connected appears when server is running
  setInterval(() => {
    if (!serverConnected) loadProjects().catch(() => {});
  }, 5000);

  const versionEl = document.getElementById('panel-version');
  if (versionEl) versionEl.textContent = 'DevLynx v' + getVersion();
  const headerVersionEl = document.getElementById('header-version');
  if (headerVersionEl) headerVersionEl.textContent = 'v' + getVersion();

  document.addEventListener('click', (e) => {
    const clearBtn = e.target.closest('.btn-clear-answer');
    if (clearBtn) {
      const id = clearBtn.getAttribute('data-clear-from');
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      if (el.tagName === 'PRE') {
        el.textContent = '';
      } else {
        el.innerHTML = '';
        el.classList.add('empty');
      }
      return;
    }
    const btn = e.target.closest('.btn-copy-answer');
    if (!btn) return;
    const id = btn.getAttribute('data-copy-from');
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    const text = el.innerText || el.textContent || '';
    if (!text) return;
    const label = btn.textContent || 'Copy';
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = label; }, 1500);
    }).catch(() => {});
  });

  const EXPLAIN_MODE_KEY = 'devlens_explain_mode';
  chrome.storage.local.get([EXPLAIN_MODE_KEY], (r) => {
    const mode = (r[EXPLAIN_MODE_KEY] || 'simple');
    document.querySelectorAll('.explain-mode-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
  });
  document.querySelectorAll('.explain-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode') || 'simple';
      chrome.storage.local.set({ [EXPLAIN_MODE_KEY]: mode });
      document.querySelectorAll('.explain-mode-btn').forEach((b) => b.classList.toggle('active', b.getAttribute('data-mode') === mode));
    });
  });

  // Click status badge or status bar "DevLynx Server" row to retry connection
  function retryConnection() {
    ref('feed-server-status')?.classList.remove('error', 'ok');
    const badge = document.querySelector('#feed-server-status .badge');
    if (badge) badge.textContent = 'checking…';
    loadProjects().catch(() => {});
  }
  ref('feed-server-status')?.addEventListener('click', retryConnection);
  ref('status-bar-server')?.addEventListener('click', () => {
    if (!serverConnected) retryConnection();
  });

  // Show last AI result (context menu only – Explain Element has its own block, no duplicate)
  chrome.storage.local.get([AI_RESULT_STORAGE_KEY], (result) => {
    const data = result[AI_RESULT_STORAGE_KEY];
    const el = document.getElementById('last-ai-result');
    if (el) {
      if (data && data.answer && data.action !== 'explainElement') {
        const labels = { ask: 'Ask AI', generateRequestCode: 'Generate code', explainError: 'Explain error', explainEndpoint: 'Explain endpoint', tsTypes: 'TS types', refactorCode: 'Refactor' };
        const label = labels[data.action] || 'AI';
        el.innerHTML = `<span class="last-ai-label">${escapeHtml(label)}</span><br>${markdownToHtml(data.answer)}`;
        el.classList.remove('empty');
      } else {
        el.textContent = '';
        el.classList.add('empty');
      }
    }
    if (data && data.action === 'explainElement' && data.answer) {
      const answerEl = document.getElementById('explain-element-answer');
      if (answerEl) {
        setAnswerWithMarkdown(answerEl, data.answer);
        setStatus('explain-element-status', 'Done.');
      }
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[AI_RESULT_STORAGE_KEY]) return;
    const data = changes[AI_RESULT_STORAGE_KEY].newValue;
    if (data && data.action === 'explainElement' && data.answer) {
      const answerEl = document.getElementById('explain-element-answer');
      if (answerEl) {
        setAnswerWithMarkdown(answerEl, data.answer);
        setStatus('explain-element-status', 'Done.');
      }
    }
  });

  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab && tab.id ? tab : null;
  }

  // Presets (Hide ads, Dark mode, etc.)
  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const preset = btn.getAttribute('data-preset');
      const tab = await getActiveTab();
      if (!tab) {
        setStatus('presets-status', 'No active tab.', true);
        return;
      }
      setStatus('presets-status', 'Applying…');
      chrome.runtime.sendMessage({ type: 'INJECT_PRESET', tabId: tab.id, preset }, (res) => {
        if (chrome.runtime.lastError) {
          setStatus('presets-status', chrome.runtime.lastError.message || 'Error', true);
          return;
        }
        if (res && res.ok) {
          setStatus('presets-status', 'Applied. Reload page to see on next visit.');
          btn.classList.add('active');
        } else {
          setStatus('presets-status', (res && res.error) || 'Failed', true);
        }
      });
    });
  });

  // Click-to-edit: start / stop inspect mode
  ref('start-inspect')?.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab) {
      setStatus('inspect-status', 'No active tab.', true);
      return;
    }
    setStatus('inspect-status', '');
    chrome.runtime.sendMessage({ type: 'MOD_TO_TAB', tabId: tab.id, payload: { type: 'START_INSPECT_MODE' } }, (res) => {
      if (chrome.runtime.lastError) setStatus('inspect-status', chrome.runtime.lastError.message || 'Error', true);
      else if (res && !res.ok) setStatus('inspect-status', res.error || 'Failed', true);
      else setStatus('inspect-status', 'Click an element on the page.');
    });
  });
  ref('stop-inspect')?.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab) return;
    chrome.runtime.sendMessage({ type: 'MOD_TO_TAB', tabId: tab.id, payload: { type: 'STOP_INSPECT_MODE' } }, () => {
      setStatus('inspect-status', 'Stopped.');
    });
  });

  // AI Explain Element: Pro unlimited; Free uses shared AI trial; decrement only on successful AI response
  ref('start-explain-inspect')?.addEventListener('click', async () => {
    if (!userOpenAiReady) {
      setStatus('explain-element-status', API_KEY_NOT_CONFIGURED_MSG, true);
      showApiKeyModal();
      return;
    }
    const gate = await canUseProTrialFeature();
    if (!gate.allow) {
      log('Explain Element', 'blocked');
      setStatus('explain-element-status', '', false);
      showUpgradeModal();
      return;
    }
    log('Explain Element', 'allowed');
    const tab = await getActiveTab();
    if (!tab) {
      setStatus('explain-element-status', 'No active tab.', true);
      return;
    }
    setStatus('explain-element-status', '');
    const answerEl = document.getElementById('explain-element-answer');
    if (answerEl) {
      answerEl.textContent = '';
      answerEl.classList.add('empty');
    }
    chrome.runtime.sendMessage({ type: 'MOD_TO_TAB', tabId: tab.id, payload: { type: 'START_EXPLAIN_MODE' } }, (res) => {
      if (chrome.runtime.lastError) setStatus('explain-element-status', serverOfflineMsg(), true);
      else if (res && !res.ok) setStatus('explain-element-status', res.error || 'Failed', true);
      else {
        setStatus('explain-element-status', 'Click an element on the page — result appears here and in a toast.');
        document.getElementById('explain-element-answer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    
    const tryBtn = document.getElementById('start-explain-inspect');
    if (tryBtn) tryBtn.classList.remove('try-it-btn');
  });
  ref('stop-explain-inspect')?.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab) return;
    chrome.runtime.sendMessage({ type: 'MOD_TO_TAB', tabId: tab.id, payload: { type: 'STOP_EXPLAIN_MODE' } }, () => {
      setStatus('explain-element-status', 'Stopped.');
    });
  });

  // Listen for the element data from content script or background script
  chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === 'ELEMENT_EXPLAIN_DATA') {
      setStatus('explain-element-status', 'Asking AI…');
      const answerEl = document.getElementById('explain-element-answer');
      if (answerEl) {
        answerEl.textContent = 'Analyzing element…';
        answerEl.classList.remove('empty');
        answerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (message.type === 'ELEMENT_EXPLAIN_RESULT') {
      const answerEl = document.getElementById('explain-element-answer');
      if (answerEl) {
        setAnswerWithMarkdown(answerEl, message.answer);
        answerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      const failMsg =
        message.success === false && message.answer && String(message.answer).trim()
          ? String(message.answer).trim()
          : API_KEY_NOT_CONFIGURED_MSG;
      setStatus('explain-element-status', message.success === false ? failMsg : 'Done.', message.success === false);
      if (message.success === true) {
        updateTrialUI();
        updateStatusBar();
      }
    }
  });

  // The actual explainElement function is no longer needed here as background.js does it
  // But we keep it in case it's called directly
  async function explainElement(htmlSnippet, selector, tab) {
    // Legacy fallback, background.js does this now.
  }

  // Custom CSS: apply to current site
  ref('custom-css-apply')?.addEventListener('click', async () => {
    const textarea = document.getElementById('custom-css-input');
    const css = (textarea && textarea.value && textarea.value.trim()) || '';
    if (!css) {
      setStatus('custom-css-status', 'Enter some CSS first.', true);
      return;
    }
    const tab = await getActiveTab();
    if (!tab) {
      setStatus('custom-css-status', 'No active tab.', true);
      return;
    }
    setStatus('custom-css-status', 'Applying…');
    chrome.runtime.sendMessage({ type: 'INJECT_MOD', tabId: tab.id, css, js: '' }, (res) => {
      if (chrome.runtime.lastError) {
        setStatus('custom-css-status', chrome.runtime.lastError.message || 'Error', true);
        return;
      }
      if (res && res.ok) setStatus('custom-css-status', 'Applied. Saved for this site.');
      else setStatus('custom-css-status', (res && res.error) || 'Failed', true);
    });
  });

  ref('reset-page-mods')?.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab) {
      setStatus('custom-css-status', 'No active tab.', true);
      return;
    }
    setStatus('custom-css-status', 'Resetting site...');
    chrome.runtime.sendMessage({ type: 'MOD_TO_TAB', tabId: tab.id, payload: { type: 'RESET_PAGE_MODS' } }, (res) => {
      if (chrome.runtime.lastError) setStatus('custom-css-status', chrome.runtime.lastError.message || 'Error', true);
      else if (res && !res.ok) setStatus('custom-css-status', res.error || 'Failed', true);
      else {
        setStatus('custom-css-status', 'Reset and reloaded.');
        document.querySelectorAll('[data-preset]').forEach(btn => btn.classList.remove('active'));
      }
    });
  });

  // AI mod generator: shared AI trial on Free; Pro unlimited
  ref('generate-mod-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('mod-prompt-input');
    const prompt = (input && input.value && input.value.trim()) || '';
    if (!prompt) {
      setStatus('generate-mod-status', 'Describe what to change first.', true);
      return;
    }
    const tab = await getActiveTab();
    if (!tab || !tab.url || !tab.url.startsWith('http')) {
      setStatus('generate-mod-status', 'Open a normal webpage (http/https) first.', true);
      return;
    }
    if (!userOpenAiReady) {
      setStatus('generate-mod-status', API_KEY_NOT_CONFIGURED_MSG, true);
      showApiKeyModal();
      return;
    }
    const gate = await canUseProTrialFeature();
    if (!gate.allow) {
      setStatus('generate-mod-status', '', false);
      showUpgradeModal();
      return;
    }
    setStatus('generate-mod-status', 'Generating…');
    try {
      const licenseKey = await getLicenseKey();
      const result = await apiPost({ type: 'generateMod', license_key: licenseKey, prompt, url: tab.url });
      if (result.error) {
        setStatus('generate-mod-status', serverOfflineMsg(), true);
        return;
      }
      if (result.data && result.data.error) {
        setStatus('generate-mod-status', result.data.error, true);
        return;
      }
      const data = result.data;
      const css = (data && data.css) || '';
      const js = (data && data.js) || '';
      if (!css && !js) {
        const msg = (data && data.error) || 'No CSS/JS from AI. Check your OpenAI API key and try a clearer prompt.';
        setStatus('generate-mod-status', msg, true);
        return;
      }
      const aiSuccess =
        data &&
        (data.success === true ||
          (data.success == null && (css || js) && !(data.error && !css && !js)));
      if (aiSuccess) {
        updateTrialUI();
        updateStatusBar();
      }
      chrome.runtime.sendMessage({ type: 'INJECT_MOD', tabId: tab.id, css, js }, (res) => {
        const err = chrome.runtime.lastError && chrome.runtime.lastError.message;
        if (err) {
          const hint = (err.includes('Receiving end') || err.includes('Could not establish')) ? ' Reload the page and try again.' : '';
          setStatus('generate-mod-status', err + hint, true);
          return;
        }
        if (res && res.ok) setStatus('generate-mod-status', 'Mod applied and saved.');
        else setStatus('generate-mod-status', (res && res.error) || 'Inject failed. Reload the page and try again.', true);
      });
    } catch (e) {
      setStatus('generate-mod-status', (e && e.message) || (typeof e === 'string' ? e : 'Error'), true);
    }
  });

  ref('get-page-errors')?.addEventListener('click', async () => {
    if (!userOpenAiReady) {
      setStatus('error-explainer-status', API_KEY_NOT_CONFIGURED_MSG, true);
      showApiKeyModal();
      return;
    }
    const gate = await canUseProTrialFeature();
    if (!gate.allow) {
      setStatus('error-explainer-status', '', false);
      showUpgradeModal();
      return;
    }
    const tab = await getActiveTab();
    if (!tab) return setStatus('error-explainer-status', 'No active tab.', true);
    
    setStatus('error-explainer-status', 'Fetching errors...');
    chrome.runtime.sendMessage({ type: 'MOD_TO_TAB', tabId: tab.id, payload: { type: 'GET_CONSOLE_ERRORS' } }, (res) => {
      if (chrome.runtime.lastError) {
        setStatus('error-explainer-status', chrome.runtime.lastError.message || 'Error fetching. Reload page and try again.', true);
        return;
      }
      if (res && res.errors) {
        if (res.errors.length === 0) {
          setStatus('error-explainer-status', 'No errors found. Trigger the bug on the page, then click Get Errors again.');
        } else {
          // Get the most recent error
          const lastError = res.errors[res.errors.length - 1];
          const errorExplainer = document.getElementById('error-explainer-input');
          if (errorExplainer) {
            errorExplainer.value = lastError;
            setStatus('error-explainer-status', `Captured error (${res.errors.length} total). Asking AI...`);
            
            // Automatically click explain
            const btn = document.getElementById('error-explainer-btn');
            if (btn) btn.click();
          }
        }
      } else {
        setStatus('error-explainer-status', 'Failed to get errors. Is the page fully loaded?', true);
      }
    });
  });

  // Slide-over API tester logic
  const apiTesterSlide = document.getElementById('api-tester-slide');
  ref('open-api-tester')?.addEventListener('click', () => {
    if (apiTesterSlide) {
      apiTesterSlide.classList.add('active');
      const content = apiTesterSlide.querySelector('.slide-content');
      if (content) content.scrollTop = 0;
    }
  });
  ref('close-api-tester')?.addEventListener('click', () => {
    if (apiTesterSlide) apiTesterSlide.classList.remove('active');
  });

  // API Tester API call logic
  const urlInput = document.getElementById('api-url');
  const methodSelect = document.getElementById('api-method');
  const callBtn = document.getElementById('call-api');
  const generateCodeBtn = document.getElementById('generate-code');
  const explainBtn = document.getElementById('explain-endpoint');
  const statusEl = document.getElementById('api-status');
  const responseEl = document.getElementById('api-response');
  const apiAiStatus = document.getElementById('api-ai-status');
  const apiAiResponse = document.getElementById('api-ai-response');
  let lastApiPayload = null;

  function updateApiButtons() {
    const hasUrl = !!(urlInput && urlInput.value.trim());
    if (generateCodeBtn) generateCodeBtn.disabled = !userOpenAiReady || !hasUrl;
    if (explainBtn) explainBtn.disabled = !userOpenAiReady || !lastApiPayload;
  }
  if (urlInput) urlInput.addEventListener('input', updateApiButtons);

  function applyUserOpenAiKeyGate() {
    document.querySelectorAll('[data-requires-user-openai]').forEach((el) => {
      if (el.id === 'generate-code' || el.id === 'explain-endpoint') return;
      el.disabled = !userOpenAiReady;
      el.title = userOpenAiReady ? '' : API_KEY_NOT_CONFIGURED_MSG;
    });
    updateApiButtons();
  }

  chrome.storage.local.get([USER_OPENAI_STORAGE_KEY], (r) => {
    const k = (r && r[USER_OPENAI_STORAGE_KEY] && String(r[USER_OPENAI_STORAGE_KEY])) || '';
    const inp = document.getElementById('openai-api-key-input');
    if (inp && k) inp.value = k;
    userOpenAiReady = String(k).trim().startsWith('sk-');
    applyUserOpenAiKeyGate();
    updateStatusBar();
  });

  ref('save-openai-key-btn')?.addEventListener('click', () => {
    const inp = document.getElementById('openai-api-key-input');
    const statusEl = document.getElementById('openai-key-status');
    const raw = (inp && inp.value && inp.value.trim()) || '';
    if (!raw.startsWith('sk-')) {
      if (statusEl) {
        statusEl.textContent = 'Invalid OpenAI API key format';
        statusEl.className = 'openai-key-status error';
      }
      return;
    }
    chrome.storage.local.set({ [USER_OPENAI_STORAGE_KEY]: raw }, () => {
      userOpenAiReady = true;
      if (statusEl) {
        statusEl.textContent = 'API key saved locally';
        statusEl.className = 'openai-key-status success';
      }
      applyUserOpenAiKeyGate();
      updateStatusBar();
    });
  });

  ref('clear-openai-key-btn')?.addEventListener('click', () => {
    const inp = document.getElementById('openai-api-key-input');
    const statusEl = document.getElementById('openai-key-status');
    chrome.storage.local.remove(USER_OPENAI_STORAGE_KEY, () => {
      userOpenAiReady = false;
      if (inp) inp.value = '';
      if (statusEl) {
        statusEl.textContent = 'API key removed from this browser';
        statusEl.className = 'openai-key-status success';
      }
      applyUserOpenAiKeyGate();
      updateStatusBar();
    });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[USER_OPENAI_STORAGE_KEY]) return;
    const nv = changes[USER_OPENAI_STORAGE_KEY].newValue;
    const s = nv != null ? String(nv).trim() : '';
    userOpenAiReady = s.startsWith('sk-');
    const inp = document.getElementById('openai-api-key-input');
    if (inp && nv !== undefined) inp.value = s;
    applyUserOpenAiKeyGate();
    updateStatusBar();
  });

  callBtn?.addEventListener('click', async () => {
    const url = urlInput ? urlInput.value.trim() : '';
    const method = methodSelect ? methodSelect.value : 'GET';
    if (!url) {
      if (statusEl) { statusEl.textContent = 'Please enter a URL'; statusEl.classList.add('error'); }
      return;
    }
    if (statusEl) { statusEl.textContent = 'Calling...'; statusEl.classList.remove('error'); }
    if (responseEl) responseEl.textContent = '';
    if (apiAiStatus) apiAiStatus.textContent = '';
    if (apiAiResponse) apiAiResponse.textContent = '';
    lastApiPayload = null;
    updateApiButtons();

    try {
      // NOTE: Using a relative fetch from the extension panel might fail due to CORS
      // Ideally, API tester calls should go through the background script to bypass CORS.
      // We will use the background script handler we built for this.
      const msg = { type: 'API_REQUEST', payload: { url, method } };
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          if (statusEl) { statusEl.textContent = `Error: ${chrome.runtime.lastError.message}`; statusEl.classList.add('error'); }
          return;
        }
        if (!response) {
          if (statusEl) { statusEl.textContent = 'Error: No response from background'; statusEl.classList.add('error'); }
          return;
        }
        if (!response.ok && response.error) {
          if (statusEl) { statusEl.textContent = `Error: ${response.error}`; statusEl.classList.add('error'); }
          return;
        }
        
        const data = response.data;
        let display = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        
        const fullResponse = `Status: ${response.status}\n\n${display}`;
        if (responseEl) responseEl.textContent = fullResponse;
        if (statusEl) { statusEl.textContent = `Done (${response.status})`; statusEl.classList.remove('error'); }
        
        lastApiPayload = { url, method, status: response.status, responseText: display };
        updateApiButtons();
      });
    } catch (err) {
      const msg = (err && err.message) || (typeof err === 'string' ? err : 'Error');
      if (statusEl) { statusEl.textContent = `Error: ${msg}`; statusEl.classList.add('error'); }
      if (responseEl) responseEl.textContent = '';
    }
  });

  async function callApiAi(action) {
    if (action === 'explainEndpoint' && !lastApiPayload) return;
    const url = (lastApiPayload && lastApiPayload.url) || (urlInput && urlInput.value.trim());
    const method = (lastApiPayload && lastApiPayload.method) || (methodSelect && methodSelect.value) || 'GET';
    if (!url) return;
    let text = `URL: ${url}\nMethod: ${method}`;
    if (lastApiPayload && lastApiPayload.responseText) text += `\n\nResponse:\n${lastApiPayload.responseText.slice(0, 4000)}`;

    if (!userOpenAiReady) {
      if (apiAiStatus) apiAiStatus.textContent = API_KEY_NOT_CONFIGURED_MSG;
      showApiKeyModal();
      return;
    }
    const gate = await canUseProTrialFeature();
    if (!gate.allow) {
      if (apiAiStatus) apiAiStatus.textContent = '';
      showUpgradeModal();
      return;
    }

    if (apiAiStatus) apiAiStatus.textContent = 'Asking AI…';
    if (apiAiResponse) apiAiResponse.textContent = '';
    try {
      const licenseKey = await getLicenseKey();
      const result = await apiPost({ type: 'aiContext', license_key: licenseKey, action, text, targetFolder: getSelectedProject() });
      if (result.error) {
        if (apiAiStatus) apiAiStatus.textContent = result.error;
        if (apiAiResponse) apiAiResponse.textContent = '';
        return;
      }
      if (result.data && result.data.error) {
        if (apiAiStatus) apiAiStatus.textContent = result.data.error;
        if (apiAiResponse) apiAiResponse.textContent = '';
        return;
      }
      const data = result.data;
      const answer = (data && typeof data.answer === 'string') ? data.answer : (data && data.error) || '';
      if (apiAiStatus) apiAiStatus.textContent = '';
      if (apiAiResponse) apiAiResponse.textContent = answer;
      const aiSuccess = data && data.success === true;
      if (aiSuccess) {
        updateTrialUI();
        updateStatusBar();
      }
    } catch (err) {
      const msg = (err && err.message) || (typeof err === 'string' ? err : 'Error');
      if (apiAiStatus) apiAiStatus.textContent = 'Error: ' + msg;
    }
  }

  generateCodeBtn?.addEventListener('click', () => callApiAi('generateRequestCode'));
  explainBtn?.addEventListener('click', () => callApiAi('explainEndpoint'));

  // Screenshot: try feed server first; if unavailable, save to Downloads. Automate: copy path or open folder.
  async function sendScreenshot(imageBase64, filename) {
    setStatus('screenshot-status', 'Sending…');
    const result = await apiPost({ type: 'screenshot', image: imageBase64, targetFolder: getSelectedProject(), filename });
    if (!result.error && result.data && result.data.ok) {
      const savedPath = result.data.path || '';
      const folderPath = savedPath ? savedPath.replace(/[\\/][^\\/]+$/, '') : '';
      if (folderPath && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(folderPath).then(() => {
          setStatus('screenshot-status', 'Saved. Folder path copied — paste in Explorer to open.');
        }).catch(() => {
          setStatus('screenshot-status', 'Saved: ' + savedPath);
        });
      } else {
        setStatus('screenshot-status', 'Saved: ' + (savedPath || 'screenshot'));
      }
      return true;
    }
    return false;
  }

  ref('screenshot-browser')?.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        setStatus('screenshot-status', 'No active tab.', true);
        return;
      }
      setStatus('screenshot-status', 'Capturing…');
      const res = await new Promise((r) => chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB', windowId: tab.windowId }, r));
      if (!res || !res.ok || typeof res.dataUrl !== 'string') {
        setStatus('screenshot-status', (res && res.error) ? res.error : 'Capture failed', true);
        return;
      }
      const dataUrl = res.dataUrl;
      const filename = 'screenshot-' + Date.now() + '.png';
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const serverOk = await sendScreenshot(base64, filename);
      if (!serverOk && dataUrl && chrome.downloads) {
        chrome.downloads.download({ url: dataUrl, filename, saveAs: false }, () => {
          if (chrome.runtime.lastError) {
            setStatus('screenshot-status', 'Server unavailable. ' + chrome.runtime.lastError.message, true);
          } else {
            setStatus('screenshot-status', 'Saved to Downloads. Opening folder…');
            try { chrome.downloads.showDefaultFolder(); } catch (_) {}
          }
        });
      } else if (!serverOk) {
        setStatus('screenshot-status', serverOfflineMsg(), true);
      }
    } catch (e) {
      setStatus('screenshot-status', (e && e.message) || (typeof e === 'string' ? e : 'Error'), true);
    }
  });

  // Error Explainer: Pro unlimited; Free uses shared AI trial; decrement only on successful AI response
  ref('error-explainer-btn')?.addEventListener('click', async () => {
    if (!userOpenAiReady) {
      setStatus('error-explainer-status', API_KEY_NOT_CONFIGURED_MSG, true);
      showApiKeyModal();
      return;
    }
    const gate = await canUseProTrialFeature();
    if (!gate.allow) {
      setStatus('error-explainer-status', '', false);
      showUpgradeModal();
      return;
    }
    const input = document.getElementById('error-explainer-input');
    const answerEl = document.getElementById('error-explainer-answer');
    const text = (input && input.value && input.value.trim()) || '';
    if (!text) {
      setStatus('error-explainer-status', 'Paste an error or stack trace first.', true);
      if (answerEl) answerEl.textContent = '';
      return;
    }
    setStatus('error-explainer-status', 'Asking AI…');
    if (answerEl) answerEl.textContent = '';
    try {
      const tab = await getActiveTab();
      const ctx = (tab && tab.url && !tab.url.startsWith('chrome-extension')) ? `\n[Context: User URL is ${tab.url} - Title: ${tab.title}]` : '';
      const licenseKey = await getLicenseKey();
      log('AI Request', { type: 'aiContext', action: 'explainError' });
      const result = await apiPost({ type: 'aiContext', license_key: licenseKey, action: 'explainError', text: text + ctx });
      if (result.error) {
        setStatus('error-explainer-status', serverOfflineMsg(), true);
        if (answerEl) answerEl.textContent = '';
        return;
      }
      if (result.data && result.data.error) {
        setStatus('error-explainer-status', result.data.error, true);
        if (answerEl) setAnswerWithMarkdown(answerEl, result.data.error);
        return;
      }
      const data = result.data;
      const answer = (data && typeof data.answer === 'string') ? data.answer : (data && data.error) || '';
      if (answerEl) setAnswerWithMarkdown(answerEl, answer);
      setStatus('error-explainer-status', '');
      const aiSuccess = data && data.success === true;
      if (aiSuccess) {
        updateTrialUI();
        updateStatusBar();
      }
    } catch (e) {
      setStatus('error-explainer-status', serverOfflineMsg(), true);
      if (answerEl) answerEl.textContent = '';
    }
  });

  // Dev assistant: Pro unlimited; Free uses shared AI trial
  ref('dev-ask')?.addEventListener('click', async () => {
    const textarea = document.getElementById('dev-question');
    const answerEl = document.getElementById('dev-answer');
    const q = (textarea && textarea.value && textarea.value.trim()) || '';
    if (!q) {
      setStatus('dev-status', 'Type a question first.', true);
      if (answerEl) answerEl.textContent = '';
      return;
    }
    if (!userOpenAiReady) {
      setStatus('dev-status', API_KEY_NOT_CONFIGURED_MSG, true);
      showApiKeyModal();
      if (answerEl) answerEl.textContent = '';
      return;
    }
    const gate = await canUseProTrialFeature();
    if (!gate.allow) {
      setStatus('dev-status', '', false);
      showUpgradeModal();
      return;
    }
    setStatus('dev-status', 'Asking…');
    if (answerEl) answerEl.textContent = '';
    try {
      const tab = await getActiveTab();
      const ctx = (tab && tab.url && !tab.url.startsWith('chrome-extension')) ? `\n[Context: User URL is ${tab.url}]` : '';
      const licenseKey = await getLicenseKey();
      const result = await apiPost({ type: 'devQuestion', license_key: licenseKey, question: q + ctx });
      if (result.error) {
        setStatus('dev-status', result.error, true);
        if (answerEl) answerEl.textContent = '';
        return;
      }
      if (result.data && result.data.error) {
        setStatus('dev-status', result.data.error, true);
        if (answerEl) answerEl.textContent = result.data.error;
        return;
      }
      const data = result.data;
      const answer = data && typeof data.answer === 'string' ? data.answer : (data && data.error ? data.error : '');
      if (answer) {
        if (answerEl) setAnswerWithMarkdown(answerEl, answer);
        setStatus('dev-status', '');
        const aiSuccess = data && data.success === true;
        if (aiSuccess) {
          updateTrialUI();
          updateStatusBar();
        }
      } else {
        setStatus('dev-status', data && data.message ? data.message : 'No answer. Check your OpenAI API key and try again.', true);
        if (answerEl) answerEl.textContent = '';
      }
    } catch (e) {
      setStatus('dev-status', (e && e.message) || (typeof e === 'string' ? e : 'Error'), true);
      if (answerEl) answerEl.textContent = '';
    }
  });

  // On panel close: read lastError so "Unchecked runtime.lastError" is not logged
  window.addEventListener('pagehide', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
      void chrome.runtime.lastError.message;
    }
  });
});
