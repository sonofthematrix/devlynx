importScripts('license-jwt-public.js');
importScripts('shared/validate-license-token.js');

// Service worker for Opera extension (Manifest V3)
// Runs in the background; survives until idle.

const CURSOR_FEED_PORT = 2847;
/** Replaced at build: `npm run build:prod` → https://api.devlynx.ai */
const DEVLYNX_API_BASE = '__DEVLYNX_API_BASE__';

function apiBaseTrim() {
  let s = typeof DEVLYNX_API_BASE === 'string' ? DEVLYNX_API_BASE.trim() : '';
  if (!s || s.indexOf('__DEVLYNX_API_BASE__') !== -1) {
    s = 'http://localhost:' + CURSOR_FEED_PORT;
  }
  return s.replace(/\/$/, '');
}

/** @returns {string[]} Full URLs (fallback localhost ↔ 127.0.0.1 in dev). */
function licenseApiUrlCandidates(pathSuffix) {
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

const AI_RESULT_STORAGE_KEY = 'devlens_ai_result';
const DEBUG_LAST_ERROR_KEY = 'devlens_last_error';

function isLocalFeedServer() {
  const b = apiBaseTrim();
  return b.indexOf('localhost') !== -1 || b.indexOf('127.0.0.1') !== -1;
}

function serverOfflineMsg() {
  if (!isLocalFeedServer()) {
    const b = apiBaseTrim();
    return (
      "Can't reach the DevLynx API (" +
      b +
      '). Check deployment (/health), DNS, and your connection.'
    );
  }
  return "DevLynx feed server isn't running. In the feed-server folder run npm start.";
}

function trialNeedsServerMsg() {
  return (
    serverOfflineMsg() +
    ' Free trial needs the feed server for signed tokens (start the local server or use Pro).'
  );
}

/** User’s OpenAI key — never sent to the DevLynx feed server, only to api.openai.com. */
const USER_OPENAI_KEY = 'devlynx_openai_api_key';
const OPENAI_CHAT_COMPLETIONS = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL_USER = 'gpt-4o-mini';
const USER_OPENAI_KEY_MSG = 'Please add your OpenAI API key in DevLynx AI (API & Environment) to use AI features.';

// UI mirror + verify payloads — AI entitlement uses server POST /verify-license + optional JWT (devlynx_license_token)
const PLAN_STORAGE_KEY = 'devlens_plan';
const PLAN_MIRROR_KEY = 'devlynx_plan';
/** Spec + panel parity: primary user-facing license key storage */
const LICENSE_KEY_USER_STORAGE_KEY = 'devlynx_license_key';
const LICENSE_KEY_STORAGE_KEY = 'devlens_license_key';
const LICENSE_VERIFIED_AT_KEY = 'devlens_license_verified_at';
const LICENSE_TOKEN_STORAGE_KEY = 'devlynx_license_token';
const LICENSE_STATUS_CHECKED_AT_KEY = 'devlynx_license_status_checked_at';
const DEVICE_ID_STORAGE_KEY = 'devlynx_device_id';

/** Verify URL: dev `http://localhost:2847/verify-license`, prod `https://api.devlynx.ai/verify-license` via __DEVLYNX_API_BASE__ + `/verify-license`. */

/** Re-verify Pro with server at most every 6h; network failures use this window for grace access. */
const LICENSE_CACHE_MS = 6 * 60 * 60 * 1000;

/** Periodic silent POST /verify-license while Pro (does not replace on-demand checks). */
const LICENSE_BACKGROUND_REFRESH_MS = 4 * 60 * 60 * 1000;
/** @type {ReturnType<typeof setInterval>|null} */
let __licenseRefreshTimerId = null;

/** OpenAI calls per rolling 60s window (persisted in chrome.storage.local). */
const AI_RATE_LIMIT_MAX = 20;
const AI_RATE_LIMIT_WINDOW_MS = 60000;
const RATE_WINDOW_STORAGE_KEY = 'devlynx_rate_window';
const RATE_COUNT_STORAGE_KEY = 'devlynx_rate_count';

/** Server-signed trial JWT storage (GET /trial-token, POST /trial-consume). */
const TRIAL_JWT_STORAGE_KEY = 'devlynx_trial_token';

let __rateLimitChain = Promise.resolve();

const TRIAL_STORAGE_KEY = 'trialUsesRemaining';
const TRIAL_INSTALL_ID_KEY = 'trialInstallId';
const TRIAL_LIMIT = 20;
const TRIAL_ENDED_CONTEXT_MSG = 'Your free AI trial has ended. Open DevLynx AI to upgrade to Pro.';
const RATE_PROMPT_USES_KEY = 'devlynx_successful_ai_uses';
const RATE_PROMPT_DISMISSED_KEY = 'devlynx_chrome_store_rate_dismissed';

function ensureTrialInitializedBg() {
  return new Promise((resolve) => {
    chrome.storage.local.get([TRIAL_INSTALL_ID_KEY, TRIAL_STORAGE_KEY], (r) => {
      if (!r[TRIAL_INSTALL_ID_KEY]) {
        const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'trial-' + Date.now();
        chrome.storage.local.set(
          { [TRIAL_INSTALL_ID_KEY]: newId, [TRIAL_STORAGE_KEY]: TRIAL_LIMIT },
          () => resolve()
        );
        return;
      }
      if (r[TRIAL_STORAGE_KEY] == null) {
        chrome.storage.local.set({ [TRIAL_STORAGE_KEY]: 0 }, () => resolve());
        return;
      }
      resolve();
    });
  });
}

function storageGetLocal(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (r) => resolve(r || {}));
  });
}

async function getOrCreateDeviceIdBg() {
  const data = await storageGetLocal([DEVICE_ID_STORAGE_KEY]);
  const existing = data[DEVICE_ID_STORAGE_KEY];
  if (existing && String(existing).trim()) return String(existing).trim();
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'devlynx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12);
  await new Promise((resolve) => {
    chrome.storage.local.set({ [DEVICE_ID_STORAGE_KEY]: id }, resolve);
  });
  return id;
}

function abortSignalMs(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const ac = new AbortController();
  setTimeout(() => {
    try {
      ac.abort();
    } catch (_) {}
  }, ms);
  return ac.signal;
}

/**
 * POST /verify-license with 5s timeout; tries api base candidates (prod: single host).
 * Body must only ever contain license_key, device_id, extension_id (never OpenAI keys).
 * @returns {{ kind: 'http', res: Response, data: object, url?: string }|{ kind: 'network', error: Error|null }}
 */
async function postVerifyLicenseWithTimeout(bodyObj) {
  const safeBody = {
    license_key: bodyObj.license_key,
    device_id: bodyObj.device_id,
    extension_id: bodyObj.extension_id
  };
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(safeBody),
    signal: abortSignalMs(5000)
  };
  let lastErr = null;
  for (const url of licenseApiUrlCandidates('/verify-license')) {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      if (!res.ok) {
        console.warn('[devlynx-debug] verify-license HTTP', res.status, text.slice(0, 800));
      }
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        console.warn('[devlynx-debug] verify-license JSON parse error:', parseErr.message, text.slice(0, 800));
        data = {};
      }
      return { kind: 'http', res, data, url };
    } catch (err) {
      lastErr = err;
    }
  }
  return { kind: 'network', error: lastErr };
}

/** JWT from POST /verify-license (server sends license_token + token). */
function licenseTokenFromVerifyData(data) {
  const d = data || {};
  const fromLt = d.license_token && String(d.license_token).trim();
  const fromTok = d.token && String(d.token).trim();
  return fromLt || fromTok || '';
}

/** Reset plan flags and JWT after failed server verification (keeps user-entered license keys in storage). */
function resetPlansFreeAndClearToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove([LICENSE_TOKEN_STORAGE_KEY], () => {
      chrome.storage.local.set(
        {
          [PLAN_STORAGE_KEY]: 'free',
          [PLAN_MIRROR_KEY]: 'free',
          [LICENSE_VERIFIED_AT_KEY]: null,
          [LICENSE_STATUS_CHECKED_AT_KEY]: null
        },
        resolve
      );
    });
  });
}

async function getLicenseKeyFromStorageBg() {
  const r = await storageGetLocal([LICENSE_KEY_USER_STORAGE_KEY, LICENSE_KEY_STORAGE_KEY]);
  const a = r[LICENSE_KEY_USER_STORAGE_KEY] && String(r[LICENSE_KEY_USER_STORAGE_KEY]).trim();
  const b = r[LICENSE_KEY_STORAGE_KEY] && String(r[LICENSE_KEY_STORAGE_KEY]).trim();
  return a || b || '';
}

/**
 * Silent periodic Pro license refresh — does not block UI; errors only logged.
 * POST body: license_key, device_id, extension_id only (never OpenAI or other secrets).
 */
async function silentProLicenseRefresh() {
  try {
    const deviceId = await getOrCreateDeviceIdBg();
    const r = await storageGetLocal([
      PLAN_MIRROR_KEY,
      PLAN_STORAGE_KEY,
      LICENSE_KEY_USER_STORAGE_KEY,
      LICENSE_KEY_STORAGE_KEY,
      LICENSE_TOKEN_STORAGE_KEY
    ]);
    let licenseKey =
      (r[LICENSE_KEY_USER_STORAGE_KEY] && String(r[LICENSE_KEY_USER_STORAGE_KEY]).trim()) ||
      (r[LICENSE_KEY_STORAGE_KEY] && String(r[LICENSE_KEY_STORAGE_KEY]).trim()) ||
      '';
    const planPro = r[PLAN_MIRROR_KEY] === 'pro' || r[PLAN_STORAGE_KEY] === 'pro';
    const token = (r[LICENSE_TOKEN_STORAGE_KEY] && String(r[LICENSE_TOKEN_STORAGE_KEY]).trim()) || '';
    if (!licenseKey && token && self.devlynxValidateLicenseToken) {
      const lv = await self.devlynxValidateLicenseToken(token, chrome.runtime.id, deviceId);
      if (lv.ok && lv.payload && lv.payload.license_key != null) {
        licenseKey = String(lv.payload.license_key).trim();
      }
    }
    const hasToken = !!token;
    if (!planPro && !hasToken) return;
    if (!licenseKey) return;

    const post = await postVerifyLicenseWithTimeout({
      license_key: licenseKey,
      device_id: deviceId,
      extension_id: chrome.runtime.id
    });

    if (post.kind === 'http') {
      if (post.res && post.res.status === 429) {
        console.warn('[devlynx-security] license_refresh_failure', 'Too many verification requests');
        return;
      }
      const data = post.data || {};
      const valid = data.valid === true || data.ok === true;
      if (valid) {
        const patch = {
          [LICENSE_VERIFIED_AT_KEY]: Date.now(),
          [PLAN_STORAGE_KEY]: 'pro',
          [PLAN_MIRROR_KEY]: 'pro',
          [LICENSE_KEY_USER_STORAGE_KEY]: licenseKey,
          [LICENSE_KEY_STORAGE_KEY]: licenseKey,
          [LICENSE_STATUS_CHECKED_AT_KEY]: Date.now()
        };
        const newTok = data.token && String(data.token).trim() ? String(data.token).trim() : '';
        if (newTok) patch[LICENSE_TOKEN_STORAGE_KEY] = newTok;
        chrome.storage.local.set(patch);
        console.log('[devlynx-security] license_refresh_success');
      } else {
        await resetPlansFreeAndClearToken();
        console.warn('[devlynx-security] license_refresh_failure', data.error || 'invalid');
      }
    } else {
      console.warn('[devlynx-security] license_refresh_failure', 'network');
    }
  } catch (e) {
    console.warn('[devlynx-security] license_refresh_failure', e && e.message ? e.message : String(e));
  }
}

function scheduleLicenseBackgroundRefresh() {
  if (__licenseRefreshTimerId !== null) {
    clearInterval(__licenseRefreshTimerId);
    __licenseRefreshTimerId = null;
  }
  __licenseRefreshTimerId = setInterval(() => {
    silentProLicenseRefresh();
  }, LICENSE_BACKGROUND_REFRESH_MS);
}

/**
 * @returns {Promise<string|null>} Error message or null if allowed.
 */
function consumeAiRateLimitSlotStorage() {
  __rateLimitChain = __rateLimitChain.then(
    () =>
      new Promise((resolve) => {
        const now = Date.now();
        chrome.storage.local.get([RATE_WINDOW_STORAGE_KEY, RATE_COUNT_STORAGE_KEY], (r) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          let windowStart =
            typeof r[RATE_WINDOW_STORAGE_KEY] === 'number' ? r[RATE_WINDOW_STORAGE_KEY] : 0;
          let count = typeof r[RATE_COUNT_STORAGE_KEY] === 'number' ? r[RATE_COUNT_STORAGE_KEY] : 0;
          if (!windowStart || now - windowStart > AI_RATE_LIMIT_WINDOW_MS) {
            windowStart = now;
            count = 0;
          }
          count += 1;
          if (count > AI_RATE_LIMIT_MAX) {
            console.warn('[devlynx-security] client_openai_rate_limit_blocked');
            resolve('Rate limit exceeded. Please wait.');
            return;
          }
          chrome.storage.local.set(
            {
              [RATE_WINDOW_STORAGE_KEY]: windowStart,
              [RATE_COUNT_STORAGE_KEY]: count
            },
            () => resolve(null)
          );
        });
      })
  );
  return __rateLimitChain;
}

async function fetchTrialTokenFromServer() {
  const deviceId = await getOrCreateDeviceIdBg();
  const extensionId = chrome.runtime.id;
  const qs =
    'device_id=' + encodeURIComponent(deviceId) + '&extension_id=' + encodeURIComponent(extensionId);
  for (const base of licenseApiUrlCandidates('/trial-token')) {
    const fetchUrl = base.indexOf('?') >= 0 ? base + '&' + qs : base + '?' + qs;
    try {
      const res = await fetch(fetchUrl, { signal: abortSignalMs(8000) });
      const data = await res.json().catch(() => ({}));
      if (data.ok && data.token && String(data.token).trim()) {
        const token = String(data.token).trim();
        const rem =
          typeof data.trial_remaining === 'number'
            ? data.trial_remaining
            : TRIAL_LIMIT;
        await new Promise((resolve) => {
          chrome.storage.local.set(
            { [TRIAL_JWT_STORAGE_KEY]: token, [TRIAL_STORAGE_KEY]: rem },
            resolve
          );
        });
        return true;
      }
    } catch (_) {}
  }
  return false;
}

/** After successful trial AI: server decrements and returns fresh JWT. */
async function postTrialConsumeAfterAi() {
  const r = await storageGetLocal([TRIAL_JWT_STORAGE_KEY]);
  const tok = r[TRIAL_JWT_STORAGE_KEY] && String(r[TRIAL_JWT_STORAGE_KEY]).trim();
  if (!tok) return;
  const body = JSON.stringify({ token: tok });
  for (const url of licenseApiUrlCandidates('/trial-consume')) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: abortSignalMs(8000)
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok && data.token && String(data.token).trim()) {
        const rem = typeof data.trial_remaining === 'number' ? data.trial_remaining : 0;
        await new Promise((resolve) => {
          chrome.storage.local.set(
            {
              [TRIAL_JWT_STORAGE_KEY]: String(data.token).trim(),
              [TRIAL_STORAGE_KEY]: rem
            },
            resolve
          );
        });
        return;
      }
      if (data.token && String(data.token).trim() && typeof data.trial_remaining === 'number') {
        await new Promise((resolve) => {
          chrome.storage.local.set(
            {
              [TRIAL_JWT_STORAGE_KEY]: String(data.token).trim(),
              [TRIAL_STORAGE_KEY]: data.trial_remaining
            },
            resolve
          );
        });
        return;
      }
    } catch (_) {}
  }
  await fetchTrialTokenFromServer();
}

async function userShouldSkipTrialDecrement() {
  const r = await storageGetLocal([PLAN_MIRROR_KEY, PLAN_STORAGE_KEY]);
  if (r[PLAN_MIRROR_KEY] === 'pro' || r[PLAN_STORAGE_KEY] === 'pro') return true;
  return isProEntitledFromToken();
}

async function isProEntitledFromToken() {
  const deviceId = await getOrCreateDeviceIdBg();
  const r = await storageGetLocal([LICENSE_TOKEN_STORAGE_KEY]);
  const token = (r[LICENSE_TOKEN_STORAGE_KEY] && String(r[LICENSE_TOKEN_STORAGE_KEY]).trim()) || '';
  if (!token || !self.devlynxValidateLicenseToken) return false;
  const v = await self.devlynxValidateLicenseToken(token, chrome.runtime.id, deviceId);
  return v.ok === true;
}

/**
 * Pro: devlynx_plan/devlens_plan === pro OR valid local JWT → must pass POST /verify-license (6h cache + offline grace).
 * Free: server-signed trial JWT (GET /trial-token); consume via POST /trial-consume after successful AI.
 * @returns {Promise<string|null>} Error message or null if entitled.
 */
async function assertAiEntitled() {
  const deviceId = await getOrCreateDeviceIdBg();
  const r0 = await storageGetLocal([
    PLAN_MIRROR_KEY,
    PLAN_STORAGE_KEY,
    LICENSE_TOKEN_STORAGE_KEY,
    LICENSE_VERIFIED_AT_KEY,
    TRIAL_STORAGE_KEY,
    LICENSE_KEY_USER_STORAGE_KEY,
    LICENSE_KEY_STORAGE_KEY
  ]);

  const planPro = r0[PLAN_MIRROR_KEY] === 'pro' || r0[PLAN_STORAGE_KEY] === 'pro';
  let licenseKey =
    (r0[LICENSE_KEY_USER_STORAGE_KEY] && String(r0[LICENSE_KEY_USER_STORAGE_KEY]).trim()) ||
    (r0[LICENSE_KEY_STORAGE_KEY] && String(r0[LICENSE_KEY_STORAGE_KEY]).trim()) ||
    '';

  let jwtPro = false;
  let jwtLicenseKey = '';
  const token = (r0[LICENSE_TOKEN_STORAGE_KEY] && String(r0[LICENSE_TOKEN_STORAGE_KEY]).trim()) || '';
  if (token && self.devlynxValidateLicenseToken) {
    const local = await self.devlynxValidateLicenseToken(token, chrome.runtime.id, deviceId);
    if (local.ok && local.payload) {
      jwtPro = true;
      jwtLicenseKey =
        local.payload.license_key != null ? String(local.payload.license_key).trim() : '';
    }
  }

  const isPro = planPro || jwtPro;

  if (!isPro) {
    await ensureTrialInitializedBg();
    let rTrial = await storageGetLocal([TRIAL_JWT_STORAGE_KEY]);
    let trialTok = rTrial[TRIAL_JWT_STORAGE_KEY] && String(rTrial[TRIAL_JWT_STORAGE_KEY]).trim();
    let vTrial =
      trialTok && self.devlynxValidateTrialToken
        ? await self.devlynxValidateTrialToken(trialTok, chrome.runtime.id, deviceId)
        : { ok: false };
    if (!vTrial.ok || !vTrial.payload || vTrial.payload.trial_remaining <= 0) {
      const got = await fetchTrialTokenFromServer();
      if (!got) return trialNeedsServerMsg();
      rTrial = await storageGetLocal([TRIAL_JWT_STORAGE_KEY]);
      trialTok = rTrial[TRIAL_JWT_STORAGE_KEY] && String(rTrial[TRIAL_JWT_STORAGE_KEY]).trim();
      vTrial =
        trialTok && self.devlynxValidateTrialToken
          ? await self.devlynxValidateTrialToken(trialTok, chrome.runtime.id, deviceId)
          : { ok: false };
    }
    if (!vTrial.ok || !vTrial.payload || vTrial.payload.trial_remaining <= 0) {
      return TRIAL_ENDED_CONTEXT_MSG;
    }
    const remUi = vTrial.payload.trial_remaining;
    await new Promise((resolve) => {
      chrome.storage.local.set({ [TRIAL_STORAGE_KEY]: remUi }, resolve);
    });
    return null;
  }

  if (!licenseKey && jwtLicenseKey) licenseKey = jwtLicenseKey;
  if (!licenseKey) {
    await resetPlansFreeAndClearToken();
    return 'Pro activation invalid. Enter your Gumroad license key and tap Verify License.';
  }

  const verifiedAt = typeof r0[LICENSE_VERIFIED_AT_KEY] === 'number' ? r0[LICENSE_VERIFIED_AT_KEY] : 0;
  const withinGraceOrCache = verifiedAt > 0 && Date.now() - verifiedAt < LICENSE_CACHE_MS;

  if (withinGraceOrCache) {
    return null;
  }

  const post = await postVerifyLicenseWithTimeout({
    license_key: licenseKey,
    device_id: deviceId,
    extension_id: chrome.runtime.id
  });

  if (post.kind === 'http') {
    const data = post.data || {};
    const valid = data.valid === true || data.ok === true;
    if (valid) {
      const patch = {
        [LICENSE_VERIFIED_AT_KEY]: Date.now(),
        [PLAN_STORAGE_KEY]: 'pro',
        [PLAN_MIRROR_KEY]: 'pro',
        [LICENSE_KEY_USER_STORAGE_KEY]: licenseKey,
        [LICENSE_KEY_STORAGE_KEY]: licenseKey,
        [LICENSE_STATUS_CHECKED_AT_KEY]: Date.now()
      };
      const newTok = licenseTokenFromVerifyData(data);
      if (newTok) patch[LICENSE_TOKEN_STORAGE_KEY] = newTok;
      chrome.storage.local.set(patch);
      return null;
    }
    await resetPlansFreeAndClearToken();
    const errMsg =
      (data.error && String(data.error).trim()) || 'License verification failed. Check your key or device limit.';
    return errMsg;
  }

  // Network / timeout: no fresh server confirmation (cache was already stale at entry)
  return serverOfflineMsg();
}

/** After a successful OpenAI call: Pro unchanged; Free → POST /trial-consume for server-signed trial refresh. */
async function afterSuccessfulOpenAiForBilling() {
  if (await userShouldSkipTrialDecrement()) return;
  await postTrialConsumeAfterAi();
}

/** Open Chrome side panel when API is available (requires sidePanel permission + manifest side_panel). */
function tryOpenSidePanel(windowId) {
  if (windowId == null) return;
  try {
    if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
      chrome.sidePanel.open({ windowId }).catch(() => {});
    }
  } catch (_) {}
}

function incrementSuccessfulAiUsesBg() {
  chrome.storage.local.get([RATE_PROMPT_USES_KEY, RATE_PROMPT_DISMISSED_KEY], (r) => {
    if (r[RATE_PROMPT_DISMISSED_KEY]) return;
    const n = typeof r[RATE_PROMPT_USES_KEY] === 'number' ? r[RATE_PROMPT_USES_KEY] : 0;
    chrome.storage.local.set({ [RATE_PROMPT_USES_KEY]: n + 1 });
  });
}

function getUserOpenAiKeyAsync() {
  return new Promise((resolve) => {
    chrome.storage.local.get([USER_OPENAI_KEY], (r) => {
      const k = (r && r[USER_OPENAI_KEY] && String(r[USER_OPENAI_KEY]).trim()) || '';
      resolve(k);
    });
  });
}

async function openAiChatCompletion(apiKey, systemPrompt, userContent) {
  const res = await fetch(OPENAI_CHAT_COMPLETIONS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: OPENAI_MODEL_USER,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      max_tokens: 1024
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && data.error && data.error.message ? String(data.error.message) : 'OpenAI request failed (' + res.status + ')';
    return { ok: false, error: msg };
  }
  const raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (text) return { ok: true, content: text };
  return { ok: false, error: 'Empty response from OpenAI.' };
}

function systemPromptExplainElement(explainMode) {
  const simple = 'Explain this HTML element for a beginner (ELI5). Focus on: what this element is, why it exists, and what it does for the user. Use friendly language. Structure: (1) One sentence — what it is (e.g. "This is a call-to-action button"). (2) Why it\'s there — one short paragraph. (3) Tips — e.g. "Often used for sign-up forms" or "The bright color helps attract clicks." Be concise; use **bold** for key terms.';
  const technical = 'Explain this HTML element for an experienced developer. Use this structure in markdown: (1) Component/selector — tag and main classes. (2) Layout — flexbox/grid/position. (3) Key CSS — rules that matter (code block). (4) Behaviour — animations, JS hooks if visible. (5) Performance/accessibility hints if relevant. Be concise; use **bold** and code blocks.';
  return explainMode === 'technical' ? technical : simple;
}

function systemPromptAiContext(action, explainMode) {
  const prompts = {
    ask: 'Explain or fix this (code/JSON/error). Be concise.',
    explainError: 'Short explanation of this error and one concrete fix. No preamble.',
    generateRequestCode: 'Return only code: one block with fetch(), one with axios, one with Python requests for this URL/method. No prose.',
    explainEndpoint: 'In one short paragraph, explain what this API endpoint does and the meaning of the response.'
  };
  if (action === 'explainElement') return systemPromptExplainElement(explainMode || 'simple');
  return prompts[action] || prompts.ask;
}

async function runAiContextWithKey(apiKey, body) {
  const { action, text, url: pageUrl, title: pageTitle, explainMode } = body;
  const t = (text || '').trim();
  if (!t) return { ok: true, success: false, error: 'Empty text', answer: 'Empty text' };
  const userContent = `Context:\nURL: ${pageUrl || 'unknown'}\nTitle: ${pageTitle || 'unknown'}\n\nInput:\n${t}`;
  const systemPrompt = systemPromptAiContext(action, explainMode);
  const result = await openAiChatCompletion(apiKey, systemPrompt, userContent);
  if (result.ok) return { ok: true, success: true, answer: result.content };
  return { ok: true, success: false, answer: result.error, error: result.error };
}

async function runDevQuestionWithKey(apiKey, body) {
  const question = body.question || '';
  if (!question.trim()) return { ok: true, success: false, error: 'Empty question', answer: 'Empty question' };
  const systemPrompt = 'You are a developer assistant. Only answer questions about programming, browser extensions, debugging, and development. Be concise.';
  const result = await openAiChatCompletion(apiKey, systemPrompt, question);
  if (result.ok) return { ok: true, success: true, answer: result.content };
  return { ok: true, success: false, answer: result.error, error: result.error };
}

function parseGenerateModResponse(raw) {
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
  return { css: cssText, js: jsText, noCode: !cssText && !jsText };
}

async function runGenerateModWithKey(apiKey, body) {
  const { prompt, url: pageUrl } = body;
  if (!(prompt || '').trim()) return { ok: true, success: false, css: '', js: '', error: 'Empty prompt' };
  const systemPrompt = 'Return ONLY one code block, no other text. For CSS: start with ```css on its own line, then the CSS, then ``` on its own line. For JavaScript use ```js. Example:\n```css\n.header { background: blue; }\n```';
  const userContent = `Page URL: ${pageUrl || 'unknown'}\nUser request: ${prompt}`;
  const chatResult = await openAiChatCompletion(apiKey, systemPrompt, userContent);
  if (!chatResult.ok) {
    return { ok: true, success: false, css: '', js: '', error: chatResult.error };
  }
  const parsed = parseGenerateModResponse(chatResult.content);
  if (parsed.noCode) {
    return { ok: true, success: false, css: '', js: '', error: 'AI returned no parseable code. Try a simpler request (e.g. "make the header blue").' };
  }
  return { ok: true, success: true, css: parsed.css, js: parsed.js };
}

async function dispatchOpenAiFromExtension(body) {
  const apiKey = await getUserOpenAiKeyAsync();
  if (!apiKey.startsWith('sk-')) {
    return { ok: true, success: false, error: USER_OPENAI_KEY_MSG, answer: USER_OPENAI_KEY_MSG, css: '', js: '' };
  }
  const entitledErr = await assertAiEntitled();
  if (entitledErr) {
    return {
      ok: true,
      success: false,
      error: entitledErr,
      answer: entitledErr,
      css: '',
      js: ''
    };
  }
  const rateErr = await consumeAiRateLimitSlotStorage();
  if (rateErr) {
    return {
      ok: true,
      success: false,
      error: rateErr,
      answer: rateErr,
      css: '',
      js: ''
    };
  }
  const type = body && body.type;
  let result;
  if (type === 'devQuestion') result = await runDevQuestionWithKey(apiKey, body);
  else if (type === 'aiContext') result = await runAiContextWithKey(apiKey, body);
  else if (type === 'generateMod') result = await runGenerateModWithKey(apiKey, body);
  else result = { ok: true, success: false, error: 'Unknown AI request type', answer: 'Unknown AI request type' };

  if (result && result.success === true) {
    await afterSuccessfulOpenAiForBilling();
    incrementSuccessfulAiUsesBg();
  }
  return result;
}

const DEBUG_MODE = false;
function log(tag, ...args) {
  if (DEBUG_MODE && typeof console !== 'undefined' && console.log) {
    console.log('[DevLynx][' + tag + ']', ...args);
  }
}

function setLastError(feature, message) {
  const payload = { feature, message, at: Date.now() };
  console.warn('[DevLynx]', feature, message);
  try { chrome.storage.local.set({ [DEBUG_LAST_ERROR_KEY]: payload }); } catch (_) {}
}

// Presets: inject + save on active tab (content script INJECT_AND_SAVE_MOD)
const PRESETS = {
  hideAds: {
    css: '[id*="ad-"], [class*="ad-"], iframe[src*="ad"], .ad, .ads, [data-ad] { display: none !important; }',
    js: ''
  },
  darkMode: {
    css: 'html { filter: invert(1) hue-rotate(180deg); } body { background-color: #1a1a1a; } img, video { filter: invert(1) hue-rotate(180deg); }',
    js: ''
  },
  hideSidebar: {
    css: 'aside, [role="complementary"], .sidebar, #sidebar, [class*="sidebar"] { display: none !important; }',
    js: ''
  },
  biggerText: {
    css: 'body { font-size: 120% !important; }',
    js: ''
  }
};

let recordingTabId = null; // only one recording at a time
let stopRequestedForTabId = null; // popup requested stop for this tab

const PIN_HINT_STORAGE_KEY = 'devlens_show_pin_hint';

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  if (details.reason === 'install') {
    chrome.storage.local.set({ [PIN_HINT_STORAGE_KEY]: true });
  }

  // Context menu: selection = Ask AI / Code / Error; page = Explain element
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'devlens-parent', title: 'DevLynx AI', contexts: ['all'] });
    chrome.contextMenus.create({ parentId: 'devlens-parent', id: 'ai-explain-element', title: 'Explain element', contexts: ['page'] });
    chrome.contextMenus.create({ parentId: 'devlens-parent', id: 'ai-ask', title: 'Ask AI', contexts: ['selection'] });
    chrome.contextMenus.create({ parentId: 'devlens-parent', id: 'ai-generate-code', title: 'Generate request code', contexts: ['selection'] });
    chrome.contextMenus.create({ parentId: 'devlens-parent', id: 'ai-explain-error', title: 'Explain error', contexts: ['selection'] });
  });

  scheduleLicenseBackgroundRefresh();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleLicenseBackgroundRefresh();
});

// API: fetch from any URL (avoids CORS in extension context). Bij 127.0.0.1-fout: retry met localhost.
async function doFetch(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = text;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try { data = JSON.parse(text); } catch (_) {}
  }
  return { ok: res.ok, status: res.status, data };
}

async function handleApiRequest({ url, method = 'GET', headers = {}, body }) {
  const options = { method, headers: { 'Content-Type': 'application/json', ...headers } };
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  try {
    return await doFetch(url, options);
  } catch (err) {
    if ((url.startsWith('http://localhost:') || url.startsWith('http://127.0.0.1:')) && (err.message === 'Failed to fetch' || err.name === 'TypeError')) {
      const otherUrl = url.startsWith('http://localhost:') ? url.replace('http://localhost:', 'http://127.0.0.1:') : url.replace('http://127.0.0.1:', 'http://localhost:');
      try {
        return await doFetch(otherUrl, options);
      } catch (_) {}
    }
    throw err;
  }
}

function safeSendResponse(sendResponse, data) {
  try {
    sendResponse(data);
  } catch (e) {
    // Channel already closed (e.g. popup closed)
  }
  // Read lastError so "Unchecked runtime.lastError" is not logged
  if (chrome.runtime.lastError) {
    void chrome.runtime.lastError.message;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    safeSendResponse(sendResponse, { ok: true });
    return true;
  }
  if (message.type === 'OPEN_EXTENSIONS_PAGE') {
    const ua = navigator.userAgent;
    let extUrl = 'chrome://extensions';
    if (/opera|opr\//i.test(ua)) extUrl = 'opera://extensions';
    else if (/edg(e|a)/i.test(ua)) extUrl = 'edge://extensions';
    else if (/brave/i.test(ua)) extUrl = 'brave://extensions';
    else if (/vivaldi/i.test(ua)) extUrl = 'vivaldi://extensions';
    chrome.tabs.create({ url: extUrl }).then(() => safeSendResponse(sendResponse, { ok: true })).catch(() => {
      chrome.tabs.create({ url: 'chrome://extensions' }).then(() => safeSendResponse(sendResponse, { ok: true })).catch(() => safeSendResponse(sendResponse, { ok: false }));
    });
    return true;
  }
  if (message.type === 'API_REQUEST') {
    const payload = message.payload;
    if (!payload || typeof payload.url !== 'string') {
      safeSendResponse(sendResponse, { ok: false, error: 'Missing or invalid URL' });
      return true;
    }
    handleApiRequest(payload)
      .then((data) => safeSendResponse(sendResponse, data))
      .catch((err) => {
        setLastError('API_REQUEST', err.message || 'Request failed');
        safeSendResponse(sendResponse, { ok: false, error: err.message });
      });
    return true;
  }
  if (message.type === 'OPENAI_AI') {
    const body = message.body;
    if (!body || !body.type) {
      safeSendResponse(sendResponse, { error: 'Invalid OpenAI request' });
      return true;
    }
    dispatchOpenAiFromExtension(body)
      .then((data) => safeSendResponse(sendResponse, { data }))
      .catch((err) => {
        safeSendResponse(sendResponse, { error: err && err.message ? err.message : 'OpenAI request failed' });
      });
    return true;
  }
  if (message.type === 'CAPTURE_VISIBLE_TAB') {
    const windowId = message.windowId != null ? message.windowId : null;
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' })
      .then((dataUrl) => safeSendResponse(sendResponse, { ok: true, dataUrl }))
      .catch((err) => {
        setLastError('Screenshot', err.message || 'Capture failed');
        safeSendResponse(sendResponse, { ok: false, error: err.message });
      });
    return true;
  }
  if (message.type === 'RECORDING_STARTED') {
    recordingTabId = message.tabId;
    safeSendResponse(sendResponse, { ok: true });
    return false;
  }
  if (message.type === 'RECORDING_STOPPED') {
    recordingTabId = null;
    stopRequestedForTabId = null;
    safeSendResponse(sendResponse, { ok: true });
    return false;
  }
  if (message.type === 'CAN_START_RECORDING') {
    safeSendResponse(sendResponse, { allowed: recordingTabId === null });
    return false;
  }
  if (message.type === 'GET_RECORDING_STATUS') {
    safeSendResponse(sendResponse, { recording: recordingTabId !== null });
    return false;
  }
  if (message.type === 'STOP_RECORDING') {
    if (recordingTabId !== null) {
      stopRequestedForTabId = recordingTabId;
      safeSendResponse(sendResponse, { ok: true });
    } else {
      safeSendResponse(sendResponse, { ok: false });
    }
    return false;
  }
  if (message.type === 'GET_STOP_REQUESTED') {
    const tabId = message.tabId;
    const stop = stopRequestedForTabId === tabId;
    if (stop) stopRequestedForTabId = null;
    safeSendResponse(sendResponse, { stop });
    return false;
  }
  // Browser Mod Builder: forward message to tab's content script
  if (message.type === 'MOD_TO_TAB') {
    const { tabId, payload } = message;
    if (tabId == null) {
      setLastError('MOD_TO_TAB', 'No tab');
      safeSendResponse(sendResponse, { ok: false, error: 'No tab' });
      return true;
    }
    chrome.tabs.sendMessage(tabId, payload)
      .then((tabResponse) => safeSendResponse(sendResponse, tabResponse !== undefined ? { ok: true, ...tabResponse } : { ok: true }))
      .catch((err) => {
        const msg = err && err.message ? err.message : 'Unknown';
        setLastError('MOD_TO_TAB', msg.includes('Receiving end') || msg.includes('Could not establish') ? 'Content script not loaded. Reload the page and try again.' : msg);
        safeSendResponse(sendResponse, { ok: false, error: err.message });
      });
    return true;
  }
  // Preset: apply preset (Hide ads, Dark mode, etc.) to tab
  if (message.type === 'INJECT_PRESET') {
    const { tabId, preset } = message;
    if (tabId == null || !PRESETS[preset]) {
      setLastError('INJECT_PRESET', 'No tab or unknown preset');
      safeSendResponse(sendResponse, { ok: false, error: 'No tab or unknown preset' });
      return true;
    }
    const { css, js } = PRESETS[preset];
    chrome.tabs.sendMessage(tabId, { type: 'INJECT_AND_SAVE_MOD', css, js })
      .then(() => safeSendResponse(sendResponse, { ok: true }))
      .catch((err) => {
        setLastError('Preset', err.message || 'Inject failed. Reload the page and try again.');
        safeSendResponse(sendResponse, { ok: false, error: err.message });
      });
    return true;
  }
  // Inject custom mod (AI-generated or custom CSS) into tab
  if (message.type === 'INJECT_MOD') {
    const { tabId, css, js } = message;
    if (tabId == null) {
      setLastError('INJECT_MOD', 'No tab');
      safeSendResponse(sendResponse, { ok: false, error: 'No tab' });
      return true;
    }
    chrome.tabs.sendMessage(tabId, { type: 'INJECT_AND_SAVE_MOD', css: css || '', js: js || '' })
      .then(() => safeSendResponse(sendResponse, { ok: true }))
      .catch((err) => {
        setLastError('AI Mod', err.message || 'Inject failed. Reload the page and try again.');
        safeSendResponse(sendResponse, { ok: false, error: err.message });
      });
    return true;
  }
  // Get selection from page (for AI context menu)
  if (message.type === 'GET_SELECTION') {
    const tabId = message.tabId;
    if (tabId == null) {
      safeSendResponse(sendResponse, { text: '' });
      return false;
    }
    chrome.scripting.executeScript(
      { target: { tabId }, func: () => window.getSelection().toString() },
      (results) => {
        const text = (results && results[0] && results[0].result) ? String(results[0].result) : '';
        safeSendResponse(sendResponse, { text });
      }
    );
    return true;
  }
  if (message.type === 'ELEMENT_EXPLAIN_DATA') {
    const html = message.html != null ? String(message.html) : '';
    const selector = message.selector != null ? String(message.selector) : '';
    const tab = sender.tab;
    const text = `Selector: ${selector}\nURL: ${tab ? tab.url : ''}\nTitle: ${tab ? tab.title : ''}\nHTML snippet:\n${html}`;

    chrome.storage.local.set({
      [AI_RESULT_STORAGE_KEY]: { action: 'explainElement', text: text.slice(0, 200), answer: 'Loading AI explanation...', at: Date.now() }
    });
    if (tab && tab.windowId != null) tryOpenSidePanel(tab.windowId);

    (async () => {
      const r = await chrome.storage.local.get(['devlens_explain_mode']);
      const explainMode = r.devlens_explain_mode || 'simple';
      const aiBody = {
        type: 'aiContext',
        action: 'explainElement',
        text,
        explainMode,
        url: tab ? tab.url : '',
        title: tab ? tab.title : ''
      };
      const data = await dispatchOpenAiFromExtension(aiBody);
      const answer = (data && typeof data.answer === 'string') ? data.answer : (data && data.error) || USER_OPENAI_KEY_MSG;
      const success = data && data.success === true;
      log('AI Request', success ? 'Explain Element success' : 'Explain Element error');
      await chrome.storage.local.set({
        [AI_RESULT_STORAGE_KEY]: { action: 'explainElement', text: text.slice(0, 200), answer, at: Date.now() }
      });
      chrome.runtime.sendMessage({ type: 'ELEMENT_EXPLAIN_RESULT', answer, success }).catch(() => {});
      if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { type: 'SHOW_EXPLAIN_RESULT', answer }).catch(() => {});
      if (!success) setLastError('Explain element (AI)', answer);
    })();

    safeSendResponse(sendResponse, { ok: true });
    return true;
  }
  return false;
});

// Context menu: Explain element or selection actions (Ask AI, etc.). Use panel Try it! then click element.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'ai-explain-element') {
    if (!tab || !tab.id) return;
    try {
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'EXPLAIN_LAST_RIGHT_CLICKED_ELEMENT' });
      if (res && res.ok === false && res.error) setLastError('Explain element', res.error);
    } catch (err) {
      setLastError('Explain element', err.message && (err.message.includes('Receiving end') || err.message.includes('Could not establish')) ? 'Content script not loaded. Reload the page, then click Try it! and click the element again.' : (err.message || 'Unknown error'));
    }
    return;
  }

  const menuIdToAction = {
    'ai-ask': 'ask',
    'ai-generate-code': 'generateRequestCode',
    'ai-explain-error': 'explainError'
  };
  const action = menuIdToAction[info.menuItemId];
  if (!action || !tab || !tab.id) return;

  let text = (info.selectionText && info.selectionText.trim()) || '';
  if (!text && tab.id) {
    try {
      const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.getSelection().toString() });
      text = (results && results[0] && results[0].result != null) ? String(results[0].result).trim() : '';
    } catch (_) {}
  }
  if (!text) {
    setLastError('Context menu (selection)', 'No text selected. Select some text, then right-click → DevLynx AI → Ask AI / Generate code / Explain error.');
    return;
  }

  await ensureTrialInitializedBg();
  const trialGate = await (async () => {
    const r = await storageGetLocal([
      PLAN_MIRROR_KEY,
      PLAN_STORAGE_KEY,
      LICENSE_TOKEN_STORAGE_KEY,
      TRIAL_JWT_STORAGE_KEY
    ]);
    if (r[PLAN_MIRROR_KEY] === 'pro' || r[PLAN_STORAGE_KEY] === 'pro') return { allow: true };
    const licTok = r[LICENSE_TOKEN_STORAGE_KEY] && String(r[LICENSE_TOKEN_STORAGE_KEY]).trim();
    if (licTok && (await isProEntitledFromToken())) return { allow: true };
    const deviceId = await getOrCreateDeviceIdBg();
    let tt = r[TRIAL_JWT_STORAGE_KEY] && String(r[TRIAL_JWT_STORAGE_KEY]).trim();
    let vt =
      tt && self.devlynxValidateTrialToken
        ? await self.devlynxValidateTrialToken(tt, chrome.runtime.id, deviceId)
        : { ok: false };
    if (!vt.ok || !vt.payload || vt.payload.trial_remaining <= 0) {
      await fetchTrialTokenFromServer();
      const r2 = await storageGetLocal([TRIAL_JWT_STORAGE_KEY]);
      tt = r2[TRIAL_JWT_STORAGE_KEY] && String(r2[TRIAL_JWT_STORAGE_KEY]).trim();
      vt =
        tt && self.devlynxValidateTrialToken
          ? await self.devlynxValidateTrialToken(tt, chrome.runtime.id, deviceId)
          : { ok: false };
    }
    return { allow: !!(vt.ok && vt.payload && vt.payload.trial_remaining > 0) };
  })();
  if (!trialGate.allow) {
    setLastError('Context menu (selection)', TRIAL_ENDED_CONTEXT_MSG);
    return;
  }

  try {
    const aiBody = { type: 'aiContext', action, text, url: tab.url, title: tab.title };
    const data = await dispatchOpenAiFromExtension(aiBody);
    const answer = (data && typeof data.answer === 'string') ? data.answer : (data && data.error) || USER_OPENAI_KEY_MSG;
    await chrome.storage.local.set({
      [AI_RESULT_STORAGE_KEY]: { action, text: text.slice(0, 200), answer, at: Date.now() }
    });
    if (tab.windowId != null) tryOpenSidePanel(tab.windowId);
  } catch (err) {
    const msg = err && err.message ? err.message : USER_OPENAI_KEY_MSG;
    setLastError('Context menu (Ask AI / Code / Error)', msg);
    await chrome.storage.local.set({
      [AI_RESULT_STORAGE_KEY]: { action, text: text.slice(0, 200), answer: 'Error: ' + msg, at: Date.now() }
    });
    if (tab && tab.windowId != null) tryOpenSidePanel(tab.windowId);
  }
});

scheduleLicenseBackgroundRefresh();
