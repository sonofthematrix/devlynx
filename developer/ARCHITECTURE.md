# DevLynx AI – Architecture Overview

Project: **DevLynx AI**  
Chrome/Opera extension (Manifest V3) + local Node.js feed-server. Freemium: free tier, 20-use trial, Gumroad Pro.

---

## 1. Folder structure

```
devlens-saas/
├── src/                          # Extension source (what you edit)
│   ├── manifest.json             # MV3 manifest, permissions, host_permissions
│   ├── background.js             # Service worker: API proxy, context menu, Explain Element orchestration
│   ├── sidepanel/
│   │   ├── panel.html            # Sidepanel UI
│   │   ├── panel.js              # Sidepanel logic, trial, license UI, status bar, AI triggers
│   │   └── panel.css             # Styles
│   ├── options/
│   │   ├── options.html          # Options page (license key, verify)
│   │   └── options.js            # Save/verify/clear license, plan display
│   ├── content/
│   │   ├── content.js            # Injected: inspect mode, Explain Element click, toasts, errors
│   │   └── content.css           # Inspect overlay, toast, toolbar
│   ├── icons/                    # Extension icons (icon128.png, etc.)
│   └── README.md
├── dist/                         # Build output (obfuscated JS + copied assets) – load unpacked from here
├── feed-server/                  # Local Node server (not in store)
│   ├── server-with-ai.js         # Main server: HTTP API, OpenAI, license verify, screenshots
│   ├── .env                      # OPENAI_API_KEY, PORT, GUMROAD_PRODUCT_ID, DEV_CODES (gitignored)
│   ├── .env.example              # Template for .env
│   ├── start-server-with-ai.bat  # Windows: start server (node server-with-ai.js)
│   ├── docker-run.bat           # Docker run (optional)
│   ├── Dockerfile
│   ├── package.json              # Server metadata (server-with-ai.js uses only Node built-ins)
│   └── screenshots/              # Written by server (screenshot endpoint)
├── scripts/
│   ├── build.js                  # Copy src → dist, obfuscate JS, optional DEBUG_MODE inject
│   └── package.js                # Create release zip
├── website/                      # Landing/pricing (index.html), host separately
├── developer/                    # Docs (this file, security, freemium, store, etc.)
├── assets/                       # Store mockups, screenshots for docs
├── release/                      # devlens-extension.zip for store upload
├── package.json                  # Root: build scripts, devDependencies (obfuscator, archiver)
└── README.md
```

---

## 2. Key files and responsibilities

| File | Responsibility |
|------|----------------|
| **src/manifest.json** | MV3 config: sidepanel as popup, host_permissions for localhost:2847 and `<all_urls>`, content_scripts, options_ui, background service worker. |
| **src/background.js** | Service worker: handles `API_REQUEST` (fetch to feed-server), `ELEMENT_EXPLAIN_DATA` (POST to server, then broadcast result), context menu (DevLynx AI → Explain element / Ask AI / etc.), preset inject, capture tab, open extensions page. Does not implement trial; panel does. |
| **src/sidepanel/panel.js** | Sidepanel: project list, status bar (server/OpenAI/plan), trial init & UI (trialUsesRemaining, trialInstallId), license checks (`getPlan`, `licenseValid`, `refreshLicenseIfStale`), gates for Explain Element and Error Explainer (`canUseProTrialFeature`), decrement trial on success only, upgrade modal, Go Pro → Gumroad, `apiGet`/`apiPost` via `API_REQUEST`. |
| **src/sidepanel/panel.html** | Markup: header, status bar, Explain Element / Error Explainer / Screenshot / presets, upgrade box, upgrade modal, trial status, API key modal. |
| **src/options/options.js** | Options: load/save license key, “Verify with server” (POST /verify-license), set plan to pro on success and store `licenseVerifiedAt`; clear clears key and plan. |
| **src/content/content.js** | Injected in pages: inspect mode, Explain Element click handling, sends `ELEMENT_EXPLAIN_DATA` to background, shows toast with answer; GET_CONSOLE_ERRORS for Error Explainer; MOD_TO_TAB for inspect/explain/Reset. |
| **feed-server/server-with-ai.js** | Single Node process: reads .env (OPENAI_API_KEY, PORT, GUMROAD_PRODUCT_ID, DEV_CODES), serves GET /projects, /extensions, /health, /test-openai; POST /verify-license (dev bypass, DEV_CODES, Gumroad); POST / with body.type → screenshot, devQuestion, aiContext (Explain Element, Ask AI, etc.), generateMod. Calls OpenAI via `https.request` (no npm openai). |
| **scripts/build.js** | Copies src → dist, obfuscates .js (MV3-safe options), injects DEBUG_MODE=true when `--no-obfuscate`. |

---

## 3. Extension ↔ backend communication

- **Base URL:** `http://localhost:2847` (configurable via server PORT in .env). Extension uses `CURSOR_FEED_PORT = 2847` and `host_permissions` for `http://localhost:2847/*` and `http://127.0.0.1:2847/*`.
- **Who does the fetch:** Only the **background** service worker. Panel and options do not fetch directly; they send messages to the background.
- **Flow:**
  1. **Panel / options:** `chrome.runtime.sendMessage({ type: 'API_REQUEST', payload: { url, method, body } })`.
  2. **Background:** Listens for `API_REQUEST`, calls `handleApiRequest()` → `fetch(url, options)`, then `sendResponse({ ok, status, data })` (or `{ error }` on failure). Retries with 127.0.0.1 if localhost fails (and vice versa).
  3. **Server:** Handles GET/POST on the routes below; for POST `/` parses JSON body and switches on `body.type`.
- **Explain Element (special path):** Content script sends `ELEMENT_EXPLAIN_DATA` (html, selector) to background. Background POSTs to `http://localhost:2847/` with `type: 'aiContext', action: 'explainElement'`, then broadcasts result via `ELEMENT_EXPLAIN_RESULT` and `SHOW_EXPLAIN_RESULT` to panel and content (toast).

**Server endpoints (summary):**

| Method | Path | Purpose |
|--------|------|---------|
| GET | /projects | Returns `{ ok, projects }` (e.g. default workspace). |
| GET | /extensions | Returns `{ ok, extensions }`. |
| GET | /health | Returns `apiKeyConfigured`, model, serverVersion. |
| GET | /test-openai | One-shot OpenAI test; returns real error or success. |
| POST | /verify-license | Body: `{ license_key }`. Returns `{ valid, type }` (developer | dev | gumroad) or error. |
| POST | / | Body: `{ type, ... }`. Types: screenshot, quickPrompt, addCommand, devQuestion, aiContext, generateMod. |

---

## 4. Trial system

- **Location:** Entirely in the **extension** (no server-side trial). Implemented in **src/sidepanel/panel.js**.
- **Storage:** `chrome.storage.local`:
  - `trialUsesRemaining` (number): remaining uses (starts at 20).
  - `trialInstallId` (UUID string): set once on first run; if installId exists but `trialUsesRemaining` is missing, treat as 0 (anti-reset).
- **Constants:** `TRIAL_LIMIT = 20`, `TRIAL_STORAGE_KEY`, `TRIAL_INSTALL_ID_KEY`.
- **Functions:** `getTrialState()`, `getTrialUsesRemaining()`, `ensureTrialInitialized()`, `decrementTrialUse()`, `canUseProTrialFeature()`.
- **Gating:** Explain Element and Error Explainer call `canUseProTrialFeature()` before sending the AI request. If not allowed, show upgrade modal and do not call server. If allowed and request succeeds, panel decrements trial (Explain Element: only when background reports success; Error Explainer: after successful apiPost). Developer/dev license types from server are treated as Pro (no trial limit) in the extension.
- **UI:** `updateTrialUI()` updates `#trial-status` and status bar; dynamic button text (“Upgrade before trial ends” when &lt; 5 uses).

---

## 5. License verification

- **Server:** **feed-server/server-with-ai.js** – POST `/verify-license`.
  1. **Developer bypass:** If request from localhost (127.0.0.1 / ::1) and no `license_key` → return `{ valid: true, type: 'developer' }`.
  2. **DEV_CODES:** If `license_key` is in `DEV_CODES` (from .env) → return `{ valid: true, type: 'dev' }`.
  3. **Gumroad:** Else POST to Gumroad API with `GUMROAD_PRODUCT_ID` and `license_key`; on success return `{ valid: true, type: 'gumroad' }`.
- **Extension – storage:** `devlens_plan` ('free' | 'pro'), `devlens_license_key`, `devlens_license_verified_at` (timestamp).
- **Extension – who sets Pro:** Only after a successful **Verify with server** (options page or panel’s refresh flow). Options: “Verify with server” → POST /verify-license → if `data.ok === true` set plan to 'pro' and `licenseVerifiedAt` to now. Panel: `refreshLicenseIfStale()` refetches /verify-license if plan is pro and cache is older than 24h.
- **Options page:** **src/options/options.js** – Verify button calls fetch(VERIFY_URL, { method: 'POST', body: JSON.stringify({ license_key }) }), then updates storage. Save button only stores the key; it does not set plan to pro.

---

## 6. Gumroad / upgrade logic

- **Upgrade URL (Gumroad):** Hardcoded in extension as `GUMROAD_URL = 'https://jcdreamz.gumroad.com/l/devlynx-ai'` (**src/sidepanel/panel.js**). Used by “Upgrade to DevLynx Pro” button and upgrade modal button (`openPricingUrl()`).
- **Server:** Only checks license via Gumroad API when `GUMROAD_PRODUCT_ID` is set in .env; no “upgrade” endpoint. Product ID is used in POST `/verify-license` for Gumroad validation.
- **UI:** Upgrade CTA and modal live in **src/sidepanel/panel.html** (upgrade box, upgrade modal, goProBtn). Copy: “Upgrade to DevLynx Pro”, “Upgrade before trial ends” (when trial &lt; 5), list of Pro features; modal shown when trial ended or Pro feature blocked.

---

## 7. Build system

- **Commands:** `npm run build` (production: obfuscate), `npm run build:dev` (no obfuscate, DEBUG_MODE true), `npm run release` / `npm run package` (build + zip).
- **Script:** **scripts/build.js** – copies all files from src to dist; for each .js file runs javascript-obfuscator (MV3-safe options) unless `--no-obfuscate`; in dev build injects `DEBUG_MODE = true`.
- **Output:** **dist/** is the unpacked extension; **release/devlens-extension.zip** is for store upload (from package.js).

---

## 8. OpenAI integration

- **Server only:** **feed-server/server-with-ai.js**. Uses Node `https.request` to `api.openai.com/v1/chat/completions` (no `openai` npm package). Reads `OPENAI_API_KEY` and `OPENAI_MODEL` from .env.
- **Function:** `chat(systemPrompt, userContent)` returns `{ ok, content }` or `{ ok: false, error }`. Used by devQuestion, aiContext (Explain Element, Ask AI, Explain error, etc.), generateMod.
- **Extension:** No OpenAI key; all AI requests go through the feed-server (panel/background send type + payload; server calls OpenAI and returns answer or error).

---

## 9. Obvious bugs / gaps / dependencies

- **feed-server/package.json** lists `cors`, `dotenv`, `express`, `openai`, but **server-with-ai.js** uses only Node built-ins (`http`, `https`, `fs`, `path`) and does not require these. So either dependencies are unused (can be removed from package.json) or there is another entry point (e.g. server.js) that uses them; worth aligning or documenting.
- **GUMROAD_URL** points to `jcdreamz.gumroad.com/l/devlynx-ai`; product ID in .env must match that Gumroad product.
- **Trial** is client-side only; clearing storage can reset trial (mitigated by `trialInstallId` so that only full clears reset, not just deleting `trialUsesRemaining`).
- **License cache:** 24h refresh is implemented in panel; if server is down at refresh time, existing pro state is kept until next successful verify.
- **Content script** and **background** use message passing; if the tab is closed or the content script is not loaded, Explain Element from context menu can fail with a “receiving end” style error (handled with a user-facing message).

---

## Quick reference

| System | Where it lives |
|--------|----------------|
| Chrome extension | src/ (UI: sidepanel, options, content) + background.js |
| Node feed-server | feed-server/server-with-ai.js (port 2847) |
| License verification | Server: POST /verify-license. Extension: options.js (verify UI), panel.js (refresh, plan read) |
| Trial system | panel.js only; storage: trialUsesRemaining, trialInstallId |
| Gumroad upgrade | Panel: GUMROAD_URL, upgrade modal, goProBtn. Server: GUMROAD_PRODUCT_ID for verify only |
| Extension ↔ backend | background.js handles API_REQUEST → fetch; panel/options send API_REQUEST |
| Build | scripts/build.js → dist/; package.js → release zip |
