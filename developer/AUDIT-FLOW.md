# DevLynx – Full flow audit and production-ready improvements

Audit of the extension flow (startup → trial → license → Explain Element / Error Explainer → AI request → trial decrement → UI) and changes made for production and debuggability.

---

## 1. Flow verification (start to finish)

| Step | What was checked | Status |
|------|------------------|--------|
| Extension startup | `DOMContentLoaded` → `ensureTrialInitialized()`, `getPlan()`, `applyPlanUI()`, `updateTrialUI()` | OK |
| Trial initialization | `trialUsesRemaining` missing → set to 20 in `chrome.storage.local` | OK |
| License verification | Options page: Verify → POST /verify-license → store plan + key on success | OK |
| Explain Element trigger | Gate `canUseProTrialFeature()` → START_EXPLAIN_MODE → user clicks element → background calls server | OK |
| Error Explainer trigger | Gate `canUseProTrialFeature()` → apiPost explainError | OK |
| AI request → server | Background/panel use feedUrl; server returns answer or error | OK |
| Trial decrement | **Fixed:** only on success (Explain: `message.success === true`; Error Explainer: after successful response) | Fixed |
| UI update | `updateTrialUI()` on storage change and after decrement; status messages use `SERVER_OFFLINE_MSG` on failure | OK |
| Upgrade modal | Shown when gate blocks; Go Pro opens Gumroad | OK |
| Go Pro flow | goProBtn / footer link → Gumroad; upgrade modal button uses PRICING_URL (panel) / hardcoded (footer) | OK |

---

## 2. Bugs and edge cases found and fixed

### 2.1 Trial decrement on failed request (bug – fixed)

- **Explain Element:** The background script sends `ELEMENT_EXPLAIN_RESULT` in both success and failure (`.then` and `.catch`). The panel was decrementing trial on **every** result, including when the server was unreachable or returned an error.
- **Fix:** Background now sends `success: true` or `success: false` with the message. Panel only decrements when `message.success === true`. On failure it shows `SERVER_OFFLINE_MSG` and does **not** decrement.

### 2.2 Error Explainer decrement before request (bug – fixed)

- **Error Explainer:** Trial was decremented **before** calling the server. If the request failed (network error, server down), the user still lost a trial use.
- **Fix:** Decrement is done **after** a successful response (no `result.error`, no `result.data.error`). On `result.error` or catch we show `SERVER_OFFLINE_MSG` and do **not** decrement.

### 2.3 Inconsistent server-offline messaging

- Different copy in panel, options, and background for “server not running”.
- **Fix:** Introduced shared constant `SERVER_OFFLINE_MSG`: *"DevLynx server not running. Start start-server-with-ai.bat in the feed-server folder."* Used for:
  - Panel: Explain Element failure, Error Explainer failure, generate-mod failure, loadProjects hint.
  - Options: Verify catch.
  - Background: setLastError for Explain Element failure.

### 2.4 trialUsesRemaining undefined

- **Checked:** `ensureTrialInitialized()` is called on startup and from `canUseProTrialFeature()` / `updateTrialUI()`. If the key is missing, it is set to 20. `getTrialUsesRemaining()` returns `null` only when the value is not a number or &lt; 0; UI treats `null` and 0 as “trial ended”. No bug found.

### 2.5 Double decrement

- **Checked:** Explain Element: one `ELEMENT_EXPLAIN_RESULT` per request; decrement only when `success === true`. Error Explainer: single decrement after success. No double decrement.

### 2.6 License state caching

- Plan is read from `chrome.storage.local` on each `getPlan()` / `licenseValid()` call; no in-memory cache. Storage updates (e.g. after Verify) are reflected on next check and via `chrome.storage.onChanged`. No bug.

---

## 3. Debugging support (despite obfuscation)

### 3.1 Global debug flag and structured logs

- **`DEBUG_MODE`:** In source, `const DEBUG_MODE = false` in `panel.js` and `background.js`.
- **Dev build:** `npm run build:dev` (or `--no-obfuscate`) replaces `const DEBUG_MODE = false` with `const DEBUG_MODE = true` in built JS so logs appear when using the non-obfuscated build.
- **Production build:** `npm run build` keeps `DEBUG_MODE = false` and obfuscates; `disableConsoleOutput: false` in the obfuscator so `console.log` calls remain (they only run when `DEBUG_MODE` is true, so no extra output in production).

**Structured logs** (when `DEBUG_MODE` is true):

- `[DevLynx][Trial]` – e.g. `initialized to 20`, `remaining: 17`, `decremented (Explain Element), remaining: 16`.
- `[DevLynx][License]` – e.g. `pro – feature allowed`.
- `[DevLynx][Gate]` – e.g. `allowed (trial)`, `blocked – trial ended`.
- `[DevLynx][Explain Element]` – `allowed` / `blocked`.
- `[DevLynx][AI Request]` – e.g. `{ type: 'aiContext', action: 'explainError' }` (panel); `Explain Element success` / `Explain Element failed` (background).

Helper:

```js
function log(tag, ...args) {
  if (DEBUG_MODE && typeof console !== 'undefined' && console.log) {
    console.log('[DevLynx][' + tag + ']', ...args);
  }
}
```

### 3.2 Debug command: `window.devlensDebug()`

In the **sidepanel** (with the panel’s DevTools Console), calling `devlensDebug()` returns and logs:

- `trialUsesRemaining` – current value (after `ensureTrialInitialized()`).
- `plan` – `'free'` or `'pro'`.
- `licenseState` – same as plan.
- `serverStatus` – `'connected'` | `'disconnected'` | `'error'` (from a quick request to the feed-server).

Usage: open sidepanel → right‑click panel → Inspect → Console → run `await devlensDebug()`.

---

## 4. Build system

- **Development:** `npm run build:dev` (or `node scripts/build.js --no-obfuscate`):
  - No obfuscation; source is copied with `DEBUG_MODE` set to `true`.
  - Logs and `devlensDebug()` are available for debugging.

- **Production:** `npm run build`:
  - Obfuscation enabled; `DEBUG_MODE` stays `false`.
  - Console logs are preserved in code but not executed (guarded by `DEBUG_MODE`).

---

## 5. Files changed (summary)

| File | Changes |
|------|--------|
| **src/sidepanel/panel.js** | Added `DEBUG_MODE`, `log()`, `SERVER_OFFLINE_MSG`. Gate/trial/Explain/Error Explainer logs. Explain: decrement only when `message.success === true`; status on failure uses `SERVER_OFFLINE_MSG`. Error Explainer: decrement only after success; use `SERVER_OFFLINE_MSG` on error/catch. `window.devlensDebug()`. loadProjects and generate-mod use `SERVER_OFFLINE_MSG`. |
| **src/background.js** | Added `DEBUG_MODE`, `log()`, `SERVER_OFFLINE_MSG`. ELEMENT_EXPLAIN_RESULT sends `success: true` / `success: false`. setLastError for Explain uses `SERVER_OFFLINE_MSG`. Logs on Explain success/failure. |
| **src/options/options.js** | Added `SERVER_OFFLINE_MSG`; Verify catch uses it. |
| **scripts/build.js** | When `--no-obfuscate`, run `injectDebugModeIfDev(code)` to replace `const DEBUG_MODE = false` with `const DEBUG_MODE = true` in built JS. |

---

## 6. How to test

1. **Trial and license**
   - Load unpacked from `dist/` (or `src/`).
   - Open sidepanel; confirm “Free trial: 20 uses remaining” (or current value).
   - Use Explain Element or Error Explainer until trial reaches 0; confirm “Trial ended” and upgrade modal when blocked.
   - In Options, verify a valid key (or use developer bypass from localhost with empty key); confirm Pro and that trial is not shown.

2. **No decrement on failure**
   - Stop the feed-server. As a free user, click “Try it!” and then an element (Explain Element). Confirm error message is `SERVER_OFFLINE_MSG` and trial count does **not** decrease.
   - Same for Error Explainer: paste text, click Explain; confirm same message and no decrement.

3. **Debug**
   - Build with `npm run build:dev`, load `dist/`, open sidepanel and Inspect → Console. Confirm `[DevLynx][Trial]`, `[DevLynx][License]`, etc., when using features.
   - Run `await devlensDebug()` and check `trialUsesRemaining`, `plan`, `serverStatus`.

This keeps the full flow correct, trial fair (no decrement on failure), messaging consistent, and debugging possible in dev builds while keeping production builds obfuscated and quiet.
